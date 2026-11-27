package org.sindibad.android

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*

class FarmPlayTest {
    private val book = FarmBook.book
    private val json = GameRepository.json

    private fun placeOf(q: FarmQuest) = if (q.crop) "plot-0" else q.place

    /** Play every job of the run at [place] right first time (solving each small choice). */
    private fun Barn.playSteps(place: String): Barn {
        var barn = this
        var guard = 0
        while (true) {
            val run = barn.runs.getValue(place)
            val q = book.quest(run.quest)
            if (run.phase(q) != FarmPhase.Steps) return barn
            check(guard++ < 100)
            val tool = run.need(q).first()
            barn = barn.act(place, tool)
            barn = barn.solvePick(place)
        }
    }

    private fun Barn.solvePick(place: String): Barn {
        var barn = this
        val run = barn.runs.getValue(place)
        val tool = run.picking ?: return barn
        val q = book.quest(run.quest)
        val pick = q.steps[run.step].pickFor(tool)!!
        when (pick.type) {
            "choice", "find" -> barn = barn.pickTap(place, pick.options.indexOfFirst { it.ok })
            "all" -> pick.options.indices.filter { pick.options[it].ok }.forEach { barn = barn.pickTap(place, it) }
            "order" -> pick.options.indices.forEach { barn = barn.pickTap(place, it) }
            "oneEach" -> { pick.groups.keys.forEach { g -> barn = barn.pickTap(place, pick.options.indexOfFirst { it.group == g }) }; barn = barn.pickSubmit(place) }
            "dial" -> {
                while (barn.runs.getValue(place).dial != pick.target) {
                    val diff = pick.target - barn.runs.getValue(place).dial
                    barn = barn.pickDial(place, if (kotlin.math.abs(diff) >= 10) 10 * Integer.signum(diff) else Integer.signum(diff))
                }
                barn = barn.pickSubmit(place)
            }
        }
        assertNull(barn.runs.getValue(place).picking, "${q.id} ${pick.type}")
        return barn
    }

    private fun GameStore.answerAll(id: String, place: String, right: Boolean = true): GameStore {
        var store = this
        while (true) {
            val run = store.active!!.barn.runs.getValue(place)
            if (run.reviewIndex >= run.review.size) return store
            val question = Topics.get(book.quest(run.quest).topic).questions.first { it.id == run.review[run.reviewIndex] }
            val wrong = question.choices.indices.first { it !in question.answer }
            store = store.updateProfile(id) { p -> p.copy(barn = p.barn.answer(place, if (right) question.answer.single() else wrong, question)) }
            if (!store.active!!.barn.runs.getValue(place).reviewResolved)
                store = store.updateProfile(id) { p -> p.copy(barn = p.barn.answer(place, question.answer.single(), question)) }
            store = store.updateProfile(id) { p -> p.copy(barn = p.barn.nextReview(place)) }
        }
    }

    private fun fresh(): GameStore {
        val p = Profile("kid", "مغامر", Hero.Yasmina)
        return GameStore(activeId = p.id, profiles = listOf(p))
    }

    private fun GameStore.start(place: String, q: FarmQuest, run: String): GameStore = updateProfile("kid") { p ->
        val review = LessonSession.start(run, p, Topics.get(q.topic), 7).questionIds
        p.copy(barn = p.barn.start(place, q.id, run, review, p.topics.keys))
    }

    @Test fun `the importer kept every job, tool and choice`() {
        assertEquals(listOf("potato", "tomato", "cow", "cheese", "bees", "cotton", "beet"), book.quests.map { it.id })
        for (q in book.quests) {
            assertTrue(q.steps.isNotEmpty() && q.learned.isNotEmpty() && q.yield > 0, q.id)
            assertTrue(q.product in book.products, q.id)
            assertTrue(q.crop || q.place in FarmBook.taskPlaces, q.id)
            assertTrue(q.tools.all { it in book.tools }, q.id)
            assertNotNull(Topics.get(q.topic))
            for (st in q.steps) {
                assertTrue(st.tools.isNotEmpty() && st.tools.all { it in q.tools } && st.hint.isNotBlank(), q.id)
                st.pick?.let { pick ->
                    assertTrue(pick.ask.isNotBlank() && pick.oops.isNotBlank(), q.id)
                    when (pick.type) {
                        "choice", "find", "all" -> assertTrue(pick.options.any { it.ok }, q.id)
                        "order" -> assertTrue(pick.options.size >= 2, q.id)
                        "oneEach" -> assertTrue(pick.groups.keys.all { g -> pick.options.any { it.group == g } }, q.id)
                        "dial" -> assertTrue(pick.target in pick.min..pick.max, q.id)
                        else -> fail("unknown pick ${pick.type}")
                    }
                    assertTrue(pick.tool == null || pick.tool in st.tools, q.id)
                }
                st.power?.let { assertTrue(it in book.helpers, q.id) }
            }
        }
        assertEquals("حمراء", book.quest("tomato").steps.last().pick!!.options.first().label)
        assertEquals(85, book.quest("cheese").steps[0].pick!!.target)
        assertEquals(3, book.quest("cotton").steps.last().rounds)
    }

    @Test fun `all seven quests can be completed with the right tools, in story order`() {
        var store = fresh()
        for ((i, q) in book.quests.withIndex()) {
            assertEquals(i, store.active!!.barn.quest)
            val place = placeOf(q)
            if (q.id == "cheese") assertTrue(store.active!!.barn.stock.getValue("milk") >= 2)
            store = store.start(place, q, "run-${q.id}")
            assertTrue(store.active!!.barn.runs.getValue(place).forQuest, q.id)
            val before = store.active!!.barn.stock.getOrDefault(q.product, 0)
            store = store.updateProfile("kid") { p -> p.copy(barn = p.barn.playSteps(place)) }
            val run = store.active!!.barn.runs.getValue(place)
            assertEquals(FarmPhase.Review, run.phase(q), q.id)
            assertEquals(run.units, run.clean)
            assertEquals(before + q.yield + run.bonus, store.active!!.barn.stock.getValue(q.product), q.id)
            store = store.answerAll("kid", place)
            val coins = store.active!!.barn.coins
            store = store.finishFarm("kid", place)
            assertEquals(3, store.active!!.topics.getValue(q.topic).stars, q.id)
            assertEquals(coins + 30, store.active!!.barn.coins)
            assertFalse(place in store.active!!.barn.runs)
            store = json.decodeFromString(json.encodeToString(store))
        }
        assertEquals(7, store.active!!.barn.quest)
        assertEquals(3, store.active!!.barn.board.size)
    }

    @Test fun `a wrong tool counts a miss, never advances, and the second miss reveals the tool`() {
        val potato = book.quest("potato")
        var barn = Barn().start("plot-0", "potato", "r", emptyList(), emptySet())
        barn = barn.act("plot-0", "harvest")
        var run = barn.runs.getValue("plot-0")
        assertEquals(0, run.step); assertEquals(1, run.misses); assertEquals(Mood.Oops, run.mood)
        assertTrue(run.say.contains("لاحقاً"))
        assertFalse(run.glows(potato, "plough"))
        assertFalse(run.say.contains("جرّب"))
        barn = barn.act("plot-0", "stake")
        run = barn.runs.getValue("plot-0")
        assertEquals(potato.nope.getValue("stake") + " " + potato.steps[0].hint + " جرّب: «🚜 حراثة» أو «🍂 تسميد».", run.say)
        assertTrue(run.glows(potato, "plough") && run.glows(potato, "manure") && !run.glows(potato, "stake"))
        assertEquals(0, run.step)
        barn = barn.act("plot-0", "plough").act("plot-0", "manure")
        run = barn.runs.getValue("plot-0")
        assertEquals(1, run.step); assertEquals(2, run.units); assertEquals(1, run.clean); assertEquals("rich", run.soil)
        // Tools that are not in this quest's tray do nothing at all.
        assertEquals(barn, barn.act("plot-0", "milk"))
    }

    @Test fun `choices count misses, reveal after the second, and closing keeps the step`() {
        var barn = Barn().start("plot-0", "potato", "r", emptyList(), emptySet())
        barn = barn.act("plot-0", "plough").act("plot-0", "manure").act("plot-0", "cut")
        val pick = book.quest("potato").steps[1].pick!!
        assertEquals("cut", barn.runs.getValue("plot-0").picking)
        val wrong = pick.options.indexOfFirst { !it.ok }
        barn = barn.pickTap("plot-0", wrong)
        assertTrue(pick.revealed(barn.runs.getValue("plot-0")).isEmpty())
        barn = barn.pickClose("plot-0").act("plot-0", "cut").pickTap("plot-0", wrong)
        val run = barn.runs.getValue("plot-0")
        assertEquals(2, run.misses); assertEquals(setOf(pick.options.indexOfFirst { it.ok }), pick.revealed(run))
        barn = barn.pickTap("plot-0", pick.options.indexOfFirst { it.ok })
        assertEquals(2, barn.runs.getValue("plot-0").step)
        assertEquals(2, barn.runs.getValue("plot-0").clean)
        assertEquals(3, barn.runs.getValue("plot-0").units)
        assertTrue(barn.runs.getValue("plot-0").say.contains("برعمين"))
    }

    @Test fun `the thermometer says too high or too low and reveals the target`() {
        var barn = Barn(stock = mapOf("milk" to 2)).start("dairy", "cheese", "r", emptyList(), setOf("farm-cheese"))
        assertEquals(0, barn.stock["milk"])
        barn = barn.act("dairy", "heat").pickDial("dairy", 100).pickSubmit("dairy")
        assertEquals(100, barn.runs.getValue("dairy").dial)
        assertTrue(barn.runs.getValue("dairy").say.endsWith("(أعلى من اللازم)"))
        barn = barn.pickDial("dairy", -90).pickSubmit("dairy")
        assertTrue(barn.runs.getValue("dairy").say.contains("(أقلّ من اللازم) نسخّن الحليب إلى 85 درجة."))
        barn = barn.pickDial("dairy", 75).pickSubmit("dairy")
        assertEquals(1, barn.runs.getValue("dairy").step)
    }

    @Test fun `crops visibly change stage after each correct step, by actions only`() {
        var barn = Barn().start("plot-0", "potato", "r", emptyList(), emptySet())
        val stages = mutableListOf<String?>()
        barn = barn.act("plot-0", "plough"); assertEquals("ploughed", barn.runs.getValue("plot-0").soil)
        barn = barn.act("plot-0", "manure").act("plot-0", "cut").pickTap("plot-0", 1)
        barn = barn.act("plot-0", "plant").pickTap("plot-0", 0); stages += barn.runs.getValue("plot-0").stage
        barn = barn.act("plot-0", "water"); stages += barn.runs.getValue("plot-0").stage
        assertTrue(barn.runs.getValue("plot-0").weeds)
        assertEquals(1, barn.runs.getValue("plot-0").lapses.size)
        barn = barn.act("plot-0", "hoe"); assertFalse(barn.runs.getValue("plot-0").weeds)
        barn = barn.act("plot-0", "manure"); stages += barn.runs.getValue("plot-0").stage
        barn = barn.act("plot-0", "hill"); stages += barn.runs.getValue("plot-0").stage
        assertTrue(barn.runs.getValue("plot-0").mounds)
        assertEquals(listOf("planted", "young", "grown", "ripe"), stages)
        // Cotton opens from the bottom up in three rounds.
        var cotton = Barn(quest = 5).start("plot-1", "cotton", "c", emptyList(), emptySet()).playStepsUntil("plot-1", 4)
        assertTrue(cotton.runs.getValue("plot-1").dense.not())
        assertEquals("open1", cotton.runs.getValue("plot-1").stage)
        cotton = cotton.act("plot-1", "harvest"); assertEquals("open2", cotton.runs.getValue("plot-1").stage)
        cotton = cotton.act("plot-1", "harvest"); assertEquals("open3", cotton.runs.getValue("plot-1").stage)
        cotton = cotton.act("plot-1", "harvest")
        // 6 bolls plus the bee helper's pollination gift.
        assertEquals(8, cotton.stock["cotton"]); assertEquals(8, cotton.runs.getValue("plot-1").harvested)
        assertNull(cotton.runs.getValue("plot-1").stage)
    }

    private fun Barn.playStepsUntil(place: String, step: Int): Barn {
        var barn = this
        while (barn.runs.getValue(place).step < step) {
            val run = barn.runs.getValue(place)
            barn = barn.act(place, run.need(book.quest(run.quest)).first()).solvePick(place)
        }
        return barn
    }

    @Test fun `the helper's special moment adds the web's bonus`() {
        val kitty = Barn(helper = "kitty", helperChosen = true).start("plot-0", "potato", "r", emptyList(), emptySet()).playSteps("plot-0")
        assertEquals(7, kitty.stock["potato"])
        val bee = Barn(helper = "bee").start("plot-0", "potato", "r", emptyList(), emptySet()).playSteps("plot-0")
        assertEquals(6, bee.stock["potato"])
        val puppy = Barn(helper = "puppy", quest = 1).start("plot-0", "tomato", "r", emptyList(), emptySet()).playSteps("plot-0")
        val plain = Barn(helper = "bee", quest = 1).start("plot-0", "tomato", "r", emptyList(), emptySet()).playSteps("plot-0")
        assertEquals(6, puppy.stock["tomato"]); assertEquals(8, plain.stock["tomato"])
        assertEquals(plain.xp + 15, puppy.xp)
    }

    @Test fun `score is the share right first try over jobs and review, and rewards are idempotent`() {
        var store = fresh().start("plot-0", book.quest("potato"), "r1")
        store = store.updateProfile("kid") { p -> p.copy(barn = p.barn.act("plot-0", "water").playSteps("plot-0")) }
        val run = store.active!!.barn.runs.getValue("plot-0")
        assertEquals(run.units - 1, run.clean)
        store = store.answerAll("kid", "plot-0", right = false)
        val done = store.active!!.barn.runs.getValue("plot-0")
        assertEquals(0, done.reviewCorrect)
        assertEquals(starsFor(done.units - 1, done.units + done.review.size), done.stars())
        val finished = store.finishFarm("kid", "plot-0")
        assertEquals(finished, finished.finishFarm("kid", "plot-0"))
        assertEquals(done.review.toSet(), finished.active!!.topics.getValue("farm-potato").missed.toSet())
        assertEquals(1, finished.active!!.barn.quest)
        // Replaying the done quest on another plot is practice: products again, no second story reward.
        var replay = finished.start("plot-3", book.quest("potato"), "r2")
        assertFalse(replay.active!!.barn.runs.getValue("plot-3").forQuest)
        replay = replay.updateProfile("kid") { p -> p.copy(barn = p.barn.playSteps("plot-3")) }.answerAll("kid", "plot-3")
        val coins = replay.active!!.barn.coins
        replay = replay.finishFarm("kid", "plot-3")
        assertEquals(coins, replay.active!!.barn.coins)
        assertEquals(1, replay.active!!.barn.quest)
        assertEquals(3, replay.active!!.topics.getValue("farm-potato").stars)
        assertEquals(12, replay.active!!.barn.stock["potato"])
        // A run that was already recorded is just cleared, never recorded twice.
        val stale = replay.updateProfile("kid") { p -> p.copy(barn = p.barn.copy(runs = mapOf("plot-0" to done))) }
        assertEquals(replay.active!!.topics, stale.finishFarm("kid", "plot-0").active!!.topics)
        assertTrue(stale.finishFarm("kid", "plot-0").active!!.barn.runs.isEmpty())
    }

    @Test fun `quests open in story order, tasks need their place, cheese needs milk`() {
        val barn = Barn()
        assertNotNull(barn.refusal("pen", "cow", emptySet()))
        assertNull(barn.refusal("pen", "cow", setOf("farm-cow")))
        assertNotNull(barn.refusal("hive", "cow", setOf("farm-cow")))
        assertNotNull(barn.refusal("plot-0", "cow", setOf("farm-cow")))
        assertEquals(listOf("potato"), barn.plotChoices(emptySet()).map { it.id })
        val cheese = Barn(quest = 3, stock = mapOf("milk" to 1))
        assertTrue(cheese.refusal("dairy", "cheese", emptySet())!!.contains("احلب البقرة"))
        assertEquals(cheese, cheese.start("dairy", "cheese", "x", emptyList(), emptySet()))
        assertNull(cheese.copy(stock = mapOf("milk" to 2)).refusal("dairy", "cheese", emptySet()))
        // Only one plot grows the story crop; a second one is practice.
        val two = Barn().start("plot-0", "potato", "a", emptyList(), emptySet()).start("plot-1", "potato", "b", emptyList(), emptySet())
        assertTrue(two.runs.getValue("plot-0").forQuest); assertFalse(two.runs.getValue("plot-1").forQuest)
    }

    @Test fun `orders fill from stock for coins and decorations are bought once, never touching lessons`() {
        assertTrue(Barn().withOrders(emptySet()).board.isEmpty())
        var barn = Barn(quest = 2, stock = mapOf("potato" to 5, "tomato" to 3)).withOrders(emptySet())
        assertEquals(listOf("أم سمير", "مطعم الميناء", "العمّ مصطفى"), barn.board.map { it.who })
        assertEquals(18, barn.board[0].coins); assertEquals(9, barn.board[0].xp)
        barn = barn.deliver(0, emptySet())
        assertEquals(2, barn.stock["potato"]); assertEquals(18, barn.coins)
        assertEquals(3, barn.board.size)
        assertEquals(listOf("مطعم الميناء", "العمّ مصطفى", "أم سمير"), barn.board.map { it.who })
        val unaffordable = barn.board.indexOfFirst { !barn.canFill(it) }
        assertEquals(barn, barn.deliver(unaffordable, emptySet()))
        assertEquals(barn, barn.decorate("rose"))
        val rich = barn.copy(coins = 100)
        val rose = rich.decorate("rose")
        assertEquals(60, rose.coins); assertEquals(setOf("rose"), rose.decor)
        assertEquals(rose, rose.decorate("rose"))
        assertEquals(rose.quest, rich.quest)
        assertEquals(rose, rose.decorate("unknown"))
    }

    @Test fun `old saves decode with farm defaults and a run in progress survives a save round trip`() {
        val old = """{"version":1,"activeId":"a","profiles":[{"id":"a","name":"س","hero":"Sindbad",
            "barn":{"stock":{"potato":6},"coins":36,"decor":["scarecrow"],"helper":"cow"}}]}"""
        val store = GameRepository.decode(old)
        val barn = store.active!!.barn
        assertEquals(0, barn.quest); assertTrue(barn.runs.isEmpty()); assertFalse(barn.helperChosen)
        assertEquals("cow", barn.helper); assertEquals(6, barn.stock["potato"])
        assertEquals(GameStore(), GameRepository.decode(null))
        var playing = barn.start("plot-2", "potato", "r", listOf("farm-potato-0"), emptySet()).act("plot-2", "plough").act("plot-2", "cut")
        val saved = store.updateProfile("a") { it.copy(barn = playing) }
        val back = GameRepository.decode(json.encodeToString(saved))
        assertEquals(playing, back.active!!.barn)
        assertEquals(1, back.active!!.barn.runs.getValue("plot-2").misses)
        playing = back.active!!.barn.act("plot-2", "manure")
        assertEquals(1, playing.runs.getValue("plot-2").step)
        assertThrows(IllegalArgumentException::class.java) {
            GameRepository.decode(old.replace("\"coins\":36", "\"coins\":-1"))
        }
    }

    @Test fun `the review lesson no longer harvests, only the scene does`() {
        val topic = Topics.get("farm-potato")
        var store = fresh()
        var session = LessonSession.start("s", store.active!!, topic, 1)
        repeat(topic.cards.size) { session = session.nextCard(topic) }
        while (!session.finished) session = session.submit(session.currentQuestion(topic).answer, topic).advance()
        store = store.complete(session)
        assertTrue(store.active!!.barn.stock.isEmpty())
        assertEquals(3, store.active!!.topics.getValue("farm-potato").stars)
    }
}
