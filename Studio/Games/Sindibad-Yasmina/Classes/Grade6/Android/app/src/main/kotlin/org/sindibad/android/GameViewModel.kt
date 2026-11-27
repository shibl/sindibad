package org.sindibad.android

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.sindibad.android.content.QuestBooks
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import org.sindibad.android.domain.quest.*
import java.util.UUID
import kotlin.random.Random

enum class Screen { English, Art, Atlas, Science, Home, Voyages, Sea, Music, Farm, Arabic, Math, Treasure, Review, Shop, Certificate, Lesson, Quest, Journey, Settings, Profiles, About, Globe }

data class AppUiState(
    val loading: Boolean = true, val store: GameStore = GameStore(),
    val screen: Screen = Screen.Home, val session: LessonSession? = null,
    /** The island quest being played (music…), kept like a lesson session; its reward once saved. */
    val quest: QuestRun? = null, val questReward: QuestReward? = null,
    val busy: Boolean = false, val error: String? = null,
)

class GameViewModel(private val repository: GameRepository, private val saved: SavedStateHandle) : ViewModel() {
    private val json = GameRepository.json
    private val restoredSession = saved.get<String>("session")?.let {
        runCatching { json.decodeFromString<LessonSession>(it) }.getOrNull()
    }
    private val restoredQuest = saved.get<String>("quest")?.let { runCatching { json.decodeFromString<QuestRun>(it) }.getOrNull() }
        ?.takeIf { QuestBooks.has(it.island) && runCatching { it.step(QuestBooks.get(it.island)) }.isSuccess }
    private val mutable = MutableStateFlow(AppUiState(
        screen = saved.get<String>("screen")?.let { runCatching { Screen.valueOf(it) }.getOrNull() } ?: Screen.Home,
        session = restoredSession,
        quest = restoredQuest,
        questReward = saved.get<String>("questReward")?.let { runCatching { json.decodeFromString<QuestReward>(it) }.getOrNull() },
    ))
    val ui = mutable.asStateFlow()
    private var loadJob: Job? = null
    init { retryLoad() }

    fun retryLoad() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            mutable.update { it.copy(loading = true, error = null) }
            try {
                repository.states.collect { store ->
                    mutable.update { it.copy(store = store, loading = false) }
                    if (store.active == null && mutable.value.screen != Screen.Home && mutable.value.screen != Screen.Profiles) goHome()
                    if (mutable.value.session?.profileId != store.activeId) setSession(null)
                    if (mutable.value.screen == Screen.Lesson && mutable.value.session == null) goHome()
                    if (mutable.value.quest?.profileId.let { it != null && it != store.activeId }) setQuest(null)
                    if (mutable.value.screen == Screen.Quest && mutable.value.quest == null) goHome()
                }
            } catch (cancel: CancellationException) {
                throw cancel
            } catch (_: Exception) {
                mutable.update { it.copy(loading = false, error = "تعذّر قراءة التقدّم المحفوظ. لم نحذف بياناتك. حاول مرة أخرى.") }
            }
        }
    }

    private fun transact(action: suspend () -> Unit) {
        if (mutable.value.busy) return
        mutable.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try { action() }
            catch (cancel: CancellationException) { throw cancel }
            catch (_: Exception) { mutable.update { it.copy(error = "تعذّر حفظ التغيير. حاول مرة أخرى قبل المغادرة.") } }
            finally { mutable.update { it.copy(busy = false) } }
        }
    }
    fun dismissError() { mutable.update { it.copy(error = null) } }

    fun navigate(screen: Screen) {
        if (screen == mutable.value.screen) return
        val history = saved.get<ArrayList<String>>("history") ?: arrayListOf()
        saved["history"] = ArrayList(history + mutable.value.screen.name)
        setScreen(screen)
    }
    private fun setScreen(screen: Screen) {
        saved["screen"] = screen.name
        mutable.update { it.copy(screen = screen) }
    }
    fun back() {
        val history = saved.get<ArrayList<String>>("history").orEmpty()
        if (history.isEmpty()) setScreen(Screen.Home) else {
            saved["history"] = ArrayList(history.dropLast(1))
            setScreen(Screen.valueOf(history.last()))
        }
    }
    fun goHome() { saved["history"] = arrayListOf<String>(); setScreen(Screen.Home) }
    private fun setSession(session: LessonSession?) {
        saved["session"] = session?.let { json.encodeToString(it) }
        mutable.update { it.copy(session = session) }
    }

    private fun setQuest(run: QuestRun?, reward: QuestReward? = null) {
        saved["quest"] = run?.let { json.encodeToString(it) }
        saved["questReward"] = reward?.let { json.encodeToString(it) }
        mutable.update { it.copy(quest = run, questReward = reward) }
    }

    /** Opens an island quest; an unfinished run of the same quest resumes where it was left. */
    fun startQuest(island: String, questId: String) {
        val profile = mutable.value.store.active ?: return
        if (!QuestBooks.has(island)) return
        val book = QuestBooks.get(island)
        val quest = book.quests.firstOrNull { it.id == questId } ?: return
        val run = mutable.value.quest
        if (run == null || run.island != island || run.questId != questId || run.profileId != profile.id || run.finished) {
            setQuest(QuestRun.start(UUID.randomUUID().toString(), profile.id, island, quest, Random.nextInt(1, Int.MAX_VALUE / 64)))
        }
        navigate(Screen.Quest)
    }
    private fun updateQuest(change: (QuestRun, QuestBook) -> QuestRun) {
        val run = mutable.value.quest ?: return
        val next = change(run, QuestBooks.get(run.island))
        if (next != run) setQuest(next, mutable.value.questReward)
        if (next.finished && !run.finished) saveQuest()
    }
    fun questTap(value: String) = updateQuest { run, book -> run.tap(book, value) }
    fun questDrum(tapsMs: List<Long>) = updateQuest { run, book -> run.drum(book, tapsMs) }
    fun questUndo() = updateQuest { run, book -> run.undo(book) }
    /** «تابِع» / «فهمت!»: the next step, or the end of the quest (then saved once). */
    fun questNext() = updateQuest { run, book -> run.next(book) }
    /** Saves a finished quest (idempotent: a retry after a failed save changes nothing twice). */
    fun saveQuest() = transact {
        val run = mutable.value.quest?.takeIf { it.finished } ?: return@transact
        val book = QuestBooks.get(run.island)
        var reward: QuestReward? = null
        repository.update { store ->
            val before = store.profiles.firstOrNull { it.id == run.profileId } ?: return@update store
            if (run.id in before.completedSessions) return@update store
            val after = store.finishQuest(run, book)
            val p = after.profiles.first { it.id == run.profileId }
            reward = QuestReward(run.id, run.stars, first = !before.questDone(run.island, run.questId), pearls = p.pearls - before.pearls,
                sticker = (p.stickers - before.stickers.toSet()).firstOrNull())
            after
        }
        reward?.let { setQuest(mutable.value.quest, it) }
    }
    /** The island's helper has said hello: next time it says «back». */
    fun meetHelper(island: String) = updateFarm { store, id -> store.updateProfile(id) { p -> if (island in p.helpersMet) p else p.copy(helpersMet = p.helpersMet + island) } }

    /** A country's card opened on the atlas globe: remembered once per profile (the passport counts the Arab ones). */
    fun visitCountry(id: String) = updateFarm { store, pid -> store.updateProfile(pid) { p -> p.visit(id) } }

    fun createProfile(hero: Hero, name: String) = transact {
        val profile = Profile(UUID.randomUUID().toString(), name.trim().take(20).ifEmpty { hero.arabic }, hero)
        repository.update { it.copy(activeId = profile.id, profiles = it.profiles + profile) }
        setSession(null)
        goHome()
        navigate(Screen.Voyages)
    }
    fun switchProfile(id: String) = transact {
        repository.update { store ->
            require(store.profiles.any { it.id == id })
            store.copy(activeId = id)
        }
        setSession(null)
        goHome()
    }
    /**
     * Farm actions are saved one after another, never dropped while a save is running: a child tapping tools
     * quickly must not lose a tap, and every action is on disk before the next (process-death safe).
     */
    private val farmSaves = Mutex()
    private fun updateFarm(change: (GameStore, String) -> GameStore) {
        val id = mutable.value.store.activeId ?: return
        viewModelScope.launch {
            try { farmSaves.withLock { repository.update { if (it.profiles.any { p -> p.id == id }) change(it, id) else it } } }
            catch (cancel: CancellationException) { throw cancel }
            catch (_: Exception) { mutable.update { it.copy(error = "تعذّر حفظ التغيير. حاول مرة أخرى قبل المغادرة.") } }
        }
    }
    fun updateBarn(change: (Barn) -> Barn) = updateFarm { store, id -> store.updateProfile(id) { p -> p.copy(barn = change(p.barn)) } }
    fun farmWithBook(change: (Barn, Set<String>) -> Barn) = updateFarm { store, id -> store.updateProfile(id) { p -> p.copy(barn = change(p.barn, p.topics.keys)) } }
    fun startFarm(place: String, questId: String) = updateFarm { store, id ->
        store.updateProfile(id) { p ->
            val quest = FarmBook.book.quest(questId)
            val runId = UUID.randomUUID().toString()
            val review = LessonSession.start(runId, p, Topics.get(quest.topic), Random.nextInt()).questionIds
            p.copy(barn = p.barn.start(place, questId, runId, review, p.topics.keys))
        }
    }
    fun finishFarm(place: String) = updateFarm { store, id -> store.finishFarm(id, place) }
    fun preferences(value: Preferences) = transact {
        val id = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(id) { p -> p.copy(preferences = value) } }
    }
    fun startTopic(id: String) {
        val profile = mutable.value.store.active ?: return
        val region = if (id == "review-treasure") "treasure" else id.substringBefore('-')
        if (id.startsWith("guardian-")) {
            if (!Topics.guardianReady(profile, id.removePrefix("guardian-"))) return
        } else if (islands.any { it.id == region && !it.nativeReady }) return
        val seed = Random.nextInt()
        val topic = Topics.get(id, seed)
        val session = mutable.value.session
        if (session == null || session.topicId != id || session.profileId != profile.id || session.finished) {
            setSession(LessonSession.start(UUID.randomUUID().toString(), profile, topic, seed))
        }
        navigate(Screen.Lesson)
    }
    private fun updateSession(change: (LessonSession) -> LessonSession) {
        mutable.value.session?.let { setSession(change(it)) }
    }
    fun nextCard() = updateSession { it.nextCard(Topics.get(it.topicId, it.seed)) }
    fun previousCard() = updateSession { it.copy(cardIndex = (it.cardIndex - 1).coerceAtLeast(0)) }
    fun review() = updateSession { it.review() }
    fun returnToQuestion() = updateSession { it.returnToQuestion() }
    fun choose(index: Int) = updateSession { it.choose(index, Topics.get(it.topicId, it.seed)) }
    fun selectNumber(index: Int) = updateSession { it.selectNumber(index, Topics.get(it.topicId, it.seed)) }
    fun pay(coin: Int, add: Boolean) = updateSession { it.pay(coin, add, Topics.get(it.topicId, it.seed)) }
    fun clearPayment() = updateSession { if (!it.resolved && it.phase == Phase.Question) it.copy(payment = emptyList(), selection = listOf(0), lastCorrect = null) else it }
    fun submit() = updateSession {
        val topic = Topics.get(it.topicId, it.seed)
        val answer = if (it.selection.isEmpty() && it.currentQuestion(topic).number != null) listOf(0) else it.selection
        it.submit(answer, topic)
    }
    fun nextQuestion() = updateSession { it.advance() }
    fun saveResult() = transact {
        val session = mutable.value.session ?: return@transact
        repository.update { it.complete(session) }
    }
    fun bookmarkWord(word: Vocabulary) = transact {
        val profileId = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(profileId) { profile -> profile.copy(wordBook = (profile.wordBook + word).distinct()) } }
    }
    fun savePainting(id: String, pixels: List<Int>) = transact {
        val profileId = mutable.value.store.activeId ?: return@transact
        require(pixels.size == 64 && pixels.all { it in 0..11 })
        repository.update { it.updateProfile(profileId) { profile -> profile.copy(gallery = profile.gallery + (id to pixels)) } }
    }
    fun buy(id: String) = transact {
        val profileId = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(profileId) { p -> p.buyCosmetic(id) } }
    }
    fun wear(slot: String, id: String?) = transact {
        val profileId = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(profileId) { p -> p.wearCosmetic(slot, id) } }
    }
}
