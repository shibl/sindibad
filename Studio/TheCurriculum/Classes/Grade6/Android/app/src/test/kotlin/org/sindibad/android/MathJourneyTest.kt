package org.sindibad.android

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.content.*
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import java.io.File

class MathJourneyTest {
    private val profile = Profile("one", "مغامر", Hero.Sindbad)
    private fun taught(topic: Topic, seed: Int = 0): LessonSession {
        var session = LessonSession.start("run", profile, topic, seed)
        repeat(topic.cards.size) { session = session.nextCard(topic) }
        return session
    }
    private fun complete(topic: Topic, seed: Int = 0): LessonSession {
        var session = taught(topic, seed)
        while (!session.finished) session = session.submit(session.currentQuestion(topic).answer, topic).advance()
        return session
    }
    @Test fun `all eleven math topics preserve their banks and complete natively`() {
        assertEquals(11, MathTopics.all.size)
        assertEquals(167, MathTopics.all.sumOf { it.questions.size })
        for (topic in MathTopics.all) {
            assertTrue(topic.questions.all { it.accepts(it.answer) }, topic.id)
            assertEquals(topic.roundCount, complete(topic).correct, topic.id)
        }
    }
    @Test fun `all diagrams and control states referenced by native topics are packaged assets`() {
        val root = File("../../Shared/Art/runtime/png")
        assertTrue(root.exists())
        fun asset(id: String) = assertTrue(File(root, "$id.png").isFile, id)
        for (topic in MathTopics.all) {
            topic.cards.flatMap { it.art }.forEach(::asset)
            topic.questions.flatMap { it.art }.forEach(::asset)
            topic.questions.forEach { q ->
                val n = q.number
                when (topic.kind) {
                    ActivityKind.NumberLine -> asset("controls/line/${n!!.min.toInt()}_${n.max.toInt()}_${n.ticks}")
                    ActivityKind.Angle -> (0..36).forEach { asset("controls/helm/${it * 5}") }
                    ActivityKind.Fill -> (0..n!!.ticks).forEach { asset("controls/fill/${n.ticks}-$it") }
                    else -> Unit
                }
            }
        }
    }
    @Test fun `acute and obtuse tasks accept every valid five degree answer`() {
        val topic = MathTopics.get("math-angles")
        val acute = topic.questions.first { it.number?.acceptable == 1..17 }
        val obtuse = topic.questions.first { it.number?.acceptable == 19..35 }
        (0..36).forEach {
            assertEquals(it in 1..17, acute.accepts(listOf(it)))
            assertEquals(it in 19..35, obtuse.accepts(listOf(it)))
        }
        assertFalse(acute.valid(listOf(-1)))
        assertFalse(acute.valid(listOf(37)))
    }
    @Test fun `numeric input cannot submit while learning or alter a resolved answer`() {
        val topic = MathTopics.get("math-integers")
        val learning = LessonSession.start("run", profile, topic, 2)
        assertEquals(learning, learning.selectNumber(5, topic))
        val asking = taught(topic)
        val answer = asking.currentQuestion(topic).answer
        val resolved = asking.selectNumber(answer.single(), topic).submit(answer, topic)
        assertEquals(resolved, resolved.selectNumber(0, topic))
        assertEquals(resolved, resolved.submit(answer, topic))
        assertEquals(1, resolved.correct)
    }
    @Test fun `negative values and improper fractions retain the left to right scale`() {
        val ints = MathTopics.get("math-integers")
        assertEquals("−5", ints.questions.first().number!!.label(0))
        assertEquals("0", ints.questions.first().number!!.label(5))
        val improper = MathTopics.get("math-fractions-line").questions.last()
        assertEquals(1.25, improper.number!!.value(improper.answer.single()))
    }
    @Test fun `payment is bounded removable and preserved on restoration`() {
        val topic = MathTopics.get("math-market")
        var session = taught(topic).pay(100, true, topic).pay(50, true, topic).pay(50, false, topic)
        assertEquals(listOf(100), session.payment)
        assertEquals(listOf(100), session.selection)
        assertEquals(session, session.pay(7, true, topic))
        repeat(30) { session = session.pay(100, true, topic) }
        assertEquals(1000, session.payment.sum())
        val restored = GameRepository.json.decodeFromString<LessonSession>(GameRepository.json.encodeToString(session))
        assertEquals(session, restored)
        val returned = session.review().returnToQuestion()
        assertEquals(session.payment, returned.payment)
        assertEquals(session.selection, returned.selection)
        assertEquals(session.phase, returned.phase)
    }
    @Test fun `dynamic division questions restore from seed and have distinct valid options`() {
        for (seed in 0..200) {
            val topic = MathTopics.get("math-divisibility", seed)
            assertEquals(topic, MathTopics.get(topic.id, seed))
            assertEquals(8, complete(topic, seed).correct)
            topic.questions.forEach { q ->
                assertEquals(4, q.choices.distinct().size)
                val right = q.choices.first().toInt()
                when {
                    q.prompt.startsWith("أيّ") -> {
                        val divisor = Regex("\\d+").find(q.prompt)!!.value.toInt()
                        assertEquals(0, right % divisor)
                        assertTrue(q.choices.drop(1).all { it.toInt() % divisor != 0 })
                    }
                    q.prompt.startsWith("ما القاسم") -> {
                        val (a, b) = Regex("\\d+").findAll(q.prompt).map { it.value.toInt() }.toList()
                        assertEquals((1..minOf(a, b)).last { a % it == 0 && b % it == 0 }, right)
                    }
                    else -> {
                        val (a, b) = Regex("\\d+").findAll(q.prompt).take(2).map { it.value.toInt() }.toList()
                        assertEquals((1..a * b).first { it % a == 0 && it % b == 0 }, right)
                    }
                }
            }
        }
        assertNotEquals(MathTopics.get("math-divisibility", 1).questions, MathTopics.get("math-divisibility", 2).questions)
    }
    @Test fun `missed questions take priority and weaker replay cannot farm pearls`() {
        val topic = MathTopics.get("math-market")
        val p = profile.copy(topics = mapOf(topic.id to TopicRecord(3, 1f, 1, topic.questions.take(4).map { it.id })), pearls = 15)
        val run = LessonSession.start("next", p, topic, 123)
        assertEquals(p.topics.getValue(topic.id).missed.toSet(), run.questionIds.take(4).toSet())
        val saved = GameStore(profiles = listOf(p), activeId = p.id).complete(complete(topic).copy(correct = 2))
        assertEquals(15, saved.active!!.pearls)
        assertEquals(3, saved.active!!.topics.getValue(topic.id).stars)
    }
    @Test fun `guardian needs every lesson not an aggregate of unrelated stars`() {
        assertFalse(Topics.guardianReady(profile.copy(pearls = 10000), "math"))
        val mastered = profile.copy(topics = MathTopics.all.associate { it.id to TopicRecord(stars = 1) })
        assertTrue(Topics.guardianReady(mastered, "math"))
        assertFalse(Topics.guardianReady(mastered.copy(topics = mastered.topics - MathTopics.all.first().id), "math"))
    }
    @Test fun `guardian win and repeated save have fair idempotent rewards`() {
        val topic = Topics.get("guardian-math")
        val won = complete(topic)
        assertEquals(0, won.guardianHealth)
        assertEquals(4, won.correct) // 20 + 20 + 30 + 30
        var store = GameStore(activeId = profile.id, profiles = listOf(profile)).complete(won)
        assertEquals(20, store.active!!.pearls)
        assertEquals(store, store.complete(won))
        store = store.complete(won.copy(id = "replay"))
        assertEquals(25, store.active!!.pearls)
        assertEquals(0, store.active!!.totalStars)
        assertEquals(setOf("math"), store.active!!.guardians)
    }
    @Test fun `three guardian misses end the challenge without charging pearls`() {
        val topic = Topics.get("guardian-arabic")
        var session = taught(topic)
        repeat(3) {
            val q = session.currentQuestion(topic)
            session = session.submit(listOf(q.choices.indices.first { it !in q.answer }), topic).advance()
        }
        assertTrue(session.finished)
        assertEquals(0, session.hearts)
        val p = profile.copy(pearls = 50)
        val after = GameStore(profiles = listOf(p), activeId = p.id).complete(session).active!!
        assertEquals(50, after.pearls)
        assertTrue(after.guardians.isEmpty())
    }
    @Test fun `all fifteen cosmetics cost earned pearls and never affect learning or unlocks`() {
        assertEquals(15, cosmetics.size)
        for (item in cosmetics) {
            val p = profile.copy(pearls = item.price)
            val bought = p.buyCosmetic(item.id)
            assertEquals(0, bought.pearls)
            assertEquals(bought, bought.buyCosmetic(item.id))
            assertEquals(p.topics, bought.topics)
            assertEquals(item.id, bought.style[item.slot])
            assertTrue(item.id in bought.owned)
            assertEquals(p.totalStars, bought.totalStars)
            assertEquals(islands.map { it.unlocked(p) }, islands.map { it.unlocked(bought) })
            assertThrows(IllegalArgumentException::class.java) { profile.buyCosmetic(item.id) }
            assertThrows(IllegalArgumentException::class.java) { profile.wearCosmetic(item.slot, item.id) }
            assertFalse(bought.wearCosmetic(item.slot, null).style.containsKey(item.slot))
        }
    }
    @Test fun `treasure covers six subjects and certificate is awarded only for a passing finish`() {
        val treasureIsland = islands.first { it.id == "treasure" }
        assertFalse(treasureIsland.unlocked(profile.copy(pearls = 100000)))
        val qualified = profile.copy(topics = mapOf("social-map" to TopicRecord(stars = 2)))
        assertTrue(treasureIsland.unlocked(qualified))
        for (seed in 0..20) {
            val topic = Treasure.topic(seed)
            assertEquals(topic, Treasure.topic(seed))
            assertEquals(10, topic.questions.size)
            val ids = topic.questions.map { it.id }
            for (prefix in listOf("review-arabic-", "math-", "review-science-", "review-social-", "review-art-", "review-english-")) assertTrue(ids.any { it.startsWith(prefix) }, prefix)
            val finished = complete(topic, seed)
            val store = GameStore(profiles = listOf(qualified), activeId = qualified.id)
            assertFalse(store.complete(finished.copy(correct = 4)).active!!.certificateEarned)
            val passed = store.complete(finished).active!!
            assertTrue(passed.certificateEarned)
            assertEquals(3, passed.starsIn("treasure"))
        }
    }
    @Test fun `old profile documents load with safe defaults for new features`() {
        val old = GameRepository.decode("""{"version":1,"activeId":"one","profiles":[{"id":"one","name":"مغامر","hero":"Sindbad"}]}""")
        assertEquals(profile, old.active)
        val p = profile.copy(pearls = 100).buyCosmetic("sail-gold").copy(guardians = setOf("math"), certificateEarned = true)
        val saved = GameStore(profiles = listOf(p), activeId = p.id)
        assertEquals(saved, GameRepository.decode(GameRepository.json.encodeToString(saved)))
    }
    @Test fun `all external review questions preserve readable complete content`() {
        val questions = ReviewBank.science() + ReviewBank.social() + ReviewBank.art() + ReviewBank.english()
        assertEquals(questions.size, questions.map { it.id }.distinct().size)
        for (q in questions) {
            assertTrue(q.prompt.isNotBlank() && q.hint.isNotBlank() && q.explanation.isNotBlank(), q.id)
            assertTrue(q.choices.size >= 2 && q.accepts(q.answer), q.id)
            assertFalse(listOf(q.prompt, q.hint, q.explanation).any { "<svg" in it || "<span" in it }, q.id)
        }
        val shape = MathTopics.get("math-area").questions.first()
        assertTrue("6 سم" in shape.stimulus && "4 سم" in shape.stimulus)
        assertEquals("5/4", MathTopics.get("math-fractions-line").questions.last().answerText())
    }
}
