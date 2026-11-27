package org.sindibad.android

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import org.sindibad.android.domain.english.*
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.english.EnglishArt
import org.sindibad.android.ui.english.EnglishKit
import org.sindibad.android.ui.english.PLANET_X
import org.sindibad.android.ui.english.blockOf
import org.sindibad.android.ui.english.looksOf
import org.sindibad.android.ui.english.markWord
import org.sindibad.android.ui.science.drawnParts
import org.sindibad.android.ui.science.partBox

class EnglishQuestTest {
    private val english = QuestBooks.get("english")
    private val player = Profile("p", "مغامر", Hero.Sindbad)

    /** Plays a run to the end with the right answer every time; `slip` may return a wrong value first. */
    private fun play(run0: QuestRun, slip: (Int, Step, StepState) -> String? = { _, _, _ -> null }): QuestRun {
        var run = run0
        var guard = 0
        while (!run.finished) {
            check(guard++ < 5000) { "stuck at step ${run.index}" }
            val step = run.step(english)
            if (run.state.done) { run = run.next(english); continue }
            val wrong = slip(run.index, step, run.state)
            run = if (wrong != null) run.tap(english, wrong)
                else run.tap(english, requireNotNull(StepMachine.expected(step, run.state)) { "${step::class.simpleName} at ${run.index}" })
        }
        return run
    }
    private fun start(id: String, quest: Quest, seed: Int = 7) = QuestRun.start(id, player.id, "english", quest, seed)
    private fun stepOf(quest: String, kind: (Step) -> Boolean): Pair<Quest, Int> {
        val q = english.quest(quest)
        return q to q.steps.indexOfFirst(kind)
    }
    /** A step's state played right up to its first part (as the quest player opens it). */
    private fun fresh(seed: Int = 7) = StepState(seed)

    // ---------- The book ----------

    @Test fun `the twenty-four English quests and twelve places decode, and each can be finished with three stars`() {
        assertEquals(24, english.quests.size)
        assertEquals(12, english.stations.size)
        assertEquals(listOf("harbour", "theatre", "aquarium", "arts", "hospital", "park", "farm", "souq", "garden", "school", "square", "space"), english.stations.map { it.id })
        assertEquals(listOf(1, 2, 3, 4), english.blocks.map { it.n })
        assertEquals(20, english.units.size)
        assertEquals(mapOf(1 to 4, 2 to 3, 3 to 3, 4 to 2), english.stations.groupBy(::blockOf).mapValues { it.value.size })
        assertEquals("بولي", english.helper.name)
        for (quest in english.quests) {
            assertNotNull(english.stations.singleOrNull { it.id == quest.station }, quest.id)
            assertEquals("english-${quest.id}", quest.topic)
            assertTrue(Topics.inRegion("english").any { it.id == quest.topic }, "the old lesson stays: ${quest.topic}")
            assertTrue(quest.steps.first().teaches, "teach first: ${quest.id}")
            for (seed in listOf(1, 7, 4242)) {
                val run = play(start("r-${quest.id}-$seed", quest, seed))
                assertTrue(run.total >= 1, quest.id)
                assertEquals(run.total, run.ok, 1e-9, "${quest.id} seed $seed")
                assertEquals(3, run.stars, quest.id)
            }
        }
    }

    @Test fun `every graded step comes after a teaching step and has a hint`() {
        for (quest in english.quests) for ((i, step) in quest.steps.withIndex()) {
            if (step.teaches) continue
            assertTrue(quest.steps.take(i).any { it.teaches }, "${quest.id} step $i")
            assertFalse(step.hint.isNullOrBlank(), "${quest.id} step $i hint")
        }
    }

    @Test fun `the English quest file has only kinds the app plays, no HTML, and balanced direction marks`() {
        val text = javaClass.getResourceAsStream("/islands/english-quests.json")!!.bufferedReader().readText()
        val raw = Json.parseToJsonElement(text).jsonObject
        val kinds = raw["quests"]!!.jsonArray.flatMap { q -> q.jsonObject["steps"]!!.jsonArray.map { it.jsonObject["kind"]!!.jsonPrimitive.content } }
        val known = setOf("explore", "learn", "choice", "twoway", "sort", "order", "match", "tf", "number", "label",
            "listen", "picture", "build", "spell", "verb", "memory", "odd", "rank", "adjorder", "chat")
        assertTrue(known.containsAll(kinds.toSet()), "unhandled kinds: ${kinds.toSet() - known}")
        // Every games.ts kind is used and decodes to its native game.
        assertTrue(kinds.toSet().containsAll(known - setOf("learn")), "kinds not in the book: ${known - kinds.toSet()}")
        assertEquals(kinds.size, english.quests.sumOf { it.steps.size })
        assertFalse(Regex("<[a-z/][^>]*>").containsMatchIn(text), "no HTML")
        fun strings(e: JsonElement): List<String> = when (e) {
            is JsonPrimitive -> if (e.isString) listOf(e.content) else emptyList()
            is JsonArray -> e.flatMap(::strings)
            is JsonObject -> e.values.flatMap(::strings)
        }
        val all = strings(raw)
        for (s in all) assertTrue(Bidi.balanced(s), s)
        assertTrue(all.any { Bidi.LRI in it }, "English inside Arabic is isolated")
        // The other islands' books carry no isolates (their text is unchanged).
        for (region in listOf("music", "science", "social")) {
            val other = javaClass.getResourceAsStream("/islands/$region-quests.json")!!.bufferedReader().readText()
            assertFalse(other.any { it in Bidi.LRI..Bidi.PDI }, region)
        }
    }

    @Test fun `English stickers are in the book and no sticker id is shared between islands`() {
        assertEquals(listOf("continents", "bosra", "bluewhale", "childday", "palmyra", "saturn"), english.stickers.map { it.id })
        for (q in english.quests) q.sticker?.let { assertNotNull(english.sticker(it), q.id) }
        val ids = QuestBooks.regions.flatMap { QuestBooks.get(it).stickers.map { s -> s.id } }
        assertEquals(ids.size, ids.toSet().size)
    }

    // ---------- Scoring and the tracker ----------

    @Test fun `a slip in a listening round loses that round only, and the reveal rule holds`() {
        val (quest, li) = stepOf("country") { it is Listen }
        val listen = quest.steps[li] as Listen
        val n = EnglishGames.parts(listen)
        assertEquals(5, n)
        var s = fresh()
        val right = EnglishGames.expected(listen, s)!!
        val wrong = EnglishGames.options(listen, s).map { it.toString() }.first { it != right }
        s = EnglishGames.tap(listen, s, wrong)
        assertEquals(Mood.Oops, s.line!!.mood); assertEquals(listen.hint, s.line!!.text); assertFalse(s.reveal)
        assertEquals(s, EnglishGames.tap(listen, s, wrong), "a tried option is disabled")
        val wrong2 = EnglishGames.options(listen, s).map { it.toString() }.first { it != right && it != wrong }
        s = EnglishGames.tap(listen, s, wrong2)
        assertTrue(s.reveal); assertTrue(s.line!!.text.endsWith("**${StepMachine.GLOW}**"))
        s = EnglishGames.tap(listen, s, right)
        assertFalse(s.reveal, "the next round starts unlit"); assertEquals(1, s.part)
        assertTrue(s.note!!.contains(Bidi.en(listen.items[right.toInt()].en)))
        while (!s.done) s = EnglishGames.tap(listen, s, EnglishGames.expected(listen, s)!!)
        assertEquals((n - 1.0) / n, StepMachine.result(listen, s).ok, 1e-9)
        // Whole quests: one slipped round, the rest perfect.
        val run = play(start("slip", quest)) { i, _, st -> if (i == li && st.part == 0 && st.stepMisses == 0) wrong else null }
        assertEquals(run.total - 1.0 / n, run.ok, 1e-9)
    }

    @Test fun `the rounds, options and tiles are the same for the same seed and change with it`() {
        val listen = english.quest("country").steps.first { it is Listen } as Listen
        assertEquals(EnglishGames.rounds(listen, fresh(3)), EnglishGames.rounds(listen, fresh(3)))
        assertNotEquals((1..20).map { EnglishGames.rounds(listen, fresh(it)) }.toSet().size, 1)
        for (seed in 1..30) {
            val s = fresh(seed)
            val opts = EnglishGames.options(listen, s)
            assertEquals(4, opts.size); assertEquals(opts.size, opts.toSet().size)
            assertTrue(EnglishGames.asked(listen, s) in opts)
        }
    }

    @Test fun `build takes the tiles in order, a wrong tile is a miss and may be tried later`() {
        val build = english.quest("country").steps.first { it is Build } as Build
        var s = fresh()
        val tiles = EnglishGames.buildTiles(build, 0)
        assertEquals(listOf("Andrea", "is", "from", "Italy."), tiles)
        val order = EnglishGames.buildOrder(build, s)
        assertNotEquals(order, order.sorted(), "never shown already in order")
        s = EnglishGames.tap(build, s, "2")
        assertEquals(1, s.stepMisses); assertTrue(s.placed.isEmpty()); assertTrue(s.wrong.isEmpty(), "not disabled")
        s = EnglishGames.tap(build, s, "0"); s = EnglishGames.tap(build, s, "1")
        assertEquals(listOf("0", "1"), s.placed)
        s = EnglishGames.tap(build, s, "1"); assertEquals(listOf("0", "1"), s.placed, "a placed tile cannot be placed twice")
        s = EnglishGames.tap(build, s, "2"); s = EnglishGames.tap(build, s, "3")
        assertEquals(1, s.part); assertTrue(s.placed.isEmpty())
        assertEquals("✔ ${Bidi.en("Andrea is from Italy.")} — أندريا من إيطاليا.", s.note)
    }

    @Test fun `adjectives go in the book's order, opinion size shape age colour, and are always shown mixed`() {
        val adj = english.quests.flatMap { it.steps }.first { it is AdjOrder } as AdjOrder
        for (it in adj.items) {
            val cats = EnglishGames.adjCats(it)
            val rank = EnglishGames.CAT_AR.keys.toList()
            assertEquals(cats.map(rank::indexOf).sorted(), cats.map(rank::indexOf), "${it.adjs}")
        }
        for (seed in 1..40) for (part in adj.items.indices) {
            val order = EnglishGames.adjOrder(adj, StepState(seed, part = part))
            assertNotEquals(order.indices.toList(), order, "seed $seed part $part")
        }
        assertEquals("colour", EnglishGames.catOf("Blond")); assertEquals("opinion", EnglishGames.catOf("unknown"))
    }

    @Test fun `spelling accepts either copy of a doubled letter and refuses a letter out of order`() {
        val spell = english.quest("bigblue").steps.first { it is Spell } as Spell
        val turtle = spell.items.indexOfFirst { it.en == "turtle" }
        var s = StepState(5, part = turtle)
        val pool = EnglishGames.letters(spell, s)
        assertEquals("turtle".length + (spell.extra ?: 2), pool.size)
        assertTrue(pool.count { it == 't' } >= 2)
        val ts = pool.indices.filter { pool[it] == 't' }
        // The second t first: still right.
        s = EnglishGames.tap(spell, s, ts[1].toString()); assertEquals(1, s.placed.size); assertEquals(0, s.stepMisses)
        val notU = pool.indices.first { pool[it] != 'u' && it.toString() !in s.placed }
        s = EnglishGames.tap(spell, s, notU.toString()); assertEquals(1, s.stepMisses); assertEquals(1, s.placed.size)
        while (s.part == turtle && !s.done) s = EnglishGames.tap(spell, s, EnglishGames.expected(spell, s)!!)
        assertEquals("✔ ${Bidi.en("turtle")}", s.note)
        // The extra letters are not in the word.
        val extra = pool.toMutableList(); "turtle".forEach { extra.remove(it) }
        assertTrue(extra.none { it in "turtle" })
    }

    @Test fun `verb, odd and chat take one right option per round, wrong ones are disabled`() {
        val verb = english.quest("bigblue").steps.first { it is Verb } as Verb
        var v = EnglishGames.tap(verb, fresh(), "1")
        assertEquals(listOf("1"), v.wrong); assertEquals(v, EnglishGames.tap(verb, v, "1"))
        v = EnglishGames.tap(verb, v, "0")
        assertEquals("✔ ${Bidi.en("Seahorses live in the sea.")}", v.note)

        val odd = english.quest("arts").steps.first { it is Odd } as Odd
        assertEquals("model", odd.rows[0].words[EnglishGames.expected(odd, fresh())!!.toInt()])
        val o = EnglishGames.tap(odd, fresh(), EnglishGames.expected(odd, fresh())!!)
        assertTrue(o.note!!.startsWith("✏️ "))

        val chat = english.quest("country").steps.first { it is Chat } as Chat
        assertEquals("B", EnglishGames.me(chat))
        var c = fresh()
        val shown0 = EnglishGames.chatShown(chat, c)
        assertEquals(listOf("A" to "Where are you from?"), shown0, "the conversation stops at the child's first line")
        c = EnglishGames.tap(chat, c, "2"); assertEquals(1, c.stepMisses)
        c = EnglishGames.tap(chat, c, "0")
        assertEquals(shown0 + ("B" to "I am from Egypt."), EnglishGames.chatShown(chat, c).take(2))
        while (!c.done) c = EnglishGames.tap(chat, c, "0")
        assertEquals(chat.lines.size, EnglishGames.chatShown(chat, c).size, "every line once done")
        assertTrue(Bidi.balanced(EnglishGames.chatAsk(chat.copy(q = null))))
    }

    @Test fun `rank scores one minus misses over items, and an item already placed cannot be tapped`() {
        val rank = english.quest("solar").steps.first { it is Rank } as Rank
        val n = rank.items.size
        var s = fresh()
        s = EnglishGames.tap(rank, s, "0")
        assertEquals(s, EnglishGames.tap(rank, s, "0"))
        s = EnglishGames.tap(rank, s, "3"); s = EnglishGames.tap(rank, s, "4")
        while (!s.done) s = EnglishGames.tap(rank, s, s.part.toString())
        assertEquals(1.0 - 2.0 / n, StepMachine.result(rank, s).ok, 1e-9)
    }

    @Test fun `memory counts a slip only when the partner card was already seen, and the first slip gives the hint`() {
        val memory = english.quest("theatre").steps.first { it is Memory } as Memory
        val cards = EnglishGames.cards(memory, 7)
        assertEquals(memory.pairs.size * 2, cards.size)
        var s = fresh()
        // Two cards never seen that do not match: no slip, both stay up until the next tap.
        val a = 0
        val b = cards.indices.first { it != a && cards[it].k != cards[a].k }
        s = EnglishGames.tap(memory, s, "$a"); s = EnglishGames.tap(memory, s, "$b")
        assertEquals(0, s.stepMisses); assertEquals(listOf(a, b), s.shown); assertNull(s.open)
        // Now card a's partner, then a card that is not b: a slip (a was seen), the hint is said.
        val pa = EnglishGames.partner(cards, a)
        val c = cards.indices.first { it !in listOf(a, b, pa) && cards[it].k != cards[pa].k }
        s = EnglishGames.tap(memory, s, "$pa")
        assertTrue(s.shown.isEmpty(), "the open pair turned back")
        s = EnglishGames.tap(memory, s, "$c")
        assertEquals(1, s.stepMisses); assertEquals(Mood.Oops, s.line!!.mood); assertEquals(memory.hint, s.line!!.text)
        assertFalse(s.reveal, "memory never lights the answer")
        // A pair found stays found; tapping it does nothing.
        s = EnglishGames.tap(memory, s, "$a"); s = EnglishGames.tap(memory, s, "$pa")
        assertEquals(setOf("$a", "$pa"), s.found.toSet()); assertEquals(1, s.part)
        assertEquals(s.copy(shown = emptyList()), EnglishGames.tap(memory, s, "$a"))
        while (!s.done) s = EnglishGames.tap(memory, s, EnglishGames.expected(memory, s)!!)
        val pairs = memory.pairs.size
        assertEquals((pairs - 1.0) / pairs, StepMachine.result(memory, s).ok, 1e-9)
    }

    @Test fun `the step machine runs English steps and leaves the other kinds alone`() {
        val build = english.quest("country").steps.first { it is Build } as Build
        val s = StepMachine.tap(build, fresh(), "0")
        assertEquals(EnglishGames.tap(build, fresh(), "0"), s)
        assertEquals(EnglishGames.parts(build), StepMachine.parts(build))
        assertEquals(EnglishGames.expected(build, fresh()), StepMachine.expected(build, fresh()))
        val done = StepMachine.tap(build, fresh().copy(done = true), "0")
        assertTrue(done.done)
    }

    // ---------- No voice ----------

    @Test fun `without an English voice every listening round shows its word and an Arabic note, and runs finish`() {
        for (q in english.quests) for (step in q.steps.filterIsInstance<EnglishGame>().filter { it is Listen || it is PictureGame }) {
            var s = fresh(11)
            while (!s.done) {
                val noVoice = EnglishGames.prompt(step, s, voice = false)
                val withVoice = EnglishGames.prompt(step, s, voice = true)
                if (step is Listen) {
                    assertTrue(noVoice.showWord, q.id); assertEquals(EnglishGames.NO_VOICE, noVoice.note)
                    assertFalse(withVoice.showWord); assertNull(withVoice.note)
                } else {
                    assertNull(noVoice.note)
                    assertEquals(noVoice.mode != "word", noVoice.showWord)
                }
                assertTrue(noVoice.word.isNotBlank())
                s = EnglishGames.tap(step, s, EnglishGames.expected(step, s)!!)
            }
            assertEquals(1.0, StepMachine.result(step, s).ok, 1e-9)
        }
        assertTrue(EnglishGames.NO_VOICE.contains("لا يوجد صوت إنكليزي"))
    }

    @Test fun `the offline British or American voice is picked first, never one that needs the network`() {
        val v = { l: String, c: String, net: Boolean, inst: Boolean -> VoicePick.Voice(l, c, net, inst) }
        val list = listOf(v("ar", "SY", false, true), v("en", "US", true, true), v("en", "IN", false, true), v("en", "GB", false, false), v("en", "GB", false, true))
        assertEquals(list[4], VoicePick.choose(list) { it })
        assertEquals(list[2], VoicePick.choose(list.take(4)) { it })
        assertNull(VoicePick.choose(list.take(2)) { it })
        assertNull(VoicePick.choose(emptyList<VoicePick.Voice>()) { it })
    }

    // ---------- Direction ----------

    @Test fun `the bidi helper isolates English inside Arabic and tells English text`() {
        assertEquals("\u2066Hi\u2069", Bidi.en("Hi"))
        assertTrue(Bidi.isEnglish("What is your nationality?"))
        assertFalse(Bidi.isEnglish("ما جنسيّتك؟"))
        assertTrue(Bidi.isEnglish("بلد country"), "the web rule: Latin letters at least twice the Arabic ones")
        assertFalse(Bidi.isEnglish("الكلمة country تعني بلد"))
        assertTrue(Bidi.isEnglish("\u2066country\u2069 بلد"))
        assertFalse(Bidi.isEnglish("123")); assertFalse(Bidi.isEnglish(null))
        assertEquals("Listen to me!", Bidi.plain("\u2066Listen to **me**!\u2069"))
        assertEquals("أنت \u2066Omar.\u2069", Bidi.mixed("أنت Omar."), "a closing full stop stays with the English run")
        assertEquals("أنت \u2066Omar\u2069.", Bidi.mixed("أنت \u2066Omar\u2069."), "already isolated text is kept")
        assertEquals("Just English.", Bidi.mixed("Just English."))
        assertTrue(Bidi.balanced(Bidi.mixed("قل Hello ثم Good morning يا Omar!")))
        assertFalse(Bidi.balanced("\u2066a")); assertFalse(Bidi.balanced("a\u2069"))
        assertEquals("\u2066tall\u2069 — طويل", Bidi.gloss("tall", "طويل"))
    }

    // ---------- Rewards ----------

    @Test fun `the HELLO sign lights a star per quest once, a letter per five, and stickers come once`() {
        var store = GameStore(activeId = player.id, profiles = listOf(player))
        val country = english.quest("country")
        assertEquals("continents", country.sticker)
        val first = play(start("one", country))
        store = store.finishQuest(first, english)
        assertEquals(store, store.finishQuest(first, english), "saving the same run again changes nothing")
        assertEquals(1, HelloSign.bulbs(store.active!!)); assertEquals(0, HelloSign.letters(1))
        assertEquals(listOf("continents"), store.active!!.stickers)
        store = store.finishQuest(play(start("two", country, 2)), english)
        assertEquals(1, HelloSign.bulbs(store.active!!)); assertEquals(listOf("continents"), store.active!!.stickers)
        for ((i, q) in english.quests.withIndex()) {
            store = store.finishQuest(play(start("all-$i", q, i + 1)), english)
            if (i + 1 in HelloSign.THRESHOLDS) assertEquals(HelloSign.THRESHOLDS.indexOf(i + 1) + 1, HelloSign.letters(HelloSign.bulbs(store.active!!)))
        }
        assertEquals(24, HelloSign.bulbs(store.active!!)); assertEquals(5, HelloSign.letters(24))
        assertEquals(english.stickers.map { it.id }.toSet(), store.active!!.stickers.toSet())
        assertEquals(6, store.active!!.stickers.size)
        assertEquals(0, store.active!!.crystals(), "no science crystals")
        assertEquals(listOf(0, 0, 1, 1, 2, 3, 4, 5), listOf(0, 4, 5, 9, 10, 15, 20, 24).map(HelloSign::letters))
    }

    // ---------- The word book ----------

    @Test fun `words met in opened or finished quests, each once, in the book's order`() {
        assertTrue(WordBook.met(english, player).isEmpty())
        val p = player.meetQuest("theatre").meetQuest("country").meetQuest("country")
        assertEquals(listOf("theatre", "country"), p.englishSeen)
        val groups = WordBook.met(english, p)
        assertEquals(listOf("country", "theatre"), groups.map { it.quest!!.id })
        val all = groups.flatMap { it.words }.map { it.en.lowercase() }
        assertEquals(all.size, all.toSet().size)
        // rev1 repeats words of its units: none of them twice.
        val withReview = WordBook.met(english, p.copy(islandQuests = mapOf(ENGLISH to listOf("rev1"))))
        val again = withReview.flatMap { it.words }.map { it.en.lowercase() }
        assertEquals(again.size, again.toSet().size)
        assertEquals(WordBook.wordsOf(english.quest("country")).first(), groups.first().words.first())
    }

    @Test fun `stars add and remove a word once, whatever its case, and keep old entries`() {
        val (quest, word) = WordBook.find(english, "Country")!!
        assertEquals("country", quest.id)
        val e = WordBook.entry(word, quest)
        assertEquals(Vocabulary("country", "بلد", word.ex, word.pic, "country"), e)
        var p = player.saveWord(e).saveWord(e.copy(en = "COUNTRY"))
        assertEquals(1, p.wordBook.size); assertTrue(p.hasWord(" Country "))
        p = p.forgetWord("country"); assertTrue(p.wordBook.isEmpty())
        assertEquals(5, player.cardStreak(5).cardStreak(3).wordCardsBest)
    }

    @Test fun `an old save with a flat word book decodes, and its words keep their place in the new book`() {
        val old = """{"version":1,"activeId":"p","profiles":[{"id":"p","name":"م","hero":"Sindbad","wordBook":[
            {"en":"country","ar":"بلد","sentence":"Syria is my country."},
            {"en":"zebra","ar":"حمار وحشي","sentence":"A zebra has stripes."}]}]}"""
        val decoded = GameRepository.decode(old).active!!
        assertEquals(2, decoded.wordBook.size)
        assertEquals("Syria is my country.", decoded.wordBook[0].sentence)
        assertNull(decoded.wordBook[0].pic); assertNull(decoded.wordBook[0].quest)
        assertEquals(emptyList<String>(), decoded.englishSeen); assertEquals(0, decoded.wordCardsBest)
        val saved = WordBook.saved(english, decoded)
        assertEquals(listOf("country", null), saved.map { it.quest?.id }, "found words by their quest, the others last")
        assertEquals("Syria is my country.", saved[0].words.single().ex, "the child's own sentence is kept")
        assertEquals(WordBook.find(english, "country")!!.second.pic, saved[0].words.single().pic)
        assertEquals("zebra", saved[1].words.single().en)
        // Saved again and read back: nothing lost.
        val json = GameRepository.json
        val again = decoded.copy(englishSeen = listOf("country"), wordCardsBest = 4).saveWord(WordBook.entry(WordBook.find(english, "ticket")!!.second, english.quest("theatre")))
        assertEquals(again, GameRepository.decode(json.encodeToString(GameStore(activeId = "p", profiles = listOf(again)))).active)
        // A doubled quest in englishSeen or a negative streak is refused.
        assertThrows(IllegalArgumentException::class.java) {
            GameRepository.decode(json.encodeToString(GameStore(activeId = "p", profiles = listOf(again.copy(englishSeen = listOf("country", "country"))))))
        }
        assertThrows(IllegalArgumentException::class.java) {
            GameRepository.decode(json.encodeToString(GameStore(activeId = "p", profiles = listOf(again.copy(wordCardsBest = -1)))))
        }
    }

    @Test fun `flash cards need four words and offer three different English words with the right one`() {
        val p = player.meetQuest("country")
        val pool = WordBook.practice(english, p)
        assertTrue(pool.size >= WordBook.CARDS_MIN)
        assertTrue(WordBook.practice(english, player).size < WordBook.CARDS_MIN)
        for (seed in 1..50) {
            val c = WordBook.card(pool, seed)
            assertEquals(3, c.options.size); assertTrue(c.word in c.options)
            assertEquals(3, c.options.map { it.en.lowercase() }.toSet().size)
        }
        // Saved words join the cards even from quests not opened.
        val zebra = player.saveWord(Vocabulary("zebra", "حمار وحشي", "A zebra has stripes."))
        assertEquals(listOf("zebra"), WordBook.practice(english, zebra).map { it.en })
    }

    // ---------- Pictures ----------

    @Test fun `every picture a step or a word names is drawn natively, with a touch target for every part`() {
        val parts = english.views.associateBy { it.name }
        assertEquals(parts.keys, EnglishArt.VIEWS.map { it.name }.toSet(), "native pictures = the web's pictures")
        val pics = mutableListOf<Pair<String, String>>()
        for (q in english.quests) for ((i, step) in q.steps.withIndex()) {
            val where = "${q.id} step $i"
            when (step) {
                is Explore -> {
                    step.words?.forEach { pics += where to it.pic }
                    step.spots.forEach { s -> s.art?.let { pics += where to it }; s.icon?.let { pics += where to it } }
                    when (step.view) {
                        "words" -> assertNotNull(step.words, where)
                        "rule" -> assertNotNull(step.rule, where)
                        "read" -> { assertNotNull(step.read, where); assertEquals(step.read!!.gloss.size, step.spots.size, where) }
                        null -> {}
                        else -> {
                            assertTrue(EnglishArt.hasView(step.view), "$where: ${step.view}")
                            assertEquals(step.spots.map { it.id }.toSet(), drawnParts(english, step.view, step.spots.map { it.id }), "$where: every spot is drawn")
                        }
                    }
                }
                is LabelStep -> {
                    assertTrue(EnglishArt.hasView(step.view), "$where: ${step.view}")
                    assertEquals(step.ask.map { it.id }.toSet(), drawnParts(english, step.view, step.ask.map { it.id }), where)
                }
                is Listen -> step.items.forEach { pics += where to it.pic }
                is PictureGame -> step.items.forEach { pics += where to it.pic }
                is Spell -> step.items.forEach { it.pic?.let { p -> pics += where to p } }
                is Rank -> step.items.forEach { it.pic?.let { p -> pics += where to p } }
                is Memory -> step.pairs.forEach { listOf(it.a, it.b).filter(EnglishArt::isPicture).forEach { p -> pics += where to p } }
                else -> {}
            }
        }
        assertTrue(pics.any { it.second.startsWith("art:") } && pics.any { it.second.startsWith("p:") })
        for ((where, p) in pics) assertTrue(EnglishArt.has(p), "$where: $p")
        for (v in english.views) for (p in v.spots) {
            val b = partBox(p)!!
            assertTrue(b[2] > 0 && b[3] > 0, "${v.name}.${p.id}")
            assertNotNull(p.label, "${v.name}.${p.id} has a label place")
        }
        assertEquals(listOf("sun") + PLANET_X.keys, english.views.single { it.name == "planets" }.spots.map { it.id })
        assertFalse(EnglishArt.has("art:dragon")); assertFalse(EnglishArt.has("p:robot")); assertFalse(EnglishArt.has("cat"))
    }

    @Test fun `a person spec reads its looks, and a word is marked in its sentence`() {
        val l = looksOf("girl,tall,slim,longhair,curly,blond,blueeyes,glasses")
        assertEquals("girl", l.who); assertEquals(100f, l.height); assertEquals(16f, l.body)
        assertEquals("blond", l.hair); assertEquals("blueeyes", l.eyes); assertTrue(l.longHair); assertEquals("curly", l.style); assertTrue(l.glasses)
        val g = looksOf("grandpa,short,plump")
        assertEquals("grey", g.hair); assertFalse(g.longHair); assertEquals(70f, g.height); assertEquals(30f, g.body)
        val m = markWord("Seahorses live in the sea.", "seahorse")
        assertEquals("Seahorses live in the sea.", m.text)
        assertEquals(1, m.spanStyles.size); assertEquals(0, m.spanStyles[0].start); assertEquals(9, m.spanStyles[0].end)
        assertEquals(0, markWord("Nothing here.", "zebra").spanStyles.size)
    }

    @Test fun `the right answer is read aloud, the word, the sentence or the picked line`() {
        val country = english.quest("country")
        val build = country.steps.first { it is Build } as Build
        assertEquals("Andrea is from Italy.", EnglishKit.spoken(build, fresh(), fresh().copy(part = 1)))
        val verb = english.quest("bigblue").steps.first { it is Verb } as Verb
        assertEquals("Seahorses live in the sea.", EnglishKit.spoken(verb, fresh(), fresh()))
        val chat = country.steps.first { it is Chat } as Chat
        assertEquals("I am from Egypt.", EnglishKit.spoken(chat, fresh(), fresh()))
        val listen = country.steps.first { it is Listen } as Listen
        assertEquals(listen.items[EnglishGames.asked(listen, fresh())].en, EnglishKit.spoken(listen, fresh(), fresh()))
        assertNull(EnglishKit.spoken(country.steps.first { it is Explore }, fresh(), fresh()))
    }
}
