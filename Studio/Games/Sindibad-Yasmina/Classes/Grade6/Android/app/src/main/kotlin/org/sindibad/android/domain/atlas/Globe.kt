package org.sindibad.android.domain.atlas

import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.math.sqrt

// The atlas globe's geometry (web: core/atlas/globe.ts), pure Kotlin. The web turns a textured three.js sphere;
// natively the Earth is an orthographic view drawn on a Canvas, turned by its centre (lon0, lat0). A tap is
// projected back to (lon, lat) and found with the web's own rule: point-in-polygon on each country's rings with
// their longitudes unwrapped (tried at lon, lon − 360, lon + 360, so Russia and Fiji across the 180° line work),
// then, for the two Arab countries with no outline (Bahrain, Comoros), the nearest dot within 2.2°.

/** A ring with its longitudes unwrapped (no jump at ±180) and its box [w, e, s, n] (web RINGS). */
class Ring(val pts: DoubleArray, val box: DoubleArray)

object Globe {
    const val RAD = Math.PI / 180
    /** The web's pitch limit (±1.3 rad). */
    const val MAX_LAT = 1.3 / RAD

    fun unwrap(ring: List<Int>): Ring {
        val pts = DoubleArray(ring.size)
        var prev = Double.NaN
        var i = 0
        while (i < ring.size) {
            var lon = ring[i] / 10.0
            val lat = ring[i + 1] / 10.0
            if (!prev.isNaN()) { while (lon - prev > 180) lon -= 360; while (prev - lon > 180) lon += 360 }
            pts[i] = lon; pts[i + 1] = lat; prev = lon
            i += 2
        }
        var w = 1e9; var e = -1e9; var s = 1e9; var n = -1e9
        i = 0
        while (i < pts.size) { w = minOf(w, pts[i]); e = maxOf(e, pts[i]); s = minOf(s, pts[i + 1]); n = maxOf(n, pts[i + 1]); i += 2 }
        return Ring(pts, doubleArrayOf(w, e, s, n))
    }

    fun inRing(lon: Double, lat: Double, pts: DoubleArray): Boolean {
        var inside = false
        var j = pts.size - 2
        var i = 0
        while (i < pts.size) {
            val xi = pts[i]; val yi = pts[i + 1]; val xj = pts[j]; val yj = pts[j + 1]
            if ((yi > lat) != (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside
            j = i; i += 2
        }
        return inside
    }

    private val rings: List<Pair<String, List<Ring>>> by lazy {
        AtlasWorld.globe.countries.filter { it.rings.isNotEmpty() }.map { c -> c.id to c.rings.map(::unwrap) }
    }

    /** The country at (lon, lat), or null over the sea (web countryAt). */
    fun countryAt(lon: Double, lat: Double): String? {
        for ((id, rs) in rings) for (r in rs) for (l in doubleArrayOf(lon, lon - 360, lon + 360)) {
            if (l < r.box[0] || l > r.box[1] || lat < r.box[2] || lat > r.box[3]) continue
            if (inRing(l, lat, r.pts)) return id
        }
        var best: String? = null
        var bd = 2.2
        for (c in AtlasWorld.globe.countries) if (c.small) { val d = hypot(c.lon - lon, c.lat - lat); if (d < bd) { bd = d; best = c.id } }
        return best
    }

    /** Orthographic projection on a unit disc: (x right, y up, visible = facing the viewer). */
    fun project(lon: Double, lat: Double, lon0: Double, lat0: Double, out: DoubleArray = DoubleArray(3)): DoubleArray {
        val p = lat * RAD; val p0 = lat0 * RAD; val d = (lon - lon0) * RAD
        out[0] = cos(p) * sin(d)
        out[1] = cos(p0) * sin(p) - sin(p0) * cos(p) * cos(d)
        out[2] = sin(p0) * sin(p) + cos(p0) * cos(p) * cos(d)
        return out
    }

    /** A point on the unit disc back to (lon, lat) in [-180, 180); null off the Earth. */
    fun unproject(x: Double, y: Double, lon0: Double, lat0: Double): DoubleArray? {
        val rho = sqrt(x * x + y * y)
        if (rho > 1.0) return null
        if (rho < 1e-12) return doubleArrayOf(norm(lon0), lat0)
        val c = asin(rho)
        val p0 = lat0 * RAD
        val lat = asin((cos(c) * sin(p0) + y * sin(c) * cos(p0) / rho).coerceIn(-1.0, 1.0)) / RAD
        val lon = lon0 + atan2(x * sin(c), rho * cos(c) * cos(p0) - y * sin(c) * sin(p0)) / RAD
        return doubleArrayOf(norm(lon), lat)
    }

    fun norm(lon: Double) = ((lon % 360 + 540) % 360) - 180

    /** The shortest way to turn from `from` to `to` (degrees), as the web's face(). */
    fun nearestLon(from: Double, to: Double): Double {
        var t = to
        while (t - from > 180) t -= 360
        while (from - t > 180) t += 360
        return t
    }
}
