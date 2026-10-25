package org.sindibad.android.content

import org.sindibad.android.domain.*

object Topics {
    fun reviewQuestion(topic: Topic, q: Question): Question = q.copy(
        prompt = if (topic.kind == ActivityKind.Word) "في جملة «${q.choices.joinToString(" ")}»، ${q.prompt}"
            else listOf(q.prompt, q.stimulus).filter { it.isNotEmpty() }.joinToString("\n"),
        stimulus = "",
    )
    val all get() = ArabicTopics.all + MathTopics.all
    fun inRegion(region: String) = all.filter { it.id.startsWith("$region-") }
    fun get(id: String, seed: Int = 0): Topic = when {
        id.startsWith("math-") -> MathTopics.get(id, seed)
        id.startsWith("guardian-") -> guardian(id.removePrefix("guardian-"), seed)
        id == "review-treasure" -> Treasure.topic(seed)
        else -> ArabicTopics.get(id)
    }
    fun guardianReady(profile: Profile, region: String) =
        inRegion(region).isNotEmpty() && inRegion(region).all { (profile.topics[it.id]?.stars ?: 0) >= 1 }
    fun reviewTopics(profile: Profile): List<Topic> = all.filter { (profile.topics[it.id]?.plays ?: 0) > 0 }
        .sortedWith(compareByDescending<Topic> { profile.topics[it.id]?.missed?.size ?: 0 }
            .thenBy { profile.topics[it.id]?.best ?: 0f }.thenBy { profile.topics[it.id]?.plays ?: 0 })

    private fun guardian(region: String, seed: Int): Topic {
        require(region in listOf("arabic", "math"))
        val sources = inRegion(region).map { get(it.id, seed) }
        val questions = sources.filter { it.kind in listOf(ActivityKind.Choice, ActivityKind.Word, ActivityKind.Sort) }
            .flatMap { topic -> topic.questions.map { q -> reviewQuestion(topic, q) } }
        return Topic("guardian-$region", if (region == "math") "تحدّي حارس الأرقام" else "تحدّي حارس الحروف",
            "أطلق النجوم بما تعلّمته", ActivityKind.Choice,
            listOf(LearnCard("تحدٍّ وديّ", "أجب من المحاولة الأولى لتطلق النجوم. معك 3 قلوب؛ يمكنك العودة للشرح والتلميح في أي وقت.\nلا مؤقّت ولا خسارة للآلئ عند إعادة المحاولة.")),
            questions, minOf(14, questions.size))
    }
}
