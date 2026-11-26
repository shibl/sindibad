package org.sindibad.android.content

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.sindibad.android.domain.*

internal object IslandBooks {
    val regions = listOf("farm", "music", "science", "social", "art")
    private val books = regions.associateWith { region -> lazy {
        val resource = requireNotNull(javaClass.getResourceAsStream("/islands/$region.json"))
        val chapters = resource.bufferedReader().use { Json.decodeFromString<List<Chapter>>(it.readText()) }
        chapters.map { chapter ->
            Topic(chapter.id, chapter.title, chapter.blurb, ActivityKind.Choice, chapter.cards,
                chapter.questions.map { Question(it.id, it.prompt, it.choices, it.answer, it.hint, it.explanation) }, chapter.roundCount)
        }
    } }
    fun lessons(region: String) = books[region]?.value.orEmpty()

    @Serializable
    private data class Chapter(val id: String, val title: String, val blurb: String, val kind: String,
        val cards: List<LearnCard>, val questions: List<Prompt>, val roundCount: Int)
    @Serializable
    private data class Prompt(val id: String, val prompt: String, val choices: List<String>,
        val answer: List<Int>, val hint: String, val explanation: String)
}
