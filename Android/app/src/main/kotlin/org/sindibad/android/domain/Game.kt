package org.sindibad.android.domain

import kotlinx.serialization.Serializable
import kotlin.random.Random

@Serializable
enum class Hero(val arabic: String, val asset: String) {
    Sindbad("سندباد", "sindbad"), Yasmina("ياسمينة", "yasmina")
}

@Serializable
data class Preferences(val sound: Boolean = true, val haptics: Boolean = true, val calm: Boolean = false, val largeText: Boolean = false)

@Serializable
data class TopicRecord(val stars: Int = 0, val best: Float = 0f, val plays: Int = 0, val missed: List<String> = emptyList())

@Serializable
data class Profile(
    val id: String,
    val name: String,
    val hero: Hero,
    val topics: Map<String, TopicRecord> = emptyMap(),
    val pearls: Int = 0,
    val preferences: Preferences = Preferences(),
    val completedSessions: List<String> = emptyList(),
    val guardians: Set<String> = emptySet(),
    val owned: Set<String> = emptySet(),
    val style: Map<String, String> = emptyMap(),
    val certificateEarned: Boolean = false,
) {
    val totalStars get() = topics.values.sumOf { it.stars }
    fun starsIn(region: String) = topics.filterKeys { it.startsWith("$region-") || (region == "treasure" && it == "review-treasure") }.values.sumOf { it.stars }
}

@Serializable
data class GameStore(val version: Int = 1, val activeId: String? = null, val profiles: List<Profile> = emptyList()) {
    val active get() = profiles.find { it.id == activeId }
    fun updateProfile(id: String, update: (Profile) -> Profile): GameStore {
        require(profiles.any { it.id == id }) { "Unknown profile" }
        return copy(profiles = profiles.map { if (it.id == id) update(it) else it })
    }
    fun complete(session: LessonSession): GameStore {
        require(session.finished)
        return updateProfile(session.profileId) { p ->
            if (session.id in p.completedSessions) p else if (session.guardian) {
                val region = session.topicId.removePrefix("guardian-")
                val won = session.guardianHealth == 0
                p.copy(
                    pearls = p.pearls + if (won) { if (region in p.guardians) 5 else 20 } else 0,
                    guardians = if (won) p.guardians + region else p.guardians,
                    completedSessions = (p.completedSessions + session.id).takeLast(128),
                )
            } else {
                val prev = p.topics[session.topicId] ?: TopicRecord()
                val stars = starsFor(session.correct, session.questionIds.size)
                val missed = (prev.missed - session.questionIds.toSet() + session.missed).distinct().takeLast(30)
                p.copy(
                    pearls = p.pearls + (stars - prev.stars).coerceAtLeast(0) * 5,
                    topics = p.topics + (session.topicId to TopicRecord(
                        stars = maxOf(prev.stars, stars),
                        best = maxOf(prev.best, session.correct.toFloat() / session.questionIds.size),
                        plays = prev.plays + 1, missed = missed,
                    )),
                    completedSessions = (p.completedSessions + session.id).takeLast(128),
                    certificateEarned = p.certificateEarned || (session.topicId == "review-treasure" && stars >= 1),
                )
            }
        }
    }
}

fun starsFor(correct: Int, total: Int): Int {
    require(correct >= 0 && total >= 0 && correct <= total)
    if (total == 0) return 0
    val ratio = correct.toDouble() / total
    return when { ratio >= .9 -> 3; ratio >= .7 -> 2; ratio >= .5 -> 1; else -> 0 }
}

data class Island(
    val id: String, val name: String, val subject: String, val art: String,
    val color: Long, val requires: String? = null, val nativeReady: Boolean = false,
) {
    fun unlocked(profile: Profile) = requires == null || profile.starsIn(requires) >= 2
}

val islands = listOf(
    Island("arabic", "جزيرة الحروف", "اللغة العربية", "letters", 0xFFD0507E, nativeReady = true),
    Island("farm", "مزرعتي السعيدة", "التربية الزراعية", "farm", 0xFF6AA84F),
    Island("music", "جزيرة الأنغام", "التربية الموسيقية", "music", 0xFF8A63C9),
    Island("math", "جزيرة الأرقام", "الرياضيات", "numbers", 0xFFC7373F, "arabic", nativeReady = true),
    Island("art", "جزيرة الألوان", "التربية الفنية", "palette", 0xFFE2543A),
    Island("science", "جزيرة العلوم", "العلوم", "science", 0xFF2F8A5F, "math"),
    Island("social", "جزيرة الأطلس", "الدراسات الاجتماعية", "atlas", 0xFFC98D1C, "science"),
    Island("english", "جزيرة Hello", "اللغة الإنكليزية", "english", 0xFF2F6FD0, "math"),
    Island("treasure", "جزيرة الكنز", "مراجعة شاملة", "treasure", 0xFFE0A93A, "social", nativeReady = true),
)

data class LearnCard(val title: String, val text: String, val example: List<String> = emptyList(), val labels: List<String> = emptyList(), val art: List<String> = emptyList())
enum class ActivityKind { Word, Sort, Choice, Build, NumberLine, Angle, Fill, Market }
data class NumberControl(val min: Double, val max: Double, val ticks: Int, val acceptable: IntRange? = null) {
    init { require(min.isFinite() && max.isFinite() && min < max && ticks in 1..1000) }
    fun value(index: Int) = min + (max - min) * index / ticks
    fun label(index: Int): String {
        val v = value(index)
        return if (v % 1.0 == 0.0) v.toInt().toString().replace('-', '−')
        else java.math.BigDecimal.valueOf(v).setScale(3, java.math.RoundingMode.HALF_UP).stripTrailingZeros().toPlainString().replace('-', '−')
    }
}
data class Question(
    val id: String, val prompt: String, val choices: List<String>, val answer: List<Int>,
    val hint: String, val explanation: String, val stimulus: String = "",
    val slots: List<String> = emptyList(),
    val art: List<String> = emptyList(), val number: NumberControl? = null,
) {
    fun valid(answer: List<Int>) = if (number != null) answer.size == 1 && answer[0] in 0..number.ticks
        else answer.size == this.answer.size && answer.all { it in choices.indices }
    fun accepts(answer: List<Int>) = valid(answer) &&
        (number?.acceptable?.let { answer.single() in it } ?: (answer == this.answer))
    fun numberLabel(index: Int): String = when {
        id.startsWith("math-fractions-line-") -> "$index/${(number!!.ticks / (number.max - number.min)).toInt()}"
        id.startsWith("math-equivalent-") -> "$index/${number!!.ticks}"
        else -> requireNotNull(number).label(index)
    }
    fun answerText() = if (number != null) numberLabel(answer.single())
        else answer.joinToString(" ") { choices[it] }
}
data class Topic(
    val id: String, val title: String, val blurb: String, val kind: ActivityKind,
    val cards: List<LearnCard>, val questions: List<Question>, val roundCount: Int,
) {
    init {
        require(cards.isNotEmpty() && questions.size >= roundCount && roundCount > 0)
        require(questions.map { it.id }.distinct().size == questions.size)
        require(questions.all { q ->
            (q.number != null || q.choices.size >= 2) && q.answer.isNotEmpty() && q.accepts(q.answer) &&
                q.hint.isNotBlank() && q.explanation.isNotBlank() &&
                (kind != ActivityKind.Build || q.answer.size == q.slots.size)
        })
    }
}

@Serializable
enum class Phase { Learn, Question, Result }

/** Immutable session state; UI recomposition cannot advance or award a lesson. */
@Serializable
data class LessonSession(
    val id: String, val profileId: String, val topicId: String,
    val questionIds: List<String>, val seed: Int,
    val phase: Phase = Phase.Learn, val cardIndex: Int = 0,
    val reviewing: Boolean = false, val index: Int = 0,
    val attempts: Int = 0, val resolved: Boolean = false,
    val correct: Int = 0, val missed: List<String> = emptyList(),
    val selection: List<Int> = emptyList(), val lastCorrect: Boolean? = null,
    val payment: List<Int> = emptyList(),
    val guardianHealth: Int = 100, val hearts: Int = 3, val streak: Int = 0,
) {
    val finished get() = phase == Phase.Result
    val guardian get() = topicId.startsWith("guardian-")
    fun nextCard(topic: Topic): LessonSession {
        require(phase == Phase.Learn)
        return if (cardIndex + 1 < topic.cards.size) copy(cardIndex = cardIndex + 1)
        else copy(phase = Phase.Question, reviewing = false)
    }
    fun review() = if (phase == Phase.Question) copy(phase = Phase.Learn, cardIndex = 0, reviewing = true) else this
    fun returnToQuestion() = if (reviewing) copy(phase = Phase.Question, reviewing = false) else this
    fun choose(choice: Int, topic: Topic): LessonSession {
        if (phase != Phase.Question || resolved) return this
        val q = currentQuestion(topic)
        if (choice !in q.choices.indices) return this
        return if (topic.kind == ActivityKind.Build) {
            if (choice in selection) copy(selection = selection - choice, lastCorrect = null)
            else if (selection.size < q.answer.size) copy(selection = selection + choice, lastCorrect = null) else this
        } else submit(listOf(choice), topic)
    }
    fun selectNumber(index: Int, topic: Topic): LessonSession {
        val n = currentQuestion(topic).number ?: return this
        if (phase != Phase.Question || resolved) return this
        return copy(selection = listOf(index.coerceIn(0, n.ticks)), lastCorrect = null)
    }
    fun pay(coin: Int, add: Boolean, topic: Topic): LessonSession {
        if (phase != Phase.Question || resolved || topic.kind != ActivityKind.Market || coin !in coins) return this
        val next = if (add) payment + coin else payment.toMutableList().apply { remove(coin) }
        if (next.size > 200 || next.sum() > 1000) return this
        return copy(payment = next, selection = listOf(next.sum()), lastCorrect = null)
    }
    fun submit(answer: List<Int>, topic: Topic): LessonSession {
        if (phase != Phase.Question || resolved) return this
        val q = currentQuestion(topic)
        if (!q.valid(answer)) return this
        val right = q.accepts(answer)
        val done = guardian || right || attempts >= 1
        val nextStreak = if (right) streak + 1 else 0
        return copy(
            attempts = attempts + 1, resolved = done, lastCorrect = right,
            correct = correct + if (right && attempts == 0) 1 else 0,
            missed = if (!right) (missed + q.id).distinct() else missed,
            selection = if (topic.kind == ActivityKind.Build && !right && !done) emptyList() else answer,
            guardianHealth = if (guardian && right) (guardianHealth - if (nextStreak >= 3) 30 else 20).coerceAtLeast(0) else guardianHealth,
            hearts = if (guardian && !right) (hearts - 1).coerceAtLeast(0) else hearts,
            streak = nextStreak,
        )
    }
    fun advance(): LessonSession {
        if (!resolved || phase != Phase.Question) return this
        return if (index == questionIds.lastIndex || (guardian && (guardianHealth == 0 || hearts == 0))) copy(phase = Phase.Result)
        else copy(index = index + 1, attempts = 0, resolved = false, selection = emptyList(), payment = emptyList(), lastCorrect = null)
    }
    fun currentQuestion(topic: Topic) = topic.questions.first { it.id == questionIds[index] }
    fun choiceOrder(topic: Topic): List<Int> {
        val q = currentQuestion(topic)
        // Sentence word order is meaningful; quizzes and block trays are shuffled.
        return if (topic.kind == ActivityKind.Word || topic.kind == ActivityKind.Sort) q.choices.indices.toList()
        else q.choices.indices.shuffled(Random(seed + index))
    }
    companion object {
        val coins = listOf(100, 50, 20, 10, 5, 1)
        fun start(id: String, profile: Profile, topic: Topic, seed: Int): LessonSession {
            val random = Random(seed)
            val missed = profile.topics[topic.id]?.missed.orEmpty().toSet()
            val priority = topic.questions.filter { it.id in missed }.shuffled(random).take((topic.roundCount + 1) / 2)
            val remaining = topic.questions.filter { it !in priority }.shuffled(random).take(topic.roundCount - priority.size)
            return LessonSession(id, profile.id, topic.id, (priority + remaining).map { it.id }, seed)
        }
    }
}
