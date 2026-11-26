package org.sindibad.android.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.*

@Serializable
private data class CountryCard(val name: String, val lat: Double, val lon: Double, val lines: List<List<Int>>, val facts: List<String>)

private val countries by lazy {
    val resource = requireNotNull(CountryCard::class.java.getResourceAsStream("/islands/globe.json"))
    resource.bufferedReader().use { Json.decodeFromString<List<CountryCard>>(it.readText()) }
}

/** Unwrap longitudes around the tap so a polygon can cross the date line. */
private fun contains(ring: List<Int>, lon: Double, lat: Double): Boolean {
    fun relative(value: Int) = ((value / 10.0 - lon + 540) % 360) - 180
    var inside = false
    var previous = ring.size - 2
    for (i in ring.indices step 2) {
        val x = relative(ring[i])
        val y = ring[i + 1] / 10.0
        val px = relative(ring[previous])
        val py = ring[previous + 1] / 10.0
        if (abs(x - px) <= 180 && (y > lat) != (py > lat) && x + (px - x) * (lat - y) / (py - y) > 0) inside = !inside
        previous = i
    }
    return inside
}

@Composable
internal fun AtlasGlobe() {
    var latitude by rememberSaveable { mutableDoubleStateOf(34.0) }
    var longitude by rememberSaveable { mutableDoubleStateOf(38.0) }
    var selection by rememberSaveable { mutableStateOf("سورية") }
    var search by rememberSaveable { mutableStateOf("") }
    PaperCard(Modifier.fillMaxWidth()) {
        Canvas(Modifier.fillMaxWidth().height(210.dp).pointerInput(Unit) {
            detectDragGestures { change, amount ->
                change.consume()
                latitude = (latitude + amount.y * 140 / size.height).coerceIn(-90.0, 90.0)
                longitude -= amount.x * 180 / size.width
            }
        }.pointerInput(latitude, longitude) {
            detectTapGestures { tap ->
                val radius = min(size.width, size.height) * .48
                val x = (tap.x - size.width / 2.0) / radius
                val y = (size.height / 2.0 - tap.y) / radius
                val r2 = x*x + y*y
                if (r2 <= 1.0) {
                    val z = sqrt(1.0 - r2)
                    val phi = Math.toRadians(latitude)
                    val lat = Math.toDegrees(asin((y*cos(phi) + z*sin(phi)).coerceIn(-1.0, 1.0)))
                    val raw = longitude + Math.toDegrees(atan2(x, z*cos(phi) - y*sin(phi)))
                    val lon = ((raw % 360 + 540) % 360) - 180
                    countries.firstOrNull { c -> c.lines.any { contains(it, lon, lat) } }?.let { selection = it.name }
                }
            }
        }) {
            val radius = size.minDimension * .48f
            val phi = Math.toRadians(latitude)
            drawCircle(Teal, radius)
            for (country in countries) for (ring in country.lines) {
                var last: Offset? = null
                var i = 0
                while (i + 1 < ring.size) {
                    val delta = Math.toRadians(ring[i] / 10.0 - longitude)
                    val p = Math.toRadians(ring[i+1] / 10.0)
                    val visible = sin(phi)*sin(p) + cos(phi)*cos(p)*cos(delta) >= 0
                    val point = if (visible) center + Offset((cos(p)*sin(delta)).toFloat(),
                        (sin(phi)*cos(p)*cos(delta)-cos(phi)*sin(p)).toFloat()) * radius else null
                    if (point != null && last != null) drawLine(if (country.name == selection) Color.Yellow else Paper, last, point, 1.5f)
                    last = point
                    i += 2
                }
            }
        }
        OutlinedTextField(search, { search = it }, label = { Text("ابحث عن بلد") }, singleLine = true)
        if (search.isNotBlank()) countries.filter { search in it.name }.take(8).forEach { country ->
            TextButton(onClick = {
                selection = country.name
                latitude = country.lat
                longitude = country.lon
                search = ""
            }) { Text(country.name) }
        }
        countries.firstOrNull { it.name == selection }?.let { Text(it.name); Text(it.facts.joinToString(" · ")) }
    }
}
