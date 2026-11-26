package org.sindibad.android.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import org.sindibad.android.domain.LearnCard
import kotlin.random.Random

@Composable
internal fun PracticeCard(card: LearnCard, seed: Int, done: Boolean, complete: () -> Unit) {
    var entry by rememberSaveable { mutableStateOf("") }
    var count by rememberSaveable { mutableIntStateOf(0) }
    var retry by rememberSaveable { mutableStateOf(false) }
    val options = remember(card, seed) { (card.sequence.ifEmpty { card.options }).distinct().shuffled(Random(seed)) }
    fun choose(value: String) {
        val expected = card.sequence.getOrNull(count) ?: card.response
        val normalized = value.trim().map { it.digitToIntOrNull()?.toString() ?: it.toString() }.joinToString("")
        retry = normalized != expected
        if (!retry) {
            count++
            if (count >= card.sequence.size) complete()
        }
    }
    Column {
        if (count > 0 && card.sequence.isNotEmpty()) Text(card.sequence.take(count).joinToString(" ← "))
        if (!done && options.isEmpty()) {
            OutlinedTextField(entry, { entry = it }, singleLine = true, label = { Text("الإجابة") })
            TextButton(onClick = { choose(entry) }) { Text("تحقّق") }
        } else if (!done) options.forEach { option -> TextButton(onClick = { choose(option) }) { Text(option) } }
        if (retry) Text(card.clue.ifBlank { "حاول مرّة أخرى" })
        if (done) Text(card.feedback.ifBlank { "✓" })
    }
}
