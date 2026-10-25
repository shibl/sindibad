@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
package org.sindibad.android.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.sindibad.android.GameViewModel
import org.sindibad.android.Screen
import org.sindibad.android.content.Topics
import org.sindibad.android.domain.*

/** Six shared, identically sized layers preserve the source painter order. */
@Composable
fun StyledShip(profile: Profile?, modifier: Modifier = Modifier) {
    if (profile == null) { SharedArt("ships/crew", "سفينة الرحلة", modifier); return }
    val layers = listOf("rigging", "sail-${profile.variant("sail")}", "flag-${profile.variant("flag")}",
        "${profile.hero.asset}-${profile.variant("outfit")}", "hudhud-${profile.variant("hat")}", "hull")
    Box(modifier) {
        layers.forEachIndexed { index, id ->
            SharedArt("layers/ship/$id", if (index == 0) "سفينة ${profile.hero.arabic}" else null, Modifier.fillMaxSize())
        }
    }
}

@Composable
fun ReviewList(profile: Profile, open: (String) -> Unit) {
    val topics = Topics.reviewTopics(profile)
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { PaperCard {
            Text("نعود إلى ما يحتاج تدريباً", style = MaterialTheme.typography.headlineSmall)
            Text("تأتي الدروس التي تعثّرت فيها أولاً. نراجع الشرح ثم نعيد الأسئلة، وتبقى أفضل نتيجة محفوظة.")
            if (topics.isEmpty()) Text("أكمل درساً أولاً؛ ستجد هنا ما تعلّمته.")
        } }
        items(topics, key = { it.id }) { topic ->
            PaperCard(Modifier.fillMaxWidth()) {
                Text(topic.title, style = MaterialTheme.typography.titleLarge)
                val record = profile.topics.getValue(topic.id)
                Text(if (record.missed.isEmpty()) "نثبّت ما تعلّمنا" else "${record.missed.size} أسئلة تحتاج تدريباً")
                Stars(record.stars)
                GoldButton("أراجع الشرح وأتدرّب") { open(topic.id) }
            }
        }
    }
}

@Composable
fun PearlShop(profile: Profile, busy: Boolean, vm: GameViewModel) {
    var slot by rememberSaveable { mutableStateOf("sail") }
    var previewId by rememberSaveable { mutableStateOf<String?>(null) }
    val item = cosmetics.find { it.id == previewId }
    val preview = if (item != null) profile.copy(style = profile.style + (item.slot to item.id)) else profile
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { PaperCard(Modifier.fillMaxWidth()) {
            Text("${profile.pearls} لآلئ", style = MaterialTheme.typography.headlineSmall)
            Text("للزينة فقط. لا تشتري إجابات ولا تفتح دروساً.")
            when (slot) {
                "outfit" -> SharedArt("cosmetics/${profile.hero.asset}/${preview.variant("outfit")}", "معاينة اللباس", Modifier.fillMaxWidth().height(170.dp))
                "hat" -> SharedArt("cosmetics/hudhud/${preview.variant("hat")}", "معاينة هُدهُد", Modifier.fillMaxWidth().height(170.dp))
                else -> StyledShip(preview, Modifier.fillMaxWidth().height(170.dp))
            }
            FlowRow {
                listOf("sail" to "الأشرعة", "flag" to "الرايات", "outfit" to "الثياب", "hat" to "هُدهُد").forEach { (key, label) ->
                    FilterChip(slot == key, { slot = key; previewId = null }, { Text(label) })
                }
            }
            TextButton({ previewId = null; vm.wear(slot, null) }, enabled = !busy) { Text("ارتدِ الأصلي") }
            if (item != null) {
                Text("معاينة: ${item.title}")
                val owned = item.id in profile.owned
                GoldButton(if (owned) "ارتدِ" else "اشترِ بـ ${item.price} لؤلؤة", !busy && (owned || profile.pearls >= item.price)) {
                    if (owned) vm.wear(item.slot, item.id) else vm.buy(item.id)
                }
                if (!owned && profile.pearls < item.price) Text("تحتاج ${item.price - profile.pearls} لؤلؤة أخرى. كل نجمة جديدة تمنحك 5 لآلئ.")
            }
        } }
        items(cosmetics.filter { it.slot == slot }, key = { it.id }) { cosmetic ->
            OutlinedButton({ previewId = cosmetic.id }, modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = Paper, contentColor = Ink)) {
                Text("${cosmetic.title}  •  " + when {
                    profile.style[slot] == cosmetic.id -> "مُرتدى"
                    cosmetic.id in profile.owned -> "تملكه"
                    else -> "${cosmetic.price} لؤلؤة"
                })
            }
        }
    }
}

@Composable
fun TreasureIsland(profile: Profile, vm: GameViewModel) {
    val unlocked = islands.first { it.id == "treasure" }.unlocked(profile)
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp)) {
        item { PaperCard(Modifier.fillMaxWidth()) {
            SharedArt("objects/chest", "صندوق الكنز", Modifier.fillMaxWidth().height(200.dp))
            Text("الحكيم لقمان", style = MaterialTheme.typography.headlineLarge)
            Text("الصندوق لا يُفتح بالقوة، بل بالحكمة. نستعيد ما تعلّمناه من الجزر.")
            if (unlocked) GoldButton("قفل الكنز") { vm.startTopic("review-treasure") }
            else Text("اجمع نجمتين في جزيرة الأطلس أولاً. تبقى هذه الرحلة محفوظة حتى تكتمل الجزر.")
            if (profile.certificateEarned) GoldButton("افتح شهادتي") { vm.navigate(Screen.Certificate) }
        } }
    }
}

@Composable
fun Certificate(profile: Profile) {
    if (!profile.certificateEarned) return
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp)) {
        item { PaperCard(Modifier.fillMaxWidth()) {
            Text("رحلات سندباد وياسمينة", style = MaterialTheme.typography.titleLarge)
            Text("شهادة ${if (profile.hero == Hero.Yasmina) "بحّارة" else "بحّار"} الصف السادس", style = MaterialTheme.typography.headlineLarge)
            SharedArt("cosmetics/${profile.hero.asset}/${profile.variant("outfit")}", null, Modifier.fillMaxWidth().height(200.dp))
            Text(profile.name, Modifier.fillMaxWidth(), style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
            Text("الكنز الحقيقي هو ما تعلّمته في رحلتك. فتحت صندوق الكنز بما اكتسبته من معرفة.")
            Text("${profile.totalStars} نجوم", style = MaterialTheme.typography.titleLarge)
            SharedArt("cosmetics/hudhud/${profile.variant("hat")}", null, Modifier.fillMaxWidth().height(90.dp))
            Text("هُدهُد، دليل الرحلة")
        } }
    }
}
