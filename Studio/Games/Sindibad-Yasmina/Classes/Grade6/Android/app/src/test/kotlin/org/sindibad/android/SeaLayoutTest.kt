package org.sindibad.android

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.sindibad.android.domain.islands
import org.sindibad.android.ui.sea.SeaLayout
import java.io.File
import kotlin.math.hypot

class SeaLayoutTest {
    // Pixel sizes of the map area under the app bar: small, common and large
    // phones, and a tablet on its side.
    private val screens = listOf(720.0 to 1250.0, 1080.0 to 1900.0, 1440.0 to 2700.0, 2000.0 to 1250.0)

    @Test fun `every island, its landmark included, fits on the screen`() {
        for ((w, h) in screens) {
            val fr = SeaLayout.fit(w, h)
            for (p in fr.framePoints().map(fr::project)) {
                assertTrue(p.ahead && p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h, "off screen at ${w.toInt()}×${h.toInt()}: $p")
            }
        }
    }

    @Test fun `the islands keep apart and fill the screen`() {
        for ((w, h) in screens) {
            val fr = SeaLayout.fit(w, h)
            val pts = fr.islands.values.toList()
            for (i in pts.indices) for (j in i + 1 until pts.size) {
                val gap = hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z)
                assertTrue(gap >= SeaLayout.RR * 1.6, "islands $i and $j overlap at ${w.toInt()}×${h.toInt()} ($gap)")
            }
            val ys = fr.framePoints().map { fr.project(it).y }
            assertTrue(ys.max() - ys.min() >= h * 0.75, "the sea uses most of the height at ${w.toInt()}×${h.toInt()}")
        }
    }

    @Test fun `a tap on an island finds that island`() {
        val fr = SeaLayout.fit(1080.0, 1900.0)
        for ((id, p) in fr.islands) {
            val at = fr.project(SeaLayout.V3(p.x, 1.0, p.z))
            assertEquals(id, SeaLayout.hit(fr, at.x, at.y))
        }
        assertEquals(null, SeaLayout.hit(fr, 2.0, 2.0))
    }

    @Test fun `every island of the game has a place on the sea`() {
        assertEquals(islands.map { it.id }.toSet() + "home", SeaLayout.positions.keys)
    }

    @Test fun `the positions match the web game's map`() {
        // Web/worlds/grade6.ts is the source; the native sea keeps in step.
        val web = File("../../Web/worlds/grade6.ts").readText()
        val found = Regex("""id: '(\w+)',[^\n]*?pos: \[([\d.]+), ([\d.]+)\]""").findAll(web)
            .associate { it.groupValues[1] to (it.groupValues[2].toDouble() to it.groupValues[3].toDouble()) }
        assertEquals(SeaLayout.positions, found.filterKeys { it in SeaLayout.positions })
        assertEquals(SeaLayout.positions.keys, found.keys.filter { it in SeaLayout.positions }.toSet())
    }
}
