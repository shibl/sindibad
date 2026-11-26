package org.sindibad.android.ui

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import kotlin.math.PI
import kotlin.math.pow
import kotlin.math.sin

/** Equal-tempered teaching keyboard. One short PCM voice per tap. */
@Composable
internal fun PracticeKeyboard(notes: List<String>, index: Int, sound: Boolean, advance: () -> Unit) {
    val voices = remember { mutableListOf<AudioTrack>() }
    DisposableEffect(sound) { onDispose { voices.forEach { it.release() }; voices.clear() } }
    val keys = notes.distinct().sortedBy(::midi)
    Column {
        Text(notes.joinToString(" · "))
        Text(notes.getOrNull(index) ?: "✓")
        keys.chunked(4).forEach { row ->
            Row { row.forEach { key ->
                TextButton(onClick = {
                    if (sound) {
                        voices.forEach { it.release() }; voices.clear()
                        val rate = 22050
                        val freq = 440 * 2.0.pow((midi(key) - 69) / 12.0)
                        val pcm = ShortArray(rate / 4) { i ->
                            (9000 * sin(2 * PI * freq * i / rate) * (1 - i.toDouble() / (rate / 4))).toInt().toShort()
                        }
                        @Suppress("DEPRECATION")
                        val track = AudioTrack(AudioManager.STREAM_MUSIC, rate, AudioFormat.CHANNEL_OUT_MONO,
                            AudioFormat.ENCODING_PCM_16BIT, pcm.size * 2, AudioTrack.MODE_STATIC)
                        voices += track
                        if (track.state != AudioTrack.STATE_UNINITIALIZED && track.write(pcm, 0, pcm.size) > 0) track.play()
                    }
                    if (key == notes.getOrNull(index)) advance()
                }) { Text(key) }
            } }
        }
    }
}

private fun midi(note: String): Int {
    val pitch = mapOf('C' to 0, 'D' to 2, 'E' to 4, 'F' to 5, 'G' to 7, 'A' to 9, 'B' to 11)
    return (note.last().digitToInt() + 1) * 12 + pitch.getValue(note.first()) + if ('#' in note) 1 else 0
}
