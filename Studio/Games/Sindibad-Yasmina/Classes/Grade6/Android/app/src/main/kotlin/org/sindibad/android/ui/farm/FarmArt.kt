package org.sindibad.android.ui.farm

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import org.sindibad.android.domain.FarmRun
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// Native vector drawings of the farm (web: core/farm/models.ts, every model made in code).
// All coordinates are scene units (FarmLayout.SIZE); the caller scales the canvas.

private val Outline = Color(0xFF3B2414)
private val Leaf = Color(0xFF4FAE45)
private val LeafDark = Color(0xFF2F8A3A)
private val LeafLight = Color(0xFF7CC85A)
private val Stem = Color(0xFF5B8C2F)
private val Grass = Color(0xFF8CCB5E)
private val Soil = mapOf("grass" to Color(0xFF7FBF55), "ploughed" to Color(0xFF9A6A3E), "rich" to Color(0xFF6B4423), "dry" to Color(0xFFC6A16E))

internal fun DrawScope.outlined(path: Path, fill: Color, width: Float = 4f) {
    drawPath(path, fill)
    drawPath(path, Outline, style = Stroke(width))
}

private fun DrawScope.blob(c: Offset, rx: Float, ry: Float, fill: Color, width: Float = 3f) {
    drawOval(fill, Offset(c.x - rx, c.y - ry), Size(rx * 2, ry * 2))
    drawOval(Outline, Offset(c.x - rx, c.y - ry), Size(rx * 2, ry * 2), style = Stroke(width))
}

/** Sea, beach, the island's grass and the paths between places. */
internal fun DrawScope.drawIsland(t: Float) {
    drawRect(Brush.verticalGradient(listOf(Color(0xFF70C9E4), Color(0xFF248FB4))), size = Size(1000f, 1000f))
    for (i in 0 until 14) {
        val y = 40f + i * 70f
        val x = ((i * 137) % 900).toFloat() + sin(t * 2 * PI.toFloat() + i) * 12f
        drawLine(Color.White.copy(alpha = .25f), Offset(x, y), Offset(x + 60f, y - 4f), 4f)
    }
    drawRoundRect(Color(0xFFF0CF8F), Offset(14f, 30f), Size(972f, 880f), CornerRadius(180f))
    drawRoundRect(Grass, Offset(34f, 48f), Size(932f, 840f), CornerRadius(160f))
    val path = Color(0xFFE8C98F)
    drawLine(path, Offset(600f, 670f), Offset(780f, 760f), 28f, StrokeCap.Round)
    drawLine(path, Offset(615f, 300f), Offset(615f, 670f), 24f, StrokeCap.Round)
    drawLine(path, Offset(40f, 670f), Offset(615f, 670f), 22f, StrokeCap.Round)
    drawLine(path, Offset(615f, 300f), Offset(790f, 290f), 22f, StrokeCap.Round)
    // Grass tufts
    for (i in 0 until 26) {
        val x = 60f + (i * 173) % 880; val y = 70f + (i * 311) % 800
        drawLine(Color(0xFF6FAF45), Offset(x, y), Offset(x - 5f, y - 12f), 3f)
        drawLine(Color(0xFF6FAF45), Offset(x, y), Offset(x + 5f, y - 12f), 3f)
    }
}

internal fun DrawScope.drawPng(bitmap: ImageBitmap?, x: Float, y: Float, w: Float, h: Float) {
    bitmap ?: return
    drawImage(bitmap, IntOffset.Zero, IntSize(bitmap.width, bitmap.height), IntOffset(x.toInt(), y.toInt()), IntSize(w.toInt(), h.toInt()))
}

// ---------- Plots and crops ----------

/** One field: its soil, then the plants of the run at their stage, with weeds, earthed-up mounds and stakes. */
internal fun DrawScope.drawPlot(r: SceneRect, crop: String?, run: FarmRun?, t: Float, grow: Float) {
    val soil = Soil.getValue(if (run == null) "grass" else run.soil)
    drawRoundRect(Color(0xFF8A5A34), Offset(r.x, r.y + 8f), Size(r.w, r.h), CornerRadius(18f))
    drawRoundRect(soil, Offset(r.x, r.y), Size(r.w, r.h), CornerRadius(18f))
    drawRoundRect(Outline, Offset(r.x, r.y), Size(r.w, r.h), CornerRadius(18f), style = Stroke(4f))
    when (run?.soil ?: "grass") {
        "ploughed", "rich" -> for (k in 1..4) {
            val y = r.y + r.h * k / 5
            drawLine(Color.Black.copy(alpha = .22f), Offset(r.x + 12f, y), Offset(r.right - 12f, y), 5f, StrokeCap.Round)
        }
        "dry" -> for (k in 0..5) {
            val x = r.x + 20f + k * 25f; val y = r.y + 30f + (k % 3) * 40f
            drawLine(Color(0xFF8A6A3E), Offset(x, y), Offset(x + 14f, y + 18f), 3f)
            drawLine(Color(0xFF8A6A3E), Offset(x + 14f, y + 18f), Offset(x + 4f, y + 34f), 3f)
        }
        else -> for (k in 0..6) {
            val x = r.x + 18f + (k * 53) % (r.w - 30f); val y = r.y + 20f + (k * 37) % (r.h - 30f)
            drawLine(Color(0xFF5E9E3A), Offset(x, y), Offset(x + 6f, y - 14f), 3f)
        }
    }
    if (run == null || crop == null) return
    val n = if (run.dense && run.stage == "young") 4 else 3
    val spots = (0 until n).flatMap { i -> (0 until n).map { j ->
        Offset(r.x + r.w * (i + 0.5f) / n, r.y + r.h * (j + 0.62f) / n)
    } }
    val scale = (if (n == 4) 0.7f else 1f) * grow
    if (run.mounds && run.stage != "pulled") spots.forEach { drawOval(Color(0xFF7A4F2D), Offset(it.x - 22f, it.y - 6f), Size(44f, 16f)) }
    spots.forEachIndexed { k, p ->
        val sway = sin((t * 2 * PI + k).toFloat()) * 3f
        drawCrop(crop, run.stage, Offset(p.x + sway * 0.3f, p.y), scale, sway, k)
    }
    if (run.stakes) spots.forEach { drawLine(Color(0xFF9B6B3A), Offset(it.x + 14f, it.y + 4f), Offset(it.x + 14f, it.y - 46f), 5f, StrokeCap.Round) }
    if (run.weeds) listOf(0.15f to 0.2f, 0.85f to 0.3f, 0.5f to 0.5f, 0.2f to 0.8f, 0.8f to 0.85f).forEach { (fx, fy) ->
        val c = Offset(r.x + r.w * fx, r.y + r.h * fy)
        for (a in -1..1) drawLine(Color(0xFF3E7D2A), c, Offset(c.x + a * 9f, c.y - 16f + kotlin.math.abs(a) * 4f), 4f, StrokeCap.Round)
    }
}

/** A plant of [crop] at [stage], its base at [p]. */
internal fun DrawScope.drawCrop(crop: String, stage: String?, p: Offset, s: Float, sway: Float, k: Int) {
    if (stage == null) return
    fun leaf(dx: Float, dy: Float, rx: Float, ry: Float, color: Color) = blob(Offset(p.x + (dx + sway * (-dy / 40f)) * s, p.y + dy * s), rx * s, ry * s, color, 2f)
    fun stem(h: Float, color: Color = Stem) = drawLine(color, p, Offset(p.x + sway * s, p.y - h * s), 4f * s, StrokeCap.Round)
    fun dot(dx: Float, dy: Float, r: Float, color: Color) = blob(Offset(p.x + (dx + sway * (-dy / 40f)) * s, p.y + dy * s), r * s, r * s, color, 1.5f)
    if (stage == "planted") {
        drawOval(Color(0xFF7A4F2D), Offset(p.x - 14f * s, p.y - 6f * s), Size(28f * s, 12f * s))
        dot(0f, -6f, 4f, Color(0xFFC9955B))
        return
    }
    when ("$crop:$stage") {
        "potato:young" -> { stem(14f); leaf(-7f, -12f, 8f, 6f, Leaf); leaf(7f, -14f, 8f, 6f, LeafLight); leaf(0f, -20f, 7f, 5f, Leaf) }
        "potato:grown" -> { stem(18f); leaf(-12f, -12f, 11f, 8f, LeafDark); leaf(12f, -14f, 11f, 8f, Leaf); leaf(0f, -24f, 12f, 9f, LeafLight); dot(-5f, -32f, 3.5f, Color(0xFFF4F1FF)); dot(6f, -30f, 3.5f, Color(0xFFF4F1FF)) }
        "potato:ripe" -> { stem(14f, Color(0xFFA99A3A)); leaf(-12f, -10f, 11f, 7f, Color(0xFFC9C24A)); leaf(12f, -12f, 11f, 7f, Color(0xFFB5A93C)); leaf(0f, -20f, 11f, 8f, Color(0xFFD8CF62)) }
        "tomato:young" -> { stem(24f); leaf(-7f, -12f, 7f, 5f, Leaf); leaf(7f, -18f, 7f, 5f, LeafLight); leaf(0f, -26f, 6f, 5f, Leaf) }
        "tomato:grown", "tomato:flower", "tomato:ripe" -> {
            stem(48f); leaf(-12f, -16f, 11f, 8f, LeafDark); leaf(12f, -24f, 11f, 8f, Leaf); leaf(-10f, -36f, 10f, 7f, LeafLight); leaf(9f, -44f, 9f, 7f, Leaf)
            if (stage == "flower") listOf(-12f to -28f, 12f to -36f, 0f to -50f, 8f to -18f).forEach { (x, y) -> dot(x, y, 4f, Color(0xFFFFD23F)) }
            if (stage == "ripe") listOf(-13f to -22f, 13f to -30f, -4f to -44f, 9f to -14f).forEachIndexed { i, (x, y) ->
                dot(x, y, 7f, if ((i + k) % 4 == 3) Color(0xFF8FCF4A) else Color(0xFFE8402F))
            }
        }
        "cotton:young" -> { stem(18f, Color(0xFF7D6B3A)); leaf(-6f, -12f, 7f, 5f, Leaf); leaf(6f, -16f, 7f, 5f, LeafLight) }
        "cotton:flower", "cotton:open1", "cotton:open2", "cotton:open3" -> {
            stem(48f, Color(0xFF7D6B3A)); leaf(-12f, -16f, 11f, 8f, LeafDark); leaf(12f, -22f, 11f, 8f, Leaf); leaf(-8f, -36f, 10f, 7f, Leaf); leaf(8f, -44f, 9f, 7f, LeafDark)
            val bolls = listOf(-12f to -12f, 12f to -14f, -12f to -30f, 12f to -32f, -4f to -46f, 6f to -50f)
            if (stage == "flower") bolls.take(4).forEach { (x, y) -> dot(x, y, 5f, Color(0xFFF6D6E6)) }
            else {
                val open = stage!!.last().digitToInt() * 2
                bolls.forEachIndexed { i, (x, y) -> if (i < open) dot(x, y, 7f, Color.White) else dot(x, y, 4.5f, Color(0xFF7CB342)) }
            }
        }
        "beet:young", "beet:grown", "beet:ripe" -> {
            val c = if (stage == "ripe") listOf(Color(0xFF8FA83F), Color(0xFFA5B24A)) else listOf(LeafDark, Leaf)
            val big = if (stage == "young") 0.6f else 1f
            for (i in 0 until 5) {
                val a = (i / 5f) * 2 * PI.toFloat()
                leaf(cos(a) * 12f * big, -10f + sin(a) * 6f - 8f * big, 7f * big, 14f * big, c[i % 2])
            }
            if (stage == "ripe") dot(0f, -2f, 8f, Color(0xFFF3EAD8))
        }
        "beet:pulled" -> {
            rotate(80f, p) { blob(Offset(p.x, p.y - 10f * s), 9f * s, 20f * s, Color(0xFFF3EAD8), 2f) }
            leaf(-24f, -10f, 5f, 11f, Leaf)
        }
        else -> { stem(14f); leaf(-5f, -12f, 6f, 3f, LeafLight); leaf(5f, -12f, 6f, 3f, LeafLight) }
    }
}

// ---------- Buildings ----------

internal fun DrawScope.drawBarn(r: SceneRect) {
    val body = Path().apply { moveTo(r.x + 20f, r.bottom); lineTo(r.x + 20f, r.y + 80f); lineTo(r.cx, r.y + 10f); lineTo(r.right - 20f, r.y + 80f); lineTo(r.right - 20f, r.bottom); close() }
    outlined(body, Color(0xFFC0392B))
    drawRect(Color(0xFFF7E8D0), Offset(r.cx - 45f, r.bottom - 100f), Size(90f, 100f))
    drawLine(Outline, Offset(r.cx - 45f, r.bottom - 100f), Offset(r.cx + 45f, r.bottom), 5f)
    drawLine(Outline, Offset(r.cx + 45f, r.bottom - 100f), Offset(r.cx - 45f, r.bottom), 5f)
    drawRect(Outline, Offset(r.cx - 45f, r.bottom - 100f), Size(90f, 100f), style = Stroke(4f))
    drawCircle(Color(0xFFF7E8D0), 18f, Offset(r.cx, r.y + 70f)); drawCircle(Outline, 18f, Offset(r.cx, r.y + 70f), style = Stroke(4f))
    // Silo
    drawRoundRect(Color(0xFFB0BEC5), Offset(r.right - 40f, r.y + 40f), Size(36f, r.h - 40f), CornerRadius(14f))
    drawRoundRect(Outline, Offset(r.right - 40f, r.y + 40f), Size(36f, r.h - 40f), CornerRadius(14f), style = Stroke(3f))
}

/** The dairy: a white house with a pot whose milk changes as the cheese is made. */
internal fun DrawScope.drawDairy(r: SceneRect, run: FarmRun?, t: Float) {
    val body = Path().apply { moveTo(r.x + 10f, r.bottom); lineTo(r.x + 10f, r.y + 60f); lineTo(r.cx, r.y + 6f); lineTo(r.right - 10f, r.y + 60f); lineTo(r.right - 10f, r.bottom); close() }
    outlined(body, Color(0xFFF6F1E6))
    drawRect(Color(0xFF4FA3D9), Offset(r.x + 30f, r.y + 80f), Size(50f, 40f)); drawRect(Outline, Offset(r.x + 30f, r.y + 80f), Size(50f, 40f), style = Stroke(3f))
    // The pot by the door
    val pot = Offset(r.right - 60f, r.bottom - 30f)
    blob(pot, 38f, 26f, Color(0xFF9EA7AD))
    val step = run?.step ?: -1
    val milk = when {
        run == null -> Color(0xFFF2F2F2)
        step >= 4 -> Color(0xFFF7E9A8)      // curd pressed into cheese
        step >= 3 -> Color(0xFFEFE6C8)      // curd
        else -> Color.White
    }
    drawOval(milk, Offset(pot.x - 30f, pot.y - 18f), Size(60f, 18f))
    if (run != null && step in 1..2) for (i in 0..2) {   // steam after heating
        val x = pot.x - 16f + i * 16f; val y = pot.y - 30f - ((t * 40f + i * 13f) % 30f)
        drawCircle(Color.White.copy(alpha = .7f), 7f, Offset(x, y))
    }
    if (run != null && step >= 5) blob(Offset(r.x + 120f, r.bottom - 18f), 26f, 14f, Color(0xFFFFE082))   // the cheese
    if (run != null && run.picking in setOf("heat", "cool")) drawThermometer(Offset(r.x + 120f, r.y + 120f), run.dial, 70f)
}

internal fun DrawScope.drawThermometer(c: Offset, value: Int, h: Float) {
    drawRoundRect(Color.White, Offset(c.x - 9f, c.y - h / 2), Size(18f, h), CornerRadius(9f))
    val filled = h * value.coerceIn(0, 100) / 100f
    drawRoundRect(Color(0xFFE53935), Offset(c.x - 5f, c.y + h / 2 - filled), Size(10f, filled), CornerRadius(5f))
    drawRoundRect(Outline, Offset(c.x - 9f, c.y - h / 2), Size(18f, h), CornerRadius(9f), style = Stroke(3f))
    drawCircle(Color(0xFFE53935), 12f, Offset(c.x, c.y + h / 2 + 6f)); drawCircle(Outline, 12f, Offset(c.x, c.y + h / 2 + 6f), style = Stroke(3f))
}

/** The pen: fence, the Shami cow, the feeder, the trough and the milk bucket, as the cow quest goes on. */
internal fun DrawScope.drawPen(r: SceneRect, run: FarmRun?, t: Float, cowHappy: Boolean) {
    val step = run?.step ?: 0
    val done = run?.done.orEmpty()
    val clean = run != null && step >= 1
    if (run != null && !clean) listOf(0.2f to 0.8f, 0.4f to 0.6f, 0.75f to 0.85f).forEach { (fx, fy) ->
        drawOval(Color(0xFF6D4C2F), Offset(r.x + r.w * fx, r.y + r.h * fy), Size(34f, 14f))
    }
    // fence
    for (i in 0..6) { val x = r.x + i * r.w / 6; drawLine(Color(0xFF9B6B3A), Offset(x, r.y + 20f), Offset(x, r.bottom), 7f) }
    drawLine(Color(0xFF9B6B3A), Offset(r.x, r.y + 40f), Offset(r.right, r.y + 40f), 6f)
    drawLine(Color(0xFF9B6B3A), Offset(r.x, r.bottom - 10f), Offset(r.right, r.bottom - 10f), 6f)
    // feeder and trough
    val feeder = SceneRect(r.x + 24f, r.y + 200f, 90f, 40f)
    drawRect(Color(0xFFA9773F), Offset(feeder.x, feeder.y), Size(feeder.w, feeder.h)); drawRect(Outline, Offset(feeder.x, feeder.y), Size(feeder.w, feeder.h), style = Stroke(3f))
    val fed = run != null && (step > 1 || "feed" in done)
    if (fed) { drawOval(Color(0xFFE0C35A), Offset(feeder.x + 6f, feeder.y - 10f), Size(40f, 18f)); drawOval(Color(0xFF7CC85A), Offset(feeder.x + 44f, feeder.y - 10f), Size(40f, 18f)) }
    val trough = SceneRect(r.right - 110f, r.y + 220f, 90f, 34f)
    drawRect(Color(0xFF8D9AA3), Offset(trough.x, trough.y), Size(trough.w, trough.h)); drawRect(Outline, Offset(trough.x, trough.y), Size(trough.w, trough.h), style = Stroke(3f))
    if (run != null && (step > 1 || "drink" in done)) drawRect(Color(0xFF4FC3F7), Offset(trough.x + 4f, trough.y + 4f), Size(trough.w - 8f, 10f))
    drawCow(Offset(r.cx, r.y + 140f), t, cowHappy || fed, sparkle = run != null && step >= 3)
    if (run != null && "milk" in done || (run?.harvested ?: 0) > 0 && run?.quest == "cow") {
        blob(Offset(r.cx + 70f, r.y + 190f), 18f, 20f, Color(0xFFB0BEC5)); drawOval(Color.White, Offset(r.cx + 56f, r.y + 172f), Size(28f, 10f))
    }
}

internal fun DrawScope.drawCow(c: Offset, t: Float, happy: Boolean, sparkle: Boolean) {
    val bob = sin(t * 2 * PI.toFloat()) * 2f
    blob(Offset(c.x, c.y + bob), 62f, 36f, Color(0xFF9C6B43))
    blob(Offset(c.x - 20f, c.y - 6f + bob), 18f, 12f, Color(0xFF6D4C2F), 0f)
    for (dx in listOf(-40f, -15f, 20f, 45f)) drawLine(Outline, Offset(c.x + dx, c.y + 26f), Offset(c.x + dx, c.y + 60f), 9f, StrokeCap.Round)
    val head = Offset(c.x + 66f, c.y - 22f + bob)
    blob(head, 26f, 22f, Color(0xFF9C6B43))
    drawLine(Color(0xFFEDE0C8), Offset(head.x - 14f, head.y - 18f), Offset(head.x - 24f, head.y - 34f), 6f, StrokeCap.Round)
    drawLine(Color(0xFFEDE0C8), Offset(head.x + 14f, head.y - 18f), Offset(head.x + 24f, head.y - 34f), 6f, StrokeCap.Round)
    blob(Offset(head.x + 6f, head.y + 10f), 14f, 9f, Color(0xFFF2B8A2), 2f)
    drawCircle(Outline, 3.5f, Offset(head.x - 8f, head.y - 4f)); drawCircle(Outline, 3.5f, Offset(head.x + 10f, head.y - 4f))
    if (happy) drawArc(Outline, 20f, 140f, false, Offset(head.x - 4f, head.y + 4f), Size(16f, 10f), style = Stroke(2.5f))
    blob(Offset(c.x + 10f, c.y + 30f), 14f, 8f, Color(0xFFF2B8A2), 2f)
    if (sparkle) for (i in 0..2) drawStar(Offset(c.x + 4f + i * 14f, c.y + 46f), 6f, Color(0xFFFFF59D))
}

internal fun DrawScope.drawStar(c: Offset, r: Float, color: Color) {
    val p = Path()
    for (i in 0 until 8) {
        val a = i * PI.toFloat() / 4; val rr = if (i % 2 == 0) r else r * 0.4f
        if (i == 0) p.moveTo(c.x + cos(a) * rr, c.y + sin(a) * rr) else p.lineTo(c.x + cos(a) * rr, c.y + sin(a) * rr)
    }
    p.close(); drawPath(p, color)
}

/** Three hives in the meadow; bees fly unless calm; the suit and the honey frame show the quest's progress. */
internal fun DrawScope.drawHives(r: SceneRect, run: FarmRun?, t: Float) {
    listOf(0.18f, 0.5f, 0.82f).forEachIndexed { i, fx ->
        val x = r.x + r.w * fx - 34f; val y = r.y + 50f + (i % 2) * 20f
        drawRect(Color(0xFFFFFFFF), Offset(x, y), Size(68f, 70f)); drawRect(Outline, Offset(x, y), Size(68f, 70f), style = Stroke(3f))
        drawRect(Color(0xFFF2C14E), Offset(x - 6f, y - 12f), Size(80f, 14f)); drawRect(Outline, Offset(x - 6f, y - 12f), Size(80f, 14f), style = Stroke(3f))
        drawRect(Outline, Offset(x + 26f, y + 58f), Size(16f, 6f))
    }
    for (i in 0 until 7) {
        val a = t * 2 * PI.toFloat() + i * 0.9f
        val c = Offset(r.cx + cos(a * (1 + i % 2)) * (60f + i * 8f), r.y + 50f + sin(a) * 30f)
        drawBee(c, 6f)
    }
    if (run != null && run.step >= 1) drawEmoji(Offset(r.x + 10f, r.bottom - 40f), 36f, Color(0xFFEDE7F6))   // the beekeeper's suit
    if (run != null && (run.harvested > 0)) {
        drawRect(Color(0xFFFFB300), Offset(r.right - 70f, r.bottom - 46f), Size(56f, 38f)); drawRect(Outline, Offset(r.right - 70f, r.bottom - 46f), Size(56f, 38f), style = Stroke(3f))
    }
}

/** A plain round marker (the suit), drawn as a little hooded figure. */
private fun DrawScope.drawEmoji(c: Offset, r: Float, color: Color) {
    blob(Offset(c.x + r / 2, c.y + r / 2), r / 2, r / 1.6f, color)
    drawRect(Color(0xFF263238).copy(alpha = .6f), Offset(c.x + r * 0.2f, c.y), Size(r * 0.6f, r * 0.25f))
}

internal fun DrawScope.drawBee(c: Offset, s: Float, kind: String = "worker") {
    val (rx, ry) = when (kind) { "queen" -> 1f to 2.4f; "drone" -> 1.5f to 1.6f; else -> 1f to 1.2f }
    blob(Offset(c.x - s * 1.2f, c.y - s * ry), s * 1.1f, s * 0.7f, Color(0xFFE8F6FF), s * 0.2f)
    blob(Offset(c.x + s * 1.2f, c.y - s * ry), s * 1.1f, s * 0.7f, Color(0xFFE8F6FF), s * 0.2f)
    blob(c, s * rx, s * ry, Color(0xFFFFD23F), s * 0.25f)
    for (k in listOf(-0.3f, 0.1f, 0.5f)) drawLine(Outline, Offset(c.x - s * rx * 0.9f, c.y + k * s * ry), Offset(c.x + s * rx * 0.9f, c.y + k * s * ry), s * 0.35f)
    val head = Offset(c.x, c.y - s * ry - s * 0.5f)
    drawCircle(Outline, s * 0.75f, head)
    val eye = if (kind == "drone") s * 0.35f else s * 0.2f
    drawCircle(Color.White, eye, Offset(head.x - s * 0.35f, head.y)); drawCircle(Color.White, eye, Offset(head.x + s * 0.35f, head.y))
}

/** The orders board with one card per waiting order. */
internal fun DrawScope.drawBoard(r: SceneRect, orders: Int, ready: Boolean) {
    drawLine(Color(0xFF7A4F2D), Offset(r.x + 40f, r.y + 60f), Offset(r.x + 40f, r.bottom - 10f), 10f)
    drawLine(Color(0xFF7A4F2D), Offset(r.right - 40f, r.y + 60f), Offset(r.right - 40f, r.bottom - 10f), 10f)
    drawRoundRect(Color(0xFFB9824A), Offset(r.x + 14f, r.y + 20f), Size(r.w - 28f, 90f), CornerRadius(10f))
    drawRoundRect(Outline, Offset(r.x + 14f, r.y + 20f), Size(r.w - 28f, 90f), CornerRadius(10f), style = Stroke(4f))
    repeat(orders.coerceAtMost(3)) { i ->
        drawRect(if (ready && i == 0) Color(0xFFFFF59D) else Color(0xFFFFF7E6), Offset(r.x + 30f + i * 46f, r.y + 34f), Size(36f, 54f))
        drawRect(Outline, Offset(r.x + 30f + i * 46f, r.y + 34f), Size(36f, 54f), style = Stroke(2f))
    }
}

internal fun DrawScope.drawDock(r: SceneRect, ship: ImageBitmap?, t: Float) {
    drawRect(Color(0xFF9B6B3A), Offset(r.x, r.y + 40f), Size(150f, 46f))
    for (i in 0..4) drawLine(Color(0xFF6D4C2F), Offset(r.x + i * 36f, r.y + 40f), Offset(r.x + i * 36f, r.y + 110f), 8f)
    drawRect(Outline, Offset(r.x, r.y + 40f), Size(150f, 46f), style = Stroke(3f))
    val bob = sin(t * 2 * PI.toFloat()) * 6f
    drawPng(ship, r.x + 120f, r.y + 60f + bob, 230f, 164f)
}

// ---------- Decorations bought with coins ----------

internal fun DrawScope.drawDecor(id: String, at: Pair<Float, Float>, t: Float) {
    val c = Offset(at.first, at.second)
    when (id) {
        "rose" -> { blob(c, 22f, 16f, LeafDark); listOf(-10f to -6f, 8f to -8f, 0f to 4f).forEach { (x, y) -> blob(Offset(c.x + x, c.y + y), 6f, 6f, Color(0xFFD81B60), 2f) } }
        "jasmine" -> {
            drawArc(LeafDark, 180f, 180f, false, Offset(c.x - 40f, c.y - 50f), Size(80f, 90f), style = Stroke(12f))
            for (i in 0..6) { val a = PI.toFloat() + i * PI.toFloat() / 6; drawCircle(Color.White, 5f, Offset(c.x + cos(a) * 40f, c.y - 5f + sin(a) * 45f)) }
        }
        "scarecrow" -> {
            drawLine(Color(0xFF7A4F2D), Offset(c.x, c.y + 40f), Offset(c.x, c.y - 30f), 6f)
            drawLine(Color(0xFF7A4F2D), Offset(c.x - 30f, c.y - 12f), Offset(c.x + 30f, c.y - 12f), 6f)
            blob(Offset(c.x, c.y - 4f), 16f, 20f, Color(0xFF5C8DD6))
            blob(Offset(c.x, c.y - 36f), 13f, 13f, Color(0xFFF0CF8F))
            drawRect(Color(0xFFC9955B), Offset(c.x - 20f, c.y - 54f), Size(40f, 8f))
        }
        "fountain" -> {
            blob(Offset(c.x, c.y + 10f), 48f, 18f, Color(0xFFB0BEC5)); drawOval(Color(0xFF4FC3F7), Offset(c.x - 40f, c.y + 2f), Size(80f, 16f))
            drawLine(Color(0xFFB0BEC5), Offset(c.x, c.y + 8f), Offset(c.x, c.y - 30f), 8f)
            val h = 10f + sin(t * 4 * PI.toFloat()) * 3f
            drawArc(Color(0xFF81D4FA), 200f, 140f, false, Offset(c.x - 22f, c.y - 40f - h), Size(44f, 40f), style = Stroke(4f))
        }
        "lanterns" -> {
            drawLine(Color(0xFF5D4037), Offset(c.x, c.y + 26f), Offset(c.x, c.y - 20f), 4f)
            blob(Offset(c.x, c.y - 28f), 9f, 12f, Color(0xFFFFB74D), 2f)
            drawCircle(Color(0xFFFFF59D).copy(alpha = .5f), 16f, Offset(c.x, c.y - 28f))
        }
    }
}

// ---------- Helpers (the child's companion) ----------

/** A helper's face: bee, Shami cow, puppy or kitty. [s] is the face radius. */
internal fun DrawScope.drawHelper(id: String, c: Offset, s: Float, hop: Float = 0f) {
    val p = Offset(c.x, c.y - hop)
    when (id) {
        "bee" -> drawBee(p, s * 0.45f)
        "cow" -> {
            blob(p, s, s * 0.85f, Color(0xFFF6EFE6), s * 0.08f)
            blob(Offset(p.x - s * 0.4f, p.y - s * 0.3f), s * 0.3f, s * 0.25f, Color(0xFF6D4C2F), 0f)
            drawLine(Color(0xFFEDE0C8), Offset(p.x - s * 0.6f, p.y - s * 0.6f), Offset(p.x - s * 0.9f, p.y - s * 1.1f), s * 0.15f, StrokeCap.Round)
            drawLine(Color(0xFFEDE0C8), Offset(p.x + s * 0.6f, p.y - s * 0.6f), Offset(p.x + s * 0.9f, p.y - s * 1.1f), s * 0.15f, StrokeCap.Round)
            blob(Offset(p.x, p.y + s * 0.45f), s * 0.55f, s * 0.32f, Color(0xFFF2B8A2), s * 0.06f)
            eyes(p, s)
        }
        "puppy" -> {
            blob(Offset(p.x - s * 0.85f, p.y), s * 0.3f, s * 0.6f, Color(0xFF6D4C2F), s * 0.06f)
            blob(Offset(p.x + s * 0.85f, p.y), s * 0.3f, s * 0.6f, Color(0xFF6D4C2F), s * 0.06f)
            blob(p, s * 0.85f, s * 0.8f, Color(0xFFC68B59), s * 0.08f)
            drawCircle(Outline, s * 0.14f, Offset(p.x, p.y + s * 0.3f))
            eyes(p, s)
        }
        else -> {   // kitty
            val ears = Path().apply {
                moveTo(p.x - s * 0.8f, p.y - s * 0.2f); lineTo(p.x - s * 0.6f, p.y - s * 1.05f); lineTo(p.x - s * 0.1f, p.y - s * 0.6f)
                moveTo(p.x + s * 0.8f, p.y - s * 0.2f); lineTo(p.x + s * 0.6f, p.y - s * 1.05f); lineTo(p.x + s * 0.1f, p.y - s * 0.6f)
            }
            outlined(ears, Color(0xFFB0A8A0), s * 0.06f)
            blob(p, s * 0.85f, s * 0.75f, Color(0xFFB0A8A0), s * 0.08f)
            for (side in listOf(-1f, 1f)) drawLine(Outline, Offset(p.x + side * s * 0.3f, p.y + s * 0.3f), Offset(p.x + side * s * 0.9f, p.y + s * 0.2f), s * 0.04f)
            eyes(p, s)
        }
    }
}

private fun DrawScope.eyes(p: Offset, s: Float) {
    drawCircle(Outline, s * 0.11f, Offset(p.x - s * 0.3f, p.y - s * 0.05f))
    drawCircle(Outline, s * 0.11f, Offset(p.x + s * 0.3f, p.y - s * 0.05f))
    drawArc(Outline, 20f, 140f, false, Offset(p.x - s * 0.2f, p.y + s * 0.1f), Size(s * 0.4f, s * 0.3f), style = Stroke(s * 0.06f))
}

/** The golden arrow over the next place to go (bounces unless calm). */
internal fun DrawScope.drawBeacon(r: SceneRect, bounce: Float) {
    val tip = Offset(r.cx, r.y - 6f - bounce)
    val p = Path().apply { moveTo(tip.x, tip.y); lineTo(tip.x - 22f, tip.y - 34f); lineTo(tip.x + 22f, tip.y - 34f); close() }
    outlined(p, Color(0xFFFFD23F), 3f)
}

// ---------- Small drawings for choices (web: optionArt) ----------

/** tuber:N (a potato piece with N buds), tomato:red/green, bee:queen/drone/worker — drawn in a 100 × 100 box. */
internal fun DrawScope.drawOptionArt(art: String) {
    val (kind, v) = art.split(':').let { it[0] to it.getOrElse(1) { "" } }
    val k = size.minDimension / 100f
    translate((size.width - 100f * k) / 2, (size.height - 100f * k) / 2) {
        scale(k, k, Offset.Zero) {
            when (kind) {
                "tuber" -> {
                    blob(Offset(50f, 52f), 38f, 28f, Color(0xFFE7C08A), 3f)
                    listOf(34f to 40f, 62f to 50f, 46f to 66f).take(v.toIntOrNull() ?: 0).forEach { (x, y) ->
                        drawCircle(Color(0xFF8A5A34), 6f, Offset(x, y))
                        drawLine(Color(0xFF4FAE45), Offset(x, y - 5f), Offset(x + 9f, y - 14f), 4f, StrokeCap.Round)
                    }
                }
                "tomato" -> {
                    blob(Offset(50f, 56f), 30f, 28f, if (v == "red") Color(0xFFE8402F) else Color(0xFF8FCF4A), 3f)
                    val top = Path().apply { moveTo(36f, 28f); lineTo(50f, 36f); lineTo(64f, 28f); lineTo(58f, 42f); lineTo(42f, 42f); close() }
                    outlined(top, Color(0xFF3F9D3C), 2f)
                }
                "bee" -> drawBee(Offset(50f, 58f), 14f, v)
            }
        }
    }
}
