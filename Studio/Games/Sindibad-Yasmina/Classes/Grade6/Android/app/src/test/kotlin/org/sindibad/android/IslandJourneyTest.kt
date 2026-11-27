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

    @Test fun `farm harvest and order rewards cannot be claimed twice from one sale`() {
        val before = Barn(stock = mapOf("potato" to 6), quest = 1).withOrders(emptySet())
        assertEquals("أم سمير", before.board.first().who)
        val first = before.deliver(0, emptySet())
        val second = first.deliver(first.board.indexOfFirst { it.who == "أم سمير" }, emptySet())
        assertEquals(0, second.stock["potato"])
        assertEquals(36, second.coins)
        assertEquals(second, second.deliver(0, emptySet()))
        val decorated = second.decorate("scarecrow")
        assertEquals(6, decorated.coins)
        assertEquals(decorated, decorated.decorate("scarecrow"))
        val profile = Profile("one", "مغامر", Hero.Sindbad, barn = decorated, gallery = mapOf("one" to List(64) { 2 }),
            wordBook = listOf(Vocabulary("country", "بلد", "Canada is a beautiful country.")))
        assertEquals(profile, Json.decodeFromString<Profile>(Json.encodeToString(profile)))
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
