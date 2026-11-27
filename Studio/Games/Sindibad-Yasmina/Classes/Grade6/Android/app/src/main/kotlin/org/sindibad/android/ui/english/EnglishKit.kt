@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.english

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.sindibad.android.audio.Hit
import org.sindibad.android.audio.MusicEngine
import org.sindibad.android.audio.Score
import org.sindibad.android.audio.Synth
import org.sindibad.android.domain.Vocabulary
import org.sindibad.android.domain.english.Bidi
import org.sindibad.android.domain.english.WordBook
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*
import org.sindibad.android.ui.quest.AnswerButton
import org.sindibad.android.ui.quest.Ask
import org.sindibad.android.ui.quest.QuestActions
import org.sindibad.android.ui.quest.QuestKit
import org.sindibad.android.ui.quest.rich
import org.sindibad.android.ui.science.PartTarget
import org.sindibad.android.ui.science.SciencePicture
import org.sindibad.android.ui.science.drawnParts
import org.sindibad.android.ui.science.spotLabel

// The English island's part of the quest player (web: core/english/games.ts): its ten games, its word cards, the
// book's grammar box and readings, its pictures, and the English read aloud. English is laid out left to right
// inside the Arabic (right to left) screens: tiles, slots, sentences and chats flow LTR (the web's dir="ltr").

/** English text: left to right, in English (the web's dir="ltr" lang="en"). */
fun enStyle(style: TextStyle) = style.copy(textDirection = TextDirection.Ltr, localeList = LocaleList("en"))

/** A row of English: laid out left to right inside the Arabic screen. */
@Composable
fun Ltr(content: @Composable () -> Unit) = CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr, content = content)

class EnglishKit(
    private val engine: MusicEngine, private val book: QuestBook, private val scope: CoroutineScope, private val calm: Boolean,
    val voice: EnglishVoice, private val onWord: (Vocabulary) -> Unit,
) : QuestKit {
    /** The child's ⭐ words (lowercase), kept in step with the profile by the island screen. */
    var saved by mutableStateOf<Set<String>>(emptySet())

    private fun perform(build: () -> Score) { scope.launch { engine.play(withContext(Dispatchers.Default) { build() }) } }

    override val ltrEnglish get() = true
    override val bookName get() = "اللغة الإنكليزية"
    override val gainChip get() = "⭐ نجمة في لافتة HELLO"
    override val allDoneNext get() = "🎉 أضأت لافتة HELLO كلها!"

    // ---------- «أتعلّم»: words, the grammar box, readings, the planets ----------

    override fun pictureSpots(step: Explore) =
        if (step.view == "planets") drawnParts(book, step.view, step.spots.map { it.id }) else emptySet()

    override fun tapLine(step: Explore): String? = when {
        step.words != null -> if (voice.ready) "اضغط على كل بطاقة لتسمع الكلمة وتراها في جملة من الكتاب 🔊" else "اضغط على كل بطاقة لترى معناها وجملتها من الكتاب"
        step.rule != null -> "اضغط على كل جملة من جمل الكتاب لتفهم القاعدة"
        step.read != null -> "اقرأ، واضغط على كل كلمة ملوّنة لتعرف معناها"
        else -> null
    }

    @Composable override fun Picture(step: Explore, state: StepState, glow: Set<String>, act: QuestActions) {
        when (step.view) {
            "planets" -> {
                val drawn = pictureSpots(step)
                val spots = step.spots.filter { it.id in drawn }
                SciencePicture(
                    "planets", book.view("planets"), key = step, found = state.found.toSet(), latest = state.open, calm = calm,
                    description = step.title,
                    labels = spots.filter { it.id in state.found }.mapNotNull { s -> spotLabel(s)?.let { s.id to it } }.toMap(),
                    targets = spots.map { s ->
                        PartTarget(s.id, s.name + if (s.id in state.found) "، اكتُشف" else "", glow = s.id in glow,
                            enabled = !step.guided || s.id in glow || s.id in state.found, done = s.id in state.found)
                    },
                    drawn = EnglishArt["planets"], onTap = act.tap,
                )
            }
            "rule" -> step.rule?.table?.let { RuleTable(it) }
            "read" -> step.read?.let { ReadingCard(it, voice) }
            else -> {}
        }
    }

    /** The word card of an opened word (web words.ts / games.ts exploreStep). */
    @Composable override fun openSpot(step: Explore, spot: Spot): Boolean {
        val word = wordOf(step, spot) ?: return false
        val quest = remember(word) { WordBook.find(book, word.en)?.first }
        VocabCard(word, saved = word.en.lowercase() in saved, voice = voice, onToggle = { onWord(WordBook.entry(word, quest)) })
        return true
    }

    override fun onSpot(step: Explore, spot: Spot) {
        perform { Score(listOf(Hit(0.0, Synth.piano("G5", .25, .07))), emptyList(), .3) }
        val word = wordOf(step, spot)
        voice.say(if (word != null) "${word.en}. ${word.ex}" else Bidi.plain(spot.title).takeIf(Bidi::isEnglish))
    }

    override fun hasArt(name: String) = (name.startsWith("art:") || name.startsWith("p:")) && EnglishArt.has(name)
    @Composable override fun Art(name: String, modifier: Modifier) = WordPicture(name, modifier)
    @Composable override fun Show(name: String) { if (EnglishArt.has(name)) WordPicture(name, Modifier.size(96.dp)) }
    override fun play(sound: Sound) {}
    override fun stepOpened(step: Step) {}

    @Composable override fun labelPicture(step: LabelStep, state: StepState, act: QuestActions): Boolean {
        val view = EnglishArt[step.view] ?: return false
        val drawn = drawnParts(book, step.view, step.ask.map { it.id })
        val want = StepMachine.expected(step, state)
        // TalkBack reads the parts by number, not by name: their names are the answers.
        val asks = step.ask.filter { it.id in drawn }.sortedBy { a -> book.view(step.view)?.spots?.indexOfFirst { it.id == a.id } }
        SciencePicture(
            step.view, book.view(step.view), key = step, found = state.found.toSet(), latest = null, calm = true,
            description = Bidi.plain(step.q),
            labels = step.ask.filter { it.id in state.found }.associate { it.id to it.name },
            targets = asks.mapIndexed { i, a ->
                val done = a.id in state.found
                PartTarget(a.id, if (done) a.name else "جزء من الصورة ${i + 1}", glow = state.reveal && a.id == want, enabled = !state.done && !done, done = done)
            },
            drawn = view, onTap = act.tap,
        )
        // The part asked for is read aloud (the web's ask line is English).
        if (!state.done) LaunchedEffect(step, state.part, voice.ready) { voice.say(step.ask[state.part].name) }
        return true
    }

    override fun silence() { engine.stop(); voice.stop() }
    override fun feedback(good: Boolean, finished: Boolean) = perform {
        when {
            !good -> Score(listOf(Hit(0.0, Synth.piano("C3", .35, .14))), emptyList(), .4)
            finished -> Score(listOf("C5", "E5", "G5").mapIndexed { i, n -> Hit(i * .09, Synth.piano(n, .5, .12)) }, emptyList(), .8)
            else -> Score.EMPTY
        }
    }

    // ---------- The games ----------

    @Composable override fun game(step: Step, state: StepState, act: QuestActions): Boolean {
        if (step !is EnglishGame) return false
        when (step) {
            is Listen -> PickView(step, step.items, state, act, voice)
            is PictureGame -> PickView(step, step.items, state, act, voice)
            is Build -> BuildView(step, state, act)
            is AdjOrder -> AdjOrderView(step, state, act)
            is Spell -> SpellView(step, state, act, voice)
            is Verb -> VerbView(step, state, act)
            is Memory -> MemoryView(step, state, act)
            is Odd -> OddView(step, state, act)
            is Rank -> RankView(step, state, act)
            is Chat -> ChatView(step, state, act)
        }
        return true
    }

    /** A part answered right: its English is read aloud (web: sayEn after each round). */
    override fun answered(step: Step, before: StepState, after: StepState) {
        voice.say(spoken(step, before, after))
    }

    private fun wordOf(step: Explore, spot: Spot): Word? {
        val words = step.words ?: return null
        return words.firstOrNull { it.en.equals(spot.label, ignoreCase = true) }
            ?: spot.id.removePrefix("w").toIntOrNull()?.takeIf { spot.id.startsWith("w") }?.let(words::getOrNull)
    }

    companion object {
        /** The English read aloud when a part is answered right (null: nothing). */
        fun spoken(step: Step, before: StepState, after: StepState): String? = when (step) {
            is Listen -> step.items[EnglishGames.asked(step, before)].en
            is PictureGame -> step.items[EnglishGames.asked(step, before)].en
            is Build -> step.items[before.part].en
            is AdjOrder -> step.items[before.part].let { "${it.before} ${it.adjs.joinToString(" ")} ${it.noun}" }
            is Spell -> step.items[before.part].en
            is Verb -> step.lines[before.part].let { it.text.replace("___", it.right) }
            is Odd -> step.rows[before.part].odd
            is Rank -> step.items[before.part].en
            is Chat -> step.lines[EnglishGames.picks(step)[before.part]].options?.firstOrNull()
            is Memory -> after.found.lastOrNull()?.toIntOrNull()?.let { EnglishGames.cards(step, after.seed).getOrNull(it) }
                ?.let { c -> step.pairs[c.k].a }?.takeIf(Bidi::isEnglish)
            else -> null
        }?.let(Bidi::plain)
    }
}

// ---------- Word cards ----------

/** The sentence with its word marked (web games.ts mark()). */
fun markWord(sentence: String, word: String) = buildAnnotatedString {
    val w = word.lowercase().replace(Regex("^(the|a|an|to) "), "")
    val stem = if (w.length > 4) w.replace(Regex("(s|es|ing|ed|y)$"), "") else w
    val m = Regex("\\b(${Regex.escape(stem)}[a-z]*)", RegexOption.IGNORE_CASE).find(sentence)
    if (m == null) { append(sentence); return@buildAnnotatedString }
    append(sentence.substring(0, m.range.first))
    withStyle(SpanStyle(fontWeight = FontWeight.Bold, background = Gold.copy(alpha = .45f))) { append(m.value) }
    append(sentence.substring(m.range.last + 1))
}

/** A word card: its picture, the word (LTR), its Arabic, the book's sentence, 🔊 (with a voice) and ⭐ (my words). */
@Composable
fun VocabCard(word: Word, saved: Boolean, voice: EnglishVoice, onToggle: () -> Unit, modifier: Modifier = Modifier) {
    Surface(color = Color.White, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Gold),
        modifier = modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.semantics(mergeDescendants = true) { }, horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                WordPicture(word.pic, Modifier.size(72.dp), emoji = 46.sp)
                Column(Modifier.weight(1f)) {
                    Text(word.en, style = enStyle(MaterialTheme.typography.headlineSmall), fontWeight = FontWeight.Bold, color = Sea)
                    Text(word.ar, style = MaterialTheme.typography.titleMedium)
                }
            }
            Text(markWord(word.ex, word.en), style = enStyle(MaterialTheme.typography.bodyLarge), modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (voice.ready) OutlinedButton(onClick = { voice.say("${word.en}. ${word.ex}") }, Modifier.heightIn(min = 48.dp).semantics { contentDescription = "استمع إلى ${word.en}" }) { Text("🔊") }
                OutlinedButton(onClick = onToggle, Modifier.heightIn(min = 48.dp).semantics { stateDescription = if (saved) "في كلماتي" else "ليست في كلماتي" }) {
                    Text(if (saved) "⭐ في كلماتي (اضغط للحذف)" else "☆ أضف إلى كلماتي")
                }
            }
        }
    }
}

/** The book's grammar box: its table, left to right, the first row as heads. */
@Composable
private fun RuleTable(table: List<List<String>>) {
    val cols = table.maxOf { it.size }
    Ltr {
        Surface(color = Color.White, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, Sand), modifier = Modifier.fillMaxWidth()) {
            Column {
                table.forEachIndexed { r, row ->
                    Row(Modifier.fillMaxWidth().background(if (r == 0) Teal.copy(alpha = .15f) else if (r % 2 == 0) Paper else Color.White).padding(horizontal = 8.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (c in 0 until cols) {
                            val cell = row.getOrElse(c) { "" }
                            Text(cell, Modifier.weight(1f), fontWeight = if (r == 0) FontWeight.Bold else FontWeight.Normal,
                                style = if (Bidi.isEnglish(cell)) enStyle(MaterialTheme.typography.bodyMedium) else MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

/** A reading: its glossary words in colour (their meanings are the cards below), and «🔊 اقرأ لي النص». */
@Composable
private fun ReadingCard(read: Reading, voice: EnglishVoice) {
    Surface(color = Color.White, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, Sand), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            read.title?.let { Text(it, Modifier.fillMaxWidth(), fontWeight = FontWeight.Bold, style = enStyle(MaterialTheme.typography.titleMedium), color = Sea) }
            val text = buildAnnotatedString {
                read.text.split('[').forEachIndexed { i, part ->
                    if (i == 0) { append(part); return@forEachIndexed }
                    val end = part.indexOf(']')
                    if (end < 0) { append(part); return@forEachIndexed }
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Teal, background = Gold.copy(alpha = .25f))) { append(part.substring(0, end)) }
                    append(part.substring(end + 1))
                }
            }
            Text(text, Modifier.fillMaxWidth(), style = enStyle(MaterialTheme.typography.bodyLarge))
            if (voice.ready) OutlinedButton(onClick = { voice.say(read.text.replace("[", "").replace("]", "")) }, Modifier.heightIn(min = 48.dp)) { Text("🔊 اقرأ لي النص") }
        }
    }
}

// ---------- listen · picture ----------

private fun isEmoji(pic: String) = !pic.startsWith("art:") && !pic.startsWith("p:")

@Composable
private fun PickView(step: EnglishGame, items: List<PicItem>, state: StepState, act: QuestActions, voice: EnglishVoice) {
    val p = EnglishGames.prompt(step, state, voice.ready)
    Ask(p.ask)
    if (state.done) return
    // A new round reads its word (the listening game); again with 🔊.
    if (p.mode == "listen") LaunchedEffect(state.seed, state.part, voice.ready) { voice.say(p.word, queue = true) }
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (p.mode == "word") WordPicture(p.pic, Modifier.size(110.dp), emoji = 72.sp, description = if (isEmoji(p.pic)) "الصورة: ${p.pic}" else "الصورة")
        if (p.showWord) Text(p.word, style = enStyle(MaterialTheme.typography.headlineMedium), fontWeight = FontWeight.Bold, color = Sea)
        if (p.mode != "word" && voice.ready) OutlinedButton(onClick = { voice.say(p.word) }, Modifier.heightIn(min = 56.dp).semantics { contentDescription = "استمع مرة أخرى" }) {
            Text("🔊", fontSize = 26.sp)
        }
        p.note?.let { Text(it, Modifier.semantics { liveRegion = LiveRegionMode.Polite }, color = Rose, style = MaterialTheme.typography.bodyLarge) }
    }
    val want = EnglishGames.expected(step, state)
    val options = EnglishGames.options(step, state)
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 2) {
        options.forEachIndexed { n, i ->
            val v = i.toString()
            val item = items[i]
            if (p.mode == "word") AnswerButton(item.en, Modifier.weight(1f), glow = state.reveal && v == want, tried = v in state.wrong, onClick = { act.tap(v) })
            else AnswerButton("", Modifier.weight(1f), glow = state.reveal && v == want, tried = v in state.wrong,
                description = "الخيار ${n + 1}" + if (isEmoji(item.pic)) ": ${item.pic}" else "", onClick = { act.tap(v) }) {
                WordPicture(item.pic, Modifier.size(64.dp), emoji = 44.sp)
            }
        }
    }
}

// ---------- build · adjorder: tiles, left to right ----------

private val CAT_COLOR = mapOf("opinion" to Color(0xFFEC79A8), "size" to Color(0xFF3F8FD6), "shape" to Color(0xFF4FAE45), "age" to Color(0xFFE0882F), "colour" to Color(0xFF8A63C9))

@Composable
private fun Tile(text: String, color: Color = Sand) {
    Surface(color = color.copy(alpha = .3f), shape = RoundedCornerShape(10.dp), border = BorderStroke(1.dp, color)) {
        Text(text, Modifier.padding(horizontal = 10.dp, vertical = 8.dp), style = enStyle(MaterialTheme.typography.titleMedium))
    }
}
@Composable
private fun Gap() = Surface(color = Color.White, shape = RoundedCornerShape(10.dp), border = BorderStroke(1.dp, Sand)) {
    Text("      ", Modifier.padding(horizontal = 10.dp, vertical = 8.dp), style = MaterialTheme.typography.titleMedium)
}

/** The sentence so far (placed tiles, then gaps) and the tiles left, all left to right. */
@Composable
private fun Tiles(
    tiles: List<String>, order: List<Int>, state: StepState, act: QuestActions, before: String? = null, after: String? = null,
    cats: List<String>? = null,
) {
    val want = state.placed.size.let { n -> order.firstOrNull { it.toString() !in state.placed && tiles[it] == tiles.getOrNull(n) }?.toString() }
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            FlowRow(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { }, horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                before?.let { Text(it, Modifier.align(Alignment.CenterVertically), style = enStyle(MaterialTheme.typography.titleMedium)) }
                for (j in tiles.indices) {
                    val at = state.placed.getOrNull(j)?.toIntOrNull()
                    if (at != null) Tile(tiles[at], cats?.let { CAT_COLOR[it[at]] } ?: Correct) else Gap()
                }
                after?.let { Text(it, Modifier.align(Alignment.CenterVertically), style = enStyle(MaterialTheme.typography.titleMedium)) }
            }
            if (!state.done) FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                order.forEach { j ->
                    val v = j.toString()
                    if (v in state.placed) return@forEach
                    AnswerButton(tiles[j], glow = state.reveal && v == want, onClick = { act.tap(v) },
                        description = tiles[j] + (cats?.let { " (${EnglishGames.CAT_AR[it[j]]})" } ?: "")) {
                        cats?.let { c -> Text(c[j], color = CAT_COLOR[c[j]] ?: Ink, style = MaterialTheme.typography.labelSmall) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Progress(state: StepState, total: Int) {
    Text("${minOf(state.part, total)} / $total ✓", style = MaterialTheme.typography.bodyMedium)
}

@Composable
private fun BuildView(step: Build, state: StepState, act: QuestActions) {
    Ask(step.q ?: "اضغط على الكلمات بالترتيب لتبني جملة الكتاب")
    if (!state.done) Tiles(EnglishGames.buildTiles(step, state.part), EnglishGames.buildOrder(step, state), state, act)
    Progress(state, step.items.size)
}

@Composable
private fun AdjOrderView(step: AdjOrder, state: StepState, act: QuestActions) {
    Ask(step.q ?: "ضع الصفات بالترتيب الذي يعلّمه الكتاب")
    // The book's order, left to right: opinion › size › shape › age › colour.
    Ltr {
        FlowRow(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "ترتيب الصفات: رأي، حجم، شكل، عمر، لون" },
            horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            EnglishGames.CAT_AR.entries.forEachIndexed { i, (c, ar) ->
                if (i > 0) Text("›", Modifier.align(Alignment.CenterVertically))
                Surface(color = (CAT_COLOR[c] ?: Sand).copy(alpha = .2f), shape = RoundedCornerShape(8.dp), border = BorderStroke(1.dp, CAT_COLOR[c] ?: Sand)) {
                    Column(Modifier.padding(horizontal = 6.dp, vertical = 2.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(c, style = enStyle(MaterialTheme.typography.labelMedium)); Text(ar, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
    if (!state.done) {
        val it = step.items[state.part]
        Tiles(it.adjs, EnglishGames.adjOrder(step, state), state, act, before = it.before, after = it.noun, cats = EnglishGames.adjCats(it))
    }
    Progress(state, step.items.size)
}

// ---------- spell ----------

@Composable
private fun SpellView(step: Spell, state: StepState, act: QuestActions, voice: EnglishVoice) {
    Ask(step.q ?: "اضغط على الحروف بالترتيب لتكتب الكلمة")
    if (!state.done) {
        val item = step.items[state.part]
        val word = item.en
        val pool = EnglishGames.letters(step, state)
        val want = EnglishGames.expected(step, state)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
            item.pic?.let { WordPicture(it, Modifier.size(72.dp), emoji = 52.sp, description = if (isEmoji(it)) "الصورة: $it" else "الصورة") }
            Column {
                item.show?.let { Text(it, style = enStyle(MaterialTheme.typography.titleLarge), fontWeight = FontWeight.Bold) }
                item.ar?.let { Text(it, style = MaterialTheme.typography.titleMedium) }
            }
            if (voice.ready) OutlinedButton(onClick = { voice.say(word) }, Modifier.heightIn(min = 48.dp).semantics { contentDescription = "استمع إلى الكلمة" }) { Text("🔊") }
        }
        Ltr {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                FlowRow(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "الحروف: " + state.placed.joinToString(" ") { pool[it.toInt()].toString() } },
                    horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    for (j in word.indices) {
                        val at = state.placed.getOrNull(j)?.toIntOrNull()
                        if (at != null) Tile(pool[at].toString(), Correct) else Gap()
                    }
                }
                FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    pool.forEachIndexed { i, c ->
                        val v = i.toString()
                        AnswerButton(c.toString(), Modifier.widthIn(min = 52.dp), glow = state.reveal && v == want, right = v in state.placed,
                            enabled = v !in state.placed, onClick = { act.tap(v) })
                    }
                }
            }
        }
    }
    Progress(state, step.items.size)
}

// ---------- verb · odd ----------

@Composable
private fun VerbView(step: Verb, state: StepState, act: QuestActions) {
    Ask(step.q ?: "اختر الكلمة الصحيحة للفراغ")
    if (!state.done) {
        val line = step.lines[state.part]
        val gap = "____" + (line.base?.let { " ($it)" } ?: "")
        val parts = line.text.split("___")
        val sentence = buildAnnotatedString {
            parts.forEachIndexed { i, s ->
                // *clue* words are shown in italics (the web's <i>).
                s.split('*').forEachIndexed { k, t -> if (k % 2 == 1) withStyle(SpanStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic, color = Teal)) { append(t) } else append(t) }
                if (i < parts.lastIndex) withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Rose)) { append(gap) }
            }
        }
        Text(sentence, Modifier.fillMaxWidth(), style = enStyle(MaterialTheme.typography.titleLarge))
        val want = EnglishGames.expected(step, state)
        Ltr {
            FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                EnglishGames.verbOrder(step, state).forEach { i ->
                    val v = i.toString()
                    AnswerButton(line.options[i], Modifier.weight(1f), glow = state.reveal && v == want, tried = v in state.wrong, onClick = { act.tap(v) })
                }
            }
        }
    }
    Progress(state, step.lines.size)
}

@Composable
private fun OddView(step: Odd, state: StepState, act: QuestActions) {
    Ask(step.q ?: "اضغط على الكلمة الغريبة عن المجموعة")
    if (!state.done) {
        val row = step.rows[state.part]
        val want = EnglishGames.expected(step, state)
        Ltr {
            FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 2) {
                EnglishGames.oddOrder(step, state).forEach { i ->
                    val v = i.toString()
                    AnswerButton(row.words[i], Modifier.weight(1f), glow = state.reveal && v == want, tried = v in state.wrong, onClick = { act.tap(v) })
                }
            }
        }
    }
    Progress(state, step.rows.size)
}

// ---------- rank ----------

@Composable
private fun RankView(step: Rank, state: StepState, act: QuestActions) {
    Ask(step.q ?: "اضغط بالترتيب")
    val n = step.items.size
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("1 · ${step.ends.getOrElse(0) { "" }}", style = enStyle(MaterialTheme.typography.labelLarge), color = Teal)
                Text("$n · ${step.ends.getOrElse(1) { "" }}", style = enStyle(MaterialTheme.typography.labelLarge), color = Teal)
            }
            // The places: filled left to right.
            FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                for (k in 0 until n) {
                    val done = k < state.part || state.done
                    Surface(color = if (done) Correct.copy(alpha = .12f) else Color.White, shape = RoundedCornerShape(10.dp), border = BorderStroke(1.dp, if (done) Correct else Sand),
                        modifier = Modifier.widthIn(min = 56.dp).semantics(mergeDescendants = true) { }) {
                        Column(Modifier.padding(6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${k + 1}", style = MaterialTheme.typography.labelSmall)
                            if (done) {
                                step.items[k].pic?.let { WordPicture(it, Modifier.size(32.dp), emoji = 22.sp) }
                                Text(step.items[k].en, style = enStyle(MaterialTheme.typography.labelMedium))
                            }
                        }
                    }
                }
            }
            if (!state.done) FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3) {
                val want = EnglishGames.expected(step, state)
                EnglishGames.rankOrder(step, state).forEach { k ->
                    if (k < state.part) return@forEach
                    val v = k.toString()
                    val it = step.items[k]
                    AnswerButton(it.en, Modifier.weight(1f), glow = state.reveal && v == want, onClick = { act.tap(v) },
                        description = it.en + (it.ar?.let { a -> "، $a" } ?: "")) {
                        it.pic?.let { p -> WordPicture(p, Modifier.size(44.dp), emoji = 30.sp) }
                    }
                }
            }
        }
    }
}

// ---------- memory ----------

@Composable
private fun MemoryView(step: Memory, state: StepState, act: QuestActions) {
    Ask(step.q ?: "اقلب بطاقتين في كل مرة، وابحث عن كل بطاقتين تتّفقان")
    val cards = remember(step, state.seed) { EnglishGames.cards(step, state.seed) }
    val open = state.open?.toIntOrNull()
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 4) {
        cards.forEachIndexed { i, c ->
            val v = i.toString()
            val found = v in state.found
            val up = found || i == open || i in state.shown || state.done
            AnswerButton("", Modifier.weight(1f).heightIn(min = 72.dp), right = found, enabled = !found && i != open && !state.done,
                description = if (up) "بطاقة ${i + 1}: ${Bidi.plain(c.text)}" else "بطاقة ${i + 1}، مقلوبة", onClick = { act.tap(v) }) {
                when {
                    !up -> Text("?", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Teal)
                    EnglishArt.isPicture(c.text) -> WordPicture(c.text, Modifier.size(44.dp), emoji = 30.sp)
                    else -> Text(c.text, style = if (Bidi.isEnglish(c.text)) enStyle(MaterialTheme.typography.titleSmall) else MaterialTheme.typography.titleSmall)
                }
            }
        }
        repeat((4 - cards.size % 4) % 4) { Spacer(Modifier.weight(1f)) }
    }
    Text("${state.found.size / 2} / ${step.pairs.size} ✓", style = MaterialTheme.typography.bodyMedium)
}

// ---------- chat ----------

@Composable
private fun ChatView(step: Chat, state: StepState, act: QuestActions) {
    Ask(EnglishGames.chatAsk(step))
    val me = EnglishGames.me(step)
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            EnglishGames.chatShown(step, state).forEach { (side, text) ->
                val who = step.who[side]
                val mine = side == me
                Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { }, horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start, verticalAlignment = Alignment.Bottom) {
                    if (!mine) Text(who?.face.orEmpty(), fontSize = 26.sp)
                    Surface(color = if (mine) Teal.copy(alpha = .14f) else Color.White, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, if (mine) Teal else Sand),
                        modifier = Modifier.widthIn(max = 280.dp)) {
                        Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                            Text(who?.name.orEmpty(), style = enStyle(MaterialTheme.typography.labelMedium), color = Teal)
                            Text(text, style = enStyle(MaterialTheme.typography.bodyLarge))
                        }
                    }
                    if (mine) Text(who?.face.orEmpty(), fontSize = 26.sp)
                }
            }
            if (!state.done) {
                val line = step.lines[EnglishGames.picks(step)[state.part]]
                val want = EnglishGames.expected(step, state)
                EnglishGames.chatOrder(step, state).forEach { i ->
                    val v = i.toString()
                    AnswerButton(line.options!![i], Modifier.fillMaxWidth(), glow = state.reveal && v == want, tried = v in state.wrong, onClick = { act.tap(v) })
                }
            }
        }
    }
}
