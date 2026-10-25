@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import org.sindibad.android.*
import org.sindibad.android.content.Topics
import org.sindibad.android.domain.*

@Composable
fun SindibadApp(vm: GameViewModel) {
    val state by vm.ui.collectAsStateWithLifecycle()
    val prefs = state.store.active?.preferences ?: Preferences()
    var exitLesson by remember { mutableStateOf(false) }
    val requestBack: () -> Unit = {
        val session = state.session
        when {
            state.screen != Screen.Lesson -> vm.back()
            session?.finished == false -> exitLesson = true
            session != null && state.store.active?.completedSessions?.contains(session.id) != true -> vm.saveResult()
            else -> vm.back()
        }
    }
    SindibadTheme(prefs.largeText) {
        BackHandler(state.screen != Screen.Home, onBack = requestBack)
        Feedback(state.session, prefs)
        LaunchedEffect(state.session?.id, state.session?.finished) {
            if (state.session?.finished == true) vm.saveResult()
        }
        Box(Modifier.fillMaxSize()) {
            OceanBackground()
            Column(Modifier.fillMaxSize().safeDrawingPadding()) {
                if (!state.loading) AppBar(state, vm, requestBack)
                state.error?.let { message ->
                    PaperCard(Modifier.padding(horizontal = 16.dp)) {
                        Text(message, color = MaterialTheme.colorScheme.error)
                        TextButton(onClick = { if (state.session?.finished == true) vm.saveResult() else vm.retryLoad() }) { Text("حاول مرة أخرى") }
                    }
                }
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                    Box(Modifier.widthIn(max = 840.dp).fillMaxSize()) {
                        if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Gold)
                        } else when (state.screen) {
                            Screen.Home -> Home(state, vm)
                            Screen.Profiles -> Profiles(state, vm)
                            Screen.Voyages -> Voyages { vm.navigate(Screen.Sea) }
                            Screen.Sea -> SeaMap(state.store.active ?: return@Box) { region ->
                                vm.navigate(when (region) { "math" -> Screen.Math; "treasure" -> Screen.Treasure; else -> Screen.Arabic })
                            }
                            Screen.Arabic -> SubjectIsland("arabic", state.store.active ?: return@Box, vm::startTopic)
                            Screen.Math -> SubjectIsland("math", state.store.active ?: return@Box, vm::startTopic)
                            Screen.Treasure -> TreasureIsland(state.store.active ?: return@Box, vm)
                            Screen.Review -> ReviewList(state.store.active ?: return@Box, vm::startTopic)
                            Screen.Shop -> PearlShop(state.store.active ?: return@Box, state.busy, vm)
                            Screen.Certificate -> Certificate(state.store.active ?: return@Box)
                            Screen.Lesson -> state.session?.let { Lesson(it, state, vm) }
                            Screen.Journey -> Journey(state.store.active ?: return@Box, vm)
                            Screen.Settings -> Settings(prefs, state.busy, vm::preferences)
                            Screen.About -> About()
                        }
                    }
                }
            }
            if (exitLesson) AlertDialog(
                onDismissRequest = { exitLesson = false },
                title = { Text("العودة إلى الجزيرة؟") },
                text = { Text("يمكنك متابعة هذا الدرس عند فتحه مجدداً ما دامت الجلسة محفوظة. تُحفظ النجوم عند إكمال الدرس.") },
                confirmButton = { TextButton(onClick = { exitLesson = false; vm.back() }) { Text("العودة") } },
                dismissButton = { TextButton(onClick = { exitLesson = false }) { Text("أكمل الدرس") } },
            )
        }
    }
}

@Composable
private fun OceanBackground() {
    Canvas(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF70C9E4), Color(0xFF248FB4), Sea)))) {
        repeat(24) { i ->
            val y = size.height * (i + 1) / 25
            val x = ((i * 97) % 320) / 320f * size.width
            drawLine(Color.White.copy(alpha = .12f), Offset(x, y), Offset(x + 48.dp.toPx(), y - 3.dp.toPx()), 2.dp.toPx())
        }
    }
}

@Composable
private fun AppBar(state: AppUiState, vm: GameViewModel, back: () -> Unit) {
    val title = when (state.screen) {
        Screen.Home -> "رحلات سندباد وياسمينة"
        Screen.Voyages -> "خريطة الرحلات"
        Screen.Sea -> "بحر الصف السادس"
        Screen.Arabic -> "جزيرة الحروف"
        Screen.Math -> "جزيرة الأرقام"
        Screen.Treasure -> "جزيرة الكنز"
        Screen.Review -> "أراجع ما تعلّمت"
        Screen.Shop -> "سوق الميناء"
        Screen.Certificate -> "شهادتي"
        Screen.Lesson -> "نتعلّم مع هُدهُد"
        Screen.Journey -> "رحلتي"
        Screen.Settings -> "الإعدادات"
        Screen.Profiles -> "مَن سيلعب؟"
        Screen.About -> "عن الرحلة"
    }
    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        if (state.screen != Screen.Home) TextButton(onClick = back) { Text("رجوع", color = Color.White) }
        Text(title, Modifier.weight(1f), color = Color.White, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        if (state.store.active != null && state.screen !in listOf(Screen.Settings, Screen.Lesson)) {
            TextButton(onClick = { vm.navigate(Screen.Settings) }) { Text("ضبط", color = Color.White) }
        }
    }
}

@Composable
fun PaperCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(modifier, color = Paper, shape = RoundedCornerShape(24.dp), border = BorderStroke(1.dp, Sand)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

@Composable
internal fun GoldButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(onClick, Modifier.fillMaxWidth().heightIn(min = 52.dp), enabled = enabled,
        colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink),
        shape = RoundedCornerShape(16.dp)) { Text(text, style = MaterialTheme.typography.titleMedium) }
}

@Composable
private fun Home(state: AppUiState, vm: GameViewModel) {
    val profile = state.store.active
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("أبحر، اكتشف، تعلّم", color = Color.White, style = MaterialTheme.typography.headlineLarge)
        Text("مع سندباد وياسمينة", color = Paper, style = MaterialTheme.typography.titleLarge)
        SailingShip(profile)
        if (profile == null) {
            PaperCard(Modifier.fillMaxWidth()) {
                Text("رحلتك تبدأ من هنا", style = MaterialTheme.typography.headlineSmall)
                Text("جزر مليئة بالحكايات والمعرفة، وهُدهُد معك في كل خطوة.")
                GoldButton("اختر بطلك", onClick = { vm.navigate(Screen.Profiles) })
            }
        } else {
            PaperCard(Modifier.fillMaxWidth()) {
                Text("أهلاً ${profile.name}", style = MaterialTheme.typography.headlineSmall)
                Text("${profile.totalStars} نجوم  •  ${profile.pearls} لآلئ", color = Teal)
                GoldButton("أكمل الرحلة", onClick = { vm.navigate(Screen.Voyages) })
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    TextButton(onClick = { vm.navigate(Screen.Journey) }) { Text("رحلتي") }
                    TextButton(onClick = { vm.navigate(Screen.Profiles) }) { Text("تبديل اللاعب") }
                }
            }
        }
        Text("تعلّم في أي مكان، حتى دون إنترنت", color = Paper, textAlign = TextAlign.Center)
        TextButton(onClick = { vm.navigate(Screen.About) }) { Text("عن الرحلة", color = Color.White) }
    }
}

@Composable
private fun SailingShip(profile: Profile?) {
    val shipModifier = Modifier.fillMaxWidth().height(230.dp)
    if (profile?.preferences?.calm == true) StyledShip(profile, shipModifier)
    else {
        val transition = rememberInfiniteTransition(label = "sailing")
        val angle by transition.animateFloat(-1.2f, 1.2f, infiniteRepeatable(tween(2400, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "boat")
        StyledShip(profile, shipModifier.graphicsLayer { rotationZ = angle })
    }
}

@Composable
private fun Profiles(state: AppUiState, vm: GameViewModel) {
    var selected by rememberSaveable { mutableStateOf(Hero.Sindbad) }
    var name by rememberSaveable { mutableStateOf("") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        for (profile in state.store.profiles) {
            Surface(onClick = { vm.switchProfile(profile.id) }, enabled = !state.busy,
                color = Paper, shape = RoundedCornerShape(18.dp)) {
                Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    SharedArt("cosmetics/${profile.hero.asset}/${profile.variant("outfit")}", null, Modifier.size(65.dp))
                    Column(Modifier.weight(1f)) { Text(profile.name, style = MaterialTheme.typography.titleLarge); Text("${profile.totalStars} نجوم") }
                    Text(if (profile.id == state.store.activeId) "الحالي" else "العب", color = Teal)
                }
            }
        }
        PaperCard {
            Text("مغامر جديد", style = MaterialTheme.typography.headlineSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Hero.entries.forEach { hero ->
                    Surface(onClick = { selected = hero }, modifier = Modifier.weight(1f).semantics { this.selected = selected == hero },
                        color = if (selected == hero) Sand.copy(alpha = .5f) else Color.White,
                        border = BorderStroke(if (selected == hero) 3.dp else 1.dp, if (selected == hero) Teal else Sand),
                        shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            SharedArt("heroes/${hero.asset}", hero.arabic, Modifier.height(175.dp).fillMaxWidth())
                            Text(hero.arabic, style = MaterialTheme.typography.titleLarge)
                        }
                    }
                }
            }
            OutlinedTextField(name, { name = it.take(20) }, Modifier.fillMaxWidth(), singleLine = true,
                label = { Text("لقبك في الرحلة (اختياري)") }, supportingText = { Text("يبقى على هذا الجهاز فقط") })
            GoldButton("لنبحر مع ${selected.arabic}", !state.busy) { vm.createProfile(selected, name) }
        }
    }
}

@Composable
private fun Voyages(open: () -> Unit) {
    val stages = listOf("الطفل المستكشف", "البحّار الصغير", "الربّان اليافع", "قائد الأسطول")
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item { Text("اثنتا عشرة رحلة من المعرفة", color = Color.White, style = MaterialTheme.typography.headlineSmall) }
        items(stages.indices.toList()) { index ->
            PaperCard(Modifier.fillMaxWidth()) {
                Text(stages[index], style = MaterialTheme.typography.titleLarge)
                (index * 3 + 1..index * 3 + 3).forEach { grade ->
                    if (grade == 6) GoldButton("الرحلة السادسة  •  الصف السادس", onClick = open)
                    else Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الرحلة $grade", color = Ink.copy(alpha = .65f))
                        Text("قريباً", color = Ink.copy(alpha = .5f))
                    }
                }
            }
        }
    }
}

@Composable
private fun SeaMap(profile: Profile, openIsland: (String) -> Unit) {
    var selected by remember { mutableStateOf<Island?>(null) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                StyledShip(profile, Modifier.size(120.dp))
                Column {
                    Text("من ميناء أرواد…", color = Color.White, style = MaterialTheme.typography.headlineSmall)
                    Text("اختر جزيرتك وابدأ الاكتشاف", color = Paper)
                }
            }
        }
        items(islands.chunked(2)) { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { island ->
                    Surface(onClick = { if (island.nativeReady && island.unlocked(profile)) openIsland(island.id) else selected = island },
                        modifier = Modifier.weight(1f), color = Paper, shape = RoundedCornerShape(24.dp)) {
                        Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            SharedArt("islands/${island.art}", null, Modifier.fillMaxWidth().height(110.dp))
                            Text(island.name, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
                            Text(when {
                                !island.nativeReady -> "قريباً"
                                island.unlocked(profile) -> "${profile.starsIn(island.id)} / ${if (island.id == "treasure") 3 else Topics.inRegion(island.id).size * 3} نجوم"
                                else -> "تحت الضباب"
                            }, style = MaterialTheme.typography.bodySmall, color = Teal)
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
    selected?.let { island ->
        AlertDialog(onDismissRequest = { selected = null },
            title = { Text(island.name) },
            text = { Column {
                SharedArt("islands/${island.art}", null, Modifier.fillMaxWidth().height(160.dp))
                Text(if (!island.nativeReady) "تنتظرك مغامرات ${island.subject} هنا قريباً."
                    else "اجمع نجمتين في ${islands.first { it.id == island.requires }.name} لتفتح هذه الجزيرة. لا تُفتح الجزر باللآلئ.")
            } },
            confirmButton = { TextButton(onClick = { selected = null }) { Text("حسناً") } })
    }
}

@Composable
private fun SubjectIsland(region: String, profile: Profile, open: (String) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                SharedArt("islands/${if (region == "math") "numbers" else "letters"}", null, Modifier.height(150.dp))
                Text(if (region == "math") "أبحر بالأرقام، وجّه السفينة، وأدِر الناعورة" else "كل جملة شيفرة… وأنت مَن يفكّها", color = Color.White, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
            }
        }
        item { PaperCard(Modifier.fillMaxWidth()) {
            val ready = Topics.guardianReady(profile, region)
            SharedArt("guardians/$region/${if (region in profile.guardians) "happy" else "ok"}", null, Modifier.height(90.dp).fillMaxWidth())
            Text(if (ready) "الحارس يتحدّاك!" else "اجمع نجمة في كل درس قبل تحدّي الحارس")
            GoldButton("تحدّي الحارس", ready) { open("guardian-$region") }
        } }
        items(Topics.inRegion(region), key = { it.id }) { topic ->
            Surface(onClick = { open(topic.id) }, color = Paper, shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(topic.title, style = MaterialTheme.typography.titleLarge)
                    Text(topic.blurb, style = MaterialTheme.typography.bodyMedium)
                    Stars(profile.topics[topic.id]?.stars ?: 0)
                }
            }
        }
    }
}

@Composable
internal fun Stars(count: Int, modifier: Modifier = Modifier) {
    Text("★".repeat(count) + "☆".repeat(3 - count), modifier.semantics { contentDescription = "$count من 3 نجوم" },
        color = Color(0xFFAE7308), fontSize = 28.sp)
}

@Composable
private fun Lesson(session: LessonSession, state: AppUiState, vm: GameViewModel) {
    val topic = remember(session.topicId, session.seed) { Topics.get(session.topicId, session.seed) }
    val saved = state.store.profiles.find { it.id == session.profileId }?.completedSessions?.contains(session.id) == true
    val scroll = rememberScrollState()
    LaunchedEffect(session.phase, session.index, session.cardIndex) { scroll.scrollTo(0) }
    Column(Modifier.fillMaxSize().verticalScroll(scroll).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(topic.title, color = Color.White, style = MaterialTheme.typography.headlineSmall)
        when (session.phase) {
            Phase.Learn -> {
                val card = topic.cards[session.cardIndex]
                Text("أتعلّم  •  ${session.cardIndex + 1} / ${topic.cards.size}", color = Paper)
                PaperCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SharedArt("cosmetics/hudhud/${state.store.active?.variant("hat") ?: "original"}", "هُدهُد", Modifier.size(80.dp))
                        Text(card.title, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                    }
                    Text(card.text, style = MaterialTheme.typography.bodyLarge)
                    card.art.forEach { id -> SharedArt(id, card.title, Modifier.fillMaxWidth().height(150.dp)) }
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        card.example.forEachIndexed { i, example ->
                            Surface(color = listOf(Rose, Teal, Color(0xFF8360A5))[i % 3].copy(alpha = .12f), shape = RoundedCornerShape(12.dp)) {
                                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(example, style = MaterialTheme.typography.titleLarge)
                                    card.labels.getOrNull(i)?.let { Text(it, color = Teal, style = MaterialTheme.typography.bodySmall) }
                                }
                            }
                        }
                    }
                    GoldButton(if (session.cardIndex == topic.cards.lastIndex) "فهمت، لنجرّب!" else "التالي", onClick = vm::nextCard)
                    if (session.cardIndex > 0) TextButton(onClick = vm::previousCard) { Text("السابق") }
                    if (session.reviewing) TextButton(onClick = vm::returnToQuestion) { Text("العودة إلى السؤال") }
                }
            }
            Phase.Question -> QuestionPanel(session, topic, vm)
            Phase.Result -> {
                PaperCard(Modifier.fillMaxWidth()) {
                    StyledShip(state.store.active, Modifier.fillMaxWidth().height(150.dp))
                    if (session.guardian) {
                        SharedArt("guardians/${session.topicId.removePrefix("guardian-")}/${if (session.guardianHealth == 0) "happy" else "ok"}", null, Modifier.height(130.dp).fillMaxWidth())
                        Text(if (session.guardianHealth == 0) "أحسنت! كسبت صداقة الحارس" else "راجع دروسك ثم عُد للتحدّي")
                    }
                    if (!session.guardian) Text(if (session.correct.toFloat() / session.questionIds.size >= .7f) "أحسنت يا مغامر!" else "كل محاولة تعلّمك شيئاً", style = MaterialTheme.typography.headlineSmall)
                    if (!session.guardian) Stars(starsFor(session.correct, session.questionIds.size))
                    Text("${session.correct} إجابات صحيحة من المحاولة الأولى")
                    Text(if (saved) "حُفظ تقدّمك على هذا الجهاز" else "جارٍ حفظ التقدّم…", color = Teal)
                    GoldButton("العودة إلى الجزيرة", saved && !state.busy, vm::back)
                    if (!saved && !state.busy) TextButton(onClick = vm::saveResult) { Text("إعادة الحفظ") }
                }
            }
        }
    }
}

@Composable
private fun QuestionPanel(session: LessonSession, topic: Topic, vm: GameViewModel) {
    val question = session.currentQuestion(topic)
    var hint by rememberSaveable(session.id, session.index) { mutableStateOf(false) }
    Text("السؤال ${session.index + 1} من ${session.questionIds.size}", color = Paper)
    LinearProgressIndicator(progress = { session.index.toFloat() / session.questionIds.size }, modifier = Modifier.fillMaxWidth(),
        color = Gold, trackColor = Color.White.copy(alpha = .2f))
    PaperCard(Modifier.fillMaxWidth()) {
        if (session.guardian) {
            val region = session.topicId.removePrefix("guardian-")
            SharedArt("guardians/$region/${if (session.guardianHealth == 0) "happy" else if (session.lastCorrect == true) "hit" else "ok"}", null, Modifier.fillMaxWidth().height(100.dp))
            Text("قوة الحارس: ${session.guardianHealth}  •  القلوب: ${session.hearts} / 3",
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        }
        Text(question.prompt, style = MaterialTheme.typography.titleLarge.copy(textDirection = TextDirection.ContentOrLtr))
        question.art.forEach { id -> SharedArt(id, "رسم السؤال: ${question.prompt}", Modifier.fillMaxWidth().height(150.dp)) }
        if (question.stimulus.isNotEmpty()) {
            Text(question.stimulus, Modifier.fillMaxWidth().padding(vertical = 14.dp), style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
        }
        if (topic.kind == ActivityKind.Build) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                question.slots.forEachIndexed { slot, label ->
                    val chosen = session.selection.getOrNull(slot)
                    OutlinedButton(onClick = { chosen?.let(vm::choose) }, enabled = chosen != null && !session.resolved,
                        modifier = Modifier.heightIn(min = 60.dp), shape = RoundedCornerShape(12.dp)) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(chosen?.let { question.choices[it] } ?: "…", style = MaterialTheme.typography.titleMedium)
                            Text(label, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            HorizontalDivider(color = Sand)
        }
        if (question.number != null) {
            MathControl(session, topic, vm)
        } else if (topic.kind == ActivityKind.Word || topic.kind == ActivityKind.Build) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                session.choiceOrder(topic).forEach { i ->
                    AnswerChip(question.choices[i], session, question, i, topic.kind == ActivityKind.Build && i in session.selection) { vm.choose(i) }
                }
            }
        } else {
            session.choiceOrder(topic).forEach { i ->
                AnswerChip(question.choices[i], session, question, i, false, Modifier.fillMaxWidth()) { vm.choose(i) }
            }
        }
        if (topic.kind == ActivityKind.Build && !session.resolved) GoldButton("تحقّق", session.selection.size == question.answer.size, vm::submit)
        if (session.lastCorrect != null) {
            val explanation = if (session.resolved) question.explanation else "ليس تماماً… ${question.hint}"
            Text(explanation, Modifier.semantics { liveRegion = LiveRegionMode.Polite }, color = if (session.lastCorrect == true) Correct else Ink)
            if (session.resolved) {
                Text("${if (question.number?.acceptable != null) "مثال صحيح" else "الإجابة"}: ${question.answerText()}", fontWeight = FontWeight.Bold)
                GoldButton(if (session.index == session.questionIds.lastIndex || (session.guardian && (session.guardianHealth == 0 || session.hearts == 0))) "نتيجة الرحلة" else "السؤال التالي", onClick = vm::nextQuestion)
            }
        }
        if (hint && !session.resolved) Text(question.hint, color = Teal, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        FlowRow {
            TextButton(onClick = { hint = !hint }) { Text(if (hint) "إخفاء التلميح" else "تلميح من هُدهُد") }
            TextButton(onClick = vm::review) { Text("أراجع الشرح") }
        }
    }
}

@Composable
private fun AnswerChip(text: String, session: LessonSession, question: Question, index: Int, inTraySelection: Boolean,
    modifier: Modifier = Modifier, onClick: () -> Unit) {
    val isAnswer = session.resolved && index in question.answer
    OutlinedButton(onClick, modifier.heightIn(min = 52.dp), enabled = !session.resolved && !inTraySelection,
        border = BorderStroke(if (isAnswer) 2.dp else 1.dp, if (isAnswer) Correct else Sand),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink, containerColor = Color.White,
            disabledContainerColor = if (isAnswer) Correct.copy(alpha = .12f) else Paper,
            disabledContentColor = if (isAnswer) Correct else Ink.copy(alpha = .5f))) {
        Text(text, style = MaterialTheme.typography.titleMedium.copy(textDirection = TextDirection.ContentOrLtr), textAlign = TextAlign.Center)
    }
}

@Composable
private fun Journey(profile: Profile, vm: GameViewModel) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { PaperCard(Modifier.fillMaxWidth()) {
            Text("${profile.name}  •  ${profile.totalStars} نجوم", style = MaterialTheme.typography.headlineSmall)
            Text("${profile.pearls} لآلئ من اكتشافاتك")
            Text("تحصل على 5 لآلئ لكل نجمة جديدة. أفضل نتيجة لك تبقى محفوظة.")
        } }
        item { PaperCard(Modifier.fillMaxWidth()) {
            GoldButton("أراجع ما تعلّمت") { vm.navigate(Screen.Review) }
            GoldButton("سوق الميناء") { vm.navigate(Screen.Shop) }
            if (profile.certificateEarned) GoldButton("شهادتي") { vm.navigate(Screen.Certificate) }
        } }
        items(Topics.all) { topic -> PaperCard(Modifier.fillMaxWidth()) {
            Text(topic.title, style = MaterialTheme.typography.titleMedium)
            val record = profile.topics[topic.id]
            Stars(record?.stars ?: 0)
            Text(if (record == null) "رحلة تنتظرك" else "المحاولات: ${record.plays}  •  أفضل نتيجة: ${(record.best * 100).toInt()}%")
        } }
    }
}

@Composable
private fun Settings(prefs: Preferences, busy: Boolean, change: (Preferences) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        PaperCard(Modifier.fillMaxWidth()) {
            Text("رحلة تناسبك", style = MaterialTheme.typography.headlineSmall)
            Toggle("أصوات الإجابات", prefs.sound, !busy) { change(prefs.copy(sound = it)) }
            Toggle("الاهتزاز", prefs.haptics, !busy) { change(prefs.copy(haptics = it)) }
            Toggle("حركة هادئة", prefs.calm, !busy) { change(prefs.copy(calm = it)) }
            Toggle("خط أكبر", prefs.largeText, !busy) { change(prefs.copy(largeText = it)) }
            Text("إعدادات هذا المغامر محفوظة على الجهاز. لا إعلانات ولا مشتريات.", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun Toggle(label: String, value: Boolean, enabled: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f))
        Switch(value, onChange, enabled = enabled, modifier = Modifier.semantics { contentDescription = label })
    }
}

@Composable
private fun About() {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp)) {
        PaperCard {
            Text("رحلات سندباد وياسمينة", style = MaterialTheme.typography.headlineSmall)
            Text("مغامرة تعليمية مجانية مستوحاة من المنهاج السوري. تعمل دون إنترنت، ويحفظ هذا الجهاز تقدّم كل مغامر.")
            Text("المحتوى التعليمي مسوّدة بانتظار مراجعة معلّمين سوريين.")
            Text("الإصدار التجريبي 0.2: الحروف والأرقام والمراجعة وسوق الميناء. تفتح جزيرة الكنز بعد الأطلس؛ الجزر الأخرى قيد الإعداد.")
            Text("الرسوم والمحتوى: مشروع shibl/sindibad — CC-BY-SA وفق ترخيص المشروع.\nخط Baloo Bhaijaan 2: SIL Open Font License.\nالبرمجة: Kotlin وJetpack Compose.", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun Feedback(session: LessonSession?, prefs: Preferences) {
    val haptic = LocalHapticFeedback.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var tone by remember { mutableStateOf<ToneGenerator?>(null) }
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) { tone?.release(); tone = null }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); tone?.release(); tone = null }
    }
    // Only feedback for answers submitted during this composition, not restoration.
    var previous by remember { mutableStateOf(session?.let { "${it.id}:${it.index}:${it.attempts}" }) }
    LaunchedEffect(session?.id, session?.index, session?.attempts) {
        val key = session?.let { "${it.id}:${it.index}:${it.attempts}" }
        if (previous != key && session != null && session.attempts > 0 && lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
            if (prefs.haptics) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            if (prefs.sound) {
                if (tone == null) tone = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 25) }.getOrNull()
                tone?.startTone(if (session.lastCorrect == true) ToneGenerator.TONE_PROP_ACK else ToneGenerator.TONE_PROP_NACK, 120)
            }
        }
        previous = key
    }
}
