package org.sindibad.android.domain.quest

import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.english.Bidi
import kotlin.random.Random

/**
 * The rules of the English island's games (web: core/english/games.ts), as pure functions of the step and its
 * [StepState]. What is shuffled on the web (the rounds asked, the options, the tiles, the cards) is shuffled here
 * from the run's seed, so a step comes back the same after process death.
 *
 * Shared with the other steps: the web's tracker (first miss → the hint, from the second the answer glows, see
 * [StepMachine.miss]) and rounds(): a round counts if it had no slip; ok = the share of such rounds. Rank scores
 * 1 − misses / items; memory (pairs − slips) / pairs, a slip being a wrong pair when the right card had been seen.
 *
 * What a tap's value means (see [expected] for the right one now):
 *  listen, picture: the item's index · build, adjorder: the tile's index in the sentence · spell: the letter's
 *  index in [letters] · verb, chat: the option's index (0 is right) · odd: the word's index in the row ·
 *  rank: the item's index (0 first) · memory: the card's index in [cards].
 */
object EnglishGames {
    /** The voice can be missing: a listening round then shows its word (the web's en-heard--show). */
    const val NO_VOICE = "🔇 لا يوجد صوت إنكليزي مثبّت على هذا الهاتف، فاقرأ الكلمة بدلاً من سماعها."

    fun parts(step: EnglishGame): Int = when (step) {
        is Listen, is PictureGame -> rounds(step).size
        is Build -> step.items.size
        is Spell -> step.items.size
        is Verb -> step.lines.size
        is Memory -> step.pairs.size
        is Odd -> step.rows.size
        is Rank -> step.items.size
        is AdjOrder -> step.items.size
        is Chat -> picks(step).size
    }

    // ---------- listen · picture ----------

    private fun items(step: EnglishGame) = when (step) { is Listen -> step.items; is PictureGame -> step.items; else -> emptyList() }
    private fun ask(step: EnglishGame) = when (step) { is Listen -> step.ask; is PictureGame -> step.ask; else -> null }
    private fun opts(step: EnglishGame) = when (step) { is Listen -> step.opts; is PictureGame -> step.opts; else -> null }
    private fun perm(seed: Int, n: Int, salt: Int) = (0 until n).shuffled(Random(seed * 31 + salt))

    /** The items asked, in order (web: shuffle(items).slice(0, ask || 5)). */
    fun rounds(step: EnglishGame): List<Int> {
        val n = items(step).size
        return perm(SEEDLESS, n, 0).take(minOf(ask(step) ?: 5, n))
    }
    /** The rounds depend on the run's seed; [rounds] without a state is for counting only. */
    fun rounds(step: EnglishGame, state: StepState): List<Int> {
        val n = items(step).size
        return perm(state.seed, n, 0).take(minOf(ask(step) ?: 5, n))
    }
    private const val SEEDLESS = 0

    /** The item asked in this round. */
    fun asked(step: EnglishGame, state: StepState): Int = rounds(step, state)[state.part.coerceAtMost(parts(step) - 1)]

    /** The options of this round: the asked item and others, shuffled (web: opts || 4 of them). */
    fun options(step: EnglishGame, state: StepState): List<Int> {
        val n = items(step).size
        val right = asked(step, state)
        val others = perm(state.seed, n, 100 + state.part).filter { it != right }.take(minOf(opts(step) ?: 4, n) - 1)
        val all = others + right
        return perm(state.seed, all.size, 200 + state.part).map { all[it] }
    }

    /** What a listening or picture round shows: the word to read (no voice, or the picture → word mode) or not. */
    data class Prompt(val mode: String, val word: String, val pic: String, val showWord: Boolean, val ask: String, val note: String?)

    fun prompt(step: EnglishGame, state: StepState, voice: Boolean): Prompt {
        val item = items(step)[asked(step, state)]
        val mode = if (step is Listen) "listen" else if ((step as PictureGame).mode == "word") "word" else "pic"
        val hear = mode == "listen" && voice
        val fallback = when { mode == "word" -> "انظر إلى الصورة، ثم اضغط على الكلمة الصحيحة"; hear -> "استمع، ثم اضغط على الصورة الصحيحة 🔊"; else -> "اقرأ، ثم اضغط على الصورة الصحيحة 👀" }
        val q = (step as? Listen)?.q ?: (step as? PictureGame)?.q
        return Prompt(mode, item.en, item.pic, showWord = mode != "word" && !hear, ask = q ?: fallback,
            note = if (mode == "listen" && !voice) NO_VOICE else null)
    }

    // ---------- build · adjorder: tiles left to right ----------

    fun buildTiles(step: Build, part: Int) = step.items[part].parts
    fun adjCats(item: AdjItem) = item.cats ?: item.adjs.map(::catOf)

    /** The tiles' order on screen: shuffled, never already in order when that can be helped (web: up to 8 tries). */
    fun tileOrder(tiles: List<String>, seed: Int, part: Int, strictlyMixed: Boolean): List<Int> {
        var order = perm(seed, tiles.size, 500 + part)
        var g = 0
        while (g < 8 && tiles.size > 1 && (strictlyMixed || tiles.size > 2) && order.withIndex().all { (n, j) -> tiles[j] == tiles[n] }) {
            g++; order = perm(seed, tiles.size, 500 + part + 1000 * g)
        }
        // Adjectives are never shown in order (after eight unlucky shuffles: turned by one).
        if (strictlyMixed && tiles.size > 1 && order.withIndex().all { (n, j) -> tiles[j] == tiles[n] }) order = order.drop(1) + order.first()
        return order
    }
    fun buildOrder(step: Build, state: StepState) = tileOrder(buildTiles(step, state.part), state.seed, state.part, strictlyMixed = false)
    fun adjOrder(step: AdjOrder, state: StepState) = tileOrder(step.items[state.part].adjs, state.seed, state.part, strictlyMixed = true)

    // ---------- spell: the word's letters and some others ----------

    private const val ABC = "abcdefghijklmnopqrstuvwxyz"
    fun letters(step: Spell, state: StepState): List<Char> {
        val word = step.items[state.part.coerceAtMost(step.items.lastIndex)].en
        val r = Random(state.seed * 31 + 300 + state.part)
        val extra = mutableListOf<Char>()
        var g = 0
        while (extra.size < (step.extra ?: 2) && g < 50) { val c = ABC[r.nextInt(26)]; if (c !in word && c !in extra) extra += c; g++ }
        val pool = word.toList() + extra
        return perm(state.seed, pool.size, 400 + state.part).map { pool[it] }
    }

    // ---------- verb · odd · chat ----------

    fun verbOrder(step: Verb, state: StepState) = perm(state.seed, step.lines[state.part].options.size, 600 + state.part)
    fun oddOrder(step: Odd, state: StepState) = perm(state.seed, step.rows[state.part].words.size, 700 + state.part)
    /** The lines the child picks (index in [Chat.lines]). */
    fun picks(step: Chat) = step.lines.indices.filter { step.lines[it].options != null }
    fun chatOrder(step: Chat, state: StepState) = perm(state.seed, step.lines[picks(step)[state.part]].options!!.size, 800 + state.part)
    /** Who the child is (web: the side of the first line to pick). */
    fun me(step: Chat) = step.lines.firstOrNull { it.options != null }?.side ?: "B"
    /** The conversation so far: said lines, and the picked lines answered; every line once the step is done. */
    fun chatShown(step: Chat, state: StepState): List<Pair<String, String>> {
        val out = mutableListOf<Pair<String, String>>()
        var pick = 0
        for (line in step.lines) {
            if (line.options != null) {
                if (pick >= state.part && !state.done) break
                out += line.side to line.options[0]; pick++
            } else out += line.side to line.text.orEmpty()
        }
        return out
    }
    /** The line the child must say next as a fallback question (web: «أكمل المحادثة: أنت 👦 Omar. اختر ما تقوله.»). */
    fun chatAsk(step: Chat): String {
        val me = step.who[me(step)]
        return step.q ?: Bidi.mixed("أكمل المحادثة: أنت ${me?.face.orEmpty()} ${me?.name.orEmpty()}. اختر ما تقوله.")
    }

    // ---------- rank ----------

    fun rankOrder(step: Rank, state: StepState) = perm(state.seed, step.items.size, 900)

    // ---------- memory ----------

    /** A card: its pair (k), its side ('a' the English, 'b' its partner: a picture, a word or Arabic). */
    data class Card(val k: Int, val side: Char, val text: String)
    fun cards(step: Memory, seed: Int): List<Card> {
        val all = step.pairs.flatMapIndexed { k, p -> listOf(Card(k, 'a', p.a), Card(k, 'b', p.b)) }
        return perm(seed, all.size, 1000).map { all[it] }
    }
    fun partner(cards: List<Card>, i: Int) = cards.indices.first { it != i && cards[it].k == cards[i].k }

    // ---------- adjectives: the book's order (web ADJ_CATS) ----------

    val ADJ_CATS: Map<String, List<String>> = linkedMapOf(
        "opinion" to listOf("nice", "lovely", "pretty", "clever", "beautiful", "smart", "funny", "elegant", "cute", "serious", "kind", "honest", "friendly", "great", "amazing", "strange", "interesting", "delicious", "wonderful"),
        "size" to listOf("big", "tall", "short", "medium-height", "small", "long", "large", "huge", "little", "tiny"),
        "shape" to listOf("fat", "slim", "thin", "square", "plump", "round", "well-built"),
        "age" to listOf("young", "old", "new", "middle-aged", "ancient", "modern"),
        "colour" to listOf("blond", "blonde", "brown", "white", "red", "black", "blue", "green", "grey", "yellow", "orange", "pink", "dark", "purple", "golden"),
    )
    val CAT_AR = linkedMapOf("opinion" to "رأي", "size" to "حجم", "shape" to "شكل", "age" to "عمر", "colour" to "لون")
    fun catOf(word: String) = ADJ_CATS.entries.firstOrNull { word.lowercase() in it.value }?.key ?: "opinion"

    // ---------- What is right now ----------

    fun expected(step: EnglishGame, state: StepState): String? {
        if (state.done) return null
        return when (step) {
            is Listen, is PictureGame -> asked(step, state).toString()
            is Build -> nextTile(buildTiles(step, state.part), state)
            is AdjOrder -> nextTile(step.items[state.part].adjs, state)
            is Spell -> {
                val word = step.items[state.part].en
                val pool = letters(step, state)
                pool.indices.firstOrNull { it.toString() !in state.placed && pool[it] == word[state.placed.size] }?.toString()
            }
            is Verb, is Chat -> "0"
            is Odd -> step.rows[state.part].let { r -> r.words.indexOf(r.odd).toString() }
            is Rank -> state.part.toString()
            is Memory -> {
                val cards = cards(step, state.seed)
                val open = state.open?.toIntOrNull()
                (if (open != null) partner(cards, open) else cards.indices.first { it.toString() !in state.found }).toString()
            }
        }
    }
    private fun nextTile(tiles: List<String>, state: StepState) =
        tiles.indices.firstOrNull { it.toString() !in state.placed && tiles[it] == tiles[state.placed.size] }?.toString()

    // ---------- A tap ----------

    fun tap(step: EnglishGame, state: StepState, value: String): StepState {
        if (state.done) return state
        return when (step) {
            is Listen, is PictureGame -> pick(step, state, value, items(step).indices) {
                val word = items(step)[asked(step, state)].en
                "✔ ${Bidi.en(word)}"
            }
            is Verb -> pick(step, state, value, step.lines[state.part].options.indices) {
                val line = step.lines[state.part]
                "✔ ${Bidi.en(line.text.replace("___", line.right).replace("*", ""))}"
            }
            is Odd -> pick(step, state, value, step.rows[state.part].words.indices) { "✏️ ${step.rows[state.part].why}" }
            is Chat -> pick(step, state, value, step.lines[picks(step)[state.part]].options!!.indices) { null }
            is Rank -> {
                val k = value.toIntOrNull() ?: return state
                if (k !in step.items.indices || k < state.part) state
                else if (k == state.part) StepMachine.right(step, state) else StepMachine.miss(step, state, "")
            }
            is Build -> tiles(step, state, value, buildTiles(step, state.part)) {
                val it = step.items[state.part]
                "✔ ${Bidi.en(it.en)}" + (it.ar?.let { a -> " — $a" } ?: "")
            }
            is AdjOrder -> tiles(step, state, value, step.items[state.part].adjs) {
                val it = step.items[state.part]
                "✔ ${Bidi.en("${it.before} ${it.adjs.joinToString(" ")} ${it.noun}")}" + (it.ar?.let { a -> " — $a" } ?: "")
            }
            is Spell -> {
                val i = value.toIntOrNull() ?: return state
                val pool = letters(step, state)
                if (i !in pool.indices || value in state.placed) return state
                val word = step.items[state.part].en
                if (pool[i] != word[state.placed.size]) return StepMachine.miss(step, state, "")
                val placed = state.placed + value
                if (placed.size < word.length) state.copy(placed = placed, glow = false)
                else StepMachine.right(step, state.copy(placed = emptyList())).withNote(step, "✔ ${Bidi.en(word)}")
            }
            is Memory -> memory(step, state, value)
        }
    }

    /** One right option per round; a wrong one is disabled once tried. */
    private fun pick(step: EnglishGame, state: StepState, value: String, valid: IntRange, note: () -> String?): StepState {
        if (value.toIntOrNull() !in valid || value in state.wrong) return state
        if (value != expected(step, state)) return StepMachine.miss(step, state, value)
        val n = note()
        return StepMachine.right(step, state).withNote(step, n)
    }

    /** Tiles tapped in order; a wrong tile may be tried again later. */
    private fun tiles(step: EnglishGame, state: StepState, value: String, tiles: List<String>, note: () -> String): StepState {
        val j = value.toIntOrNull() ?: return state
        if (j !in tiles.indices || value in state.placed) return state
        if (tiles[j] != tiles[state.placed.size]) return StepMachine.miss(step, state, "")
        val placed = state.placed + value
        if (placed.size < tiles.size) return state.copy(placed = placed, glow = false)
        val n = note()
        return StepMachine.right(step, state.copy(placed = emptyList())).withNote(step, n)
    }

    /** The round's note stays until the next round ends; the step's explanation is the helper's line once done. */
    private fun StepState.withNote(step: EnglishGame, note: String?) = copy(note = note ?: this.note)

    private fun memory(step: Memory, state: StepState, value: String): StepState {
        val cards = cards(step, state.seed)
        val i = value.toIntOrNull() ?: return state
        if (i !in cards.indices) return state
        // The pair that did not match turns back first.
        val s = state.copy(shown = emptyList())
        if (value in s.found || value == s.open) return s
        val open = s.open?.toIntOrNull() ?: return s.copy(open = value, seen = (s.seen + i).distinct())
        if (cards[open].k == cards[i].k) {
            val found = s.found + open.toString() + value
            val next = s.copy(open = null, found = found, seen = (s.seen + i).distinct(), part = found.size / 2,
                okParts = found.size / 2 - s.missedParts.coerceAtMost(found.size / 2))
            return if (found.size == cards.size) StepMachine.finish(step, next) else next
        }
        // A slip only when the right card had already been seen; the first one says the hint.
        val slip = partner(cards, open) in s.seen || partner(cards, i) in s.seen
        val after = s.copy(open = null, shown = listOf(open, i), seen = (s.seen + i).distinct())
        if (!slip) return after
        val slips = s.stepMisses + 1
        return after.copy(stepMisses = slips, misses = slips, missedParts = minOf(step.pairs.size, slips),
            line = if (slips == 1) Line(step.hint.orEmpty(), Mood.Oops) else s.line)
    }
}
