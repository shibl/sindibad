package org.sindibad.android

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.atlas.AtlasWorld
import org.sindibad.android.domain.atlas.GlobeGame
import org.sindibad.android.domain.atlas.GlobeMode
import org.sindibad.android.domain.atlas.GlobeState

class GlobeGameTest {
    private fun name(id: String) = AtlasWorld.country(id)!!.ar
    private fun other(than: String) = AtlasWorld.full.first { it != than }

    @Test fun `exploring, a tapped country is chosen, faced and its card opens, and closing the card unselects it`() {
        var s = GlobeGame.start(5)
        assertEquals(GlobeMode.Explore, s.mode); assertEquals(GlobeGame.OPEN, s.line!!.text)
        s = GlobeGame.choose(s, "760")
        assertEquals("760", s.selected); assertEquals("760", s.card); assertEquals("760", s.face); assertEquals(1, s.turn)
        s = GlobeGame.choose(s, "760")
        assertEquals(2, s.turn, "choosing it again turns to it again")
        s = GlobeGame.closeCard(s)
        assertNull(s.card); assertNull(s.selected)
        assertEquals(s, GlobeGame.choose(s, "nowhere"))
        assertFalse(s.playing); assertFalse(s.won)
    }

    @Test fun `rounds draw from the Arab countries and ten others with a full card, the same way for the same seed`() {
        val ids = (1..400).map { GlobeGame.draw(11, it, false).first }
        assertTrue(ids.all { it in AtlasWorld.full })
        val arab = ids.count { it in AtlasWorld.arab }
        assertTrue(arab > ids.size / 2, "Arab countries come up most: $arab of ${ids.size}")
        assertTrue(ids.any { it !in AtlasWorld.arab })
        assertEquals(GlobeGame.draw(11, 3, true), GlobeGame.draw(11, 3, true))
        for (n in 1..50) {
            val (id, opts) = GlobeGame.draw(2, n, true)
            assertEquals(3, opts.size); assertEquals(3, opts.toSet().size)
            assertTrue(id in opts); assertTrue(opts.all { it in AtlasWorld.full })
        }
    }

    @Test fun `in the find game the first try scores, a miss names what was tapped, the second miss lights the answer and turns to it`() {
        var s = GlobeGame.setMode(GlobeGame.start(9), GlobeMode.Find)
        assertTrue(s.playing); assertEquals(0, s.score); assertEquals(1, s.rounds)
        val want = s.round!!
        s = GlobeGame.choose(s, want)
        assertEquals(1, s.score); assertTrue(s.won); assertFalse(s.playing)
        assertEquals("أحسنت! هذه **${name(want)}**. 📍", s.line!!.text)
        assertEquals(want, s.card); assertEquals(want, s.selected)
        // after a win, taps explore until «التالي ◀»
        s = GlobeGame.choose(s, other(want))
        assertEquals(1, s.score); assertEquals(other(want), s.card)
        s = GlobeGame.newRound(s)
        assertEquals(2, s.rounds); assertNull(s.card); assertTrue(s.playing)
        val next = s.round!!
        val wrong = other(next)
        val turn = s.turn
        s = GlobeGame.choose(s, wrong)
        assertEquals(Mood.Oops, s.line!!.mood); assertEquals("هذه **${name(wrong)}**. ابحث عن **${name(next)}**!", s.line!!.text)
        assertNull(s.mark, "the first miss lights nothing"); assertEquals(turn, s.turn); assertEquals(1, s.wrongTick)
        s = GlobeGame.choose(s, wrong)
        assertEquals(next, s.mark); assertEquals(next, s.face); assertEquals(turn + 1, s.turn)
        assertTrue(s.line!!.text.endsWith(GlobeGame.GLOW))
        assertNull(s.card, "a miss opens no card")
        s = GlobeGame.choose(s, next)
        assertEquals(1, s.score, "found after misses: no star"); assertNull(s.mark); assertTrue(s.won)
    }

    @Test fun `in the flag game a wrong name is disabled, only the first try scores, and taps on the globe do nothing`() {
        var s = GlobeGame.setMode(GlobeGame.start(4), GlobeMode.Flag)
        assertTrue(s.playing); assertEquals(3, s.options.size)
        val want = s.round!!
        assertEquals(s, GlobeGame.choose(s, want), "the globe is not an answer in the flag game")
        val wrong = s.options.first { it != want }
        s = GlobeGame.pickFlag(s, wrong)
        assertEquals(listOf(wrong), s.disabled); assertEquals(Mood.Oops, s.line!!.mood)
        assertEquals("ليس علم ${name(wrong)}. انظر إلى الألوان والرموز جيداً!", s.line!!.text)
        assertEquals(s, GlobeGame.pickFlag(s, wrong), "a disabled name does nothing")
        assertEquals(s, GlobeGame.pickFlag(s, "999"), "only the three names")
        s = GlobeGame.pickFlag(s, want)
        assertEquals(0, s.score); assertTrue(s.won); assertEquals(want, s.card); assertEquals(want, s.face)
        assertEquals("نعم! هذا علم **${name(want)}**. 🚩", s.line!!.text)
        assertEquals(s, GlobeGame.pickFlag(s, want), "a won round takes no more answers")
        s = GlobeGame.newRound(s)
        assertTrue(s.disabled.isEmpty()); assertEquals(0, s.tries)
        s = GlobeGame.pickFlag(s, s.round!!)
        assertEquals(1, s.score)
    }

    @Test fun `switching games starts the score at zero, exploring ends the round, and a round survives saving`() {
        var s = GlobeGame.setMode(GlobeGame.start(1), GlobeMode.Find)
        s = GlobeGame.choose(s, s.round!!)
        assertEquals(1, s.score)
        s = GlobeGame.setMode(s, GlobeMode.Flag)
        assertEquals(0, s.score); assertTrue(s.playing)
        val json = Json.encodeToString(GlobeState.serializer(), s)
        assertEquals(s, Json.decodeFromString(GlobeState.serializer(), json))
        s = GlobeGame.setMode(s, GlobeMode.Explore)
        assertFalse(s.playing); assertFalse(s.won); assertTrue(s.options.isEmpty())
        assertEquals(s, GlobeGame.newRound(s), "no rounds while exploring")
    }

    @Test fun `the search finds countries by their Arabic name, names that start with it first`() {
        assertTrue(GlobeGame.search("  ").isEmpty())
        assertEquals("760", GlobeGame.search("سورية").single().id)
        val r = GlobeGame.search("ال")
        assertTrue(r.size <= 8)
        assertTrue(r.all { "ال" in it.ar })
    }
}
