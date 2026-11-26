package org.sindibad.android.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import org.sindibad.android.GameViewModel
import org.sindibad.android.domain.*

@Composable
internal fun FarmBoard(profile: Profile, vm: GameViewModel) {
    var open by rememberSaveable { mutableStateOf(false) }
    GoldButton("الحظيرة وطلبات السفينة") { open = true }
    if (!open) return
    val book = FarmBook.book
    val barn = profile.barn
    AlertDialog(onDismissRequest = { open = false }, title = { Text("مزرعتي · 🪙 ${barn.coins}") },
        confirmButton = { TextButton(onClick = { open = false }) { Text("العودة") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState())) {
            Text("مساعدي")
            book.helpers.forEach { (id, helper) ->
                TextButton(onClick = { vm.updateBarn { it.copy(helper = id) } }) { Text(helper.name) }
                if (id == barn.helper) Text(helper.fact)
            }
            Text("المخزون")
            book.products.forEach { (id, p) -> Text(p.icon + " " + p.name + " × " + barn.stock.getOrDefault(id, 0)) }
            Text("طلبات السفينة")
            book.orders.forEach { order ->
                val want = order.want.entries.joinToString(" + ") { (id, n) -> book.products.getValue(id).name + " × " + n }
                TextButton(enabled = barn.canFill(order), onClick = { vm.updateBarn { it.deliver(order) } }) { Text(order.icon + " " + order.who + " · " + want) }
            }
            Text("زينة المزرعة")
            book.decorations.forEach { (id, item) ->
                TextButton(enabled = id !in barn.decor && barn.coins >= item.cost, onClick = { vm.updateBarn { it.decorate(id) } }) { Text(item.name + " · 🪙 " + item.cost) }
                if (id in barn.decor) Text(item.fact)
            }
        } })
}
