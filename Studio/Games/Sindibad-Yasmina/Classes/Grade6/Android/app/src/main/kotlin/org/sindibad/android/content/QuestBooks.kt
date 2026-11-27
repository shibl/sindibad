package org.sindibad.android.content

import org.sindibad.android.domain.quest.QuestBook

/** Islands played as quests (resources/islands/<region>-quests.json, made by tools/import-quests.mjs). */
object QuestBooks {
    val regions = listOf("music")
    private val books = regions.associateWith { region -> lazy {
        val resource = requireNotNull(javaClass.getResourceAsStream("/islands/$region-quests.json")) { "No quests for $region" }
        QuestBook.decode(resource.bufferedReader().use { it.readText() })
    } }
    fun has(region: String) = region in books
    fun get(region: String): QuestBook = requireNotNull(books[region]) { "No quests for $region" }.value
}
