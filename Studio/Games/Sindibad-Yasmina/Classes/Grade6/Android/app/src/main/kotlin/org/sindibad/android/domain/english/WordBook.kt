package org.sindibad.android.domain.english

import org.sindibad.android.domain.Profile
import org.sindibad.android.domain.Vocabulary
import org.sindibad.android.domain.quest.Explore
import org.sindibad.android.domain.quest.Quest
import org.sindibad.android.domain.quest.QuestBook
import org.sindibad.android.domain.quest.Word
import kotlin.random.Random

// «دفتر كلماتي», the child's English word book (web: core/english/words.ts), per profile and local only.
//
// As on the web it holds every word met so far — the words of the quests the child has opened or finished,
// grouped by quest in the book's order, each word once — with its picture, its Arabic meaning, a sentence from
// the book and its sound, and a flash-card game (a picture and its Arabic meaning, three English words; the longest
// run of right cards is kept). The app adds the list the child keeps by hand (Profile.wordBook): ⭐ on a word adds
// it, ⭐ again removes it. Saves from before keep their words: an old entry has no quest or picture, and is shown
// under its quest when the book has the word, else under «كلمات أخرى».

/** One quest met so far and its words (each word once in the book). */
data class WordGroup(val quest: Quest?, val words: List<Word>)

/** The island's island id (QuestBooks). */
const val ENGLISH = "english"

object WordBook {
    /** Every word of a quest, in the order the book teaches them (web: wordsOf). */
    fun wordsOf(quest: Quest): List<Word> = quest.steps.filterIsInstance<Explore>().flatMap { it.words.orEmpty() }

    private fun key(en: String) = en.trim().lowercase()

    /** The quests met so far (opened or finished), in the book's order, and their words, each word once (web: metWords). */
    fun met(book: QuestBook, profile: Profile): List<WordGroup> {
        val seen = profile.englishSeen.toSet() + profile.islandQuests[ENGLISH].orEmpty()
        val have = HashSet<String>()
        return book.quests.filter { it.id in seen }.mapNotNull { q ->
            val words = wordsOf(q).filter { have.add(key(it.en)) }
            if (words.isEmpty()) null else WordGroup(q, words)
        }
    }

    /** Where a word is in the book: its quest and its card (the first quest that teaches it). */
    fun find(book: QuestBook, en: String): Pair<Quest, Word>? {
        val k = key(en)
        for (q in book.quests) wordsOf(q).firstOrNull { key(it.en) == k }?.let { return q to it }
        return null
    }

    /** A card of the book as a word book entry. */
    fun entry(word: Word, quest: Quest?) = Vocabulary(word.en, word.ar, word.ex, word.pic, quest?.id)

    /** The child's own list, grouped by quest in the book's order; old entries are placed by looking them up. */
    fun saved(book: QuestBook, profile: Profile): List<WordGroup> {
        val placed = profile.wordBook.map { v ->
            val found = (v.quest?.let { id -> book.quests.firstOrNull { it.id == id } }?.let { q -> wordsOf(q).firstOrNull { key(it.en) == key(v.en) }?.let { q to it } })
                ?: find(book, v.en)
            found?.first to Word(v.en, v.ar, v.pic ?: found?.second?.pic ?: "📝", v.sentence)
        }
        val order = book.quests.withIndex().associate { it.value.id to it.index }
        return placed.groupBy({ it.first }, { it.second })
            .entries.sortedBy { (q, _) -> q?.let { order[it.id] } ?: Int.MAX_VALUE }
            .map { (q, words) -> WordGroup(q, words) }
    }

    /** The words the flash cards play: every word met and every word kept, each once. */
    fun practice(book: QuestBook, profile: Profile): List<Word> {
        val have = HashSet<String>()
        return (met(book, profile).flatMap { it.words } + saved(book, profile).flatMap { it.words }).filter { have.add(key(it.en)) }
    }

    /** The flash cards need four words or more (web: the tab is disabled below four). */
    const val CARDS_MIN = 4

    /** A flash card: the word to find, and three English words to pick from (web: nextCard). */
    data class FlashCard(val word: Word, val options: List<Word>)

    fun card(pool: List<Word>, seed: Int): FlashCard {
        require(pool.size >= 2)
        val r = Random(seed)
        val shuffled = pool.shuffled(r)
        val word = shuffled[0]
        val opts = (listOf(word) + shuffled.drop(1).filter { key(it.en) != key(word.en) }.take(2)).shuffled(r)
        return FlashCard(word, opts)
    }
}

fun Profile.hasWord(en: String) = wordBook.any { it.en.trim().equals(en.trim(), ignoreCase = true) }

/** ⭐ adds a word to the child's list once (by its English, whatever its case). */
fun Profile.saveWord(word: Vocabulary) = if (hasWord(word.en)) this else copy(wordBook = wordBook + word)

/** ⭐ again takes it out (and any older copy of the same word). */
fun Profile.forgetWord(en: String) = copy(wordBook = wordBook.filterNot { it.en.trim().equals(en.trim(), ignoreCase = true) })

/** An English quest opened: its words join the word book (web: markSeen). Opening it again changes nothing. */
fun Profile.meetQuest(questId: String) = if (questId in englishSeen) this else copy(englishSeen = englishSeen + questId)

/** A run of right flash cards: the best one is kept. */
fun Profile.cardStreak(streak: Int) = if (streak > wordCardsBest) copy(wordCardsBest = streak) else this

/**
 * The HELLO sign on the beach (web: core/english/english.ts): a star bulb for each quest finished once (24), and
 * a letter of HELLO for every five (5, 10, 15, 20 and all 24). Counted from the finished quests, so it is saved
 * once and never twice.
 */
object HelloSign {
    val THRESHOLDS = listOf(5, 10, 15, 20, 24)
    const val WORD = "HELLO"
    fun letters(done: Int) = THRESHOLDS.count { done >= it }
    fun bulbs(profile: Profile) = profile.islandQuests[ENGLISH].orEmpty().size
}

/**
 * The phone's English voice (web: core/voice.ts findVoice): a British or American voice that works offline first,
 * then any other offline English voice; none means the lessons are read, not heard. Never a voice that needs the
 * network or is not installed.
 */
object VoicePick {
    data class Voice(val language: String, val country: String, val network: Boolean, val installed: Boolean)

    fun <T> choose(voices: List<T>, describe: (T) -> Voice): T? {
        val usable = voices.filter { v -> describe(v).let { it.language.lowercase() in setOf("en", "eng") && !it.network && it.installed } }
        return usable.firstOrNull { describe(it).country.uppercase() in setOf("GB", "US", "GBR", "USA") } ?: usable.firstOrNull()
    }
}
