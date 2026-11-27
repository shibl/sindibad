@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.quest

import android.os.SystemClock
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.sindibad.android.audio.Hit
import org.sindibad.android.audio.MusicEngine
import org.sindibad.android.audio.Score
import org.sindibad.android.audio.Synth
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.*
import kotlin.math.max
import kotlin.math.roundToInt

// The music island's part of the quest player (web: core/tunes/games.ts): the piano, the grand staff, the
// rhythm cards and the drum, the measure, the glasses, and the «أتعلّم» pictures. Every sound also lights
// what plays (keys, glasses, drum lights, beats), so the games stay playable with the sound off.

/** Lights: what is playing now (a note, a glass id, "hit:2", "beat:0"…), driven by a score's cues. */
class Lights(private val scope: CoroutineScope) {
    val on = mutableStateMapOf<String, Int>()
    private val jobs = mutableListOf<Job>()
    fun flash(label: String, seconds: Double = .45, delaySeconds: Double = 0.0) {
        jobs += scope.launch {
            if (delaySeconds > 0) delay((delaySeconds * 1000).toLong())
            on[label] = (on[label] ?: 0) + 1
            delay((seconds * 1000).toLong())
            val n = (on[label] ?: 1) - 1
            if (n <= 0) on.remove(label) else on[label] = n
        }
        jobs.removeAll { it.isCompleted }
    }
    fun cues(score: Score, delaySeconds: Double = 0.0) = score.cues.forEach { flash(it.label, .4, delaySeconds + it.at) }
    fun clear() { jobs.forEach { it.cancel() }; jobs.clear(); on.clear() }
    operator fun contains(label: String) = label in on
}

class MusicKit(private val engine: MusicEngine, private val book: QuestBook, private val scope: CoroutineScope) : QuestKit {
    val lights = Lights(scope)
    /** The «أتعلّم» tempo slider. */
    var tempo by mutableIntStateOf(90)

    fun glassFreq(id: String) = book.glasses.firstOrNull { it.id == id }?.let { Synth.glassFreq(it.n, it.d) } ?: Synth.glassFreq(1, 1)
    private fun tone(s: String): FloatArray = if (book.glasses.any { it.id == s }) Synth.glass(glassFreq(s)) else engine.pianoNote(s)

    /** Builds a score off the main thread, then plays it and lights its cues (the lights also run when muted). */
    fun perform(delaySeconds: Double = 0.0, build: () -> Score) {
        scope.launch {
            val score = withContext(Dispatchers.Default) { build() }
            engine.play(score, delaySeconds)
            lights.cues(score, delaySeconds)
        }
    }
    fun note(n: String, vol: Double? = null) {
        lights.flash(n)
        if (vol == null) engine.playNote(n) else perform { Score(listOf(Hit(0.0, Synth.piano(n, 1.0, vol))), emptyList(), 1.0) }
    }
    fun glass(id: String) { lights.flash(id, .6); perform { Score(listOf(Hit(0.0, Synth.glass(glassFreq(id)))), emptyList(), 2.3) } }
    fun drumHit(kind: String) = perform { Score(listOf(Hit(0.0, Synth.drum(kind))), emptyList(), .4) }

    override fun play(sound: Sound) = perform { Synth.sound(sound, ::glassFreq) }
    override fun silence() { engine.stop(); lights.clear() }
    override fun feedback(good: Boolean, finished: Boolean) = perform {
        when {
            !good -> Score(listOf(Hit(0.0, Synth.piano("C3", .35, .14))), emptyList(), .4)
            finished -> Score(listOf("C5", "E5", "G5").mapIndexed { i, n -> Hit(i * .09, Synth.piano(n, .5, .12)) }, emptyList(), .8)
            else -> Score.EMPTY
        }
    }

    override fun stepOpened(step: Step) {
        when (step) {
            is Choice -> step.listen?.let { s -> perform(.6) { Synth.sound(s, ::glassFreq) } }
            is Learn -> step.play?.let { s -> perform(.6) { Synth.sound(s, ::glassFreq) } }
            is RhythmStep -> perform(.6) { Synth.rhythm(step.pattern, step.bpm ?: 92) }
            is Drum -> perform(.6) { Synth.rhythm(step.pattern, step.bpm) }
            is NameNote -> note(step.note)
            is Pattern -> perform { Synth.phrase(listOf("C4", "D4"), .3) }
            else -> {}
        }
    }

    override fun hasArt(name: String) = hasMusicArt(name)
    @Composable override fun Art(name: String, modifier: Modifier) = MusicArtView(name, modifier)

    @Composable override fun Show(name: String) {
        when (name) {
            "keyboard" -> Piano("C4", "C5", "names", lit = lights.on.keys, onKey = { note(it) })
            "grand" -> StaffCanvas(listOf(PlacedNote(0, 200f, "دو الوسطى")), description = "المدرج الكبير، وعليه دو الوسطى")
            "hymn" -> Hymn(emptySet(), emptySet(), null)
        }
    }

    @Composable override fun OrderChip(step: Order, k: Int) {
        if (!step.fracs) return
        val (n, d) = step.items[k].split('/').map { it.toInt() }.let { it[0] to (it.getOrNull(1) ?: 1) }
        val g = book.glasses.firstOrNull { it.n == n && it.d == d } ?: book.glasses.first()
        GlassView(glassColor(g.color), n.toFloat() / d, Modifier.height(56.dp))
    }
    override fun orderPlaced(step: Order, k: Int, finished: Boolean) {
        val sound = step.sound ?: return
        if (finished) perform { Synth.phrase(sound, .4, ::tone) } else sound.getOrNull(k)?.let { s -> lights.flash(s); perform { Score(listOf(Hit(0.0, tone(s))), emptyList(), 1.0) } }
    }

    // ---------- «أتعلّم» ----------

    override fun pictureSpots(step: Explore): Set<String> {
        val ids = step.spots.map { it.id }.toSet()
        val drawn = when (step.view) {
            "keyboard" -> {
                val kb = step.kb ?: Keyboard()
                val whites = MusicTheory.whitesBetween(kb.from ?: "C4", kb.to ?: "C5")
                whites.toSet() + whites.mapNotNull(MusicTheory::blackAfter) + if (kb.gaps) whites.indices.map { "gap$it" } else emptyList()
            }
            "grand" -> GRAND_PARTS.keys
            "notes" -> ids.filter(MusicTheory::isNote).toSet()
            "keysig" -> setOf("sig", "acc")
            "glasses" -> book.glasses.map { it.id }.toSet()
            "hymn" -> HYMN.map { it.first }.toSet()
            "tempo" -> ids
            "measure" -> setOf("ts", "m1", "m2")
            "ana" -> setOf("first", "mid", "last")
            else -> emptySet()
        }
        return drawn intersect ids
    }

    override fun onSpot(step: Explore, spot: Spot) {
        spot.light?.let { notes -> perform { Synth.phrase(notes, .6) } }
        spot.pair?.let { p ->
            perform { Synth.phrase(p.take(2), .45) }
            p.getOrNull(2)?.let { lights.flash("mark:$it", 1.6) }
        }
        if (spot.light == null && spot.pair == null && step.view == "keyboard" && MusicTheory.isNote(spot.id)) note(spot.id)
        spot.note?.let { note(it) }
        if (spot.glass) glass(spot.id)
        spot.hold?.let { h ->
            val spb = 60.0 / 76; val n = MusicTheory.beatsOfToken(h)
            lights.flash("hold:${spot.id}", n * spb)
            perform {
                val tone = if (h == "ee") Score(listOf(Hit(0.0, Synth.piano("G4", spb)), Hit(spb / 2, Synth.piano("G4", spb))), emptyList(), spb * 1.5)
                    else Score(listOf(Hit(0.0, Synth.piano("G4", n * spb * 1.6))), emptyList(), n * spb * 1.6)
                tone + Synth.metronome(76, n)
            }
        }
        spot.bpm?.let { b -> tempo = b; perform { Synth.metronome(b, max(4, (b / 30.0).roundToInt())) } }
        spot.rhythm?.let { r -> perform { Synth.rhythm(r, 84) } }
        spot.play?.let { play(it) }
    }

    @Composable override fun Picture(step: Explore, state: StepState, glow: Set<String>, act: QuestActions) {
        val label: (String) -> String? = { id -> step.spots.firstOrNull { it.id == id }?.takeIf { id in state.found }?.let { it.label ?: it.title.takeIf { t -> t.length <= 16 } } }
        when (step.view) {
            "keyboard" -> {
                val kb = step.kb ?: Keyboard()
                val spots = step.spots.map { it.id }.toSet()
                Piano(kb.from ?: "C4", kb.to ?: "C5", kb.labels ?: "names", lit = lights.on.keys, glow = glow, found = state.found.toSet(),
                    keyLabel = if (kb.labels == "none") label else null,
                    onKey = { id -> if (id in spots) act.tap(id) else note(id) },
                    gaps = if (kb.gaps) GapRow(marks = { i -> label("gap$i") ?: "" }, glow = glow.mapNotNull { it.removePrefix("gap").toIntOrNull() }.toSet(),
                        found = state.found.mapNotNull { it.removePrefix("gap").toIntOrNull() }.toSet(), onGap = { act.tap("gap$it") }) else null)
            }
            "grand" -> {
                StaffCanvas(emptyList(), description = "المدرج الكبير: اضغط على أجزائه", regions = GRAND_PARTS.filterKeys { k -> step.spots.any { it.id == k } },
                    glow = glow, found = state.found.toSet(), open = state.open, onRegion = { act.tap(it) })
                PartChips(step, state, glow, act)
            }
            "notes" -> {
                val notes = step.spots.filter { MusicTheory.isNote(it.id) }
                val regions = notes.mapIndexed { i, s -> val x = 84f + i * 34; val y = Staff.y(MusicTheory.staffStep(s.id)); s.id to Rect(x - 15, y - 13, x + 15, y + 13) }.toMap()
                StaffCanvas(notes.mapIndexed { i, s -> PlacedNote(MusicTheory.staffStep(s.id), 84f + i * 34, label(s.id), lit = s.id in lights) },
                    description = "نوتات على المدرج الكبير", regions = regions, glow = glow, found = state.found.toSet(), open = state.open, onRegion = { act.tap(it) }, labelsAbove = true)
                PartChips(step, state, glow, act)
            }
            "keysig" -> { KeySignature(glow, state.open, label, act); PartChips(step, state, glow, act) }
            "glasses" -> FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                book.glasses.filter { g -> step.spots.any { it.id == g.id } }.forEach { g ->
                    GlassButton(g, glow = g.id in glow, lit = g.id in lights, label = label(g.id) ?: "", onClick = { act.tap(g.id) })
                }
            }
            "hymn" -> Hymn(glow, state.found.toSet(), label) { act.tap(it) }
            "tempo" -> TempoView(step, glow, act)
            "measure" -> Ltr {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val name: (String) -> String = { id -> step.spots.firstOrNull { it.id == id }?.name ?: id }
                    PicturePart("ts", name("ts"), glow, state, act, Modifier.width(56.dp)) { TimeSignature(4) }
                    PicturePart("m1", name("m1"), glow, state, act, Modifier.weight(1f)) { RhythmView("q q h", Modifier.fillMaxWidth()) }
                    PicturePart("m2", name("m2"), glow, state, act, Modifier.weight(1f)) { RhythmView("ee q q q", Modifier.fillMaxWidth()) }
                }
            }
            "ana" -> Ltr {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(Triple("first", "q", 1f), Triple("mid", "q q q q", 2.4f), Triple("last", "h q", 1.6f)).forEach { (id, p, w) ->
                        PicturePart(id, step.spots.firstOrNull { it.id == id }?.name ?: id, glow, state, act, Modifier.weight(w)) {
                            RhythmView(p, Modifier.fillMaxWidth()); Text(label(id) ?: " ", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
            "portrait" -> step.person?.let { person ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = CircleShape, color = Sand, border = BorderStroke(3.dp, Gold), modifier = Modifier.size(72.dp)) {
                        Box(contentAlignment = Alignment.Center) { Text(person.icon, fontSize = 36.sp) }
                    }
                    Column { Text(person.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium); Text(person.role, style = MaterialTheme.typography.bodyMedium) }
                }
            }
            "art" -> step.art?.let { Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { MusicArtView(it, Modifier.height(120.dp)) } }
        }
    }

    /** A picture's spots as buttons too: big enough to tap, and read by TalkBack (the web's aria-labels). */
    @Composable private fun PartChips(step: Explore, state: StepState, glow: Set<String>, act: QuestActions) {
        val drawn = pictureSpots(step)
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            step.spots.filter { it.id in drawn }.forEach { s ->
                AnswerButton(s.name + if (s.id in state.found) " ✓" else "", glow = s.id in glow, right = s.id in state.found && s.id != state.open,
                    onClick = { act.tap(s.id) })
            }
        }
    }

    @Composable private fun PicturePart(id: String, name: String, glow: Set<String>, state: StepState, act: QuestActions, modifier: Modifier, content: @Composable ColumnScope.() -> Unit) {
        val on = id in glow; val found = id in state.found
        Surface(onClick = { act.tap(id) }, shape = RoundedCornerShape(12.dp),
            border = BorderStroke(if (on) 3.dp else 1.dp, if (on) Gold else if (found) Correct else Sand),
            color = if (on) Gold.copy(alpha = .2f) else if ("hold:$id" in lights) Teal.copy(alpha = .15f) else Color.White,
            modifier = modifier.heightIn(min = 56.dp).semantics { contentDescription = name + if (found) "، اكتُشف" else ""; if (on) stateDescription = "يلمع ✨" }) {
            Column(Modifier.padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center, content = content)
        }
    }

    @Composable private fun TempoView(step: Explore, glow: Set<String>, act: QuestActions) {
        Ltr {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                step.spots.forEach { z ->
                    AnswerButton(z.label ?: z.title, Modifier.weight(1f), glow = z.id in glow, onClick = { act.tap(z.id) }) { Text(z.icon.orEmpty(), fontSize = 22.sp) }
                }
            }
        }
        Ltr {
            Slider(tempo.toFloat(), onValueChange = { tempo = it.roundToInt() }, valueRange = 40f..200f,
                onValueChangeFinished = { step.spots.firstOrNull { z -> tempo in (z.min ?: 0)..(z.max ?: 0) }?.let { act.tap(it.id) } },
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = "السرعة" })
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val beat = lights.on.keys.any { it.startsWith("beat:") }
            Box(Modifier.size(18.dp).background(if (beat) Gold else Sand, CircleShape))
            Text("$tempo نبضة في الدقيقة", style = MaterialTheme.typography.titleMedium)
        }
    }

    @Composable private fun KeySignature(glow: Set<String>, open: String?, label: (String) -> String?, act: QuestActions) {
        val measurer = rememberTextMeasurer()
        fun y(d: Int) = 22f + (10 - d) * 9
        val regions = mapOf("sig" to Rect(54f, y(10) - 16, 82f, y(10) + 14), "acc" to Rect(184f, y(5) - 18, 206f, y(5) + 14))
        Canvas(Modifier.fillMaxWidth().aspectRatio(320f / 132f).semantics { contentDescription = "سطر موسيقي فيه إشارتا تحويل" }
            .pointerInput(Unit) { detectTapGestures { o -> val k = size.width / 320f; regions.entries.firstOrNull { it.value.inflate(6f).contains(o / k) }?.let { act.tap(it.key) } } }) {
            val k = size.width / 320f
            scale(k, k, Offset.Zero) {
                for (d in listOf(2, 4, 6, 8, 10)) drawLine(Ink, Offset(6f, y(d)), Offset(314f, y(d)), 1.4f)
                withTransform({ translate(10f, y(4) - 66 * .83f); scale(.83f, .83f, Offset.Zero) }) { drawPath(Staff.TREBLE, Color(0xFFD23B52), style = Stroke(4.2f)) }
                for ((d, x) in listOf(4 to 112f, 6 to 150f, 5 to 214f, 3 to 252f, 2 to 290f)) rotateOval(x, y(d))
                regions.forEach { (id, r) -> if (id in glow || id == open) glowRect(r, Gold, id in glow) }
                drawText(measurer, "♯", Offset(58f, y(10) - 14), TextStyle(fontSize = 22.sp / k, color = Ink))
                drawText(measurer, "♭", Offset(187f, y(5) - 16), TextStyle(fontSize = 22.sp / k, color = Ink))
                label("sig")?.let { drawText(measurer, it, Offset(40f, 108f), TextStyle(fontSize = 12.sp / k, color = Teal)) }
                label("acc")?.let { drawText(measurer, it, Offset(170f, 108f), TextStyle(fontSize = 12.sp / k, color = Teal)) }
            }
        }
    }

    // ---------- The island's games ----------

    @Composable override fun game(step: Step, state: StepState, act: QuestActions): Boolean {
        when (step) {
            is Keys -> KeysGame(step, state, act)
            is Gaps -> GapsGame(step, state, act)
            is Pattern -> PatternGame(step, state, act)
            is StaffStep -> StaffGame(step, state, act)
            is NameNote -> {
                Ask(step.q)
                StaffCanvas(listOf(PlacedNote(MusicTheory.staffStep(step.note), 200f, lit = step.note in lights)), description = "المدرج الكبير وعليه نوتة")
                OutlinedButton(onClick = { note(step.note) }, Modifier.heightIn(min = 48.dp)) { Text("▶ اسمع") }
                Options(step.options, state, act = QuestActions({ v -> if (v == "0") note(step.note); act.tap(v) }, act.drum, act.undo))
            }
            is RhythmStep -> RhythmGame(step, state, act)
            is Drum -> DrumGame(step, state, act)
            is Measure -> MeasureGame(step, state, act)
            is Fill -> FillGame(step, state, act)
            is GlassesStep -> GlassesGame(step, state, act)
            else -> return false
        }
        return true
    }

    @Composable private fun KeysGame(step: Keys, state: StepState, act: QuestActions) {
        Ask(step.q)
        if (step.play.size > 1) SequenceDots(step.play.size, state.part, null)
        val to = if (step.play.any { Regex("^[DEFGAB]#?5$").matches(it) }) "E5" else "C5"
        val want = StepMachine.expected(step, state)
        Piano("C4", to, step.labels ?: "names", lit = lights.on.keys, glow = if (state.reveal && want != null) setOf(want) else emptySet(),
            onKey = { k -> note(k); act.tap(k) }, enabled = !state.done)
    }

    @Composable private fun GapsGame(step: Gaps, state: StepState, act: QuestActions) {
        Ask(step.q)
        val whites = MusicTheory.whitesBetween("C4", "C5")
        val found = state.found.mapNotNull { it.toIntOrNull() }.toSet()
        Piano("C4", "C5", "names", lit = lights.on.keys, onKey = { note(it) },
            gaps = GapRow(marks = { i -> if (i in found) "∨" else if ("x:$i" in lights) "✗" else "·" },
                glow = if (state.reveal) MusicTheory.HALF_GAPS - found else emptySet(), found = found, enabled = !state.done,
                onGap = { i ->
                    perform { Synth.phrase(listOf(whites[i], whites[i + 1]), .25) }
                    if (i !in MusicTheory.HALF_GAPS) lights.flash("x:$i", .7)
                    act.tap(i.toString())
                }))
    }

    @Composable private fun PatternGame(step: Pattern, state: StepState, act: QuestActions) {
        Ask(step.q)
        val whites = MusicTheory.whitesBetween("C4", "C5")
        val i = state.part.coerceAtMost(6)
        var heard by remember { mutableIntStateOf(state.part) }
        LaunchedEffect(state.part) { if (state.part != heard && !state.done) perform { Synth.phrase(listOf(whites[i], whites[i + 1]), .3) }; heard = state.part }
        LaunchedEffect(state.done) { if (state.done && heard == 6) perform { Synth.phrase(whites, .3) } }
        Piano("C4", "C5", "names", lit = lights.on.keys + if (state.done) emptySet() else setOf(whites[i], whites[i + 1]), onKey = { note(it) },
            gaps = GapRow(marks = { k -> if (k < state.part) (if (MusicTheory.SCALE_STEPS[k] == "w") "⌒" else "∨") else "·" },
                glow = if (state.done) emptySet() else setOf(i), found = (0 until state.part).toSet(), enabled = false, onGap = {}))
        if (!state.done) Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf("w" to "⌒ بُعد", "h" to "∨ نصف بُعد").forEach { (v, t) ->
                AnswerButton(t, Modifier.weight(1f), glow = state.reveal && MusicTheory.SCALE_STEPS[i] == v, onClick = { act.tap(v) })
            }
        }
    }

    @Composable private fun StaffGame(step: StaffStep, state: StepState, act: QuestActions) {
        Ask(step.q)
        val xs = listOf(96f, 136f, 176f, 216f, 256f, 290f)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            step.drops.forEachIndexed { k, d ->
                val now = k == state.part && !state.done
                Surface(color = when { k < state.part -> Correct.copy(alpha = .15f); now -> Gold.copy(alpha = .35f); else -> Color.White }, shape = RoundedCornerShape(10.dp)) {
                    Text("💧 ${d.name}", Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontWeight = if (now) FontWeight.Bold else FontWeight.Normal)
                }
            }
        }
        val placed = step.drops.take(state.part).mapIndexed { k, d -> PlacedNote(MusicTheory.staffStep(d.note), xs[k % xs.size], d.name, lit = d.note in lights) }
        if (state.done) { StaffCanvas(placed, description = "المدرج الكبير وعليه النوتات"); return }
        val drop = step.drops[state.part]
        val target = MusicTheory.staffStep(drop.note)
        var ghost by remember(state.part) { mutableIntStateOf(if (state.part == 0) 6 else MusicTheory.staffStep(step.drops[state.part - 1].note)) }
        val put: (Int) -> Unit = { d ->
            ghost = d
            if (d == target) { note(drop.note); if (state.part == step.drops.lastIndex) perform(.4) { Synth.phrase(step.drops.map { it.note }, .35) } }
            else note(drop.note, .15)
            act.tap(d.toString())
        }
        Text("💧 ${drop.name}", Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.titleLarge, color = Teal)
        StaffCanvas(placed + PlacedNote(ghost, xs[state.part % xs.size], ghost = true), description = "المدرج الكبير: اضغط حيث تقع النوتة",
            reveal = if (state.reveal) target else null, onStep = put)
        // The same, with big buttons (and TalkBack): move the note up or down, then put it.
        Ltr {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                AnswerButton("▼", Modifier.weight(1f), description = "أنزِل النوتة", onClick = { ghost = (ghost - 1).coerceAtLeast(-11) })
                AnswerButton("▲", Modifier.weight(1f), description = "ارفع النوتة", onClick = { ghost = (ghost + 1).coerceAtMost(11) })
                AnswerButton("ضعها ✓", Modifier.weight(2f), description = "ضع النوتة هنا، الموضع ${ghost + 12} من الأسفل", onClick = { put(ghost) })
            }
        }
    }

    @Composable private fun RhythmGame(step: RhythmStep, state: StepState, act: QuestActions) {
        Ask(step.q)
        val bpm = step.bpm ?: 92
        OutlinedButton(onClick = { perform { Synth.rhythm(step.pattern, bpm) } }, Modifier.heightIn(min = 48.dp)) { Text("▶ اسمع الإيقاع") }
        val cards = listOf(step.pattern) + step.others
        val order = StepMachine.permutation(state, cards.size)
        order.forEachIndexed { pos, i ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AnswerButton("", Modifier.weight(1f), glow = state.reveal && i == 0 && !state.done, right = state.done && i == 0, tried = i.toString() in state.wrong,
                    enabled = !state.done, description = "البطاقة ${pos + 1}", onClick = { if (i == 0) perform { Synth.rhythm(step.pattern, bpm) }; act.tap(i.toString()) }) {
                    Ltr { RhythmView(cards[i], Modifier.fillMaxWidth().heightIn(max = 64.dp)) }
                }
                IconTextButton("🔈", "اسمع البطاقة ${pos + 1}") { perform { Synth.rhythm(cards[i], bpm) } }
            }
        }
    }

    @Composable private fun DrumGame(step: Drum, state: StepState, act: QuestActions) {
        Ask(step.q)
        val (hits, _) = MusicTheory.beatsOf(step.pattern)
        val spb = 60.0 / step.bpm
        Ltr { RhythmView(step.pattern, Modifier.fillMaxWidth(.8f)) }
        val taps = remember(state.misses) { mutableStateListOf<Long>() }
        var turn by remember(state.misses) { mutableStateOf(false) }
        // The lights: each hit of the rhythm as it plays; each tap of the child; in guide mode, each hit as it should come.
        Ltr {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally)) {
                hits.indices.forEach { k ->
                    val on = "hit:$k" in lights || "guide:$k" in lights
                    Box(Modifier.size(22.dp).background(when { state.done || k < taps.size -> Correct; on -> Gold; else -> Color.White }, CircleShape).border(2.dp, Ink, CircleShape))
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { perform { Synth.rhythm(step.pattern, step.bpm) } }, Modifier.heightIn(min = 48.dp)) { Text("▶ اسمع") }
            if (!state.done) Button(onClick = { taps.clear(); turn = true }, Modifier.heightIn(min = 48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)) { Text("🥁 دوري!") }
        }
        val hit: (Long) -> Unit = hit@{ at ->
            if (!turn || state.done) return@hit
            if (taps.isNotEmpty() && at - taps.last() < 60) return@hit
            drumHit(if (taps.size % 2 == 1) "tak" else "dum")
            if (taps.isEmpty() && state.guide) hits.forEachIndexed { k, h -> lights.flash("guide:$k", .18, h * spb) }
            taps += at
            if (taps.size >= hits.size) { turn = false; act.drum(taps.toList()) }
        }
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(Modifier.size(150.dp).background(if (turn) Color(0xFFD9894A) else Color(0xFFD9C3A5), CircleShape).border(5.dp, Ink, CircleShape)
                .pointerInput(turn, state.misses) { awaitEachGesture { val down = awaitFirstDown(); hit(down.uptimeMillis) } }
                .semantics { contentDescription = "الطبلة"; if (!turn) disabled(); onClick { hit(SystemClock.uptimeMillis()); true } },
                contentAlignment = Alignment.Center) { Text("دُم", style = MaterialTheme.typography.headlineMedium, color = Ink) }
        }
        if (turn) {
            Text(if (taps.isEmpty()) "اضرب الطبلة متى شئت." else "${taps.size} / ${hits.size}", style = MaterialTheme.typography.bodyLarge)
            if (taps.isNotEmpty()) OutlinedButton(onClick = { turn = false; act.drum(taps.toList()) }, Modifier.heightIn(min = 48.dp)) { Text("✓ انتهيت") }
        }
    }

    @Composable private fun MeasureGame(step: Measure, state: StepState, act: QuestActions) {
        Ask(step.q)
        val all = step.given + state.placed
        val rest = step.beats - StepMachine.measureSum(step, state)
        Ltr {
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min).border(2.dp, Ink, RoundedCornerShape(10.dp)).padding(6.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TimeSignature(step.beats)
                all.forEachIndexed { k, t ->
                    Box(Modifier.weight(MusicTheory.beatsOfToken(t).toFloat()).background(if (k < step.given.size) Sand.copy(alpha = .5f) else Teal.copy(alpha = .15f), RoundedCornerShape(8.dp))) {
                        RhythmView(t, Modifier.fillMaxWidth(), beatW = 26f)
                    }
                }
                repeat(max(0, rest)) { Box(Modifier.weight(1f).height(40.dp).border(1.dp, Sand, RoundedCornerShape(8.dp))) }
            }
        }
        Text(if (rest > 0) "ينقص $rest ${beatWord(rest)}" else "✔", Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.titleMedium)
        val want = StepMachine.expected(step, state)
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), maxItemsInEachRow = 4) {
            MusicTheory.VALUES.forEach { (t, name, b) ->
                AnswerButton(name, Modifier.weight(1f), glow = state.reveal && t == want, enabled = !state.done,
                    description = "$name، ${if (b == 1) "زمن" else "$b ${beatWord(b)}"}", onClick = {
                        if (b <= rest) {
                            drumHit(if (t == "ee") "tak" else "dum")
                            if (b == rest) perform(.3) { Synth.rhythm((all + t).joinToString(" "), 96) }
                        }
                        act.tap(t)
                    }) {
                    Ltr { RhythmView(t, Modifier.height(40.dp), beatW = 22f) }
                    Text(if (b == 1) "زمن" else "$b ${beatWord(b)}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (!state.done) TextButton(onClick = act.undo, Modifier.heightIn(min = 48.dp)) { Text("↺ امسح") }
    }

    @Composable private fun FillGame(step: Fill, state: StepState, act: QuestActions) {
        Ask(step.q)
        val g = book.glasses.first { it.id == step.glass }
        var shown by remember { mutableIntStateOf(0) }
        LaunchedEffect(state.wrongTick) { if (state.wrongTick > 0 && !state.done) { delay(900); shown = 0 } }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
            GlassView(glassColor(g.color), (if (state.done) step.n else shown).toFloat() / step.d, Modifier.height(200.dp), parts = step.d)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                (step.d downTo 1).forEach { k ->
                    AnswerButton("$k / ${step.d}", Modifier.widthIn(min = 96.dp), glow = state.reveal && k == step.n && !state.done, right = state.done && k == step.n,
                        enabled = !state.done, description = "$k من ${step.d}", onClick = {
                            shown = k
                            perform { Score(listOf(Hit(0.0, Synth.glass(MusicTheory.freq("C4") * step.d / k))), emptyList(), 2.3) }
                            act.tap(k.toString())
                        })
                }
            }
        }
        Text("${step.n} / ${step.d}", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
    }

    @Composable private fun GlassesGame(step: GlassesStep, state: StepState, act: QuestActions) {
        Ask(step.q)
        SequenceDots(step.play.size, state.part, step.play.map(::glassLetter))
        val want = StepMachine.expected(step, state)
        Ltr {
            FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                book.glasses.forEach { g ->
                    GlassButton(g, glow = state.reveal && g.id == want, lit = g.id in lights, label = glassLetter(g.id), enabled = !state.done) { glass(g.id); act.tap(g.id) }
                }
            }
        }
    }

    @Composable private fun GlassButton(g: Glass, glow: Boolean, lit: Boolean, label: String, enabled: Boolean = true, onClick: () -> Unit) {
        Surface(onClick = onClick, enabled = enabled, shape = RoundedCornerShape(12.dp), color = if (lit) Gold.copy(alpha = .3f) else Color.White,
            border = BorderStroke(if (glow) 4.dp else 1.dp, if (glow) Gold else Sand),
            modifier = Modifier.width(52.dp).semantics { contentDescription = "كوب ${glassLetter(g.id)}"; if (glow) stateDescription = "يلمع ✨" }) {
            Column(Modifier.padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                GlassView(glassColor(g.color), g.n.toFloat() / g.d, Modifier.height(64.dp))
                Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
            }
        }
    }
}

// ---------- Shared bits ----------

fun glassLetter(id: String) = id.replace("2", "")
fun glassColor(hex: String) = Color(0xFF000000 or hex.removePrefix("#").toLong(16))
private fun beatWord(b: Int) = when (b) { 1 -> "زمن"; 2 -> "زمنان"; else -> "أزمنة" }

@Composable
fun Ltr(content: @Composable () -> Unit) = CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr, content = content)

@Composable
private fun IconTextButton(text: String, description: String, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = CircleShape, color = Sand, modifier = Modifier.size(48.dp).semantics { contentDescription = description }) {
        Box(contentAlignment = Alignment.Center) { Text(text, fontSize = 20.sp) }
    }
}

@Composable
private fun SequenceDots(n: Int, done: Int, labels: List<String>?) {
    Ltr {
        Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "$done من $n" }, horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)) {
            repeat(n) { k ->
                Box(Modifier.size(22.dp).background(if (k < done) Correct else Color.White, CircleShape).border(2.dp, if (k == done) Gold else Ink, CircleShape),
                    contentAlignment = Alignment.Center) { labels?.getOrNull(k)?.let { Text(it, fontSize = 10.sp, color = if (k < done) Color.White else Ink) } }
            }
        }
    }
}

@Composable
private fun TimeSignature(top: Int) {
    Column(Modifier.width(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("$top", fontWeight = FontWeight.Black, fontSize = 20.sp, lineHeight = 20.sp)
        Text("4", fontWeight = FontWeight.Black, fontSize = 20.sp, lineHeight = 20.sp)
    }
}

private val HYMN = listOf(
    "Ut" to listOf("Ut", " queant laxis"), "Re" to listOf("Re", "sonare fibris"), "Mi" to listOf("Mi", "ra gestorum"), "Fa" to listOf("Fa", "muli tuorum"),
    "Sol" to listOf("Sol", "ve polluti"), "La" to listOf("La", "bii reatum"), "Si" to listOf("S", "ancte ", "I", "oannes"))

/** The hymn of St John (web LX_VIEWS.hymn): each line's first syllable became a note's name. */
@Composable
private fun Hymn(glow: Set<String>, found: Set<String>, label: ((String) -> String?)?, tap: ((String) -> Unit)? = null) {
    Ltr {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            HYMN.forEach { (id, parts) ->
                val text = androidx.compose.ui.text.buildAnnotatedString {
                    parts.forEachIndexed { i, p -> if (i % 2 == 0) pushStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Black, color = Rose)); append(p); if (i % 2 == 0) pop() }
                }
                val on = id in glow
                val row: @Composable () -> Unit = {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(text, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                        label?.invoke(id)?.let { Text(it, color = Teal, fontWeight = FontWeight.Bold) }
                    }
                }
                if (tap == null) row() else Surface(onClick = { tap(id) }, shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(if (on) 3.dp else 1.dp, if (on) Gold else if (id in found) Correct else Sand),
                    color = if (on) Gold.copy(alpha = .2f) else Color.White, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { row() }
            }
        }
    }
}

/** A note to draw on the staff. */
data class PlacedNote(val d: Int, val x: Float, val label: String? = null, val lit: Boolean = false, val ghost: Boolean = false)

/**
 * The grand staff, scaled to the width. `onStep`: tapping it gives a step (−11…11) as the web's staff game;
 * `regions` are tappable parts («أتعلّم»); `reveal` glows a row (the answer after a second miss).
 */
@Composable
fun StaffCanvas(
    notes: List<PlacedNote>, description: String, regions: Map<String, Rect> = emptyMap(), glow: Set<String> = emptySet(), found: Set<String> = emptySet(),
    open: String? = null, onRegion: ((String) -> Unit)? = null, reveal: Int? = null, onStep: ((Int) -> Unit)? = null, labelsAbove: Boolean = false,
) {
    val measurer = rememberTextMeasurer()
    var mod = Modifier.fillMaxWidth().widthIn(max = 520.dp).aspectRatio(Staff.W / Staff.H).semantics { contentDescription = description }
    if (onStep != null || onRegion != null) mod = mod.pointerInput(regions, onStep) {
        detectTapGestures { o ->
            val k = size.width / Staff.W
            val p = o / k
            if (onRegion != null) regions.entries.firstOrNull { it.value.inflate(4f).contains(p) }?.let { onRegion(it.key) }
            if (onStep != null && p.x > 50f) onStep(Staff.stepAt(p.y))
        }
    }
    Ltr {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Canvas(mod.background(Color.White, RoundedCornerShape(12.dp))) {
                val k = size.width / Staff.W
                scale(k, k, Offset.Zero) {
                    if (reveal != null) glowRect(Rect(56f, Staff.y(reveal) - Staff.HALF / 2, Staff.W - 8, Staff.y(reveal) + Staff.HALF / 2), Gold, true)
                    grandStaff()
                    regions.forEach { (id, r) -> if (id in glow || id == open) glowRect(r, if (id in glow) Gold else Teal, id in glow) else if (id in found) glowRect(r, Correct.copy(alpha = .5f), false) }
                    for (n in notes) {
                        noteHead(n.d, n.x, if (n.ghost) Ink.copy(alpha = .35f) else if (n.lit) Gold else Ink, hollow = n.ghost)
                        n.label?.let {
                            val y = Staff.y(n.d)
                            drawText(measurer, it, Offset(if (labelsAbove) n.x - 14 else n.x + 14, if (labelsAbove) (if (n.d >= 0) y - 30 else y + 8) else y - 9),
                                TextStyle(fontSize = 11.sp / k, color = Teal, fontWeight = FontWeight.Bold))
                        }
                    }
                }
            }
        }
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.rotateOval(x: Float, y: Float) =
    rotate(-18f, Offset(x, y)) { drawOval(Ink, Offset(x - 8f, y - 5.8f), Size(16f, 11.6f)) }

/** The gaps between white keys (the half steps game, the scale pattern, «أتعلّم» gaps). */
class GapRow(val marks: (Int) -> String, val glow: Set<Int>, val found: Set<Int>, val enabled: Boolean = true, val onGap: (Int) -> Unit)

/**
 * A piano, low → high from left to right like a real one. White keys are at least 48dp wide (the keyboard scrolls
 * sideways on a narrow phone); every key is a button with its name for TalkBack.
 */
@Composable
fun Piano(
    from: String, to: String, labels: String, lit: Set<String>, glow: Set<String> = emptySet(), found: Set<String> = emptySet(),
    keyLabel: ((String) -> String?)? = null, onKey: (String) -> Unit, enabled: Boolean = true, gaps: GapRow? = null,
) {
    val whites = MusicTheory.whitesBetween(from, to)
    val n = whites.size
    Ltr {
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            val keyW: Dp = maxOf(48.dp, maxWidth / n)
            val scroll = rememberScrollState()
            Box(Modifier.fillMaxWidth().horizontalScroll(scroll)) {
                Column {
                    Box(Modifier.width(keyW * n).height(160.dp)) {
                        Row {
                            whites.forEach { w ->
                                val on = w in lit; val g = w in glow
                                val name = MusicTheory.nameOf(w) + if (w == "C4") " الوسطى" else ""
                                Box(Modifier.width(keyW).fillMaxHeight().padding(1.dp)
                                    .background(when { on -> Gold; g -> Color(0xFFFFF1C4); w in found -> Color(0xFFE7F4EC); else -> Color.White }, RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp))
                                    .border(if (g) 4.dp else 1.dp, if (g) Gold else Ink, RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp))
                                    .clickable(enabled = enabled, onClickLabel = "اعزف") { onKey(w) }
                                    .semantics { contentDescription = name; if (g) stateDescription = "يلمع ✨" },
                                    contentAlignment = Alignment.BottomCenter) {
                                    val text = keyLabel?.invoke(w) ?: when (labels) { "names" -> MusicTheory.SOLFEGE[w[0]].orEmpty(); "letters" -> w[0].toString(); else -> "" }
                                    Text(text, Modifier.padding(bottom = 8.dp).clearAndSetSemantics { }, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Ink, textAlign = TextAlign.Center, maxLines = 1)
                                }
                            }
                        }
                        whites.forEachIndexed { i, w ->
                            val b = MusicTheory.blackAfter(w) ?: return@forEachIndexed
                            if (i == n - 1) return@forEachIndexed
                            val on = b in lit; val g = b in glow; val mark = "mark:$b" in lit
                            val bw = keyW * .66f
                            Box(Modifier.offset(x = keyW * (i + 1) - bw / 2).width(bw).height(98.dp)
                                .background(when { on -> Gold; mark -> Rose; g -> Color(0xFF6B5A2A); b in found -> Correct; else -> Ink }, RoundedCornerShape(bottomStart = 6.dp, bottomEnd = 6.dp))
                                .border(if (g) 4.dp else 0.dp, if (g) Gold else Color.Transparent, RoundedCornerShape(bottomStart = 6.dp, bottomEnd = 6.dp))
                                .clickable(enabled = enabled, onClickLabel = "اعزف") { onKey(b) }
                                .semantics { contentDescription = "ملمس أسود بين ${MusicTheory.nameOf(w)} و${MusicTheory.nameOf(whites[i + 1])}"; if (g) stateDescription = "يلمع ✨" },
                                contentAlignment = Alignment.BottomCenter) {
                                keyLabel?.invoke(b)?.let { Text(it, Modifier.padding(bottom = 4.dp), color = Color.White, fontSize = 10.sp, maxLines = 1) }
                            }
                        }
                    }
                    if (gaps != null) Box(Modifier.width(keyW * n).height(52.dp)) {
                        (0 until n - 1).forEach { i ->
                            val g = i in gaps.glow; val done = i in gaps.found
                            Box(Modifier.offset(x = keyW * (i + 1) - keyW / 2).width(keyW).fillMaxHeight().padding(2.dp)
                                .background(when { g -> Gold.copy(alpha = .4f); done -> Correct.copy(alpha = .15f); else -> Color.White.copy(alpha = .8f) }, RoundedCornerShape(10.dp))
                                .border(if (g) 3.dp else 1.dp, if (g) Gold else Sand, RoundedCornerShape(10.dp))
                                .clickable(enabled = gaps.enabled) { gaps.onGap(i) }
                                .semantics { contentDescription = "بين ${MusicTheory.nameOf(whites[i])} و${MusicTheory.nameOf(whites[i + 1])}" + gaps.marks(i).let { if (it.isBlank() || it == "·") "" else "، $it" } },
                                contentAlignment = Alignment.Center) { Text(gaps.marks(i), fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, textAlign = TextAlign.Center) }
                        }
                    }
                }
            }
        }
    }
}
