package org.sindibad.android.ui.sea

import android.content.Context
import android.view.Choreographer
import android.view.Surface
import android.view.TextureView
import com.google.android.filament.Box
import com.google.android.filament.Camera
import com.google.android.filament.ColorGrading
import com.google.android.filament.Engine
import com.google.android.filament.EntityManager
import com.google.android.filament.Filament
import com.google.android.filament.IndexBuffer
import com.google.android.filament.IndirectLight
import com.google.android.filament.LightManager
import com.google.android.filament.MaterialInstance
import com.google.android.filament.RenderableManager
import com.google.android.filament.Renderer
import com.google.android.filament.Scene
import com.google.android.filament.SwapChain
import com.google.android.filament.ToneMapper
import com.google.android.filament.VertexBuffer
import com.google.android.filament.View
import com.google.android.filament.Viewport
import com.google.android.filament.android.UiHelper
import com.google.android.filament.gltfio.AssetLoader
import com.google.android.filament.gltfio.FilamentAsset
import com.google.android.filament.gltfio.Gltfio
import com.google.android.filament.gltfio.MaterialProvider
import com.google.android.filament.gltfio.ResourceLoader
import com.google.android.filament.gltfio.UbershaderProvider
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.pow
import kotlin.math.sin

/**
 * The 3D sea, drawn natively with Filament from the shared GLB models
 * (Shared/Art/models/sea/, the ship from farm/dhow). The islands, the
 * port, the ship and a few gulls; clouds over the islands still to
 * discover. The water is a grid coloured per vertex: shallow and foamy
 * by the beaches, deep further out (as Web/core/sea/sea.ts does in a shader).
 *
 * Owns every Filament object it makes; call [destroy] once when done.
 */
internal class SeaRenderer(
    private val context: Context,
    textureView: TextureView,
    /** Island id → model ("home" is the port), as in [SeaLayout.positions]. */
    private val models: Map<String, String>,
    /** Islands still under fog: clouds over them, and their colours dimmed. */
    private val fogged: Set<String>,
    /** Calm mode: no bobbing ship or flying gulls. */
    private val calm: Boolean,
    /** Called on the main thread each time the screen size gives a new layout. */
    private val onLayout: (SeaLayout.Frame) -> Unit,
    /** Called on the main thread if drawing fails later; the flat map takes over. */
    private val onError: (Throwable) -> Unit,
) : UiHelper.RendererCallback, Choreographer.FrameCallback {

    private val engine: Engine
    private val renderer: Renderer
    private val scene: Scene
    private val view: View
    private val camera: Camera
    private val cameraEntity: Int
    private val uiHelper = UiHelper(UiHelper.ContextErrorPolicy.DONT_CHECK)
    private var swapChain: SwapChain? = null

    private val materials: UbershaderProvider
    private val loader: AssetLoader
    private val resources: ResourceLoader
    private val assets = mutableListOf<FilamentAsset>()
    private val isles = mutableMapOf<String, FilamentAsset>()
    private var ship: FilamentAsset? = null
    private val gulls = mutableListOf<FilamentAsset>()
    private val clouds = mutableMapOf<String, List<FilamentAsset>>()
    private val sun: Int
    private val indirect: IndirectLight
    private val grading: ColorGrading

    private var water: Int = 0
    private var waterVb: VertexBuffer? = null
    private var waterIb: IndexBuffer? = null
    private var waterMat: MaterialInstance? = null

    private var frame: SeaLayout.Frame? = null
    private var running = false
    private var startNanos = 0L
    private var lastDrawn = 0L

    init {
        Filament.init()
        Gltfio.init()
        engine = Engine.create()
        renderer = engine.createRenderer()
        scene = engine.createScene()
        view = engine.createView()
        cameraEntity = EntityManager.get().create()
        camera = engine.createCamera(cameraEntity)
        view.scene = scene
        view.camera = camera
        renderer.clearOptions = Renderer.ClearOptions().apply { clear = true; clearColor = linear(SKY) + 1f }
        // The game's flat cartoon colours: no filmic tone curve, like the web.
        grading = ColorGrading.Builder().toneMapper(ToneMapper.Linear()).build(engine)
        view.colorGrading = grading
        view.multiSampleAntiAliasingOptions = View.MultiSampleAntiAliasingOptions().apply { enabled = true; sampleCount = 4 }

        // A warm morning sun and a soft sky light (Web/core/sea/sea.ts, LOOKS.day).
        sun = EntityManager.get().create()
        LightManager.Builder(LightManager.Type.SUN)
            .color(1.0f, 0.95f, 0.88f)
            .intensity(95_000f)
            .direction(0.55f, -0.75f, -0.4f)
            .castShadows(false)
            .build(engine, sun)
        scene.addEntity(sun)
        indirect = IndirectLight.Builder()
            .irradiance(1, floatArrayOf(0.85f, 0.95f, 1.05f))
            .intensity(32_000f)
            .build(engine)
        scene.indirectLight = indirect

        materials = UbershaderProvider(engine)
        loader = AssetLoader(engine, materials, EntityManager.get())
        resources = ResourceLoader(engine)
        for ((id, model) in models) isles[id] = load("sea/$model")
        ship = load("farm/dhow")
        if (!calm) repeat(3) { gulls += load("sea/gull") }
        for (id in fogged) clouds[id] = CLOUDS.map { load("sea/cloud") }
        for (id in fogged) dim(isles.getValue(id))

        uiHelper.isOpaque = true
        uiHelper.renderCallback = this
        uiHelper.attachTo(textureView)
    }

    private fun load(id: String): FilamentAsset {
        val bytes = context.assets.open("models/$id.glb").use { it.readBytes() }
        val buffer = ByteBuffer.allocateDirect(bytes.size).order(ByteOrder.nativeOrder()).put(bytes).flip()
        val asset = requireNotNull(loader.createAsset(buffer)) { "Invalid model: $id" }
        resources.loadResources(asset)
        asset.releaseSourceData()
        scene.addEntities(asset.entities)
        assets += asset
        return asset
    }

    /** A misty silhouette for an island still under fog (the web's `SIL` colour). */
    private fun dim(asset: FilamentAsset) {
        val rm = engine.renderableManager
        for (e in asset.renderableEntities) {
            val ri = rm.getInstance(e)
            for (p in 0 until rm.getPrimitiveCount(ri)) rm.getMaterialInstanceAt(ri, p).setParameter("baseColorFactor", 0.42f, 0.55f, 0.66f, 1f)
        }
    }

    private fun place(asset: FilamentAsset, x: Double, y: Double, z: Double, scale: Double, yaw: Double = 0.0, roll: Double = 0.0) {
        val tm = engine.transformManager
        val s = scale.toFloat()
        val cy = cos(yaw).toFloat(); val sy = sin(yaw).toFloat()
        val cr = cos(roll).toFloat(); val sr = sin(roll).toFloat()
        // column-major: yaw about Y, then roll about the boat's length (Z)
        val m = floatArrayOf(
            s * cy * cr, s * sr, -s * sy * cr, 0f,
            -s * cy * sr, s * cr, s * sy * sr, 0f,
            s * sy, 0f, s * cy, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
        tm.setTransform(tm.getInstance(asset.root), m)
    }

    // ---------- The water ----------

    /** A grid over the whole sea, coloured by the distance to the nearest beach. */
    private fun buildWater(fr: SeaLayout.Frame) {
        destroyWater()
        val centre = fr.target
        val half = 160.0
        val n = 160                                  // cells along each side
        val verts = (n + 1) * (n + 1)
        val pos = ByteBuffer.allocateDirect(verts * 12).order(ByteOrder.nativeOrder())
        val col = ByteBuffer.allocateDirect(verts * 4).order(ByteOrder.nativeOrder())
        val deep = linear(DEEP); val shallow = linear(SHALLOW); val far = linear(SKY)
        val beaches = fr.islands.values.toList()
        for (j in 0..n) for (i in 0..n) {
            val x = centre.x - half + 2 * half * i / n
            val z = centre.z - half + 2 * half * j / n
            pos.putFloat(x.toFloat()).putFloat(0f).putFloat(z.toFloat())
            val d = beaches.minOf { hypot(x - it.x, z - it.z) } - SeaLayout.RR
            var c = mix(shallow, deep, smooth(0.2, 6.5, d))
            // the foam line at the beach, and a softer ring rolling in further out
            val foam = (1 - smooth(0.0, 1.4, d)) + 0.35 * (1 - smooth(0.0, 0.9, kotlin.math.abs(d - 2.6)))
            c = mix(c, floatArrayOf(1f, 1f, 1f), (foam.coerceIn(0.0, 1.0) * 0.85))
            c = mix(c, far, smooth(70.0, 190.0, hypot(x - centre.x, z - centre.z)))
            for (k in 0..2) col.put((c[k].coerceIn(0f, 1f) * 255 + 0.5f).toInt().toByte())
            col.put(255.toByte())
        }
        pos.flip(); col.flip()
        val idx = ByteBuffer.allocateDirect(n * n * 6 * 2).order(ByteOrder.nativeOrder())
        for (j in 0 until n) for (i in 0 until n) {
            val a = j * (n + 1) + i; val b = a + 1; val c = a + n + 1; val d = c + 1
            for (v in intArrayOf(a, c, b, b, c, d)) idx.putShort(v.toShort())
        }
        idx.flip()

        val vb = VertexBuffer.Builder().bufferCount(2).vertexCount(verts)
            .attribute(VertexBuffer.VertexAttribute.POSITION, 0, VertexBuffer.AttributeType.FLOAT3, 0, 12)
            .attribute(VertexBuffer.VertexAttribute.COLOR, 1, VertexBuffer.AttributeType.UBYTE4, 0, 4)
            .normalized(VertexBuffer.VertexAttribute.COLOR)
            .build(engine)
        vb.setBufferAt(engine, 0, pos)
        vb.setBufferAt(engine, 1, col)
        val ib = IndexBuffer.Builder().indexCount(n * n * 6).bufferType(IndexBuffer.Builder.IndexType.USHORT).build(engine)
        ib.setBuffer(engine, idx)
        // The glTF loader's own unlit material with vertex colours: no
        // compiled material of our own to ship.
        val key = MaterialProvider.MaterialKey().apply { unlit = true; hasVertexColors = true }
        val mat = requireNotNull(materials.createMaterialInstance(key, IntArray(8), "water", "")) { "No water material" }
        mat.setParameter("baseColorFactor", 1f, 1f, 1f, 1f)
        val e = EntityManager.get().create()
        RenderableManager.Builder(1)
            .boundingBox(Box(centre.x.toFloat(), 0f, centre.z.toFloat(), half.toFloat(), 0.1f, half.toFloat()))
            .geometry(0, RenderableManager.PrimitiveType.TRIANGLES, vb, ib)
            .material(0, mat)
            .castShadows(false).receiveShadows(false)
            .build(engine, e)
        scene.addEntity(e)
        water = e; waterVb = vb; waterIb = ib; waterMat = mat
    }

    private fun destroyWater() {
        if (water != 0) { scene.remove(water); engine.destroyEntity(water); EntityManager.get().destroy(water); water = 0 }
        waterVb?.let(engine::destroyVertexBuffer); waterVb = null
        waterIb?.let(engine::destroyIndexBuffer); waterIb = null
        waterMat?.let(engine::destroyMaterialInstance); waterMat = null
    }

    // ---------- Layout ----------

    private fun layout(width: Int, height: Int) {
        val fr = SeaLayout.fit(width.toDouble(), height.toDouble())
        frame = fr
        view.viewport = Viewport(0, 0, width, height)
        camera.setProjection(SeaLayout.FOV, width.toDouble() / height, 1.0, 1200.0, Camera.Fov.VERTICAL)
        camera.lookAt(fr.eye.x, fr.eye.y, fr.eye.z, fr.target.x, fr.target.y, fr.target.z, 0.0, 1.0, 0.0)
        for ((id, asset) in isles) {
            val p = fr.islands.getValue(id)
            place(asset, p.x, 0.0, p.z, SeaLayout.BIG)
        }
        for ((id, list) in clouds) {
            val p = fr.islands.getValue(id)
            list.forEachIndexed { i, c ->
                val (x, y, z, s) = CLOUDS[i]
                place(c, p.x + x * SeaLayout.BIG, y * SeaLayout.BIG, p.z + z * SeaLayout.BIG, s * SeaLayout.BIG)
            }
        }
        buildWater(fr)
        animate(0.0)
        onLayout(fr)
    }

    /** The ship rocks at the port; the gulls circle over the sea. */
    private fun animate(t: Double) {
        val fr = frame ?: return
        val home = fr.islands.getValue("home")
        ship?.let { place(it, home.x + SeaLayout.RR + 2.3, 0.06 * sin(t * 1.6), home.z + 0.9, 0.78, yaw = Math.PI / 2, roll = 0.05 * sin(t * 1.1)) }
        gulls.forEachIndexed { i, g ->
            val a = t * 0.25 + i * 2.1
            val r = 9 + i * 3.5
            place(g, fr.target.x + cos(a) * r, 8 + sin(a * 2) * 0.6, fr.target.z + sin(a) * r * 1.6, 1.0, yaw = atan2(-cos(a) * 1.6, -sin(a)))
        }
    }

    // ---------- The frame loop: about 30 frames a second, while shown ----------

    fun resume() {
        if (running) return
        running = true
        Choreographer.getInstance().postFrameCallback(this)
    }

    fun pause() {
        running = false
        Choreographer.getInstance().removeFrameCallback(this)
    }

    override fun doFrame(frameTimeNanos: Long) {
        if (!running) return
        Choreographer.getInstance().postFrameCallback(this)
        if (frameTimeNanos - lastDrawn < 30_000_000L) return
        lastDrawn = frameTimeNanos
        if (startNanos == 0L) startNanos = frameTimeNanos
        try {
            if (!calm) animate((frameTimeNanos - startNanos) / 1e9)
            val sc = swapChain ?: return
            if (!uiHelper.isReadyToRender || frame == null) return
            if (renderer.beginFrame(sc, frameTimeNanos)) {
                renderer.render(view)
                renderer.endFrame()
            }
        } catch (t: Throwable) { fail(t) }
    }

    private fun fail(t: Throwable) {
        pause()
        onError(t)
    }

    override fun onNativeWindowChanged(surface: Surface) {
        swapChain?.let(engine::destroySwapChain)
        swapChain = engine.createSwapChain(surface)
    }

    override fun onDetachedFromSurface() {
        swapChain?.let { engine.destroySwapChain(it); engine.flushAndWait() }
        swapChain = null
    }

    override fun onResized(width: Int, height: Int) {
        if (width > 0 && height > 0) try { layout(width, height) } catch (t: Throwable) { fail(t) }
    }

    fun destroy() {
        pause()
        uiHelper.detach()
        destroyWater()
        for (a in assets) { scene.removeEntities(a.entities); loader.destroyAsset(a) }
        assets.clear()
        resources.destroy()
        loader.destroy()
        materials.destroyMaterials()
        materials.destroy()
        scene.remove(sun)
        engine.destroyEntity(sun)
        EntityManager.get().destroy(sun)
        engine.destroyIndirectLight(indirect)
        engine.destroyColorGrading(grading)
        swapChain?.let(engine::destroySwapChain)
        engine.destroyRenderer(renderer)
        engine.destroyView(view)
        engine.destroyScene(scene)
        engine.destroyCameraComponent(cameraEntity)
        EntityManager.get().destroy(cameraEntity)
        engine.destroy()
    }

    private companion object {
        const val SKY = 0xA6DCEF
        const val DEEP = 0x2794C6
        const val SHALLOW = 0x6FE0E6
        /** Clouds over an island under fog: x, y, z and size, in island units (the web's CLOUDS). */
        val CLOUDS = listOf(
            doubleArrayOf(-2.4, 0.9, 1.3, 1.0), doubleArrayOf(2.3, 0.8, 1.0, 1.05), doubleArrayOf(0.1, 1.0, 2.6, 0.95),
            doubleArrayOf(-1.8, 1.3, -1.7, 0.95), doubleArrayOf(2.0, 1.2, -1.6, 0.9), doubleArrayOf(0.5, 2.6, 0.6, 0.7),
        )

        fun linear(rgb: Int) = floatArrayOf(
            channel(rgb shr 16 and 0xFF), channel(rgb shr 8 and 0xFF), channel(rgb and 0xFF),
        )
        private fun channel(v: Int): Float = (v / 255.0).let { if (it <= 0.04045) it / 12.92 else ((it + 0.055) / 1.055).pow(2.4) }.toFloat()
        fun mix(a: FloatArray, b: FloatArray, k: Double) = FloatArray(a.size) { (a[it] + (b[it] - a[it]) * k).toFloat() }
        fun smooth(e0: Double, e1: Double, x: Double) = ((x - e0) / (e1 - e0)).coerceIn(0.0, 1.0).let { it * it * (3 - 2 * it) }
        operator fun FloatArray.plus(alpha: Float) = doubleArrayOf(this[0].toDouble(), this[1].toDouble(), this[2].toDouble(), alpha.toDouble())
    }
}
