@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.science

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.sindibad.android.GameViewModel
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.islands
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*
import org.sindibad.android.ui.quest.HelperLine
import org.sindibad.android.ui.quest.StickerCard

// «جزيرة العلوم» natively (web: core/lab/lab.ts): the helper شرارة, the island's ten places grouped by the book's
// four units with their quests and stars, the lighthouse (one crystal per quest finished once; all seventeen
// light its beam), and the sticker album's science page. The 3D island of the web is not drawn; its places
// are cards.

private const val ISLAND = "science"

@Composable
internal fun ScienceIsland(profile: Profile, vm: GameViewModel) {
    val book = remember { QuestBooks.get(ISLAND) }
    val crystals = profile.crystals(ISLAND)
    val total = book.quests.size
    val next = book.quests.firstOrNull { !profile.questDone(ISLAND, it.id) }
    val station: (String) -> Station? = { id -> book.stations.firstOrNull { it.id == id } }
    val firstVisit = rememberSaveable { ISLAND !in profile.helpersMet }
    LaunchedEffect(Unit) { if (ISLAND !in profile.helpersMet) vm.meetHelper(ISLAND) }
    var line by rememberSaveable(stateSaver = LineSaver) {
        mutableStateOf(when {
            firstVisit -> Line(book.helper.hello, Mood.Cheer)
            next != null -> Line("${book.helper.back} الدرس التالي: **${next.title}** في ${station(next.station)?.name.orEmpty()}. اتبع السهم الذهبي! ✨", Mood.Happy)
            else -> Line("${book.helper.back} أضأت المنارة كلها! اضغط 💎 لترى شعاعها.", Mood.Happy)
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
                    ?: Line("أضأت المنارة كلها! اضغط 💎 لترى شعاعها.", Mood.Think)
            }, color = Color.Transparent) { HelperLine(book.helper.name, line) { mood, m -> RobotHelper(mood, m) } }
        }
        item {
            Lighthouse(crystals, total) {
                line = if (crystals == total) Line("المنارة مضاءة كلها! 💎 كل بلّورة فيها درس أتقنته. شعاعها يرشد السفن الآن.", Mood.Cheer)
                    else Line("في المنارة $crystals من $total بلّورات مضيئة. كل درس تُنهيه يضيء بلّورة جديدة! 💎", if (crystals > 0) Mood.Cheer else Mood.Happy)
            }
        }
        if (next == null) item {
            Surface(color = Gold.copy(alpha = .25f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Text("💎 أنهيت دروس الجزيرة كلها! المنارة مضاءة، وكل الدروس تنتظر المراجعة 🔁", Modifier.padding(12.dp), style = MaterialTheme.typography.bodyLarge)
            }
        }
        book.units.forEach { unit ->
            item(key = "unit${unit.n}") {
                Surface(color = hex(unit.color), shape = RoundedCornerShape(12.dp)) {
                    Text("الوحدة ${unit.n}: ${unit.name}", Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                        color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                }
            }
            items(book.stations.filter { it.unit == unit.n }, key = { it.id }) { st -> StationCard(st, book, profile, next, vm) }
        }
        item { StickerBook(book.stickers, profile.stickers, "📒 ألبوم الملصقات: العلوم") }
        item { Text("مسودة محتوى، بانتظار مراجعة معلّمين سوريين", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall) }
    }
}

private val LineSaver = Saver<Line, List<String>>(save = { listOf(it.text, it.mood.name) }, restore = { Line(it[0], Mood.valueOf(it[1])) })

/** The lighthouse: a crystal per quest finished once; all of them light its beam (web lab.ts reward()). */
@Composable
private fun Lighthouse(n: Int, total: Int, say: () -> Unit) {
    PaperCard(Modifier.fillMaxWidth()) {
        Text("🗼 منارة العلوم", style = MaterialTheme.typography.titleMedium)
        Text("كل درس يضيء بلّورة في المنارة. 💎 $n من $total", style = MaterialTheme.typography.bodyMedium)
        FlowRow(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "$n من $total بلّورات مضيئة" },
            horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            repeat(total) { i ->
                Box(Modifier.size(28.dp).background(if (i < n) Color(0xFF7FD8F0) else Color(0x223B2414), RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Text(if (i < n) "💎" else "", fontSize = 14.sp)
                }
            }
        }
        if (n == total) Text("✨ شعاع المنارة يرشد السفن", color = Teal, fontWeight = FontWeight.Bold)
        OutlinedButton(onClick = say, Modifier.heightIn(min = 48.dp)) { Text("💎 المنارة") }
    }
}

@Composable
private fun StationCard(st: Station, book: QuestBook, profile: Profile, next: Quest?, vm: GameViewModel) {
    val isNext = next?.station == st.id
    val extra = if (st.id == "machines") "⚙️ اضغط على الأرجوحة أو الرافعة أو الناعورة لتعمل!" else ""
    Surface(color = Paper, shape = RoundedCornerShape(20.dp), border = BorderStroke(if (isNext) 3.dp else 1.dp, if (isNext) Gold else Sand)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(st.icon, fontSize = 28.sp)
                Text(st.name, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                if (isNext) Text("⬅ السهم الذهبي", color = Color(0xFFAE7308), fontWeight = FontWeight.Bold)
            }
            if (extra.isNotEmpty()) Text(extra, style = MaterialTheme.typography.bodyMedium)
            book.questsAt(st.id).forEach { q ->
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
                            book.sticker(q.sticker)?.let { s -> Text(if (profile.hasSticker(s.id)) s.icon else "📒", fontSize = 20.sp,
                                modifier = Modifier.semantics { contentDescription = if (profile.hasSticker(s.id)) "ملصق ${s.name}" else "في هذا الدرس ملصق" }) }
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

/**
 * An island's page of the sticker album (web core/stickers.ts): stickers earned in colour, tap one to read its
 * fact; the others are «؟؟؟». Any island with `stickers` in its book can show its page.
 */
@Composable
fun StickerBook(stickers: List<Sticker>, owned: List<String>, title: String) {
    if (stickers.isEmpty()) return
    var open by rememberSaveable { mutableStateOf<String?>(null) }
    PaperCard(Modifier.fillMaxWidth()) {
        Text("$title  ${stickers.count { it.id in owned }} / ${stickers.size}", style = MaterialTheme.typography.titleMedium)
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            stickers.forEach { s ->
                val have = s.id in owned
                Surface(onClick = { if (have) open = if (open == s.id) null else s.id }, enabled = have, shape = RoundedCornerShape(14.dp),
                    color = if (have) Color.White else Color(0xFFEDE6DA), border = BorderStroke(if (open == s.id) 3.dp else 1.dp, if (open == s.id) Gold else Sand),
                    modifier = Modifier.width(96.dp).heightIn(min = 88.dp).semantics { contentDescription = if (have) "ملصق ${s.name}" else "ملصق لم تجمعه بعد" }) {
                    Column(Modifier.padding(6.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        Text(if (have) s.icon else "❔", fontSize = 32.sp)
                        Text(if (have) s.name else "؟؟؟", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    }
                }
            }
        }
        stickers.firstOrNull { it.id == open && it.id in owned }?.let { StickerCard(it) } ?: Text("اضغط على ملصق لتقرأ معلومته.", style = MaterialTheme.typography.bodySmall)
    }
}

/** شرارة, the lab robot: a boxy head with an antenna spark; its eyes and mouth follow the mood. */
@Composable
fun RobotHelper(mood: Mood, modifier: Modifier = Modifier) {
    Canvas(modifier.padding(6.dp)) {
        val s = size.minDimension
        val ox = (size.width - s) / 2; val oy = (size.height - s) / 2
        fun o(x: Float, y: Float) = Offset(ox + x * s, oy + y * s)
        val ink = Color(0xFF3B2414); val body = Color(0xFF3F8FD6); val spark = Color(0xFFF2C14E)
        drawLine(ink, o(.5f, .3f), o(.5f, .14f), s * .04f, StrokeCap.Round)
        drawCircle(spark, s * .08f, o(.5f, .12f))
        drawRoundRect(body, o(.16f, .3f), Size(s * .68f, s * .56f), CornerRadius(s * .14f))
        drawRoundRect(Color.White, o(.24f, .4f), Size(s * .52f, s * .36f), CornerRadius(s * .1f))
        drawCircle(body, s * .05f, o(.13f, .58f)); drawCircle(body, s * .05f, o(.87f, .58f))
        val eyeY = .52f
        if (mood == Mood.Cheer) listOf(.38f, .62f).forEach { x -> drawArc(ink, 180f, 180f, false, o(x - .06f, eyeY - .03f), Size(s * .12f, s * .1f), style = Stroke(s * .03f)) }
        else listOf(.38f, .62f).forEach { x -> drawCircle(ink, s * .045f, o(x, eyeY)) }
        val mouth = Path()
        when (mood) {
            Mood.Oops -> { mouth.moveTo(ox + .4f * s, oy + .7f * s); mouth.quadraticTo(ox + .5f * s, oy + .64f * s, ox + .6f * s, oy + .7f * s) }
            Mood.Think -> { mouth.moveTo(ox + .42f * s, oy + .67f * s); mouth.lineTo(ox + .58f * s, oy + .67f * s) }
            else -> { mouth.moveTo(ox + .4f * s, oy + .64f * s); mouth.quadraticTo(ox + .5f * s, oy + .73f * s, ox + .6f * s, oy + .64f * s) }
        }
        drawPath(mouth, ink, style = Stroke(s * .03f, cap = StrokeCap.Round))
        if (mood == Mood.Cheer) drawCircle(spark, s * .14f, o(.5f, .12f), alpha = .35f)
    }
}
