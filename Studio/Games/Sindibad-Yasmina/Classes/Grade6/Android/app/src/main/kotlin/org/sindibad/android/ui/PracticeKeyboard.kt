package org.sindibad.android.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import org.sindibad.android.audio.rememberMusicEngine
import org.sindibad.android.domain.quest.MusicTheory

/** Equal-tempered teaching keyboard, played by the island's piano voice (audio/MusicEngine). */
@Composable
internal fun PracticeKeyboard(notes: List<String>, index: Int, sound: Boolean, advance: () -> Unit) {
    val engine = rememberMusicEngine(sound)
    val keys = notes.distinct().filter(MusicTheory::isNote).sortedBy(MusicTheory::freq)
    Column {
        Text(notes.joinToString(" · "))
        Text(notes.getOrNull(index) ?: "✓")
        keys.chunked(4).forEach { row ->
            Row { row.forEach { key ->
                TextButton(onClick = {
                    engine.playNote(key)
                    if (key == notes.getOrNull(index)) advance()
                }) { Text(key) }
            } }
        }
    }
}
