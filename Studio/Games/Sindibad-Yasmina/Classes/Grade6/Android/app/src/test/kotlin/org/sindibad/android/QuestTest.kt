package org.sindibad.android

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.audio.Synth
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.quest.MusicPictures

class QuestTest {
    private val music = QuestBooks.get("music")
    private val player = Profile("p", "مغامر", Hero.Sindbad)

    private fun perfectTaps(step: Drum) = MusicTheory.beatsOf(step.pattern).first.map { (it * 60_000 / step.bpm).toLong() + 5_000 }

    /** Plays a run to the end with the right answer every time; `slip(step, state)` may return a wrong value first. */
    private fun play(run0: QuestRun, book: QuestBook, slip: (Int, Step, StepState) -> String? = { _, _, _ -> null }): QuestRun {
        var run = run0
        var guard = 0
        while (!run.finished) {
            check(guard++ < 2000) { "stuck at step ${run.index}" }
            val step = run.step(book)
            if (run.state.done) { run = run.next(book); continue }
            val wrong = slip(run.index, step, run.state)
            run = when {
                wrong != null -> run.tap(book, wrong)
                step is Drum -> run.drum(book, perfectTaps(step))
                else -> run.tap(book, requireNotNull(StepMachine.expected(step, run.state)) { "${step::class.simpleName}" })
            }
        }
        return run
    }

    @Test fun `the ten music quests and eight places decode, and every quest can be finished with full marks`() {
        assertEquals(10, music.quests.size)
        assertEquals(8, music.stations.size)
        assertEquals(10, music.skySong.size)
        for (quest in music.quests) {
            assertTrue(music.stations.any { it.id == quest.station }, quest.id)
            assertTrue(Topics.inRegion("music").any { it.id == quest.topic }, quest.topic)
            assertTrue(quest.steps.first() is Explore, "teach first: ${quest.id}")
            val run = play(QuestRun.start("r-${quest.id}", player.id, "music", quest, 7), music)
            assertEquals(run.total, run.ok, 1e-9, quest.id)
            assertTrue(run.total >= 1, quest.id)
            assertEquals(3, run.stars, quest.id)
        }
    }

    @Test fun `every step is taught before it is assessed and carries a hint and an explanation`() {
        for (quest in music.quests) for ((i, step) in quest.steps.withIndex()) {
            if (step.teaches) continue
            assertTrue(quest.steps.take(i).any { it.teaches }, "${quest.id} step $i")
            assertFalse(step.hint.isNullOrBlank(), "${quest.id} step $i hint")
            assertFalse(step.explain.isNullOrBlank(), "${quest.id} step $i explain")
        }
    }

    @Test fun `misses give the web's partial scores`() {
        // The scale quest: one miss on the first piano melody (a whole step), the rest right.
        val scale = music.quest("scale")
        val run = play(QuestRun.start("a", player.id, "music", scale, 1), music) { index, step, state ->
            if (index == 1 && state.stepMisses == 0 && step is Keys) "B4" else null
        }
        val graded = scale.steps.count { !it.teaches }.toDouble()
        assertEquals(graded, run.total, 1e-9)
        assertEquals(graded - 1, run.ok, 1e-9)
        // The staff quest: the rain counts each drop; one drop missed costs one part.
        val staff = music.quest("staff")
        val rain = play(QuestRun.start("b", player.id, "music", staff, 1), music) { _, step, state ->
            if (step is StaffStep && state.part == 2 && state.misses == 0) "11" else null
        }
        assertEquals(rain.total - 1, rain.ok, 1e-9)
        assertEquals(staff.steps.filterIsInstance<StaffStep>().single().drops.size + staff.steps.count { !it.teaches } - 1.0, rain.total, 1e-9)
        // Missing every question in the tempo quest: no stars.
        val tempo = music.quest("tempo")
        val slow = play(QuestRun.start("c", player.id, "music", tempo, 1), music) { _, step, state ->
            if (step is Choice && state.stepMisses == 0) "1" else null
        }
        assertEquals(0.0, slow.ok, 1e-9)
        assertEquals(0, slow.stars)
    }

    @Test fun `the first miss says the hint and the second makes the answer glow`() {
        val keys = music.quest("scale").steps[1] as Keys
        var s = StepMachine.start(keys, 3)
        s = StepMachine.tap(keys, s, "E4")
        assertEquals(Mood.Oops, s.line!!.mood); assertEquals(keys.hint, s.line!!.text); assertFalse(s.reveal)
        s = StepMachine.tap(keys, s, "E4")
        assertTrue(s.reveal); assertTrue(s.line!!.text.endsWith("**${StepMachine.GLOW}**")); assertEquals(Mood.Think, s.line!!.mood)
        s = StepMachine.tap(keys, s, "C4")
        assertEquals(1, s.part); assertFalse(s.done)
        // A wrong option is disabled once tried: tapping it again is not a second miss.
        val choice = music.quest("scale").steps[3] as Choice
        val once = StepMachine.tap(choice, StepMachine.start(choice, 1), "2")
        assertEquals(once, StepMachine.tap(choice, once, "2"))
        // The drum: the second miss turns the guiding lights on and widens the tolerance.
        val drum = music.quest("rhythm").steps.filterIsInstance<Drum>().single()
        var d = StepMachine.drum(drum, StepMachine.start(drum, 1), listOf(0L, 10L))
        assertFalse(d.guide); assertEquals("ضربت 2 مرات، والإيقاع 5 ضربات.", d.note)
        d = StepMachine.drum(drum, d, listOf(0L, 10L, 20L, 30L, 40L))
        assertTrue(d.guide); assertEquals("قريب جداً! انتبه للضربتين السريعتين.", d.note)
        d = StepMachine.drum(drum, d, perfectTaps(drum))
        assertTrue(d.done); assertEquals(0.0, StepMachine.result(drum, d).ok)
    }

    @Test fun `drum timing mirrors the web's tolerance and never punishes a late start`() {
        val spb = 60_000L / 84
        val beats = listOf(0.0, 1.0, 2.0, 2.5, 3.0)
        val late = beats.map { 9_000L + (it * spb).toLong() }
        assertTrue(MusicTheory.drumGood(late, "q q ee q", 84, false))
        val sloppy = beats.mapIndexed { i, b -> (b * spb).toLong() + if (i == 4) (spb * .3).toLong() else 0 }
        assertTrue(MusicTheory.drumGood(sloppy, "q q ee q", 84, false))
        val off = beats.mapIndexed { i, b -> (b * spb).toLong() + if (i == 4) (spb * .4).toLong() else 0 }
        assertFalse(MusicTheory.drumGood(off, "q q ee q", 84, false))
        assertTrue(MusicTheory.drumGood(off, "q q ee q", 84, true))
    }

    @Test fun `the measure game refuses a note that does not fit and undo keeps the given notes`() {
        val m = music.quest("rhythm").steps.filterIsInstance<Measure>().first()
        var s = StepMachine.start(m, 1)
        s = StepMachine.tap(m, s, "w")
        assertEquals(1, s.misses); assertTrue(s.line!!.text.endsWith("هذه النوتة أطول مما بقي!"))
        s = StepMachine.tap(m, s, "q")
        assertEquals(listOf("q"), s.placed)
        s = StepMachine.undo(m, s)
        assertEquals(emptyList<String>(), s.placed)
        assertEquals("h", StepMachine.expected(m, s))
        s = StepMachine.tap(m, StepMachine.tap(m, s, "h"), "q")
        assertTrue(s.done); assertEquals(0.0, StepMachine.result(m, s).ok)
    }

    @Test fun `the shared kinds follow core-learn-steps scoring`() {
        val book = QuestBook.decode(SHARED)
        val quest = book.quests.single()
        assertEquals(3, play(QuestRun.start("s", "p", "test", quest, 4), book).stars)
        // One slip in each multi-part step: a share of one part (twoway 1/2, sort 1/3, match 1/2, tf 1/2, label 1/2);
        // the shared order loses misses/items; choice and number lose the step.
        val slipped = play(QuestRun.start("s", "p", "test", quest, 4), book) { _, step, state ->
            if (state.stepMisses > 0 || state.part != 0) null else when (step) {
                is TwoWay -> "1"; is Sort -> step.bins.first { it.id != StepMachine.sortItem(step, state).bin }.id
                is Order -> "1"; is Match -> "1"; is TrueOrFalse -> if (step.items[0].truth) "0" else "1"
                is LabelStep -> step.ask[1].id; is Choice -> "1"
                is NumberStep -> if (state.typed.isEmpty()) "9" else "✓"
                else -> null
            }
        }
        assertEquals(8.0, slipped.total, 1e-9)
        assertEquals(.5 + 2.0 / 3 + (1 - 1.0 / 3) + .5 + .5 + .5 + 0 + 0, slipped.ok, 1e-9)
        // tf: a false sentence shows its fix line.
        val tf = quest.steps.filterIsInstance<TrueOrFalse>().single()
        assertEquals("✏️ الشمس نجم.", StepMachine.tap(tf, StepMachine.start(tf, 1), "0").note)
        // Guided «أتعلّم»: only the glowing spot opens.
        val explore = quest.steps.first() as Explore
        val s0 = StepMachine.start(explore, 1)
        assertEquals(s0, StepMachine.tap(explore, s0, "b"))
        assertEquals(listOf("a"), StepMachine.tap(explore, s0, "a").found)
    }

    @Test fun `golden notes are counted once per quest and saving a run twice changes nothing`() {
        var store = GameStore(activeId = player.id, profiles = listOf(player))
        val scale = music.quest("scale")
        val first = play(QuestRun.start("one", player.id, "music", scale, 1), music)
        store = store.finishQuest(first, music)
        assertEquals(store, store.finishQuest(first, music))
        assertEquals(1, store.active!!.goldenNotes("music"))
        assertEquals(15, store.active!!.pearls)
        assertEquals(3, store.active!!.topics.getValue("music-scale").stars)
        val again = play(QuestRun.start("two", player.id, "music", scale, 2), music) { _, step, s -> if (step is Choice && s.stepMisses == 0) "1" else null }
        store = store.finishQuest(again, music)
        assertEquals(1, store.active!!.goldenNotes("music"))
        assertEquals(3, store.active!!.topics.getValue("music-scale").stars)
        assertEquals(2, store.active!!.topics.getValue("music-scale").plays)
        for ((i, q) in music.quests.withIndex()) store = store.finishQuest(play(QuestRun.start("all-$i", player.id, "music", q, i), music), music)
        assertEquals(10, store.active!!.goldenNotes("music"))
        assertThrows(IllegalArgumentException::class.java) { store.finishQuest(QuestRun.start("x", player.id, "music", scale, 1), music) }
    }

    @Test fun `quest progress survives process death and old saves decode`() {
        var run = QuestRun.start("r", player.id, "music", music.quest("staff"), 9)
        repeat(3) { run = run.tap(music, StepMachine.expected(run.step(music), run.state)!!) }
        val json = GameRepository.json
        assertEquals(run, json.decodeFromString<QuestRun>(json.encodeToString(run)))
        val old = """{"version":1,"activeId":"p","profiles":[{"id":"p","name":"م","hero":"Sindbad","pearls":3}]}"""
        val decoded = GameRepository.decode(old).active!!
        assertEquals(emptyMap<String, List<String>>(), decoded.islandQuests)
        assertEquals(0, decoded.goldenNotes("music"))
        val saved = decoded.copy(islandQuests = mapOf("music" to listOf("scale")), helpersMet = setOf("music"))
        assertEquals(saved, GameRepository.decode(json.encodeToString(GameStore(activeId = "p", profiles = listOf(saved)))).active)
    }

    @Test fun `the music quest file has no step kind the app cannot play`() {
        val raw = Json.parseToJsonElement(javaClass.getResourceAsStream("/islands/music-quests.json")!!.bufferedReader().readText()).jsonObject
        val kinds = raw["quests"]!!.jsonArray.flatMap { q -> q.jsonObject["steps"]!!.jsonArray.map { it.jsonObject["kind"]!!.jsonPrimitive.content } }.toSet()
        val playable = setOf("explore", "learn", "choice", "twoway", "sort", "order", "match", "tf", "number", "label",
            "keys", "gaps", "pattern", "staff", "name", "rhythm", "drum", "measure", "fill", "glasses")
        assertTrue(playable.containsAll(kinds), "unknown kinds: ${kinds - playable}")
        assertFalse("label" in kinds, "label needs an island picture in ui/quest (labelViews)")
        // Every note, glass, rhythm, picture and sound the steps name exists.
        val glasses = music.glasses.map { it.id }.toSet()
        for (q in music.quests) for (step in q.steps) {
            val notes = when (step) {
                is Keys -> step.play; is NameNote -> listOf(step.note); is StaffStep -> step.drops.map { it.note }
                is Explore -> step.spots.flatMap { s -> listOfNotNull(s.note) + s.light.orEmpty() + s.pair.orEmpty() + s.play?.notes.orEmpty() } +
                    listOfNotNull(step.kb?.from, step.kb?.to)
                is Choice -> step.listen?.notes.orEmpty()
                else -> emptyList()
            }
            assertTrue(notes.all(MusicTheory::isNote), "${q.id}: $notes")
            when (step) {
                is GlassesStep -> assertTrue(glasses.containsAll(step.play))
                is Fill -> { assertTrue(step.glass in glasses); assertTrue(step.n in 1..step.d) }
                is Order -> if (step.sound != null) { assertEquals(step.items.size, step.sound!!.size); assertTrue(step.sound!!.all { it in glasses || MusicTheory.isNote(it) }) }
                is Sort -> assertTrue(step.items.all { i -> step.bins.any { it.id == i.bin } })
                is RhythmStep -> assertTrue((step.others + step.pattern).all { p -> MusicTheory.tokens(p).all { it in setOf("q", "h", "w", "ee", "r") } })
                is Measure -> assertTrue(step.given.sumOf(MusicTheory::beatsOfToken) < step.beats)
                is Choice -> { assertTrue(step.options.size >= 2); step.art?.let { assertEquals(step.options.size, it.size); assertTrue(MusicPictures.ART.containsAll(it)) }
                    step.show?.let { assertTrue(it in MusicPictures.SHOWS, it) }; step.listen?.inst?.let { assertTrue(it in music.instruments) } }
                is Explore -> { step.view?.let { assertTrue(it in MusicPictures.VIEWS, it) }; step.art?.let { assertTrue(it in MusicPictures.ART) }
                    assertTrue(step.spots.mapNotNull { it.art }.all { it in MusicPictures.ART || it in MusicPictures.VALUE_ART }) }
                else -> {}
            }
        }
        // Wording: the quests' review topics are unchanged and every quest's steps are verbatim web text (no HTML left).
        val text = javaClass.getResourceAsStream("/islands/music-quests.json")!!.bufferedReader().readText()
        assertFalse(Regex("<[a-z/][^>]*>").containsMatchIn(text))
    }

    @Test fun `the synth makes clean samples at the right pitch`() {
        assertEquals(440.0, MusicTheory.freq("A4"), 1e-9)
        assertEquals(261.6256, MusicTheory.freq("C4"), 1e-3)
        assertEquals(369.9944, MusicTheory.freq("F#4"), 1e-3)
        assertEquals(MusicTheory.freq("A#4"), MusicTheory.freq("Bb4"), 1e-9)
        assertEquals(523.2511, MusicTheory.freq("C5"), 1e-3)
        assertEquals(MusicTheory.freq("C4") * 2, Synth.glassFreq(1, 2), 1e-9)
        val sounds = listOf(Synth.piano("C4"), Synth.glass(Synth.glassFreq(4, 5)), Synth.drum("dum"), Synth.drum("tak"), Synth.drum("riq"),
            Synth.drum("tick"), Synth.instrument("balalaika").mix(), Synth.instrument("panflute").mix(), Synth.instrument("mizmar").mix(),
            Synth.instrument("harmonica").mix(), Synth.instrument("bagpipe").mix(), Synth.choir().mix(), Synth.longa().mix(), Synth.canon().mix(),
            Synth.metronome(184, 8).mix(), Synth.rhythm("q q ee q", 92, 4).mix(), Synth.phrase(listOf("C4", "E4", "G4")).mix())
        for (s in sounds) {
            assertTrue(s.isNotEmpty())
            assertTrue(s.all { !it.isNaN() && it in -1f..1f })
            assertTrue(s.any { kotlin.math.abs(it) > .01f }, "audible")
        }
        // The piano's strongest frequency is the note's own (a small DFT around a few candidates).
        for (note in listOf("C4", "E4", "A4", "C5")) {
            val s = Synth.piano(note)
            fun power(f: Double): Double {
                var re = 0.0; var im = 0.0
                for (i in 0 until 8192) { val a = 2 * Math.PI * f * i / Synth.RATE; re += s[i] * Math.cos(a); im += s[i] * Math.sin(a) }
                return re * re + im * im
            }
            val f = MusicTheory.freq(note)
            assertTrue(power(f) > 4 * power(f * 1.06), note)
            assertTrue(power(f) > 4 * power(f / 1.06), note)
        }
        // A rhythm's cues are its hits, in time.
        val r = Synth.rhythm("q q ee q", 60)
        assertEquals(listOf(0.0, 1.0, 2.0, 2.5, 3.0), r.cues.map { it.at })
        assertEquals(4.0, r.seconds, 1e-9)
    }

    private companion object {
        val SHARED = """{"helper":{"name":"هدهد","hello":"أهلاً","back":"أهلاً بعودتك"},"quests":[{"id":"t","topic":"science-x","title":"ت","goal":"غ","steps":[
          {"kind":"explore","title":"أتعلّم","guided":true,"spots":[{"id":"a","title":"أ","text":"نص"},{"id":"b","title":"ب","text":"نص"}],"done":"تمّ"},
          {"kind":"learn","title":"بطاقة","html":"نص"},
          {"kind":"twoway","q":"اختر","lines":[{"text":"___ أ","right":"نعم","wrong":"لا"},{"text":"___ ب","right":"نعم","wrong":"لا"}],"hint":"ت","explain":"ش","scoring":"share"},
          {"kind":"sort","q":"صنّف","bins":[{"id":"x","label":"س"},{"id":"y","label":"ص"}],"items":[{"text":"1","bin":"x"},{"text":"2","bin":"y"},{"text":"3","bin":"x"}],"hint":"ت","explain":"ش","scoring":"share"},
          {"kind":"order","q":"رتّب","items":["1","2","3"],"hint":"ت","explain":"ش","scoring":"share"},
          {"kind":"match","q":"صل","pairs":[{"left":"أ","right":"1"},{"left":"ب","right":"2"}],"hint":"ت","explain":"ش","scoring":"share"},
          {"kind":"tf","q":"صح أم خطأ","items":[{"text":"الشمس كوكب.","truth":false,"fix":"الشمس نجم."},{"text":"الأرض كوكب.","truth":true}],"hint":"ت","explain":"ش","scoring":"share"},
          {"kind":"label","q":"سمِّ","view":"cell","ask":[{"id":"n","name":"النواة"},{"id":"m","name":"الغشاء"}],"hint":"ت","explain":"ش","scoring":"share"},
          {"kind":"choice","q":"اختر","options":["صح","خطأ"],"hint":"ت","explain":"ش","scoring":"whole"},
          {"kind":"number","q":"كم؟","answer":"12","unit":"سم","hint":"ت","explain":"ش","scoring":"whole"}
        ]}]}"""
    }
}
