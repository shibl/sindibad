@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.english

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import org.sindibad.android.GameViewModel
import org.sindibad.android.Screen
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.domain.Mood
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.english.Bidi
import org.sindibad.android.domain.english.ENGLISH
import org.sindibad.android.domain.english.HelloSign
import org.sindibad.android.domain.english.WordBook
import org.sindibad.android.domain.english.WordGroup
import org.sindibad.android.domain.english.hasWord
import org.sindibad.android.domain.islands
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*
import org.sindibad.android.ui.quest.AnswerButton
import org.sindibad.android.ui.quest.HelperLine
import org.sindibad.android.ui.science.StickerBook
import org.sindibad.android.ui.science.hex

// «جزيرة Hello» natively (web: core/english/english.ts): the parrot بولي, the town's twelve places grouped by the
// book's four blocks of units, the HELLO sign (a star for each quest finished once, a letter for every five), the
// English page of the sticker album, and «دفتر كلماتي» (web: core/english/words.ts). The web's 3D town is not
// drawn; its places are cards.

@Composable
internal fun EnglishIsland(profile: Profile, vm: GameViewModel) {
    val book = remember { QuestBooks.get(ENGLISH) }
    val done = HelloSign.bulbs(profile)
    val total = book.quests.size
    val next = book.quests.firstOrNull { !profile.questDone(ENGLISH, it.id) }
    val station: (String) -> Station? = { id -> book.stations.firstOrNull { it.id == id } }
    val firstVisit = rememberSaveable { ENGLISH !in profile.helpersMet }
    LaunchedEffect(Unit) { if (ENGLISH !in profile.helpersMet) vm.meetHelper(ENGLISH) }
    var line by rememberSaveable(stateSaver = LineSaver) {
        mutableStateOf(when {
            firstVisit -> Line(book.helper.hello, Mood.Cheer)
            next != null -> Line("${book.helper.back} الدرس التالي: **${next.title}** في ${station(next.station)?.name.orEmpty()}. اتبع السهم الذهبي! ✨", Mood.Happy)
            else -> Line("${book.helper.back} أضأت لافتة HELLO كلها! 🌟", Mood.Happy)
        })
    }
    val island = islands.first { it.id == ENGLISH }
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
                    ?: Line("أضأت لافتة HELLO كلها! 🌟", Mood.Think)
            }, color = Color.Transparent) { HelperLine(book.helper.name, line) { mood, m -> ParrotHelper(mood, m) } }
        }
        item {
            HelloSignCard(done, total) {
                line = if (done == total) Line("لافتة HELLO مضاءة كلها! 🌟 كل نجمة فيها درس أتقنته.", Mood.Cheer)
                    else Line("في لافتة HELLO $done من $total نجوم مضيئة. كل درس تُنهيه يضيء نجمة، وكل خمسة دروس تضيء حرفاً! ⭐", if (done > 0) Mood.Cheer else Mood.Happy)
            }
        }
        item {
            Button(onClick = { vm.navigate(Screen.WordBook) }, Modifier.fillMaxWidth().heightIn(min = 52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Paper, contentColor = Ink), shape = RoundedCornerShape(16.dp)) {
                Text("📖 دفتر كلماتي", style = MaterialTheme.typography.titleMedium)
            }
        }
        if (next == null) item {
            Surface(color = Gold.copy(alpha = .25f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Text("🌟 أنهيت دروس الجزيرة كلها! لافتة HELLO مضاءة، وكل الدروس تنتظر المراجعة 🔁", Modifier.padding(12.dp), style = MaterialTheme.typography.bodyLarge)
            }
        }
        book.blocks.forEach { block ->
            item(key = "block${block.n}") {
                Surface(color = hex(block.color), shape = RoundedCornerShape(12.dp)) {
                    Text(block.name, Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                        color = Color.White, fontWeight = FontWeight.Bold, style = enStyle(MaterialTheme.typography.titleMedium))
                }
            }
            items(book.stations.filter { blockOf(it) == block.n }, key = { it.id }) { st -> StationCard(st, book, profile, next, vm) }
        }
        item { StickerBook(book.stickers, profile.stickers, "📒 ألبوم الملصقات: الإنكليزية") }
        item { Text("مسودة محتوى، بانتظار مراجعة معلّمين سوريين", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall) }
    }
}

/** The book's block of a place: units 1–5, 6–10, 11–15, 16–20 (web BLOCKS). */
fun blockOf(st: Station) = ((st.unit ?: 1) - 1) / 5 + 1

private val LineSaver = Saver<Line, List<String>>(save = { listOf(it.text, it.mood.name) }, restore = { Line(it[0], Mood.valueOf(it[1])) })

/** The HELLO sign: a star bulb for each quest finished once; a letter for every five (web english.ts reward()). */
@Composable
private fun HelloSignCard(n: Int, total: Int, say: () -> Unit) {
    val lit = HelloSign.letters(n)
    PaperCard(Modifier.fillMaxWidth()) {
        Text("🪧 لافتة HELLO", style = MaterialTheme.typography.titleMedium)
        Text("كل درس يضيء نجمة في اللافتة. ⭐ $n من $total", style = MaterialTheme.typography.bodyMedium)
        Ltr {
            Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "أضأت $lit من 5 حروف في HELLO" },
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)) {
                HelloSign.WORD.forEachIndexed { i, c ->
                    Box(Modifier.size(48.dp).background(if (i < lit) Gold else Color(0x223B2414), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                        Text(c.toString(), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = if (i < lit) Ink else Ink.copy(alpha = .3f))
                    }
                }
            }
        }
        FlowRow(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "$n من $total نجوم مضيئة" },
            horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            repeat(total) { i ->
                Box(Modifier.size(24.dp).background(if (i < n) Color(0xFFFFE27A) else Color(0x223B2414), CircleShape), contentAlignment = Alignment.Center) {
                    Text(if (i < n) "⭐" else "", fontSize = 12.sp)
                }
            }
        }
        if (n == total) Text("✨ لافتة HELLO تضيء الشاطئ كله", color = Teal, fontWeight = FontWeight.Bold)
        OutlinedButton(onClick = say, Modifier.heightIn(min = 48.dp)) { Text("⭐ اللافتة") }
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
            book.questsAt(st.id).forEach { q ->
                val done = profile.questDone(ENGLISH, q.id)
                val stars = profile.topics[q.topic]?.stars ?: 0
                Surface(color = if (done) Color(0xFFF3EEDF) else Color.White, shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(if (q == next) 2.dp else 1.dp, if (q == next) Gold else Sand)) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(q.icon, fontSize = 24.sp)
                            Column(Modifier.weight(1f)) {
                                Text(q.title, style = MaterialTheme.typography.titleMedium)
                                Text("من الكتاب: ${q.book.joinToString("، ") { "«${Bidi.en(it)}»" }}", style = MaterialTheme.typography.bodySmall)
                            }
                            book.sticker(q.sticker)?.let { s -> Text(if (profile.hasSticker(s.id)) s.icon else "📒", fontSize = 20.sp,
                                modifier = Modifier.semantics { contentDescription = if (profile.hasSticker(s.id)) "ملصق ${s.name}" else "في هذا الدرس ملصق" }) }
                        }
                        if (done) Stars(stars)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { vm.startQuest(ENGLISH, q.id) }, Modifier.heightIn(min = 48.dp).weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)) { Text(if (done) "↻ العب مجدداً" else "ابدأ ▶") }
                            if (done) OutlinedButton(onClick = { vm.startTopic(q.topic) }, Modifier.heightIn(min = 48.dp).weight(1f)) { Text("🔁 راجع") }
                        }
                    }
                }
            }
        }
    }
}

// ---------- «دفتر كلماتي» ----------

@Composable
internal fun WordBookScreen(profile: Profile, vm: GameViewModel) {
    val book = remember { QuestBooks.get(ENGLISH) }
    val voice = rememberEnglishVoice(profile.preferences.sound)
    val met = remember(profile.englishSeen, profile.islandQuests) { WordBook.met(book, profile) }
    val saved = remember(profile.wordBook) { WordBook.saved(book, profile) }
    val pool = remember(met, profile.wordBook) { WordBook.practice(book, profile) }
    var cards by rememberSaveable { mutableStateOf(false) }
    val count = met.sumOf { it.words.size }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("📖", fontSize = 30.sp)
                Text("دفتر كلماتي", Modifier.weight(1f), color = Color.White, style = MaterialTheme.typography.titleLarge)
                Text("$count ${if (count > 10) "كلمة" else if (count > 2) "كلمات" else "كلمة"}", color = Color.White)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Tab("📚 كلماتي", !cards, true, Modifier.weight(1f)) { cards = false }
                Tab("🃏 لعبة البطاقات", cards, pool.size >= WordBook.CARDS_MIN, Modifier.weight(1f)) { cards = true }
            }
        }
        if (cards && pool.size >= WordBook.CARDS_MIN) item { FlashCards(pool, profile.wordCardsBest, voice, profile.preferences.sound, vm::cardStreak) }
        else {
            if (pool.size < WordBook.CARDS_MIN) item {
                Text("🃏 لعبة البطاقات تُفتح حين يصير في دفترك ${WordBook.CARDS_MIN} كلمات أو أكثر.", color = Paper, style = MaterialTheme.typography.bodyMedium)
            }
            if (saved.isNotEmpty()) item { Text("⭐ كلماتي المحفوظة", color = Color.White, style = MaterialTheme.typography.titleMedium) }
            items(saved, key = { "saved:" + (it.quest?.id ?: "other") }) { g -> WordGroupCard(g, profile, voice, vm, savedList = true) }
            if (met.isEmpty()) item {
                PaperCard(Modifier.fillMaxWidth()) { Text("🦜 دفترك ينتظر كلماته! ابدأ أول درس في **ميناء البلدان** 🚢 لتمتلئ صفحاته.".replace("**", ""), style = MaterialTheme.typography.bodyLarge) }
            } else item { Text("📚 الكلمات التي قابلتها في الدروس", color = Color.White, style = MaterialTheme.typography.titleMedium) }
            items(met, key = { "met:" + it.quest?.id }) { g -> WordGroupCard(g, profile, voice, vm, savedList = false) }
        }
        item { Text("مسودة محتوى، بانتظار مراجعة معلّمين سوريين", color = Paper.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun Tab(text: String, on: Boolean, enabled: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Surface(onClick = onClick, enabled = enabled, shape = RoundedCornerShape(14.dp), color = if (on) Gold else if (enabled) Paper else Color(0xFFEDE6DA),
        border = BorderStroke(1.dp, Sand), modifier = modifier.heightIn(min = 48.dp).semantics { role = Role.Tab; selected = on }) {
        Box(contentAlignment = Alignment.Center) { Text(text, Modifier.padding(8.dp), color = if (enabled) Ink else Ink.copy(alpha = .45f), style = MaterialTheme.typography.titleSmall) }
    }
}

/** A quest's words (or the saved words of a quest): tap one to open its card. */
@Composable
private fun WordGroupCard(g: WordGroup, profile: Profile, voice: EnglishVoice, vm: GameViewModel, savedList: Boolean) {
    var open by rememberSaveable(g.quest?.id, savedList) { mutableStateOf<String?>(null) }
    PaperCard(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(g.quest?.icon ?: "⭐", fontSize = 22.sp)
            Text(g.quest?.book?.firstOrNull() ?: "كلمات أخرى", Modifier.weight(1f), fontWeight = FontWeight.Bold,
                style = if (g.quest != null) enStyle(MaterialTheme.typography.titleMedium) else MaterialTheme.typography.titleMedium)
        }
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3) {
            g.words.forEach { w ->
                AnswerButton(w.en, Modifier.weight(1f), right = open == w.en, description = "${w.en}، ${w.ar}", onClick = {
                    open = if (open == w.en) null else w.en
                    if (open != null) voice.say("${w.en}. ${w.ex}")
                }) {
                    WordPicture(w.pic, Modifier.size(40.dp), emoji = 28.sp)
                    Text(w.ar, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center)
                }
            }
            repeat((3 - g.words.size % 3) % 3) { Spacer(Modifier.weight(1f)) }
        }
        g.words.firstOrNull { it.en == open }?.let { w ->
            val quest = g.quest ?: WordBook.find(QuestBooks.get(ENGLISH), w.en)?.first
            VocabCard(w, saved = profile.hasWord(w.en), voice = voice, onToggle = {
                // The old saved words (with no picture or quest) keep what they had when taken out and put back.
                val old = profile.wordBook.firstOrNull { it.en.equals(w.en, ignoreCase = true) }
                vm.toggleWord(old ?: WordBook.entry(w, quest))
            })
        }
    }
}

/** The flash cards (web words.ts nextCard): a picture and its Arabic, three English words; a wrong one shows the right one. */
@Composable
private fun FlashCards(pool: List<Word>, best: Int, voice: EnglishVoice, sound: Boolean, onStreak: (Int) -> Unit) {
    var seed by rememberSaveable { mutableIntStateOf(kotlin.random.Random.nextInt(1, Int.MAX_VALUE)) }
    var streak by rememberSaveable { mutableIntStateOf(0) }
    var tried by rememberSaveable(seed) { mutableStateOf(listOf<String>()) }
    var right by rememberSaveable(seed) { mutableStateOf(false) }
    val card = remember(pool, seed) { WordBook.card(pool, seed) }
    PaperCard(Modifier.fillMaxWidth()) {
        Text("🔥 $streak   أفضل سلسلة: ${maxOf(best, streak)}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            WordPicture(card.word.pic, Modifier.size(96.dp), emoji = 64.sp, description = "الصورة")
            Text(card.word.ar, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall)
        }
        Text("ما الكلمة بالإنكليزية؟", style = MaterialTheme.typography.titleMedium)
        Ltr {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                card.options.forEach { o ->
                    val ok = o.en == card.word.en
                    AnswerButton(o.en, Modifier.fillMaxWidth(), glow = ok && tried.isNotEmpty() && !right, right = ok && right,
                        tried = o.en in tried, enabled = !right, onClick = {
                            if (ok) {
                                right = true; streak += 1; onStreak(streak); voice.say(o.en)
                            } else { tried = tried + o.en; streak = 0 }
                        })
                }
            }
        }
        if (tried.isNotEmpty() && !right) Text("انظر إلى ما يلمع ✨", color = Rose, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        if (right) GoldButton("البطاقة التالية ◀", true) { seed += 1 }
    }
}

/** بولي, the parrot: a green head with a yellow beak; its eye and beak follow the mood. */
@Composable
fun ParrotHelper(mood: Mood, modifier: Modifier = Modifier) {
    Canvas(modifier.padding(5.dp)) {
        val s = size.minDimension
        val ox = (size.width - s) / 2; val oy = (size.height - s) / 2
        fun o(x: Float, y: Float) = Offset(ox + x * s, oy + y * s)
        val ink = Color(0xFF3B2414); val green = Color(0xFF3FB55A); val red = Color(0xFFE8453C); val beak = Color(0xFFF2C14E)
        // A red crest, the head, a white face patch.
        val crest = Path().apply { moveTo(o(.42f, .2f).x, o(.42f, .2f).y); quadraticTo(o(.36f, .02f).x, o(.36f, .02f).y, o(.56f, .1f).x, o(.56f, .1f).y); quadraticTo(o(.6f, .16f).x, o(.6f, .16f).y, o(.56f, .22f).x, o(.56f, .22f).y); close() }
        drawPath(crest, red)
        drawCircle(green, s * .34f, o(.48f, .52f))
        drawOval(Color.White, o(.46f, .3f), Size(s * .3f, s * .3f))
        // The eye: a happy arc when cheering, round otherwise; a little worried brow on «oops».
        if (mood == Mood.Cheer) drawArc(ink, 180f, 180f, false, o(.55f, .38f), Size(s * .12f, s * .1f), style = Stroke(s * .035f, cap = StrokeCap.Round))
        else { drawCircle(ink, s * .055f, o(.61f, .44f)); drawCircle(Color.White, s * .018f, o(.625f, .425f)) }
        if (mood == Mood.Oops) drawLine(ink, o(.54f, .33f), o(.67f, .36f), s * .03f, StrokeCap.Round)
        // The hooked beak; open when talking happily.
        val top = Path().apply { moveTo(o(.72f, .44f).x, o(.72f, .44f).y); quadraticTo(o(.95f, .46f).x, o(.95f, .46f).y, o(.84f, .66f).x, o(.84f, .66f).y); quadraticTo(o(.8f, .56f).x, o(.8f, .56f).y, o(.7f, .56f).x, o(.7f, .56f).y); close() }
        drawPath(top, beak); drawPath(top, ink, style = Stroke(s * .02f))
        val open = mood == Mood.Cheer || mood == Mood.Happy
        val low = Path().apply { moveTo(o(.7f, .58f).x, o(.7f, .58f).y); quadraticTo(o(.78f, if (open) .7f else .62f).x, o(.78f, if (open) .7f else .62f).y, o(.66f, .66f).x, o(.66f, .66f).y); close() }
        drawPath(low, Color(0xFFD9A21F))
        // A wing.
        drawOval(Color(0xFF2F8F47), o(.2f, .55f), Size(s * .3f, s * .3f))
        if (mood == Mood.Think) drawCircle(Color(0xFF7FD8F0), s * .06f, o(.18f, .2f))
    }
}
