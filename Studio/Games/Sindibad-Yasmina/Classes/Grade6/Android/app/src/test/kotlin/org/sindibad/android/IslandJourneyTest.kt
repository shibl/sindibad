package org.sindibad.android

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.content.Topics
import org.sindibad.android.domain.*

class IslandJourneyTest {
    @Test fun `a new player can travel in reverse order and replay each subject offline`() {
        val player = Profile("traveller", "ياسمينة", Hero.Yasmina)
        var store = GameStore(activeId = player.id, profiles = listOf(player))
        for (island in islands.reversed()) {
            assertTrue(island.nativeReady, island.id)
            val topic = if (island.id == "treasure") Topics.get("review-treasure") else Topics.inRegion(island.id).first()
            repeat(2) { round ->
                val id = "${island.id}-$round"
                var session = LessonSession.start(id, store.active!!, topic, round)
                repeat(topic.cards.size) { session = session.nextCard(topic) }
                while (!session.finished) session = session.submit(session.currentQuestion(topic).answer, topic).advance()
                val recorded = store.complete(session)
                assertEquals(recorded, recorded.complete(session))
                store = Json.decodeFromString<GameStore>(Json.encodeToString(recorded))
                assertEquals(3, store.active!!.topics.getValue(topic.id).stars)
            }
        }
        assertTrue(store.active!!.certificateEarned)
    }

    @Test fun `all specialized lessons have reachable instructions and answers`() {
        val sizes = mapOf("farm" to 7, "music" to 10, "science" to 17, "social" to 25, "art" to 25, "english" to 24)
        for ((island, size) in sizes) {
            val lessons = Topics.inRegion(island)
            assertEquals(size, lessons.size)
            for (lesson in lessons) {
                assertEquals(lesson, Topics.get(lesson.id))
                for (card in lesson.cards) {
                    assertTrue(card.tools.containsAll(card.requiredTools), lesson.id)
                    assertTrue(card.options.isEmpty() || card.response in card.options, lesson.id)
                    assertTrue(card.sequence.none(String::isBlank), lesson.id)
                    assertTrue(card.notes.all { it.matches(Regex("[A-G]#?[0-9]")) }, lesson.id)
                }
            }
        }
    }
}
