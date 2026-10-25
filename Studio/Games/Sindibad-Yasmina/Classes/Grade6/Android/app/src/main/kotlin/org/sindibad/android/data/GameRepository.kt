package org.sindibad.android.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import org.sindibad.android.domain.GameStore
import org.sindibad.android.domain.cosmetics

/** One atomic, versioned local document. Failed/corrupt reads never overwrite saves. */
class GameRepository(private val store: DataStore<Preferences>) {
    val states: Flow<GameStore> = store.data.map { decode(it[Key]) }

    suspend fun update(change: (GameStore) -> GameStore) {
        store.edit { preferences ->
            preferences[Key] = json.encodeToString(change(decode(preferences[Key])))
        }
    }

    companion object {
        private val Key = stringPreferencesKey("game.v1")
        val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
        fun decode(raw: String?): GameStore {
            if (raw == null) return GameStore()
            return json.decodeFromString<GameStore>(raw).also { data ->
                require(data.version == 1) { "Unsupported save version" }
                require(data.profiles.map { it.id }.distinct().size == data.profiles.size)
                require(data.activeId == null || data.profiles.any { it.id == data.activeId })
                require(data.profiles.all { p -> p.pearls >= 0 && p.topics.values.all { it.stars in 0..3 && it.best in 0f..1f && it.plays >= 0 } })
                require(data.profiles.all { p -> p.style.all { (slot, id) ->
                    id in p.owned && cosmetics.any { it.id == id && it.slot == slot }
                } })
            }
        }
    }
}
