@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package org.sindibad.android.ui

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import org.sindibad.android.GameViewModel
import org.sindibad.android.domain.*
import kotlin.math.atan2
import kotlin.math.roundToInt

/** Native input and state, original shared illustrations. Math axes stay LTR. */
@Composable
fun MathControl(session: LessonSession, topic: Topic, vm: GameViewModel) {
    val question = session.currentQuestion(topic)
    val number = requireNotNull(question.number)
    val selected = if (session.resolved && session.lastCorrect != true) question.answer.single()
        else session.selection.firstOrNull() ?: 0
    val enabled = !session.resolved
    val accessibleValue = question.numberLabel(selected) + if (topic.kind == ActivityKind.Angle) " درجة" else ""
    if (topic.kind == ActivityKind.Market) {
        Text("المجموع: ${session.payment.sum()} درهم", style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            LessonSession.coins.forEach { coin ->
                val count = session.payment.count { it == coin }
                if (count > 0) OutlinedButton({ vm.pay(coin, false) }, enabled = enabled,
                    modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "أعِد قطعة $coin، لديك $count" }) {
                    Text("$coin × $count")
                }
            }
        }
        Text("اضغط على النقود لتضعها على الطاولة، واضغط على قطعة فوق الطاولة لتعيدها.")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            LessonSession.coins.forEach { coin ->
                Button({ vm.pay(coin, true) }, enabled = enabled && session.payment.sum() + coin <= 1000 && session.payment.size < 200,
                    modifier = Modifier.heightIn(min = 52.dp).semantics { contentDescription = "أضِف $coin درهم" }) { Text("$coin") }
            }
        }
        Row {
            TextButton(vm::clearPayment, enabled = enabled) { Text("أفرغ الطاولة") }
            Button(vm::submit, enabled = enabled && session.payment.isNotEmpty()) { Text("ادفع") }
        }
        return
    }
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        when (topic.kind) {
            ActivityKind.NumberLine -> {
                val key = "${number.min.toInt()}_${number.max.toInt()}_${number.ticks}"
                BoxWithConstraints(Modifier.fillMaxWidth().aspectRatio(1000f / 260f)
                    .pointerInput(session.id, session.index, enabled) {
                        detectTapGestures { offset ->
                            if (enabled) vm.selectNumber(((offset.x / size.width - .06f) / .88f * number.ticks).roundToInt())
                        }
                    }) {
                    SharedArt("controls/line/$key", null, Modifier.fillMaxSize())
                    // Source diagram's axis has 60/1000 padding on either side.
                    SharedArt("ships/empty", null, Modifier.offset(x = maxWidth * (.06f + .88f * selected / number.ticks) - 22.dp)
                        .width(44.dp).height(42.dp).align(Alignment.TopStart))
                }
            }
            ActivityKind.Angle -> SharedArt("controls/helm/${selected * 5}", null,
                Modifier.widthIn(max = 360.dp).fillMaxWidth().aspectRatio(400f / 250f).pointerInput(session.id, session.index, enabled) {
                    detectTapGestures { offset ->
                        if (enabled) {
                            val x = offset.x / size.width * 400 - 200
                            val y = 206 - offset.y / size.height * 250
                            vm.selectNumber((Math.toDegrees(atan2(y.toDouble().coerceAtLeast(0.0), x.toDouble())) / 5).roundToInt())
                        }
                    }
                })
            ActivityKind.Fill -> SharedArt("controls/fill/${number.ticks}-$selected", null,
                Modifier.widthIn(max = 310.dp).fillMaxWidth().aspectRatio(380f / 280f)
                    .pointerInput(session.id, session.index, enabled) {
                        detectTapGestures { offset ->
                            val x = offset.x / size.width * 380 - 8
                            val y = offset.y / size.height * 280 - 8
                            if (enabled && x in 34f..146f) vm.selectNumber(((244 - y) / 226 * number.ticks).roundToInt())
                        }
                    })
            else -> Unit
        }
        Text(accessibleValue, Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
            style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
        Slider(selected.toFloat(), { vm.selectNumber(it.roundToInt()) }, valueRange = 0f..number.ticks.toFloat(),
            steps = number.ticks - 1, enabled = enabled,
            modifier = Modifier.semantics { contentDescription = when (topic.kind) {
                ActivityKind.NumberLine -> "موضع القارب على خط الأعداد"
                ActivityKind.Angle -> "زاوية الدفّة"
                else -> "مستوى الماء في الدلو"
            }; stateDescription = accessibleValue })
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            OutlinedButton({ vm.selectNumber(selected - 1) }, enabled = enabled && selected > 0,
                modifier = Modifier.sizeIn(minWidth = 52.dp, minHeight = 48.dp).semantics { contentDescription = "أنقِص جزءاً" }) { Text("−") }
            Button(vm::submit, enabled = enabled && (topic.kind != ActivityKind.Fill || selected > 0)) {
                Text(if (topic.kind == ActivityKind.Fill) "اسكب" else "أبحر")
            }
            OutlinedButton({ vm.selectNumber(selected + 1) }, enabled = enabled && selected < number.ticks,
                modifier = Modifier.sizeIn(minWidth = 52.dp, minHeight = 48.dp).semantics { contentDescription = "أضِف جزءاً" }) { Text("+") }
        }
    }
}
