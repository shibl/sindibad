package org.sindibad.android.domain.english

// English inside the Arabic, right-to-left game (web: <bdi class="en" dir="ltr" lang="en"> and core/english/games.ts
// isEnglish/fixDir). The imported text marks English inside Arabic with Unicode isolates: LRI (U+2066) … PDI
// (U+2069). They are invisible; the platform's bidi algorithm then keeps the English run left to right, with its
// punctuation in place, inside the right-to-left paragraph, and the paragraph's own direction comes from the
// Arabic around it. Pure Kotlin, so the rules are unit-tested.

object Bidi {
    const val LRI = '\u2066'
    const val RLI = '\u2067'
    const val FSI = '\u2068'
    const val PDI = '\u2069'
    private val ISOLATES = Regex("[\u2066-\u2069]")
    private val LATIN = Regex("[A-Za-z]")
    private val ARABIC = Regex("[؀-ۿ]")
    /** An English run (letters, then letters, digits, spaces and the punctuation English uses inside a sentence). */
    private val RUN = Regex("[A-Za-z][A-Za-z0-9'’,.!?;:()\\- ]*[A-Za-z0-9.!?)’']|[A-Za-z]")

    /** English to put inside an Arabic sentence. */
    fun en(text: String) = "$LRI$text$PDI"
    /** Arabic to put inside an English sentence. */
    fun ar(text: String) = "$RLI$text$PDI"

    /** The words only: no isolates, no **bold** or *clue* marks (what TalkBack and the voice read). */
    fun plain(text: String) = text.replace(ISOLATES, "").replace("**", "").replace("*", "")

    /** Mostly English (the web's isEnglish: Latin letters at least twice the Arabic ones): shown left to right. */
    fun isEnglish(text: String?): Boolean {
        val s = plain(text ?: return false)
        val latin = LATIN.findAll(s).count()
        return latin > 0 && latin >= ARABIC.findAll(s).count() * 2
    }

    /** True when every isolate opened in [text] is closed, in order (what the importer must produce). */
    fun balanced(text: String): Boolean {
        var depth = 0
        for (c in text) when (c) {
            LRI, RLI, FSI -> depth++
            PDI -> { depth--; if (depth < 0) return false }
        }
        return depth == 0
    }

    /**
     * An Arabic sentence built in the app with English in it: every English run not already isolated is wrapped in
     * LRI … PDI, so «أنت Omar.» keeps «Omar» left to right with the Arabic around it right to left.
     */
    fun mixed(text: String): String {
        if (!ARABIC.containsMatchIn(text)) return text
        val out = StringBuilder()
        var depth = 0
        var i = 0
        while (i < text.length) {
            val c = text[i]
            if (c in LRI..FSI) { depth++; out.append(c); i++; continue }
            if (c == PDI) { depth = (depth - 1).coerceAtLeast(0); out.append(c); i++; continue }
            if (depth == 0 && LATIN.matches(c.toString())) {
                val m = RUN.matchAt(text, i)
                val end = (m?.range?.last ?: i) + 1
                // Stop the run before an isolate begins inside it.
                val stop = (i until end).firstOrNull { text[it] in LRI..PDI } ?: end
                out.append(LRI).append(text, i, stop).append(PDI)
                i = stop
                continue
            }
            out.append(c); i++
        }
        return out.toString()
    }

    /** «English — عربي»: an English word with its Arabic meaning, each in its own direction. */
    fun gloss(english: String, arabic: String) = "${en(english)} — $arabic"
}
