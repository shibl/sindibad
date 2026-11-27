package org.sindibad.android.ui.english

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.sindibad.android.domain.english.Bidi
import org.sindibad.android.domain.english.VoicePick

// The English voice (web: core/voice.ts, core/english/games.ts sayEn): the phone's own text-to-speech, with a British
// or American voice that works offline (VoicePick). It is only made when the profile's sound is on, and it is shut
// down whenever the screen stops (and made again when it starts). Without a voice every lesson stays playable: the
// listening games show their word (EnglishGames.prompt), and no 🔊 button is shown.

class EnglishVoice internal constructor() {
    private var engine: TextToSpeech? = null
    /** True once an offline English voice is set: the 🔊 buttons show, the listening games speak. */
    var ready by mutableStateOf(false)
        private set

    internal fun open(context: Context) {
        if (engine != null) return
        var tts: TextToSpeech? = null
        tts = TextToSpeech(context.applicationContext) { status ->
            val t = tts
            if (status != TextToSpeech.SUCCESS || t == null || t !== engine) return@TextToSpeech
            val voice = runCatching { VoicePick.choose(t.voices.orEmpty().toList(), ::describe) }.getOrNull()
            if (voice != null && t.setVoice(voice) == TextToSpeech.SUCCESS) {
                // English is read a little slower, for learners (web: rate .82).
                t.setSpeechRate(.82f)
                ready = true
            }
        }
        engine = tts
    }

    internal fun close() {
        ready = false
        engine?.let { runCatching { it.stop(); it.shutdown() } }
        engine = null
    }

    /** Reads English aloud (marks and isolates removed); nothing when there is no voice. */
    fun say(text: String?, queue: Boolean = false) {
        val t = text?.let(Bidi::plain)?.replace(Regex("\\s+"), " ")?.trim().orEmpty()
        if (!ready || t.isEmpty()) return
        engine?.speak(t, if (queue) TextToSpeech.QUEUE_ADD else TextToSpeech.QUEUE_FLUSH, null, "en-${t.hashCode()}")
    }

    fun stop() { if (ready) engine?.stop() }

    private companion object {
        fun describe(v: Voice) = VoicePick.Voice(
            language = v.locale.language, country = v.locale.country, network = v.isNetworkConnectionRequired,
            installed = TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED !in v.features.orEmpty(),
        )
    }
}

/** The English voice for this screen: on while the screen is started and the sound preference is on. */
@Composable
fun rememberEnglishVoice(sound: Boolean): EnglishVoice {
    val context = LocalContext.current
    val voice = remember { EnglishVoice() }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, sound) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> if (sound) voice.open(context)
                Lifecycle.Event.ON_STOP -> voice.close()
                else -> {}
            }
        }
        if (sound && lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) voice.open(context)
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); voice.close() }
    }
    return voice
}
