package org.sindibad.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import org.sindibad.android.ui.SindibadApp

class MainActivity : ComponentActivity() {
    private val model: GameViewModel by viewModels {
        viewModelFactory {
            initializer { GameViewModel((application as SindibadApplication).repository, createSavedStateHandle()) }
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { SindibadApp(model) }
    }
}
