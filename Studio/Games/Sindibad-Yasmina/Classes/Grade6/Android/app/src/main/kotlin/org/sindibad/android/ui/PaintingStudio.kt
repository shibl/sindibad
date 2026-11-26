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

private val colors = listOf(Color.White, Color.Black, Color.Red, Color.Blue, Color.Green, Color.Yellow, Color.Magenta, Color.Cyan)
private val names = listOf("أبيض", "أسود", "أحمر", "أزرق", "أخضر", "أصفر", "بنفسجي", "فيروزي")

@Composable
internal fun PaintingStudio(profile: Profile, save: (String, List<Int>) -> Unit) {
    var id by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    var pixels by rememberSaveable { mutableStateOf(IntArray(64)) }
    var paint by rememberSaveable { mutableIntStateOf(2) }
    PaperCard(Modifier.fillMaxWidth()) {
        Text("مرسمي", style = MaterialTheme.typography.titleLarge)
        Row { colors.forEachIndexed { index, color ->
            Box(Modifier.weight(1f).height(44.dp).padding(2.dp).background(color)
                .semantics { contentDescription = names[index] }.clickable { paint = index })
        } }
        Text("اللون: " + names[paint])
        repeat(8) { y -> Row {
            repeat(8) { x ->
                val index = y * 8 + x
                Box(Modifier.weight(1f).aspectRatio(1f).padding(1.dp).background(colors[pixels[index]])
                    .semantics { contentDescription = "${y+1}، ${x+1}، ${names[pixels[index]]}" }
                    .clickable { pixels = pixels.copyOf().also { it[index] = paint } })
            }
        } }
        Row {
            TextButton(onClick = { save(id, pixels.toList()) }) { Text("احفظ اللوحة") }
            TextButton(onClick = { id = UUID.randomUUID().toString(); pixels = IntArray(64) }) { Text("لوحة جديدة") }
        }
        profile.gallery.entries.forEachIndexed { i, (key, drawing) ->
            TextButton(onClick = { id = key; pixels = drawing.toIntArray() }) { Text("لوحتي ${i+1}") }
        }
    }
}
