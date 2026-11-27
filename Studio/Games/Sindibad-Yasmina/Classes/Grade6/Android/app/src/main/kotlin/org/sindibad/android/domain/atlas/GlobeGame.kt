package org.sindibad.android.domain.atlas

import kotlinx.serialization.Serializable
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.quest.Line
import kotlin.random.Random

// The atlas globe's modes and its two games (web: core/atlas/globe.ts), pure and serializable so a round survives
// rotation and process death.
//
//   «🔎 أستكشف»     tap a country: it is chosen, the globe turns to it and its card opens (and it is visited).
//   «📍 أين تقع؟»   find the named country on the globe. A wrong tap names what was tapped; from the second miss
//                    the answer glows and the globe turns to it. Right: +1 ⭐ only when found on the first try.
//   «🚩 علم مَن هذا؟» whose flag is it, out of three names. A wrong name is disabled; right: +1 ⭐ only on the first
//                    try; the globe turns to the country and its card opens.
// Each round's country is drawn from the 22 Arab countries plus ten others with a full card (web: `pool`), so
// Arab countries come up most. Rounds never end on their own and nothing is timed: «التالي ◀» opens the next.
// The score is the session's only (the web does not save it); switching games starts it at 0.

@Serializable enum class GlobeMode { Explore, Find, Flag }

@Serializable data class GlobeState(
    val seed: Int,
    val mode: GlobeMode = GlobeMode.Explore,
    /** The chosen country (orange on the globe, its name pinned). */
    val selected: String? = null,
    /** The country whose card is open. */
    val card: String? = null,
    /** The country the globe turns to (bumped by [turn] so the same country can be faced again). */
    val face: String? = null,
    val turn: Int = 0,
    /** The round's answer while it is being played; null once won (then «التالي ◀»). */
    val round: String? = null,
    /** The last round's answer (kept after a win, for the flag and the names). */
    val answer: String? = null,
    val options: List<String> = emptyList(),
    val disabled: List<String> = emptyList(),
    val tries: Int = 0,
    val score: Int = 0,
    val rounds: Int = 0,
    /** The answer glows (find: from the second miss). */
    val mark: String? = null,
    val line: Line? = null,
    val wrongTick: Int = 0,
) {
    val playing get() = mode != GlobeMode.Explore && round != null
    val won get() = mode != GlobeMode.Explore && round == null && answer != null
}

object GlobeGame {
    const val OPEN = "هذه أرضنا! 🌍 اسحب لتديرها، واضغط على أيّ دولة لترى علمها وعاصمتها وعملتها ومعنى اسمها."
    const val GLOW = "انظر إلى ما يلمع ✨"

    private fun name(id: String) = AtlasWorld.country(id)?.ar.orEmpty()

    fun start(seed: Int) = GlobeState(seed, line = Line(OPEN, Mood.Cheer))

    /** The country of round `n` and, for the flag game, its three names (web newRound). */
    fun draw(seed: Int, n: Int, flag: Boolean): Pair<String, List<String>> {
        val rnd = Random(seed * 7919L + n)
        val others = AtlasWorld.full.filter { it !in AtlasWorld.arab }.shuffled(rnd).take(10)
        val id = (AtlasWorld.arab + others).shuffled(rnd).first()
        val opts = if (flag) (listOf(id) + AtlasWorld.full.filter { it != id }.shuffled(rnd).take(2)).shuffled(rnd) else emptyList()
        return id to opts
    }

    fun setMode(s: GlobeState, mode: GlobeMode): GlobeState = when {
        mode == GlobeMode.Explore -> s.copy(mode = mode, round = null, answer = null, options = emptyList(), disabled = emptyList(), mark = null, tries = 0)
        else -> newRound(s.copy(mode = mode, score = 0))
    }

    /** «التالي ◀» (and a game's first round). */
    fun newRound(s: GlobeState): GlobeState {
        if (s.mode == GlobeMode.Explore) return s
        val n = s.rounds + 1
        val (id, opts) = draw(s.seed, n, s.mode == GlobeMode.Flag)
        return s.copy(rounds = n, round = id, answer = id, options = opts, disabled = emptyList(), tries = 0, mark = null,
            card = null, selected = null, line = null)
    }

    /** A country tapped on the globe (or picked from the search). */
    fun choose(s: GlobeState, id: String): GlobeState {
        if (s.mode == GlobeMode.Find && s.round != null) {
            val want = s.round
            if (id == want) return win(s, id, "أحسنت! هذه **${name(id)}**. 📍")
            val tries = s.tries + 1
            return s.copy(tries = tries, wrongTick = s.wrongTick + 1,
                line = Line("هذه **${name(id)}**. ابحث عن **${name(want)}**!${if (tries > 1) " $GLOW" else ""}", Mood.Oops),
                mark = if (tries > 1) want else null,
                face = if (tries > 1) want else s.face, turn = if (tries > 1) s.turn + 1 else s.turn)
        }
        if (s.mode == GlobeMode.Flag) return s
        if (AtlasWorld.country(id) == null) return s
        return s.copy(selected = id, card = id, face = id, turn = s.turn + 1)
    }

    /** A name picked in «علم مَن هذا؟». */
    fun pickFlag(s: GlobeState, id: String): GlobeState {
        val want = s.round ?: return s
        if (s.mode != GlobeMode.Flag || id in s.disabled || id !in s.options) return s
        if (id == want) return win(s, id, "نعم! هذا علم **${name(id)}**. 🚩")
        return s.copy(tries = s.tries + 1, disabled = s.disabled + id, wrongTick = s.wrongTick + 1,
            line = Line("ليس علم ${name(id)}. انظر إلى الألوان والرموز جيداً!", Mood.Oops))
    }

    private fun win(s: GlobeState, id: String, say: String) = s.copy(
        score = s.score + if (s.tries == 0) 1 else 0, round = null, selected = id, card = id, face = id, turn = s.turn + 1, mark = null,
        line = Line(say, Mood.Cheer),
    )

    fun closeCard(s: GlobeState) = s.copy(card = null, selected = null)

    /** Countries whose Arabic name contains the query (the search). */
    fun search(query: String, limit: Int = 8): List<Country> {
        val q = query.trim()
        if (q.isEmpty()) return emptyList()
        return AtlasWorld.globe.countries.filter { q in it.ar }.sortedBy { !it.ar.startsWith(q) }.take(limit)
    }
}
