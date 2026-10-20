// Draft content, pending review by Syrian educators. CC-BY-SA.
package org.sindibad.android.content

import org.sindibad.android.domain.Question
import kotlin.random.Random

/** Seeded native question generation: the same saved session restores exactly. */
object Divisibility {
    private tailrec fun gcd(a: Int, b: Int): Int = if (b == 0) a else gcd(b, a % b)
    private fun lcm(a: Int, b: Int) = a / gcd(a, b) * b
    fun questions(seed: Int): List<Question> {
        val random = Random(seed)
        fun question(index: Int, prompt: String, right: Int, candidates: List<Int>, hint: String, explanation: String): Question {
            val wrong = candidates.filter { it > 0 && it != right }.distinct().shuffled(random).take(3)
            require(wrong.size == 3)
            return Question("math-divisibility-${index + 1}", prompt, (listOf(right) + wrong).map(Int::toString), listOf(0), hint, explanation)
        }
        return (0..10).map { index ->
            when (index) {
                in 0..2 -> {
                    val d = listOf(2, 3, 5, 9).random(random)
                    val right = d * random.nextInt(12, 100)
                    val rule = when (d) {
                        2 -> "يقبل القسمة على 2 إذا كان آحاده زوجياً (0، 2، 4، 6، 8)."
                        3 -> "يقبل القسمة على 3 إذا كان مجموع أرقامه يقبل القسمة على 3."
                        5 -> "يقبل القسمة على 5 إذا كان آحاده 0 أو 5."
                        else -> "يقبل القسمة على 9 إذا كان مجموع أرقامه يقبل القسمة على 9."
                    }
                    question(index, "أيّ عدد يقبل القسمة على $d؟", right, (100..900).filter { it % d != 0 }, rule, "$right = $d × ${right / d}.")
                }
                in 3..5 -> {
                    val factor = listOf(2, 3, 4, 5, 6, 8).random(random)
                    val (a, b) = (2..9).flatMap { a -> (2..9).filter { b -> b != a && gcd(a, b) == 1 }.map { b -> a * factor to b * factor } }.random(random)
                    question(index, "ما القاسم المشترك الأكبر للعددين $a و$b؟", factor,
                        listOf(1, 2, 3, 4, 6, 8, 9, 10, 12, factor * 2, minOf(a, b)),
                        "اكتب قواسم كل عدد، ثم اختر أكبر قاسم يظهر في القائمتين.",
                        "$factor يقسم $a و$b، ولا يوجد قاسم مشترك أكبر منه.")
                }
                else -> {
                    val story = index >= 9
                    val range = if (story) 3..10 else 2..12
                    val (a, b) = range.flatMap { a -> range.filter { b -> a != b && lcm(a, b) <= if (story) 60 else 72 }.map { b -> a to b } }.random(random)
                    val right = lcm(a, b)
                    question(index, if (story) "منارة تومض كل $a ثوانٍ، وأخرى كل $b ثوانٍ. ومضتا معاً الآن؛ بعد كم ثانية تومضان معاً مرة أخرى؟"
                        else "ما المضاعف المشترك الأصغر للعددين $a و$b؟", right,
                        listOf(a * b, right * 2, a + b, maxOf(a, b), right + a, right + 1),
                        if (story) "هذا سؤال عن المضاعف المشترك الأصغر." else "عُدّ مضاعفات العدد الأكبر حتى تجد أول مضاعف يقبل القسمة على العدد الآخر.",
                        if (story) "المضاعف المشترك الأصغر لـ$a و$b هو $right." else "$right أصغر عدد يقبل القسمة على $a وعلى $b.")
                }
            }
        }
    }
}
