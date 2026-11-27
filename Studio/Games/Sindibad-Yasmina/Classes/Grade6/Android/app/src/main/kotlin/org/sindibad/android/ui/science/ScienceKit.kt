@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui.science

import android.graphics.Typeface
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.AbsoluteAlignment
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import androidx.core.content.res.ResourcesCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.sindibad.android.R
import org.sindibad.android.audio.Hit
import org.sindibad.android.audio.MusicEngine
import org.sindibad.android.audio.Score
import org.sindibad.android.audio.Synth
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.Gold
import org.sindibad.android.ui.Sand
import org.sindibad.android.ui.quest.AnswerButton
import org.sindibad.android.ui.quest.QuestActions
import org.sindibad.android.ui.quest.QuestKit

// The science island's part of the quest player (web: core/lab/games.ts): its steps are the shared kinds, so
// the island only brings its pictures — drawn natively (ScienceViews), with a touch target per part read by
// TalkBack — the experiments they play, and its words on the result card.

/** The words a found part shows on the picture (the web's lab(): its label, or a short title). */
fun spotLabel(s: Spot): String? = s.label ?: s.title.takeIf { it.length <= 16 }

/** The parts of a picture a step can tap: drawn by the picture and with a touch box or a pill. */
fun drawnParts(book: QuestBook, view: String?, ids: Collection<String>): Set<String> =
    book.view(view)?.spots?.filter { it.hit != null || it.pill != null }?.map { it.id }?.toSet().orEmpty() intersect ids.toSet()

class ScienceKit(private val engine: MusicEngine, private val book: QuestBook, private val scope: CoroutineScope, private val calm: Boolean) : QuestKit {
    private fun perform(build: () -> Score) { scope.launch { engine.play(withContext(Dispatchers.Default) { build() }) } }

    @Composable override fun game(step: Step, state: StepState, act: QuestActions) = false
    override fun pictureSpots(step: Explore) = if (ScienceViews.has(step.view)) drawnParts(book, step.view, step.spots.map { it.id }) else emptySet()
    /** A soft «pop» when a part opens. */
    override fun onSpot(step: Explore, spot: Spot) = perform { Score(listOf(Hit(0.0, Synth.piano("G5", .25, .07))), emptyList(), .3) }
    override fun hasArt(name: String) = false
    @Composable override fun Art(name: String, modifier: Modifier) {}
    @Composable override fun Show(name: String) = QuestionPicture(name)
    override fun play(sound: Sound) {}
    override fun stepOpened(step: Step) {}
    override fun silence() = engine.stop()
    override fun feedback(good: Boolean, finished: Boolean) = perform {
        when {
            !good -> Score(listOf(Hit(0.0, Synth.piano("C3", .35, .14))), emptyList(), .4)
            finished -> Score(listOf("C5", "E5", "G5").mapIndexed { i, n -> Hit(i * .09, Synth.piano(n, .5, .12)) }, emptyList(), .8)
            else -> Score.EMPTY
        }
    }
    override val bookName get() = "العلوم"
    override val gainChip get() = "💎 بلّورة في المنارة"
    override val allDoneNext get() = "🎉 أضأت المنارة كلها!"

    @Composable override fun Picture(step: Explore, state: StepState, glow: Set<String>, act: QuestActions) {
        val name = step.view ?: return
        if (!ScienceViews.has(name)) return
        val drawn = pictureSpots(step)
        val spots = step.spots.filter { it.id in drawn }
        SciencePicture(
            name, book.view(name), key = step, found = state.found.toSet(), latest = state.open, calm = calm,
            description = step.title,
            labels = spots.filter { it.id in state.found }.mapNotNull { s -> spotLabel(s)?.let { s.id to it } }.toMap(),
            targets = spots.map { s ->
                PartTarget(s.id, s.name + if (s.id in state.found) "، اكتُشف" else "", glow = s.id in glow,
                    enabled = !step.guided || s.id in glow || s.id in state.found, done = s.id in state.found)
            },
            onTap = act.tap,
        )
    }

    /** A `label` step: only the asked parts can be tapped; each one named shows its name. */
    @Composable override fun labelPicture(step: LabelStep, state: StepState, act: QuestActions): Boolean {
        if (!ScienceViews.has(step.view)) return false
        val drawn = drawnParts(book, step.view, step.ask.map { it.id })
        val want = StepMachine.expected(step, state)
        // TalkBack reads the parts by number, not by name: their names are the answers.
        val asks = step.ask.filter { it.id in drawn }.sortedBy { a -> book.view(step.view)?.spots?.indexOfFirst { it.id == a.id } }
        SciencePicture(
            step.view, book.view(step.view), key = step, found = state.found.toSet(), latest = null, calm = true,
            description = step.q.replace("**", ""),
            labels = step.ask.filter { it.id in state.found }.associate { it.id to it.name },
            targets = asks.mapIndexed { i, a ->
                val done = a.id in state.found
                PartTarget(a.id, if (done) a.name else "جزء من الصورة ${i + 1}", glow = state.reveal && a.id == want, enabled = !state.done && !done, done = done)
            },
            onTap = act.tap,
        )
        return true
    }

    @Composable override fun QuestionPicture(name: String) {
        if (!ScienceViews.has(name)) return
        SciencePicture(name, book.view(name), key = name, found = emptySet(), latest = null, calm = true, description = "صورة السؤال", labels = emptyMap(), targets = emptyList(), onTap = {})
    }
}

/** A tappable part laid over a picture. */
data class PartTarget(val id: String, val description: String, val glow: Boolean, val enabled: Boolean, val done: Boolean)

/** Where a part's touch box sits, in picture units (clamped into the picture). */
fun partBox(part: PicturePart): FloatArray? {
    val h = part.hit ?: return null
    val x = h[0].toFloat().coerceAtLeast(0f); val y = h[1].toFloat().coerceAtLeast(0f)
    val r = (h[0] + h[2]).toFloat().coerceAtMost(320f); val b = (h[1] + h[3]).toFloat().coerceAtMost(200f)
    return floatArrayOf(x, y, r - x, b - y)
}

/**
 * A science picture with its experiment: the parts found play their change once (at once in calm mode); taps go
 * to touch targets of at least 48 dp over each part (found parts and big parts lie under the small ones).
 */
@Composable
fun SciencePicture(
    name: String, parts: PictureParts?, key: Any, found: Set<String>, latest: String?, calm: Boolean, description: String,
    labels: Map<String, String>, targets: List<PartTarget>, onTap: (String) -> Unit,
) {
    val view = ScienceViews[name] ?: return
    val context = LocalContext.current
    val font = remember { runCatching { ResourcesCompat.getFont(context, R.font.baloo_arabic_800) }.getOrNull() ?: Typeface.DEFAULT_BOLD }
    // Each part's experiment, 0..1: the parts found before the picture appeared (a restored step) are done.
    val initial = remember(key) { found }
    val progress = remember(key) { mutableStateMapOf<String, Float>() }
    val animScope = rememberCoroutineScope()
    LaunchedEffect(key, found) {
        for (id in found) if (id !in initial && id !in progress) {
            if (calm) progress[id] = 1f
            else { progress[id] = 0f; animScope.launch { animate(0f, 1f, animationSpec = tween(view.duration(id), easing = LinearEasing)) { v, _ -> progress[id] = v } } }
        }
    }
    // The part opened last: its change plays from the start each time it changes.
    var shown by remember(key) { mutableStateOf(latest) }
    var previous by remember(key) { mutableStateOf<String?>(null) }
    val fresh = remember(key) { Animatable(1f) }
    LaunchedEffect(key, latest) {
        if (latest == shown) return@LaunchedEffect
        previous = shown; shown = latest
        if (calm || latest == null) fresh.snapTo(1f) else { fresh.snapTo(0f); fresh.animateTo(1f, tween(view.duration(latest), easing = LinearEasing)) }
    }
    val time: State<Float>? = if (view.loops && !calm) rememberInfiniteTransition(label = "loop")
        .animateFloat(0f, 3600f, infiniteRepeatable(tween(3_600_000, easing = LinearEasing)), label = "time") else null
    val glowing = targets.filter { it.glow }.map { it.id }.toSet()
    val boxes = parts?.spots.orEmpty().mapNotNull { p -> partBox(p)?.let { p.id to it } }.toMap()
    val pills = parts?.spots.orEmpty().filter { it.pill != null }

    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val w = maxWidth
        val k = w / 320f
        Box(Modifier.size(w, k * 200f).clip(RoundedCornerShape(16.dp)).border(1.dp, Sand, RoundedCornerShape(16.dp))) {
            Canvas(Modifier.matchParentSize().semantics { contentDescription = description }) {
                val stage = Stage(found, latest, fresh.value, time?.value ?: 0f,
                    found.associateWith { progress[it] ?: if (it in initial) 1f else 0f }, previous)
                val pen = Pen(this, font)
                view.draw(pen, stage)
                // The parts that may be tapped now glow gold (the web's lx-glow).
                scale(pen.k, pen.k, Offset.Zero) {
                    for (id in glowing) boxes[id]?.let { b ->
                        drawRoundRect(Gold, Offset(b[0] + 1, b[1] + 1), Size(b[2] - 2, b[3] - 2), CornerRadius(8f), style = Stroke(3f))
                    }
                }
                for ((id, t) in labels) parts?.spots?.firstOrNull { it.id == id }?.label?.let { pen.label(t, it[0], it[1]) }
            }
            // Touch targets: found and big parts first, so the small ones lie on top.
            targets.filter { it.id in boxes }.sortedWith(compareBy<PartTarget>({ !it.done }, { -boxes.getValue(it.id).let { b -> b[2] * b[3] } })).forEach { t ->
                val b = boxes.getValue(t.id)
                val minPx = 48.dp / k
                val bw = maxOf(b[2], minPx); val bh = maxOf(b[3], minPx)
                val x = (b[0] + b[2] / 2 - bw / 2).coerceIn(0f, maxOf(0f, 320f - bw)); val y = (b[1] + b[3] / 2 - bh / 2).coerceIn(0f, maxOf(0f, 200f - bh))
                Box(Modifier.align(AbsoluteAlignment.TopLeft).absoluteOffset(k * x, k * y).size(k * bw, k * bh)
                    .clickable(enabled = t.enabled, role = Role.Button) { onTap(t.id) }
                    .semantics { contentDescription = t.description; if (t.glow) stateDescription = "يلمع ✨" })
            }
        }
    }
    if (pills.isNotEmpty()) FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        pills.forEach { p ->
            val t = targets.firstOrNull { it.id == p.id } ?: return@forEach
            AnswerButton(p.pill.orEmpty(), glow = t.glow, right = t.done, enabled = t.enabled, description = t.description, onClick = { onTap(p.id) })
        }
    }
}
