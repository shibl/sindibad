package org.sindibad.android.ui.atlas

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.sindibad.android.domain.atlas.Flag
import org.sindibad.android.domain.atlas.FlagShape
import org.sindibad.android.ui.science.Pen

// A flag drawn natively from its imported shapes (web: worlds/atlas/countries.ts draws each flag in code in a
// 300 × 200 box: rects, circles, polygons and paths, a rotated group, a smaller flag as a canton). The paths are
// parsed once and cached.

private fun colour(h: String) = Color(0xFF000000 or h.removePrefix("#").toLong(16))

private fun matrixOf(m: List<Double>) = Matrix().apply {
    this[0, 0] = m[0].toFloat(); this[0, 1] = m[1].toFloat()
    this[1, 0] = m[2].toFloat(); this[1, 1] = m[3].toFloat()
    this[3, 0] = m[4].toFloat(); this[3, 1] = m[5].toFloat()
}

private val matrices = HashMap<FlagShape, Matrix>()
private fun matrix(s: FlagShape) = synchronized(matrices) { matrices.getOrPut(s) { matrixOf(s.m!!) } }

@Composable
fun FlagView(flag: Flag, description: String?, modifier: Modifier = Modifier) {
    Canvas(modifier.aspectRatio(1.5f).border(1.dp, Color(0x553B2414)).semantics { if (description != null) contentDescription = description }) {
        val k = size.width / 300f
        scale(k, k, Offset.Zero) {
            clipRect(0f, 0f, 300f, 200f) {
                for (s in flag.shapes) {
                    val path = Pen.parsed(s.d)
                    withTransform({
                        s.clip?.let { c -> clipRect(c[0].toFloat(), c[1].toFloat(), (c[0] + c[2]).toFloat(), (c[1] + c[3]).toFloat()) }
                        if (s.m != null) transform(matrix(s))
                    }) {
                        s.fill?.let { drawPath(path, colour(it)) }
                        s.stroke?.let {
                            drawPath(path, colour(it), style = Stroke((s.sw ?: 1.0).toFloat(),
                                cap = when (s.cap) { "round" -> StrokeCap.Round; "square" -> StrokeCap.Square; else -> StrokeCap.Butt },
                                join = when (s.join) { "round" -> StrokeJoin.Round; "bevel" -> StrokeJoin.Bevel; else -> StrokeJoin.Miter }))
                        }
                    }
                }
            }
        }
    }
}
