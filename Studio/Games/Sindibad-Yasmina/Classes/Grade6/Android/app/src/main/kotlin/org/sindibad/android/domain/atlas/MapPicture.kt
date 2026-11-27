package org.sindibad.android.domain.atlas

import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

// The atlas island's maps (web: core/atlas/views.ts mapHTML), laid out natively: an area's frame projected to a
// 320-wide picture (190 to 300 high), every outline in view, and the places a step names as spots — a country
// fills in, a river glows, a city gets a dot, a sea gets its name. Pure Kotlin: the layout is computed once per
// step (and cached), drawn by ui/atlas/AtlasMapView.kt, and checked against the web's own SVG in the tests.

/** What a spot is drawn as (its hit area follows the web's lx-hit / mp-hitline). */
enum class SpotKind { Country, Dot, Line, Lake, Mountain, River, Land, Water, City }

/** A country outline in picture units: rings of x, y pairs. */
class Outline(val iso: String, val rings: List<FloatArray>, val arab: Boolean, val mark: Boolean)

/** A place a step names: what it is, where its name goes, and its geometry in picture units. */
class MapSpot(
    val id: String, val kind: SpotKind,
    /** Where the name shows once found (the web's lx-label x, y: the middle of the text's baseline). */
    val labelX: Float, val labelY: Float,
    /** Anchor (dot, circle or middle) for touch and TalkBack. */
    val x: Float, val y: Float,
    /** Hit radius (points), or half-size for mountains; lines and rivers use their geometry. */
    val r: Float = 0f,
    val outline: Outline? = null,
    /** River / mountain points (x, y pairs); a river may have a second branch. */
    val paths: List<FloatArray> = emptyList(),
    /** Lake: rx, ry, rotation. */
    val ellipse: FloatArray? = null,
    /** Mark-coloured (a marked river). */
    val mark: Boolean = false,
)

/** Things drawn but not tappable. */
class MapDecor(
    val lakes: List<Pair<FloatArray, FloatArray>>, // (x, y) and (rx, ry, rot)
    val rivers: List<Pair<FloatArray, Boolean>>,   // points, marked
    val mountains: List<FloatArray>,
    val lines: List<Float>,                        // y of a marked line
    val dots: List<FloatArray>,                    // marked dot countries (x, y)
    val cities: List<FloatArray>,                  // marked cities (x, y)
)

class MapLayout(
    val area: String, val w: Float, val h: Float,
    /** [west, east, south, north] after fitting the frame. */
    val box: DoubleArray,
    val land: List<Outline>,
    /** In drawing order: countries (big first), dot countries, lakes, then lines, mountains, rivers, areas, seas, cities. */
    val spots: List<MapSpot>,
    val decor: MapDecor,
) {
    fun spot(id: String) = spots.firstOrNull { it.id == id }

    /**
     * The spot under (x, y) in picture units, topmost first, as the web's SVG would find it; when nothing is hit
     * (a finger is wider than Lebanon), the spot whose anchor is nearest within `slop`.
     */
    fun hit(x: Float, y: Float, slop: Float = 0f, among: Set<String>? = null): String? {
        val list = spots.filter { among == null || it.id in among }
        for (s in list.asReversed()) if (hits(s, x, y)) return s.id
        var best: String? = null
        var bd = slop
        for (s in list) { val d = hypot(s.x - x, s.y - y); if (d <= bd) { bd = d; best = s.id } }
        return best
    }

    private fun hits(s: MapSpot, x: Float, y: Float): Boolean = when (s.kind) {
        SpotKind.Country -> s.outline!!.rings.any { inside(it, x, y) }
        SpotKind.Line -> kotlin.math.abs(y - s.y) <= 8f && x in 0f..w
        SpotKind.Mountain -> kotlin.math.abs(x - s.x) <= 13f && kotlin.math.abs(y - s.y) <= 13f
        SpotKind.River -> s.paths.any { nearLine(it, x, y, 8f) }
        else -> hypot(s.x - x, s.y - y) <= s.r
    }

    companion object {
        fun inside(ring: FloatArray, x: Float, y: Float): Boolean {
            var inside = false
            var j = ring.size - 2
            var i = 0
            while (i < ring.size) {
                val xi = ring[i]; val yi = ring[i + 1]; val xj = ring[j]; val yj = ring[j + 1]
                if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
                j = i; i += 2
            }
            return inside
        }
        fun nearLine(pts: FloatArray, x: Float, y: Float, d: Float): Boolean {
            var i = 0
            while (i + 3 < pts.size) {
                val ax = pts[i]; val ay = pts[i + 1]; val bx = pts[i + 2]; val by = pts[i + 3]
                val dx = bx - ax; val dy = by - ay
                val len = dx * dx + dy * dy
                val t = if (len == 0f) 0f else (((x - ax) * dx + (y - ay) * dy) / len).coerceIn(0f, 1f)
                if (hypot(ax + t * dx - x, ay + t * dy - y) <= d) return true
                i += 2
            }
            return false
        }
    }
}

/** The web's projector: an equirectangular frame scaled by cos(middle latitude), 320 wide, 190–300 high. */
class Projector(area: String, areas: Map<String, List<Double>>) {
    val w = 320.0
    val h: Double
    val box: DoubleArray
    private val sx: Double
    private val sy: Double
    init {
        val a = areas[area] ?: areas.getValue("arab")
        var w0 = a[0]; var e0 = a[1]; var s0 = a[2]; var n0 = a[3]
        val kx = cos((s0 + n0) / 2 * Math.PI / 180)
        var hh = w * (n0 - s0) / ((e0 - w0) * kx)
        if (hh > 300) { val lon = (n0 - s0) / kx * (w / 300); val c = (w0 + e0) / 2; w0 = c - lon / 2; e0 = c + lon / 2; hh = 300.0 }
        if (hh < 190) { val lat = 190 / w * (e0 - w0) * kx; val c = (s0 + n0) / 2; s0 = c - lat / 2; n0 = c + lat / 2; hh = 190.0 }
        sx = w / (e0 - w0); sy = hh / (n0 - s0)
        h = hh
        box = doubleArrayOf(w0, e0, s0, n0)
    }
    fun x(lon: Double) = ((lon - box[0]) * sx).toFloat()
    fun y(lat: Double) = ((box[3] - lat) * sy).toFloat()
}

object AtlasMaps {
    private val cache = HashMap<String, MapLayout>()

    /** A step's map: `area`, the places to find or name (`want`) and the places only marked. Cached per content. */
    fun layout(area: String?, want: List<String>, mark: List<String> = emptyList(), world: AtlasWorld = AtlasWorld): MapLayout {
        val key = "${area ?: "arab"}|${want.joinToString(",")}|${mark.joinToString(",")}"
        return synchronized(cache) { cache.getOrPut(key) { build(area ?: "arab", want.toSet(), mark.toSet(), world.tables, world.globe) } }
    }

    private fun build(area: String, want: Set<String>, mark: Set<String>, t: MapTables, globe: GlobeData): MapLayout {
        val p = Projector(area, t.areas)
        val (w0, e0, s0, n0) = p.box.toList()
        val at = t.at[area].orEmpty()
        val isoToKey = t.country.entries.associate { (k, v) -> v to k }
        val arab = t.arab.toSet()
        fun inView(b: DoubleArray) = b[1] >= w0 - 2 && b[0] <= e0 + 2 && b[3] >= s0 - 2 && b[2] <= n0 + 2
        val land = ArrayList<Outline>()
        val countries = ArrayList<Pair<Double, MapSpot>>()
        for (c in globe.countries) {
            if (c.rings.isEmpty()) continue
            val bb = bbox(c.rings)
            if (!inView(bb)) continue
            val key = isoToKey[c.id]
            val outline = Outline(c.id, c.rings.map { r -> FloatArray(r.size) { i -> if (i % 2 == 0) p.x(r[i] / 10.0) else p.y(r[i] / 10.0) } },
                key != null && key in arab, key != null && key in mark)
            if (key != null && key in want) {
                val ctr = centre(c.rings)
                val nd = t.nudge[key] ?: listOf(0.0, 0.0)
                val ll = at[key] ?: listOf(ctr[0] + nd[0], ctr[1] + nd[1])
                val lx = p.x(ll[0]); val ly = p.y(ll[1])
                countries += (bb[1] - bb[0]) * (bb[3] - bb[2]) to MapSpot(key, SpotKind.Country, lx, ly, lx, ly, outline = outline)
            } else land += outline
        }
        val spots = ArrayList<MapSpot>()
        spots += countries.sortedByDescending { it.first }.map { it.second }
        val lakes = ArrayList<Pair<FloatArray, FloatArray>>()
        val rivers = ArrayList<Pair<FloatArray, Boolean>>()
        val mountains = ArrayList<FloatArray>()
        val lines = ArrayList<Float>()
        val dots = ArrayList<FloatArray>()
        val cities = ArrayList<FloatArray>()
        val over = ArrayList<MapSpot>()
        for ((k, ll) in t.dotCountry) {
            if (k !in want && k !in mark) continue
            val x = p.x(ll[0]); val y = p.y(ll[1])
            if (k in want) spots += MapSpot(k, SpotKind.Dot, x, y - 8, x, y, 13f) else dots += floatArrayOf(x, y)
        }
        for ((k, lat) in t.lines) {
            if (lat < s0 || lat > n0 || (k !in want && k !in mark)) continue
            val y = p.y(lat)
            if (k in want) over += MapSpot(k, SpotKind.Line, 320f - 46, y - 5, 160f, y) else lines += y
        }
        for ((k, l) in t.lakes) {
            val x = p.x(l[0]); val y = p.y(l[1]); val x2 = p.x(l[0] + l[2]); val y2 = p.y(l[1] - l[3])
            if (x < -20 || x > 340 || y < -20 || y > p.h + 20) continue
            val e = floatArrayOf(max(2.5f, x2 - x), max(2f, y2 - y), l[4].toFloat())
            if (k in want) spots += MapSpot(k, SpotKind.Lake, x, y + 14, x, y, 13f, ellipse = e) else lakes += floatArrayOf(x, y) to e
        }
        for ((k, pts) in t.mountains) {
            val near = pts.any { (lon, lat) -> lon in w0..e0 && lat in s0..n0 }
            if (!near || (k !in want && k !in mark && k !in t.alwaysMountains)) continue
            val xy = FloatArray(pts.size * 2) { i -> if (i % 2 == 0) p.x(pts[i / 2][0]) else p.y(pts[i / 2][1]) }
            val mid = pts[floor(pts.size / 2.0).toInt()]
            val cx = p.x(mid[0]); val cy = p.y(mid[1])
            val lab = at[k]
            val lx = lab?.let { p.x(it[0]) } ?: cx; val ly = lab?.let { p.y(it[1]) } ?: (cy + 16)
            if (k in want) over += MapSpot(k, SpotKind.Mountain, lx, ly, cx, cy, 13f, paths = listOf(xy)) else mountains += xy
        }
        fun line(pts: List<List<Double>>) = FloatArray(pts.size * 2) { i -> if (i % 2 == 0) p.x(pts[i / 2][0]) else p.y(pts[i / 2][1]) }
        for ((k, pts) in t.rivers) {
            val key = if (k == "nile2") "nile" else k
            if (key in want && k != "nile2") {
                val mid = pts[floor(pts.size / 2.0).toInt()]
                val x = p.x(mid[0]); val y = p.y(mid[1])
                val more = if (k == "nile") listOfNotNull(t.rivers["nile2"]?.let(::line)) else emptyList()
                over += MapSpot(key, SpotKind.River, x + 14, y, x, y, paths = listOf(line(pts)) + more, mark = k in mark)
            } else if (k != "nile2" || "nile" !in want) rivers += line(pts) to (k in mark)
        }
        for ((k, ll) in t.land) {
            if (k !in want) continue
            val pos = at[k] ?: ll
            val x = p.x(pos[0]); val y = p.y(pos[1])
            over += MapSpot(k, SpotKind.Land, x, y + 4, x, y, 16f)
        }
        for ((k, ll) in t.water) {
            if (k in t.lakes || k !in want) continue
            val pos = at[k] ?: ll
            val x = p.x(pos[0]); val y = p.y(pos[1])
            over += MapSpot(k, SpotKind.Water, x, y + 4, x, y, 15f)
        }
        for ((k, ll) in t.city) {
            if (k !in want && k !in mark) continue
            val x = p.x(ll[0]); val y = p.y(ll[1])
            val o = t.off[area]?.get(k) ?: listOf(0.0, -7.0)
            if (k in want) over += MapSpot(k, SpotKind.City, x + o[0].toFloat(), y + o[1].toFloat(), x, y, 13f, mark = k in mark)
            else cities += floatArrayOf(x, y)
        }
        spots += over
        return MapLayout(area, p.w.toFloat(), Math.round(p.h).toFloat(), p.box, land, spots,
            MapDecor(lakes, rivers, mountains, lines, dots, cities))
    }

    fun bbox(rings: List<List<Int>>): DoubleArray {
        var w = 1e9; var e = -1e9; var s = 1e9; var n = -1e9
        for (r in rings) { var i = 0; while (i < r.size) { w = min(w, r[i].toDouble()); e = max(e, r[i].toDouble()); s = min(s, r[i + 1].toDouble()); n = max(n, r[i + 1].toDouble()); i += 2 } }
        return doubleArrayOf(w / 10, e / 10, s / 10, n / 10)
    }
    /** The middle of a country's biggest ring, for its name (web centre()). */
    fun centre(rings: List<List<Int>>): DoubleArray {
        var best = rings[0]
        for (r in rings) if (r.size > best.size) best = r
        var x = 0.0; var y = 0.0
        var i = 0
        while (i < best.size) { x += best[i]; y += best[i + 1]; i += 2 }
        val n = best.size / 2
        return doubleArrayOf(x / n / 10, y / n / 10)
    }
}

/** A timeline (web timelineHTML): events evenly spaced, the earliest on the right as Arabic reads. */
class TimelineEvent(val id: String, val year: Int, val label: String, val x: Float, val up: Boolean,
    /** The middle of the year's text and of the name's text (moved in from the edges). */
    val yearX: Float, val nameX: Float, val name: String) {
    val yearY get() = if (up) 84f else 122f
    val nameY get() = if (up) 58f else 142f
    /** The touch box [x, y, w, h] (web lx-hit). */
    val hit get() = floatArrayOf(x - 26, if (up) 34f else 104f, 52f, 62f)
}

object Timelines {
    fun layout(events: List<org.sindibad.android.domain.quest.TimeEvent>, spots: List<org.sindibad.android.domain.quest.Spot>): List<TimelineEvent> {
        val ev = events.sortedBy { it.year }
        val gap = if (ev.size > 1) 250f / (ev.size - 1) else 0f
        fun inside(x: Float, text: String, size: Int): Float {
            val half = min(70f, text.length * size * 0.28f)
            return max(6 + half, min(314 - half, x))
        }
        return ev.mapIndexed { i, e ->
            val px = round1(285 - i * gap)
            val s = spots.firstOrNull { it.id == e.id }
            val name = s?.label ?: s?.title?.takeIf { it.length <= 16 }.orEmpty()
            TimelineEvent(e.id, e.year, e.label, px, i % 2 == 0, round1(inside(px, e.label, 11)), round1(inside(px, name, 12)), name)
        }
    }
    private fun round1(x: Float) = Math.round(x * 10) / 10f
}
