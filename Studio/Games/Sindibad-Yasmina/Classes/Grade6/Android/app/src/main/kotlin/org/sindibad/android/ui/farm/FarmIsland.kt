@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.farm

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.sindibad.android.GameViewModel
import org.sindibad.android.content.Topics
import org.sindibad.android.domain.*
import org.sindibad.android.ui.*
import kotlin.math.sin
import kotlin.random.Random

// «مزرعتي السعيدة» natively: a Compose Canvas scene with real buttons over every place (TalkBack), the
// web's tool tray, small choices and quick review, played on the profile's saved farm (domain/FarmPlay.kt).

private val FieldGreen = Color(0xFF2E7D32)

private fun placeName(place: String) = when {
    place.startsWith("plot-") -> "الحقل ${place.removePrefix("plot-").toInt() + 1}"
    place == "barn" -> "المخزن"
    place == "dairy" -> "معمل الألبان"
    place == "pen" -> "حظيرة البقرة"
    place == "hive" -> "خلايا النحل"
    place == "board" -> "لوحة الطلبات"
    else -> "السفينة في الميناء"
}

private val stageNames = mapOf("planted" to "مزروع", "young" to "نبات صغير", "grown" to "نبات كبير", "flower" to "مُزهر",
    "ripe" to "ناضج", "open1" to "تفتّحت الجوزات السفلية", "open2" to "تفتّحت جوزات الوسط", "open3" to "تفتّحت الجوزات العليا", "pulled" to "جذور مقلوعة")

@Composable
internal fun FarmIsland(profile: Profile, vm: GameViewModel) {
    val book = FarmBook.book
    val barn = profile.barn
    val played = profile.topics.keys
    val calm = profile.preferences.calm
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    var note by rememberSaveable { mutableStateOf<String?>(null) }
    var dialog by rememberSaveable { mutableStateOf(if (barn.helperChosen) null else "helpers") }
    LaunchedEffect(Unit) { if (barn.board.size < 3) vm.farmWithBook { b, p -> b.withOrders(p) } }
    BackHandler(selected != null || dialog != null) { if (dialog != null) dialog = null else selected = null }
    val run = selected?.let { barn.runs[it] }
    val quest = run?.let { book.quest(it.quest) }
    FarmFeedback(run, profile.preferences)

    fun open(place: String) {
        note = null
        when {
            place == "barn" -> dialog = "barn"
            place == "board" || place == "dock" -> dialog = "orders"
            place in barn.runs -> selected = place
            place.startsWith("plot-") -> {
                selected = place
                val now = barn.current(book)
                if (now != null && now.crop && barn.runs.values.none { it.forQuest && it.quest == now.id }) vm.startFarm(place, now.id)
                else if (barn.plotChoices(played, book).isEmpty()) { note = "لنبدأ بالمهمة الحالية أولاً! 📜"; selected = null }
            }
            else -> {
                val q = book.taskAt(place) ?: return
                val refusal = barn.refusal(place, q.id, played, book)
                if (refusal != null) { note = refusal; selected = null } else { vm.startFarm(place, q.id); selected = place }
            }
        }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        FarmHud(barn, book) { dialog = it }
        FarmScene(barn, played, selected, calm, ::open)
        val helper = book.helpers[barn.helper]
        val say = run?.say?.takeIf { it.isNotBlank() } ?: note ?: barn.current(book)?.let { "مهمّتنا الآن: ${it.goal}. اتبع السهم الذهبي! ✨" }
            ?: "أنت مزارع ماهر! ازرع ما تحبّ، ولبِّ طلبات السفينة، وزيّن مزرعتك. 🌾"
        HelperBubble(barn.helper, helper?.name.orEmpty(), say, run?.mood ?: Mood.Happy) {
            // Tap the helper for a hint (it points to the rule, never the answer).
            val p = selected
            val hint = if (run != null && quest != null && run.phase(quest) == FarmPhase.Steps) quest.steps[run.step].hint
                else barn.current(book)?.let { "مهمّتنا الآن: ${it.goal}. اتبع السهم الذهبي! ✨" }
            note = hint
            if (p != null && run != null && hint != null) vm.updateBarn { b ->
                b.runs[p]?.let { r -> b.copy(runs = b.runs + (p to r.copy(say = hint, mood = Mood.Think))) } ?: b
            }
        }
        if (run != null && run.lapses.isNotEmpty()) PaperCard(Modifier.fillMaxWidth()) {
            run.lapses.forEach { Text("⏳ $it", Modifier.semantics { liveRegion = LiveRegionMode.Polite }, color = Teal) }
        }
        val place = selected
        when {
            place == null -> {}
            run == null || quest == null -> if (place.startsWith("plot-")) CropChooser(placeName(place), barn.plotChoices(played, book)) { vm.startFarm(place, it) }
            run.phase(quest) == FarmPhase.Steps && run.picking != null -> PickPanel(place, run, quest.steps[run.step].pickFor(run.picking)!!, vm)
            run.phase(quest) == FarmPhase.Steps -> ToolTray(place, run, quest, book, vm)
            run.phase(quest) == FarmPhase.Review -> ReviewPanel(place, run, quest, vm)
            else -> ResultPanel(run, quest, book) {
                vm.finishFarm(place)
                selected = null
                val next = book.quests.getOrNull(barn.quest + if (run.forQuest) 1 else 0)
                note = if (run.forQuest) next?.let { "المهمّة التالية: ${it.goal}. اتبع السهم الذهبي! ✨" }
                    ?: "أنت مزارع ماهر! ازرع ما تحبّ، ولبِّ طلبات السفينة، وزيّن مزرعتك. 🌾" else null
            }
        }
        Text("المحتوى التعليمي مسوّدة بانتظار مراجعة معلّمين سوريين.", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall)
    }
    when (dialog) {
        "helpers" -> HelperDialog(barn, book, dismissable = barn.helperChosen, close = { dialog = null }) { id ->
            vm.updateBarn { it.chooseHelper(id) }
            note = book.helpers[id]?.fact
            dialog = null
        }
        "quests" -> QuestsDialog(profile, book, { dialog = null }, { dialog = "helpers" }) { dialog = null; vm.startTopic(it) }
        "barn" -> BarnDialog(barn, book) { dialog = null }
        "orders" -> OrdersDialog(barn, book, { dialog = null }) { i ->
            val order = barn.board[i]
            vm.farmWithBook { b, p -> b.deliver(i, p) }
            note = "أبحرت السفينة بطلب ${order.who}! ربحنا ${order.coins} 🪙. في الدرس الأول من الكتاب: نختار المنتج، ونحسب التكاليف والربح. 🧮"
            dialog = null
        }
        "decor" -> DecorDialog(barn, book, { dialog = null }) { id ->
            vm.updateBarn { it.decorate(id) }
            note = book.decorations.getValue(id).let { it.name + " " + it.fact }
            dialog = null
        }
    }
}

@Composable
private fun FarmHud(barn: Barn, book: FarmBook, open: (String) -> Unit) {
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Chip("🪙 ${barn.coins}", "قطع ذهبية: ${barn.coins}") { open("decor") }
        Chip("⭐ ${barn.level(book)}", "مستوى المزرعة ${barn.level(book)}، الخبرة ${barn.xp}") { open("quests") }
        Chip("📜 المهمّات", null) { open("quests") }
        Chip("🧺 المخزن", null) { open("barn") }
        Chip("⛵ الطلبات", null) { open("orders") }
        Chip("🌹 الزينة", null) { open("decor") }
    }
}

@Composable
private fun Chip(text: String, description: String?, onClick: () -> Unit) {
    Surface(onClick = onClick, color = Paper, shape = RoundedCornerShape(50), border = BorderStroke(1.dp, Sand),
        modifier = Modifier.heightIn(min = 48.dp).semantics { if (description != null) contentDescription = description }) {
        Box(Modifier.padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
            Text(text, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(vertical = 12.dp))
        }
    }
}

/** The illustrated farm, with an invisible, labelled button over every place. */
@Composable
private fun FarmScene(barn: Barn, played: Set<String>, selected: String?, calm: Boolean, open: (String) -> Unit) {
    val book = FarmBook.book
    val ship = rememberSharedBitmap("ships/empty")
    val palm = rememberSharedBitmap("scenery/palm")
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current
    val t = if (calm) 0f else {
        val loop = rememberInfiniteTransition(label = "farm")
        loop.animateFloat(0f, 1f, infiniteRepeatable(tween(4000, easing = LinearEasing)), label = "t").value
    }
    // The last action's effect (tool, growth pop, weeks passing): played once, skipped in calm mode.
    val run = selected?.let { barn.runs[it] }
    val fx = remember { Animatable(1f) }
    val dusk = remember { Animatable(0f) }
    var seenBeat by remember { mutableStateOf(run?.beat) }
    var seenPlace by remember { mutableStateOf(selected) }
    LaunchedEffect(selected, run?.beat) {
        val key = run?.beat
        // Only a new action at the same place plays (not reopening a place, nor restoring after process death).
        if (selected == seenPlace && key != seenBeat && run?.lastTool != null && !calm) {
            fx.snapTo(0f)
            if (run.lapses.isNotEmpty()) { fx.animateTo(1f, tween(700)); dusk.animateTo(1f, tween(500)); dusk.animateTo(0f, tween(700)) }
            else fx.animateTo(1f, tween(800))
        }
        seenBeat = key
        seenPlace = selected
    }
    val current = barn.current(book)
    val beaconAt = when {
        current == null -> null
        current.crop -> barn.runs.entries.firstOrNull { it.value.forQuest }?.key ?: FarmBook.plots.firstOrNull { it !in barn.runs }
        else -> current.place
    }
    BoxWithConstraints(Modifier.fillMaxWidth().widthIn(max = 560.dp).aspectRatio(1f)) {
        val unit = maxWidth / FarmLayout.SIZE
        Canvas(Modifier.fillMaxSize()) {
            val k = size.width / FarmLayout.SIZE
            scale(k, k, Offset.Zero) {
                drawIsland(t)
                drawPng(palm, 900f, 40f, 80f, 120f); drawPng(palm, 20f, 560f, 70f, 105f)
                FarmLayout.places.forEach { (place, r) ->
                    val placeRun = barn.runs[place]
                    val grow = if (place == selected && fx.value < 1f) 0.6f + 0.4f * fx.value else 1f
                    when {
                        place.startsWith("plot-") -> drawPlot(r, placeRun?.quest, placeRun, t, grow)
                        place == "barn" -> drawBarn(r)
                        place == "dairy" -> drawDairy(r, placeRun, t)
                        place == "pen" -> drawPen(r, placeRun, t, cowHappy = barn.helper == "cow")
                        place == "hive" -> drawHives(r, placeRun, t)
                        place == "board" -> drawBoard(r, barn.board.size, barn.board.any(barn::canFill))
                        place == "dock" -> drawDock(r, ship, t)
                    }
                    if (place == selected) drawRoundRect(Color(0xFFFFD23F), Offset(r.x - 6f, r.y - 6f), Size(r.w + 12f, r.h + 12f),
                        androidx.compose.ui.geometry.CornerRadius(22f), style = Stroke(8f))
                }
                barn.decor.forEach { id -> FarmLayout.decor[id]?.forEach { drawDecor(id, it, t) } }
                beaconAt?.let { FarmLayout.places[it] }?.let { drawBeacon(it, if (calm) 0f else (sin(t * 12.566f) + 1f) * 10f) }
                val (hx, hy) = FarmLayout.helperAt(selected)
                drawHelper(barn.helper, Offset(hx, hy), 34f, if (calm) 0f else (sin(t * 25.13f) + 1f) * 5f)
                // The tool at work: its icon rising from the place, drops for water, dusk while the weeks pass.
                val r = selected?.let { FarmLayout.places[it] }
                val tool = run?.lastTool?.let { book.tools[it] }
                if (r != null && tool != null && fx.value < 1f) {
                    if (run.lastTool == "water") for (i in 0..8) {
                        val x = r.x + 15f + (i * 17f) % (r.w - 30f); val y = r.y + (fx.value * r.h + i * 23f) % r.h
                        drawCircle(Color(0xFF4FC3F7), 6f, Offset(x, y))
                    }
                    val px = 60f / (density.density * density.fontScale)
                    drawText(measurer, tool.icon, Offset(r.cx - 30f, r.cy - 40f - fx.value * 60f), TextStyle(fontSize = px.sp))
                    for (i in 0..4) drawStar(Offset(r.x + r.w * (0.1f + i * 0.2f), r.y + r.h * (0.8f - fx.value * 0.6f)), 10f * (1 - fx.value), Color(0xFFFFF59D))
                }
                if (dusk.value > 0f) drawRect(Color(0xFF0D1B4A).copy(alpha = 0.45f * dusk.value), size = Size(FarmLayout.SIZE, FarmLayout.SIZE))
            }
        }
        FarmLayout.places.forEach { (place, r) ->
            val label = describe(place, barn, played, book) + if (place == beaconAt) "، المهمّة الحالية هنا" else ""
            Box(Modifier.offset(unit * r.x, unit * r.y).size(unit * r.w, unit * r.h)
                .clickable(onClickLabel = "افتح") { open(place) }
                .semantics { contentDescription = label; role = Role.Button; this.selected = place == selected })
        }
    }
}

/** What TalkBack says for a place: its name, what grows there and how far along it is. */
private fun describe(place: String, barn: Barn, played: Set<String>, book: FarmBook): String {
    val name = placeName(place)
    val run = barn.runs[place]
    return when {
        run != null -> {
            val q = book.quest(run.quest)
            val stage = run.stage?.let { stageNames[it] }?.let { "، $it" }.orEmpty()
            val weeds = if (run.weeds) "، حوله أعشاب ضارة" else ""
            val where = when (run.phase(q)) {
                FarmPhase.Steps -> "الخطوة ${run.step + 1} من ${q.steps.size}"
                FarmPhase.Review -> "مراجعة سريعة"
                FarmPhase.Done -> "انتهت المهمّة"
            }
            "$name: ${q.name}$stage$weeds، $where"
        }
        place == "board" || place == "dock" -> "$name، ${barn.board.size} طلبات"
        place == "barn" -> "$name، ${barn.stock.values.sum()} منتجات"
        place.startsWith("plot-") -> "$name، فارغ"
        else -> book.taskAt(place)?.let { q ->
            "$name، ${q.name}" + if (barn.unlocked(book.index(q.id), played, book)) "" else "، تُفتح لاحقاً"
        } ?: name
    }
}

@Composable
private fun HelperPortrait(id: String, modifier: Modifier = Modifier) {
    Canvas(modifier) { drawHelper(id, Offset(size.width / 2, size.height * 0.55f), size.minDimension * 0.36f) }
}

@Composable
private fun HelperBubble(helper: String, name: String, say: String, mood: Mood, ask: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(onClick = ask, shape = CircleShape, color = Paper, border = BorderStroke(2.dp, Gold),
            modifier = Modifier.size(64.dp).semantics { contentDescription = "$name: اطلب تلميحاً" }) {
            HelperPortrait(helper, Modifier.fillMaxSize())
        }
        Surface(Modifier.weight(1f), color = if (mood == Mood.Oops) Color(0xFFFFF0E0) else Paper, shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, if (mood == Mood.Oops) Rose else Sand)) {
            Column(Modifier.padding(12.dp)) {
                Text(name, style = MaterialTheme.typography.labelLarge, color = Teal)
                Text(say, Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

@Composable
private fun CropChooser(plot: String, crops: List<FarmQuest>, plant: (String) -> Unit) {
    PaperCard(Modifier.fillMaxWidth()) {
        Text("ماذا نزرع في $plot؟", style = MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            crops.forEach { q -> OutlinedButton(onClick = { plant(q.id) }, Modifier.heightIn(min = 52.dp)) { Text("${q.icon} ${q.name}") } }
        }
    }
}

@Composable
private fun StepDots(run: FarmRun, quest: FarmQuest) {
    Row(Modifier.semantics(mergeDescendants = true) { contentDescription = "الخطوة ${run.step + 1} من ${quest.steps.size}" },
        horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        quest.steps.indices.forEach { i ->
            Canvas(Modifier.size(12.dp)) {
                drawCircle(when { i < run.step -> FieldGreen; i == run.step -> Gold; else -> Color.White })
                drawCircle(Ink, style = Stroke(2f))
            }
        }
    }
}

/** The tool tray: the tool is the question. Done tools are ticked; after two misses the right one glows. */
@Composable
private fun ToolTray(place: String, run: FarmRun, quest: FarmQuest, book: FarmBook, vm: GameViewModel) {
    val step = quest.steps[run.step]
    PaperCard(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${quest.icon} ${quest.name}", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            StepDots(run, quest)
        }
        if (step.tools.size > 1) Text("هذه الخطوة فيها ${step.tools.size} أعمال، بأيّ ترتيب", style = MaterialTheme.typography.bodySmall)
        FlowRow(Modifier.fillMaxWidth().semantics { contentDescription = "الأدوات" },
            horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            quest.tools.forEach { id ->
                val tool = book.tools.getValue(id)
                val done = id in run.done
                val glow = run.glows(quest, id)
                Surface(onClick = { vm.updateBarn { it.act(place, id) } },
                    color = when { glow -> Color(0xFFFFF59D); done -> Color(0xFFE3F2E1); else -> Color.White },
                    border = BorderStroke(if (glow) 3.dp else 1.dp, if (glow) Gold else Sand), shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.widthIn(min = 64.dp).heightIn(min = 64.dp).semantics {
                        contentDescription = tool.name + when { done -> "، تمّت"; glow -> "، جرّب هذه"; else -> "" }
                        role = Role.Button
                    }) {
                    Column(Modifier.padding(horizontal = 6.dp, vertical = 4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(if (done) "✓" else tool.icon, fontSize = 22.sp)
                        Text(tool.name, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center)
                    }
                }
            }
        }
    }
}

/** The small choice after a job (choice, find, all, order, oneEach, dial). */
@Composable
private fun PickPanel(place: String, run: FarmRun, pick: FarmPick, vm: GameViewModel) {
    val revealed = pick.revealed(run)
    val order = remember(run.id, run.step, pick.ask) {
        if (pick.type in setOf("choice", "all", "order")) pick.options.indices.shuffled(Random(run.id.hashCode() + run.step * 31 + run.units))
        else pick.options.indices.toList()
    }
    PaperCard(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(pick.ask, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = { vm.updateBarn { it.pickClose(place) } }, Modifier.semantics { contentDescription = "إغلاق الاختيار" }) { Text("✕") }
        }
        if (pick.type == "dial") {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Canvas(Modifier.size(48.dp, 120.dp)) {
                    scale(size.height / 140f, size.height / 140f, Offset.Zero) { drawThermometer(Offset(24f, 62f), run.dial, 100f) }
                }
                Text("${run.dial} درجة", Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.headlineMedium)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(-10, -1, 1, 10).forEach { d ->
                    OutlinedButton(onClick = { vm.updateBarn { it.pickDial(place, d) } }, Modifier.weight(1f).heightIn(min = 52.dp),
                        contentPadding = PaddingValues(2.dp)) { Text(if (d > 0) "+$d" else "−${-d}") }
                }
            }
            GoldButton("تمّ ✔") { vm.updateBarn { it.pickSubmit(place) } }
            return@PaperCard
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            order.forEach { i ->
                val o = pick.options[i]
                val chosen = i in run.chosen
                val shown = i in revealed
                val group = pick.groups[o.group]
                val description = listOf(o.label.ifBlank { artName(o.art) }, if (pick.type == "oneEach" && group != null) group else "",
                    if (chosen) (if (pick.type == "order") "رقم ${run.chosen.indexOf(i) + 1}" else "مختار") else "", if (shown) "هذا هو الصحيح" else "")
                    .filter(String::isNotBlank).joinToString("، ")
                Surface(onClick = { vm.updateBarn { it.pickTap(place, i) } },
                    color = when { chosen -> Color(0xFFE3F2E1); shown -> Color(0xFFFFF59D); else -> Color.White },
                    border = BorderStroke(if (shown || chosen) 3.dp else 1.dp, if (shown) Gold else if (chosen) Correct else Sand),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.widthIn(min = 72.dp, max = if (o.art.isBlank() && o.label.length > 14) 300.dp else 140.dp).heightIn(min = 64.dp)
                        .semantics(mergeDescendants = true) { contentDescription = description; role = Role.Button }) {
                    Column(Modifier.padding(6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        if (o.art.isNotBlank()) Canvas(Modifier.size(56.dp)) { drawOptionArt(o.art) }
                        else if (o.icon.isNotBlank()) Text(o.icon, fontSize = 24.sp)
                        if (o.label.isNotBlank()) Text(o.label, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                        if (chosen && pick.type == "order") Text("${run.chosen.indexOf(i) + 1}", fontWeight = FontWeight.Bold, color = Correct)
                    }
                }
            }
        }
        if (pick.type == "oneEach") {
            Text(pick.groups.values.joinToString(" + "), style = MaterialTheme.typography.bodySmall, color = Teal)
            GoldButton("قدّم الوجبة 🐄") { vm.updateBarn { it.pickSubmit(place) } }
        }
    }
}

/** The bees for «find the queen» have no labels: TalkBack describes their shape, not their name. */
private fun artName(art: String) = when (art) {
    "bee:queen" -> "نحلة جسمها طويل جداً"
    "bee:drone" -> "نحلة ضخمة بعينين كبيرتين"
    "bee:worker" -> "نحلة صغيرة"
    else -> art
}

/** The quest's quick review: first miss → hint, second → the answer, as in every lesson. */
@Composable
private fun ReviewPanel(place: String, run: FarmRun, quest: FarmQuest, vm: GameViewModel) {
    val topic = remember(quest.topic) { Topics.get(quest.topic) }
    val question = topic.questions.first { it.id == run.review[run.reviewIndex] }
    val order = remember(run.id, run.reviewIndex) { question.choices.indices.shuffled(Random(run.id.hashCode() + run.reviewIndex)) }
    Text("مراجعة سريعة  •  ${run.reviewIndex + 1} / ${run.review.size}", color = Paper)
    PaperCard(Modifier.fillMaxWidth()) {
        Text(question.prompt, style = MaterialTheme.typography.titleLarge)
        order.forEach { i ->
            val isAnswer = run.reviewResolved && i in question.answer
            OutlinedButton(onClick = { vm.updateBarn { it.answer(place, i, question) } }, Modifier.fillMaxWidth().heightIn(min = 52.dp),
                enabled = !run.reviewResolved, border = BorderStroke(if (isAnswer) 2.dp else 1.dp, if (isAnswer) Correct else Sand)) {
                Text(question.choices[i], style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
            }
        }
        if (run.reviewLast != null) {
            Text(if (run.reviewResolved) question.explanation else "ليس تماماً… ${question.hint}",
                Modifier.semantics { liveRegion = LiveRegionMode.Polite }, color = if (run.reviewLast == true) Correct else Ink)
            if (run.reviewResolved) {
                Text("الإجابة: ${question.answerText()}", fontWeight = FontWeight.Bold)
                GoldButton(if (run.reviewIndex == run.review.lastIndex) "النتيجة" else "السؤال التالي") { vm.updateBarn { it.nextReview(place) } }
            }
        }
    }
}

@Composable
private fun ResultPanel(run: FarmRun, quest: FarmQuest, book: FarmBook, next: () -> Unit) {
    val product = book.products.getValue(quest.product)
    PaperCard(Modifier.fillMaxWidth()) {
        Text(if (run.forQuest) "مهمّة مكتملة!" else "أحسنت!", color = Teal)
        Text("${quest.icon} ${quest.title}", style = MaterialTheme.typography.headlineSmall)
        Stars(run.stars())
        Text("${run.correct} من ${run.total} صحيحة من المحاولة الأولى (الأعمال والمراجعة)")
        Text("📖 تعلّمنا من كتاب «${quest.book}»:", fontWeight = FontWeight.Bold)
        quest.learned.forEach { Text("• $it") }
        Text(listOfNotNull("+${run.harvested} ${product.icon} ${product.name}", if (run.forQuest) "+30 🪙" else null).joinToString("   "), color = Teal)
        GoldButton("تابِع", onClick = next)
    }
}

@Composable
private fun HelperDialog(barn: Barn, book: FarmBook, dismissable: Boolean, close: () -> Unit, choose: (String) -> Unit) {
    AlertDialog(onDismissRequest = { if (dismissable) close() }, title = { Text("اختر مساعدك في المزرعة") },
        confirmButton = { if (dismissable) TextButton(onClick = close) { Text("إغلاق") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("يرافقك في كل المهمات، ويدلّك حين تحتار.")
            book.helpers.forEach { (id, h) ->
                Surface(onClick = { choose(id) }, shape = RoundedCornerShape(16.dp), color = if (barn.helperChosen && barn.helper == id) Sand else Paper,
                    border = BorderStroke(1.dp, Sand), modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {
                        contentDescription = "${h.name}، ${h.kind}: ${h.blurb}"; role = Role.Button }) {
                    Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        HelperPortrait(id, Modifier.size(56.dp))
                        Column(Modifier.padding(start = 8.dp)) {
                            Text("${h.name} · ${h.kind}", style = MaterialTheme.typography.titleMedium)
                            Text(h.blurb, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        } })
}

@Composable
private fun QuestsDialog(profile: Profile, book: FarmBook, close: () -> Unit, changeHelper: () -> Unit, review: (String) -> Unit) {
    val barn = profile.barn
    val played = profile.topics.keys
    AlertDialog(onDismissRequest = close, title = { Text("📜 مهمّات المزرعة") },
        confirmButton = { TextButton(onClick = close) { Text("حسناً") } },
        dismissButton = { TextButton(onClick = changeHelper) { Text("🔄 غيّر المساعد") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("مستوى المزرعة ${barn.level(book)} · الخبرة ${barn.xp}", color = Teal)
            book.quests.forEachIndexed { i, q ->
                val done = barn.questDone(i, played, book)
                val open = barn.unlocked(i, played, book)
                Column(Modifier.fillMaxWidth()) {
                    Text("${if (open) q.icon else "🔒"} ${q.title}", style = MaterialTheme.typography.titleMedium)
                    when {
                        done -> {
                            Stars(profile.topics[q.topic]?.stars ?: 0)
                            Text("كتاب «${q.book}»", style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = { review(q.topic) }, Modifier.heightIn(min = 48.dp)) { Text("🔁 راجع") }
                        }
                        open -> Text(q.goal, style = MaterialTheme.typography.bodySmall)
                        else -> Text("تُفتح بعد المهمّة السابقة", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        } })
}

@Composable
private fun BarnDialog(barn: Barn, book: FarmBook, close: () -> Unit) {
    AlertDialog(onDismissRequest = close, title = { Text("🧺 المخزن") }, confirmButton = { TextButton(onClick = close) { Text("حسناً") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState())) {
            val items = book.products.filter { (id, _) -> barn.stock.getOrDefault(id, 0) > 0 }
            if (items.isEmpty()) Text("المخزن فارغ. احصد المحاصيل لتملأه!")
            items.forEach { (id, p) -> Text("${p.icon} ${p.name} × ${barn.stock.getValue(id)}", style = MaterialTheme.typography.titleMedium) }
            Text("نبيع منتجاتنا لأهل الجزيرة: انظر في لوحة الطلبات قرب الميناء.", style = MaterialTheme.typography.bodySmall)
        } })
}

@Composable
private fun OrdersDialog(barn: Barn, book: FarmBook, close: () -> Unit, deliver: (Int) -> Unit) {
    AlertDialog(onDismissRequest = close, title = { Text("⛵ طلبات سوق السبت") }, confirmButton = { TextButton(onClick = close) { Text("إغلاق") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("السفينة تحمل منتجاتنا إلى ميناء أرواد. لكل طلب سعر وربح!", style = MaterialTheme.typography.bodySmall)
            if (barn.board.isEmpty()) Text("لا طلبات بعد. أنهِ مهمّة البطاطا أولاً، فيأتي أول زبون! 🥔")
            barn.board.forEachIndexed { i, o ->
                val want = o.want.entries.joinToString("  ") { (k, n) -> book.products.getValue(k).let { "${it.icon} ${it.name} ${minOf(barn.stock.getOrDefault(k, 0), n)}/$n" } }
                Text("${o.icon} ${o.who}", style = MaterialTheme.typography.titleMedium)
                Text(want)
                Text("🪙 ${o.coins}   ⭐ ${o.xp}", color = Teal)
                GoldButton("سلِّم ⛵", barn.canFill(o)) { deliver(i) }
            }
        } })
}

@Composable
private fun DecorDialog(barn: Barn, book: FarmBook, close: () -> Unit, buy: (String) -> Unit) {
    AlertDialog(onDismissRequest = close, title = { Text("🌹 زيّن مزرعتك") }, confirmButton = { TextButton(onClick = close) { Text("إغلاق") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("معك ${barn.coins} 🪙. اكسب القطع الذهبية من طلبات السفينة. الزينة للجمال فقط.", style = MaterialTheme.typography.bodySmall)
            book.decorations.forEach { (id, d) ->
                Text(d.name, style = MaterialTheme.typography.titleMedium)
                if (id in barn.decor) Text(d.fact, style = MaterialTheme.typography.bodySmall)
                else GoldButton("🪙 ${d.cost}", barn.coins >= d.cost) { buy(id) }
            }
        } })
}

/** Answer sounds and haptics for farm actions, respecting the profile; nothing plays on restoration. */
@Composable
private fun FarmFeedback(run: FarmRun?, prefs: Preferences) {
    val haptic = LocalHapticFeedback.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var tone by remember { mutableStateOf<ToneGenerator?>(null) }
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_STOP) { tone?.release(); tone = null } }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); tone?.release(); tone = null }
    }
    val key = run?.let { "${it.id}:${it.beat}:${it.reviewAttempts}:${it.reviewIndex}" }
    var previous by remember { mutableStateOf(key) }
    LaunchedEffect(key) {
        if (key != null && previous != null && key != previous && run.id == previous?.substringBefore(':') &&
            lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
            val bad = run.mood == Mood.Oops || run.reviewLast == false
            if (prefs.haptics) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            if (prefs.sound) {
                if (tone == null) tone = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 25) }.getOrNull()
                tone?.startTone(if (bad) ToneGenerator.TONE_PROP_NACK else ToneGenerator.TONE_PROP_ACK, 120)
            }
        }
        previous = key
    }
}
