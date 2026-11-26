package org.sindibad.android.ui

import android.speech.tts.TextToSpeech
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.material3.MaterialTheme
import java.util.Locale

@Composable
internal fun SpokenPrompt(text: String, sound: Boolean) {
    val context = LocalContext.current.applicationContext
    var speech by remember { mutableStateOf<TextToSpeech?>(null) }
    var showText by rememberSaveable(text) { mutableStateOf(false) }
    DisposableEffect(context, sound) {
        var engine: TextToSpeech? = null
        var active = true
        if (sound) engine = TextToSpeech(context) { status ->
            val reader = engine
            if (active && status == TextToSpeech.SUCCESS && reader != null) {
                val voice = reader.voices.orEmpty().firstOrNull { it.locale.language == Locale.ENGLISH.language && !it.isNetworkConnectionRequired }
                if (voice != null && reader.setVoice(voice) == TextToSpeech.SUCCESS) speech = reader
            }
        }
        onDispose { active = false; speech = null; engine?.stop(); engine?.shutdown() }
    }
    if (speech != null) {
        TextButton(onClick = { speech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lesson") }) { Text("استمع") }
        TextButton(onClick = { showText = !showText }) { Text("النصّ") }
    }
    if (speech == null || showText) Text(text, style = MaterialTheme.typography.bodyLarge.copy(textDirection = TextDirection.Ltr))
}
