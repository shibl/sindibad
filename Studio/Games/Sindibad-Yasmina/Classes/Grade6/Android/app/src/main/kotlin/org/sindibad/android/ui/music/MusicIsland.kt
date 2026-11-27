@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.music

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.sindibad.android.GameViewModel
import org.sindibad.android.audio.Hit
import org.sindibad.android.audio.Score
import org.sindibad.android.audio.Synth
import org.sindibad.android.audio.rememberMusicEngine
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.islands
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*
import org.sindibad.android.ui.quest.*
import org.sindibad.android.ui.science.RobotHelper
import org.sindibad.android.ui.science.ScienceKit

// «جزيرة الأنغام» natively (web: core/tunes/tunes.ts): the helper نغمة, the eight places of the island with
// their quests and stars, the golden notes (one per quest finished once) and the sky song they make, and the
// island's instruments to play freely. The 3D island of the web is not drawn; its places are cards.

private const val ISLAND = "music"

@Composable
internal fun MusicIsland(profile: Profile, vm: GameViewModel) {
    val book = remember { QuestBooks.get(ISLAND) }
    val engine = rememberMusicEngine(profile.preferences.sound)
    val scope = rememberCoroutineScope()
    val kit = remember(engine) { MusicKit(engine, book, scope) }
    val notes = profile.goldenNotes(ISLAND)
    val next = book.quests.firstOrNull { !profile.questDone(ISLAND, it.id) }
    val station: (String) -> Station? = { id -> book.stations.firstOrNull { it.id == id } }
    // The helper says hello the first time, then «back» and where the next quest is.
    val firstVisit = rememberSaveable { ISLAND !in profile.helpersMet }
    LaunchedEffect(Unit) { if (ISLAND !in profile.helpersMet) vm.meetHelper(ISLAND) }
    var line by rememberSaveable(stateSaver = LineSaver) {
        mutableStateOf(when {
            firstVisit -> Line(book.helper.hello, Mood.Cheer)
            next != null -> Line("${book.helper.back} الدرس التالي: **${next.title}** في ${station(next.station)?.name.orEmpty()}. اتبع السهم الذهبي! ✨", Mood.Happy)
            else -> Line("${book.helper.back} جمعت كل النوتات الذهبية! اضغط 🎵 لتسمع أغنية السماء.", Mood.Happy)
        })
    }
    val island = islands.first { it.id == ISLAND }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                SharedArt("islands/${island.art}", null, Modifier.height(120.dp))
                Text(island.subject, color = Color.White, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
            }
        }
        item {
            Surface(onClick = {
                line = next?.let { Line("الدرس التالي: **${it.title}** في ${station(it.station)?.name.orEmpty()}. اضغط على اسم المكان فوقه السهم الذهبي! ✨", Mood.Think) }
                    ?: Line("جمعت كل النوتات الذهبية! اضغط 🎵 لتسمع أغنية السماء. 🎶", Mood.Think)
            }, color = Color.Transparent) { HelperLine(book.helper.name, line) { mood, m -> NoteHelper(mood, m) } }
        }
        item { GoldenNotes(book, notes) { line = it; if (notes > 0) kit.perform { skySong(book, notes) } } }
        items(book.stations, key = { it.id }) { st ->
            StationCard(st, book, profile, next, kit, vm) { line = it }
        }
        item { Text("مسودة محتوى، بانتظار مراجعة معلّمين سوريين", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall) }
    }
}

private val LineSaver = androidx.compose.runtime.saveable.Saver<Line, List<String>>(
    save = { listOf(it.text, it.mood.name) },
    restore = { Line(it[0], Mood.valueOf(it[1])) },
)

/** The sky song so far: one note per golden note (the whole song, with a low voice, once all are in). */
private fun skySong(book: QuestBook, n: Int): Score {
    val notes = book.skySong.take(n)
    val step = .42
    val full = n == book.skySong.size
    return Score(notes.flatMapIndexed { i, note ->
        listOf(Hit(i * step, Synth.piano(note))) + if (full && i % 2 == 0) listOf(Hit(i * step, Synth.piano(MusicTheory.freq(note) / 2, vol = .16))) else emptyList()
    }, notes.mapIndexed { i, note -> org.sindibad.android.audio.Cue(i * step, "sky:$i") }, notes.size * step + 1)
}

@Composable
private fun GoldenNotes(book: QuestBook, n: Int, say: (Line) -> Unit) {
    val total = book.quests.size
    PaperCard(Modifier.fillMaxWidth()) {
        Text("🌈 النوتات الذهبية: $n من $total", style = MaterialTheme.typography.titleMedium)
        Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "$n من $total نوتات ذهبية" },
            horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)) {
            val rainbow = listOf(0xFFE53935, 0xFFFB8C00, 0xFFFDD835, 0xFF43A047, 0xFF1E88E5, 0xFF3949AB, 0xFF8E24AA, 0xFFE53935, 0xFFFB8C00, 0xFF43A047)
            repeat(total) { i ->
                Box(Modifier.weight(1f).aspectRatio(.8f).background(Color(rainbow[i % rainbow.size]).copy(alpha = if (i < n) 1f else .18f), RoundedCornerShape(6.dp)),
                    contentAlignment = Alignment.Center) { Text(if (i < n) "🎵" else "", fontSize = 14.sp) }
            }
        }
        OutlinedButton(onClick = {
            say(when {
                n == 0 -> Line("لم نجمع نوتات ذهبية بعد! أنهِ درساً لتعلّق أول نوتة على قوس قزح. 🌈", Mood.Think)
                n == book.skySong.size -> Line("أغنية السماء كاملة! 🌈🎶 كل نوتة فيها درس تعلّمته.", Mood.Cheer)
                else -> Line("أغنية السماء حتى الآن: $n من ${book.skySong.size} نوتات. أكمل الدروس لتكتمل! 🎵", Mood.Cheer)
            })
        }, Modifier.heightIn(min = 48.dp)) { Text("🎵 أغنية السماء") }
    }
}

@Composable
private fun StationCard(st: Station, book: QuestBook, profile: Profile, next: Quest?, kit: MusicKit, vm: GameViewModel, say: (Line) -> Unit) {
    val quests = book.questsAt(st.id)
    val isNext = next?.station == st.id
    val glassesReady = profile.questDone(ISLAND, "glasses")
    val extra = when (st.id) {
        "piano" -> "🎹 اضغط على مفاتيح البيانو العملاق لتعزف ما تحب!"
        "drums" -> "🥁 اضغط على الدربكة الكبيرة لتعزف!"
        "glasses" -> if (glassesReady) "🥛 آلتك جاهزة: اضغط على الأكواب لتعزف!" else ""
        "metronome" -> "⏱️ اضغط على البرج مرة أخرى ليدقّ الإيقاع."
        "harbor" -> "⚓ السفن تحمل آلات من حول العالم."
        else -> ""
    }
    Surface(color = Paper, shape = RoundedCornerShape(20.dp), border = BorderStroke(if (isNext) 3.dp else 1.dp, if (isNext) Gold else Sand)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(st.icon, fontSize = 28.sp)
                Text(st.name, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                if (isNext) Text("⬅ السهم الذهبي", color = Color(0xFFAE7308), fontWeight = FontWeight.Bold)
            }
            if (extra.isNotEmpty()) Text(extra, style = MaterialTheme.typography.bodyMedium)
            when (st.id) {
                "piano" -> Piano("C4", "C5", "names", lit = kit.lights.on.keys, onKey = { kit.note(it) })
                "drums" -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("dum" to "دُم", "tak" to "تَك").forEach { (k, t) ->
                        OutlinedButton(onClick = { kit.drumHit(k) }, Modifier.heightIn(min = 56.dp).weight(1f)) { Text("🥁 $t") }
                    }
                }
                "metronome" -> OutlinedButton(onClick = { kit.perform { Synth.metronome(90, 8) } }, Modifier.heightIn(min = 48.dp)) {
                    Text(if (kit.lights.on.keys.any { it.startsWith("beat:") }) "⏱️ ●" else "⏱️ ○")
                }
                "glasses" -> if (glassesReady) Ltr {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        book.glasses.forEach { g ->
                            Surface(onClick = { kit.glass(g.id) }, color = if (g.id in kit.lights) Gold.copy(alpha = .3f) else Color.White, shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f).heightIn(min = 72.dp).semantics { contentDescription = "كوب ${glassLetter(g.id)}" }) {
                                GlassView(glassColor(g.color), g.n.toFloat() / g.d, Modifier.padding(2.dp).height(64.dp))
                            }
                        }
                    }
                }
            }
            quests.forEach { q ->
                val done = profile.questDone(ISLAND, q.id)
                val stars = profile.topics[q.topic]?.stars ?: 0
                Surface(color = if (done) Color(0xFFF3EEDF) else Color.White, shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(if (q == next) 2.dp else 1.dp, if (q == next) Gold else Sand)) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(q.icon, fontSize = 24.sp)
                            Column(Modifier.weight(1f)) {
                                Text(q.title, style = MaterialTheme.typography.titleMedium)
                                Text("من الكتاب: ${q.book.joinToString("، ") { "«$it»" }}", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        if (done) Stars(stars)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { vm.startQuest(ISLAND, q.id) }, Modifier.heightIn(min = 48.dp).weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)) { Text(if (done) "↻ العب مجدداً" else "ابدأ ▶") }
                            if (done) OutlinedButton(onClick = { vm.startTopic(q.topic) }, Modifier.heightIn(min = 48.dp).weight(1f)) { Text("🔁 راجع") }
                        }
                    }
                }
            }
        }
    }
}

/** نغمة, the island's helper: a little singing note whose face follows the mood. */
@Composable
fun NoteHelper(mood: Mood, modifier: Modifier = Modifier) {
    Canvas(modifier.padding(6.dp)) {
        val s = size.minDimension
        val c = Offset(size.width * .42f, size.height * .64f)
        val r = s * .26f
        val body = Color(0xFF8A63C9)
        drawLine(body, Offset(c.x + r * .92f, c.y), Offset(c.x + r * .92f, s * .1f), s * .07f, StrokeCap.Round)
        val flag = Path().apply { moveTo(c.x + r * .92f, s * .1f); quadraticTo(c.x + r * 2.1f, s * .2f, c.x + r * 1.6f, s * .45f) }
        drawPath(flag, body, style = Stroke(s * .06f, cap = StrokeCap.Round))
        drawOval(body, Offset(c.x - r * 1.1f, c.y - r * .85f), Size(r * 2.2f, r * 1.7f))
        val ink = Color(0xFF3B2414)
        val eyeY = c.y - r * .2f
        if (mood == Mood.Cheer) {
            listOf(-.4f, .4f).forEach { dx -> drawArc(Color.White, 180f, 180f, false, Offset(c.x + dx * r - r * .18f, eyeY - r * .1f), Size(r * .36f, r * .3f), style = Stroke(s * .025f)) }
        } else listOf(-.4f, .4f).forEach { dx -> drawCircle(Color.White, r * .17f, Offset(c.x + dx * r, eyeY)); drawCircle(ink, r * .08f, Offset(c.x + dx * r, eyeY)) }
        val mouth = Path()
        when (mood) {
            Mood.Oops -> { mouth.moveTo(c.x - r * .3f, c.y + r * .45f); mouth.quadraticTo(c.x, c.y + r * .2f, c.x + r * .3f, c.y + r * .45f) }
            Mood.Think -> { mouth.moveTo(c.x - r * .25f, c.y + r * .35f); mouth.lineTo(c.x + r * .25f, c.y + r * .35f) }
            else -> { mouth.moveTo(c.x - r * .35f, c.y + r * .25f); mouth.quadraticTo(c.x, c.y + r * .65f, c.x + r * .35f, c.y + r * .25f) }
        }
        drawPath(mouth, Color.White, style = Stroke(s * .035f, cap = StrokeCap.Round))
    }
}

/** The quest player for an island's quests (music and science; other islands give their own QuestKit here). */
@Composable
internal fun IslandQuest(state: org.sindibad.android.AppUiState, vm: GameViewModel) {
    val run = state.quest ?: return
    val book = remember(run.island) { QuestBooks.get(run.island) }
    val profile = state.store.active ?: return
    val prefs = profile.preferences
    val engine = rememberMusicEngine(prefs.sound)
    val scope = rememberCoroutineScope()
    // Each island brings its own part of the player: music its instruments, science its pictures.
    val science = run.island == "science"
    val kit: QuestKit = remember(engine, book, prefs.calm) { if (science) ScienceKit(engine, book, scope, prefs.calm) else MusicKit(engine, book, scope) }
    LaunchedEffect(run.id, run.finished) { if (run.finished && state.questReward?.runId != run.id) vm.saveQuest() }
    QuestScreen(run, book, kit, prefs, state.questReward, nextAfter(book, profile, run),
        helperFace = { mood, m -> if (science) RobotHelper(mood, m) else NoteHelper(mood, m) },
        act = QuestActions(vm::questTap, vm::questDrum, vm::questUndo), next = vm::questNext, close = vm::back, saveAgain = vm::saveQuest, busy = state.busy)
}

/** The next quest to play once this one is saved (web nextQuest: the first not yet finished). */
private fun nextAfter(book: QuestBook, profile: Profile, run: QuestRun) =
    book.quests.firstOrNull { !profile.questDone(run.island, it.id) && !(run.finished && it.id == run.questId) }
