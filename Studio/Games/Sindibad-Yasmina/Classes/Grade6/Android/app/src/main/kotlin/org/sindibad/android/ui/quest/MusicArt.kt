package org.sindibad.android.ui.quest

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import org.sindibad.android.domain.quest.MusicTheory

// The music island's drawings, natively on a Canvas: the web's SVG pictures (core/tunes/games.ts ART,
// staffSVG, rhythmSVG, glassSVG) redrawn shape by shape, in the same coordinates.

private val INK = Color(0xFF3B2414)
private fun path(d: String): Path = PathParser().parsePathString(d).toPath()

/** One shape of a picture: a path, rectangle, circle or ellipse, filled and/or stroked, maybe rotated. */
private class Shape(
    val kind: Char, val d: String = "", val x: Float = 0f, val y: Float = 0f, val w: Float = 0f, val h: Float = 0f, val r: Float = 0f,
    val fill: Long? = null, val stroke: Long? = null, val sw: Float = 0f, val rot: Triple<Float, Float, Float>? = null, val round: Boolean = false, val alpha: Float = 1f,
) { val path by lazy { if (kind == 'p') path(d) else null } }

private const val I = 0xFF3B2414
private fun p(d: String, fill: Long? = null, stroke: Long? = null, sw: Float = 0f, rot: Triple<Float, Float, Float>? = null, round: Boolean = false, alpha: Float = 1f) =
    Shape('p', d, fill = fill, stroke = stroke, sw = sw, rot = rot, round = round, alpha = alpha)
private fun rect(x: Float, y: Float, w: Float, h: Float, rx: Float = 0f, fill: Long? = null, stroke: Long? = null, sw: Float = 0f, rot: Triple<Float, Float, Float>? = null) =
    Shape('r', x = x, y = y, w = w, h = h, r = rx, fill = fill, stroke = stroke, sw = sw, rot = rot)
private fun circle(cx: Float, cy: Float, r: Float, fill: Long? = null, stroke: Long? = null, sw: Float = 0f, rot: Triple<Float, Float, Float>? = null) =
    Shape('c', x = cx, y = cy, r = r, fill = fill, stroke = stroke, sw = sw, rot = rot)
private fun ellipse(cx: Float, cy: Float, rx: Float, ry: Float, fill: Long? = null, stroke: Long? = null, sw: Float = 0f, rot: Triple<Float, Float, Float>? = null) =
    Shape('e', x = cx, y = cy, w = rx, h = ry, fill = fill, stroke = stroke, sw = sw, rot = rot)

private class Picture(val w: Float, val h: Float, val shapes: List<Shape>)

private val ART: Map<String, Picture> by lazy {
    val m28 = Triple(-28f, 40f, 40f)
    mapOf(
        "balalaika" to Picture(80f, 80f, listOf(
            p("M40 70 L16 40 L64 40Z", 0xFFD9894A, I, 3f, Triple(180f, 40f, 55f)),
            circle(40f, 58f, 5f, I),
            rect(37f, 6f, 6f, 40f, 2f, 0xFF8A5A34, I, 2.5f),
            p("M36 4 h8 v8 h-8z", 0xFF5A3A22),
            p("M38.5 12 V64 M41.5 12 V64", stroke = 0xFFF3E6C8, sw = 1f))),
        "panflute" to Picture(80f, 80f, (0 until 8).map { i -> rect(10 + i * 7.5f, 12f, 7f, 58f - i * 5, 3f, if (i % 2 == 1) 0xFFE8C27A else 0xFFD9A95A, I, 2f) } +
            rect(8f, 24f, 64f, 7f, 3f, 0xFFC7373F, I, 2f)),
        "mizmar" to Picture(80f, 80f, listOf(
            p("M14 66 L34 66 L46 20 L42 8 L38 8 L34 20Z", 0xFFB8723A, I, 3f, m28)) +
            listOf(38f to 26f, 36.5f to 34f, 35f to 42f, 33f to 50f).map { (x, y) -> circle(x, y, 2f, I, rot = m28) } +
            ellipse(22f, 68f, 14f, 5f, 0xFFD9894A, I, 2.5f, m28)),
        "harmonica" to Picture(80f, 80f, listOf(rect(8f, 28f, 64f, 24f, 5f, 0xFFC9D3DC, I, 3f), rect(8f, 36f, 64f, 8f, fill = 0xFF7A5130)) +
            (0 until 8).map { i -> rect(12 + i * 7.5f, 38f, 4.5f, 4f, fill = 0xFF2A1A10) } + p("M12 31 h56", stroke = 0xFFFFFFFF, sw = 2f, alpha = .7f)),
        "bagpipe" to Picture(80f, 80f, listOf(
            p("M44 8 L48 44 M54 6 L56 42 M62 10 L62 44", stroke = I, sw = 5f, round = true),
            p("M44 8 L48 44 M54 6 L56 42 M62 10 L62 44", stroke = 0xFFE8C27A, sw = 2.5f, round = true),
            ellipse(42f, 50f, 24f, 16f, 0xFFC7373F, I, 3f),
            p("M22 44 l40 12 M26 58 l32 -18", stroke = 0xFF2F8A5F, sw = 3f),
            p("M26 60 L18 76", stroke = I, sw = 5f, round = true),
            p("M60 40 L72 28", stroke = I, sw = 4f, round = true))),
        "monologue" to Picture(80f, 90f, listOf(
            rect(24f, 40f, 32f, 38f, 10f, 0xFFF2C14E, I, 3f),
            circle(40f, 26f, 15f, 0xFFF6C9A0, I, 3f),
            p("M27 15 L53 15 L50 4 L30 4Z", 0xFFC7373F, I, 2.5f),
            p("M50 4 q8 2 6 10", stroke = I, sw = 2f),
            circle(34f, 25f, 2f, I), circle(46f, 25f, 2f, I),
            p("M31 31 q9 9 18 0", 0xFFFFFFFF, I, 2.5f),
            p("M58 44 L70 34", stroke = I, sw = 4f, round = true),
            p("M64 24 q4 -6 8 0 M68 16 q3 -4 6 0", stroke = 0xFFD0507E, sw = 2.5f, round = true))),
        "solo" to Picture(80f, 90f, listOf(
            p("M22 80 Q24 42 40 42 Q56 42 58 80Z", 0xFF8A63C9, I, 3f),
            circle(40f, 27f, 14f, 0xFFF6C9A0, I, 3f),
            p("M26 24 Q26 8 40 9 Q54 8 54 24 Q48 14 40 15 Q32 14 26 24Z", 0xFF5A3A22),
            circle(35f, 27f, 2f, I), circle(45f, 27f, 2f, I),
            ellipse(40f, 34f, 3f, 2.5f, 0xFFC7373F),
            rect(56f, 30f, 5f, 18f, 2f, I, rot = Triple(25f, 58f, 38f)),
            circle(61f, 27f, 5f, 0xFF9AA5AD, I, 2f),
            p("M66 12 v10 M66 12 l6 -2", stroke = I, sw = 2.5f),
            circle(64f, 22f, 2.5f, I))),
        "choir" to Picture(90f, 90f, listOf(18f to 0xFF3F8FD6, 45f to 0xFFD0507E, 72f to 0xFF2F8A5F).flatMap { (x, c) ->
            listOf(
                p("M${x - 13} 82 Q${x - 12} 52 $x 52 Q${x + 12} 52 ${x + 13} 82Z", c, I, 2.5f),
                circle(x, 40f, 11f, 0xFFF6C9A0, I, 2.5f),
                ellipse(x, 45f, 3f, 2.5f, 0xFFC7373F),
                rect(x - 8, 58f, 16f, 11f, 2f, 0xFFFFF8E8, I, 2f))
        }),
    )
}

private fun DrawScope.shape(s: Shape) {
    val draw: DrawScope.() -> Unit = {
        fun fillOrStroke(block: DrawScope.(Color, androidx.compose.ui.graphics.drawscope.DrawStyle) -> Unit) {
            s.fill?.let { block(Color(it).copy(alpha = s.alpha), androidx.compose.ui.graphics.drawscope.Fill) }
            s.stroke?.let { block(Color(it).copy(alpha = s.alpha), Stroke(s.sw, cap = if (s.round) StrokeCap.Round else StrokeCap.Butt)) }
        }
        when (s.kind) {
            'p' -> fillOrStroke { c, st -> drawPath(s.path!!, c, style = st) }
            'r' -> fillOrStroke { c, st -> drawRoundRect(c, Offset(s.x, s.y), Size(s.w, s.h), CornerRadius(s.r), style = st) }
            'c' -> fillOrStroke { c, st -> drawCircle(c, s.r, Offset(s.x, s.y), style = st) }
            'e' -> fillOrStroke { c, st -> drawOval(c, Offset(s.x - s.w, s.y - s.h), Size(s.w * 2, s.h * 2), style = st) }
        }
    }
    val rot = s.rot
    if (rot != null) rotate(rot.first, Offset(rot.second, rot.third)) { draw() } else draw()
}

/** Draws a picture of the island's ART (an instrument, the singers) scaled into this Canvas. */
private fun DrawScope.picture(pic: Picture) {
    val k = minOf(size.width / pic.w, size.height / pic.h)
    translate((size.width - pic.w * k) / 2, (size.height - pic.h * k) / 2) {
        scale(k, k, Offset.Zero) { pic.shapes.forEach { shape(it) } }
    }
}

fun hasMusicArt(name: String) = name in ART || (name.startsWith("v-") && name.removePrefix("v-") in setOf("w", "h", "q", "ee"))

@Composable
fun MusicArtView(name: String, modifier: Modifier) {
    if (name.startsWith("v-")) { RhythmView(name.removePrefix("v-"), modifier, beatW = 22f); return }
    val pic = ART[name] ?: return
    Canvas(modifier.aspectRatio(pic.w / pic.h)) { picture(pic) }
}

// ---------- Rhythm notation (web rhythmSVG): q h w ee r ----------

fun rhythmWidth(pattern: String, beatW: Float = 34f) = MusicTheory.tokens(pattern).sumOf { t -> if (t == "h") 2 else if (t == "w") 4 else 1 } * beatW + 24f

private val REST by lazy { path("M0 0 l7 8 l-6 6 l7 9 q-8 -3 -6 5") }

@Composable
fun RhythmView(pattern: String, modifier: Modifier, beatW: Float = 34f, color: Color = INK) {
    val w = rhythmWidth(pattern, beatW)
    Canvas(modifier.aspectRatio(w / 58f)) {
        val k = size.width / w
        scale(k, k, Offset.Zero) {
            drawLine(color, Offset(4f, 10f), Offset(4f, 50f), 1.5f)
            drawLine(color, Offset(w - 4, 10f), Offset(w - 4, 50f), 1.5f)
            fun head(cx: Float, hollow: Boolean = false) = rotate(-20f, Offset(cx, 42f)) {
                drawOval(color, Offset(cx - 7, 37f), Size(14f, 10f), style = if (hollow) Stroke(2.5f) else androidx.compose.ui.graphics.drawscope.Fill)
            }
            fun stem(cx: Float) = drawLine(color, Offset(cx + 6, 40f), Offset(cx + 6, 10f), 2f)
            var x = 18f
            for (t in MusicTheory.tokens(pattern)) when (t) {
                "q" -> { head(x); stem(x); x += beatW }
                "h" -> { head(x, true); stem(x); x += beatW * 2 }
                "w" -> { head(x, true); x += beatW * 4 }
                "ee" -> { head(x); stem(x); head(x + beatW / 2); stem(x + beatW / 2); drawRect(color, Offset(x + 6, 9f), Size(beatW / 2, 5f)); x += beatW }
                "r" -> { translate(x - 2, 16f) { drawPath(REST, color, style = Stroke(2.5f)) }; x += beatW }
            }
        }
    }
}

// ---------- A glass of water (web glassSVG) ----------

private val RIM by lazy { path("M10 14 L60 14 L55 104 Q35 109 15 104 Z") }

/** A glass filled to `level` (0…1), with `parts` lines for d equal parts. */
@Composable
fun GlassView(color: Color, level: Float, modifier: Modifier, parts: Int = 0) {
    Canvas(modifier.aspectRatio(70f / 110f)) {
        val k = size.width / 70f
        scale(k, k, Offset.Zero) {
            val top = 14f; val bot = 104f; val wy = bot - (bot - top) * level.coerceIn(0f, 1f)
            drawPath(RIM, Color.White.copy(alpha = .7f))
            clipPath(RIM) {
                drawRect(color, Offset(0f, wy), Size(70f, bot - wy + 6))
                drawRect(Color.White.copy(alpha = .45f), Offset(0f, wy), Size(70f, 4f))
            }
            for (i in 1 until parts) { val y = bot - (bot - top) * i / parts; drawLine(INK.copy(alpha = .55f), Offset(12f, y), Offset(58f, y), 1.5f) }
            drawPath(RIM, INK, style = Stroke(3f))
            drawLine(Color.White.copy(alpha = .8f), Offset(16f, 22f), Offset(19f, 92f), 3f, cap = StrokeCap.Round)
        }
    }
}

// ---------- The grand staff (web staffSVG): d = steps from middle C ----------

object Staff {
    const val HALF = 10f
    const val TOP = 16f
    const val W = 320f
    const val H = TOP * 2 + 24 * HALF
    fun y(d: Int) = TOP + (12 - d) * HALF
    /** A y in staff units → the nearest step, as the web's svgPos. */
    fun stepAt(y: Float) = Math.round(12 - (y - TOP) / HALF).coerceIn(-11, 11)
    val TREBLE by lazy { path("M21 86 C13 88 11 80 17 77 C24 74 27 80 24 84 M20 82 C27 64 29 30 25 14 C23 4 34 2 33 14 C32 28 10 38 9 56 C8 70 26 76 33 66 C39 56 31 46 23 50 C15 54 17 64 23 63") }
    val BASS by lazy { path("M10 26 C10 14 34 12 34 30 C34 46 20 58 6 66") }
}

/** A note head on the staff (with a ledger line for middle C and beyond the staff). */
fun DrawScope.noteHead(d: Int, x: Float, color: Color = INK, hollow: Boolean = false) {
    val y = Staff.y(d)
    if (d == 0 || d >= 12 || d <= -12) drawLine(INK, Offset(x - 14, y), Offset(x + 14, y), 1.8f)
    rotate(-18f, Offset(x, y)) { drawOval(color, Offset(x - 8.5f, y - 6.2f), Size(17f, 12.4f), style = if (hollow) Stroke(2f) else androidx.compose.ui.graphics.drawscope.Fill) }
}

/** The grand staff's lines, brace, clefs and middle C line, in staff units (scale before calling). */
fun DrawScope.grandStaff(middle: Boolean = true, clefs: Boolean = true) {
    for (d in listOf(2, 4, 6, 8, 10, -2, -4, -6, -8, -10)) drawLine(INK, Offset(8f, Staff.y(d)), Offset(Staff.W - 8, Staff.y(d)), 1.4f)
    if (middle) drawLine(INK.copy(alpha = .35f), Offset(56f, Staff.y(0)), Offset(Staff.W - 8, Staff.y(0)), 1.2f)
    drawLine(INK, Offset(8f, Staff.y(10)), Offset(8f, Staff.y(-10)), 1.4f)
    val brace = Path().apply { moveTo(4f, Staff.y(10)); relativeQuadraticTo(-6f, Staff.HALF * 10, 0f, Staff.HALF * 20) }
    drawPath(brace, INK, style = Stroke(2.5f))
    if (clefs) {
        withTransform({ translate(12f, Staff.y(4) - 66 * .92f); scale(.92f, .92f, Offset.Zero) }) { drawPath(Staff.TREBLE, Color(0xFFD23B52), style = Stroke(4.2f, cap = StrokeCap.Round)) }
        withTransform({ translate(12f, Staff.y(-4) - 30 * .62f); scale(.62f, .62f, Offset.Zero) }) {
            val f = Color(0xFFE0A015)
            drawPath(Staff.BASS, f, style = Stroke(4.2f, cap = StrokeCap.Round))
            drawCircle(f, 4.5f, Offset(10f, 26f)); drawCircle(f, 3.2f, Offset(42f, 22f)); drawCircle(f, 3.2f, Offset(42f, 38f))
        }
    }
}

/** Rectangles of the grand staff's parts (web LX_VIEWS.grand hit areas). */
val GRAND_PARTS: Map<String, Rect> = mapOf(
    "treble" to Rect(4f, Staff.y(12), 52f, Staff.y(1)),
    "glines" to Rect(58f, Staff.y(10) - 6, Staff.W - 12, Staff.y(2) + 6),
    "mid" to Rect(58f, Staff.y(0) - 6, Staff.W - 12, Staff.y(0) + 6),
    "flines" to Rect(58f, Staff.y(-2) - 6, Staff.W - 12, Staff.y(-10) + 6),
    "bass" to Rect(4f, Staff.y(-1), 52f, Staff.y(-11)),
)

fun DrawScope.glowRect(r: Rect, color: Color, strong: Boolean) {
    drawRoundRect(color.copy(alpha = if (strong) .35f else .18f), r.topLeft, r.size, CornerRadius(8f))
    drawRoundRect(color, r.topLeft, r.size, CornerRadius(8f), style = Stroke(if (strong) 3f else 1.5f))
}

