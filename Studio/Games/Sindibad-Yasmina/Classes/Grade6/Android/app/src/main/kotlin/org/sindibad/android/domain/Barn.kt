package org.sindibad.android.domain

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable data class Harvest(val product: String, val amount: Int)
@Serializable data class FarmProduct(val name: String, val icon: String, val price: Int)
@Serializable data class FarmOrder(val who: String, val icon: String, val want: Map<String, Int>)
@Serializable data class FarmDecoration(val name: String, val fact: String, val cost: Int)
@Serializable data class FarmHelper(val name: String, val fact: String)
@Serializable data class FarmBook(val goods: Map<String, Harvest>, val products: Map<String, FarmProduct>,
    val orders: List<FarmOrder>, val decorations: Map<String, FarmDecoration>, val helpers: Map<String, FarmHelper>) {
    companion object {
        val book by lazy { requireNotNull(FarmBook::class.java.getResourceAsStream("/islands/barn.json")).bufferedReader().use {
            Json.decodeFromString<FarmBook>(it.readText())
        } }
    }
}

@Serializable
data class Barn(val stock: Map<String, Int> = emptyMap(), val coins: Int = 0,
    val decor: Set<String> = emptySet(), val helper: String = "bee") {
    fun harvest(topic: String): Barn {
        if (!topic.startsWith("farm-")) return this
        val item = FarmBook.book.goods[topic] ?: return this
        return copy(stock = stock + (item.product to (stock.getOrDefault(item.product, 0) + item.amount)))
    }
    fun canFill(order: FarmOrder) = order.want.all { (id, n) -> stock.getOrDefault(id, 0) >= n }
    fun deliver(order: FarmOrder): Barn {
        if (!canFill(order)) return this
        val pay = order.want.entries.sumOf { (id, n) -> FarmBook.book.products.getValue(id).price * n }
        return copy(stock = stock.mapValues { (id, n) -> n - order.want.getOrDefault(id, 0) }, coins = coins + pay)
    }
    fun decorate(id: String): Barn {
        val item = FarmBook.book.decorations.getValue(id)
        return if (id in decor || coins < item.cost) this else copy(decor = decor + id, coins = coins - item.cost)
    }
}
