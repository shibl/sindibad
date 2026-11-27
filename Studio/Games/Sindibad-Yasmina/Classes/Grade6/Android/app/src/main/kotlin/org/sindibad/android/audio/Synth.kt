package org.sindibad.android.audio

import org.sindibad.android.domain.quest.MusicTheory
import org.sindibad.android.domain.quest.Sound
import kotlin.math.*
import kotlin.random.Random

// The music island's instruments as generated samples (no sound files): the web's synth (core/tunes/synth.ts)
// rebuilt as pure Kotlin, so every timbre can be tested on the JVM. A piano, water glasses, the drum circle
// (dum, tak, claps, the riq, a woodblock tick), five folk instruments, a choir and the short tunes the lessons
// play (a Longa, a fugue's entries). MusicEngine mixes and plays them with AudioTrack.

/** One sound to start `at` seconds after the score begins. */
class Hit(val at: Double, val samples: FloatArray)
/** A visual cue at `at` seconds: a key or glass to light, a beat to flash (games stay playable when muted). */
data class Cue(val at: Double, val label: String)
/** Sounds to play together, their cues, and how long they last. */
class Score(val hits: List<Hit>, val cues: List<Cue>, val seconds: Double) {
    operator fun plus(other: Score) = Score(hits + other.hits, cues + other.cues, max(seconds, other.seconds))
    fun shifted(by: Double) = Score(hits.map { Hit(it.at + by, it.samples) }, cues.map { it.copy(at = it.at + by) }, seconds + by)

    /** Mixes the whole score into one buffer (tests, and short phrases). */
    fun mix(rate: Int = Synth.RATE): FloatArray {
        val length = hits.maxOfOrNull { (it.at * rate).toInt() + it.samples.size } ?: 0
        val out = FloatArray(length)
        for (h in hits) { val start = (h.at * rate).toInt(); for (i in h.samples.indices) out[start + i] += h.samples[i] }
        for (i in out.indices) out[i] = Synth.limit(out[i])
        return out
    }
    companion object { val EMPTY = Score(emptyList(), emptyList(), 0.0) }
}

object Synth {
    const val RATE = 22050

    /** A soft limiter: transparent below 0.7, never beyond ±1. */
    fun limit(x: Float): Float {
        if (x.isNaN()) return 0f
        val a = abs(x)
        return if (a < .7f) x else sign(x) * (.7f + .3f * tanh((a - .7f) / .3f))
    }

    private enum class Wave { Sine, Triangle, Square, Saw }
    private fun wave(w: Wave, phase: Double): Double {
        val p = phase - floor(phase)
        return when (w) {
            Wave.Sine -> sin(2 * PI * p)
            Wave.Triangle -> 4 * abs(p - .5) - 1
            Wave.Square -> if (p < .5) 1.0 else -1.0
            Wave.Saw -> 2 * p - 1
        }
    }

    /** Web Audio's exponential ramps: from 0.0001 up to `peak` over `attack`, then down to 0.0001 over `decay`. */
    private fun env(t: Double, attack: Double, peak: Double, decay: Double): Double = when {
        t < 0 -> 0.0
        t < attack -> 1e-4 * (peak / 1e-4).pow(t / attack)
        t < attack + decay -> peak * (1e-4 / peak).pow((t - attack) / decay)
        else -> 0.0
    }

    /** RBJ biquad (band-pass, low-pass or high-pass), in place. */
    private fun filter(x: FloatArray, type: String, f0: Double, q: Double = 1.0): FloatArray {
        val w = 2 * PI * min(f0, RATE * .45) / RATE
        val alpha = sin(w) / (2 * q)
        val c = cos(w)
        val (b0, b1, b2) = when (type) {
            "lowpass" -> Triple((1 - c) / 2, 1 - c, (1 - c) / 2)
            "highpass" -> Triple((1 + c) / 2, -(1 + c), (1 + c) / 2)
            else -> Triple(alpha, 0.0, -alpha)
        }
        val a0 = 1 + alpha; val a1 = -2 * c; val a2 = 1 - alpha
        var x1 = 0.0; var x2 = 0.0; var y1 = 0.0; var y2 = 0.0
        for (i in x.indices) {
            val y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
            x2 = x1; x1 = x[i].toDouble(); y2 = y1; y1 = y
            x[i] = y.toFloat()
        }
        return x
    }

    private fun noise(seconds: Double, seed: Int): FloatArray {
        val r = Random(seed)
        return FloatArray(max(1, (seconds * RATE).toInt())) { r.nextFloat() * 2 - 1 }
    }
    private fun buffer(seconds: Double) = FloatArray(max(1, (seconds * RATE).toInt()))
    private fun addInto(out: FloatArray, add: FloatArray, at: Int = 0) { for (i in add.indices) if (at + i < out.size) out[at + i] += add[i] }

    // ---------- Instruments ----------

    /** A bright, bell-ish piano: a few partials that fade, higher ones faster, and the hammer's tiny knock. */
    fun piano(f: Double, dur: Double = 1.4, vol: Double = .32): FloatArray {
        val out = buffer(dur + .1)
        for ((k, amp, len) in listOf(Triple(1.0, 1.0, 1.0), Triple(2.0, .42, .7), Triple(3.0, .18, .45), Triple(4.02, .08, .3))) {
            if (f * k > RATE / 2) continue
            val w = if (k == 1.0) Wave.Triangle else Wave.Sine
            val stop = min(out.size, ((dur * len + .1) * RATE).toInt())
            for (i in 0 until stop) { val t = i.toDouble() / RATE; out[i] += (wave(w, f * k * t) * env(t, .006, vol * amp, dur * len)).toFloat() }
        }
        val knock = filter(noise(.03, f.toInt()), "bandpass", min(6000.0, f * 4))
        for (i in knock.indices) out[i] += knock[i] * (vol * .25).toFloat()
        return out
    }
    fun piano(note: String, dur: Double = 1.4, vol: Double = .32) = piano(MusicTheory.freq(note), dur, vol)

    /** A struck glass: a pure tone with a long ring and a faint inharmonic shimmer. */
    fun glass(f: Double, vol: Double = .3): FloatArray {
        val out = buffer(2.3)
        for ((k, amp, len) in listOf(Triple(1.0, 1.0, 2.2), Triple(2.76, .18, .7), Triple(5.4, .06, .3))) {
            if (f * k > RATE / 2) continue
            val stop = min(out.size, ((len + .1) * RATE).toInt())
            for (i in 0 until stop) { val t = i.toDouble() / RATE; out[i] += (sin(2 * PI * f * k * t) * env(t, .003, vol * amp, len)).toFloat() }
        }
        return out
    }

    /** The drum circle. */
    fun drum(kind: String, vol: Double = 1.0): FloatArray = when (kind) {
        "dum" -> {
            val out = buffer(.4)
            var phase = 0.0
            for (i in out.indices) {
                val t = i.toDouble() / RATE
                val f = if (t < .25) 120 * (52.0 / 120).pow(t / .25) else 52.0
                phase += f / RATE
                out[i] = (sin(2 * PI * phase) * env(t, .004, .75 * vol, .32)).toFloat()
            }
            out
        }
        "tak", "clap", "riq" -> {
            val dur = if (kind == "riq") .22 else if (kind == "clap") .12 else .07
            val n = filter(noise(dur, kind.hashCode()), if (kind == "riq") "highpass" else "bandpass",
                if (kind == "riq") 6500.0 else if (kind == "clap") 1400.0 else 2600.0)
            val out = buffer(max(dur, .08))
            for (i in n.indices) out[i] += (n[i] * env(i.toDouble() / RATE, .002, (if (kind == "riq") .35 else .55) * vol, dur)).toFloat()
            if (kind == "tak") for (i in out.indices) { val t = i.toDouble() / RATE; out[i] += (wave(Wave.Triangle, 820 * t) * env(t, .002, .18 * vol, .06)).toFloat() }
            out
        }
        "tick", "tock" -> {
            val f = if (kind == "tick") 1650.0 else 1100.0
            val out = FloatArray((.06 * RATE).toInt()) { i -> wave(Wave.Square, f * i / RATE).toFloat() }
            filter(out, "bandpass", f, 4.0)
            for (i in out.indices) out[i] = (out[i] * env(i.toDouble() / RATE, .001, .32 * vol, .05) * 3).toFloat()
            out
        }
        else -> buffer(.01)
    }

    /** One held note of a folk instrument (web: synth.ts voice). */
    private fun voice(w: Wave, f: Double, dur: Double, vol: Double, filterHz: Double? = null, q: Double = 1.0,
                      vibrato: Double = 0.0, breath: Double = 0.0, attack: Double = .04, seed: Int = 0): FloatArray {
        val out = buffer(dur + .1)
        var phase = 0.0
        for (i in out.indices) {
            val t = i.toDouble() / RATE
            phase += f * (1 + vibrato * sin(2 * PI * 5.5 * t)) / RATE
            out[i] = wave(w, phase).toFloat()
        }
        filter(out, "bandpass", filterHz ?: (f * 2), q)
        // Band-pass loses level; a fixed make-up gain keeps the timbres near the web's loudness.
        val gain = 1.0 + 1.0 / q
        val hold = max(attack, dur - .06)
        for (i in out.indices) {
            val t = i.toDouble() / RATE
            val g = when {
                t < attack -> 1e-4 * (vol / 1e-4).pow(t / attack)
                t < hold -> vol
                t < dur -> vol * (1e-4 / vol).pow((t - hold) / (dur - hold))
                else -> 0.0
            }
            out[i] = (out[i] * g * gain).toFloat()
        }
        if (breath > 0) {
            val n = filter(noise(dur, seed), "bandpass", f * 2, 2.0)
            for (i in n.indices) out[i] += (n[i] * vol * breath).toFloat()
        }
        return out
    }

    private val MOTIFS = mapOf(
        "balalaika" to listOf("E4" to .5, "E4" to .5, "G4" to .5, "A4" to .5, "B4" to 1.0, "A4" to .5, "G4" to .5, "E4" to 1.0),
        "panflute" to listOf("G4" to 1.0, "A4" to .5, "B4" to .5, "D5" to 1.5, "B4" to .5, "A4" to 1.0, "G4" to 1.5),
        "mizmar" to listOf("D4" to .5, "Eb4" to .5, "F#4" to 1.0, "G4" to .5, "F#4" to .5, "Eb4" to .5, "D4" to 1.5),
        "harmonica" to listOf("C4" to 1.0, "E4" to .5, "G4" to .5, "E4" to 1.0, "C4" to 1.0, "G3" to 1.5),
        "bagpipe" to listOf("A4" to 1.0, "B4" to .5, "C#5" to .5, "E5" to 1.0, "C#5" to .5, "B4" to .5, "A4" to 1.5),
    )

    /** A short phrase on a folk instrument from around the world. */
    fun instrument(id: String): Score {
        val spb = .32
        val hits = mutableListOf<Hit>(); val cues = mutableListOf<Cue>()
        var b = 0.0
        if (id == "bagpipe") hits += Hit(0.0, voice(Wave.Saw, MusicTheory.freq("A3"), 3.2, .09, 600.0, .8, attack = .15))
        for ((n, len) in MOTIFS[id].orEmpty()) {
            val t = b * spb; val f = MusicTheory.freq(n); val d = len * spb
            cues += Cue(t, n)
            hits += when (id) {
                "balalaika" -> {
                    // a fast tremolo strum: many quick plucks on each note
                    val out = buffer(d + .2)
                    for (k in 0 until max(1, (d / .07).roundToInt())) {
                        val pluck = FloatArray((.2 * RATE).toInt()) { i -> (wave(Wave.Saw, f * i / RATE) * env(i.toDouble() / RATE, .003, .09, .16)).toFloat() }
                        addInto(out, filter(pluck, "lowpass", f * 5), (k * .07 * RATE).toInt())
                    }
                    listOf(Hit(t, out))
                }
                "panflute" -> listOf(Hit(t, voice(Wave.Sine, f, d, .22, f, .5, .006, .6, .06, seed = hits.size)))
                "mizmar" -> listOf(Hit(t, voice(Wave.Saw, f, d, .18, 1500.0, 2.5, .01, attack = .02)))
                "harmonica" -> listOf(Hit(t, voice(Wave.Square, f, d, .09, 1200.0, 1.2, .008)), Hit(t, voice(Wave.Square, f * 1.26, d, .05, 1400.0, 1.2)))
                "bagpipe" -> listOf(Hit(t, voice(Wave.Saw, f, d, .12, 1800.0, 3.0, attack = .01)))
                else -> emptyList()
            }
            b += len
        }
        return Score(hits, cues, b * spb + .3)
    }

    /** A soft "aah" chord, for the choir. */
    fun choir(): Score = Score(listOf("C4", "E4", "G4", "C5").flatMap { n ->
        listOf(-.004, .004).map { det -> Hit(0.0, voice(Wave.Saw, MusicTheory.freq(n) * (1 + det), 2.2, .05, 800.0, 1.5, .004, attack = .3)) }
    }, listOf(Cue(0.0, "C4"), Cue(0.0, "E4"), Cue(0.0, "G4"), Cue(0.0, "C5")), 2.5)

    // ---------- Phrases, rhythms and the tunes the lessons play ----------

    /** Notes one after another, `step` seconds apart, on the piano (or another note player). */
    fun phrase(notes: List<String>, step: Double = .42, player: (String) -> FloatArray = { piano(it) }): Score =
        Score(notes.mapIndexed { i, n -> Hit(i * step, player(n)) }, notes.mapIndexed { i, n -> Cue(i * step, n) }, notes.size * step + .6)

    /** A rhythm (q h w ee r) at `bpm`, after `count` count-in ticks; a cue per hit ("hit:<i>") and per tick. */
    fun rhythm(pattern: String, bpm: Int = 92, count: Int = 0): Score {
        val spb = 60.0 / bpm
        val hits = mutableListOf<Hit>(); val cues = mutableListOf<Cue>()
        repeat(count) { i -> hits += Hit(i * spb, drum(if (i == 0) "tick" else "tock")); cues += Cue(i * spb, "tick:$i") }
        val (onsets, beats) = MusicTheory.beatsOf(pattern)
        val t0 = count * spb
        onsets.forEachIndexed { i, h ->
            hits += Hit(t0 + h * spb, drum(if (h % 1.0 == 0.0 && h.toInt() % 2 == 0) "dum" else "tak"))
            cues += Cue(t0 + h * spb, "hit:$i")
        }
        return Score(hits, cues, t0 + beats * spb)
    }

    /** A metronome at a tempo, for `beats` beats; a cue per beat ("beat:<i>"). */
    fun metronome(bpm: Int, beats: Int = 8): Score {
        val spb = 60.0 / bpm
        val hits = (0 until beats).flatMap { i -> listOf(Hit(i * spb, drum(if (i % 4 != 0) "tock" else "tick")), Hit(i * spb, drum(if (i % 2 != 0) "tak" else "dum", .5))) }
        return Score(hits, (0 until beats).map { Cue(it * spb, "beat:$it") }, beats * spb)
    }

    /** A Longa-like run: fast, 2/4, in nahawand (the scale of many Longas). */
    fun longa(): Score {
        val notes = "D4 E4 F4 G4 A4 Bb4 C#5 D5 C#5 Bb4 A4 G4 A4 F4 E4 D4 A4 A4 Bb4 A4 G4 F4 E4 F4 G4 E4 D4 D4".split(' ')
        val step = 60.0 / 152 / 2
        val hits = notes.mapIndexed { i, n -> Hit(i * step, piano(n, .35, .22)) } +
            listOf(0, 4, 8, 12, 16, 20, 24).map { i -> Hit(i * step, drum(if (i % 8 != 0) "tak" else "dum", .6)) }
        return Score(hits, notes.mapIndexed { i, n -> Cue(i * step, n) }, notes.size * step + .4)
    }

    /** A fugue's first entries: the same melody, then again lower, together. */
    fun canon(): Score {
        val subject = listOf("G4" to 1.0, "C5" to 1.0, "B4" to .5, "A4" to .5, "G4" to 1.0, "F4" to .5, "E4" to .5, "D4" to 1.0, "C4" to 2.0)
        val spb = .36
        val hits = mutableListOf<Hit>(); val cues = mutableListOf<Cue>()
        for ((shift, at) in listOf(false to 0.0, true to 4 * spb)) {
            var b = 0.0
            for ((n, len) in subject) {
                hits += Hit(at + b * spb, piano(MusicTheory.freq(n) / if (shift) 2 else 1, len * spb * 2, if (shift) .24 else .26))
                cues += Cue(at + b * spb, n)
                b += len
            }
        }
        return Score(hits, cues.sortedBy { it.at }, (subject.sumOf { it.second } + 4) * spb + .5)
    }

    /** A glass of the water-glass instrument: C4 × d/n (less water → higher). */
    fun glassFreq(n: Int, d: Int) = MusicTheory.freq("C4") * d / n

    /** What a `play` / `listen` sound is (web: games.ts playSound). */
    fun sound(p: Sound, glassFreqOf: (String) -> Double): Score = when {
        p.notes != null -> phrase(p.notes, p.step ?: .42)
        p.tempo != null -> metronome(p.tempo, max(6, (p.tempo / 22.0).roundToInt()))
        p.longa -> longa()
        p.canon -> canon()
        p.inst != null -> instrument(p.inst)
        p.choir -> choir()
        p.solo -> phrase(listOf("E4", "F4", "G4", "A4", "G4", "F4", "G4", "E4", "D4", "E4", "C4"), .22)
        p.glasses != null -> Score(p.glasses.mapIndexed { i, g -> Hit(i * .9, glass(glassFreqOf(g))) },
            p.glasses.mapIndexed { i, g -> Cue(i * .9, g) }, p.glasses.size * .9 + 1)
        p.rhythm != null -> rhythm(p.rhythm, p.bpm ?: 92)
        else -> Score.EMPTY
    }
}
