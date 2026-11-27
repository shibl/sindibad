package org.sindibad.android.domain.quest

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The native quest framework, shared by every island (music first; science, atlas, English and art next).
// An island's quests come from resources/islands/<region>-quests.json (tools/import-quests.mjs), one step
// list per quest, as on the web (core/learn/steps.ts, core/learn/explore.ts and the island's own games).
// Text keeps the web wording verbatim; **…** marks bold.

/** How a step's parts count. See tools/import-quests.mjs. */
@Serializable enum class Scoring {
    /** Any miss costs the step: ok 0 or 1 of 1. */
    @SerialName("whole") Whole,
    /** ok = the share of parts right on the first try, of 1. */
    @SerialName("share") Share,
    /** Every part counts 1: ok = parts right on the first try, total = parts. */
    @SerialName("parts") Parts,
}

/** A sound a spot plays or a question lets the child hear (web: core/tunes/games.ts playSound). */
@Serializable data class Sound(
    val notes: List<String>? = null, val step: Double? = null, val tempo: Int? = null,
    val longa: Boolean = false, val canon: Boolean = false, val inst: String? = null,
    val choir: Boolean = false, val solo: Boolean = false, val glasses: List<String>? = null,
    val rhythm: String? = null, val bpm: Int? = null,
)

/** A «أتعلّم» spot: one small idea to discover (and what it plays). */
@Serializable data class Spot(
    val id: String, val title: String, val text: String, val label: String? = null, val icon: String? = null,
    val art: String? = null, val say: String? = null,
    val light: List<String>? = null, val pair: List<String>? = null, val note: String? = null, val glass: Boolean = false,
    val hold: String? = null, val bpm: Int? = null, val min: Int? = null, val max: Int? = null, val rhythm: String? = null,
    val play: Sound? = null,
) { val name get() = label ?: title }

@Serializable data class Keyboard(val from: String? = null, val to: String? = null, val labels: String? = null, val gaps: Boolean = false)
@Serializable data class Person(val name: String, val role: String, val icon: String)
@Serializable data class Bin(val id: String, val label: String, val icon: String? = null)
@Serializable data class SortItem(val text: String, val bin: String, val icon: String? = null)
@Serializable data class Drop(val note: String, val name: String)
@Serializable data class TwoWayLine(val text: String, val right: String, val wrong: String)
@Serializable data class MatchPair(val left: String, val right: String)
@Serializable data class TrueFalse(val text: String, val truth: Boolean, val fix: String? = null)
@Serializable data class Ask(val id: String, val name: String)
/** A timeline event (the atlas): `year` < 0 is BC; `label` is the date as written. */
@Serializable data class TimeEvent(val id: String, val year: Int, val label: String)

/** One step of a quest. The JSON `kind` names it. */
@Serializable
sealed class Step {
    abstract val say: String?
    abstract val hint: String?
    abstract val explain: String?
    abstract val scoring: Scoring?
    /** «أتعلّم» and short cards teach; they are never scored. */
    open val teaches: Boolean get() = false
}

@Serializable @SerialName("explore")
data class Explore(
    val title: String, val spots: List<Spot>, val tap: String? = null, val view: String? = null, val guided: Boolean = false,
    /** The atlas: the map's area (view `map`) and the timeline's events (view `timeline`). */
    val area: String? = null, val events: List<TimeEvent>? = null,
    val cols: Int? = null, val theme: String? = null, val done: String? = null, val sum: String? = null,
    val kb: Keyboard? = null, val person: Person? = null, val art: String? = null,
    /** The English island: the unit's words (view `words` or `planets`), the book's grammar box (`rule`), a reading (`read`). */
    val words: List<Word>? = null, val rule: Rule? = null, val read: Reading? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step() { override val teaches get() = true }

@Serializable @SerialName("learn")
data class Learn(
    val title: String, val html: String, val show: String? = null, val play: Sound? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step() { override val teaches get() = true }

/** options[0] is right (shown shuffled). */
@Serializable @SerialName("choice")
data class Choice(
    val q: String, val options: List<String>, val art: List<String>? = null, val layout: String? = null,
    val listen: Sound? = null, val show: String? = null, val pic: String? = null,
    /** The atlas: a `map` picture's area and the places marked on it. */
    val area: String? = null, val mark: List<String>? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

@Serializable @SerialName("twoway")
data class TwoWay(
    val q: String, val lines: List<TwoWayLine>, val pic: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

@Serializable @SerialName("sort")
data class Sort(
    val q: String, val bins: List<Bin>, val items: List<SortItem>, val pic: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** `items` are in the right order (shown shuffled). */
@Serializable @SerialName("order")
data class Order(
    val q: String, val items: List<String>, val show: String? = null, val latin: Boolean = false, val fracs: Boolean = false,
    val sound: List<String>? = null, val icons: List<String>? = null, val pic: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

@Serializable @SerialName("match")
data class Match(
    val q: String, val pairs: List<MatchPair>, val pic: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

@Serializable @SerialName("tf")
data class TrueOrFalse(
    val q: String, val items: List<TrueFalse>, val pic: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

@Serializable @SerialName("number")
data class NumberStep(
    val q: String, val answer: String, val unit: String? = null, val pic: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Tap the named parts of a picture. The picture comes from the island (ui/quest/QuestViews: `labelViews`). */
@Serializable @SerialName("label")
data class LabelStep(
    val q: String, val view: String, val ask: List<Ask>, val area: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

// ---------- The music island's own games (web: core/tunes/games.ts) ----------

/** Play these notes on the piano, in order. */
@Serializable @SerialName("keys")
data class Keys(
    val q: String, val play: List<String>, val labels: String? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Tap the two places on the piano with no black key between. */
@Serializable @SerialName("gaps")
data class Gaps(
    val q: String,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Mark each step of the C major scale: whole tone or half tone. */
@Serializable @SerialName("pattern")
data class Pattern(
    val q: String,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Rain drops: put each named note on the grand staff. */
@Serializable @SerialName("staff")
data class StaffStep(
    val q: String, val drops: List<Drop>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** A note on the staff: which is it? options[0] is right. */
@Serializable @SerialName("name")
data class NameNote(
    val q: String, val note: String, val options: List<String>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Hear a rhythm, pick its card: `pattern` is right. */
@Serializable @SerialName("rhythm")
data class RhythmStep(
    val q: String, val pattern: String, val others: List<String>, val bpm: Int? = null,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Hear a rhythm, then tap it on the drum. */
@Serializable @SerialName("drum")
data class Drum(
    val q: String, val pattern: String, val bpm: Int,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Fill a measure of `beats` beats with note values; `given` are already in it. */
@Serializable @SerialName("measure")
data class Measure(
    val q: String, val beats: Int, val given: List<String>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Fill a glass to n/d. */
@Serializable @SerialName("fill")
data class Fill(
    val q: String, val glass: String, val n: Int, val d: Int,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

/** Play these glasses in order (glass ids). */
@Serializable @SerialName("glasses")
data class GlassesStep(
    val q: String, val play: List<String>,
    override val say: String? = null, override val hint: String? = null, override val explain: String? = null, override val scoring: Scoring? = null,
) : Step()

@Serializable data class Quest(
    val id: String, val topic: String,
    /** The English book's unit ("1"…"20") or revision ("R1"…"R4"). */
    val unit: String? = null,
    val station: String = "", val icon: String = "", val sticker: String? = null,
    val title: String, val goal: String, val book: List<String> = emptyList(), val learned: List<String> = emptyList(),
    val steps: List<Step>,
)
@Serializable data class Helper(val name: String, val hello: String, val back: String, val free: String? = null)
/** A place on the island; `unit` is the book's unit it belongs to (science: one district per unit). */
@Serializable data class Station(val id: String, val name: String, val icon: String, val unit: Int? = null)
@Serializable data class BookUnit(val n: Int, val name: String, val color: String)
/** A sticker a quest gives on its first finish, with its short fact (web: core/stickers.ts). */
@Serializable data class Sticker(val id: String, val icon: String, val name: String, val fact: String)
/**
 * A part of an island picture (web: data-spot): its touch box [x, y, w, h] and where its name shows once found
 * [x, y], in the picture's 320 × 200 units; or a `pill` button under the picture (the ramp's three set-ups).
 */
@Serializable data class PicturePart(val id: String, val hit: List<Double>? = null, val label: List<Double>? = null, val pill: String? = null)
@Serializable data class PictureParts(val name: String, val spots: List<PicturePart>)
@Serializable data class Glass(val id: String, val n: Int, val d: Int, val color: String)

/** One island's quests, its places and its helper. */
@Serializable data class QuestBook(
    val helper: Helper, val stations: List<Station> = emptyList(), val quests: List<Quest>,
    val skySong: List<String> = emptyList(), val glasses: List<Glass> = emptyList(), val instruments: Map<String, String> = emptyMap(),
    val units: List<BookUnit> = emptyList(),
    /** The English book's four parts (units 1–5 … 16–20). */
    val blocks: List<BookUnit> = emptyList(),
    val stickers: List<Sticker> = emptyList(), val views: List<PictureParts> = emptyList(),
) {
    fun quest(id: String) = quests.first { it.id == id }
    fun sticker(id: String?) = stickers.firstOrNull { it.id == id }
    fun view(name: String?) = views.firstOrNull { it.name == name }
    fun questsAt(station: String) = quests.filter { it.station == station }

    companion object {
        /** Strict: an unknown step kind or field fails loudly (a test then names it). */
        val json = Json { classDiscriminator = "kind" }
        fun decode(text: String): QuestBook = json.decodeFromString(serializer(), text)
    }
}
