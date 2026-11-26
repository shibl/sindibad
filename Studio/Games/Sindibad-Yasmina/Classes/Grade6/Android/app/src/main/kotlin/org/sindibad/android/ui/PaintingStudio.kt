package org.sindibad.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.sindibad.android.domain.Profile
import java.util.UUID

private val colors = listOf(Color.White, Color.Black, Color.Red, Color.Blue, Color.Green, Color.Yellow, Color.Magenta, Color.Cyan, Color(0xFFEE8833), Color(0xFF9164B2), Color(0xFFA76E41), Color.Gray)
private val names = listOf("أبيض", "أسود", "أحمر", "أزرق", "أخضر", "أصفر", "أرجواني", "فيروزي", "برتقالي", "بنفسجي", "بنيّ", "رمادي")

@Composable
internal fun PaintingStudio(profile: Profile, save: (String, List<Int>) -> Unit) {
    var id by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    var pixels by rememberSaveable { mutableStateOf(IntArray(64)) }
    var paint by rememberSaveable { mutableIntStateOf(2) }
    var mode by rememberSaveable { mutableIntStateOf(0) }
    var mix by rememberSaveable { mutableStateOf(false) }
    var previous by rememberSaveable { mutableStateOf<IntArray?>(null) }
    PaperCard(Modifier.fillMaxWidth()) {
        Text("مرسمي", style = MaterialTheme.typography.titleLarge)
        colors.indices.chunked(6).forEach { row -> Row { row.forEach { index ->
            val color = colors[index]
            Box(Modifier.weight(1f).height(44.dp).padding(2.dp).background(color)
                .semantics { contentDescription = names[index] }.clickable {
                    paint = if (mix) mixPaint(paint, index) else index
                    mix = false
                })
        } } }
        Row {
            TextButton(onClick = { mix = !mix }) { Text(if (mix) "اختر اللون الثاني" else "امزج لونين") }
            TextButton(enabled = previous != null, onClick = { previous?.let { pixels = it }; previous = null }) { Text("تراجع") }
        }
        Row { listOf("رسم حرّ", "تناظر", "ماندالا").forEachIndexed { index, name ->
            TextButton(onClick = { mode = index }) { Text(if (mode == index) "✓ " + name else name) }
        } }
        Text("اللون: " + names[paint])
        repeat(8) { y -> Row {
            repeat(8) { x ->
                val index = y * 8 + x
                Box(Modifier.weight(1f).aspectRatio(1f).padding(1.dp).background(colors[pixels[index]])
                    .semantics { contentDescription = "${y+1}، ${x+1}، ${names[pixels[index]]}" }
                    .clickable { previous = pixels
                        pixels = pixels.copyOf().also { next ->
                            for (cell in brushCells(x, y, mode)) next[cell] = paint
                        } })
            }
        } }
        Row {
            TextButton(onClick = { save(id, pixels.toList()) }) { Text("احفظ اللوحة") }
            TextButton(onClick = { id = UUID.randomUUID().toString(); pixels = IntArray(64); previous = null }) { Text("لوحة جديدة") }
        }
        profile.gallery.entries.forEachIndexed { i, (key, drawing) ->
            TextButton(onClick = { id = key; pixels = drawing.toIntArray(); previous = null }) { Text("لوحتي ${i+1}") }
        }
    }
}

/** Mirror across the centre line or repeat a mark in all eight octants. */
internal fun brushCells(x: Int, y: Int, mode: Int): Set<Int> {
    fun cell(a: Int, b: Int) = b * 8 + a
    val points = mutableSetOf(cell(x, y))
    if (mode >= 1) points += cell(7 - x, y)
    if (mode == 2) {
        for ((a, b) in listOf(x to y, y to x)) {
            for (u in listOf(a, 7-a)) for (v in listOf(b, 7-b)) points += cell(u, v)
        }
    }
    return points
}

private fun mixPaint(first: Int, second: Int): Int {
    val pair = setOf(first, second)
    return when (pair) {
        setOf(2, 5) -> 8
        setOf(2, 3) -> 9
        setOf(3, 5) -> 4
        setOf(2, 4), setOf(3, 8), setOf(5, 9) -> 10
        setOf(0, 1) -> 11
        else -> second
    }
}
