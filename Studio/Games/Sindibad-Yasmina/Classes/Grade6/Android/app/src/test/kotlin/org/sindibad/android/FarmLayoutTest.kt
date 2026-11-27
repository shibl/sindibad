package org.sindibad.android

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.sindibad.android.domain.FarmBook
import org.sindibad.android.ui.farm.FarmLayout

class FarmLayoutTest {
    @Test fun `every place is a separate touch target of at least 48dp on a 320dp phone`() {
        val unit = 320f / FarmLayout.SIZE
        val places = FarmLayout.places
        assertTrue(places.keys.containsAll(FarmBook.plots + FarmBook.taskPlaces + listOf("barn", "board", "dock")))
        for ((id, r) in places) {
            assertTrue(r.w * unit >= 48f && r.h * unit >= 48f, id)
            assertTrue(r.x >= 0 && r.y >= 0 && r.right <= FarmLayout.SIZE && r.bottom <= FarmLayout.SIZE, id)
            assertEquals(id, FarmLayout.hit(r.cx, r.cy))
        }
        val list = places.entries.toList()
        for (i in list.indices) for (j in i + 1 until list.size) assertFalse(list[i].value.overlaps(list[j].value), "${list[i].key} ${list[j].key}")
    }

    @Test fun `every decoration has a spot in the scene, clear of the places`() {
        assertEquals(FarmBook.book.decorations.keys, FarmLayout.decor.keys)
        for ((id, spots) in FarmLayout.decor) for ((x, y) in spots) {
            assertTrue(x in 0f..FarmLayout.SIZE && y in 0f..FarmLayout.SIZE, id)
            assertNull(FarmLayout.hit(x, y), id)
        }
    }
}
