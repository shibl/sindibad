package org.sindibad.android

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.sindibad.android.data.GameRepository
import org.sindibad.android.domain.*
import java.io.File

class RepositoryTest {
    @TempDir lateinit var dir: File

    @Test fun `profiles and settings survive closing and reopening the store`() = runTest {
        val file = File(dir, "game.preferences_pb")
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        val repository = GameRepository(PreferenceDataStoreFactory.create(scope = scope, produceFile = { file }))
        val one = Profile("one", "مغامر", Hero.Sindbad, pearls = 100, preferences = Preferences(sound = false, largeText = true))
            .buyCosmetic("outfit-navy").copy(guardians = setOf("math"), certificateEarned = true)
        val two = Profile("two", "مغامرة", Hero.Yasmina)
        repository.update { GameStore(activeId = one.id, profiles = listOf(one, two)) }
        scope.coroutineContext[Job]!!.cancelAndJoin()
        val reopenedScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        try {
            val reopened = GameRepository(PreferenceDataStoreFactory.create(scope = reopenedScope, produceFile = { file }))
            assertEquals(one, reopened.states.first().active)
            reopened.update { it.copy(activeId = two.id) }
            assertEquals(two, reopened.states.first().active)
            assertEquals(one, reopened.states.first().profiles.first())
        } finally { reopenedScope.coroutineContext[Job]!!.cancelAndJoin() }
    }

    @Test fun `concurrent writes retain every profile`() = runTest {
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        try {
            val repository = GameRepository(PreferenceDataStoreFactory.create(scope = scope, produceFile = { File(dir, "concurrent.preferences_pb") }))
            coroutineScope {
                (1..12).map { id -> async {
                    repository.update { it.copy(profiles = it.profiles + Profile(id.toString(), "مغامر", Hero.Sindbad)) }
                } }.awaitAll()
            }
            assertEquals(12, repository.states.first().profiles.size)
        } finally { scope.coroutineContext[Job]!!.cancelAndJoin() }
    }

    @Test fun `two concurrent purchase requests only charge once`() = runTest {
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        try {
            val repository = GameRepository(PreferenceDataStoreFactory.create(scope = scope, produceFile = { File(dir, "shop.preferences_pb") }))
            repository.update { GameStore(activeId = "one", profiles = listOf(Profile("one", "مغامر", Hero.Sindbad, pearls = 35))) }
            coroutineScope {
                List(2) { async { repository.update { it.updateProfile("one") { p -> p.buyCosmetic("sail-gold") } } } }.awaitAll()
            }
            val saved = repository.states.first().active!!
            assertEquals(0, saved.pearls)
            assertEquals(setOf("sail-gold"), saved.owned)
            assertEquals("sail-gold", saved.style["sail"])
        } finally { scope.coroutineContext[Job]!!.cancelAndJoin() }
    }
}
