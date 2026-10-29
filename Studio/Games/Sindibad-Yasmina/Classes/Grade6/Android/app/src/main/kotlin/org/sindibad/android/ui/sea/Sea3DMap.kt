package org.sindibad.android.ui.sea

import android.view.TextureView
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.sindibad.android.content.Topics
import org.sindibad.android.domain.Island
import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.islands
import org.sindibad.android.ui.Paper
import org.sindibad.android.ui.Teal
import kotlin.math.roundToInt

/**
 * The sea map in 3D: the shared island models on the water, the ship at the
 * port of Arwad, clouds over the islands still to discover. Island names are
 * ordinary text on top, placed with [SeaLayout]'s projection, and a tap on an
 * island or its name opens it. [onFailed] is called if this phone cannot draw
 * in 3D; the flat map takes over.
 */
@Composable
fun Sea3DMap(profile: Profile, calm: Boolean, onIsland: (Island) -> Unit, onFailed: () -> Unit, modifier: Modifier = Modifier) {
    var frame by remember { mutableStateOf<SeaLayout.Frame?>(null) }
    var renderer by remember { mutableStateOf<SeaRenderer?>(null) }
    val fogged = islands.filter { !it.unlocked(profile) }.map { it.id }.toSet()
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    Box(modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                TextureView(ctx).also { view ->
                    try {
                        renderer = SeaRenderer(ctx, view, mapOf("home" to "port") + islands.associate { it.id to it.art }, fogged, calm,
                            onLayout = { frame = it }, onError = { onFailed() })
                    } catch (t: Throwable) {
                        // No OpenGL ES 3 or no room for it: the flat map instead.
                        onFailed()
                    }
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        frame?.let { fr ->
            // Taps on an island itself.
            Box(Modifier.fillMaxSize().pointerInput(fr) {
                detectTapGestures { at ->
                    val id = SeaLayout.hit(fr, at.x.toDouble(), at.y.toDouble())
                    islands.firstOrNull { it.id == id }?.let(onIsland)
                }
            })
            Label(fr, "home", "ميناء أرواد", null) {}
            for (island in islands) {
                val status = when {
                    !island.unlocked(profile) -> "تحت الضباب"
                    !island.nativeReady -> "قريباً"
                    else -> "${profile.starsIn(island.id)} / ${if (island.id == "treasure") 3 else Topics.inRegion(island.id).size * 3} ★"
                }
                Label(fr, island.id, island.name, status) { onIsland(island) }
            }
        }
    }

    DisposableEffect(lifecycle, renderer) {
        val r = renderer
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> r?.resume()
                Lifecycle.Event.ON_PAUSE -> r?.pause()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) r?.resume()
        onDispose {
            lifecycle.removeObserver(observer)
            r?.destroy()
        }
    }
}

/** An island's name (and its stars), centred just below the island. */
@Composable
private fun Label(frame: SeaLayout.Frame, id: String, name: String, status: String?, onClick: () -> Unit) {
    val p = frame.islands.getValue(id)
    val at = frame.project(SeaLayout.V3(p.x, 0.0, p.z + SeaLayout.RR * 0.8))
    if (!at.ahead) return
    Surface(
        onClick = onClick,
        color = Paper,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = 2.dp,
        modifier = Modifier.layout { measurable, constraints ->
            val placeable = measurable.measure(constraints.copy(minWidth = 0, minHeight = 0))
            layout(constraints.maxWidth, constraints.maxHeight) {
                placeable.place((at.x - placeable.width / 2.0).roundToInt(), (at.y - placeable.height / 2.0).roundToInt())
            }
        },
    ) {
        Column(Modifier.padding(horizontal = 10.dp, vertical = 3.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(name, style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center)
            if (status != null) Text(status, style = MaterialTheme.typography.labelSmall, color = Teal)
        }
    }
}
