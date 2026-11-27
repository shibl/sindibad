package org.sindibad.android.ui.science

import androidx.compose.ui.graphics.Color
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// Unit 4, simple machines (web: core/lab/views-machines.ts): the same 320 × 200 units and the same
// experiments — the hammer drives the wedge, the lever lifts the book, the pulleys raise their weights…

/** A wheel with spokes (pulleys, the knob, the steering wheels). */
internal fun Pen.wheel(x: Float, y: Float, r: Float, fill: Color = hex("#f2c14e")) {
    circle(x, y, r, fill, INK, 2.5)
    for (a in listOf(0, 60, 120)) {
        val c = cos(a * PI / 180).toFloat() * r; val s = sin(a * PI / 180).toFloat() * r
        line(x - c, y - s, x + c, y + s, INK, 1.8)
    }
    circle(x, y, maxOf(3f, r * .18f), INK)
}
private val BOOKS = listOf("#e8453c", "#3f8fd6", "#f2c14e", "#4fbf5a", "#8a63c9").map(::hex)
internal fun Pen.books(x: Float, y: Float, n: Int) { for (i in 0 until n) rect(x, y - (i + 1) * 12, 54, 12, BOOKS[i % 5], INK, 1.6, 2) }
internal fun Pen.marbles(x: Float, y: Float, n: Int) { for (i in 0 until n) circle(x - 8 + (i % 3) * 8, y - (i / 3) * 7, 3.6, hex("#eaf4ff"), hex("#7a9ab0"), 1) }

/** One set-up of the ramp: n books under the plank, m marbles in the cup to pull the car up. */
private fun Pen.rampCfg(n: Int, m: Int, vertical: Boolean, alpha: Float) {
    if (alpha <= 0f) return
    val top = 150f - n * 12; val x0 = 54f; val x1 = if (vertical) 110f else 262f
    for (i in 0 until n) rect(x0, 150 - (i + 1) * 12, 54, 12, BOOKS[i % 5], INK, 1.6, 2, alpha)
    if (!vertical) line(x0 + 54, top, x1, 150, WOOD, 8, alpha = alpha)
    if (vertical) emo("🛻", x0 + 80, 136, 22, alpha) else emo("🛻", x0 + 54 + (x1 - x0 - 54) * .75f, top + (150 - top) * .75f - 8, 22, alpha)
    path("M${x0 + 50} ${top - 2} H${x0 - 22} V164", stroke = RED, sw = 1.6, alpha = alpha)
    path("M${x0 - 34} 164 h24 l-3 26 h-18z", BLUE, INK, 2, alpha)
    for (i in 0 until m) circle(x0 - 22 - 8 + (i % 3) * 8, 184f - (i / 3) * 7, 3.6, hex("#eaf4ff"), hex("#7a9ab0"), 1, alpha)
}

private val ramp = SciView("ramp", ms = 500) { st ->
    bg("#fff6e8"); table(150, 52, 312)
    // The set-up shown is the one chosen last (low by default); the new one fades in.
    val now = st.latest?.takeIf { it in setOf("low", "steep", "lift") } ?: "low"
    val prev = (st.previous?.takeIf { it in setOf("low", "steep", "lift") } ?: "low").takeIf { st.fresh < 1f && it != now }
    fun a(id: String) = when (id) { now -> st.fresh; prev -> 1 - st.fresh; else -> 0f }
    rampCfg(2, 3, false, a("low")); rampCfg(5, 9, false, a("steep")); rampCfg(6, 15, true, a("lift"))
}

private val truck = SciView("truck") {
    bg("#eef7ff"); rect(0, 166, 320, 34, hex("#a6d98b"))
    emo("🛻", 70, 132, 86)
    line(118, 104, 118, 166, INK, 5); text("b", 106, 100); text("c", 106, 184)
    line(118, 166, 292, 166, INK, 2, floatArrayOf(6f, 4f)); text("a", 296, 184)
    line(118, 104, 292, 166, RED, 6)
}

private val wedge = SciView("wedge", ms = 600, partMs = mapOf("hit" to 1100)) { st ->
    bg("#f6f4ef"); table(176, 30, 290)
    val split = st.seg("split", 0f, 1f)
    move(-12 * split, 0) { turn(-4 * split, 120, 136) { path("M90 176 V106 Q90 96 100 96 H160 L150 176Z", hex("#a9b3bc"), INK, 2.5) } }
    move(12 * split, 0) { turn(4 * split, 200, 136) { path("M230 176 V106 Q230 96 220 96 H160 L170 176Z", STEEL, INK, 2.5) } }
    // The hammer strikes, the wedge sinks in, and its sides push the rock apart.
    val hit = st.seg("hit", 0f, .55f)
    move(0, 10 * hit) { path("M140 52 H180 L160 116Z", hex("#7a858d"), INK, 2.5); path("M140 52 H160 L160 116Z", hex("#c2cad2")) }
    val f = st.seg("hit", .27f, .73f)
    arrow(152, 100, 112, 120, RED, alpha = f); arrow(168, 100, 208, 120, RED, alpha = f)
    move(-46 * hit, 18 * hit) { turn(-30 * hit, 196, 10) {
        rect(196, 10, 44, 20, hex("#5a5f66"), INK, 2.5, 4); rect(214, 28, 9, 46, WOOD, INK, 2, 3)
    } }
}

private val screw = SciView("screw", ms = 1400, partMs = mapOf("turn" to 1600)) { st ->
    bg("#f4f6fa")
    rect(170, 140, 130, 18, WOOD_LIGHT, INK, 2); rect(170, 158, 130, 18, hex("#d9a86a"), INK, 2)
    rect(64, 36, 44, 12, hex("#c2cad2"), INK, 2, 4); path("M74 48 H98 V150 L86 178 L74 150Z", hex("#dfe5ea"), INK, 2)
    for (i in 0..8) path("M70 ${56 + i * 11} L102 ${62 + i * 11}", stroke = INK, sw = 2.2)
    // A pencil traces the thread: a ramp wound round the screw.
    val g = st.seg("groove", 0f, 1f)
    move(-30 * g, 40 * g) { turn(-20 * g, 130, 84) { emo("✏️", 130, 84, 26) } }
    // Turning drives the screw into the wood, twisting as it goes.
    val t = st.seg("turn", 0f, 1f)
    val twist = st.p("turn").let { if (it in 0f..<1f && it > 0f) { val w = (it * 4f) % 1f; 1 - .4f * (1 - kotlin.math.abs(2 * w - 1)) } else 1f }
    move(0, 26 * t) {
        stretch(twist, 1, 234, 38) { rect(226, 16, 16, 44, hex("#f2c14e"), INK, 2, 6); rect(232, 60, 4, 40, STEEL, INK, 1) }
        rect(226, 100, 16, 6, hex("#c2cad2"), INK, 1.5, 2); path("M230 106 H238 V134 L234 142 L230 134Z", hex("#dfe5ea"), INK, 1.5)
    }
}

private val lever = SciView("lever", ms = 1000) { st ->
    bg("#fff8ec"); table(160, 10, 310)
    val press = st.seg("press", 0f, 1f)
    move(0, -10 * press) { rect(226, 122, 70, 26, BLUE, INK, 2.5, 3); rect(230, 126, 62, 5, hex("#bfe3ff")) }
    turn(-6 * press, 196, 150) { rect(60, 146, 210, 8, hex("#f2c14e"), INK, 2, 2) }
    circle(196, 156, 6, RED, INK, 2)
    move(0, 12 * press) { circle(72, 128, 14, SKIN, INK, 2.5) }
    arrow(72, 88, 72, 112, RED, alpha = st.seg("effort", 0f, .5f))
    val arms = st.seg("arms", 0f, .5f)
    if (arms > 0f) {
        path("M72 172 v6 h124 v-6", stroke = RED, sw = 2.5, alpha = arms); path("M196 172 v6 h66 v-6", stroke = GREEN, sw = 2.5, alpha = arms)
        text("ذراع القوة", 134, 196, 10, alpha = arms); text("ذراع المقاومة", 232, 196, 10, alpha = arms)
    }
}

private val classes = SciView("classes", ms = 400) { st ->
    bg("#f3f8ff")
    val f = hex("#2fb3a8"); val l = hex("#4fbf5a")
    // Effort (arrow), fulcrum (triangle), load (square), left to right as in the book.
    for ((id, y, name, e, order) in listOf(
        Row("c1", 54, "المقصّ", "✂️", "EFL"), Row("c2", 116, "عربة الجرّ", "🛒", "ELF"), Row("c3", 178, "كبّاسة الورق", "📎", "LEF"))) {
        // Each row turns green once found.
        val on = st.on(id)
        move(0, y) {
            rect(12, -40, 296, 54, if (on) hex("#effae6") else Color.White, if (on) GREEN else hex("#d9c7a6"), 2, 12)
            emo(e, 280, -20, 24); text(name, 280, 10)
            rect(40, -3, 200, 6, WOOD, r = 3)
            order.forEachIndexed { i, c ->
                val x = 60f + i * 80
                when (c) {
                    'F' -> path("M${x - 9} 0 l9 -14 l9 14z", f, INK, 1.5)
                    'L' -> rect(x - 8, -26, 16, 16, l, INK, 1.5)
                    else -> arrow(x, -36, x, -12, RED)
                }
            }
        }
    }
}
private data class Row(val id: String, val y: Int, val name: String, val e: String, val order: String)

private val hammer = SciView("hammer") {
    bg("#fff8ec"); table(164, 10, 310); rect(40, 128, 170, 36, WOOD_LIGHT, INK, 2.5, 4)
    line(110, 128, 230, 26, WOOD, 12)
    path("M84 122 Q96 104 118 112 L112 128 Q100 118 92 128Z", hex("#5a5f66"), INK, 2)
    circle(232, 26, 15, SKIN, INK, 2.5)
    rect(86, 112, 5, 22, STEEL, INK, 1.5); rect(81, 110, 15, 4, STEEL, INK, 1.5)
    circle(116, 128, 6, hex("#2fb3a8"), INK, 2)
}

private val flag = SciView("flag", ms = 2000) { st ->
    bg("#e7f5ff"); rect(0, 186, 320, 14, hex("#a6d98b"))
    rect(156, 20, 8, 168, hex("#c2cad2"), INK, 1.5)
    circle(160, 18, 9, hex("#f2c14e"), INK, 2)
    line(169, 18, 169, 160, hex("#f28c3a"), 2); line(151, 18, 151, 170, hex("#f28c3a"), 2)
    // Pulling the rope down raises the flag: the fixed pulley turns the force round.
    move(0, -112 * st.seg("pull", 0f, 1f)) {
        rect(170, 134, 60, 12, hex("#2f8a3f")); rect(170, 146, 60, 12, Color.White); rect(170, 158, 60, 12, hex("#1f1612"))
        for (x in listOf(184, 200, 216)) path("M$x 148 l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.4 3.6 -.4z", RED)
    }
    circle(150, 176, 10, SKIN, INK, 2)
    arrow(130, 150, 130, 186, RED, alpha = .3f + .7f * st.seg("pull", 0f, .25f))
}

private val pulleys = SciView("pulleys", ms = 1600) { st ->
    bg("#f3f8ff"); rect(10, 10, 300, 10, WOOD_LIGHT, INK, 2)
    val orange = hex("#f28c3a")
    // The movable pulley: half the force (5N) lifts 10N.
    line(40, 20, 40, 110, orange, 2.5); line(80, 110, 80, 60, orange, 2.5)
    move(0, -24 * st.seg("movable", 0f, 1f)) { wheel(60f, 110f, 20f); line(60, 130, 60, 146, INK, 2); weight(60f, 146f, 32f, 22f, "10N") }
    scaleTool(80f, 26f, 14f, "5N"); text("متحرّكة", 60, 196)
    // The fixed pulley: the same force, turned round.
    rect(232, 20, 6, 16, INK); wheel(235f, 46f, 20f)
    line(255, 46, 255, 140, orange, 2.5); line(215, 46, 215, 96, orange, 2.5)
    move(0, -30 * st.seg("fixed", 0f, 1f)) { weight(255f, 140f, 32f, 22f, "10N") }
    scaleTool(215f, 96f, 14f, "10N"); text("ثابتة", 235, 196)
}

private val knob = SciView("knob", ms = 1500, partMs = mapOf("spindle" to 900)) { st ->
    bg("#fbf4ec"); rect(170, 14, 140, 176, hex("#8a5a34"), INK, 2.5, 6)
    move(shake(st.p("spindle"), 2), 0) { rect(150, 86, 40, 10, STEEL, INK, 2) }
    // The knob is a wheel on its axle: a little turn of the big knob turns the spindle.
    turn(160 * st.seg("knob", 0f, 1f), 134, 91) {
        circle(134, 91, 26, hex("#f2c14e"), INK, 3); circle(134, 91, 8, hex("#c99a2e")); rect(130, 66, 8, 12, hex("#fff6c8"), r = 3)
    }
    ellipse(54, 160, 34, 12, hex("#f4f4f4"), INK, 2.5); ellipse(54, 156, 28, 9, hex("#e8a26a"))
    turn(18 * st.seg("cap", 0f, 1f), 54, 120) { rect(50, 90, 8, 66, hex("#f2c14e"), INK, 2); path("M50 90 l4 -10 4 10z", INK) }
}

private val steering = SciView("steering", ms = 2000) { st ->
    bg("#f3f8ff")
    // A bigger wheel needs less force: both turn half a round.
    turn(180 * st.seg("small", 0f, 1f), 240, 96) { wheel(240f, 96f, 26f, hex("#7a858d")) }
    emo("🚗", 240, 160, 30); arrow(266, 70, 266, 96, RED); text("مقود صغير", 240, 192)
    turn(180 * st.seg("big", 0f, 1f), 90, 92) { wheel(90f, 92f, 52f, RED) }
    emo("🚜", 90, 166, 30); arrow(142, 60, 142, 86, RED); text("مقود كبير", 90, 192)
}

private val krak = SciView("krak") {
    gradient(0, 0, 320, 200, hex("#ffd9b0"), hex("#fff2df"))
    path("M60 170 Q160 110 260 170 V200 H60Z", hex("#c9b48a"))
    val stone = hex("#d9c8a4")
    rect(110, 96, 100, 54, stone, INK, 2); rect(100, 78, 24, 72, stone, INK, 2); rect(196, 78, 24, 72, stone, INK, 2); rect(148, 70, 24, 80, stone, INK, 2)
    listOf(100, 108, 116, 196, 204, 212, 148, 156, 164).forEachIndexed { i, x -> rect(x, if (i > 5) 62 else 70, 6, 8, stone, INK, 1.5) }
    path("M152 150 v-18 a8 8 0 0 1 16 0 v18z", hex("#6b4a2a"))
    for ((e, x, y) in listOf(Triple("♿", 34, 40), Triple("⚖️", 34, 120), Triple("🪣", 286, 40), Triple("🫙", 286, 120), Triple("🍕", 104, 26), Triple("⛺", 216, 26)))
        node(x, y, e, 20, 22)
}

private val clipper = SciView("clipper", ms = 800) { st ->
    bg("#f4f6fa")
    path("M60 128 L250 112 Q262 112 262 122 L262 128 L70 140Z", hex("#c2cad2"), INK, 2.5)
    path("M60 140 L250 150 Q262 150 262 140 L262 134 L70 146Z", hex("#aab3bb"), INK, 2.5)
    path("M262 118 L280 128 L262 132Z M262 136 L280 132 L262 146Z", hex("#7a858d"), INK, 2)
    turn(4 * st.seg("top", 0f, 1f), 250, 101) {
        path("M70 96 L240 84 Q250 84 250 92 L250 96 L80 108Z", hex("#dfe5ea"), INK, 2.5); rect(226, 96, 6, 22, hex("#7a858d"))
    }
}

object MachineViews {
    val ALL = listOf(ramp, truck, wedge, screw, lever, classes, hammer, flag, pulleys, knob, steering, krak, clipper)
}
