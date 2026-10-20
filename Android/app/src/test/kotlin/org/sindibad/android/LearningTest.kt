package org.sindibad.android

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.sindibad.android.content.ArabicTopics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*

class LearningTest {
    private val profile = Profile("one", "مغامر", Hero.Sindbad)
    private val topic = ArabicTopics.all.first()
    private fun start() = LessonSession.start("run-1", profile, topic, 42)
    private fun taught(session: LessonSession, topic: Topic): LessonSession {
        var result = session
        repeat(topic.cards.size) { result = result.nextCard(topic) }
        return result
    }
    private fun completed(topic: Topic = this.topic): LessonSession {
        var session = taught(LessonSession.start("run-1", profile, topic, 42), topic)
        repeat(topic.roundCount) {
            session = session.submit(session.currentQuestion(topic).answer, topic).advance()
        }
        return session
    }

    @ParameterizedTest
    @CsvSource("0,0,0", "4,10,0", "5,10,1", "6,10,1", "7,10,2", "8,10,2", "9,10,3", "10,10,3", "7,8,2", "8,8,3")
    fun `star thresholds match the existing game`(correct: Int, total: Int, stars: Int) {
        assertEquals(stars, starsFor(correct, total))
    }

    @Test fun `assessment cannot start until every teaching card is visited`() {
        var session = start()
        assertEquals(session, session.choose(0, topic))
        assertEquals(session, session.submit(listOf(1), topic))
        repeat(topic.cards.size - 1) { session = session.nextCard(topic); assertEquals(Phase.Learn, session.phase) }
        assertEquals(Phase.Question, session.nextCard(topic).phase)
    }

    @Test fun `all eight topic banks can complete a native session`() {
        assertEquals(8, ArabicTopics.all.size)
        assertEquals(149, ArabicTopics.all.sumOf { it.questions.size })
        for (topic in ArabicTopics.all) {
            val session = completed(topic)
            assertTrue(session.finished, topic.id)
            assertEquals(topic.roundCount, session.correct, topic.id)
        }
    }

    @Test fun `wrong answer then correction never earns first try credit`() {
        val initial = taught(start(), topic)
        val q = initial.currentQuestion(topic)
        val wrong = listOf(q.choices.indices.first { it !in q.answer })
        val retry = initial.submit(wrong, topic)
        assertFalse(retry.resolved)
        assertEquals(initial.index, retry.advance().index)
        val solved = retry.submit(q.answer, topic)
        assertTrue(solved.resolved)
        assertEquals(0, solved.correct)
        assertTrue(q.id in solved.missed)
    }

    @Test fun `two wrong answers reveal and resolve without awarding credit`() {
        val initial = taught(start(), topic)
        val q = initial.currentQuestion(topic)
        val wrong = listOf(q.choices.indices.first { it !in q.answer })
        val revealed = initial.submit(wrong, topic).submit(wrong, topic)
        assertTrue(revealed.resolved)
        assertEquals(0, revealed.correct)
        assertEquals(revealed, revealed.submit(q.answer, topic))
    }

    @Test fun `reviewing teaching preserves attempts and the current question`() {
        var session = taught(start(), topic)
        val q = session.currentQuestion(topic)
        session = session.submit(listOf(q.choices.indices.first { it !in q.answer }), topic)
        val returned = session.review().nextCard(topic).returnToQuestion()
        assertEquals(session.index, returned.index)
        assertEquals(session.attempts, returned.attempts)
        assertEquals(session.questionIds, returned.questionIds)
    }

    @Test fun `double taps cannot add scores twice`() {
        val session = taught(start(), topic)
        val q = session.currentQuestion(topic)
        val solved = session.submit(q.answer, topic)
        assertEquals(1, solved.correct)
        assertEquals(solved, solved.submit(q.answer, topic))
    }

    @Test fun `word blocks require the correct order and grammatical endings`() {
        val topic = ArabicTopics.all.last()
        val session = taught(LessonSession.start("blocks", profile, topic, 123), topic)
        val q = session.currentQuestion(topic)
        assertEquals(session, session.submit(q.answer.take(1), topic))
        val wrong = session.submit(q.answer.reversed(), topic)
        assertEquals(false, wrong.lastCorrect)
        assertTrue(wrong.selection.isEmpty())
        val picked = session.choose(q.answer.first(), topic)
        assertEquals(emptyList<Int>(), picked.choose(q.answer.first(), topic).selection)
        assertTrue(session.submit(q.answer, topic).resolved)
    }

    @Test fun `session round trip retains quiz shuffle attempts and feedback`() {
        val topic = ArabicTopics.all.first { it.kind == ActivityKind.Choice }
        val session = taught(LessonSession.start("restored", profile, topic, 51), topic).choose(1, topic)
        val restored = GameRepository.json.decodeFromString<LessonSession>(GameRepository.json.encodeToString(session))
        assertEquals(session, restored)
        assertEquals(session.choiceOrder(topic), restored.choiceOrder(topic))
    }

    @Test fun `previously missed questions lead the next session without duplicate rounds`() {
        val missed = topic.questions.take(3).map { it.id }
        val profile = profile.copy(topics = mapOf(topic.id to TopicRecord(missed = missed)))
        val session = LessonSession.start("retry", profile, topic, 8)
        assertEquals(missed.toSet(), session.questionIds.take(3).toSet())
        assertEquals(session.questionIds.size, session.questionIds.distinct().size)
    }

    @Test fun `completion is atomic idempotent and isolated to the originating profile`() {
        val other = Profile("two", "مغامرة", Hero.Yasmina)
        val store = GameStore(activeId = other.id, profiles = listOf(profile, other))
        val session = completed()
        val saved = store.complete(session)
        assertEquals(saved, saved.complete(session))
        assertEquals(other, saved.active)
        val one = saved.profiles.first()
        assertEquals(15, one.pearls)
        assertEquals(3, one.totalStars)
        assertEquals(1, one.topics[topic.id]?.plays)
    }

    @Test fun `a worse replay preserves best score stars and pearls`() {
        val store = GameStore(activeId = profile.id, profiles = listOf(profile)).complete(completed())
        val lower = completed().copy(id = "worse", correct = 0)
        val after = store.complete(lower).active!!
        assertEquals(3, after.topics[topic.id]?.stars)
        assertEquals(1f, after.topics[topic.id]?.best)
        assertEquals(15, after.pearls)
        assertEquals(2, after.topics[topic.id]?.plays)
    }

    @Test fun `incomplete lessons cannot award pearls`() {
        assertThrows(IllegalArgumentException::class.java) { GameStore(profiles = listOf(profile)).complete(start()) }
    }

    @Test fun `unlocking uses the prerequisite subject instead of total stars`() {
        val math = islands.first { it.id == "math" }
        assertFalse(math.unlocked(profile.copy(topics = mapOf("music-one" to TopicRecord(stars = 3)))))
        assertFalse(math.unlocked(profile.copy(topics = mapOf("arabic-one" to TopicRecord(stars = 1)))))
        assertTrue(math.unlocked(profile.copy(topics = mapOf("arabic-one" to TopicRecord(stars = 2)))))
    }

    @Test fun `corrupt and future saves fail without silently resetting progress`() {
        assertThrows(Exception::class.java) { GameRepository.decode("{broken") }
        assertThrows(IllegalArgumentException::class.java) { GameRepository.decode("""{"version":2}""") }
        assertThrows(IllegalArgumentException::class.java) { GameRepository.decode("""{"activeId":"missing"}""") }
        assertEquals(GameStore(), GameRepository.decode(null))
    }
}
