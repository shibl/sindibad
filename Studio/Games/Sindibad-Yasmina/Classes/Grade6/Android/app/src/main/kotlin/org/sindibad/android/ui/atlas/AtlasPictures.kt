package org.sindibad.android.ui.atlas

import android.graphics.Typeface
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.AbsoluteAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import androidx.core.content.res.ResourcesCompat
import org.sindibad.android.R
import org.sindibad.android.domain.atlas.MapLayout
import org.sindibad.android.domain.atlas.MapSpot
import org.sindibad.android.domain.atlas.SpotKind
import org.sindibad.android.domain.atlas.TimelineEvent
import org.sindibad.android.ui.Gold
import org.sindibad.android.ui.Sand
import org.sindibad.android.ui.science.Pen

// The atlas island's pictures drawn natively (web: core/atlas/views.ts and its style.css colours): maps from the
// world's real outlines and the timeline. Shapes are built once per layout (Compose paths), so a frame only draws.
// A tap is found on the shapes themselves (MapLayout.hit: a country's outline, a river's line, a city's dot), with
// a finger's slop for the small places; TalkBack gets one labelled 48 dp button per place.

/** How a place looks now. */
data class SpotLook(val glow: Boolean = false, val found: Boolean = false, val latest: Boolean = false, val enabled: Boolean = true,
    val description: String = "", val name: String? = null)

private val SEA_BG = Color(0xFFBFE3F5)
private val LAND = Color(0xFFECE6D8); private val LAND_LINE = Color(0xFFB9AE98)
private val ARAB = Color(0xFFF6E3B4); private val ARAB_LINE = Color(0xFFC9A96A)
private val MARK = Color(0xFFFFD36B); private val MARK_LINE = Color(0xFFC98A1A)
private val FOUND_LINE = Color(0xFFB9781A); private val NEW = Color(0xFFFFF2C2)
private val NAMED = Color(0xFFC9EEB4); private val NAMED_LINE = Color(0xFF4F9A3A)
private val LAKE = Color(0xFF7CC8EF); private val LAKE_LINE = Color(0xFF4A9AC9)
private val RIVER = Color(0xFF3F9AD6); private val RIVER_ON = Color(0xFF1F6FD6)
private val RED = Color(0xFFE8453C); private val PEAK = Color(0xFFA07A4F); private val PEAK_LINE = Color(0xFF6B4A2A)
private val AREA = Color(0x59F0C878); private val AREA_LINE = Color(0xFFC9962A)
private val SEA_SPOT = Color(0x2E3F8FD6); private val SEA_LINE = Color(0xFF3F8FD6); private val SEA_TEXT = Color(0xFF1F5F9A)
private val INK = Color(0xFF3B2414)
private val DASH = PathEffect.dashPathEffect(floatArrayOf(3f, 2f))

@Composable
private fun rememberFont(): Typeface {
    val context = LocalContext.current
    return remember { runCatching { ResourcesCompat.getFont(context, R.font.baloo_arabic_800) }.getOrNull() ?: Typeface.DEFAULT_BOLD }
}

/** The glow's soft pulse (still in calm mode). */
@Composable
private fun pulse(calm: Boolean): State<Float> =
    if (calm) remember { mutableFloatStateOf(1f) }
    else rememberInfiniteTransition(label = "glow").animateFloat(.45f, 1f, infiniteRepeatable(tween(700, easing = LinearEasing), RepeatMode.Reverse), label = "a")

private fun pathOf(pts: FloatArray, close: Boolean) = Path().apply {
    if (pts.size >= 2) { moveTo(pts[0], pts[1]); var i = 2; while (i + 1 < pts.size) { lineTo(pts[i], pts[i + 1]); i += 2 }; if (close) close() }
}

/** A layout's shapes as paths, built once. */
private class MapPaths(layout: MapLayout) {
    val land = layout.land.map { o -> Triple(Path().apply { o.rings.forEach { addPath(pathOf(it, true)) } }, o.arab, o.mark) }
    val spots: Map<String, List<Path>> = layout.spots.associate { s ->
        s.id to when (s.kind) {
            SpotKind.Country -> listOf(Path().apply { s.outline!!.rings.forEach { addPath(pathOf(it, true)) } })
            SpotKind.River -> s.paths.map { pathOf(it, false) }
            else -> emptyList()
        }
    }
    val rivers = layout.decor.rivers.map { pathOf(it.first, false) to it.second }
}

/**
 * A map: `looks` says how each place of the layout looks (missing = drawn plain and not tappable). `onTap` gets a
 * place's id.
 */
@Composable
fun AtlasMapView(layout: MapLayout, looks: Map<String, SpotLook>, calm: Boolean, description: String, labelStep: Boolean = false,
    onTap: (String) -> Unit) {
    val font = rememberFont()
    val paths = remember(layout) { MapPaths(layout) }
    val glow by pulse(calm)
    val density = LocalDensity.current
    val tappable = looks.filterValues { it.enabled }.keys
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val k = maxWidth / layout.w
        val slop = with(density) { 22.dp.toPx() } / with(density) { k.toPx() }
        Box(Modifier.size(maxWidth, k * layout.h).clip(RoundedCornerShape(16.dp)).border(1.dp, Sand, RoundedCornerShape(16.dp))) {
            Canvas(Modifier.matchParentSize().semantics { contentDescription = description }
                .pointerInput(layout, tappable) {
                    detectTapGestures { o ->
                        val u = size.width / layout.w
                        layout.hit(o.x / u, o.y / u, slop, tappable)?.let(onTap)
                    }
                }) {
                drawMap(layout, paths, looks, glow, labelStep, Pen(this, font))
            }
            // TalkBack: one button per place that may be tapped, at its anchor (no touch handling: taps go to the map).
            for (s in layout.spots) {
                val look = looks[s.id] ?: continue
                val half = 24.dp
                Box(Modifier.align(AbsoluteAlignment.TopLeft).absoluteOffset(k * s.x - half, k * s.y - half).size(half * 2)
                    .semantics {
                        contentDescription = look.description
                        role = Role.Button
                        if (look.glow) stateDescription = "يلمع ✨"
                        if (look.enabled) onClick { onTap(s.id); true } else disabled()
                    })
            }
        }
    }
}

private fun DrawScope.drawMap(layout: MapLayout, paths: MapPaths, looks: Map<String, SpotLook>, glow: Float, labelStep: Boolean, pen: Pen) {
    val k = pen.k
    scale(k, k, Offset.Zero) {
        drawRect(SEA_BG, Offset.Zero, Size(layout.w, layout.h))
        for ((p, arab, mark) in paths.land) {
            val (fill, line, w) = when { mark -> Triple(MARK, MARK_LINE, 1.2f); arab -> Triple(ARAB, ARAB_LINE, .7f); else -> Triple(LAND, LAND_LINE, .7f) }
            drawPath(p, fill); drawPath(p, line, style = Stroke(w, join = StrokeJoin.Round))
        }
        for ((xy, e) in layout.decor.lakes) lake(xy[0], xy[1], e)
    }
    val spots = layout.spots
    // Countries, dot countries and lakes that are places, then the marked dots, then the rest on top (web order).
    for (s in spots) if (s.kind == SpotKind.Country || s.kind == SpotKind.Dot || s.kind == SpotKind.Lake) drawSpot(s, paths, looks[s.id], glow, labelStep, pen)
    scale(k, k, Offset.Zero) {
        for (d in layout.decor.dots) { drawCircle(ARAB, 4f, Offset(d[0], d[1])); drawCircle(INK, 4f, Offset(d[0], d[1]), style = Stroke(1.5f)) }
        for (c in layout.decor.cities) city(c[0], c[1], true)
        for (y in layout.decor.lines) drawLine(RED, Offset(0f, y), Offset(layout.w, y), 1.4f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(5f, 4f)))
        for (m in layout.decor.mountains) peaks(m)
        for ((p, mark) in paths.rivers) drawPath(p, if (mark) MARK_LINE else RIVER, style = Stroke(2.2f, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
    for (s in spots) if (s.kind != SpotKind.Country && s.kind != SpotKind.Dot && s.kind != SpotKind.Lake) drawSpot(s, paths, looks[s.id], glow, labelStep, pen)
    // The names of places found, on top of everything.
    for (s in spots) {
        val name = looks[s.id]?.name ?: continue
        val (size, color) = when (s.kind) { SpotKind.Country -> 11 to Pen.LABEL; SpotKind.Water -> 13 to SEA_TEXT; else -> 13 to Pen.LABEL }
        pen.text(name, s.labelX, s.labelY, size, color, halo = true)
    }
    pen.text("ش", layout.w - 12, 18, 12, INK)
    pen.poly(layout.w - 12, 22f, layout.w - 16, 31f, layout.w - 12, 28f, layout.w - 8, 31f, fill = INK)
}

private fun DrawScope.drawSpot(s: MapSpot, paths: MapPaths, look: SpotLook?, glow: Float, labelStep: Boolean, pen: Pen) {
    val k = pen.k
    val found = look?.found == true
    val lit = look?.glow == true && !found
    scale(k, k, Offset.Zero) {
        when (s.kind) {
            SpotKind.Country -> {
                val p = paths.spots.getValue(s.id).first()
                val o = s.outline!!
                val (fill, line, w) = when {
                    found && labelStep -> Triple(NAMED, NAMED_LINE, 1.4f)
                    found -> Triple(if (look?.latest == true) NEW else MARK, FOUND_LINE, 1.4f)
                    o.mark -> Triple(MARK, MARK_LINE, 1.2f)
                    o.arab -> Triple(ARAB, ARAB_LINE, .7f)
                    else -> Triple(LAND, LAND_LINE, .7f)
                }
                drawPath(p, fill); drawPath(p, line, style = Stroke(w, join = StrokeJoin.Round))
                if (lit) { drawPath(p, Gold.copy(alpha = .35f * glow)); drawPath(p, Gold, alpha = glow, style = Stroke(2.4f, join = StrokeJoin.Round)) }
            }
            SpotKind.Dot -> { drawCircle(ARAB, 4f, Offset(s.x, s.y)); drawCircle(INK, 4f, Offset(s.x, s.y), style = Stroke(1.5f)) }
            SpotKind.Lake -> lake(s.x, s.y, s.ellipse!!)
            SpotKind.Line -> drawLine(RED, Offset(0f, s.y), Offset(320f, s.y), if (found) 2.2f else 1.4f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(5f, 4f)))
            SpotKind.Mountain -> peaks(s.paths.first())
            SpotKind.River -> paths.spots.getValue(s.id).forEach { drawPath(it, if (found || lit) RIVER_ON else if (s.mark) MARK_LINE else RIVER, style = Stroke(if (found || lit) 3.4f else 2.2f, cap = StrokeCap.Round, join = StrokeJoin.Round)) }
            SpotKind.Land -> { drawCircle(AREA, 12f, Offset(s.x, s.y)); drawCircle(AREA_LINE, 12f, Offset(s.x, s.y), style = Stroke(1f, pathEffect = DASH)) }
            SpotKind.Water -> { drawCircle(SEA_SPOT, 10f, Offset(s.x, s.y)); drawCircle(SEA_LINE, 10f, Offset(s.x, s.y), style = Stroke(1f, pathEffect = DASH)) }
            SpotKind.City -> city(s.x, s.y, s.mark)
        }
        // Found places get a soft green ring in label steps; glowing ones a gold ring (points, lines, rivers).
        if (s.kind != SpotKind.Country) {
            val r = when (s.kind) { SpotKind.Line, SpotKind.River -> 0f; SpotKind.Land -> 16f; SpotKind.Water -> 14f; else -> 11f }
            if (lit) {
                if (r > 0) { drawCircle(Gold.copy(alpha = .3f * glow), r, Offset(s.x, s.y)); drawCircle(Color(0xFFE0A400), r, Offset(s.x, s.y), alpha = glow, style = Stroke(2f)) }
                else if (s.kind == SpotKind.Line) drawRect(Gold.copy(alpha = .3f * glow), Offset(0f, s.y - 8), Size(320f, 16f))
                else paths.spots.getValue(s.id).forEach { drawPath(it, Gold.copy(alpha = .45f * glow), style = Stroke(10f, cap = StrokeCap.Round, join = StrokeJoin.Round)) }
            } else if (found && labelStep && r > 0) drawCircle(NAMED_LINE, r, Offset(s.x, s.y), style = Stroke(1.6f))
        }
    }
}

private fun DrawScope.lake(x: Float, y: Float, e: FloatArray) {
    rotate(e[2], Offset(x, y)) {
        drawOval(LAKE, Offset(x - e[0], y - e[1]), Size(e[0] * 2, e[1] * 2))
        drawOval(LAKE_LINE, Offset(x - e[0], y - e[1]), Size(e[0] * 2, e[1] * 2), style = Stroke(1f))
    }
}
private fun DrawScope.city(x: Float, y: Float, mark: Boolean) {
    drawCircle(if (mark) MARK else RED, 3.2f, Offset(x, y)); drawCircle(Color.White, 3.2f, Offset(x, y), style = Stroke(1.4f))
    if (mark) drawCircle(MARK_LINE, 4.6f, Offset(x, y), style = Stroke(1.2f))
}
private fun DrawScope.peaks(m: FloatArray) {
    var i = 0
    while (i + 1 < m.size) {
        val x = m[i]; val y = m[i + 1]
        val p = Path().apply { moveTo(x - 5, y + 4); lineTo(x, y - 5); lineTo(x + 5, y + 4); close() }
        drawPath(p, PEAK); drawPath(p, PEAK_LINE, style = Stroke(.8f))
        i += 2
    }
}

/** The timeline (web timelineHTML): 320 × 190, the earliest on the right; a found event shows its name. */
@Composable
fun TimelineView(events: List<TimelineEvent>, looks: Map<String, SpotLook>, calm: Boolean, description: String, onTap: (String) -> Unit) {
    val font = rememberFont()
    val glow by pulse(calm)
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val k = maxWidth / 320f
        Box(Modifier.size(maxWidth, k * 190f).clip(RoundedCornerShape(16.dp))) {
            Canvas(Modifier.matchParentSize().semantics { contentDescription = description }) {
                val pen = Pen(this, font)
                pen.rect(0, 0, 320, 190, fill = Color(0xFFFBF4E6), r = 16)
                pen.line(14, 100, 306, 100, PEAK, 4)
                pen.poly(8f, 100f, 18f, 94f, 18f, 106f, fill = PEAK)
                for (e in events) {
                    val look = looks[e.id]
                    val h = e.hit
                    if (look?.glow == true && look.found.not()) {
                        pen.rect(h[0], h[1], h[2], h[3], fill = Gold.copy(alpha = .28f * glow), stroke = Color(0xFFE0A400), sw = 2, r = 10, alpha = 1f)
                    }
                    pen.line(e.x, 100, e.x, if (e.up) 70 else 130, Color(0xFFC9A96A), 2)
                    pen.circle(e.x, 100, 7, fill = if (look?.found == true) MARK else Color.White, stroke = INK, sw = 2.5)
                    pen.text(e.label, e.yearX, e.yearY, 11, PEAK_LINE)
                    look?.name?.let { pen.text(it, e.nameX, e.nameY, 12, Pen.LABEL, halo = true) }
                }
            }
            for (e in events) {
                val look = looks[e.id] ?: continue
                val h = e.hit
                Box(Modifier.align(AbsoluteAlignment.TopLeft).absoluteOffset(k * h[0], k * h[1]).size(k * h[2], k * h[3])
                    .pointerInput(look.enabled) { if (look.enabled) detectTapGestures { onTap(e.id) } }
                    .semantics {
                        contentDescription = look.description
                        role = Role.Button
                        if (look.glow) stateDescription = "يلمع ✨"
                        if (look.enabled) onClick { onTap(e.id); true } else disabled()
                    })
            }
        }
    }
}
