package org.sindibad.android.ui.farm

/**
 * Where things sit in the farm scene, in a square of 1000 × 1000 scene units (drawn to fit the width).
 * Pure Kotlin so tests can check that every place is a big enough, separate touch target even at 320 dp.
 * The 2D scene is one view of these places; a later 3D island (#8) can reuse the same place ids.
 */
internal data class SceneRect(val x: Float, val y: Float, val w: Float, val h: Float) {
    val cx get() = x + w / 2
    val cy get() = y + h / 2
    val right get() = x + w
    val bottom get() = y + h
    operator fun contains(p: Pair<Float, Float>) = p.first in x..right && p.second in y..bottom
    fun overlaps(o: SceneRect) = x < o.right && o.x < right && y < o.bottom && o.y < bottom
}

internal object FarmLayout {
    const val SIZE = 1000f

    /** Place id → its rectangle, in the order TalkBack reads them (top to bottom, right to left in RTL). */
    val places: Map<String, SceneRect> = buildMap {
        put("barn", SceneRect(650f, 60f, 290f, 220f))
        put("dairy", SceneRect(390f, 80f, 220f, 180f))
        repeat(6) { i -> put("plot-$i", SceneRect(420f - (i % 3) * 185f, 320f + (i / 3) * 175f, 170f, 155f)) }
        put("pen", SceneRect(650f, 320f, 300f, 310f))
        put("hive", SceneRect(60f, 690f, 270f, 170f))
        put("board", SceneRect(370f, 690f, 190f, 170f))
        put("dock", SceneRect(620f, 700f, 360f, 280f))
    }

    /** Where each bought decoration is drawn (not a separate touch target: the decorations list explains them). */
    val decor: Map<String, List<Pair<Float, Float>>> = mapOf(
        "rose" to listOf(80f to 292f, 150f to 296f, 220f to 292f, 290f to 296f),
        "jasmine" to listOf(600f to 660f),
        "scarecrow" to listOf(120f to 200f),
        "fountain" to listOf(270f to 190f),
        "lanterns" to listOf(360f to 300f, 630f to 300f, 600f to 900f, 45f to 650f),
    )

    /** Where the helper waits by a place (or by the board when nothing is chosen). */
    fun helperAt(place: String?): Pair<Float, Float> {
        val r = places[place] ?: return 590f to 640f
        return (r.x - 10f).coerceIn(40f, 960f) to (r.bottom - 30f).coerceIn(60f, 960f)
    }

    fun hit(x: Float, y: Float): String? = places.entries.firstOrNull { (x to y) in it.value }?.key
}
