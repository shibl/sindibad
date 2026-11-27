package org.sindibad.android.domain.quest

import kotlinx.serialization.Serializable
import org.sindibad.android.domain.Mood
import kotlin.random.Random

/** What the island's helper says now. */
@Serializable data class Line(val text: String, val mood: Mood)

/** One step's score: total graded parts (0 for «أتعلّم»), ok of them right on the first try. */
data class StepResult(val ok: Double, val total: Double)

/**
 * The state of the step being played. Immutable and serializable, so a step survives process death exactly
 * where the child left it (the quest run is kept in SavedStateHandle, like LessonSession).
 */
@Serializable data class StepState(
    val seed: Int,
    /** The part being played: the note of a melody, the item to sort, the drop to place… */
    val part: Int = 0,
    /** The web's tracker: the first miss says the hint, from the second the answer glows. */
    val misses: Int = 0,
    val stepMisses: Int = 0,
    /** Parts with at least one miss; parts right on the first try. */
    val missedParts: Int = 0,
    val okParts: Int = 0,
    val missedHere: Boolean = false,
    /** Spots discovered, gaps found, picture parts named. */
    val found: List<String> = emptyList(),
    /** Answers already tried for the current part (shown disabled). */
    val wrong: List<String> = emptyList(),
    /** Note values the child put in the measure. */
    val placed: List<String> = emptyList(),
    /** Digits typed on the keypad. */
    val typed: String = "",
    /** The «أتعلّم» spot whose card is open. */
    val open: String? = null,
    /** The drum lights guide each beat (after a second miss). */
    val guide: Boolean = false,
    /** A short line under the game (the drum's tap count, a false sentence's fix). */
    val note: String? = null,
    val line: Line? = null,
    val done: Boolean = false,
    /** Counts misses, so the UI can shake and sound each one once. */
    val wrongTick: Int = 0,
    /**
     * The answer glows: set by a miss from the second on (core/learn/steps.ts tracker), cleared when the part is
     * answered, as on the web where each new part starts unlit and the next miss lights it again.
     */
    val glow: Boolean = false,
) {
    val reveal get() = glow
}

/** The rules of every step kind: pure functions from (step, state, what the child did) to the next state. */
object StepMachine {
    const val GLOW = "انظر إلى ما يلمع ✨"

    fun start(step: Step, seed: Int) = StepState(seed, line = step.say?.let { Line(it, Mood.Happy) })

    /** A fixed shuffle for this step (stable across process death: it only depends on the run's seed). */
    fun permutation(state: StepState, n: Int, salt: Int = 0): List<Int> = (0 until n).shuffled(Random(state.seed * 31 + salt))

    fun parts(step: Step): Int = when (step) {
        is Explore -> step.spots.size
        is Learn, is Choice, is NameNote, is RhythmStep, is Drum, is Measure, is Fill, is NumberStep -> 1
        is TwoWay -> step.lines.size
        is Sort -> step.items.size
        is Order -> step.items.size
        is Match -> step.pairs.size
        is TrueOrFalse -> step.items.size
        is LabelStep -> step.ask.size
        is Keys -> step.play.size
        is GlassesStep -> step.play.size
        is Gaps -> MusicTheory.HALF_GAPS.size
        is Pattern -> MusicTheory.SCALE_STEPS.size
        is StaffStep -> step.drops.size
    }

    fun scoring(step: Step): Scoring = step.scoring ?: if (step is StaffStep) Scoring.Parts else Scoring.Whole

    /** The sort item being placed (items are shown shuffled). */
    fun sortItem(step: Sort, state: StepState): SortItem = step.items[permutation(state, step.items.size)[state.part.coerceAtMost(step.items.lastIndex)]]

    fun measureSum(step: Measure, state: StepState) = (step.given + state.placed).sumOf(MusicTheory::beatsOfToken)

    /** What is right to do now (null when done or for the drum). Glows from the second miss; scripts tests. */
    fun expected(step: Step, state: StepState): String? {
        if (state.done) return null
        return when (step) {
            is Explore -> {
                val next = step.spots.firstOrNull { it.id !in state.found }
                next?.id
            }
            is Learn -> "next"
            is Choice, is NameNote, is RhythmStep -> "0"
            is TwoWay -> "0"
            is Sort -> sortItem(step, state).bin
            is Order, is Match -> state.part.toString()
            is TrueOrFalse -> if (step.items[state.part].truth) "1" else "0"
            is NumberStep -> {
                val want = step.answer
                if (!want.startsWith(state.typed)) "⌫" else if (state.typed.length < want.length) want[state.typed.length].toString() else "✓"
            }
            is LabelStep -> step.ask[state.part].id
            is Keys -> step.play[state.part]
            is GlassesStep -> step.play[state.part]
            is Gaps -> MusicTheory.HALF_GAPS.first { it.toString() !in state.found }.toString()
            is Pattern -> MusicTheory.SCALE_STEPS[state.part]
            is StaffStep -> MusicTheory.staffStep(step.drops[state.part].note).toString()
            is Drum -> null
            is Measure -> MusicTheory.bestFit(step.beats - measureSum(step, state))
            is Fill -> step.n.toString()
        }
    }

    /** The child tapped something: an option, a key, a bin, a spot, a keypad key… (see [expected] for the values). */
    fun tap(step: Step, state: StepState, value: String): StepState {
        if (state.done) return state
        return when (step) {
            is Explore -> openSpot(step, state, value)
            is Learn -> state.copy(done = true)
            is NumberStep -> type(step, state, value)
            is Measure -> place(step, state, value)
            is Drum -> state
            is Gaps -> if (value in state.found) state else if (value == expected(step, state) || value.toIntOrNull() in MusicTheory.HALF_GAPS)
                right(step, state.copy(found = state.found + value)) else miss(step, state, value)
            // A wrong option is disabled once tried (choice-like steps); a wrong key or card may be tried again.
            else -> if (value == expected(step, state)) right(step, state)
                else if (value in state.wrong && disablesWrong(step)) state else miss(step, state, value)
        }
    }

    /** The measure game's «امسح»: the child's notes go, the given ones stay. No penalty. */
    fun undo(step: Step, state: StepState) = if (step is Measure && !state.done) state.copy(placed = emptyList()) else state

    /** The drum game: the child tapped `tapsMs` (input timestamps). */
    fun drum(step: Drum, state: StepState, tapsMs: List<Long>): StepState {
        if (state.done || tapsMs.isEmpty()) return state
        if (MusicTheory.drumGood(tapsMs, step.pattern, step.bpm, state.guide)) return finish(step, state.copy(okParts = if (state.stepMisses == 0) 1 else 0))
        val hits = MusicTheory.beatsOf(step.pattern).first.size
        val misses = state.misses + 1
        return state.copy(
            misses = misses, stepMisses = state.stepMisses + 1, missedParts = 1, missedHere = true, wrongTick = state.wrongTick + 1,
            note = if (tapsMs.size == hits) "قريب جداً! انتبه للضربتين السريعتين." else "ضربت ${tapsMs.size} مرات، والإيقاع $hits ضربات.",
            guide = misses >= 2,
            line = if (misses == 1) Line(step.hint.orEmpty(), Mood.Oops) else Line("سأضيء لك كل ضربة وأنت تعزف. اضرب مع الأضواء! ✨", Mood.Think),
        )
    }

    fun result(step: Step, state: StepState): StepResult {
        if (step.teaches) return StepResult(0.0, 0.0)
        val n = parts(step)
        return when (scoring(step)) {
            Scoring.Whole -> StepResult(if (state.stepMisses == 0) 1.0 else 0.0, 1.0)
            Scoring.Share -> StepResult(
                if (step is Order) (1.0 - state.stepMisses.toDouble() / n).coerceAtLeast(0.0) else (n - state.missedParts).toDouble() / n, 1.0)
            Scoring.Parts -> StepResult(state.okParts.toDouble(), n.toDouble())
        }
    }

    private fun disablesWrong(step: Step) = step is Choice || step is NameNote || step is RhythmStep || step is TwoWay || step is TrueOrFalse

    private fun resetsPerPart(step: Step) = step is StaffStep || (step is Sort && scoring(step) == Scoring.Parts)

    private fun openSpot(step: Explore, state: StepState, id: String): StepState {
        val spot = step.spots.firstOrNull { it.id == id } ?: return state
        if (id in state.found) return state.copy(open = id)
        // Guided: only the glowing spot opens; another tap points at it.
        if (step.guided && id != expected(step, state)) return state
        val found = state.found + id
        val all = found.size == step.spots.size
        return state.copy(found = found, open = id, part = found.size, done = all,
            line = if (all) step.done?.let { Line(it, Mood.Cheer) } ?: state.line else spot.say?.let { Line(it, Mood.Happy) } ?: state.line)
    }

    private fun type(step: NumberStep, state: StepState, key: String): StepState = when (key) {
        "⌫" -> state.copy(typed = state.typed.dropLast(1))
        "✓" -> when {
            state.typed.isEmpty() -> state
            state.typed == step.answer -> right(step, state)
            else -> miss(step, state, "").copy(typed = "")
        }
        else -> if (key.length == 1 && key[0].isDigit() && state.typed.length < 7) state.copy(typed = state.typed + key) else state
    }

    private fun place(step: Measure, state: StepState, token: String): StepState {
        if (MusicTheory.VALUES.none { it.first == token }) return state
        val sum = measureSum(step, state)
        if (sum + MusicTheory.beatsOfToken(token) > step.beats) {
            val misses = state.misses + 1
            return state.copy(misses = misses, stepMisses = state.stepMisses + 1, missedParts = 1, missedHere = true, wrongTick = state.wrongTick + 1, glow = misses >= 2,
                line = if (misses == 1) Line("${step.hint.orEmpty()} هذه النوتة أطول مما بقي!", Mood.Oops) else Line("${step.hint.orEmpty()} **جرّب ما يلمع ✨**", Mood.Think))
        }
        val next = state.copy(placed = state.placed + token, glow = false)
        return if (measureSum(step, next) == step.beats) finish(step, next) else next
    }

    private fun miss(step: Step, state: StepState, value: String): StepState {
        val misses = state.misses + 1
        return state.copy(
            misses = misses, stepMisses = state.stepMisses + 1, glow = misses >= 2,
            missedParts = state.missedParts + if (state.missedHere) 0 else 1, missedHere = true,
            wrong = if (value.isEmpty()) state.wrong else state.wrong + value, wrongTick = state.wrongTick + 1,
            line = if (misses == 1) Line(step.hint.orEmpty(), Mood.Oops) else Line("${step.hint.orEmpty()} **$GLOW**", Mood.Think),
        )
    }

    private fun right(step: Step, state: StepState): StepState {
        val part = state.part + 1
        val next = state.copy(
            part = part, okParts = state.okParts + if (state.missedHere) 0 else 1, missedHere = false, wrong = emptyList(),
            // The gaps game keeps the remaining right gaps lit (web: only the found one goes dark).
            glow = step is Gaps && state.glow,
            misses = if (resetsPerPart(step)) 0 else state.misses,
            found = if (step is LabelStep) state.found + step.ask[state.part].id else state.found,
            note = if (step is TrueOrFalse) step.items[state.part].let { if (!it.truth && it.fix != null) "✏️ ${it.fix}" else null } else state.note,
        )
        if (part < parts(step)) {
            return if (step is StaffStep) next.copy(line = Line("👍 والآن: **${step.drops[part].name}**", Mood.Happy)) else next
        }
        return finish(step, next)
    }

    private fun finish(step: Step, state: StepState): StepState {
        val done = state.copy(done = true)
        val r = result(step, done)
        return done.copy(line = step.explain?.let { Line(it, if (r.ok >= r.total) Mood.Cheer else Mood.Happy) } ?: state.line)
    }
}
