package org.sindibad.android.content

import kotlin.random.Random
import org.sindibad.android.domain.*

/** The gate remains the original social-island prerequisite, never a purchase. */
object Treasure {
    fun topic(seed: Int): Topic {
        val random = Random(seed)
        fun choose(questions: List<Question>, count: Int) = questions.shuffled(random).take(count)
        val arabic = ArabicTopics.all.filter { it.kind in listOf(ActivityKind.Word, ActivityKind.Sort, ActivityKind.Choice) }
            .flatMap { t -> t.questions.map { q -> Topics.reviewQuestion(t, q).copy(id = "review-arabic-${q.id}") } }
        val math = MathTopics.all.filter { it.id in listOf("math-percent", "math-fraction-ops", "math-ratio") }.flatMap { it.questions }
        val questions = choose(arabic, 2) + choose(math, 2) + choose(ReviewBank.science(), 2) +
            choose(ReviewBank.social(), 2) + choose(ReviewBank.art(), 1) + choose(ReviewBank.english(), 1)
        return Topic("review-treasure", "قفل الكنز", "مراجعة من كل الجزر", ActivityKind.Choice,
            listOf(LearnCard("الحكمة من الرحلة", "قفل الصندوق له عشرة أرقام سرية، وكل رقم سؤال من جزيرة زرتها. تذكّر جيداً!\nيمكنك مراجعة التلميح والشرح في كل سؤال.")) +
                questions.map { LearnCard("نتذكّر مع هُدهُد", it.hint) },
            questions, 10)
    }
}
