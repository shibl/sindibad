package org.sindibad.android.ui.sea

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

/**
 * Where the islands sit on the 3D sea and where the camera looks from.
 * Pure math with no Android or Filament types, so it is unit-tested; the
 * renderer and the Compose labels both use it, so they always agree.
 *
 * Mirrors the web game's 3D sea (Web/core/sea/sea.ts) and its map
 * positions (Web/worlds/grade6.ts): keep in step.
 */
object SeaLayout {
    const val R = 4.2            // an island model's radius at the waterline
    const val BIG = 1.25         // islands are drawn this much bigger than their models
    const val RR = R * BIG       // an island's radius on the map
    const val SZ = 0.75          // map rows → world depth
    const val TOP = 5 * BIG      // the tallest landmark, for framing
    const val PITCH = 0.98       // radians down from the horizon
    const val FOV = 40.0         // vertical field of view, degrees

    /** Map positions in percent: x across, y down. "home" is the port of Arwad. */
    val positions: Map<String, Pair<Double, Double>> = linkedMapOf(
        "home" to (50.0 to 93.0),
        "arabic" to (22.0 to 80.0),
        "farm" to (80.0 to 81.0),
        "math" to (56.0 to 63.0),
        "music" to (18.0 to 57.0),
        "art" to (83.0 to 53.0),
        "science" to (40.0 to 41.0),
        "social" to (78.0 to 32.0),
        "english" to (20.0 to 25.0),
        "treasure" to (55.0 to 10.0),
    )

    data class V3(val x: Double, val y: Double, val z: Double) {
        operator fun plus(o: V3) = V3(x + o.x, y + o.y, z + o.z)
        operator fun minus(o: V3) = V3(x - o.x, y - o.y, z - o.z)
        operator fun times(k: Double) = V3(x * k, y * k, z * k)
        infix fun dot(o: V3) = x * o.x + y * o.y + z * o.z
        infix fun cross(o: V3) = V3(y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x)
        fun unit() = sqrt(this dot this).let { V3(x / it, y / it, z / it) }
    }

    /** A point on screen, in pixels from the top left; `ahead` is false behind the camera. */
    data class Px(val x: Double, val y: Double, val ahead: Boolean = true)

    /** The sea for one screen size: island centres, the camera, and projection to pixels. */
    class Frame(val width: Double, val height: Double, val islands: Map<String, V3>, val eye: V3, val target: V3) {
        private val f = (target - eye).unit()
        private val r = (f cross V3(0.0, 1.0, 0.0)).unit()
        private val u = r cross f
        private val t = tan(Math.toRadians(FOV / 2))

        fun project(p: V3): Px {
            val d = p - eye
            val z = d dot f
            if (z <= 0.01) return Px(0.0, 0.0, ahead = false)
            val nx = (d dot r) / (z * t * width / height)
            val ny = (d dot u) / (z * t)
            return Px((nx + 1) / 2 * width, (1 - ny) / 2 * height)
        }

        /** How big an island looks on screen, in pixels across. */
        fun islandWidth(id: String): Double {
            val p = islands.getValue(id)
            return project(p + V3(RR, 0.0, 0.0)).x - project(p - V3(RR, 0.0, 0.0)).x
        }

        /** The points that must stay on screen: each island's edges and its landmark's top. */
        fun framePoints() = islands.values.flatMap { p ->
            listOf(p + V3(RR, 0.0, 0.0), p - V3(RR, 0.0, 0.0), p + V3(0.0, 0.0, RR), p - V3(0.0, 0.0, RR), p + V3(0.0, TOP, 0.0))
        }
    }

    /**
     * Spreads the islands to the screen's shape, then places the camera so all
     * of them fit inside the screen minus the given margins (pixels).
     */
    fun fit(width: Double, height: Double, top: Double = 0.0, bottom: Double = 0.0, side: Double = 14.0): Frame {
        val xs = positions.values.map { it.first }
        val ys = positions.values.map { it.second }
        val spanX = xs.max() - xs.min()
        val spanZ = (ys.max() - ys.min()) * SZ
        // How wide to spread the islands: match the screen's shape (a little
        // narrower, to leave room for the labels at the sides).
        val aspect = (width - 2 * side) / ((height - top - bottom) * 0.8)
        val across = 2 * RR
        val sx = ((aspect * (spanZ + across) * sin(PITCH) * 0.85 - across) / spanX).coerceIn(0.4, 1.1)
        val islands = positions.mapValues { (_, p) -> V3((p.first - 50) * sx, 0.0, (p.second - 50) * SZ) }
        val minX = islands.values.minOf { it.x }; val maxX = islands.values.maxOf { it.x }
        val minZ = islands.values.minOf { it.z }; val maxZ = islands.values.maxOf { it.z }
        var target = V3((minX + maxX) / 2, 0.0, (minZ + maxZ) / 2)
        val safeL = side; val safeR = width - side; val safeT = top + side; val safeB = height - bottom - side
        val back = V3(0.0, sin(PITCH), cos(PITCH))

        fun frame(d: Double, at: V3) = Frame(width, height, islands, at + back * d, at)
        fun bounds(fr: Frame) = fr.framePoints().map(fr::project).let { pts ->
            doubleArrayOf(pts.minOf { it.x }, pts.maxOf { it.x }, pts.minOf { it.y }, pts.maxOf { it.y })
        }
        fun fits(b: DoubleArray) = b[0] >= safeL && b[1] <= safeR && b[2] >= safeT && b[3] <= safeB

        // The nearest camera whose picture is small enough, then centre it in
        // the safe area; step back a little if centring pushed an edge out.
        var lo = 5.0; var hi = 2000.0
        repeat(48) {
            val mid = (lo + hi) / 2
            val b = bounds(frame(mid, target))
            if (b[1] - b[0] <= safeR - safeL && b[3] - b[2] <= safeB - safeT) hi = mid else lo = mid
        }
        var d = hi
        repeat(6) {
            repeat(12) {
                val fr = frame(d, target)
                val b = bounds(fr)
                val dx = (safeL + safeR) / 2 - (b[0] + b[1]) / 2
                val dy = (safeT + safeB) / 2 - (b[2] + b[3]) / 2
                if (abs(dx) < 0.5 && abs(dy) < 0.5) return@repeat
                // world units per pixel at the target, along the ground
                val k = 2 * d * tan(Math.toRadians(FOV / 2)) / height
                target = V3(target.x - dx * k, 0.0, target.z - dy * k / sin(PITCH))
            }
            if (fits(bounds(frame(d, target)))) return frame(d, target)
            d *= 1.03
        }
        return frame(d, target)
    }

    /** Which island a tap at (x, y) pixels lands on, if any: the nearest centre within its radius. */
    fun hit(frame: Frame, x: Double, y: Double): String? = frame.islands.keys
        .map { id -> id to frame.project(frame.islands.getValue(id) + V3(0.0, 1.0, 0.0)) }
        .map { (id, p) -> id to hypot(p.x - x, p.y - y) }
        .filter { (id, dist) -> dist <= frame.islandWidth(id) * 0.55 }
        .minByOrNull { it.second }?.first
}
