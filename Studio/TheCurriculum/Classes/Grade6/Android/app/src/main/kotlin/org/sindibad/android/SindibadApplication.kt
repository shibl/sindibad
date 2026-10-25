package org.sindibad.android

import android.app.Application
import android.content.Context
import androidx.datastore.preferences.preferencesDataStore
import org.sindibad.android.data.GameRepository

private val Context.gameDataStore by preferencesDataStore(name = "sindibad")

class SindibadApplication : Application() {
    val repository by lazy { GameRepository(gameDataStore) }
}
