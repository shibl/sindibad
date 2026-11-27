@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.quest

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.Preferences
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*

// The native quest player, shared by every island: the header with the steps, the helper's line, the step
// (shared kinds here, the island's own games from its QuestKit), «تابِع ◀» with the explanation, and the
// result card. Rules live in domain/quest (StepMachine): the UI only draws a state and reports taps.

/** What a step's UI may do. Values are those of [StepMachine.expected]. */
class QuestActions(val tap: (String) -> Unit, val drum: (List<Long>) -> Unit, val undo: () -> Unit)

/**
 * An island's part of the quest player: its own step kinds, its «أتعلّم» pictures, its art and sounds.
 * The `label` step's pictures are an island's too ([labelPicture]): science's cell, the atlas's map…
 */
interface QuestKit {
    /** Draws an island-only step kind; false when the kind is not the island's. */
    @Composable fun game(step: Step, state: StepState, act: QuestActions): Boolean
    /** The spots an «أتعلّم» picture draws itself (the rest become cards). */
    fun pictureSpots(step: Explore): Set<String>
    /** The «أتعلّم» picture: `glow` = spots that may be tapped now. */
    @Composable fun Picture(step: Explore, state: StepState, glow: Set<String>, act: QuestActions)
    /** A spot opened: its sound, lights… */
    fun onSpot(step: Explore, spot: Spot)
    fun hasArt(name: String): Boolean
    @Composable fun Art(name: String, modifier: Modifier)
    /** A picture card above a question or a short card (`show`). */
    @Composable fun Show(name: String)
    /** Plays a step's `listen` / `play` sound. */
    fun play(sound: Sound)
    /** Called when a step opens (fresh, not on restoration): its automatic sound. */
    fun stepOpened(step: Step)
    /** The picture of a `label` step: false if the island has none for this view. */
    @Composable fun labelPicture(step: LabelStep, state: StepState, act: QuestActions): Boolean = false
    /** A picture on an `order` chip (the glasses' fractions); nothing by default. */
    @Composable fun OrderChip(step: Order, k: Int) {}
    /** An `order` item was put in its place (its sound; the whole tune once finished). */
    fun orderPlaced(step: Order, k: Int, finished: Boolean) {}
    /** A right / wrong / finished sound (respecting the sound preference). */
    fun feedback(good: Boolean, finished: Boolean)
    /** Stops every sound (leaving a step). */
    fun silence()
    /** A question's picture (`pic`: science's force vector…); nothing by default. */
    @Composable fun QuestionPicture(name: String) {}
    /** A question's picture that depends on the step (the atlas's map with its area and marked places). */
    @Composable fun QuestionPicture(step: Step, name: String) = QuestionPicture(name)
    /** The result card's words: the book the quest comes from, the first-finish chip, the line once all are done. */
    val bookName: String get() = "التربية الموسيقية"
    val gainChip: String get() = "🎵 نوتة ذهبية"
    val allDoneNext: String get() = "🎉 جمعت النوتات الذهبية كلها!"
}

/** **bold** → bold spans. */
fun rich(text: String): AnnotatedString = buildAnnotatedString {
    text.split("**").forEachIndexed { i, part -> if (i % 2 == 1) withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(part) } else append(part) }
}
private val LATIN = Regex("^[A-Za-z0-9/ .+×=−-]+$")
fun isLatin(text: String) = LATIN.matches(text)

@Composable
fun QuestScreen(
    run: QuestRun, book: QuestBook, kit: QuestKit, prefs: Preferences, reward: QuestReward?, nextQuest: Quest?,
    helperFace: @Composable (Mood, Modifier) -> Unit, act: QuestActions, next: () -> Unit, close: () -> Unit, saveAgain: () -> Unit,
    busy: Boolean,
) {
    val quest = run.quest(book)
    val scroll = rememberScrollState()
    LaunchedEffect(run.index, run.finished) { scroll.scrollTo(0); kit.silence() }
    QuestFeedback(run, kit, prefs)
    // A fresh step plays its own sound once (not again after rotation or process death).
    var opened by rememberSaveable { mutableStateOf("") }
    val key = "${run.id}:${run.index}"
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(key) {
        if (opened != key && !run.finished && !run.state.done && lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) kit.stepOpened(run.step(book))
        opened = key
    }
    Column(Modifier.fillMaxSize().verticalScroll(scroll).padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        QuestHeader(quest, run)
        if (run.finished) { ResultCard(quest, run, book, kit, reward, nextQuest, busy, saveAgain, close); return@Column }
        val step = run.step(book)
        val line = run.state.line ?: Line(step.say ?: step.hint ?: quest.goal, Mood.Happy)
        HelperLine(book.helper.name, line, helperFace)
        PaperCard(Modifier.fillMaxWidth()) {
            StepView(step, run.state, kit, act)
            if (run.state.done) GoldButton(if (step is Explore) "فهمت! ◀" else "تابِع ◀", true, next)
        }
        Text("مسودة محتوى، بانتظار مراجعة معلّمين سوريين", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun QuestHeader(quest: Quest, run: QuestRun) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(quest.icon, fontSize = 30.sp)
        Column(Modifier.weight(1f)) {
            Text(quest.title, color = Color.White, style = MaterialTheme.typography.titleLarge)
            val n = quest.steps.size
            val at = if (run.finished) n else run.index
            FlowRow(Modifier.semantics(mergeDescendants = true) { contentDescription = if (run.finished) "اكتمل الدرس" else "الخطوة ${at + 1} من $n" },
                horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                quest.steps.forEachIndexed { i, s ->
                    Canvas(Modifier.size(if (s.teaches) 14.dp else 11.dp)) {
                        val fill = when { i < at -> Correct; i == at -> Gold; else -> Color.White }
                        if (s.teaches) drawRect(fill) else drawCircle(fill)
                        if (s.teaches) drawRect(Ink, style = Stroke(2f)) else drawCircle(Ink, style = Stroke(2f))
                    }
                }
            }
        }
    }
}

@Composable
fun HelperLine(name: String, line: Line, face: @Composable (Mood, Modifier) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(shape = CircleShape, color = Paper, border = BorderStroke(2.dp, Gold), modifier = Modifier.size(56.dp)) {
            face(line.mood, Modifier.fillMaxSize().clearAndSetSemantics { })
        }
        Surface(Modifier.weight(1f), color = if (line.mood == Mood.Oops) Color(0xFFFFF0E0) else Paper, shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, if (line.mood == Mood.Oops) Rose else Sand)) {
            Column(Modifier.padding(12.dp)) {
                Text(name, style = MaterialTheme.typography.labelLarge, color = Teal)
                Text(rich(line.text), Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

/** Answer sounds and haptics on each miss and each finished step; nothing plays on restoration. */
@Composable
private fun QuestFeedback(run: QuestRun, kit: QuestKit, prefs: Preferences) {
    val haptic = LocalHapticFeedback.current
    val key = Triple(run.id, run.index, run.state.wrongTick to run.state.done)
    var previous by remember { mutableStateOf(key) }
    LaunchedEffect(key) {
        if (key != previous && key.first == previous.first && key.second == previous.second) {
            val bad = run.state.wrongTick != previous.third.first
            if (prefs.haptics) haptic.performHapticFeedback(if (bad) HapticFeedbackType.LongPress else HapticFeedbackType.TextHandleMove)
            if (bad || run.state.done) kit.feedback(!bad, run.state.done)
        }
        previous = key
    }
}

@Composable
private fun ResultCard(quest: Quest, run: QuestRun, book: QuestBook, kit: QuestKit, reward: QuestReward?, next: Quest?, busy: Boolean, saveAgain: () -> Unit, close: () -> Unit) {
    val saved = reward?.runId == run.id
    PaperCard(Modifier.fillMaxWidth()) {
        Text("درس مكتمل!", color = Teal, style = MaterialTheme.typography.labelLarge)
        Text("${quest.icon} ${quest.title}", style = MaterialTheme.typography.headlineSmall)
        Stars(run.stars)
        Text("📖 تعلّمنا من كتاب «${kit.bookName}»:", fontWeight = FontWeight.Bold)
        quest.learned.forEach { Text("• ${it}", style = MaterialTheme.typography.bodyLarge) }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (saved && reward!!.first) Chip("+1 ${kit.gainChip}")
            if (saved && reward!!.pearls > 0) Chip("+${reward.pearls} 🦪")
            Chip("✔ ${fmt(run.ok)}/${fmt(run.total)}")
        }
        book.sticker(reward?.sticker)?.takeIf { saved }?.let { StickerCard(it, "📒 ملصق جديد في ألبومك!") }
        if (!saved) {
            Text(if (busy) "نحفظ النتيجة…" else "لم تُحفظ النتيجة بعد.", style = MaterialTheme.typography.bodyMedium)
            if (!busy) TextButton(onClick = saveAgain, modifier = Modifier.heightIn(min = 48.dp)) { Text("احفظ النتيجة") }
        }
        Text(if (next != null) "الدرس التالي: ${next.icon} ${next.title}" else kit.allDoneNext, fontWeight = FontWeight.Bold)
        GoldButton("تابِع", saved, close)
    }
}

/** A sticker with its name and fact (the result card's new sticker, the sticker book's picked one). */
@Composable
fun StickerCard(sticker: Sticker, kicker: String? = null) {
    Surface(color = Gold.copy(alpha = .22f), shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Gold),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(sticker.icon, fontSize = 40.sp)
            Column(Modifier.weight(1f)) {
                kicker?.let { Text(it, style = MaterialTheme.typography.labelLarge, color = Teal) }
                Text(sticker.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text(rich(sticker.fact), style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

/** 2.5 → "2.5", 3.0 → "3" (the web's num()). */
fun fmt(x: Double): String = if (x == Math.floor(x)) x.toInt().toString() else "%.1f".format(java.util.Locale.ROOT, x)

@Composable
fun Chip(text: String) {
    Surface(color = Sand.copy(alpha = .6f), shape = RoundedCornerShape(12.dp)) { Text(text, Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) }
}

// ---------- Steps ----------

@Composable
private fun StepView(step: Step, state: StepState, kit: QuestKit, act: QuestActions) {
    when (step) {
        is Explore -> ExploreView(step, state, kit, act)
        is Learn -> {
            Text(step.title, style = MaterialTheme.typography.titleLarge)
            step.show?.let { kit.Show(it) }
            Text(rich(step.html), style = MaterialTheme.typography.bodyLarge)
            step.play?.let { p -> OutlinedButton(onClick = { kit.play(p) }, Modifier.heightIn(min = 48.dp)) { Text("▶ اسمع") } }
            if (!state.done) GoldButton("فهمت ✓", true) { act.tap("next") }
        }
        is Choice -> {
            Ask(step.q)
            step.pic?.let { kit.QuestionPicture(step, it) }
            step.show?.let { kit.Show(it) }
            step.listen?.let { p -> OutlinedButton(onClick = { kit.play(p) }, Modifier.heightIn(min = 48.dp)) { Text(if (p.tempo != null) "▶ اسمع السرعة" else "▶ اسمع") } }
            Options(step.options, state, art = step.art?.takeIf { a -> a.all(kit::hasArt) }, kit = kit, act = act)
        }
        is TwoWay -> { TwoWayView(step, state, act) { step.pic?.let { kit.QuestionPicture(step, it) } } }
        is Sort -> SortView(step, state, act) { step.pic?.let { kit.QuestionPicture(step, it) } }
        is Order -> OrderView(step, state, kit, act)
        is Match -> MatchView(step, state, act) { step.pic?.let { kit.QuestionPicture(step, it) } }
        is TrueOrFalse -> TrueFalseView(step, state, act) { step.pic?.let { kit.QuestionPicture(step, it) } }
        is NumberStep -> NumberView(step, state, act) { step.pic?.let { kit.QuestionPicture(step, it) } }
        is LabelStep -> {
            Ask(step.q)
            if (!state.done) Text("👆 ${step.ask[state.part].name}", style = MaterialTheme.typography.titleMedium)
            if (!kit.labelPicture(step, state, act)) Text("هذه الصورة غير متوفرة في التطبيق بعد.", color = Rose)
        }
        else -> if (!kit.game(step, state, act)) Text("هذه الخطوة غير متوفرة في التطبيق بعد.", color = Rose)
    }
    state.note?.let { Text(it, Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.bodyLarge, color = Teal) }
}

@Composable
fun Ask(q: String) = Text(rich(q), style = MaterialTheme.typography.titleMedium)

/** A big answer button: glows (gold) when revealed, green once right, faded once tried wrong. */
@Composable
fun AnswerButton(
    label: String, modifier: Modifier = Modifier, glow: Boolean = false, right: Boolean = false, tried: Boolean = false,
    enabled: Boolean = true, description: String? = null, onClick: () -> Unit, content: (@Composable ColumnScope.() -> Unit)? = null,
) {
    val border = when { right -> BorderStroke(3.dp, Correct); glow -> BorderStroke(4.dp, Gold); else -> BorderStroke(1.dp, Sand) }
    Surface(onClick = onClick, enabled = enabled && !tried, shape = RoundedCornerShape(16.dp), border = border,
        color = when { right -> Correct.copy(alpha = .14f); tried -> Color(0xFFEDE6DA); glow -> Gold.copy(alpha = .25f); else -> Color.White },
        modifier = modifier.heightIn(min = 52.dp).semantics {
            description?.let { contentDescription = it }
            if (glow) stateDescription = "يلمع ✨"
            if (right) stateDescription = "صحيح"
        }) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            content?.invoke(this)
            if (label.isNotEmpty()) Text(label, textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium,
                color = if (tried) Ink.copy(alpha = .45f) else Ink,
                modifier = if (isLatin(label)) Modifier.semantics { } else Modifier)
        }
    }
}

/** Options where "0" is right, shown in the step's fixed shuffle. */
@Composable
fun Options(options: List<String>, state: StepState, art: List<String>? = null, kit: QuestKit? = null, act: QuestActions, salt: Int = 0) {
    val order = StepMachine.permutation(state, options.size, salt)
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
        maxItemsInEachRow = if (art != null) 3 else Int.MAX_VALUE) {
        order.forEach { i ->
            val value = i.toString()
            AnswerButton(options[i], Modifier.then(if (art != null) Modifier.weight(1f) else Modifier.fillMaxWidth()),
                glow = state.reveal && i == 0 && !state.done, right = state.done && i == 0, tried = value in state.wrong,
                enabled = !state.done, onClick = { act.tap(value) }) {
                if (art != null && kit != null) kit.Art(art[i], Modifier.size(72.dp))
            }
        }
    }
}

@Composable
private fun TwoWayView(step: TwoWay, state: StepState, act: QuestActions, picture: @Composable () -> Unit = {}) {
    Ask(step.q)
    picture()
    step.lines.forEachIndexed { k, line ->
        val filled = if (k < state.part) line.text.replace("___", "«${line.right}»") else line.text.replace("___", "…")
        Text(filled, style = MaterialTheme.typography.bodyLarge, fontWeight = if (k == state.part && !state.done) FontWeight.Bold else FontWeight.Normal,
            color = if (k < state.part) Correct else Ink)
    }
    if (!state.done) {
        val line = step.lines[state.part]
        Options(listOf(line.right, line.wrong), state, act = act, salt = state.part)
    }
}

@Composable
private fun SortView(step: Sort, state: StepState, act: QuestActions, picture: @Composable () -> Unit = {}) {
    Ask(step.q)
    picture()
    val order = StepMachine.permutation(state, step.items.size)
    val placed = order.take(state.part).map { step.items[it] }
    if (!state.done) {
        val item = StepMachine.sortItem(step, state)
        Surface(color = Sand.copy(alpha = .5f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }) {
            Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${item.icon.orEmpty()} ${item.text}".trim(), style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
                Text("${state.part + 1} / ${step.items.size}", style = MaterialTheme.typography.bodySmall)
            }
        }
    } else Text("✔", style = MaterialTheme.typography.titleLarge, color = Correct)
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3) {
        step.bins.forEach { bin ->
            val glow = state.reveal && !state.done && StepMachine.sortItem(step, state).bin == bin.id
            AnswerButton("${bin.icon.orEmpty()} ${bin.label}".trim(), Modifier.weight(1f), glow = glow, enabled = !state.done, onClick = { act.tap(bin.id) }) {
                val inside = placed.filter { it.bin == bin.id }.joinToString("، ") { it.text }
                if (inside.isNotEmpty()) Text(inside, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun OrderView(step: Order, state: StepState, kit: QuestKit, act: QuestActions) {
    Ask(step.q)
    step.pic?.let { kit.QuestionPicture(step, it) }
    step.show?.let { kit.Show(it) }
    // The slots: filled in order.
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        step.items.forEachIndexed { k, t ->
            Surface(color = if (k < state.part) Correct.copy(alpha = .15f) else Color.White, shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, if (k < state.part) Correct else Sand), modifier = Modifier.heightIn(min = 40.dp).widthIn(min = 40.dp)) {
                Box(Modifier.padding(8.dp), contentAlignment = Alignment.Center) { Text(if (k < state.part) t else "${k + 1}", color = if (k < state.part) Ink else Ink.copy(alpha = .35f)) }
            }
        }
    }
    val order = StepMachine.permutation(state, step.items.size)
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        order.forEach { k ->
            val used = k < state.part
            AnswerButton(step.items[k], glow = state.reveal && k == state.part && !state.done, right = used, enabled = !used && !state.done,
                description = step.items[k], onClick = {
                    if (k == state.part && !state.done) kit.orderPlaced(step, k, k == step.items.lastIndex)
                    act.tap(k.toString())
                }) {
                step.icons?.getOrNull(k)?.let { Text(it, fontSize = 26.sp) }
                kit.OrderChip(step, k)
            }
        }
    }
}

@Composable
private fun MatchView(step: Match, state: StepState, act: QuestActions, picture: @Composable () -> Unit = {}) {
    Ask(step.q)
    picture()
    step.pairs.take(state.part).forEach { Text("${it.left} ← ${it.right}", color = Correct, style = MaterialTheme.typography.bodyLarge) }
    if (!state.done) {
        Text("👉 ${step.pairs[state.part].left}", style = MaterialTheme.typography.titleMedium)
        val order = StepMachine.permutation(state, step.pairs.size)
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            order.filter { it >= state.part }.forEach { k ->
                AnswerButton(step.pairs[k].right, glow = state.reveal && k == state.part, onClick = { act.tap(k.toString()) })
            }
        }
    }
}

@Composable
private fun TrueFalseView(step: TrueOrFalse, state: StepState, act: QuestActions, picture: @Composable () -> Unit = {}) {
    Ask(step.q)
    picture()
    step.items.take(state.part).forEach { Text("${if (it.truth) "✓" else "✗"} ${it.text}", color = Correct) }
    if (!state.done) {
        val item = step.items[state.part]
        Text(item.text, style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AnswerButton("صح ✓", Modifier.weight(1f), glow = state.reveal && item.truth, tried = "1" in state.wrong, onClick = { act.tap("1") })
            AnswerButton("خطأ ✗", Modifier.weight(1f), glow = state.reveal && !item.truth, tried = "0" in state.wrong, onClick = { act.tap("0") })
        }
    }
}

@Composable
private fun NumberView(step: NumberStep, state: StepState, act: QuestActions, picture: @Composable () -> Unit = {}) {
    Ask(step.q)
    picture()
    Surface(color = Color.White, shape = RoundedCornerShape(14.dp), border = BorderStroke(2.dp, if (state.done) Correct else Sand),
        modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }) {
        Text(listOf(state.typed.ifEmpty { "؟" }, step.unit.orEmpty()).joinToString(" ").trim(), Modifier.padding(14.dp),
            style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
    }
    if (state.done) return
    val rows = listOf(listOf("7", "8", "9"), listOf("4", "5", "6"), listOf("1", "2", "3"), listOf("⌫", "0", "✓"))
    CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            rows.forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    row.forEach { k ->
                        AnswerButton(k, Modifier.weight(1f), description = when (k) { "⌫" -> "امسح"; "✓" -> "تحقّق"; else -> k },
                            glow = state.reveal && k == StepMachine.expected(step, state), onClick = { act.tap(k) })
                    }
                }
            }
        }
    }
}

// ---------- «أتعلّم» ----------

@Composable
private fun ExploreView(step: Explore, state: StepState, kit: QuestKit, act: QuestActions) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Chip("📖 أتعلّم")
        Text(step.title, style = MaterialTheme.typography.titleLarge)
    }
    val next = StepMachine.expected(step, state)
    val glow = step.spots.map { it.id }.filter { it !in state.found && (!step.guided || it == next) }.toSet()
    val drawn = kit.pictureSpots(step)
    val tapSpot: (String) -> Unit = { id ->
        val spot = step.spots.first { it.id == id }
        if (id in state.found || !step.guided || id == next) kit.onSpot(step, spot)
        act.tap(id)
    }
    val spotActs = QuestActions(tapSpot, act.drum, act.undo)
    if (step.view != null) kit.Picture(step, state, glow, spotActs)
    val loose = step.spots.filter { it.id !in drawn }
    if (loose.isNotEmpty()) {
        val cols = step.cols ?: if (loose.size <= 4) 2 else 3
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = cols) {
            loose.forEach { s -> SpotCard(s, s.id in state.found, s.id in glow, s.id == state.open, kit, Modifier.weight(1f)) { tapSpot(s.id) } }
            repeat((cols - loose.size % cols) % cols) { Spacer(Modifier.weight(1f)) }
        }
    }
    val open = step.spots.firstOrNull { it.id == state.open }
    if (open != null) Surface(color = Color.White, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, Gold),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            when {
                open.art != null && kit.hasArt(open.art) -> kit.Art(open.art, Modifier.size(64.dp))
                open.icon != null -> Text(open.icon, fontSize = 34.sp)
            }
            Column(Modifier.weight(1f)) {
                Text(rich(open.title), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text(rich(open.text), style = MaterialTheme.typography.bodyLarge)
            }
        }
    } else Text("👆 ${step.tap ?: if (step.guided) "اضغط على ما يلمع" else "اضغط على كل ما يلمع لتكتشفه"}", style = MaterialTheme.typography.bodyLarge)
    if (state.done && step.sum != null) Surface(color = Gold.copy(alpha = .2f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) { Text("✨ الخلاصة", fontWeight = FontWeight.Bold); Text(rich(step.sum), style = MaterialTheme.typography.bodyLarge) }
    }
    Text("🔍 ${state.found.size} / ${step.spots.size}", style = MaterialTheme.typography.bodyMedium)
}

@Composable
private fun SpotCard(s: Spot, found: Boolean, glow: Boolean, open: Boolean, kit: QuestKit, modifier: Modifier, tap: () -> Unit) {
    AnswerButton(s.name + if (found) " ✓" else "", modifier, glow = glow, right = found && !open,
        description = s.name + if (found) "، اكتُشف" else "", onClick = tap) {
        when {
            s.art != null && kit.hasArt(s.art) -> kit.Art(s.art, Modifier.size(56.dp))
            s.icon != null -> Text(s.icon, fontSize = 28.sp)
        }
    }
}
