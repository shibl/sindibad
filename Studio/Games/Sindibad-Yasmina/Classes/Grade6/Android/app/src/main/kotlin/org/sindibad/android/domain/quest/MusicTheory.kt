package org.sindibad.android.domain.quest

import kotlin.math.abs
import kotlin.math.pow

/** Notes, rhythms and glasses of the music island (web: core/tunes/games.ts, core/tunes/synth.ts). Pure Kotlin. */
object MusicTheory {
    val WHITE = listOf('C', 'D', 'E', 'F', 'G', 'A', 'B')
    val SOLFEGE = mapOf('C' to "دو", 'D' to "ره", 'E' to "مي", 'F' to "فا", 'G' to "صول", 'A' to "لا", 'B' to "سي")
    private val SHARP_NAME = mapOf('C' to "دو♯", 'D' to "ره♯", 'F' to "فا♯", 'G' to "صول♯", 'A' to "لا♯")
    private val NOTE = Regex("^([A-G])([#b]?)(-?\\d)$")
    private val LETTER = mapOf('C' to -9, 'D' to -7, 'E' to -5, 'F' to -4, 'G' to -2, 'A' to 0, 'B' to 2)

    fun isNote(note: String) = NOTE.matches(note)

    /** 'C4' / 'F#4' / 'Bb3' → Hz (equal temperament, A4 = 440). */
    fun freq(note: String): Double {
        val m = requireNotNull(NOTE.matchEntire(note)) { "Not a note: $note" }
        val (letter, accidental, octave) = m.destructured
        val semi = LETTER.getValue(letter[0]) + when (accidental) { "#" -> 1; "b" -> -1; else -> 0 } + (octave.toInt() - 4) * 12
        return 440.0 * 2.0.pow(semi / 12.0)
    }

    /** The Arabic name of a piano key: دو، ره… and دو♯ for the black ones. */
    fun nameOf(note: String): String {
        val m = NOTE.matchEntire(note) ?: return note
        return if (m.groupValues[2] == "#") SHARP_NAME[note[0]] ?: note else SOLFEGE[note[0]] ?: note
    }

    /** The white keys from one to another, low to high ('C4'..'C5'). */
    fun whitesBetween(from: String, to: String): List<String> {
        val out = mutableListOf<String>()
        var octave = from.last().digitToInt()
        var i = WHITE.indexOf(from[0])
        while (true) {
            val n = "${WHITE[i]}$octave"
            out += n
            if (n == to || out.size > 30) break
            i += 1
            if (i == 7) { i = 0; octave += 1 }
        }
        return out
    }

    /** The black key right after a white one (none after E and B). */
    fun blackAfter(white: String): String? = if (white[0] in SHARP_NAME) "${white[0]}#${white.last()}" else null

    /** A note's place on the grand staff: steps from middle C (C4 = 0, D4 = 1, B3 = −1…). */
    fun staffStep(note: String): Int {
        val m = requireNotNull(NOTE.matchEntire(note)) { "Not a note: $note" }
        return WHITE.indexOf(m.groupValues[1][0]) + (m.groupValues[3].toInt() - 4) * 7
    }

    // ---------- Rhythm: q = سوداء (1), h = بيضاء (2), w = مستديرة (4), ee = two ذات السنّ (1), r = rest (1) ----------

    /** Note values the measure game offers, longest first: token, Arabic name, beats. */
    val VALUES = listOf(Triple("w", "مستديرة", 4), Triple("h", "بيضاء", 2), Triple("q", "سوداء", 1), Triple("ee", "ذاتا سنّ", 1))
    fun beatsOfToken(token: String) = VALUES.firstOrNull { it.first == token }?.third ?: 1
    fun tokens(pattern: String) = pattern.split(' ').filter { it.isNotEmpty() }

    /** Onset times (in beats) and length in beats of a rhythm. */
    fun beatsOf(pattern: String): Pair<List<Double>, Double> {
        val hits = mutableListOf<Double>()
        var b = 0.0
        for (tok in tokens(pattern)) when (tok) {
            "ee" -> { hits += b; hits += b + .5; b += 1 }
            "r" -> b += 1
            else -> { hits += b; b += if (tok == "h") 2 else if (tok == "w") 4 else 1 }
        }
        return hits to b
    }

    /**
     * The drum game's judge, exactly the web's (core/tunes/games.ts drum): the right number of taps, each within
     * 0.32 of a beat of where it belongs (0.45 once the lights guide), measured from the child's own first tap —
     * so starting late or slowly is never wrong. Times are the taps' own input timestamps, in milliseconds.
     */
    fun drumGood(tapsMs: List<Long>, pattern: String, bpm: Int, guide: Boolean): Boolean {
        val hits = beatsOf(pattern).first
        if (tapsMs.size != hits.size || hits.isEmpty()) return false
        val spb = 60.0 / bpm
        val tol = (if (guide) .45 else .32) * spb
        val t = tapsMs.map { (it - tapsMs[0]) / 1000.0 }
        val off = t[0] - hits[0] * spb
        return t.indices.all { k -> abs(t[k] - off - hits[k] * spb) <= tol }
    }

    /** The measure game: what is right to add next (the longest value that still fits). */
    fun bestFit(rest: Int): String? = VALUES.firstOrNull { it.third <= rest }?.first

    /** The C major scale's steps (pattern game): w = بُعد, h = نصف بُعد. */
    val SCALE_STEPS = listOf("w", "w", "h", "w", "w", "w", "h")
    /** The two places on C4…C5 with no black key between (gaps game): E–F and B–C. */
    val HALF_GAPS = setOf(2, 6)
}
