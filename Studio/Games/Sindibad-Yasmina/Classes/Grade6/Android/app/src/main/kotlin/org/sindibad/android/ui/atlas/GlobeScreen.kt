package org.sindibad.android.ui.atlas

import android.app.ActivityManager
import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import org.sindibad.android.GameViewModel
import org.sindibad.android.audio.rememberMusicEngine
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.atlas.AtlasWorld
import org.sindibad.android.domain.atlas.Country
import org.sindibad.android.domain.atlas.Globe
import org.sindibad.android.domain.atlas.GlobeGame
import org.sindibad.android.domain.atlas.GlobeMode
import org.sindibad.android.domain.atlas.GlobeState
import org.sindibad.android.ui.*
import org.sindibad.android.ui.quest.HelperLine
import org.sindibad.android.ui.quest.rich
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

// The atlas globe natively (web: core/atlas/globe.ts). The web textures a three.js sphere; here the Earth is an
// orthographic view drawn on a Canvas from the same outlines, with the web's colours, turned the web's way: a drag
// turns it (and it keeps turning a little after, slowing ×0.93 a frame, except in calm mode), two fingers zoom
// between the web's camera distances 1.7 and 4.6, the pitch stops at ±1.3 rad, and choosing a country turns the
// globe to face it (at once in calm mode). A tap is projected back to (lon, lat) and found by Globe.countryAt.
// Nothing is timed and nothing turns on its own (the web's start face() switches its auto-spin off).

private val PAL = mapOf("africa" to 0xFFF3D9A2, "asia" to 0xFFF7E6B0, "europe" to 0xFFD8E7C2, "namerica" to 0xFFCFE0EF,
    "samerica" to 0xFFE6D4EC, "oceania" to 0xFFF3CFC0, "antarctica" to 0xFFF4F4F4).mapValues { Color(it.value) }
private val ARAB_FILL = Color(0xFFFFCF6B)
private val SEL_FILL = Color(0xFFFF7A3C)
private val SEL_EDGE = Color(0xFF7A2A0A)
private val MARK_FILL = Color(0xFFFFE36B)
private val OTHER_FILL = Color(0xFFE9E4D8)
private val EDGE = Color(80, 70, 50, 140)
private val GRID = Color(255, 255, 255, 36)
private val EQUATOR = Color(255, 230, 120, 115)
private const val START_DIST = 3.6f

private val json = Json { ignoreUnknownKeys = true }
private val ViewSaver = Saver<GlobeView, List<Double>>(save = { listOf(it.lon0, it.lat0, it.dist.toDouble()) },
    restore = { GlobeView(it[0], it[1], it[2].toFloat()) })
private val StateSaver = Saver<GlobeState, String>(save = { json.encodeToString(GlobeState.serializer(), it) },
    restore = { json.decodeFromString(GlobeState.serializer(), it) })

/** The outlines as unit-sphere trig (cos φ, sin φ, cos λ, sin λ per point), built once off the main thread. */
private class GlobeGeo(step: Int) {
    val countries = AtlasWorld.globe.countries.filter { it.rings.isNotEmpty() }
    val rings: List<List<FloatArray>> = countries.map { c ->
        c.rings.map { r ->
            val n = r.size / 2
            val keep = (0 until n).filter { it % step == 0 || it == n - 1 }.takeIf { it.size >= 4 } ?: (0 until n).toList()
            FloatArray(keep.size * 4).also { a -> keep.forEachIndexed { j, i -> trig(r[2 * i] / 10.0, r[2 * i + 1] / 10.0, a, j * 4) } }
        }
    }
    val paths = Array(countries.size) { Path() }
    val buf = FloatArray(3 * maxOf(73, rings.flatten().maxOfOrNull { it.size / 4 } ?: 0))
    val small = AtlasWorld.globe.countries.filter { it.small }
    /** Meridians every 30° and the parallels ±30°, ±60° (web paint()); the equator apart, dashed. */
    val grid: List<FloatArray> = (-180 until 180 step 30).map { lon -> line((-90..90 step 5).map { lon to it }) } +
        listOf(-60, -30, 30, 60).map { lat -> line((-180..180 step 5).map { it to lat }) }
    val equator = line((-180..180 step 5).map { it to 0 })
    val gridPath = Path()
    val equatorPath = Path()

    companion object {
        fun trig(lon: Double, lat: Double, a: FloatArray, o: Int) {
            val p = lat * Globe.RAD; val l = lon * Globe.RAD
            a[o] = cos(p).toFloat(); a[o + 1] = sin(p).toFloat(); a[o + 2] = cos(l).toFloat(); a[o + 3] = sin(l).toFloat()
        }
        fun line(pts: List<Pair<Int, Int>>) = FloatArray(pts.size * 4).also { a -> pts.forEachIndexed { j, (lon, lat) -> trig(lon.toDouble(), lat.toDouble(), a, j * 4) } }
    }
}

/** The view: centre (lon0, lat0), camera distance, the drag's leftover speed and where the globe is turning to. */
private class GlobeView(lon: Double, lat: Double, dist: Float) {
    var lon0 by mutableDoubleStateOf(lon)
    var lat0 by mutableDoubleStateOf(lat)
    var dist by mutableFloatStateOf(dist)
    var vLon by mutableDoubleStateOf(0.0)
    var vLat by mutableDoubleStateOf(0.0)
    var dragging by mutableStateOf(false)
    var goal by mutableStateOf<Pair<Double, Double>?>(null)
    val moving get() = goal != null || (!dragging && abs(vLon) + abs(vLat) > 0.01)

    fun turnBy(dLon: Double, dLat: Double) { lon0 = Globe.norm(lon0 + dLon); lat0 = (lat0 + dLat).coerceIn(-Globe.MAX_LAT, Globe.MAX_LAT) }
    fun faceTo(lon: Double, lat: Double, calm: Boolean) {
        vLon = 0.0; vLat = 0.0
        val g = Globe.nearestLon(lon0, lon) to lat.coerceIn(-Globe.MAX_LAT, Globe.MAX_LAT)
        if (calm) { lon0 = Globe.norm(g.first); lat0 = g.second; goal = null } else goal = g
    }
    /** One frame of `dt` seconds (web frame()). */
    fun step(dt: Double) {
        val g = goal
        if (g != null) {
            val k = 1 - exp(-dt * 5)
            val lon = lon0 + (g.first - lon0) * k
            lat0 += (g.second - lat0) * k
            if (abs(g.first - lon) + abs(g.second - lat0) < 0.1) { lon0 = Globe.norm(g.first); lat0 = g.second; goal = null }
            else { lon0 = lon; goal = g }
        } else if (!dragging) {
            val f = dt * 60
            turnBy(vLon * f, vLat * f)
            val decay = 0.93.pow(f)
            vLon *= decay; vLat *= decay
            if (abs(vLon) + abs(vLat) <= 0.01) { vLon = 0.0; vLat = 0.0 }
        }
    }
    /** The globe's radius on screen: the web's perspective size at this distance (3.6 fills 3/4 of the half view). */
    fun radius(half: Float): Float {
        fun f(d: Float) = 1f / sqrt(d * d - 1f)
        return half * .75f * f(dist) / f(START_DIST)
    }
}

@Composable
internal fun GlobeScreen(profile: Profile, vm: GameViewModel) {
    val prefs = profile.preferences
    val context = LocalContext.current
    val lowRam = remember { context.getSystemService(ActivityManager::class.java)?.isLowRamDevice == true }
    val geo by produceState<GlobeGeo?>(null) { value = withContext(Dispatchers.Default) { GlobeGeo(if (lowRam) 2 else 1) } }
    val seed = rememberSaveable { Random.nextInt(1, Int.MAX_VALUE / 7919) }
    var gs by rememberSaveable(stateSaver = StateSaver) { mutableStateOf(GlobeGame.start(seed)) }
    // the web starts facing the Arab world: face(36, 28)
    val view = rememberSaveable(saver = ViewSaver) { GlobeView(36.0, 28.0, START_DIST) }

    val engine = rememberMusicEngine(prefs.sound)
    val scope = rememberCoroutineScope()
    val kit = remember(engine, prefs.calm) { AtlasKit(engine, scope, prefs.calm) }
    val haptic = LocalHapticFeedback.current

    // The globe turns to the chosen country (bumped by `turn`), and every opened card is a visit (web visit()).
    val firstTurn = remember { gs.turn }
    LaunchedEffect(gs.turn) {
        if (gs.turn != firstTurn) gs.face?.let { AtlasWorld.country(it) }?.let { view.faceTo(it.lon, it.lat, prefs.calm) }
    }
    LaunchedEffect(gs.card) { gs.card?.let { if (it !in profile.atlasVisited) vm.visitCountry(it) } }
    // A miss and a win sound and buzz, as in the quests; nothing plays on restoration.
    val feedbackKey = gs.wrongTick to gs.won
    var lastFeedback by remember { mutableStateOf(feedbackKey) }
    LaunchedEffect(feedbackKey) {
        if (feedbackKey != lastFeedback) {
            val bad = feedbackKey.first != lastFeedback.first
            if (bad || feedbackKey.second) {
                if (prefs.haptics) haptic.performHapticFeedback(if (bad) HapticFeedbackType.LongPress else HapticFeedbackType.TextHandleMove)
                kit.feedback(!bad, !bad)
            }
        }
        lastFeedback = feedbackKey
    }
    // Frames run only while the globe is moving.
    LaunchedEffect(view) {
        while (true) {
            snapshotFlow { view.moving }.first { it }
            var last = withFrameNanos { it }
            while (view.moving) withFrameNanos { now -> view.step(((now - last) / 1e9).coerceIn(0.0, .05)); last = now }
        }
    }

    val choose: (String) -> Unit = { id -> gs = GlobeGame.choose(gs, id) }
    val arabVisited = profile.atlasVisited.count { AtlasWorld.country(it)?.arab == true }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val cardMax = maxHeight * .48f
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ModeButton("🔎 أستكشف", gs.mode == GlobeMode.Explore, Modifier.weight(1f)) { gs = GlobeGame.setMode(gs, GlobeMode.Explore) }
                ModeButton("📍 أين تقع؟", gs.mode == GlobeMode.Find, Modifier.weight(1f)) { gs = GlobeGame.setMode(gs, GlobeMode.Find) }
                ModeButton("🚩 علم مَن هذا؟", gs.mode == GlobeMode.Flag, Modifier.weight(1f)) { gs = GlobeGame.setMode(gs, GlobeMode.Flag) }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(color = Paper, shape = RoundedCornerShape(50), modifier = Modifier.semantics(mergeDescendants = true) {
                    contentDescription = "زرت $arabVisited من ${AtlasWorld.arab.size} دولة عربية"
                }) {
                    Text("🛂 $arabVisited من ${AtlasWorld.arab.size}", Modifier.padding(horizontal = 12.dp, vertical = 6.dp), fontWeight = FontWeight.Bold)
                }
                if (gs.mode == GlobeMode.Explore) SearchBox(Modifier.weight(1f)) { c -> choose(c.id) }
            }
            gs.line?.let { HelperLine("سهيل", it) { mood, m -> StarHelper(mood, m) } }
            if (gs.mode != GlobeMode.Explore) AskPanel(gs, onPick = { gs = GlobeGame.pickFlag(gs, it) }, onNext = { gs = GlobeGame.newRound(gs) })
            Box(Modifier.weight(1f).fillMaxWidth().clipToBounds()) {
                val g = geo
                if (g == null) CircularProgressIndicator(Modifier.align(Alignment.Center), color = Gold)
                else GlobeCanvas(g, view, gs, prefs.calm, prefs.largeText, Modifier.fillMaxSize(), onTap = choose)
                if (gs.mode == GlobeMode.Explore && gs.card == null)
                    Text("👆 اسحب لتدير الأرض، واضغط على دولة لتفتح بطاقتها", Modifier.align(Alignment.BottomCenter).padding(4.dp),
                        color = Paper, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
            }
            gs.card?.let { AtlasWorld.country(it) }?.let { c ->
                CountryCard(c, Modifier.fillMaxWidth().heightIn(max = cardMax)) { gs = GlobeGame.closeCard(gs) }
            }
        }
    }
}

@Composable
private fun ModeButton(text: String, on: Boolean, modifier: Modifier, click: () -> Unit) {
    Button(onClick = click, modifier = modifier.heightIn(min = 48.dp).semantics { selected = on },
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 4.dp),
        colors = ButtonDefaults.buttonColors(containerColor = if (on) Gold else Paper, contentColor = Ink),
        border = if (on) BorderStroke(2.dp, Ink) else null) {
        Text(text, textAlign = TextAlign.Center, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
private fun SearchBox(modifier: Modifier, pick: (Country) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    Column(modifier) {
        OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), singleLine = true,
            placeholder = { Text("ابحث عن بلد") }, label = { Text("ابحث عن بلد") },
            colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Paper, unfocusedContainerColor = Paper))
        val found = remember(query) { GlobeGame.search(query) }
        if (found.isNotEmpty()) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            found.forEach { c ->
                Button(onClick = { pick(c); query = "" }, Modifier.heightIn(min = 48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Paper, contentColor = Ink)) { Text(c.ar) }
            }
        }
    }
}

@Composable
private fun AskPanel(gs: GlobeState, onPick: (String) -> Unit, onNext: () -> Unit) {
    val id = gs.answer ?: return
    val name = AtlasWorld.country(id)?.ar.orEmpty()
    Surface(color = Paper, shape = RoundedCornerShape(16.dp), border = BorderStroke(2.dp, Gold), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            when (gs.mode) {
                GlobeMode.Find -> Text(rich("📍 أين تقع **$name**؟ ${if (gs.playing) "اضغط عليها على الكرة الأرضية " else ""}⭐ ${gs.score}"),
                    style = MaterialTheme.typography.titleMedium)
                GlobeMode.Flag -> {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AtlasWorld.country(id)?.flag?.let { FlagView(it, "العلم", Modifier.width(96.dp)) }
                        Text("🚩 علم مَن هذا؟ ⭐ ${gs.score}", style = MaterialTheme.typography.titleMedium)
                    }
                    if (gs.playing) Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        gs.options.forEach { o ->
                            val off = o in gs.disabled
                            Button(onClick = { onPick(o) }, enabled = !off, modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Sand, contentColor = Ink)) {
                                Text(AtlasWorld.country(o)?.ar.orEmpty(), textAlign = TextAlign.Center)
                            }
                        }
                    }
                }
                GlobeMode.Explore -> {}
            }
            if (gs.won) Button(onClick = onNext, Modifier.heightIn(min = 48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)) { Text("التالي ◀") }
        }
    }
}

/** The country card (web cardHTML): a full card for the 71 countries with a flag, a short one for the rest. */
@Composable
private fun CountryCard(c: Country, modifier: Modifier, close: () -> Unit) {
    val continent = AtlasWorld.globe.continents[c.continent].orEmpty()
    Surface(color = Paper, shape = RoundedCornerShape(18.dp), border = BorderStroke(2.dp, Sand), modifier = modifier) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                c.flag?.let { FlagView(it, "علم ${c.ar}", Modifier.width(84.dp)) }
                Column(Modifier.weight(1f)) {
                    Text(c.ar, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge, color = Ink)
                    val sub = if (c.full) c.official.orEmpty() else continent + (c.capital?.let { " • العاصمة: $it" } ?: "")
                    if (sub.isNotEmpty()) Text(sub, style = MaterialTheme.typography.bodyMedium, color = Ink.copy(alpha = .75f))
                }
                IconButton(onClick = close, Modifier.size(48.dp)) { Text("✕", color = Ink) }
            }
            if (c.full) {
                FactRow("🏛️", "العاصمة", c.capital)
                FactRow("🌍", "القارّة", continent)
                FactRow("💰", "العملة", c.currency?.let { "${it.ar} ${it.code}" })
                FactRow("🗣️", "اللغة", c.language)
                FactRow("📛", "معنى الاسم", c.nameMeaning)
                FactRow("🚩", "معنى العلم", c.flagMeaning)
                FactRow("⛏️", "من مواردها", c.resources.joinToString("، ").ifEmpty { null })
                FactRow("💡", "هل تعلم؟", c.fact)
            } else c.note?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = Ink) }
        }
    }
}

@Composable
private fun FactRow(icon: String, key: String, value: String?) {
    if (value.isNullOrEmpty()) return
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.semantics(mergeDescendants = true) {}) {
        Text(icon, Modifier.clearAndSetSemantics { })
        Column {
            Text(key, style = MaterialTheme.typography.labelMedium, color = Teal)
            Text(value, style = MaterialTheme.typography.bodyLarge, color = Ink)
        }
    }
}

@Composable
private fun GlobeCanvas(geo: GlobeGeo, view: GlobeView, gs: GlobeState, calm: Boolean, largeText: Boolean, modifier: Modifier, onTap: (String) -> Unit) {
    val density = androidx.compose.ui.platform.LocalDensity.current.density
    val label = remember(largeText) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; textSize = (if (largeText) 17 else 13) * density; typeface = Typeface.DEFAULT_BOLD }
    }
    val halo = remember(label) { Paint(label).apply { style = Paint.Style.STROKE; strokeWidth = 3.5f * density; color = Ink.toArgb() } }
    val centre by remember(view) { derivedStateOf { Globe.countryAt(view.lon0, view.lat0)?.let { AtlasWorld.country(it)?.ar } } }
    val tapState = rememberUpdatedState(onTap)
    val calmState = rememberUpdatedState(calm)
    Canvas(modifier
        .semantics {
            contentDescription = "الكرة الأرضية. في الوسط: ${centre ?: "بحر"}"
            customActions = listOf(
                CustomAccessibilityAction("اختر ${centre ?: "ما في الوسط"}") { Globe.countryAt(view.lon0, view.lat0)?.let(tapState.value); true },
                CustomAccessibilityAction("أدر نحو الشرق") { view.goal = null; view.turnBy(20.0, 0.0); true },
                CustomAccessibilityAction("أدر نحو الغرب") { view.goal = null; view.turnBy(-20.0, 0.0); true },
                CustomAccessibilityAction("أدر نحو الشمال") { view.goal = null; view.turnBy(0.0, 15.0); true },
                CustomAccessibilityAction("أدر نحو الجنوب") { view.goal = null; view.turnBy(0.0, -15.0); true },
                CustomAccessibilityAction("قرّب") { view.dist = (view.dist / 1.25f).coerceIn(1.7f, 4.6f); true },
                CustomAccessibilityAction("بعّد") { view.dist = (view.dist * 1.25f).coerceIn(1.7f, 4.6f); true },
            )
        }
        .pointerInput(view) {
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false)
                view.dragging = true; view.vLon = 0.0; view.vLat = 0.0; view.goal = null
                var moved = 0f
                do {
                    val event = awaitPointerEvent()
                    val fingers = event.changes.count { it.pressed }
                    if (fingers >= 2) {
                        val z = event.calculateZoom()
                        if (z > 0f) view.dist = (view.dist / z).coerceIn(1.7f, 4.6f)
                        moved += 20 * density
                    } else if (fingers == 1) {
                        val pan = event.calculatePan()
                        if (pan != Offset.Zero) {
                            moved += abs(pan.x) + abs(pan.y)
                            // web: 0.005 rad per CSS pixel at distance 3.6, finer when closer
                            val k = 0.005 * (view.dist / START_DIST) / Globe.RAD / density
                            view.vLon = -pan.x * k; view.vLat = pan.y * k
                            view.turnBy(view.vLon, view.vLat)
                        }
                    }
                    event.changes.forEach { if (it.positionChanged()) it.consume() }
                } while (event.changes.any { it.pressed })
                view.dragging = false
                if (calmState.value) { view.vLon = 0.0; view.vLat = 0.0 }
                if (moved < 8 * density) {
                    view.vLon = 0.0; view.vLat = 0.0
                    val half = minOf(size.width, size.height) / 2f
                    val r = view.radius(half)
                    val x = (down.position.x - size.width / 2f) / r
                    val y = (size.height / 2f - down.position.y) / r
                    Globe.unproject(x.toDouble(), y.toDouble(), view.lon0, view.lat0)?.let { ll -> Globe.countryAt(ll[0], ll[1])?.let(tapState.value) }
                }
            }
        }) {
        drawGlobe(geo, view, gs, label, halo)
    }
}

private fun DrawScope.drawGlobe(geo: GlobeGeo, view: GlobeView, gs: GlobeState, label: Paint, halo: Paint) {
    val cx = size.width / 2f; val cy = size.height / 2f
    val r = view.radius(minOf(size.width, size.height) / 2f)
    val c0 = cos(view.lon0 * Globe.RAD).toFloat(); val s0 = sin(view.lon0 * Globe.RAD).toFloat()
    val cp0 = cos(view.lat0 * Globe.RAD).toFloat(); val sp0 = sin(view.lat0 * Globe.RAD).toFloat()
    val buf = geo.buf

    // project n points of `a` into buf as (x, y, z) on screen; returns how many face the viewer
    fun project(a: FloatArray): Int {
        var front = 0
        var i = 0; var o = 0
        while (i < a.size) {
            val cp = a[i]; val sp = a[i + 1]; val cl = a[i + 2]; val sl = a[i + 3]
            val cd = cl * c0 + sl * s0; val sd = sl * c0 - cl * s0
            var x = cp * sd
            var y = cp0 * sp - sp0 * cp * cd
            val z = sp0 * sp + cp0 * cp * cd
            if (z >= 0f) front++ else { val l = hypot(x, y); if (l > 0f) { x /= l; y /= l } }
            buf[o] = cx + x * r; buf[o + 1] = cy - y * r; buf[o + 2] = z
            i += 4; o += 3
        }
        return front
    }

    drawCircle(Color(115, 190, 255, 60), r * 1.06f, Offset(cx, cy))
    drawCircle(Brush.radialGradient(listOf(Color(0xFF3F9BD6), Color(0xFF2B6FB3)), Offset(cx - r * .25f, cy - r * .25f), r * 1.3f), r, Offset(cx, cy))

    // the graticule and the dashed equator (only the half facing the viewer)
    fun lines(path: Path, list: List<FloatArray>) {
        path.rewind()
        for (a in list) {
            project(a)
            var pen = false
            for (j in 0 until a.size / 4) {
                val o = j * 3
                if (buf[o + 2] < 0f) { pen = false; continue }
                if (pen) path.lineTo(buf[o], buf[o + 1]) else path.moveTo(buf[o], buf[o + 1])
                pen = true
            }
        }
    }
    lines(geo.gridPath, geo.grid)
    drawPath(geo.gridPath, GRID, style = Stroke(1.dp.toPx()))
    lines(geo.equatorPath, listOf(geo.equator))
    drawPath(geo.equatorPath, EQUATOR, style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 6.dp.toPx()))))

    val sel = gs.selected
    val mark = gs.mark
    var selIndex = -1
    geo.countries.forEachIndexed { k, c ->
        val path = geo.paths[k]
        path.rewind()
        var any = false
        for (a in geo.rings[k]) {
            if (project(a) == 0) continue
            any = true
            for (j in 0 until a.size / 4) { val o = j * 3; if (j == 0) path.moveTo(buf[o], buf[o + 1]) else path.lineTo(buf[o], buf[o + 1]) }
            path.close()
        }
        if (!any) return@forEachIndexed
        if (c.id == sel) { selIndex = k; return@forEachIndexed }
        drawPath(path, when { c.id == mark -> MARK_FILL; c.arab -> ARAB_FILL; else -> PAL[c.continent] ?: OTHER_FILL })
        drawPath(path, EDGE, style = Stroke(1.dp.toPx() * .8f))
    }
    if (selIndex >= 0) {
        drawPath(geo.paths[selIndex], SEL_FILL)
        drawPath(geo.paths[selIndex], SEL_EDGE, style = Stroke(2.dp.toPx()))
    }
    val pt = FloatArray(3)
    fun at(c: Country): Offset? {
        Globe.project(c.lon, c.lat, view.lon0, view.lat0).let { p -> pt[0] = p[0].toFloat(); pt[1] = p[1].toFloat(); pt[2] = p[2].toFloat() }
        return if (pt[2] > .2f) Offset(cx + pt[0] * r, cy - pt[1] * r) else null
    }
    // the two Arab countries too small for an outline: dots (web SMALL)
    for (c in geo.small) {
        val p = at(c) ?: continue
        val isSel = c.id == sel
        drawCircle(if (isSel) SEL_FILL else if (c.id == mark) MARK_FILL else if (c.arab) ARAB_FILL else OTHER_FILL, (if (isSel) 7 else 5).dp.toPx(), p)
        drawCircle(Color(0xFF5A4A30), (if (isSel) 7 else 5).dp.toPx(), p, style = Stroke(1.5.dp.toPx()))
    }
    // names pinned on the globe: the chosen country, and every Arab country when close (web: dist < 2.6, explore)
    val names = buildList {
        if (view.dist < 2.6f && gs.mode == GlobeMode.Explore) addAll(AtlasWorld.arab.filter { it != sel })
        if (sel != null) add(sel)
    }
    for (id in names) {
        val c = AtlasWorld.country(id) ?: continue
        val p = at(c) ?: continue
        label.color = if (id == sel) SEL_FILL.toArgb() else Paper.toArgb()
        val y = p.y - 8.dp.toPx()
        drawContext.canvas.nativeCanvas.drawText(c.ar, p.x, y, halo)
        drawContext.canvas.nativeCanvas.drawText(c.ar, p.x, y, label)
    }
}
