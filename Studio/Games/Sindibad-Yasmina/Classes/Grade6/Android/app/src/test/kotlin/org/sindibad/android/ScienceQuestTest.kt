package org.sindibad.android

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.science.ScienceViews
import org.sindibad.android.ui.science.Stage
import org.sindibad.android.ui.science.drawnParts
import org.sindibad.android.ui.science.ease
import org.sindibad.android.ui.science.partBox
import org.sindibad.android.ui.science.spotLabel

class ScienceQuestTest {
    private val science = QuestBooks.get("science")
    private val player = Profile("p", "مغامر", Hero.Sindbad)

    /** Plays a run to the end with the right answer every time; `slip` may return a wrong value first. */
    private fun play(run0: QuestRun, slip: (Int, Step, StepState) -> String? = { _, _, _ -> null }): QuestRun {
        var run = run0
        var guard = 0
        while (!run.finished) {
            check(guard++ < 2000) { "stuck at step ${run.index}" }
            val step = run.step(science)
            if (run.state.done) { run = run.next(science); continue }
            val wrong = slip(run.index, step, run.state)
            run = if (wrong != null) run.tap(science, wrong)
                else run.tap(science, requireNotNull(StepMachine.expected(step, run.state)) { "${step::class.simpleName}" })
        }
        return run
    }
    private fun start(id: String, quest: Quest, seed: Int = 7) = QuestRun.start(id, player.id, "science", quest, seed)

    @Test fun `the seventeen science quests and ten places decode, and each can be finished with three stars`() {
        assertEquals(17, science.quests.size)
        assertEquals(10, science.stations.size)
        assertEquals(listOf(1, 2, 3, 4), science.units.map { it.n })
        assertEquals("شرارة", science.helper.name)
        assertEquals(138, science.quests.sumOf { it.steps.size })
        for (quest in science.quests) {
            val station = science.stations.single { it.id == quest.station }
            assertNotNull(science.units.singleOrNull { it.n == station.unit }, station.id)
            assertEquals("science-${quest.id}", quest.topic)
            assertTrue(Topics.inRegion("science").any { it.id == quest.topic }, quest.topic)
            assertTrue(quest.steps.first().teaches, "teach first: ${quest.id}")
            val run = play(start("r-${quest.id}", quest))
            assertTrue(run.total >= 1, quest.id)
            assertEquals(run.total, run.ok, 1e-9, quest.id)
            assertEquals(3, run.stars, quest.id)
        }
    }

    @Test fun `every graded step comes after a teaching step and has a hint`() {
        for (quest in science.quests) for ((i, step) in quest.steps.withIndex()) {
            if (step.teaches) continue
            assertTrue(quest.steps.take(i).any { it.teaches }, "${quest.id} step $i")
            assertFalse(step.hint.isNullOrBlank(), "${quest.id} step $i hint")
        }
    }

    @Test fun `misses give partial scores`() {
        // One wrong answer on the first choice of «القوى»: that step is lost, the rest count.
        val forces = science.quest("forces")
        val firstChoice = forces.steps.indexOfFirst { it is Choice }
        val run = play(start("a", forces)) { index, step, state -> if (index == firstChoice && state.stepMisses == 0) "1" else null }
        assertEquals(run.total - 1, run.ok, 1e-9)
        assertTrue(run.stars < 3)
        // A label step scores the share of parts named right the first time.
        val ramp = science.quest("ramp")
        val li = ramp.steps.indexOfFirst { it is LabelStep }
        val label = ramp.steps[li] as LabelStep
        val wrong = play(start("b", ramp)) { index, _, state ->
            if (index == li && state.part == 0 && state.misses == 0) label.ask[1].id else null
        }
        assertEquals(wrong.total - 1.0 / label.ask.size, wrong.ok, 1e-9)
    }

    @Test fun `the first miss says the hint, the second lights the answer, and each new part starts unlit`() {
        val label = science.quests.flatMap { it.steps }.filterIsInstance<LabelStep>().first { it.ask.size >= 2 }
        var s = StepMachine.start(label, 3)
        val wrong = label.ask[1].id
        s = StepMachine.tap(label, s, wrong)
        assertEquals(Mood.Oops, s.line!!.mood); assertEquals(label.hint, s.line!!.text); assertFalse(s.reveal)
        s = StepMachine.tap(label, s, wrong)
        assertTrue(s.reveal); assertEquals(Mood.Think, s.line!!.mood); assertTrue(s.line!!.text.endsWith("**${StepMachine.GLOW}**"))
        assertEquals(label.ask[0].id, StepMachine.expected(label, s))
        s = StepMachine.tap(label, s, label.ask[0].id)
        assertEquals(1, s.part); assertFalse(s.reveal, "a new part starts unlit")
        assertEquals(listOf(label.ask[0].id), s.found)
        // A choice: the same rule.
        val choice = science.quests.flatMap { it.steps }.filterIsInstance<Choice>().first()
        var c = StepMachine.start(choice, 1)
        c = StepMachine.tap(choice, c, "1"); assertFalse(c.reveal)
        c = StepMachine.tap(choice, c, "2".takeIf { choice.options.size > 2 } ?: "1"); assertTrue(c.reveal || choice.options.size == 2)
    }

    @Test fun `crystals and stickers are given once per quest, however often a run is saved or replayed`() {
        var store = GameStore(activeId = player.id, profiles = listOf(player))
        val measure = science.quest("measure")
        assertEquals("newton", measure.sticker)
        val first = play(start("one", measure))
        store = store.finishQuest(first, science)
        assertEquals(store, store.finishQuest(first, science))
        assertEquals(1, store.active!!.crystals())
        assertEquals(listOf("newton"), store.active!!.stickers)
        assertEquals(3, store.active!!.topics.getValue("science-measure").stars)
        store = store.finishQuest(play(start("two", measure, 2)), science)
        assertEquals(1, store.active!!.crystals())
        assertEquals(listOf("newton"), store.active!!.stickers)
        // A quest without a sticker lights a crystal only.
        store = store.finishQuest(play(start("three", science.quest("hunters"))), science)
        assertEquals(2, store.active!!.crystals()); assertEquals(1, store.active!!.stickers.size)
        for ((i, q) in science.quests.withIndex()) store = store.finishQuest(play(start("all-$i", q, i)), science)
        assertEquals(17, store.active!!.crystals())
        assertEquals(science.stickers.map { it.id }.toSet(), store.active!!.stickers.toSet())
        assertEquals(6, store.active!!.stickers.size)
        // The music island's golden notes are not science crystals.
        assertEquals(0, store.active!!.goldenNotes("music"))
    }

    @Test fun `old saves decode without stickers and a save with a doubled sticker is refused`() {
        val old = """{"version":1,"activeId":"p","profiles":[{"id":"p","name":"م","hero":"Sindbad","pearls":3,"islandQuests":{"music":["scale"]}}]}"""
        val decoded = GameRepository.decode(old).active!!
        assertEquals(emptyList<String>(), decoded.stickers)
        assertEquals(0, decoded.crystals())
        assertEquals(1, decoded.goldenNotes("music"))
        val json = GameRepository.json
        val saved = decoded.copy(stickers = listOf("newton"), islandQuests = decoded.islandQuests + ("science" to listOf("measure")))
        assertEquals(saved, GameRepository.decode(json.encodeToString(GameStore(activeId = "p", profiles = listOf(saved)))).active)
        val doubled = json.encodeToString(GameStore(activeId = "p", profiles = listOf(saved.copy(stickers = listOf("newton", "newton")))))
        assertThrows(IllegalArgumentException::class.java) { GameRepository.decode(doubled) }
    }

    @Test fun `every picture a step names is drawn natively, with every part it asks for`() {
        val parts = science.views.associateBy { it.name }
        assertEquals(parts.keys, ScienceViews.ALL.map { it.name }.toSet(), "native pictures = the web's pictures")
        assertEquals(ScienceViews.ALL.size, ScienceViews.ALL.map { it.name }.toSet().size)
        for (q in science.quests) for ((i, step) in q.steps.withIndex()) {
            val where = "${q.id} step $i"
            when (step) {
                is Explore -> step.view?.let { v ->
                    assertTrue(ScienceViews.has(v), "$where: $v")
                    // Parts the picture draws get a touch target; the rest become cards (as on the web).
                    val drawn = drawnParts(science, v, step.spots.map { it.id })
                    assertTrue(drawn.isNotEmpty(), "$where: $v draws none of its spots")
                    for (id in drawn) assertNotNull(parts.getValue(v).spots.single { it.id == id }.let { it.hit ?: it.pill }, "$where: $id")
                }
                is LabelStep -> {
                    assertTrue(ScienceViews.has(step.view), "$where: ${step.view}")
                    assertEquals(step.ask.map { it.id }.toSet(), drawnParts(science, step.view, step.ask.map { it.id }), where)
                }
                else -> {}
            }
            val pic = when (step) { is Choice -> step.pic; is TwoWay -> step.pic; is Sort -> step.pic; is Match -> step.pic; is TrueOrFalse -> step.pic; is NumberStep -> step.pic; is Order -> step.pic; else -> null }
            pic?.let { assertTrue(ScienceViews.has(it), "$where pic $it") }
        }
        // Touch boxes stay inside the picture (the dust card that pokes out is clamped).
        for (v in science.views) for (p in v.spots) partBox(p)?.let { b ->
            assertTrue(b[0] >= 0 && b[1] >= 0 && b[0] + b[2] <= 320 && b[1] + b[3] <= 200 && b[2] > 0 && b[3] > 0, "${v.name}.${p.id}")
        }
    }

    @Test fun `the science quest file has no step kind the app cannot play and no HTML`() {
        val text = javaClass.getResourceAsStream("/islands/science-quests.json")!!.bufferedReader().readText()
        val raw = Json.parseToJsonElement(text).jsonObject
        val kinds = raw["quests"]!!.jsonArray.flatMap { q -> q.jsonObject["steps"]!!.jsonArray.map { it.jsonObject["kind"]!!.jsonPrimitive.content } }.toSet()
        val shared = setOf("explore", "learn", "choice", "twoway", "sort", "order", "match", "tf", "number", "label")
        assertTrue(shared.containsAll(kinds), "science needs only the shared kinds: ${kinds - shared}")
        assertFalse(Regex("<[a-z/][^>]*>").containsMatchIn(text))
        assertEquals(6, science.stickers.size)
        for (q in science.quests) q.sticker?.let { assertNotNull(science.sticker(it), q.id) }
    }

    @Test fun `a found spot shows its label, or its title when short, and pictures play their experiment`() {
        val spots = science.quests.flatMap { it.steps }.filterIsInstance<Explore>().flatMap { it.spots }
        for (s in spots) spotLabel(s)?.let { assertTrue(s.label != null || it.length <= 16) }
        val st = Stage(setOf("pull"), "pull", 1f, 0f, mapOf("pull" to .5f))
        assertEquals(.5f, st.p("pull")); assertEquals(0f, st.p("hang")); assertEquals(1f, Stage.still(setOf("x")).p("x"))
        assertEquals(0f, st.seg("pull", .6f, 1f)); assertEquals(1f, st.seg("pull", 0f, .5f))
        assertEquals(0f, ease(0f)); assertEquals(1f, ease(1f)); assertEquals(.5f, ease(.5f), 1e-6f)
        assertEquals(2600, ScienceViews["paper"]!!.duration("drop"))
    }
}
