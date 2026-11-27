package org.sindibad.android.domain.atlas

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The atlas island's world, imported at development time by tools/import-quests.mjs (social atlas) from the web's
// own data, never copied by hand:
//   islands/globe.json      every country of Web/worlds/atlas/countries.ts with its outline from shapes.ts
//                           (Natural Earth 1:110m, [lon×10, lat×10, …]) and its flag as plain shapes;
//   islands/atlas-map.json  the places the island's maps can show (Web/core/atlas/views.ts tables).
// The map decisions are the web's (countries.ts header, SPEC.md «The map follows the Syrian textbook»): Palestine
// is drawn whole, Western Sahara with Morocco, Somaliland with Somalia, northern Cyprus with Cyprus, Kosovo with
// Serbia, Taiwan with China; South Sudan is its own country. They are already in the imported shapes; nothing
// here changes them.

@Serializable data class Currency(val ar: String, val code: String)

/** A flag shape in the flag's 300 × 200 box: an SVG path, its paint, and the transform / clip it had. */
@Serializable data class FlagShape(
    val d: String, val fill: String? = null, val stroke: String? = null, val sw: Double? = null,
    val cap: String? = null, val join: String? = null,
    /** An affine matrix [a, b, c, d, e, f] (SVG order). */
    val m: List<Double>? = null,
    /** [x, y, w, h] the shape is clipped to (a canton drawn as a smaller flag). */
    val clip: List<Double>? = null,
)
@Serializable data class Flag(val colors: List<String>, val shapes: List<FlagShape>)

/**
 * A country of the globe. A full card (tier A: `flag != null`) has the flag, official name, currency (none for
 * Palestine), language, the meanings of its name and flag, resources and a fact; a short card only its name,
 * continent and capital (and a note for territories). `small`: no outline at 1:110m (Bahrain, Comoros), drawn
 * as a dot.
 */
@Serializable data class Country(
    val id: String, val ar: String, val capital: String? = null, val continent: String, val lat: Double, val lon: Double,
    val arab: Boolean = false, val territory: Boolean = false, val note: String? = null, val small: Boolean = false,
    val official: String? = null, val currency: Currency? = null, val language: String? = null,
    val nameMeaning: String? = null, val flagMeaning: String? = null, val resources: List<String> = emptyList(), val fact: String? = null,
    val flag: Flag? = null, val rings: List<List<Int>> = emptyList(),
) { val full get() = flag != null }

@Serializable data class GlobeData(val continents: Map<String, String>, val countries: List<Country>)

/** The places a map can show (web core/atlas/views.ts), positions [lon, lat]. */
@Serializable data class MapTables(
    /** Map key → ISO code of its outline. */
    val country: Map<String, String>,
    @SerialName("dotCountry") val dotCountry: Map<String, List<Double>>,
    val water: Map<String, List<Double>>,
    /** [lon, lat, half-width, half-height (degrees), rotation]. */
    val lakes: Map<String, List<Double>>,
    val rivers: Map<String, List<List<Double>>>,
    val mountains: Map<String, List<List<Double>>>,
    val alwaysMountains: List<String>,
    val land: Map<String, List<Double>>,
    val city: Map<String, List<Double>>,
    /** Per map area: where a place's name goes when its usual spot is off the map or crowded. */
    val at: Map<String, Map<String, List<Double>>>,
    /** Per map area: a city name's offset from its dot. */
    val off: Map<String, Map<String, List<Double>>>,
    val lines: Map<String, Double>,
    val arab: List<String>,
    /** Map frames [west, east, south, north]. */
    val areas: Map<String, List<Double>>,
    val nudge: Map<String, List<Double>>,
) {
    /** Every place a step may name (web FEATURES). */
    val features: Set<String> by lazy {
        country.keys + dotCountry.keys + water.keys + rivers.keys.filter { it != "nile2" } + mountains.keys + land.keys + city.keys + lines.keys
    }
}

/** The atlas world, loaded once (pure Kotlin: the tests read the same resources). */
object AtlasWorld {
    private val json = Json { ignoreUnknownKeys = false }
    private fun text(name: String) = requireNotNull(AtlasWorld::class.java.getResourceAsStream("/islands/$name")) { "No $name" }
        .bufferedReader().use { it.readText() }

    val globe: GlobeData by lazy { json.decodeFromString(GlobeData.serializer(), text("globe.json")) }
    val tables: MapTables by lazy { json.decodeFromString(MapTables.serializer(), text("atlas-map.json")) }
    val byId: Map<String, Country> by lazy { globe.countries.associateBy { it.id } }
    fun country(id: String?) = id?.let { byId[it] }
    fun continent(c: Country) = globe.continents[c.continent].orEmpty()

    /** Countries with a full card (web FULL), and the Arab ones among them (web ARAB: the 22 of the Arab League). */
    val full: List<String> by lazy { globe.countries.filter { it.full }.map { it.id } }
    val arab: List<String> by lazy { globe.countries.filter { it.full && it.arab }.map { it.id } }
}
