@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.atlas

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.sindibad.android.GameViewModel
import org.sindibad.android.Screen
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.atlas.AtlasWorld
import org.sindibad.android.domain.islands
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*
import org.sindibad.android.ui.quest.HelperLine
import org.sindibad.android.ui.science.StickerBook
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// «جزيرة الأطلس» natively (web: core/atlas/atlas.ts, worlds/grade6/atlas.ts): the helper سهيل (a little star the
// Arab travellers steered by), the thirteen places grouped by the book's five units with their quests and stars,
// the travellers' compass (one ray per quest finished once; all 25 light Suhail's star above it), the atlas globe
// in the observatory, and the album's social studies page. The web's walkable 3D island is not drawn; its places
// are cards.

private const val ISLAND = "social"
private const val GLOBE_LINE = "🌍 في المرصد كرة أرضية: كل دول العالم بأعلامها وعواصمها وعملاتها."

@Composable
internal fun AtlasIsland(profile: Profile, vm: GameViewModel) {
    val book = remember { QuestBooks.get(ISLAND) }
    LaunchedEffect(Unit) { withContext(Dispatchers.Default) { AtlasKit.warm() } }
    val rays = profile.compassRays(ISLAND)
    val total = book.quests.size
    val next = book.quests.firstOrNull { !profile.questDone(ISLAND, it.id) }
    val station: (String) -> Station? = { id -> book.stations.firstOrNull { it.id == id } }
    val firstVisit = rememberSaveable { ISLAND !in profile.helpersMet }
    LaunchedEffect(Unit) { if (ISLAND !in profile.helpersMet) vm.meetHelper(ISLAND) }
    var line by rememberSaveable(stateSaver = LineSaver) {
        mutableStateOf(when {
            firstVisit -> Line(book.helper.hello, Mood.Cheer)
            next != null -> Line("${book.helper.back} الدرس التالي: **${next.title}** في ${station(next.station)?.name.orEmpty()}. اتبع السهم الذهبي! ✨", Mood.Happy)
            else -> Line("${book.helper.back} أضأت البوصلة كلها! 🧭 افتح الأطلس 🌍 وتجوّل في دول العالم.", Mood.Happy)
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
                    ?: Line("أضأت البوصلة كلها! 🧭 افتح الأطلس 🌍 وتجوّل في دول العالم.", Mood.Think)
            }, color = Color.Transparent) { HelperLine(book.helper.name, line) { mood, m -> StarHelper(mood, m) } }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { vm.navigate(Screen.Globe) }, Modifier.heightIn(min = 48.dp).weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)) { Text("افتح الأطلس 🌍") }
            }
        }
        item {
            Compass(rays, total) {
                line = if (rays == total) Line("بوصلة الرحّالة مضاءة كلها، ونجمة سهيل فوقها! 🧭✨ كل شعاع درس أتقنته.", Mood.Cheer)
                    else Line("في البوصلة $rays من $total أشعّة مضيئة. كل درس تُنهيه يضيء شعاعاً! 🧭", if (rays > 0) Mood.Cheer else Mood.Happy)
            }
        }
        if (next == null) item {
            Surface(color = Gold.copy(alpha = .25f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Text("🧭 أنهيت دروس الجزيرة كلها! افتح الأطلس 🌍، وراجع الدروس متى شئت 🔁", Modifier.padding(12.dp), style = MaterialTheme.typography.bodyLarge)
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
        item { StickerBook(book.stickers, profile.stickers, "📒 ألبوم الملصقات: الدراسات الاجتماعية") }
        item { Text("مسودة محتوى، بانتظار مراجعة معلّمين سوريين", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall) }
    }
}

internal fun hex(h: String) = Color(0xFF000000 or h.removePrefix("#").toLong(16))

private val LineSaver = Saver<Line, List<String>>(save = { listOf(it.text, it.mood.name) }, restore = { Line(it[0], Mood.valueOf(it[1])) })

/** The travellers' compass: a ray per quest finished once; all of them light Suhail's star (web atlas.ts reward()). */
@Composable
private fun Compass(n: Int, total: Int, say: () -> Unit) {
    PaperCard(Modifier.fillMaxWidth()) {
        Text("🧭 بوصلة الرحّالة", style = MaterialTheme.typography.titleMedium)
        Text("كل درس يضيء شعاعاً في بوصلة الرحّالة. 🧭 $n من $total", style = MaterialTheme.typography.bodyMedium)
        Canvas(Modifier.fillMaxWidth().height(150.dp).semantics { contentDescription = "$n من $total أشعّة مضيئة" + if (n == total) "، ونجمة سهيل مضيئة" else "" }) {
            val c = Offset(size.width / 2, size.height * .56f)
            val r = size.height * .4f
            drawCircle(Color(0xFFF3E6C8), r * 1.02f, c)
            drawCircle(Color(0xFF8A6A3A), r * 1.02f, c, style = Stroke(3f))
            repeat(total) { i ->
                val a = -PI / 2 + 2 * PI * i / total
                val tip = Offset(c.x + (cos(a) * r * .95f).toFloat(), c.y + (sin(a) * r * .95f).toFloat())
                val lit = i < n
                drawLine(if (lit) Color(0xFFFF9A20) else Color(0xFFA89878), Offset(c.x + (cos(a) * r * .25f).toFloat(), c.y + (sin(a) * r * .25f).toFloat()), tip,
                    if (lit) 5f else 3f, StrokeCap.Round)
            }
            drawCircle(Color(0xFF3B2414), r * .12f, c)
            // Suhail's star above the compass: lit when every ray is.
            val sc = Offset(c.x, size.height * .1f)
            val star = Path()
            for (i in 0 until 10) {
                val a = -PI / 2 + PI * i / 5
                val rr = if (i % 2 == 0) size.height * .09f else size.height * .04f
                val p = Offset(sc.x + (cos(a) * rr).toFloat(), sc.y + (sin(a) * rr).toFloat())
                if (i == 0) star.moveTo(p.x, p.y) else star.lineTo(p.x, p.y)
            }
            star.close()
            drawPath(star, if (n == total) Color(0xFFFFD36B) else Color(0xFFD8CCB4))
        }
        if (n == total) Text("✨ نجمة سهيل فوق البوصلة", color = Teal, fontWeight = FontWeight.Bold)
        OutlinedButton(onClick = say, Modifier.heightIn(min = 48.dp)) { Text("🧭 البوصلة") }
    }
}

@Composable
private fun StationCard(st: Station, book: QuestBook, profile: Profile, next: Quest?, vm: GameViewModel) {
    val isNext = next?.station == st.id
    Surface(color = Paper, shape = RoundedCornerShape(20.dp), border = BorderStroke(if (isNext) 3.dp else 1.dp, if (isNext) Gold else Sand)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(st.icon, fontSize = 28.sp)
                Text(st.name, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                if (isNext) Text("⬅ السهم الذهبي", color = Color(0xFFAE7308), fontWeight = FontWeight.Bold)
            }
            if (st.id == "atlas") {
                Text(GLOBE_LINE, style = MaterialTheme.typography.bodyMedium)
                OutlinedButton(onClick = { vm.navigate(Screen.Globe) }, Modifier.heightIn(min = 48.dp)) { Text("افتح الأطلس 🌍") }
            }
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

/** سهيل, the little star explorer: a golden five-pointed star with a face that follows the mood. */
@Composable
fun StarHelper(mood: Mood, modifier: Modifier = Modifier) {
    Canvas(modifier.padding(5.dp)) {
        val s = size.minDimension
        val c = Offset(size.width / 2, size.height / 2 + s * .04f)
        val star = Path()
        for (i in 0 until 10) {
            val a = -PI / 2 + PI * i / 5
            val rr = if (i % 2 == 0) s * .5f else s * .24f
            val p = Offset(c.x + (cos(a) * rr).toFloat(), c.y + (sin(a) * rr).toFloat())
            if (i == 0) star.moveTo(p.x, p.y) else star.lineTo(p.x, p.y)
        }
        star.close()
        drawPath(star, Color(0xFFFFD36B))
        drawPath(star, Color(0xFFC98A1A), style = Stroke(s * .03f))
        val ink = Color(0xFF3B2414)
        val eyeY = c.y - s * .02f
        if (mood == Mood.Cheer) listOf(-.09f, .09f).forEach { dx ->
            drawArc(ink, 180f, 180f, false, Offset(c.x + dx * s - s * .05f, eyeY - s * .03f), Size(s * .1f, s * .08f), style = Stroke(s * .028f))
        } else listOf(-.09f, .09f).forEach { dx -> drawCircle(ink, s * .035f, Offset(c.x + dx * s, eyeY)) }
        val mouth = Path()
        when (mood) {
            Mood.Oops -> { mouth.moveTo(c.x - s * .07f, c.y + s * .12f); mouth.quadraticTo(c.x, c.y + s * .07f, c.x + s * .07f, c.y + s * .12f) }
            Mood.Think -> { mouth.moveTo(c.x - s * .06f, c.y + s * .1f); mouth.lineTo(c.x + s * .06f, c.y + s * .1f) }
            else -> { mouth.moveTo(c.x - s * .08f, c.y + s * .07f); mouth.quadraticTo(c.x, c.y + s * .15f, c.x + s * .08f, c.y + s * .07f) }
        }
        drawPath(mouth, ink, style = Stroke(s * .028f, cap = StrokeCap.Round))
        if (mood == Mood.Cheer) drawCircle(Color(0xFFFFE9A8), s * .07f, Offset(c.x + s * .32f, c.y - s * .32f), alpha = .8f)
    }
}
