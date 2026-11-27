package org.sindibad.android

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import org.sindibad.android.domain.atlas.AtlasMaps
import org.sindibad.android.domain.atlas.AtlasWorld
import org.sindibad.android.domain.atlas.Timelines
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.atlas.AtlasPictures
import kotlin.math.abs

class AtlasQuestTest {
    private val atlas = QuestBooks.get("social")
    private val player = Profile("p", "مغامر", Hero.Sindbad)

    private fun play(run0: QuestRun, slip: (Int, Step, StepState) -> String? = { _, _, _ -> null }): QuestRun {
        var run = run0
        var guard = 0
        while (!run.finished) {
            check(guard++ < 2000) { "stuck at step ${run.index}" }
            val step = run.step(atlas)
            if (run.state.done) { run = run.next(atlas); continue }
            val wrong = slip(run.index, step, run.state)
            run = if (wrong != null) run.tap(atlas, wrong)
                else run.tap(atlas, requireNotNull(StepMachine.expected(step, run.state)) { "${step::class.simpleName}" })
        }
        return run
    }
    private fun start(id: String, quest: Quest, seed: Int = 7) = QuestRun.start(id, player.id, "social", quest, seed)

    @Test fun `the twenty-five atlas quests and thirteen places decode, and each can be finished with three stars`() {
        assertEquals(25, atlas.quests.size)
        assertEquals(13, atlas.stations.size)
        assertEquals(listOf(1, 2, 3, 4, 5), atlas.units.map { it.n })
        assertEquals("سهيل", atlas.helper.name)
        for (quest in atlas.quests) {
            val station = atlas.stations.single { it.id == quest.station }
            assertNotNull(atlas.units.singleOrNull { it.n == station.unit }, station.id)
            assertEquals("social-${quest.id}", quest.topic)
            assertTrue(Topics.inRegion("social").any { it.id == quest.topic }, quest.topic)
            assertTrue(quest.steps.first().teaches, "teach first: ${quest.id}")
            val run = play(start("r-${quest.id}", quest))
            assertTrue(run.total >= 1, quest.id)
            assertEquals(run.total, run.ok, 1e-9, quest.id)
            assertEquals(3, run.stars, quest.id)
        }
    }

    @Test fun `every graded step comes after a teaching step and has a hint`() {
        for (quest in atlas.quests) for ((i, step) in quest.steps.withIndex()) {
            if (step.teaches) continue
            assertTrue(quest.steps.take(i).any { it.teaches }, "${quest.id} step $i")
            assertFalse(step.hint.isNullOrBlank(), "${quest.id} step $i hint")
        }
    }

    @Test fun `misses give partial scores`() {
        val homeland = atlas.quest("homeland")
        val firstChoice = homeland.steps.indexOfFirst { it is Choice }
        assertTrue(firstChoice > 0)
        val run = play(start("a", homeland)) { index, step, state ->
            if (index == firstChoice && state.stepMisses == 0) (step as Choice).options.indices.map { "$it" }.first { it != StepMachine.expected(step, state) } else null
        }
        assertEquals(run.total - 1, run.ok, 1e-9)
        assertTrue(run.stars < 3)
        // A map label step scores the share of places named right the first time.
        val li = homeland.steps.indexOfFirst { it is LabelStep }
        val label = homeland.steps[li] as LabelStep
        val wrong = play(start("b", homeland)) { index, _, state ->
            if (index == li && state.part == 0 && state.misses == 0) label.ask[1].id else null
        }
        assertEquals(wrong.total - 1.0 / label.ask.size, wrong.ok, 1e-9)
    }

    @Test fun `on a map the first miss says the hint, the second lights the place, and each new place starts unlit`() {
        val label = atlas.quests.flatMap { it.steps }.filterIsInstance<LabelStep>().first { it.ask.size >= 3 }
        var s = StepMachine.start(label, 3)
        val wrong = label.ask[2].id
        s = StepMachine.tap(label, s, wrong)
        assertEquals(Mood.Oops, s.line!!.mood); assertEquals(label.hint, s.line!!.text); assertFalse(s.reveal)
        s = StepMachine.tap(label, s, wrong)
        assertTrue(s.reveal)
        assertEquals(label.ask[0].id, StepMachine.expected(label, s))
        s = StepMachine.tap(label, s, label.ask[0].id)
        assertEquals(1, s.part); assertFalse(s.reveal, "a new place starts unlit")
    }

    @Test fun `compass rays and stickers are given once per quest, however often a run is saved or replayed`() {
        var store = GameStore(activeId = player.id, profiles = listOf(player))
        val pyramids = atlas.quest("nilegift")
        assertEquals("pyramids", pyramids.sticker)
        val first = play(start("one", pyramids))
        store = store.finishQuest(first, atlas)
        assertEquals(store, store.finishQuest(first, atlas))
        assertEquals(1, store.active!!.compassRays())
        assertEquals(listOf("pyramids"), store.active!!.stickers)
        store = store.finishQuest(play(start("two", pyramids, 2)), atlas)
        assertEquals(1, store.active!!.compassRays())
        assertEquals(listOf("pyramids"), store.active!!.stickers)
        store = store.finishQuest(play(start("three", atlas.quest("homeland"))), atlas)
        assertEquals(2, store.active!!.compassRays()); assertEquals(1, store.active!!.stickers.size)
        for ((i, q) in atlas.quests.withIndex()) store = store.finishQuest(play(start("all-$i", q, i)), atlas)
        assertEquals(25, store.active!!.compassRays())
        assertEquals(atlas.stickers.map { it.id }.toSet(), store.active!!.stickers.toSet())
        assertEquals(6, store.active!!.stickers.size)
        // Other islands' rewards are untouched.
        assertEquals(0, store.active!!.crystals())
        assertEquals(0, store.active!!.goldenNotes("music"))
    }

    @Test fun `a visited country is remembered once, old saves decode without visits, and a doubled visit is refused`() {
        val p = player.visit("760").visit("422").visit("760")
        assertEquals(listOf("760", "422"), p.atlasVisited)
        val old = """{"version":1,"activeId":"p","profiles":[{"id":"p","name":"م","hero":"Sindbad","stickers":["newton"],"islandQuests":{"science":["measure"]}}]}"""
        val decoded = GameRepository.decode(old).active!!
        assertEquals(emptyList<String>(), decoded.atlasVisited)
        assertEquals(0, decoded.compassRays())
        val json = GameRepository.json
        val saved = decoded.visit("760")
        assertEquals(saved, GameRepository.decode(json.encodeToString(GameStore(activeId = "p", profiles = listOf(saved)))).active)
        val doubled = json.encodeToString(GameStore(activeId = "p", profiles = listOf(saved.copy(atlasVisited = listOf("760", "760")))))
        assertThrows(IllegalArgumentException::class.java) { GameRepository.decode(doubled) }
    }

    @Test fun `the atlas quest file has no step kind the app cannot play and no HTML`() {
        val text = javaClass.getResourceAsStream("/islands/social-quests.json")!!.bufferedReader().readText()
        val raw = Json.parseToJsonElement(text).jsonObject
        val kinds = raw["quests"]!!.jsonArray.flatMap { q -> q.jsonObject["steps"]!!.jsonArray.map { it.jsonObject["kind"]!!.jsonPrimitive.content } }.toSet()
        val shared = setOf("explore", "learn", "choice", "twoway", "sort", "order", "match", "tf", "number", "label")
        assertTrue(shared.containsAll(kinds), "the atlas needs only the shared kinds: ${kinds - shared}")
        assertFalse(Regex("<[a-z/][^>]*>").containsMatchIn(text))
        assertEquals(6, atlas.stickers.size)
        for (q in atlas.quests) q.sticker?.let { assertNotNull(atlas.sticker(it), q.id) }
    }

    @Test fun `every map and timeline a step names is drawn natively, with every place the web draws`() {
        val features = AtlasWorld.tables.features
        for (q in atlas.quests) for ((i, step) in q.steps.withIndex()) {
            val where = "${q.id} step $i"
            when (step) {
                is Explore -> step.view?.let { v ->
                    assertTrue(AtlasPictures.has(v), "$where: $v")
                    assertTrue(AtlasPictures.drawn(step).isNotEmpty(), "$where draws none of its spots")
                    if (v == AtlasPictures.MAP) {
                        assertNotNull(step.area, where)
                        assertTrue(step.area in AtlasWorld.tables.areas, "$where: ${step.area}")
                    } else assertFalse(step.events.isNullOrEmpty(), where)
                }
                is LabelStep -> {
                    assertEquals(AtlasPictures.MAP, step.view, where)
                    for (a in step.ask) assertTrue(a.id in features, "$where: ${a.id}")
                    assertEquals(step.ask.map { it.id }.toSet(), AtlasPictures.drawn(step), where)
                }
                is Choice -> step.pic?.let { assertEquals(AtlasPictures.MAP, it, where); step.mark.orEmpty().forEach { m -> assertTrue(m in features, "$where mark $m") } }
                else -> {}
            }
        }
    }

    @Test fun `the native pictures match the web's own SVG, their size, places and where each name goes`() {
        val text = javaClass.getResourceAsStream("/atlas-web-pictures.json")!!.bufferedReader().readText()
        val pictures = Json.parseToJsonElement(text).jsonArray.map { it.jsonObject }
        assertEquals(45, pictures.size)
        var compared = 0
        for (pic in pictures) {
            val quest = atlas.quest(pic["quest"]!!.jsonPrimitive.content)
            val index = pic["index"]!!.jsonPrimitive.int
            val step = quest.steps[index]
            val where = "${quest.id} step $index"
            val h = pic["h"]!!.jsonPrimitive.double.toFloat()
            val web = pic["spots"]!!.jsonArray.associate { s ->
                val o = s.jsonObject
                o["id"]!!.jsonPrimitive.content to o["label"]!!.jsonArray.map { it.jsonPrimitive.double.toFloat() }
            }
            fun near(a: Float, b: Float, what: String) = assertTrue(abs(a - b) <= .15f, "$where $what: native $a, web $b")
            when (step) {
                is Explore -> if (step.view == AtlasPictures.TIMELINE) {
                    val events = Timelines.layout(step.events!!, step.spots)
                    assertEquals(190f, h, where)
                    assertEquals(web.keys, events.map { it.id }.toSet(), where)
                    for (e in events) { near(e.nameX, web.getValue(e.id)[0], "${e.id}.x"); near(e.nameY, web.getValue(e.id)[1], "${e.id}.y") }
                } else {
                    val layout = AtlasMaps.layout(step.area, step.spots.map { it.id })
                    near(layout.h, h, "height")
                    assertEquals(web.keys, AtlasPictures.drawn(step), where)
                    for (id in web.keys) { val s = layout.spot(id)!!; near(s.labelX, web.getValue(id)[0], "$id.x"); near(s.labelY, web.getValue(id)[1], "$id.y") }
                }
                is LabelStep -> {
                    val layout = AtlasMaps.layout(step.area, step.ask.map { it.id })
                    near(layout.h, h, "height")
                    assertEquals(web.keys, layout.spots.map { it.id }.toSet() intersect step.ask.map { it.id }.toSet(), where)
                    for (id in web.keys) { val s = layout.spot(id)!!; near(s.labelX, web.getValue(id)[0], "$id.x"); near(s.labelY, web.getValue(id)[1], "$id.y") }
                }
                is Choice -> {
                    val layout = AtlasMaps.layout(step.area, emptyList(), step.mark.orEmpty())
                    near(layout.h, h, "height")
                    // the web paints a marked country, river or city in the mark colour (mp-mark); marked peaks are drawn plain
                    val marked = layout.land.any { it.mark } || layout.decor.rivers.any { it.second } || layout.decor.cities.isNotEmpty()
                    assertEquals(pic["marks"]!!.jsonPrimitive.int > 0, marked, "$where marks")
                    if (step.mark.orEmpty().any { it in AtlasWorld.tables.mountains }) assertTrue(layout.decor.mountains.isNotEmpty(), "$where peaks")
                }
                else -> fail("$where: ${step::class.simpleName}")
            }
            compared++
        }
        assertEquals(45, compared)
    }

    @Test fun `a tap on a place's anchor finds it`() {
        for (q in atlas.quests) for (step in q.steps) {
            val ids = when (step) { is Explore -> if (step.view == AtlasPictures.MAP) step.spots.map { it.id } else null; is LabelStep -> step.ask.map { it.id }; else -> null } ?: continue
            val layout = AtlasMaps.layout((step as? Explore)?.area ?: (step as LabelStep).area, ids)
            for (s in layout.spots) assertEquals(s.id, layout.hit(s.x, s.y, slop = 12f, among = setOf(s.id)), "${q.id}: ${s.id}")
        }
    }
}
