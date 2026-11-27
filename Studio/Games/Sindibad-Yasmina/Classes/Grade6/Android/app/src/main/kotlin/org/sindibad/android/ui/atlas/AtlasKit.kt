package org.sindibad.android.ui.atlas

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.sindibad.android.audio.Hit
import org.sindibad.android.audio.MusicEngine
import org.sindibad.android.audio.Score
import org.sindibad.android.audio.Synth
import org.sindibad.android.domain.atlas.AtlasMaps
import org.sindibad.android.domain.atlas.AtlasWorld
import org.sindibad.android.domain.atlas.Timelines
import org.sindibad.android.domain.quest.*
import org.sindibad.android.ui.quest.QuestActions
import org.sindibad.android.ui.quest.QuestKit
import org.sindibad.android.ui.science.spotLabel

// The atlas island's part of the quest player (web: core/atlas/games.ts): every step is a shared kind, so the
// island brings only its two pictures — the map (view `map` with an `area`) and the timeline (view `timeline` with
// `events`) — for «أتعلّم», `label` steps and question pictures (`pic: 'map'` with `mark`), and its words on the
// result card.

object AtlasPictures {
    const val MAP = "map"
    const val TIMELINE = "timeline"
    fun has(view: String?) = view == MAP || view == TIMELINE

    /** The spots of an «أتعلّم» step that its picture draws (web: a data-spot in the SVG); the rest become cards. */
    fun drawn(step: Explore): Set<String> = when (step.view) {
        MAP -> {
            val ids = step.spots.map { it.id }
            AtlasMaps.layout(step.area, ids).spots.map { it.id }.toSet() intersect ids.toSet()
        }
        TIMELINE -> step.events.orEmpty().map { it.id }.toSet() intersect step.spots.map { it.id }.toSet()
        else -> emptySet()
    }
    /** The places of a `label` step its map draws. */
    fun drawn(step: LabelStep): Set<String> =
        if (step.view != MAP) emptySet() else AtlasMaps.layout(step.area, step.ask.map { it.id }).spots.map { it.id }.toSet() intersect step.ask.map { it.id }.toSet()
}

class AtlasKit(private val engine: MusicEngine, private val scope: CoroutineScope, private val calm: Boolean) : QuestKit {
    private fun perform(build: () -> Score) { scope.launch { engine.play(withContext(Dispatchers.Default) { build() }) } }

    @Composable override fun game(step: Step, state: StepState, act: QuestActions) = false
    override fun pictureSpots(step: Explore) = AtlasPictures.drawn(step)
    override fun onSpot(step: Explore, spot: Spot) = perform { Score(listOf(Hit(0.0, Synth.piano("G5", .25, .07))), emptyList(), .3) }
    override fun hasArt(name: String) = false
    @Composable override fun Art(name: String, modifier: Modifier) {}
    @Composable override fun Show(name: String) {}
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
    override val bookName get() = "الدراسات الاجتماعية"
    override val gainChip get() = "🧭 شعاع في البوصلة"
    override val allDoneNext get() = "🎉 أضأت بوصلة الرحّالة كلها!"

    @Composable override fun Picture(step: Explore, state: StepState, glow: Set<String>, act: QuestActions) {
        val drawn = AtlasPictures.drawn(step)
        val looks = step.spots.filter { it.id in drawn }.associate { s ->
            val found = s.id in state.found
            s.id to SpotLook(glow = s.id in glow, found = found, latest = s.id == state.open,
                enabled = !step.guided || s.id in glow || found,
                description = s.name + if (found) "، اكتُشف" else "", name = if (found) spotLabel(s) else null)
        }
        when (step.view) {
            AtlasPictures.MAP -> AtlasMapView(AtlasMaps.layout(step.area, step.spots.map { it.id }), looks, calm, step.title.replace("**", ""), onTap = act.tap)
            AtlasPictures.TIMELINE -> TimelineView(Timelines.layout(step.events.orEmpty(), step.spots), looks, calm, step.title.replace("**", ""), act.tap)
        }
    }

    /** A `label` map: every asked place may be tapped; a wrong one is a miss; each one named shows its name. */
    @Composable override fun labelPicture(step: LabelStep, state: StepState, act: QuestActions): Boolean {
        if (step.view != AtlasPictures.MAP) return false
        val want = StepMachine.expected(step, state)
        // TalkBack reads the places by number, not by name: their names are the answers.
        val layout = AtlasMaps.layout(step.area, step.ask.map { it.id })
        val order = layout.spots.map { it.id }
        val looks = step.ask.sortedBy { a -> order.indexOf(a.id) }.mapIndexed { i, a ->
            val done = a.id in state.found
            a.id to SpotLook(glow = state.reveal && a.id == want, found = done, enabled = !state.done && !done,
                description = if (done) a.name else "مكان على الخريطة ${i + 1}", name = if (done) a.name else null)
        }.toMap()
        AtlasMapView(layout, looks, calm, step.q.replace("**", ""), labelStep = true, onTap = act.tap)
        return true
    }

    /** `pic: 'map'`: the map of the question's area with its marked places (nothing to tap). */
    @Composable override fun QuestionPicture(step: Step, name: String) {
        if (name != AtlasPictures.MAP) return
        val c = step as? Choice
        AtlasMapView(AtlasMaps.layout(c?.area, emptyList(), c?.mark.orEmpty()), emptyMap(), calm, "خريطة السؤال", onTap = {})
    }

    companion object {
        /** Loads the world off the main thread before the first picture (globe.json is about 190 kB). */
        fun warm() { AtlasWorld.tables; AtlasWorld.globe }
    }
}
