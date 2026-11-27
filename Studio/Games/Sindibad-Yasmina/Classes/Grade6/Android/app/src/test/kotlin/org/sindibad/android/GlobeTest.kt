package org.sindibad.android

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.domain.atlas.AtlasWorld
import org.sindibad.android.domain.atlas.Globe
import kotlin.random.Random

class GlobeTest {
    @Test fun `the world is the web's, 22 Arab countries, 71 full cards with flags, outlines for all but the two dots`() {
        val g = AtlasWorld.globe
        assertEquals(22, AtlasWorld.arab.size)
        assertEquals(71, AtlasWorld.full.size)
        assertTrue(AtlasWorld.arab.all { it in AtlasWorld.full })
        assertEquals(setOf("048", "174"), g.countries.filter { it.small }.map { it.id }.toSet())
        for (c in g.countries) {
            assertTrue(c.small || c.rings.isNotEmpty() || c.id == "010", "${c.id} ${c.ar}")
            assertTrue(c.continent in g.continents, c.id)
            c.flag?.let { f -> assertTrue(f.shapes.isNotEmpty(), c.id); f.shapes.forEach { s -> assertTrue(s.fill != null || s.stroke != null, c.id); s.m?.let { assertEquals(6, it.size) } } }
            if (c.full) { assertNotNull(c.capital, c.id); assertNotNull(c.official, c.id); assertNotNull(c.fact, c.id) }
        }
        // The map decisions are the web's: Palestine whole with no currency, the others as countries.ts says.
        val palestine = AtlasWorld.country("275")!!
        assertTrue(palestine.arab); assertNull(palestine.currency)
        assertNull(AtlasWorld.country("376"))
        assertNull(AtlasWorld.country("732"), "Western Sahara is drawn with Morocco")
        assertNotNull(AtlasWorld.country("728"), "South Sudan is its own country")
    }

    @Test fun `projecting a point and reading it back gives the same point, from any view`() {
        val rnd = Random(3)
        repeat(500) {
            val lon0 = rnd.nextDouble(-180.0, 180.0); val lat0 = rnd.nextDouble(-Globe.MAX_LAT, Globe.MAX_LAT)
            val lon = rnd.nextDouble(-180.0, 180.0); val lat = rnd.nextDouble(-85.0, 85.0)
            val p = Globe.project(lon, lat, lon0, lat0)
            if (p[2] < .05) return@repeat
            val back = Globe.unproject(p[0], p[1], lon0, lat0)!!
            assertEquals(0.0, Globe.norm(back[0] - lon), 1e-6, "lon of $lon,$lat from $lon0,$lat0")
            assertEquals(lat, back[1], 1e-6)
        }
        // The centre is the view's centre; off the disc is off the Earth.
        val c = Globe.project(36.0, 28.0, 36.0, 28.0)
        assertEquals(0.0, c[0], 1e-12); assertEquals(0.0, c[1], 1e-12); assertEquals(1.0, c[2], 1e-12)
        assertNull(Globe.unproject(.8, .7, 0.0, 0.0))
        assertEquals(-170.0, Globe.norm(190.0), 1e-9)
        assertEquals(190.0, Globe.nearestLon(170.0, -170.0), 1e-9)
    }

    @Test fun `a tap finds the country under it, small ones, dots and those across the 180th meridian too`() {
        val at = mapOf(
            "760" to (38.5 to 35.0),    // Syria
            "422" to (35.8 to 33.9),    // Lebanon
            "275" to (34.8 to 32.1),    // Palestine, drawn whole
            "262" to (42.6 to 11.8),    // Djibouti
            "634" to (51.2 to 25.3),    // Qatar
            "196" to (33.5 to 35.2),    // Cyprus
            "504" to (-13.0 to 24.0),   // Morocco, with Western Sahara
            "706" to (46.0 to 9.5),     // Somalia, with Somaliland
            "728" to (31.0 to 7.0),     // South Sudan
            "048" to (50.6 to 26.1),    // Bahrain: a dot
            "174" to (43.6 to -11.9),   // Comoros: a dot
        )
        for ((id, ll) in at) assertEquals(id, Globe.countryAt(ll.first, ll.second), "$id at $ll")
        // Russia's Chukotka and Fiji on both sides of the 180° line
        assertEquals("643", Globe.countryAt(178.0, 66.0))
        assertEquals("643", Globe.countryAt(-175.0, 66.0))
        assertEquals("643", Globe.countryAt(179.5, 68.0))
        assertEquals("643", Globe.countryAt(-179.5, 68.0))
        assertEquals("242", Globe.countryAt(178.5, -17.8))
        assertEquals("242", Globe.countryAt(179.5, -16.5))
        assertEquals("242", Globe.countryAt(179.2, -16.6))
        // the sea
        assertNull(Globe.countryAt(0.0, 0.0))
        assertNull(Globe.countryAt(-30.0, 30.0))
    }

    @Test fun `a tap on the screen goes through the projection to the right country`() {
        for (id in AtlasWorld.arab) {
            val c = AtlasWorld.country(id)!!
            // facing a country (as choosing it does), the middle of the globe is that country
            val ll = Globe.unproject(0.0, 0.0, c.lon, c.lat)!!
            assertEquals(id, Globe.countryAt(ll[0], ll[1]), c.ar)
        }
        val syria = AtlasWorld.country("760")!!
        val p = Globe.project(syria.lon, syria.lat, 10.0, 20.0)
        val back = Globe.unproject(p[0], p[1], 10.0, 20.0)!!
        assertEquals("760", Globe.countryAt(back[0], back[1]))
    }
}
