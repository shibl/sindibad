package org.sindibad.android.domain.quest

import kotlinx.serialization.Serializable
import org.sindibad.android.domain.GameStore
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.recordScore
import org.sindibad.android.domain.starsForRatio

/**
 * A quest being played: its steps in order, «أتعلّم» first where the book puts it, «تابِع» after each step.
 * The quest's score is Σok / Σtotal over its steps (web: core/tunes/tunes.ts runQuest → finishQuest).
 */
@Serializable data class QuestRun(
    val id: String, val profileId: String, val island: String, val questId: String, val seed: Int,
    val index: Int = 0, val state: StepState, val ok: Double = 0.0, val total: Double = 0.0, val finished: Boolean = false,
) {
    fun quest(book: QuestBook) = book.quest(questId)
    fun step(book: QuestBook) = quest(book).steps[index]
    fun tap(book: QuestBook, value: String) = if (finished) this else copy(state = StepMachine.tap(step(book), state, value))
    fun undo(book: QuestBook) = if (finished) this else copy(state = StepMachine.undo(step(book), state))
    fun drum(book: QuestBook, tapsMs: List<Long>) = (step(book) as? Drum)?.let { if (finished) this else copy(state = StepMachine.drum(it, state, tapsMs)) } ?: this

    /** «تابِع»: only once the step is done; adds its score and opens the next step. */
    fun next(book: QuestBook): QuestRun {
        if (finished || !state.done) return this
        val steps = quest(book).steps
        val r = StepMachine.result(steps[index], state)
        val i = index + 1
        return if (i >= steps.size) copy(ok = ok + r.ok, total = total + r.total, finished = true)
            else copy(index = i, ok = ok + r.ok, total = total + r.total, state = StepMachine.start(steps[i], seed + i))
    }
    val stars get() = starsForRatio(ok, total)

    companion object {
        fun start(id: String, profileId: String, island: String, quest: Quest, seed: Int) =
            QuestRun(id, profileId, island, quest.id, seed, state = StepMachine.start(quest.steps.first(), seed))
    }
}

/** Golden notes: one for each quest finished at least once on the island (web: T.done, the rainbow staff). */
fun Profile.goldenNotes(island: String) = islandQuests[island].orEmpty().size
fun Profile.questDone(island: String, questId: String) = questId in islandQuests[island].orEmpty()

/**
 * Saves a finished quest once: stars and pearls for its topic like a lesson, and the island's first-finish reward
 * (a golden note on the music island). Saving the same run again changes nothing.
 */
fun GameStore.finishQuest(run: QuestRun, book: QuestBook): GameStore {
    require(run.finished)
    return updateProfile(run.profileId) { p ->
        if (run.id in p.completedSessions) p else {
            val quest = run.quest(book)
            val done = p.islandQuests[run.island].orEmpty()
            p.recordScore(quest.topic, run.ok, maxOf(1.0, run.total)).copy(
                islandQuests = p.islandQuests + (run.island to if (quest.id in done) done else done + quest.id),
                completedSessions = (p.completedSessions + run.id).takeLast(128),
            )
        }
    }
}

/** What finishing a run earned, shown on the result card (kept across process death with the run). */
@Serializable data class QuestReward(val runId: String, val stars: Int, val first: Boolean, val pearls: Int)
