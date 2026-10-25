package org.sindibad.android.domain

data class Cosmetic(val id: String, val slot: String, val variant: String, val title: String, val price: Int)
val cosmetics = listOf(
    Cosmetic("sail-rose", "sail", "rose", "شراع وردي", 15),
    Cosmetic("sail-sky", "sail", "sky", "شراع سماوي", 15),
    Cosmetic("sail-stripes", "sail", "stripes", "شراع مخطّط", 25),
    Cosmetic("sail-gold", "sail", "gold", "شراع ذهبي", 35),
    Cosmetic("flag-green", "flag", "green", "راية خضراء", 8),
    Cosmetic("flag-teal", "flag", "teal", "راية فيروزية", 8),
    Cosmetic("flag-gold", "flag", "gold", "راية ذهبية", 12),
    Cosmetic("outfit-teal", "outfit", "teal", "لباس فيروزي", 20),
    Cosmetic("outfit-purple", "outfit", "purple", "لباس بنفسجي", 20),
    Cosmetic("outfit-green", "outfit", "green", "لباس أخضر", 20),
    Cosmetic("outfit-navy", "outfit", "navy", "لباس كُحلي", 25),
    Cosmetic("hat-flower", "hat", "flower", "ياسمينة لهدهد", 15),
    Cosmetic("hat-fez", "hat", "fez", "طربوش لهدهد", 25),
    Cosmetic("hat-grad", "hat", "grad", "قبعة التخرّج", 35),
    Cosmetic("hat-crown", "hat", "crown", "تاج لهدهد", 50),
)

fun Profile.buyCosmetic(id: String): Profile {
    val item = cosmetics.first { it.id == id }
    if (id in owned) return wearCosmetic(item.slot, id)
    require(pearls >= item.price) { "Not enough earned pearls" }
    return copy(pearls = pearls - item.price, owned = owned + id, style = style + (item.slot to id))
}
fun Profile.wearCosmetic(slot: String, id: String?): Profile {
    require(slot in listOf("sail", "flag", "outfit", "hat"))
    if (id == null) return copy(style = style - slot)
    require(id in owned && cosmetics.any { it.id == id && it.slot == slot })
    return copy(style = style + (slot to id))
}
fun Profile.variant(slot: String) = cosmetics.find { it.id == style[slot] }?.variant ?: "original"
