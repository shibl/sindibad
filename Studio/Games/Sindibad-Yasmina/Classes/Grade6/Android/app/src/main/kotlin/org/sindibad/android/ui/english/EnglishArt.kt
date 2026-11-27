package org.sindibad.android.ui.english

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import org.sindibad.android.ui.science.INK
import org.sindibad.android.ui.science.Pen
import org.sindibad.android.ui.science.SciView
import org.sindibad.android.ui.science.hex
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// The English island's pictures (web: core/english/views.ts), drawn natively with the science island's Pen:
//   art:<name>  small pictures for words with no good emoji (a seahorse, a zip wire, the stage, the planets…)
//   p:<spec>    a drawn person for the Appearance unit ('girl,tall,slim,longhair,curly,blond,blueeyes,glasses')
//   an emoji    shown as it is
// and the three pictures with parts to find (whale, plant, planets) as SciViews, so the shared SciencePicture lays
// a TalkBack-labelled touch target of at least 48 dp over each part.

object EnglishArt {
    /** The art: pictures the app draws. */
    val ART: Set<String> = setOf("seahorse", "zipwire", "circle", "triangle", "rectangle", "curtains", "stage", "soil", "coal") + PLANETS.keys
    private val WHO = listOf("girl", "boy", "woman", "lady", "man", "grandma", "grandpa")

    /** A picture the app can show: a known art name, a person, or an emoji (no letters; web isPicture). */
    fun has(pic: String): Boolean = when {
        pic.startsWith("art:") -> pic.removePrefix("art:") in ART
        pic.startsWith("p:") -> pic.removePrefix("p:").split(',').map { it.trim() }.any { it in WHO }
        else -> isPicture(pic)
    }
    /** A memory card's face is a picture (web isPicture): art, a person, or text with no letters at all. */
    fun isPicture(t: String) = t.startsWith("art:") || t.startsWith("p:") || t.isNotBlank() && t.none { it.isLetter() }

    val VIEWS: List<SciView> = listOf(whale, plant, planets)
    private val byName = VIEWS.associateBy { it.name }
    operator fun get(name: String?) = byName[name]
    fun hasView(name: String?) = name in byName
}

/** A word's picture: an emoji, an art or a person, `size` tall. Decorative for TalkBack (the word is read). */
@Composable
fun WordPicture(pic: String, modifier: Modifier = Modifier, emoji: TextUnit = 34.sp, description: String? = null) {
    val sem = if (description != null) Modifier.semantics { contentDescription = description } else Modifier.clearAndSetSemantics { }
    when {
        pic.startsWith("art:") -> Canvas(modifier.aspectRatio(1f).then(sem)) {
            val pen = Pen(this, null)
            pen.stretch(5, 5, 0, 0) { art(pic.removePrefix("art:")) }
        }
        pic.startsWith("p:") -> Canvas(modifier.aspectRatio(80f / 112f).then(sem)) {
            val pen = Pen(this, null)
            pen.stretch(4, 4, 0, 0) { person(pic.removePrefix("p:")) }
        }
        else -> Box(modifier.then(sem), contentAlignment = Alignment.Center) { Text(pic, fontSize = emoji) }
    }
}

// ---------- The planets (the book's colours) ----------

internal class Planet(val c: String, val c2: String, val r: Float, val land: String? = null, val bands: String? = null, val ring: String? = null)
internal val PLANETS = linkedMapOf(
    "sun" to Planet("#ffc93c", "#ff9a1f", 26f),
    "mercury" to Planet("#b3aca2", "#8d867c", 9f),
    "venus" to Planet("#f0cf86", "#d9a95a", 13f),
    "earth" to Planet("#3f8fd6", "#2a6fb0", 13.5f, land = "#5fbf5a"),
    "mars" to Planet("#e0663e", "#b8462a", 11f),
    "jupiter" to Planet("#e2b07a", "#c98c50", 24f, bands = "#b8784a"),
    "saturn" to Planet("#f2d68a", "#d9b25a", 19f, ring = "#c9a35a"),
    "uranus" to Planet("#a8e4ec", "#6fc4d4", 16f),
    "neptune" to Planet("#4f7fe0", "#2f56b8", 16f),
    "moon" to Planet("#e8e4da", "#bdb6a6", 12f),
)

internal fun Pen.planet(id: String, cx: Float, cy: Float, r: Float, rays: Boolean = true) {
    val p = PLANETS.getValue(id)
    if (p.ring != null) ellipse(cx, cy, r * 1.85f, r * .5f, stroke = hex(p.ring), sw = r * .22f, alpha = .9f)
    // The web's radial gradient: dark edge, light body, a white shine up left.
    circle(cx, cy, r, fill = hex(p.c2))
    circle(cx - r * .12f, cy - r * .12f, r * .82f, fill = hex(p.c))
    circle(cx - r * .38f, cy - r * .38f, r * .28f, fill = Color.White, alpha = .35f)
    circle(cx, cy, r, stroke = INK, sw = 1.5)
    p.bands?.let { b ->
        line(cx - r * .95f, cy - r * .3f, cx + r * .95f, cy - r * .3f, hex(b), r * .13f, alpha = .7f)
        line(cx - r * .98f, cy + r * .15f, cx + r * .98f, cy + r * .15f, hex(b), r * .13f, alpha = .7f)
        line(cx - r * .85f, cy + r * .5f, cx + r * .85f, cy + r * .5f, hex(b), r * .13f, alpha = .7f)
    }
    p.land?.let { l ->
        path("M${cx - r * .5f} ${cy - r * .55f} q${r * .5f} ${-r * .2f} ${r * .6f} ${r * .3f} q${-r * .1f} ${r * .4f} ${-r * .5f} ${r * .3f}z " +
            "M${cx + r * .15f} ${cy + r * .2f} q${r * .5f} ${-r * .1f} ${r * .55f} ${r * .35f} q${-r * .3f} ${r * .35f} ${-r * .6f} ${r * .1f}z", fill = hex(l))
    }
    p.ring?.let { g -> path("M${cx - r * 1.85f} $cy A${r * 1.85f} ${r * .5f} 0 0 0 ${cx + r * 1.85f} $cy", stroke = hex(g), sw = r * .22f) }
    if (id == "sun" && rays) for (i in 0 until 12) {
        val a = i / 12f * 2 * PI.toFloat()
        line(cx + cos(a) * r * 1.12f, cy + sin(a) * r * 1.12f, cx + cos(a) * r * 1.38f, cy + sin(a) * r * 1.38f, hex("#ff9a1f"), 3)
    }
    if (id == "moon") { circle(cx - r * .3f, cy + r * .2f, r * .18f, fill = hex(p.c2)); circle(cx + r * .35f, cy - r * .3f, r * .12f, fill = hex(p.c2)) }
}

// ---------- Small pictures, in 64 × 64 units ----------

internal fun Pen.art(name: String) {
    val ink = INK
    when (name) {
        "seahorse" -> {
            path("M36 10c8 0 12 6 10 12l-6 2c4 2 6 7 4 12-2 6-8 8-8 14 0 6 7 6 6 1-1-3-4-2-3 0", fill = hex("#f2a83a"))
            path("M36 10c8 0 12 6 10 12l-6 2c4 2 6 7 4 12-2 6-8 8-8 14 0 5 6 6 6 2", stroke = ink, sw = 3)
            path("M37 10c-6 0-10 4-10 9 0 4 3 6 5 8-4 3-7 8-6 13 1 4 4 6 6 7", fill = hex("#f2a83a"), stroke = ink, sw = 3)
            path("M27 17l-9 2c-2 1-2 3 0 3l9 0", fill = hex("#f2a83a"), stroke = ink, sw = 3)
            circle(35, 16, 2.4, fill = ink)
            path("M40 28c3 1 4 4 2 6", stroke = hex("#e07a1f"), sw = 2)
            path("M30 30h8M29 36h9M31 42h7", stroke = hex("#e07a1f"), sw = 2)
            path("M41 12l4-5 2 6", fill = hex("#f2a83a"), stroke = ink, sw = 2.5)
        }
        "zipwire" -> {
            line(4, 14, 60, 40, ink, 3)
            rect(2, 10, 5, 50, hex("#a8703f")); rect(57, 36, 5, 24, hex("#a8703f"))
            line(30, 27, 30, 35, ink, 2.5)
            circle(30, 27, 3, fill = hex("#e8453c"), stroke = ink, sw = 2)
            circle(30, 38, 5, fill = hex("#f6c9a0"), stroke = ink, sw = 2)
            path("M30 43v9M30 46l-6-4M30 46l6-4M30 52l-4 7M30 52l4 7", stroke = hex("#2f6fd0"), sw = 3.5)
            line(24, 35, 36, 33, hex("#f2c14e"), 3)
        }
        "circle" -> circle(32, 32, 22, fill = hex("#5fb3f0"), stroke = ink, sw = 3)
        "triangle" -> path("M32 9L57 53H7Z", fill = hex("#f2c14e"), stroke = ink, sw = 3)
        "rectangle" -> rect(6, 17, 52, 30, fill = hex("#7cc35a"), stroke = ink, sw = 3, r = 2)
        "curtains" -> {
            rect(4, 6, 56, 6, fill = hex("#c9963a"), stroke = ink, sw = 2, r = 2)
            path("M6 12h22c-2 14 0 30 4 46H6Z", fill = hex("#d0344c"), stroke = ink, sw = 2.5)
            path("M58 12H36c2 14 0 30-4 46h26Z", fill = hex("#d0344c"), stroke = ink, sw = 2.5)
            path("M12 14v42M19 14c0 14 1 28 4 42M52 14v42M45 14c0 14-1 28-4 42", stroke = hex("#a8243a"), sw = 2)
        }
        "stage" -> {
            rect(4, 40, 56, 16, fill = hex("#a8703f"), stroke = ink, sw = 2.5, r = 2)
            line(4, 44, 60, 44, hex("#c99863"), 2)
            path("M6 6h18c-2 12 0 24 2 34H6Z", fill = hex("#d0344c"), stroke = ink, sw = 2)
            path("M58 6H40c2 12 0 24-2 34h20Z", fill = hex("#d0344c"), stroke = ink, sw = 2)
            circle(32, 30, 5, fill = hex("#f6c9a0"), stroke = ink, sw = 2)
            path("M32 35v6M27 38h10", stroke = hex("#2f6fd0"), sw = 3)
        }
        "soil" -> {
            path("M4 30q14-6 28 0t28 0V58H4Z", fill = hex("#8a5a34"), stroke = ink, sw = 2.5)
            circle(16, 44, 2.5, fill = hex("#5a3a22")); circle(38, 50, 2, fill = hex("#5a3a22")); circle(48, 40, 2.5, fill = hex("#5a3a22"))
            path("M30 30c0-8 0-12 0-16M30 20c-6-4-10-2-11 2 5 2 8 1 11-2M30 17c5-5 10-4 11-1-5 3-8 3-11 1", fill = hex("#5fbf5a"), stroke = hex("#3f9d3c"), sw = 2.5)
        }
        "coal" -> {
            path("M10 44l8-14 12-4 14 6 8 12-6 10H16Z", fill = hex("#3b3640"), stroke = ink, sw = 2.5)
            path("M18 30l8 8 4-12M30 26l6 12 8-6M26 38l-6 14M36 38l8 14", stroke = hex("#6b6670"), sw = 2)
            line(22, 34, 25, 32, Color.White, 2, alpha = .6f)
        }
        in PLANETS -> planet(name, 32f, 32f, if (name == "saturn") 15f else if (name == "sun") 21f else 22f)
    }
}

// ---------- A drawn person (Unit 8 · Appearance), in 80 × 112 units ----------

private val CLOTH = mapOf("girl" to "#ec79a8", "boy" to "#3f8fd6", "woman" to "#8a63c9", "lady" to "#2fb3a8", "man" to "#4fae45", "grandma" to "#c98ae0", "grandpa" to "#a8703f")
private val HAIR = linkedMapOf("blond" to "#f5d061", "brown" to "#8a5a34", "black" to "#2a1a10", "grey" to "#c9c4bc", "dark" to "#3b2414", "red" to "#d0603a")
private val EYES = linkedMapOf("blueeyes" to "#3f8fd6", "greeneyes" to "#3f9d3c", "browneyes" to "#7a4a2a", "blackeyes" to "#1f1612")

/** What a person spec draws (pure, so a test can read it). */
data class Looks(val who: String, val height: Float, val body: Float, val hair: String, val eyes: String?, val longHair: Boolean, val style: String, val glasses: Boolean)

fun looksOf(spec: String): Looks {
    val t = spec.split(',').map { it.trim() }.toSet()
    val who = listOf("girl", "boy", "woman", "lady", "man", "grandma", "grandpa").firstOrNull { it in t } ?: "girl"
    val female = who in setOf("girl", "woman", "lady", "grandma")
    val old = who.startsWith("grand")
    return Looks(
        who = who,
        height = if ("tall" in t) 100f else if ("short" in t) 70f else 85f,
        body = when { "plump" in t || "fat" in t -> 30f; "wellbuilt" in t -> 26f; "thin" in t -> 13f; "slim" in t -> 16f; else -> 20f },
        hair = HAIR.keys.firstOrNull { it in t } ?: if (old) "grey" else "brown",
        eyes = EYES.keys.firstOrNull { it in t },
        longHair = "longhair" in t || (female && "shorthair" !in t),
        style = if ("curly" in t) "curly" else if ("wavy" in t) "wavy" else "straight",
        glasses = "glasses" in t,
    )
}

internal fun Pen.person(spec: String) {
    val l = looksOf(spec)
    val ink = INK
    val female = l.who in setOf("girl", "woman", "lady", "grandma")
    val child = l.who == "girl" || l.who == "boy"
    val hairCol = hex(HAIR.getValue(l.hair))
    val eyeCol = l.eyes?.let { hex(EYES.getValue(it)) } ?: ink
    val r = if (child) 12f else 11f
    val ground = 108f; val cx = 40f; val h = l.height; val bw = l.body
    val top = ground - h; val hy = top + r; val neck = hy + r; val hip = neck + (h - 2 * r) * .46f
    val cloth = hex(CLOTH.getValue(l.who)); val skin = hex("#f6c9a0")
    ellipse(cx, ground, bw * .7f + 6, 3, fill = Color.Black, alpha = .15f)
    if (l.longHair) {
        val len = neck + (h - 2 * r) * .22f
        when (l.style) {
            "curly" -> for (i in 0 until 6) { val yy = hy + i * ((len - hy) / 5); circle(cx - r * .95f, yy, r * .42f, fill = hairCol); circle(cx + r * .95f, yy, r * .42f, fill = hairCol) }
            "wavy" -> { val q = (len - hy) / 4; val hh = (len - hy) / 2
                path("M${cx - r * 1.1f} $hy q-3 $q 0 $hh t0 $hh h${r * 2.2f} q3 ${-q} 0 ${-hh} t0 ${-hh}z", fill = hairCol) }
            else -> rect(cx - r * 1.1f, hy - 2, r * 2.2f, len - hy + 2, fill = hairCol, r = r * .5f)
        }
    }
    val legW = maxOf(4f, bw * .24f); val legL = ground - hip
    if (female && !child && l.who != "lady") {
        rect(cx - bw * .3f, hip, legW, legL, fill = skin, stroke = ink, sw = 1.5)
        rect(cx + bw * .3f - legW, hip, legW, legL, fill = skin, stroke = ink, sw = 1.5)
    } else {
        val pants = if (female) skin else hex("#3b4a7a")
        rect(cx - bw * .36f, hip - 2, legW + 1, legL + 2, fill = pants, stroke = ink, sw = 1.5, r = 2)
        rect(cx + bw * .36f - legW - 1, hip - 2, legW + 1, legL + 2, fill = pants, stroke = ink, sw = 1.5, r = 2)
    }
    ellipse(cx - bw * .3f, ground - 1, legW * .9f, 2.6f, fill = ink); ellipse(cx + bw * .3f, ground - 1, legW * .9f, 2.6f, fill = ink)
    val skirt = if (female) "M${cx - bw / 2} ${neck + 2} L${cx - bw / 2 - 5} ${hip + 6} H${cx + bw / 2 + 5} L${cx + bw / 2} ${neck + 2}Z"
        else "M${cx - bw / 2} ${neck + 2} L${cx - bw / 2} ${hip + 1} H${cx + bw / 2} L${cx + bw / 2} ${neck + 2}Z"
    path(skirt, fill = cloth, stroke = ink, sw = 2)
    line(cx - bw / 2, neck + 4, cx - bw / 2 - 5, neck + 4 + (hip - neck) * .75f, skin, 4.5)
    line(cx + bw / 2, neck + 4, cx + bw / 2 + 5, neck + 4 + (hip - neck) * .75f, skin, 4.5)
    circle(cx, hy, r, fill = skin, stroke = ink, sw = 2)
    for (sx in listOf(-1, 1)) { circle(cx + sx * r * .38f, hy - 1, 2, fill = eyeCol); circle(cx + sx * r * .38f + .6f, hy - 1.7f, .7f, fill = Color.White) }
    path("M${cx - 3.5f} ${hy + r * .42f} q3.5 3 7 0", stroke = ink, sw = 1.8)
    circle(cx - r * .62f, hy + r * .3f, 1.8, fill = hex("#f29a9a"), alpha = .7f); circle(cx + r * .62f, hy + r * .3f, 1.8, fill = hex("#f29a9a"), alpha = .7f)
    if (l.glasses) {
        circle(cx - r * .38f, hy - 1, 3.6, stroke = ink, sw = 1.4); circle(cx + r * .38f, hy - 1, 3.6, stroke = ink, sw = 1.4)
        line(cx - r * .38f + 3.6f, hy - 1, cx + r * .38f - 3.6f, hy - 1, ink, 1.4)
    }
    when (l.style) {
        "curly" -> for (i in 0 until 7) { val a = PI.toFloat() + i / 6f * PI.toFloat(); circle(cx + cos(a) * r * .92f, hy + sin(a) * r * .85f - 1, r * .38f, fill = hairCol) }
        "wavy" -> path("M${cx - r - 1} $hy q0 ${-r * 1.3f} ${r + 1} ${-r * 1.1f} q${r + 1} ${-r * .2f} ${r + 1} ${r * 1.1f} q-3 -4 -6 -2 q-3 -4 -6 -1 q-3 -4 -6 -1 q-3 -4 -6 -1 q-2 -2 -3 5z", fill = hairCol)
        else -> path("M${cx - r - 1} ${hy + 1} q0 ${-r * 1.35f} ${r + 1} ${-r * 1.15f} q${r + 1} ${-r * .2f} ${r + 1} ${r * 1.15f} q${-r * .9f} ${-r * .75f} ${-r * 1.6f} ${-r * .35f} q${-r * .2f} ${r * .3f} ${-r * .4f} ${r * .35f}z", fill = hairCol)
    }
    if (l.who == "grandpa") path("M${cx - 4} ${hy + r * .2f} q4 2 8 0", stroke = hex("#e8e4da"), sw = 2.5)
}

// ---------- The pictures with parts to find (320 units wide; the web's own boxes: english-quests.json views) ----------

private val BODY = hex("#3f6db4"); private val FIN = hex("#2f5aa0")

private val whale = SciView("whale") {
    gradient(0, 0, 320, 200, hex("#bfe9ff"), hex("#5fb6e8"), 14)
    path("M0 40 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0", stroke = Color.White, sw = 3, alpha = .6f)
    path("M262 92 C262 60 220 52 170 54 C120 56 80 66 64 84 C56 92 50 98 40 96 L46 116 C60 118 72 116 84 120 C120 134 200 140 240 126 C258 118 262 108 262 92Z", fill = BODY, stroke = INK, sw = 3)
    path("M250 112 C220 128 140 130 92 118 C130 140 210 142 246 122Z", fill = hex("#e8f2ff"), alpha = .9f)
    path("M232 108 h-30 M232 113 h-36 M228 118 h-38", stroke = hex("#9ab8e0"), sw = 2)
    path("M46 98 C34 84 22 70 8 66 C14 80 22 90 30 100 C20 108 14 118 10 132 C26 126 38 116 48 112Z", fill = FIN, stroke = INK, sw = 3)
    path("M120 58 C126 44 136 36 146 34 C142 44 142 52 146 56Z", fill = FIN, stroke = INK, sw = 3)
    ellipse(214, 56, 6, 2.5, fill = hex("#1f3a6a"))
    path("M214 52 C208 40 200 34 196 26 M214 52 C214 38 214 30 214 20 M214 52 C220 40 228 34 232 26", stroke = Color.White, sw = 3)
    circle(236, 84, 5.5, fill = Color.White, stroke = INK, sw = 2); circle(237.5, 84.5, 3, fill = hex("#1f1612"))
    path("M262 98 C250 104 236 106 222 104", stroke = INK, sw = 3)
    path("M176 122 C170 138 160 150 148 156 C150 142 156 130 164 120Z", fill = FIN, stroke = INK, sw = 3)
}

private val plant = SciView("plant") {
    rect(0, 0, 320, 120, hex("#dff3ff"), r = 14)
    rect(0, 112, 320, 88, hex("#a8703f"), r = 10)
    path("M0 114 q40 -6 80 0 t80 0 t80 0 t80 0", stroke = hex("#7a4a2a"), sw = 3)
    circle(282, 30, 16, fill = hex("#ffd23f"))
    path("M160 116 C158 132 150 142 140 150 M160 118 C162 136 170 146 182 154 M160 120 C160 140 158 156 156 172 M150 140 C144 142 138 146 134 150 M168 140 C174 142 178 146 184 146", stroke = hex("#f3e2bd"), sw = 3.5)
    path("M160 116 C160 90 158 66 160 40", stroke = hex("#3f9d3c"), sw = 6)
    path("M160 86 C140 70 118 74 110 84 C126 94 146 94 160 86Z M160 70 C178 56 200 58 208 68 C194 80 174 80 160 70Z", fill = hex("#5fbf5a"), stroke = hex("#2f7a3f"), sw = 2.5)
    path("M160 86 L116 84 M160 70 L202 68", stroke = hex("#2f7a3f"), sw = 1.5)
    for (i in 0 until 5) {
        val a = i / 5f * 2 * PI.toFloat() - PI.toFloat() / 2
        val x = 160 + cos(a) * 10; val y = 30 + sin(a) * 10
        turn(a * 180 / PI.toFloat(), x, y) { ellipse(x, y, 8, 6, fill = hex("#ec79a8"), stroke = INK, sw = 1.5) }
    }
    circle(160, 30, 6, fill = hex("#ffd23f"), stroke = INK, sw = 1.5)
    circle(128, 62, 11, fill = hex("#e8453c"), stroke = INK, sw = 2)
    path("M128 51 l-3 -4 M128 51 l4 -3", stroke = hex("#2f7a3f"), sw = 2.5)
    path("M123 58 q2 -3 5 -3", stroke = Color.White, sw = 2, alpha = .7f)
    line(146, 66, 139, 62, hex("#3f9d3c"), 3)
}

/** The planets' places and sizes on the solar-system picture (web views.ts planets). */
internal val PLANET_X = linkedMapOf("mercury" to 62f, "venus" to 88f, "earth" to 117f, "mars" to 145f, "jupiter" to 182f, "saturn" to 233f, "uranus" to 279f, "neptune" to 308f)
internal val PLANET_R = mapOf("mercury" to 5f, "venus" to 8f, "earth" to 8.5f, "mars" to 6.5f, "jupiter" to 17f, "saturn" to 13f, "uranus" to 10.5f, "neptune" to 10.5f)

private val planets = SciView("planets") {
    rect(0, 0, 320, 200, hex("#0f1438"), r = 14)
    circle(30, 100, 150, fill = hex("#3a2a6a"), alpha = .45f)
    for (i in 0 until 40) circle((i * 73) % 316 + 2, (i * 37) % 196 + 2, if (i % 5 != 0) .8 else 1.4, fill = Color.White, alpha = .4f + (i % 3) * .2f)
    for ((_, x) in PLANET_X) move(-x * .04f, 0) { path("M$x 20 A${x + 30} ${x + 30} 0 0 1 $x 140", stroke = Color.White, sw = 1, alpha = .12f) }
    planet("sun", -6f, 80f, 44f, rays = false)
    for ((id, x) in PLANET_X) planet(id, x, 80f, PLANET_R.getValue(id))
}
