package org.sindibad.android.domain

import kotlinx.serialization.Serializable

// The farm quest state machine (web: core/farm/farm.ts act/wrongTool/openPick/completeStep/finishRun),
// re-written as pure Kotlin so every rule is unit-tested. Growth advances by actions only: nothing waits
// on a clock, the book's weeks are captions («lapses») shown after the step that skips them.

@Serializable enum class Mood { Happy, Oops, Think, Cheer }
enum class FarmPhase { Steps, Review, Done }

/** A quest being played at one place. Saved in the profile after every action, so it survives process death. */
@Serializable
data class FarmRun(
    val id: String, val quest: String, val forQuest: Boolean,
    val step: Int = 0, val done: List<String> = emptyList(), val round: Int = 0,
    /** Misses on the current job (wrong tools and wrong choices); the second one reveals the answer. */
    val misses: Int = 0,
    /** Jobs done, and done without a miss: the step part of the score. */
    val units: Int = 0, val clean: Int = 0,
    /** Extra products from the helper's special moment. */
    val bonus: Int = 0,
    val stage: String? = null, val soil: String = "grass", val weeds: Boolean = false,
    val mounds: Boolean = false, val stakes: Boolean = false, val dense: Boolean = false,
    /** The tool whose small choice is open, with its state (chosen options, the thermometer). */
    val picking: String? = null, val chosen: List<Int> = emptyList(), val dial: Int = 0,
    /** What the helper says now. */
    val say: String = "", val mood: Mood = Mood.Happy,
    /** Captions of the weeks that passed after the last action (no real waiting). */
    val lapses: List<String> = emptyList(),
    /** Counts actions, so the scene can play the last tool's effect once. */
    val beat: Int = 0, val lastTool: String? = null,
    /** Products put in the barn at harvest (0 before). */
    val harvested: Int = 0,
    /** The quest's quick review, asked after the harvest. */
    val review: List<String> = emptyList(), val reviewIndex: Int = 0, val reviewAttempts: Int = 0,
    val reviewCorrect: Int = 0, val reviewMissed: List<String> = emptyList(), val reviewLast: Boolean? = null,
) {
    fun phase(q: FarmQuest) = when {
        step < q.steps.size -> FarmPhase.Steps
        reviewIndex < review.size -> FarmPhase.Review
        else -> FarmPhase.Done
    }
    val reviewResolved get() = reviewLast == true || reviewAttempts >= 2
    /** Tools still needed in this step. */
    fun need(q: FarmQuest) = q.steps.getOrNull(step)?.tools.orEmpty().filter { it !in done }
    /** After the second miss the right tool glows (web tracker rule). */
    fun glows(q: FarmQuest, tool: String) = misses >= 2 && picking == null && tool in need(q)
    val correct get() = clean + reviewCorrect
    val total get() = units + review.size
    fun stars() = starsFor(correct, total)
}

private fun Barn.put(place: String, run: FarmRun) = copy(runs = runs + (place to run))

/** Apply a tool from the toolbar to the place. A wrong tool counts a miss and never advances. */
fun Barn.act(place: String, tool: String, book: FarmBook = FarmBook.book): Barn {
    val run = runs[place] ?: return this
    val q = book.quest(run.quest)
    if (run.phase(q) != FarmPhase.Steps || run.picking != null || tool !in q.tools) return this
    val st = q.steps[run.step]
    val need = run.need(q)
    if (tool !in need) return put(place, wrongTool(run, q, st, tool, book))
    val pick = st.pickFor(tool)
    if (pick != null) return put(place, run.copy(picking = tool, chosen = emptyList(), dial = pick.from,
        say = pick.ask, mood = Mood.Think, lapses = emptyList(), beat = run.beat + 1, lastTool = null))
    return job(place, run, q, st, tool, null, book)
}

private fun wrongTool(run: FarmRun, q: FarmQuest, st: FarmStep, tool: String, book: FarmBook): FarmRun {
    val misses = run.misses + 1
    val name = book.tools.getValue(tool).name
    var msg = st.wrong[tool] ?: q.nope[tool] ?: when {
        q.steps.drop(run.step + 1).any { tool in it.tools } -> "ليس الآن! «$name» يأتي لاحقاً."
        q.steps.take(run.step).any { tool in it.tools } || tool in run.done -> "قمنا بـ«$name» من قبل. ما الخطوة التالية؟"
        else -> "«$name» ليس من خطوات ${q.name}."
    }
    if (misses >= 2) msg += " ${st.hint} جرّب: " + run.need(q).joinToString(" أو ") { "«${book.tools.getValue(it).icon} ${book.tools.getValue(it).name}»" } + "."
    return run.copy(misses = misses, say = msg, mood = Mood.Oops, lapses = emptyList(), beat = run.beat + 1, lastTool = null)
}

/** How a tool changes the place (web: doFx). */
private fun effect(run: FarmRun, q: FarmQuest, st: FarmStep, tool: String): FarmRun = when (tool) {
    "plough" -> run.copy(soil = if (run.soil == "rich") "rich" else "ploughed")
    "manure" -> when {
        run.stage == null -> run.copy(soil = "rich")
        run.stage == "young" && q.id in setOf("potato", "tomato", "beet") -> run.copy(stage = "grown")
        else -> run
    }
    "hoe" -> run.copy(weeds = false)
    "hill" -> run.copy(mounds = true)
    "stake" -> run.copy(stakes = true)
    "thin" -> run.copy(dense = false)
    "wean" -> run.copy(soil = "dry")
    "harvest" -> when {
        q.id == "cotton" -> if (run.round == st.rounds - 1) run.copy(stage = null) else run
        q.id == "beet" || !q.crop -> run
        else -> run.copy(stage = null)
    }
    "top" -> run.copy(stage = null)
    else -> run
}

/** A job done right (after its choice, if it has one). */
private fun Barn.job(place: String, run0: FarmRun, q: FarmQuest, st: FarmStep, tool: String, pick: FarmPick?, book: FarmBook): Barn {
    val clean = run0.misses == 0
    val why = if (st.rounds > 0) st.whyRounds.getOrNull(run0.round) else pick?.why?.ifBlank { null } ?: st.why[tool]
    var run = effect(run0, q, st, tool).copy(
        picking = null, chosen = emptyList(), units = run0.units + 1, clean = run0.clean + if (clean) 1 else 0,
        misses = 0, done = run0.done + tool, say = why.orEmpty(), mood = Mood.Happy,
        lapses = emptyList(), beat = run0.beat + 1, lastTool = tool,
    )
    val barn = copy(xp = xp + if (clean) 5 else 0)
    if (st.rounds > 0) {
        run = run.copy(round = run.round + 1, done = emptyList())
        if (run.round < st.rounds) return barn.put(place, run.copy(lapses = listOfNotNull(st.roundLapse), stage = "open${run.round + 1}"))
    } else if (run.done.size < st.tools.size) return barn.put(place, run)
    return barn.completeStep(place, run, q, st, book)
}

private fun Barn.completeStep(place: String, run0: FarmRun, q: FarmQuest, st: FarmStep, book: FarmBook): Barn {
    var run = run0
    val lapses = mutableListOf<String>()
    var say = run.say
    var gain = 0
    st.stage?.let { run = run.copy(stage = it) }
    if (st.lapse != null) {
        lapses += st.lapse
        st.then?.let { run = run.copy(stage = it) }
        if (st.weeds) run = run.copy(weeds = true)
        if (st.dense) run = run.copy(dense = true)
    }
    if (st.power != null && st.power == helper) {
        when (st.power) { "bee" -> run = run.copy(bonus = run.bonus + 2); "kitty", "cow" -> run = run.copy(bonus = run.bonus + 1); else -> gain += 15 }
        book.helpers[helper]?.power?.let { say = listOf(say, it).filter(String::isNotBlank).joinToString("\n") }
    }
    if (st.lapse2 != null) {
        lapses += st.lapse2
        st.then2?.let { run = run.copy(stage = it) }
    }
    run = run.copy(step = run.step + 1, done = emptyList(), round = 0, lapses = lapses, say = say,
        mood = if (st.power == helper) Mood.Cheer else Mood.Happy)
    var stockNow = stock
    if (run.step >= q.steps.size) {
        // The harvest: the product goes to the barn, then the quick review.
        val amount = q.yield + run.bonus
        stockNow = stock + (q.product to stock.getOrDefault(q.product, 0) + amount)
        gain += 10
        val p = book.products.getValue(q.product)
        run = run.copy(harvested = amount, say = listOf(say, "+$amount ${p.icon} ${p.name} في المخزن!").filter(String::isNotBlank).joinToString("\n"), mood = Mood.Cheer)
    }
    return copy(stock = stockNow, xp = xp + gain).put(place, run)
}

private fun Barn.pickMiss(place: String, run: FarmRun, pick: FarmPick, msg: String = pick.oops): Barn {
    val misses = run.misses + 1
    val text = msg + if (misses >= 2 && pick.reveal.isNotBlank()) " ${pick.reveal}" else ""
    return put(place, run.copy(misses = misses, say = text, mood = Mood.Oops, beat = run.beat + 1, lastTool = null))
}

private inline fun Barn.withPick(place: String, book: FarmBook, block: Barn.(FarmRun, FarmQuest, FarmStep, FarmPick) -> Barn): Barn {
    val run = runs[place] ?: return this
    val tool = run.picking ?: return this
    val q = book.quest(run.quest)
    if (run.phase(q) != FarmPhase.Steps) return this
    val st = q.steps[run.step]
    val pick = st.pickFor(tool) ?: return this
    return block(run, q, st, pick)
}

/** Tap an option of the open choice. */
fun Barn.pickTap(place: String, i: Int, book: FarmBook = FarmBook.book): Barn = withPick(place, book) { run, q, st, pick ->
    val o = pick.options.getOrNull(i) ?: return@withPick this
    val tool = run.picking!!
    when (pick.type) {
        "choice", "find" -> if (o.ok) job(place, run, q, st, tool, pick, book) else pickMiss(place, run, pick)
        "all" -> when {
            i in run.chosen -> this
            !o.ok -> pickMiss(place, run, pick)
            else -> {
                val chosen = run.chosen + i
                if (pick.options.indices.all { !pick.options[it].ok || it in chosen }) job(place, run, q, st, tool, pick, book)
                else put(place, run.copy(chosen = chosen))
            }
        }
        "order" -> when {
            i in run.chosen -> this
            i != run.chosen.size -> pickMiss(place, run, pick)
            run.chosen.size + 1 == pick.options.size -> job(place, run, q, st, tool, pick, book)
            else -> put(place, run.copy(chosen = run.chosen + i))
        }
        "oneEach" -> {
            val chosen = if (i in run.chosen) run.chosen - i
                else run.chosen.filter { pick.options[it].group != o.group } + i
            put(place, run.copy(chosen = chosen))
        }
        else -> this
    }
}

/** Turn the thermometer of a dial choice. */
fun Barn.pickDial(place: String, delta: Int, book: FarmBook = FarmBook.book): Barn = withPick(place, book) { run, _, _, pick ->
    if (pick.type != "dial") this else put(place, run.copy(dial = (run.dial + delta).coerceIn(pick.min, pick.max)))
}

/** «تمّ» for a dial, «قدّم الوجبة» for one of each group. */
fun Barn.pickSubmit(place: String, book: FarmBook = FarmBook.book): Barn = withPick(place, book) { run, q, st, pick ->
    val tool = run.picking!!
    when (pick.type) {
        "dial" -> if (run.dial == pick.target) job(place, run, q, st, tool, pick, book)
            else pickMiss(place, run, pick, pick.oops + if (run.dial > pick.target) " (أعلى من اللازم)" else " (أقلّ من اللازم)")
        "oneEach" -> if (run.chosen.size == pick.groups.size && run.chosen.map { pick.options[it].group }.toSet().size == run.chosen.size)
            job(place, run, q, st, tool, pick, book) else pickMiss(place, run, pick)
        else -> this
    }
}

/** Close a choice without finishing it (its misses stay counted, as on the web). */
fun Barn.pickClose(place: String): Barn {
    val run = runs[place] ?: return this
    return if (run.picking == null) this else put(place, run.copy(picking = null, chosen = emptyList()))
}

/** After two misses: the options a choice reveals (right ones, or the next one to put in order). */
fun FarmPick.revealed(run: FarmRun): Set<Int> = when {
    run.misses < 2 -> emptySet()
    type == "order" -> setOf(run.chosen.size)
    else -> options.indices.filter { options[it].ok && it !in run.chosen }.toSet()
}

/** Answer the current review question: first miss → hint, second → the answer is shown. */
fun Barn.answer(place: String, choice: Int, question: Question, book: FarmBook = FarmBook.book): Barn {
    val run = runs[place] ?: return this
    if (run.phase(book.quest(run.quest)) != FarmPhase.Review || run.reviewResolved) return this
    if (question.id != run.review[run.reviewIndex] || choice !in question.choices.indices) return this
    val right = question.accepts(listOf(choice))
    return put(place, run.copy(reviewAttempts = run.reviewAttempts + 1, reviewLast = right,
        reviewCorrect = run.reviewCorrect + if (right && run.reviewAttempts == 0) 1 else 0,
        reviewMissed = if (right) run.reviewMissed else (run.reviewMissed + question.id).distinct()))
}

fun Barn.nextReview(place: String): Barn {
    val run = runs[place] ?: return this
    if (run.reviewIndex >= run.review.size || !run.reviewResolved) return this
    return put(place, run.copy(reviewIndex = run.reviewIndex + 1, reviewAttempts = 0, reviewLast = null))
}

/**
 * Record a finished run: stars from the share right first time (jobs + review), pearls for new stars,
 * and the story's one-time reward (+30 coins, the next quest). Harvests happened at the harvest step, so
 * replaying a quest yields its products again, as on the web, but never the story reward twice.
 */
fun GameStore.finishFarm(profileId: String, place: String, book: FarmBook = FarmBook.book): GameStore = updateProfile(profileId) { p ->
    val run = p.barn.runs[place] ?: return@updateProfile p
    val q = book.quest(run.quest)
    if (run.phase(q) != FarmPhase.Done) return@updateProfile p
    if (run.id in p.completedSessions) return@updateProfile p.copy(barn = p.barn.copy(runs = p.barn.runs - place))
    val recorded = p.record(q.topic, run.correct, run.total, run.review, run.reviewMissed)
    var barn = recorded.barn.copy(runs = p.barn.runs - place)
    if (run.forQuest) barn = barn.copy(quest = maxOf(barn.quest, book.index(q.id) + 1), coins = barn.coins + 30, xp = barn.xp + 40)
    recorded.copy(barn = barn.withOrders(recorded.topics.keys, book),
        completedSessions = (p.completedSessions + run.id).takeLast(128))
}
