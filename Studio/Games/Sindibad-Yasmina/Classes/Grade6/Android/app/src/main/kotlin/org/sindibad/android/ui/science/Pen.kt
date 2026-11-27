package org.sindibad.android.ui.science

import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.PathParser
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

// A small pen for the science pictures: every picture is drawn in its own 320 × 200 units (as in the book's
// diagrams the web drew), and the pen scales them to the canvas. Shapes are Compose paths; words and emoji
// are drawn by the platform text engine at their final size, so they stay sharp and Arabic joins properly.

val INK = Color(0xFF3B2414)
/** "#rrggbb" → a colour (pure Kotlin, so the picture tables load in JVM tests). */
internal fun hex(h: String) = Color(0xFF000000 or h.removePrefix("#").toLong(16))
internal typealias N = Number
internal val Number.f get() = toFloat()

class Pen(val scope: DrawScope, private val font: Typeface?) {
    /** Canvas pixels per picture unit. */
    val k = scope.size.width / 320f

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER }

    private fun shape(block: DrawScope.() -> Unit) = scope.scale(k, k, Offset.Zero) { block() }
    private fun stroke(w: Float, dash: FloatArray? = null, cap: StrokeCap = StrokeCap.Round) =
        Stroke(w, cap = cap, join = StrokeJoin.Round, pathEffect = dash?.let { PathEffect.dashPathEffect(it) })

    fun rect(x: N, y: N, w: N, h: N, fill: Color? = null, stroke: Color? = null, sw: N = 2, r: N = 0, alpha: Float = 1f) = shape {
        fill?.let { drawRoundRect(it, Offset(x.f, y.f), Size(w.f, h.f), CornerRadius(r.f), alpha = alpha) }
        stroke?.let { drawRoundRect(it, Offset(x.f, y.f), Size(w.f, h.f), CornerRadius(r.f), style = stroke(sw.f, cap = StrokeCap.Butt), alpha = alpha) }
    }
    fun gradient(x: N, y: N, w: N, h: N, top: Color, bottom: Color, r: N = 0) = shape {
        drawRoundRect(Brush.verticalGradient(listOf(top, bottom), y.f, y.f + h.f), Offset(x.f, y.f), Size(w.f, h.f), CornerRadius(r.f))
    }
    fun circle(cx: N, cy: N, r: N, fill: Color? = null, stroke: Color? = null, sw: N = 2, alpha: Float = 1f, dash: FloatArray? = null) = shape {
        fill?.let { drawCircle(it, r.f, Offset(cx.f, cy.f), alpha = alpha) }
        stroke?.let { drawCircle(it, r.f, Offset(cx.f, cy.f), style = stroke(sw.f, dash), alpha = alpha) }
    }
    fun ellipse(cx: N, cy: N, rx: N, ry: N, fill: Color? = null, stroke: Color? = null, sw: N = 2, alpha: Float = 1f) = shape {
        fill?.let { drawOval(it, Offset(cx.f - rx.f, cy.f - ry.f), Size(rx.f * 2, ry.f * 2), alpha = alpha) }
        stroke?.let { drawOval(it, Offset(cx.f - rx.f, cy.f - ry.f), Size(rx.f * 2, ry.f * 2), style = stroke(sw.f), alpha = alpha) }
    }
    fun line(x1: N, y1: N, x2: N, y2: N, color: Color = INK, sw: N = 2, dash: FloatArray? = null, alpha: Float = 1f, cap: StrokeCap = StrokeCap.Round) = shape {
        drawLine(color, Offset(x1.f, y1.f), Offset(x2.f, y2.f), sw.f, cap, dash?.let { PathEffect.dashPathEffect(it) }, alpha)
    }
    /** An SVG path (`d`) in picture units. */
    fun path(d: String, fill: Color? = null, stroke: Color? = null, sw: N = 2, alpha: Float = 1f, dash: FloatArray? = null) {
        val p = parsed(d)
        shape {
            fill?.let { drawPath(p, it, alpha) }
            stroke?.let { drawPath(p, it, alpha, stroke(sw.f, dash)) }
        }
    }
    fun poly(vararg xy: Float, fill: Color? = null, stroke: Color? = null, sw: N = 2, alpha: Float = 1f) {
        val p = Path().apply { moveTo(xy[0], xy[1]); for (i in 2 until xy.size step 2) lineTo(xy[i], xy[i + 1]); close() }
        shape {
            fill?.let { drawPath(p, it, alpha) }
            stroke?.let { drawPath(p, it, alpha, stroke(sw.f)) }
        }
    }

    /** An arrow from (x1, y1) to (x2, y2) with a head (the web's sv-ar). */
    fun arrow(x1: N, y1: N, x2: N, y2: N, color: Color = INK, head: N = 9, sw: N = 3.5, alpha: Float = 1f) {
        val a = atan2(y2.f - y1.f, x2.f - x1.f)
        val hx = x2.f - cos(a) * head.f; val hy = y2.f - sin(a) * head.f
        val px = sin(a) * head.f * .6f; val py = -cos(a) * head.f * .6f
        line(x1, y1, hx, hy, color, sw, alpha = alpha)
        poly(x2.f, y2.f, hx + px, hy + py, hx - px, hy - py, fill = color, alpha = alpha)
    }

    /** Words (SVG text: x is the middle, or the start with `start`; y the baseline). */
    fun text(t: String, x: N, y: N, size: N = 12, color: Color = INK, bold: Boolean = true, halo: Boolean = false, alpha: Float = 1f, start: Boolean = false) =
        scope.drawIntoCanvas { cv ->
            paint.typeface = if (bold) font ?: Typeface.DEFAULT_BOLD else font ?: Typeface.DEFAULT
            paint.textSize = size.f * k
            paint.textAlign = if (start) Paint.Align.LEFT else Paint.Align.CENTER
            if (halo) {
                paint.style = Paint.Style.STROKE; paint.strokeWidth = 3f * k; paint.color = Color.White.copy(alpha = alpha).toArgb()
                cv.nativeCanvas.drawText(t, x.f * k, y.f * k, paint)
            }
            paint.style = Paint.Style.FILL; paint.color = color.copy(alpha = color.alpha * alpha).toArgb()
            cv.nativeCanvas.drawText(t, x.f * k, y.f * k, paint)
        }

    /** An emoji centred on (x, y) (the web's sv-emo). */
    fun emo(ch: String, x: N, y: N, size: N = 30, alpha: Float = 1f) = scope.drawIntoCanvas { cv ->
        paint.typeface = Typeface.DEFAULT; paint.style = Paint.Style.FILL; paint.textSize = size.f * k; paint.textAlign = Paint.Align.CENTER
        paint.color = Color.Black.copy(alpha = alpha).toArgb()
        val m = paint.fontMetrics
        cv.nativeCanvas.drawText(ch, x.f * k, y.f * k - (m.ascent + m.descent) / 2, paint)
    }

    /** The name a found part shows (the web's lx-label: purple with a white halo). */
    fun label(t: String, x: N, y: N) = text(t, x, y, 13, LABEL, halo = true)

    fun move(dx: N, dy: N, block: Pen.() -> Unit) = scope.withTransform({ translate(dx.f * k, dy.f * k) }) { block() }
    fun turn(degrees: N, px: N, py: N, block: Pen.() -> Unit) = scope.withTransform({ rotate(degrees.f, Offset(px.f * k, py.f * k)) }) { block() }
    fun stretch(sx: N, sy: N, px: N, py: N, block: Pen.() -> Unit) = scope.withTransform({ scale(sx.f, sy.f, Offset(px.f * k, py.f * k)) }) { block() }

    companion object {
        val LABEL = Color(0xFF6A3FB0)
        private val cache = HashMap<String, Path>()
        fun parsed(d: String): Path = synchronized(cache) { cache.getOrPut(d) { PathParser().parsePathString(d).toPath() } }
    }
}
