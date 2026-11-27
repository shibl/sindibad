package org.sindibad.android.domain.quest

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// The English island's own step kinds (web: core/english/games.ts; worlds/grade6/english.ts lists them), as
// imported by tools/import-quests.mjs. English text is plain; Arabic text may hold English in Unicode isolates
// (U+2066 … U+2069, see Bidi). Their rules are in EnglishGames.

/** A word of the book: its picture is an emoji, `art:<name>` or `p:<person spec>` (ui/english/EnglishArt). */
@Serializable data class Word(val en: String, val ar: String, val pic: String, val ex: String)
@Serializable data class RuleRow(val en: String, val ar: String)
/** The book's grammar box: its table (first row: the heads) and its example sentences. */
@Serializable data class Rule(val table: List<List<String>>? = null, val rows: List<RuleRow>)
/** A reading: `text` with [glossary words], and each word's Arabic. */
@Serializable data class Reading(val title: String? = null, val text: String, val gloss: Map<String, String>)

@Serializable data class PicItem(val en: String, val pic: String)
@Serializable data class BuildItem(val en: String, val tiles: List<String>? = null, val ar: String? = null) {
    /** The tiles, left to right (they join with spaces into [en]). */
    val parts get() = tiles ?: en.split(' ')
}
@Serializable data class SpellItem(val en: String, val pic: String? = null, val show: String? = null, val ar: String? = null)
/** A sentence with ___ (and *clue*), the base form shown in the gap, the right form and the wrong ones. */
@Serializable data class VerbLine(val text: String, val base: String? = null, val right: String, val wrong: List<String>) {
    val options get() = listOf(right) + wrong
}
@Serializable data class MemoryPair(val a: String, val b: String)
@Serializable data class OddRow(val words: List<String>, val odd: String, val why: String)
@Serializable data class RankItem(val en: String, val pic: String? = null, val ar: String? = null)
@Serializable data class AdjItem(val before: String, val adjs: List<String>, val noun: String, val cats: List<String>? = null, val ar: String? = null)
@Serializable data class Speaker(val name: String, val face: String)
/** A line of a conversation: said (`text`), or the child's pick (`options[0]` is right). */
@Serializable data class ChatLine(val side: String, val text: String? = null, val options: List<String>? = null)

/** The English island's games. */
@Serializable sealed class EnglishGame : Step()

/** Hear (or read) a word, tap its picture. `ask` rounds (default 5), `opts` options each (default 4). */
@Serializable @SerialName("listen")
data class Listen(
    val q: String? = null, val items: List<PicItem>, val ask: Int? = null, val opts: Int? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** A word → its picture (`pic`, the default), or a picture → its word (`word`). */
@Serializable @SerialName("picture")
data class PictureGame(
    val q: String? = null, val items: List<PicItem>, val mode: String? = null, val ask: Int? = null, val opts: Int? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** Tap word tiles to build the book's sentence, left to right. */
@Serializable @SerialName("build")
data class Build(
    val q: String? = null, val items: List<BuildItem>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** Tap letters to spell a word; `extra` letters not in it (default 2). */
@Serializable @SerialName("spell")
data class Spell(
    val q: String? = null, val items: List<SpellItem>, val extra: Int? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** The right form in the gap. */
@Serializable @SerialName("verb")
data class Verb(
    val q: String? = null, val lines: List<VerbLine>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** Flip two cards at a time to pair them. */
@Serializable @SerialName("memory")
data class Memory(
    val q: String? = null, val pairs: List<MemoryPair>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** The odd one out, row by row. */
@Serializable @SerialName("odd")
data class Odd(
    val q: String? = null, val rows: List<OddRow>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** Tap in order (the planets by distance); `ends` name the first and the last. */
@Serializable @SerialName("rank")
data class Rank(
    val q: String? = null, val items: List<RankItem>, val ends: List<String>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** Adjectives in the book's order: opinion, size, shape, age, colour. */
@Serializable @SerialName("adjorder")
data class AdjOrder(
    val q: String? = null, val items: List<AdjItem>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()

/** A conversation from the book: the child picks the right line. */
@Serializable @SerialName("chat")
data class Chat(
    val q: String? = null, val who: Map<String, Speaker>, val lines: List<ChatLine>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : EnglishGame()
