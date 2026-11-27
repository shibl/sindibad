package org.sindibad.android.ui.science

import androidx.compose.ui.graphics.Color
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

// The science island's pictures (web: core/lab/views.ts and views-machines.ts), drawn natively with a Pen in
// 320 × 200 picture units, after the book's own diagrams. Each picture knows how its experiment plays once a
// part is found (the web's `st-<id>` classes and CSS in style.css «science pictures»): pins jump to the magnet,
// the spring stretches, the folded paper lands first, the filter clears the water… In calm mode every
// experiment shows its end at once. The touch boxes and name positions of the parts are data
// (science-quests.json `views`, exported from the web pictures); ScienceKit lays touch targets over them.

/** What a picture shows now: the parts found (kept), the latest opened, how far each experiment has played. */
class Stage(
    val found: Set<String>,
    /** The part opened last (the web's data-st): the scale's reading, the ramp's set-up. */
    val latest: String?,
    /** How far the change to [latest] has played, 0..1. */
    val fresh: Float,
    /** Seconds of looping motion (breath, drips); always 0 in calm mode. */
    val time: Float,
    private val progress: Map<String, Float>,
    /** The part opened before [latest] (what the ramp fades from). */
    val previous: String? = null,
) {
    fun on(id: String) = id in found
    /** How far the experiment of part [id] has played, 0 (not found) .. 1 (done). */
    fun p(id: String) = if (id in found) progress[id] ?: 1f else 0f
    /** The share of [id]'s experiment between [a] and [b] (of its whole time), eased. */
    fun seg(id: String, a: Float, b: Float) = ease(((p(id) - a) / (b - a)).coerceIn(0f, 1f))

    companion object {
        /** A finished picture: every part found, nothing moving (label questions, `pic`, tests). */
        fun still(found: Set<String> = emptySet(), latest: String? = null) = Stage(found, latest, 1f, 0f, emptyMap())
    }
}

/** CSS `ease`, close enough: slow in, slow out. */
fun ease(x: Float) = x * x * (3 - 2 * x)
private fun easeOut(x: Float) = 1 - (1 - x) * (1 - x)
private fun mix(a: Float, b: Float, t: Float) = a + (b - a) * t
/** The web's `shake` keyframes (±6 px), played `times` over t in 0..1. */
internal fun shake(t: Float, times: Int) = if (t <= 0f || t >= 1f) 0f else (sin(t * times * 2 * PI).toFloat() * 6f)

/**
 * One picture: [ms] is how long its experiments play (some parts take their own [partMs]); [loops] says it has
 * looping motion (drawn only when motion is allowed).
 */
class SciView(val name: String, val ms: Int = 1200, val partMs: Map<String, Int> = emptyMap(), val loops: Boolean = false, val draw: Pen.(Stage) -> Unit) {
    fun duration(id: String) = partMs[id] ?: ms
}

val RED = hex("#e8453c"); val BLUE = hex("#3f8fd6"); val GREEN = hex("#2f9a4a"); val YELLOW = hex("#e0a400")
val SKIN = hex("#f6c9a0"); val WOOD = hex("#a8703f"); val WOOD_LIGHT = hex("#c99863"); val STEEL = hex("#9aa5ad")
val FOUND_GREEN = hex("#2f8a5f")

// ---------- Shared parts ----------

internal fun Pen.sky() = gradient(0, 0, 320, 200, hex("#bfe8ff"), hex("#eaf8ff"))
internal fun Pen.bg(h: String) = rect(0, 0, 320, 200, hex(h))
internal fun Pen.table(y: Number = 150, x0: Number = 10, x1: Number = 310) {
    rect(x0, y, x1.f - x0.f, 12, WOOD_LIGHT, INK, 2, 4)
    rect(x0.f + 14, y.f + 12, 10, 196 - y.f - 12, WOOD)
    rect(x1.f - 24, y.f + 12, 10, 196 - y.f - 12, WOOD)
}
internal fun springPath(x: Float, y: Float, len: Float, coils: Int = 8, w: Float = 9f) = buildString {
    append("M$x $y")
    for (i in 0 until coils) append(" L${x + if (i % 2 == 1) -w else w} ${y + ((i + .5f) / coils) * len}")
    append(" L$x ${y + len}")
}
/** The spring scale (الرّبيعة) hanging from y0; its spring stretched by [stretchY]. */
internal fun Pen.scaleTool(x: Float, y0: Float, len: Float, reading: String, stretchY: Float = 1f) {
    rect(x - 13, y0, 26, len + 34, BLUE, INK, 2.5, 8)
    circle(x, y0 - 7, 6, stroke = INK, sw = 2.5)
    stretch(1, stretchY, x, y0 + 8) { path(springPath(x, y0 + 8, len), stroke = hex("#7a858d"), sw = 2.5) }
    rect(x - 9, y0 + 8 + len, 18, 4, RED, r = 2)
    line(x, y0 + 12 + len, x, y0 + 34 + len, INK, 2.5)
    text(reading, x + 22, y0 + 14 + len, 15, RED, halo = true, start = true)
}
internal fun Pen.weight(x: Float, y: Float, w: Float = 26f, h: Float = 22f, label: String = "", alpha: Float = 1f) {
    poly(x - w / 2, y + h, x - w / 2 + 4, y, x + w / 2 - 4, y, x + w / 2, y + h, fill = hex("#3b3640"), stroke = INK, alpha = alpha)
    circle(x, y - 3, 4, stroke = INK, sw = 2.5, alpha = alpha)
    if (label.isNotEmpty()) text(label, x, y + h / 2 + 4, 11, Color.White, alpha = alpha)
}
/** A round node with an emoji (the food chain, the castle's machines). */
internal fun Pen.node(x: Number, y: Number, e: String, r: Number = 19, size: Number = 22) {
    circle(x, y, r, Color.White, INK, 2.5)
    emo(e, x, y.f + 1, size)
}
private fun Pen.drop(x: Float, y: Float, yellow: Boolean = false, alpha: Float = 1f) =
    path("M$x $y q4 6 0 10 q-4 -4 0 -10z", if (yellow) hex("#ffe066") else hex("#7fd0ff"), if (yellow) YELLOW else BLUE, 1.2, alpha)
private val CUP = Color(0x99DCF0FF)

// ---------- Unit 1: living things ----------

private val valley = SciView("valley") {
    sky()
    path("M0 120 Q60 70 120 110 T240 95 T320 110 V200 H0Z", hex("#a6d98b"))
    path("M0 140 Q80 115 160 135 T320 130 V200 H0Z", hex("#8ccc72"))
    ellipse(236, 172, 70, 16, hex("#7fd0f0")); rect(0, 182, 320, 18, hex("#a07a4f"))
    rect(54, 70, 8, 70, hex("#8a5a34")); path("M58 30 L30 82 H86 Z M58 50 L26 104 H90 Z", hex("#3f9a4e"))
    ellipse(70, 76, 13, 6, hex("#9a6a3c")); circle(66, 72, 3.4, hex("#eaf4ff")); circle(73, 72, 3.4, hex("#eaf4ff"))
    emo("🐇", 130, 150, 26); circle(152, 146, 9, hex("#5aa244")); circle(149, 142, 2.4, RED); circle(155, 147, 2.4, RED)
    emo("🐑", 206, 122, 28); ellipse(222, 140, 5, 3, hex("#6b4a2a")); ellipse(229, 141, 4, 2.5, hex("#6b4a2a"))
    emo("🐦", 250, 40, 24)
    // The bird lets its seed fall once found.
    move(0, 24 * it.seg("seed", 0f, 1f)) { circle(238, 50, 2.5, hex("#c98a3a")) }
    path("M24 190 q8 -6 16 0 t16 0", stroke = hex("#d97a6a"), sw = 4); circle(20, 188, 1.6, hex("#5a3a22"))
}

private val story = SciView("story") {
    bg("#fffdf8")
    for (i in 0..2) rect(8 + i * 104, 18, 96, 164, Color.White, hex("#d9c7a6"), 2, 12)
    emo("🐅", 268, 86, 36); emo("🦌", 238, 124, 26); text("النمر والغزال", 260, 166)
    emo("🦴", 160, 120, 26); emo("🐺", 184, 92, 26); emo("🐺", 138, 86, 22); text("الضباع", 160, 166)
    emo("🦴", 56, 120, 30); circle(56, 78, 22, Color.White.copy(alpha = .8f), INK, 2.5)
    emo("🦠", 48, 74, 14); emo("🍄", 64, 84, 13); emo("🪱", 58, 68, 12); text("ديدان وفطريات", 56, 166)
}

private val chain = SciView("chain", ms = 500) { st ->
    bg("#eef9e8")
    val life = listOf("grass" to "🌿", "hopper" to "🦗", "frog" to "🐸", "snake" to "🐍", "hawk" to "🦅")
    val x = { i: Int -> 286f - i * 63 }
    // The energy's arrows appear as it travels: the arrow into each eater lights when the eater is found.
    for (i in 0..3) arrow(x(i) - 21, 100, x(i + 1) + 21, 100, alpha = .15f + .85f * st.p(life[i + 1].first))
    life.forEachIndexed { i, (_, e) -> node(x(i), 100, e) }
    text("⚡ الطاقة", 160, 40, color = YELLOW)
}

private val web = SciView("web", ms = 500) { st ->
    bg("#eef7ea")
    val n = mapOf("seeds" to Triple(210f, 170f, "🌾"), "mouse" to Triple(210f, 112f, "🐭"), "owl" to Triple(270f, 40f, "🦉"),
        "snake" to Triple(170f, 40f, "🐍"), "fox" to Triple(70f, 46f, "🦊"), "grass" to Triple(80f, 170f, "🌿"), "rabbit" to Triple(80f, 112f, "🐇"))
    fun a(f: String, t: String, chains: List<String>) {
        val (x1, y1) = n.getValue(f); val (x2, y2) = n.getValue(t); val d = hypot(x2 - x1, y2 - y1)
        val lit = chains.maxOf { st.p(it) }
        // Chain 1 (to the owl) lights red, chain 3 (to the fox) blue, chain 2 (to the snake) ink.
        val color = when { "c1" in chains && st.on("c1") -> RED; "c3" in chains && st.on("c3") -> BLUE; else -> INK }
        arrow(x1 + (x2 - x1) / d * 20, y1 + (y2 - y1) / d * 20, x2 - (x2 - x1) / d * 21, y2 - (y2 - y1) / d * 21, color, alpha = .15f + .85f * lit)
    }
    a("seeds", "mouse", listOf("c1", "c2")); a("mouse", "owl", listOf("c1")); a("mouse", "snake", listOf("c2"))
    a("grass", "rabbit", listOf("c3")); a("rabbit", "fox", listOf("c3")); a("mouse", "fox", listOf("c3"))
    for ((x, y, e) in n.values) node(x, y, e)
}

private val town = SciView("town") {
    sky(); rect(0, 130, 320, 70, hex("#9bd27a")); path("M0 160 Q50 150 90 165 T170 160 V200 H0Z", hex("#7fd0f0"))
    emo("🪵", 236, 150, 26); emo("🪓", 262, 140, 22)
    emo("🌳", 294, 52, 34); emo("🐐", 282, 78, 22)
    emo("🗑️", 40, 172, 22); circle(64, 176, 4, RED); rect(72, 172, 9, 5, hex("#ffd23f"))
    rect(128, 88, 46, 44, STEEL); rect(136, 60, 10, 30, hex("#7a858d"))
    circle(141, 52, 8, hex("#c9cfd4"), alpha = .85f); circle(150, 40, 10, hex("#c9cfd4"), alpha = .85f)
    rect(22, 40, 70, 44, hex("#f6f2a0"), INK, 2, 6); emo("⚖️", 57, 58, 18); text("قوانين", 57, 78, color = hex("#c7373f"))
    emo("🌱", 218, 74, 22); emo("🧑‍🌾", 200, 68, 24)
}

private val dust = SciView("dust", ms = 600) { st ->
    bg("#f4efe6")
    val cards = listOf(Triple("window", "🪟", "النافذة") to 2, Triple("stairs", "🪜", "الدرج") to 3, Triple("board", "🧑‍🏫", "السبّورة") to 4, Triple("yard", "🏫", "الباحة") to 6)
    cards.forEachIndexed { i, (c, n) ->
        val (id, e, name) = c
        val x = 250f - i * 76
        rect(x - 30, 60, 60, 96, Color.White, INK, 2, 8)
        rect(x - 26, 78, 52, 62, hex("#fff6c8"), hex("#e8d48a"), 1, 5)
        // The jelly card shows its dust once found: the more people pass, the more dust.
        val a = st.p(id)
        if (a > 0f) for (k in 0 until n * 4) circle(x - 22 + (k * 37) % 44, 86 + (k * 23) % 50, 1.4f + (k % 3) * .7f, hex("#8a7a5a"), alpha = a)
        emo(e, x, 44, 22); text(name, x, 172)
    }
}

// ---------- Unit 2: forces ----------

private val pins = SciView("pins", ms = 1500) { st ->
    bg("#fff6e6"); table(150)
    val cols = listOf("#e8453c", "#3f8fd6", "#f2c14e", "#4fbf5a", "#8a63c9").map(::hex)
    fun pin(x: Float, y: Float, c: Color) { line(x, y, x + 9, y + 3, hex("#7a858d"), 1.2); circle(x, y, 3.2, c) }
    // The ruler pushes only the pins it touches; the magnet pulls the others from afar.
    val ruler = st.seg("ruler", 0f, .67f)
    move(-26 * ruler, 0) { for (i in 0..3) pin(186f + i * 9, 140f + (i % 2) * 4, cols[i]) }
    move(-22 * st.seg("magnet", .33f, 1f), -16 * st.seg("magnet", .33f, 1f)) { for (i in 0..3) pin(106f + i * 10, 140f + (i % 2) * 4, cols[(i + 2) % 5]) }
    move(-38 * ruler, 0) {
        rect(236, 126, 74, 16, hex("#f28c3a"), INK, 2, 3)
        for (i in 0..6) line(244 + i * 9, 126, 244 + i * 9, if (i % 2 == 1) 131 else 134, INK, 1.5)
    }
    move(14 * st.seg("magnet", 0f, .67f), 0) {
        path("M30 112 h18 v26 a12 12 0 0 0 24 0 v-26 h18 v26 a30 30 0 0 1 -60 0z", RED, INK, 2.5)
        rect(30, 112, 18, 10, hex("#eaeaea"), INK, 2); rect(72, 112, 18, 10, hex("#eaeaea"), INK, 2)
    }
}

private val car = SciView("car", ms = 500, partMs = mapOf("magnet" to 1700)) { st ->
    bg("#f1f7ff"); table(146)
    move(46 * st.seg("magnet", .3f, 1f), 0) {
        rect(120, 108, 80, 30, hex("#8a63c9"), INK, 2.5, 10); rect(138, 94, 44, 18, hex("#b79cf0"), INK, 2, 6)
        rect(146, 86, 28, 9, RED, INK, 1.5); circle(140, 140, 9, hex("#3b3640"), INK); circle(182, 140, 9, hex("#3b3640"), INK)
    }
    arrow(160, 120, 160, 188, YELLOW, alpha = st.p("weight")); text("الفعل", 186, 182, alpha = st.p("weight"))
    arrow(130, 152, 130, 64, GREEN, alpha = st.p("reaction")); text("ردّ الفعل", 100, 66, alpha = st.p("reaction"))
    emo("⚖️", 262, 44, 26, alpha = st.p("balanced"))
    val hand = st.seg("magnet", 0f, .7f)
    move(-16 * hand, 0) {
        val a = .55f + .45f * hand
        rect(236, 88, 34, 14, RED, INK, 2, 3, alpha = a); rect(262, 88, 10, 14, BLUE, INK, 2, alpha = a); circle(286, 95, 12, SKIN, INK, alpha = a)
    }
}

private val scale = SciView("scale", ms = 1000) { st ->
    bg("#f3f8ff"); table(160)
    rect(236, 12, 8, 150, STEEL); rect(150, 12, 94, 8, STEEL)
    val pull = st.seg("pull", 0f, 1f)
    // The reading turns to 3N when the scale lifts the weight (web: views.ts scale.spot).
    move(0, -6 * pull) { scaleTool(160f, 28f, 34f, if (st.on("pull")) "3N" else "0N", 1 + .25f * pull) }
    move(0, -22 * pull) {
        line(160, 96, 160, 136, RED, 2)
        weight(160f, 136f, 34f, 24f)
    }
}

private val vector = SciView("vector") {
    bg("#fffaf0")
    line(20, 100, 300, 100, INK, 2.5, floatArrayOf(8f, 6f), cap = androidx.compose.ui.graphics.StrokeCap.Butt)
    text("X′", 22, 88); text("X", 298, 88)
    line(90, 150, 230, 150, BLUE, 4); line(90, 142, 90, 158, BLUE, 4); line(230, 142, 230, 158, BLUE, 4)
    arrow(90, 100, 232, 100, RED)
    circle(226, 100, 14, stroke = RED, sw = 2, dash = floatArrayOf(4f, 3f))
    circle(90, 100, 7, RED, INK); text("O", 90, 82)
}

private val resultant = SciView("resultant", ms = 800) { st ->
    bg("#f3f8ff"); rect(60, 10, 200, 8, STEEL)
    // Hang w₁, add w₂, then swap both for w: the scale reads 2N, 5N, 5N (web: views.ts resultant.spot).
    val now = st.latest?.takeIf { it in setOf("empty", "w1", "w2", "w") }
    val reading = when (now) { "w1" -> "2N"; "w2", "w" -> "5N"; else -> "0N" }
    val stretch = when (now) { "w1" -> 1.4f; "w2", "w" -> 2f; else -> 1f }
    scaleTool(160f, 26f, 30f, reading, mix(1f, stretch, st.fresh))
    val a = st.fresh
    if (now == "w1" || now == "w2") weight(160f, 98f, 26f, 22f, "w₁", if (now == "w2") 1f else a)
    if (now == "w2") weight(160f, 124f, 34f, 26f, "w₂", a)
    if (now == "w") weight(160f, 106f, 44f, 36f, "w", a)
    weight(44f, 160f, 26f, 22f, "w₁"); text("2N", 44, 196)
    weight(96f, 156f, 34f, 26f, "w₂"); text("3N", 96, 196)
    weight(262f, 150f, 44f, 36f, "w"); text("5N", 262, 196)
}

private val book = SciView("book", ms = 1400) { st ->
    bg("#fdf4ec")
    val press = st.seg("press", 0f, 1f)
    move(6 * press, 0) {
        path("M60 50 h60 a14 14 0 0 1 14 14 v60 a14 14 0 0 1 -14 14 h-60z", SKIN, INK, 2.5); rect(20, 70, 44, 50, hex("#6fc3df"), INK, 2.5)
    }
    move(-6 * press, 0) {
        path("M260 50 h-60 a14 14 0 0 0 -14 14 v60 a14 14 0 0 0 14 14 h60z", SKIN, INK, 2.5); rect(256, 70, 44, 50, hex("#2fb3a8"), INK, 2.5)
    }
    move(0, 10 * st.seg("pull", 0f, 1f)) { rect(136, 30, 48, 118, BLUE, INK, 2.5, 4); rect(140, 34, 6, 110, hex("#2a6fb0")) }
    // Friction appears when the hand pulls, and grows when the palms press harder.
    val f = st.seg("pull", 0f, .4f)
    arrow(160, 96, 160, 30, RED, sw = 3.5f + 2.5f * press, alpha = f); text("الاحتكاك", 200, 28, color = hex("#c7373f"), alpha = f)
    circle(160, 176, 15, SKIN, INK, 2.5); arrow(160, 160, 160, 196, BLUE)
}

private val balls = SciView("balls", ms = 3000) { st ->
    bg("#fff8ec"); rect(10, 90, 300, 80, hex("#d9a86a"), INK, 2.5, 6)
    for (i in 0..5) line(20, 100 + i * 12, 300, 100 + i * 12, hex("#c4904f"), 1.2)
    // The ruler pushes both balls the same; the smooth glass ball rolls farther than the rough one.
    val p = st.p("push")
    move(-90 * easeOut((p / .67f).coerceIn(0f, 1f)), 0) { circle(270, 110, 11, RED, INK, 2.5) }
    move(-210 * easeOut((p / .87f).coerceIn(0f, 1f)), 0) { circle(270, 148, 11, hex("#7fc4ff"), INK, 2.5); circle(266, 144, 3, Color.White) }
    val flags = st.seg("push", .8f, .97f)
    emo("✏️", 190, 96, 16, flags); emo("✏️", 70, 136, 16, flags)
    move(-14 * st.seg("push", 0f, .13f), 0) { rect(286, 96, 14, 66, hex("#f28c3a"), INK, 2, 3) }
}

private val surfaces = SciView("surfaces", ms = 1400) { st ->
    bg("#f5f9ff")
    for ((id, y, fill, name, meter) in listOf(
        Lane("glass", 22, "#d9f5ee", "زجاج", 12), Lane("wood", 80, "#c99863", "خشب", 26), Lane("felt", 138, "#9c78d4", "جوخ", 44))) {
        rect(20, y, 230, 38, hex(fill), INK, 2, 6)
        text(name, 135, y + 25)
        move(-150 * st.seg(id, 0f, 1f), 0) { rect(200, y + 6, 26, 26, hex("#a9b3bc"), INK, 2, 3) }
        // The force meter fills more on rougher ground.
        rect(258, y + 8, 50, 22, Color.White, INK, 2, 6)
        val w = meter * st.seg(id, 0f, .65f)
        if (w > 0f) rect(261, y + 11, w, 16, RED, r = 4)
    }
}
private data class Lane(val id: String, val y: Int, val fill: String, val name: String, val meter: Int)

private val paper = SciView("paper", ms = 2600) { st ->
    bg("#f3f8ff"); rect(0, 182, 320, 18, WOOD_LIGHT)
    // Two sheets fall from the same height: the folded one lands first.
    val p = st.p("drop")
    val fold = ((p / .27f).coerceIn(0f, 1f)).let { it * it }
    val flat = ease((p / .92f).coerceIn(0f, 1f))
    move(0, 142 * flat) { turn(4 * flat, 190, 30) { path("M190 30 h90 l-6 10 h-78z", hex("#bfe3ff"), INK) } }
    move(0, 136 * fold) { rect(70, 24, 22, 22, hex("#bfe3ff"), INK, 2, 2) }
    circle(62, 38, 9, SKIN, INK); circle(290, 38, 9, SKIN, INK)
    text("الأولى! 🏁", 81, 168, color = hex("#c7373f"), alpha = st.seg("drop", .3f, .5f))
}

private val paraglider = SciView("paraglider") {
    sky()
    path("M90 50 Q160 0 230 50 Q160 30 90 50Z", hex("#f28c3a"), INK, 2.5)
    line(95, 50, 155, 112, INK, 1); line(225, 50, 165, 112, INK, 1); line(160, 36, 160, 112, INK, 1)
    circle(160, 118, 8, SKIN, INK); rect(152, 126, 16, 22, BLUE, INK, 2, 5)
    arrow(60, 170, 60, 70, GREEN)
    arrow(260, 70, 260, 170, GREEN)
}

private val push = SciView("push", ms = 1600) { st ->
    bg("#f7fbef")
    for (i in 0..2) line(10 + i * 104, 160, 102 + i * 104, 160, hex("#8ccc72"), 6)
    // Work: the horse moves the cart, the child moves the chair, the farmer pushes the rock and nothing moves.
    move(-26 * st.seg("horse", 0f, 1f), 0) {
        emo("🐴", 286, 136, 34); rect(226, 124, 40, 22, WOOD_LIGHT, INK, 2, 4)
        circle(236, 150, 7, hex("#8a5a34")); circle(258, 150, 7, hex("#8a5a34")); emo("🥬", 246, 120, 14)
    }
    text("الحصان", 262, 184)
    move(-34 * st.seg("chair", 0f, 1f), 0) {
        rect(140, 118, 26, 6, WOOD); rect(160, 96, 6, 28, WOOD); rect(142, 124, 4, 34, WOOD); rect(160, 124, 4, 34, WOOD)
    }
    emo("🧒", 188, 132, 30); text("الكرسيّ", 160, 184)
    move(shake((st.p("rock") * 2).coerceAtMost(1f), 3), 0) {
        path("M28 158 Q20 118 50 110 Q80 104 86 132 Q92 158 70 158Z", STEEL, INK, 2.5)
    }
    emo("🧑‍🌾", 96, 136, 28)
    text("لا عمل!", 56, 96, color = hex("#c7373f"), alpha = st.seg("rock", 0f, .3f)); text("الصخرة", 56, 184)
}

private val barrow = SciView("barrow", ms = 800) { st ->
    bg("#fbf7ee"); line(16, 170, 304, 170, INK, 2)
    text("العمل 🔨", 160, 22); emo("🛞", 160, 60, 26)
    for ((id, x, h, name) in listOf(Bar("light", 250, 26, "خفيفة"), Bar("heavy", 190, 62, "ثقيلة"), Bar("short", 110, 30, "5m"), Bar("long", 50, 62, "10m"))) {
        // The work bars grow (with a little overshoot, as on the web).
        val p = st.p(id)
        val g = if (p <= 0f) 0f else (1 - (1 - p) * (1 - p) * (1 - 2.2f * p)).coerceIn(0f, 1.12f)
        if (g > 0f) rect(x, 170 - h * g, 40, h * g, if (id == "heavy" || id == "long") hex("#f28c3a") else hex("#f2c14e"), INK, 2, 5)
        text(name, x + 20, 188)
    }
}
private data class Bar(val id: String, val x: Int, val h: Int, val name: String)

private val joule = SciView("joule", ms = 500) { st ->
    bg("#fffaf0")
    rect(236, 40, 70, 56, Color.White, INK, 2.5, 10); text("40N", 271, 74, 20); text("القوة F", 271, 114)
    text("×", 218, 76, 26)
    rect(128, 40, 70, 56, Color.White, INK, 2.5, 10); text("20m", 163, 74, 20); text("المسافة d", 163, 114)
    text("=", 110, 76, 26)
    rect(14, 40, 80, 56, hex("#fff6c8"), INK, 2.5, 10); text("800J", 54, 74, 20, alpha = st.p("w")); text("العمل W", 54, 114)
    text("W = F × d", 160, 168, 22, Pen.LABEL)
}

// ---------- Unit 3: my body ----------

private val exits = SciView("exits", ms = 500, loops = true) { st ->
    bg("#fdf2f4")
    circle(160, 40, 22, SKIN, INK, 2.5)
    path("M120 66 h80 a16 16 0 0 1 16 16 v64 h-112 v-64 a16 16 0 0 1 16 -16z", hex("#8fd0e8"), INK, 2.5)
    rect(126, 146, 28, 44, hex("#3b4a7a"), r = 8); rect(166, 146, 28, 44, hex("#3b4a7a"), r = 8)
    rect(86, 72, 22, 64, SKIN, INK, 2, 10); rect(212, 72, 22, 64, SKIN, INK, 2, 10)
    path("M146 78 q-14 4 -14 26 q0 14 12 10 q6 -2 6 -14z M174 78 q14 4 14 26 q0 14 -12 10 q-6 -2 -6 -14z", hex("#f29ac0"), INK, 1.8)
    // The lungs breathe out CO₂ (rising), the skin sweats, the kidneys make urine.
    val b = st.p("lungs")
    move(0, -5 * ((1 - cos(st.time * PI.toFloat())) / 2)) {
        circle(186, 38, 5, hex("#eef7ff"), STEEL, 1.5, b); circle(198, 28, 7, hex("#eef7ff"), STEEL, 1.5, b)
        text("CO₂", 236, 26, 10, alpha = b)
    }
    drop(226f, 92f, alpha = st.p("skin")); drop(222f, 112f, alpha = st.p("skin"))
    ellipse(148, 126, 7, 11, hex("#b33a3a"), INK, 1.5); ellipse(172, 124, 7, 11, hex("#b33a3a"), INK, 1.5)
    path("M160 150 q-6 8 0 14 q6 -6 0 -14z", hex("#ffe066"), YELLOW, 1.2, st.p("kidney"))
}

private val urinary = SciView("urinary") {
    bg("#fff4f2")
    rect(152, 14, 6, 150, RED, r = 3, alpha = .55f); rect(162, 14, 6, 150, BLUE, r = 3, alpha = .55f)
    val tube = hex("#f2d16a")
    path("M128 84 Q136 120 150 150", stroke = tube, sw = 7); path("M192 74 Q184 120 170 150", stroke = tube, sw = 7)
    path("M110 50 q-22 0 -22 30 q0 30 26 30 q10 0 12 -10 q-8 -6 -8 -20 q0 -14 8 -20 q-2 -10 -16 -10z", hex("#b33a3a"), INK, 2.5)
    path("M210 40 q22 0 22 30 q0 30 -26 30 q-10 0 -12 -10 q8 -6 8 -20 q0 -14 -8 -20 q2 -10 16 -10z", hex("#b33a3a"), INK, 2.5)
    path("M138 146 q-10 0 -10 16 q0 18 32 18 q32 0 32 -18 q0 -16 -10 -16 q-10 6 -22 6 q-12 0 -22 -6z", hex("#f29ac0"), INK, 2.5)
    rect(156, 178, 8, 18, tube, r = 3)
}

private val filter = SciView("filter", ms = 2400, loops = true) { st ->
    bg("#f3fbff"); table(176, 20, 300)
    // Pouring the muddy water through the paper: the sand stays, clear water drips into the cup.
    path("M226 96 h56 l-6 78 h-44z", CUP, INK, 2.5)
    path("M229 116 h50 l-4 56 h-42z", hex("#b89a6a"), alpha = mix(.75f, .2f, st.seg("pour", 0f, .4f)))
    for (i in 0..4) circle(238 + i * 8, 160 - (i % 2) * 8, 2.5, hex("#c9a26a"))
    text("ماء عكر", 254, 90)
    path("M100 40 h80 l-30 50 v16 h-20 v-16z", hex("#e8f4ff"), INK, 2.5)
    path("M108 44 h64 l-28 40 h-8z", Color.White, hex("#c9b48a"), 1.5)
    val sand = st.seg("pour", .25f, .5f)
    for (i in 0..3) circle(130 + i * 7, 72 + (i % 2) * 4, 2.6, hex("#c9a26a"), alpha = sand)
    val drip = if (st.on("pour")) -6 + 14 * (st.time % 1f) else 0f
    move(0, drip) { drop(140f, 112f, alpha = st.p("pour")); drop(140f, 128f, alpha = st.p("pour")) }
    path("M112 128 h56 l-6 46 h-44z", CUP, INK, 2.5)
    path("M118 150 h44 l-3 22 h-38z", hex("#8fd8ff"), alpha = .9f * st.seg("pour", .5f, 1f))
}

private val kidneycut = SciView("kidneycut") {
    bg("#fff6f4")
    path("M168 20 q86 0 86 82 q0 82 -86 82 q-40 0 -52 -30 q24 -16 24 -52 q0 -36 -24 -52 q12 -30 52 -30z", hex("#8a4a2a"), INK, 2.5)
    path("M168 28 q78 0 78 74 q0 74 -78 74 q-34 0 -44 -24 q22 -18 22 -50 q0 -32 -22 -50 q10 -24 44 -24z", hex("#d97a6a"))
    for (d in listOf(-54, -18, 18, 54)) {
        val a = d * PI.toFloat() / 180
        fun at(r: Float, aa: Float) = floatArrayOf(170 + cos(aa) * r, 102 + sin(aa) * r)
        val p0 = at(26f, a); val p1 = at(62f, a - .22f); val p2 = at(62f, a + .22f)
        poly(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], fill = hex("#f29ac0"), stroke = hex("#c2507a"), sw = 1.5)
    }
    path("M150 90 q20 6 26 12 q-6 6 -26 12z", hex("#f2d16a")); path("M140 110 q-6 30 -4 80", stroke = hex("#f2d16a"), sw = 9)
    path("M20 112 h104 q14 0 26 -4", stroke = RED, sw = 9)
    path("M20 82 h104 q14 0 26 4", stroke = BLUE, sw = 9)
}

/** A fingerprint: kind 0 a whorl, 1 a loop, 2 an arch. */
private fun fingerprint(x: Float, y: Float, kind: Int, r: Float = 16f) = buildString {
    for (i in 1..5) {
        val k = i * (r / 5.5f)
        append(when (kind) {
            0 -> "M${x - k} $y a$k ${k * 1.2f} 0 1 1 ${2 * k} 0 a$k ${k * 1.2f} 0 1 1 ${-2 * k} 0 "
            1 -> "M${x - k} ${y + r} q0 ${-2.2f * k} $k ${-2.2f * k} q$k 0 $k ${2.2f * k} "
            else -> "M${x - r} ${y + k - r / 2} q$r ${-k * .9f} ${2 * r} 0 "
        })
    }
}

private val prints = SciView("prints", ms = 1000) { st ->
    bg("#f6f3ff")
    val purple = hex("#6a3fb0")
    listOf(0, 1, 2, 1).forEachIndexed { i, kind ->
        val x = 208f - i * 62
        // Card ب matches the print on the glass: it turns green once compared.
        val match = i == 1 && st.on("match")
        rect(x, 122, 52, 64, if (match) hex("#effae6") else Color.White, if (match) FOUND_GREEN else INK, if (match) 4 else 2, 8)
        path(fingerprint(234f - i * 62, 150f, kind), stroke = purple, sw = 1.8)
        text("أبجد"[i].toString(), 234 - i * 62, 182)
    }
    path("M128 18 h52 l-6 86 h-40z", CUP, INK, 2.5)
    path(fingerprint(154f, 60f, 1, 14f), stroke = purple, sw = 1.8, alpha = st.p("glass"))
    val nudge = st.p("glass").let { if (it in 0f..<1f && it > 0f) 1 + .12f * sin(it * 4 * PI.toFloat()) else 1f }
    stretch(nudge, nudge, 200, 40) { emo("🖌️", 200, 40, 22) }
    node(296, 60, "🔍", 18)
}

private val skinblock = SciView("skinblock") {
    bg("#fff8f2")
    rect(40, 152, 200, 34, hex("#f7d36a"))
    for (i in 0..8) circle(52 + i * 22, 169, 9, hex("#f9e08f"), hex("#e0b84a"), 1)
    rect(40, 62, 200, 90, hex("#f8c6c6"))
    path("M40 136 q25 -10 50 0 t50 0 t50 0 t50 0", stroke = RED, sw = 4)
    path("M40 144 q25 10 50 0 t50 0 t50 0 t50 0", stroke = BLUE, sw = 4)
    val rose = hex("#d0507e")
    path("M180 42 v40", stroke = rose, sw = 2.5); path("M172 104 q16 -6 16 4 q0 10 -16 6 q-12 -4 0 -12 q14 -6 14 4", stroke = rose, sw = 3)
    path("M180 82 v18", stroke = rose, sw = 2.5)
    path("M40 42 h200 v20 q-25 8 -50 0 t-50 0 t-50 0 t-50 0z", hex("#f3b48a"))
    path("M100 6 L104 112", stroke = INK, sw = 3); ellipse(104, 116, 6, 9, hex("#c2507a"))
    for ((x, y, r) in listOf(Triple(88, 96, 5), Triple(82, 102, 4), Triple(90, 105, 4))) circle(x, y, r, hex("#f2c14e"), hex("#c9962a"), 1)
    ellipse(140, 108, 10, 6, hex("#9aa65a"), hex("#6a7a3a"), 1)
    path("M210 120 q-4 -30 2 -58 M214 120 q8 -28 0 -58", stroke = hex("#e8c23a"), sw = 2)
    circle(180, 42, 3, INK); circle(140, 42, 2.5, INK); circle(60, 42, 2.5, INK)
}

/** Every science picture, by the name the quests use (`view`, `pic`). */
object ScienceViews {
    val ALL: List<SciView> = listOf(
        valley, story, chain, web, town, dust,
        pins, car, scale, vector, resultant, book, balls, surfaces, paper, paraglider, push, barrow, joule,
        exits, urinary, filter, kidneycut, prints, skinblock,
    ) + MachineViews.ALL
    private val byName = ALL.associateBy { it.name }
    operator fun get(name: String?) = byName[name]
    fun has(name: String?) = name in byName
}
