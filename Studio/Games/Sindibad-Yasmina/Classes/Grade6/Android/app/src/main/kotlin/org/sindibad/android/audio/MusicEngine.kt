package org.sindibad.android.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Process
import android.util.LruCache
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlin.math.roundToLong

/**
 * A small real-time mixer over one streaming AudioTrack: every sound (a piano key, a glass, a drum hit, a whole
 * tune) is a [Score] of generated samples, mixed as it plays so notes overlap like a real instrument.
 *
 * - Audio focus: asked for (may duck others) when a sound starts, given back once the engine has been quiet;
 *   on a loss everything stops, on "duck" the engine plays at a third of its volume.
 * - Muted (the profile's sound preference off): [play] does nothing; games show the same cues visually.
 * - Lifecycle: [release] stops the thread, frees the AudioTrack and gives back focus. It is called when the screen
 *   stops or leaves; the next sound opens everything again.
 */
class MusicEngine(context: Context) {
    private val audio = context.applicationContext.getSystemService(AudioManager::class.java)
    private val lock = Object()
    private class Voice(val samples: FloatArray, var at: Long)
    private val voices = ArrayList<Voice>()
    private var track: AudioTrack? = null
    private var thread: Thread? = null
    @Volatile private var running = false
    @Volatile private var volume = 1f
    private var written = 0L
    private var focus: AudioFocusRequest? = null
    @Volatile var muted = false
        set(value) { field = value; if (value) stop() }

    private val pianoCache = LruCache<String, FloatArray>(48)
    /** One piano note, cached (the island piano is tapped often). */
    fun pianoNote(note: String) = pianoCache.get(note) ?: Synth.piano(note).also { pianoCache.put(note, it) }

    /** Plays a score now (or `delay` seconds from now). */
    fun play(score: Score, delay: Double = 0.0) {
        if (muted || score.hits.isEmpty()) return
        if (!ensureOpen()) return
        synchronized(lock) {
            val base = written + (delay * Synth.RATE).toLong()
            for (h in score.hits) voices += Voice(h.samples, base + (h.at * Synth.RATE).roundToLong())
            lock.notifyAll()
        }
    }
    fun playNote(note: String) = play(Score(listOf(Hit(0.0, pianoNote(note))), emptyList(), 1.4))
    fun playSamples(samples: FloatArray) = play(Score(listOf(Hit(0.0, samples)), emptyList(), samples.size.toDouble() / Synth.RATE))

    /** Silences everything now (a new step, leaving a quest). */
    fun stop() { synchronized(lock) { voices.clear() } }

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        when (change) {
            AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> { stop(); synchronized(lock) { focus = null } }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> volume = .3f
            AudioManager.AUDIOFOCUS_GAIN -> volume = 1f
        }
    }
    private val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()

    private fun ensureOpen(): Boolean = synchronized(lock) {
        if (focus == null) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attributes).setOnAudioFocusChangeListener(focusListener).setWillPauseWhenDucked(false).build()
            if (audio?.requestAudioFocus(request) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) return false
            focus = request
            volume = 1f
        }
        if (running) return true
        val min = AudioTrack.getMinBufferSize(Synth.RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val t = runCatching {
            AudioTrack.Builder().setAudioAttributes(attributes)
                .setAudioFormat(AudioFormat.Builder().setSampleRate(Synth.RATE).setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                .setBufferSizeInBytes(maxOf(min, CHUNK * 2 * 4)).setTransferMode(AudioTrack.MODE_STREAM)
                .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY).build()
        }.getOrNull() ?: return false
        if (t.state != AudioTrack.STATE_INITIALIZED) { t.release(); return false }
        track = t
        running = true
        thread = Thread({ loop(t) }, "sindibad-music").apply { start() }
        true
    }

    private fun loop(t: AudioTrack) {
        Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
        val mix = FloatArray(CHUNK)
        val pcm = ShortArray(CHUNK)
        var quiet = 0
        t.play()
        while (running) {
            synchronized(lock) {
                if (voices.isEmpty()) {
                    quiet += CHUNK
                    if (quiet > Synth.RATE * 2) {
                        // Two seconds of silence: pause, give focus back, and sleep until the next sound.
                        t.pause(); t.flush()
                        focus?.let { audio?.abandonAudioFocusRequest(it) }; focus = null
                        while (running && voices.isEmpty()) lock.wait()
                        if (!running) return
                        quiet = 0
                        t.play()
                    }
                } else quiet = 0
                java.util.Arrays.fill(mix, 0f)
                val it = voices.iterator()
                while (it.hasNext()) {
                    val v = it.next()
                    val offset = (v.at - written).toInt()
                    if (offset >= CHUNK) continue
                    val from = maxOf(0, -offset)
                    val to = minOf(v.samples.size, CHUNK - offset)
                    for (i in from until to) mix[i + offset] += v.samples[i]
                    if (to >= v.samples.size) it.remove()
                }
                written += CHUNK
            }
            val g = volume
            for (i in 0 until CHUNK) pcm[i] = (Synth.limit(mix[i] * g) * 32767f).toInt().toShort()
            if (t.write(pcm, 0, CHUNK) < 0) break
        }
    }

    /** Stops and frees everything; the engine opens again on the next sound. */
    fun release() {
        val (t, th) = synchronized(lock) {
            running = false
            voices.clear()
            lock.notifyAll()
            focus?.let { audio?.abandonAudioFocusRequest(it) }
            focus = null
            val pair = track to thread
            track = null; thread = null
            pair
        }
        th?.join(500)
        t?.let { runCatching { it.stop() }; it.release() }
    }

    private companion object { const val CHUNK = 512 }
}


/** The engine for one screen: muted with the profile's sound preference, released when the screen stops or leaves. */
@Composable
fun rememberMusicEngine(sound: Boolean): MusicEngine {
    val context = LocalContext.current
    val engine = remember { MusicEngine(context) }
    engine.muted = !sound
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, engine) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_STOP) engine.release() }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); engine.release() }
    }
    return engine
}
