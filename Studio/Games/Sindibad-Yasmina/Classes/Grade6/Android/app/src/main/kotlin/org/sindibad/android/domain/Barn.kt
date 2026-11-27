package org.sindibad.android.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The farm island's catalog, imported from Web/worlds/grade6/farm.ts by tools/import-island.mjs.
// Draft content, pending review by Syrian educators.

@Serializable data class FarmProduct(val name: String, val icon: String, val price: Int)
@Serializable data class FarmOrder(val who: String, val icon: String, val want: Map<String, Int>)
@Serializable data class FarmDecoration(val name: String, val fact: String, val cost: Int)
@Serializable data class FarmHelper(val name: String, val fact: String, val kind: String = "", val blurb: String = "", val power: String = "")
@Serializable data class FarmTool(val icon: String, val name: String)

/** One option of a small choice after a job: an emoji or a native drawing (`art`), and a label. */
@Serializable data class FarmPickOption(val icon: String = "", val art: String = "", val label: String = "",
    val ok: Boolean = false, val group: String = "")

/** The choice where the book's knowledge matters: choice, find, all, order, oneEach or dial. */
@Serializable data class FarmPick(
    val type: String = "choice", val tool: String? = null, val ask: String, val oops: String,
    val options: List<FarmPickOption> = emptyList(), val groups: Map<String, String> = emptyMap(),
    val from: Int = 0, val target: Int = 0, val min: Int = 0, val max: Int = 100,
    val why: String = "", val reveal: String = "",
)

/** One step of a quest: its tool(s) in any order, then what the plants look like afterwards. */
@Serializable data class FarmStep(
    @SerialName("do") val tools: List<String>, val hint: String,
    val why: Map<String, String> = emptyMap(), val wrong: Map<String, String> = emptyMap(),
    val pick: FarmPick? = null, val stage: String? = null,
    val lapse: String? = null, val then: String? = null, val weeds: Boolean = false, val dense: Boolean = false,
    val lapse2: String? = null, val then2: String? = null, val power: String? = null,
    val rounds: Int = 0, val whyRounds: List<String> = emptyList(), val roundLapse: String? = null,
) {
    fun pickFor(tool: String) = pick?.takeIf { it.tool == null || it.tool == tool }
}

/** A quest: one lesson of the agriculture book, a crop on a plot or a task at a place. */
@Serializable data class FarmQuest(
    val id: String, val topic: String, val title: String, val icon: String, val goal: String,
    val crop: Boolean, val place: String, val name: String, val book: String,
    val product: String, val yield: Int, val needs: Map<String, Int> = emptyMap(),
    val tools: List<String>, val nope: Map<String, String> = emptyMap(),
    val steps: List<FarmStep>, val learned: List<String>,
)

@Serializable data class FarmBook(
    val products: Map<String, FarmProduct>, val orders: List<FarmOrder>,
    val decorations: Map<String, FarmDecoration>, val helpers: Map<String, FarmHelper>,
    val tools: Map<String, FarmTool>, val quests: List<FarmQuest>, val levels: List<Int>,
) {
    fun quest(id: String) = quests.first { it.id == id }
    fun index(id: String) = quests.indexOfFirst { it.id == id }
    /** The task quest done at a place (pen, dairy, hive); plots grow crops. */
    fun taskAt(place: String) = quests.firstOrNull { !it.crop && it.place == place }

    companion object {
        val plots = List(6) { "plot-$it" }
        val taskPlaces = listOf("pen", "dairy", "hive")
        private val json = Json { ignoreUnknownKeys = true }
        val book by lazy { requireNotNull(FarmBook::class.java.getResourceAsStream("/islands/barn.json")).bufferedReader().use {
            json.decodeFromString<FarmBook>(it.readText())
        } }
    }
}

/** An order on the board by the dock, with its pay (web: ensureOrders). */
@Serializable data class BoardOrder(val who: String, val icon: String, val want: Map<String, Int>, val coins: Int, val xp: Int)

/**
 * This player's farm. Every field has a default so saves from before the farm scene still decode.
 * Coins and decorations never change lessons, answers or access.
 */
@Serializable
data class Barn(
    val stock: Map<String, Int> = emptyMap(), val coins: Int = 0,
    val decor: Set<String> = emptySet(), val helper: String = "bee",
    val helperChosen: Boolean = false,
    /** Index of the current story quest; finishing it opens the next. */
    val quest: Int = 0, val xp: Int = 0,
    /** Place id (plot-0…plot-5, pen, dairy, hive) → the run being played there. */
    val runs: Map<String, FarmRun> = emptyMap(),
    val board: List<BoardOrder> = emptyList(), val orderSeq: Int = 0,
) {
    fun level(book: FarmBook = FarmBook.book): Int {
        var l = 1
        while (l < book.levels.size && xp >= book.levels[l]) l++
        return l
    }
    fun chooseHelper(id: String, book: FarmBook = FarmBook.book) =
        if (id in book.helpers) copy(helper = id, helperChosen = true) else this

    /** A quest can be played once the story reaches it, or if this player already earned a record for it. */
    fun unlocked(index: Int, played: Set<String>, book: FarmBook = FarmBook.book) =
        index in book.quests.indices && (index <= quest || book.quests[index].topic in played)
    fun current(book: FarmBook = FarmBook.book) = book.quests.getOrNull(quest)
    fun questDone(index: Int, played: Set<String>, book: FarmBook = FarmBook.book) =
        index < quest || book.quests.getOrNull(index)?.topic in played

    /** What the farm knows how to make: products of finished (or already played) quests. */
    fun made(played: Set<String>, book: FarmBook = FarmBook.book) =
        book.quests.filterIndexed { i, q -> i < quest || q.topic in played }.map { it.product }.toSet()

    /** Keep three orders on the board, in the book's order, skipping what the farm cannot make yet. */
    fun withOrders(played: Set<String>, book: FarmBook = FarmBook.book): Barn {
        val made = made(played, book)
        var list = board
        var seq = orderSeq
        var guard = 0
        while (list.size < 3 && guard++ < book.orders.size * 2) {
            val o = book.orders[seq % book.orders.size]
            seq += 1
            if (!o.want.keys.all { it in made } || list.any { it.who == o.who }) continue
            val pay = o.want.entries.sumOf { (k, n) -> book.products.getValue(k).price * n }
            list = list + BoardOrder(o.who, o.icon, o.want, pay, Math.round(pay / 2.0).toInt())
        }
        return if (list == board) this else copy(board = list, orderSeq = seq)
    }
    fun canFill(order: BoardOrder) = order.want.all { (id, n) -> stock.getOrDefault(id, 0) >= n }
    fun deliver(index: Int, played: Set<String>, book: FarmBook = FarmBook.book): Barn {
        val order = board.getOrNull(index) ?: return this
        if (!canFill(order)) return this
        return copy(stock = stock.mapValues { (id, n) -> n - order.want.getOrDefault(id, 0) },
            coins = coins + order.coins, xp = xp + order.xp, board = board - order).withOrders(played, book)
    }
    fun decorate(id: String, book: FarmBook = FarmBook.book): Barn {
        val item = book.decorations[id] ?: return this
        return if (id in decor || coins < item.cost) this else copy(decor = decor + id, coins = coins - item.cost)
    }

    /** Crops an empty plot can grow now: the current story crop first if no plot is growing it for the story. */
    fun plotChoices(played: Set<String>, book: FarmBook = FarmBook.book): List<FarmQuest> =
        book.quests.filterIndexed { i, q -> q.crop && unlocked(i, played, book) }

    /** Why a quest cannot start at a place now, or null when it can. */
    fun refusal(place: String, questId: String, played: Set<String>, book: FarmBook = FarmBook.book): String? {
        val index = book.index(questId)
        if (index < 0) return "…"
        val q = book.quests[index]
        if (place in runs) return null
        if (q.crop != place.startsWith("plot-") || (!q.crop && q.place != place)) return "…"
        if (!unlocked(index, played, book)) return "سنعمل هنا قريباً. أولاً: ${current(book)?.goal.orEmpty()} 📜"
        val missing = q.needs.entries.firstOrNull { (k, n) -> stock.getOrDefault(k, 0) < n }
        if (missing != null) {
            val p = book.products.getValue(missing.key)
            return "نحتاج إلى ${missing.value} ${p.icon} ${p.name} على الأقل." + if (missing.key == "milk") " احلب البقرة في الحظيرة أولاً!" else ""
        }
        return null
    }

    /** Start a quest at a place (uses up what it needs, e.g. two milks for cheese). */
    fun start(place: String, questId: String, runId: String, review: List<String>, played: Set<String>,
        book: FarmBook = FarmBook.book): Barn {
        if (place in runs || refusal(place, questId, played, book) != null) return this
        val index = book.index(questId)
        val q = book.quests[index]
        val forQuest = index == quest && runs.values.none { it.forQuest && it.quest == questId }
        val first = q.steps.first()
        return copy(
            stock = stock.mapValues { (k, n) -> n - q.needs.getOrDefault(k, 0) },
            runs = runs + (place to FarmRun(runId, questId, forQuest, review = review, say = "${q.name}! ${first.hint}", mood = Mood.Think)),
        )
    }
}
