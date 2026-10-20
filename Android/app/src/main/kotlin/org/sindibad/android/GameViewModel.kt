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
import org.sindibad.android.content.Topics
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import java.util.UUID
import kotlin.random.Random

enum class Screen { Home, Voyages, Sea, Arabic, Math, Treasure, Review, Shop, Certificate, Lesson, Journey, Settings, Profiles, About }

data class AppUiState(
    val loading: Boolean = true, val store: GameStore = GameStore(),
    val screen: Screen = Screen.Home, val session: LessonSession? = null,
    val busy: Boolean = false, val error: String? = null,
)

class GameViewModel(private val repository: GameRepository, private val saved: SavedStateHandle) : ViewModel() {
    private val json = GameRepository.json
    private val restoredSession = saved.get<String>("session")?.let {
        runCatching { json.decodeFromString<LessonSession>(it) }.getOrNull()
    }
    private val mutable = MutableStateFlow(AppUiState(
        screen = saved.get<String>("screen")?.let { runCatching { Screen.valueOf(it) }.getOrNull() } ?: Screen.Home,
        session = restoredSession,
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
    fun preferences(value: Preferences) = transact {
        val id = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(id) { p -> p.copy(preferences = value) } }
    }
    fun startTopic(id: String) {
        val profile = mutable.value.store.active ?: return
        val region = if (id == "review-treasure") "treasure" else id.substringBefore('-')
        if (id.startsWith("guardian-")) {
            if (!Topics.guardianReady(profile, id.removePrefix("guardian-"))) return
        } else if (islands.any { it.id == region && (!it.nativeReady || !it.unlocked(profile)) }) return
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
    fun buy(id: String) = transact {
        val profileId = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(profileId) { p -> p.buyCosmetic(id) } }
    }
    fun wear(slot: String, id: String?) = transact {
        val profileId = mutable.value.store.activeId ?: return@transact
        repository.update { it.updateProfile(profileId) { p -> p.wearCosmetic(slot, id) } }
    }
}
