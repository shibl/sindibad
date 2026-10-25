// Draft content, pending review by Syrian educators. CC-BY-SA.
// Curriculum data from Web/plugins/math; regenerate: node Android/tools/import-math.mjs
// No browser HTML or gameplay code is executed by Android.
package org.sindibad.android.content

import org.sindibad.android.domain.*

object MathTopics {
    val all: List<Topic> by lazy { listOf(fractions_line(), decimals(), percent(), fraction_ops(), integers(), ratio(), area(), divisibility(), angles(), market(), equivalent()) }
    fun get(id: String, seed: Int = 0): Topic {
        val topic = all.first { it.id == id }
        return if (id == "math-divisibility") topic.copy(questions = Divisibility.questions(seed)) else topic
    }
    private fun fractions_line() = Topic(
        "math-fractions-line", "الكسور على خط الأعداد", "أبحِر بالقارب إلى الكسر الصحيح!", ActivityKind.NumberLine,
        listOf(
            LearnCard("ما الكسر؟", "المقام (العدد في الأسفل) = عدد الأجزاء المتساوية.\nالبسط (العدد في الأعلى) = عدد الأجزاء التي نأخذها.\n\n3/4\n\nقسّمنا الشريط إلى 4 أجزاء متساوية ولوّنّا 3 منها: ثلاثة أرباع.", art = listOf("lessons/math-fractions-line/card-0-0")),
            LearnCard("الكسر على خط الأعداد", "قسّم المسافة من 0 إلى 1 إلى أجزاء بعدد المقام، ثم عُدّ من الصفر بعدد البسط.\n\n3/4\n\nعُدّ القفزات: واحدة، اثنتان، ثلاث… وصلنا إلى ثلاثة أرباع!", art = listOf("lessons/math-fractions-line/card-1-0")),
            LearnCard("أكبر من الواحد", "إذا كان البسط أكبر من المقام فالكسر أكبر من 1: 3/2 = واحد ونصف.\n\n3/2\n\nهيّا! أوصل القارب إلى كل كسر أطلبه.", art = listOf("lessons/math-fractions-line/card-2-0"))
        ),
        listOf(
            Question("math-fractions-line-1", "أوصِل القارب إلى العدد 1/2", listOf(), listOf(1), "قسّم المسافة من 0 إلى 1 إلى 2 أجزاء متساوية (المقام)، ثم عُدّ 1 منها (البسط).", "1/2 تعني 1 أجزاء من 2 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 2)),
            Question("math-fractions-line-2", "أوصِل القارب إلى العدد 3/4", listOf(), listOf(3), "قسّم المسافة من 0 إلى 1 إلى 4 أجزاء متساوية (المقام)، ثم عُدّ 3 منها (البسط).", "3/4 تعني 3 أجزاء من 4 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 4)),
            Question("math-fractions-line-3", "أوصِل القارب إلى العدد 1/4", listOf(), listOf(1), "قسّم المسافة من 0 إلى 1 إلى 4 أجزاء متساوية (المقام)، ثم عُدّ 1 منها (البسط).", "1/4 تعني 1 أجزاء من 4 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 4)),
            Question("math-fractions-line-4", "أوصِل القارب إلى العدد 2/5", listOf(), listOf(2), "قسّم المسافة من 0 إلى 1 إلى 5 أجزاء متساوية (المقام)، ثم عُدّ 2 منها (البسط).", "2/5 تعني 2 أجزاء من 5 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 5)),
            Question("math-fractions-line-5", "أوصِل القارب إلى العدد 3/5", listOf(), listOf(3), "قسّم المسافة من 0 إلى 1 إلى 5 أجزاء متساوية (المقام)، ثم عُدّ 3 منها (البسط).", "3/5 تعني 3 أجزاء من 5 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 5)),
            Question("math-fractions-line-6", "أوصِل القارب إلى العدد 1/3", listOf(), listOf(1), "قسّم المسافة من 0 إلى 1 إلى 3 أجزاء متساوية (المقام)، ثم عُدّ 1 منها (البسط).", "1/3 تعني 1 أجزاء من 3 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 3)),
            Question("math-fractions-line-7", "أوصِل القارب إلى العدد 2/3", listOf(), listOf(2), "قسّم المسافة من 0 إلى 1 إلى 3 أجزاء متساوية (المقام)، ثم عُدّ 2 منها (البسط).", "2/3 تعني 2 أجزاء من 3 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 3)),
            Question("math-fractions-line-8", "أوصِل القارب إلى العدد 5/6", listOf(), listOf(5), "قسّم المسافة من 0 إلى 1 إلى 6 أجزاء متساوية (المقام)، ثم عُدّ 5 منها (البسط).", "5/6 تعني 5 أجزاء من 6 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 6)),
            Question("math-fractions-line-9", "أوصِل القارب إلى العدد 3/8", listOf(), listOf(3), "قسّم المسافة من 0 إلى 1 إلى 8 أجزاء متساوية (المقام)، ثم عُدّ 3 منها (البسط).", "3/8 تعني 3 أجزاء من 8 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 8)),
            Question("math-fractions-line-10", "أوصِل القارب إلى العدد 5/8", listOf(), listOf(5), "قسّم المسافة من 0 إلى 1 إلى 8 أجزاء متساوية (المقام)، ثم عُدّ 5 منها (البسط).", "5/8 تعني 5 أجزاء من 8 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 8)),
            Question("math-fractions-line-11", "أوصِل القارب إلى العدد 7/10", listOf(), listOf(7), "قسّم المسافة من 0 إلى 1 إلى 10 أجزاء متساوية (المقام)، ثم عُدّ 7 منها (البسط).", "7/10 تعني 7 أجزاء من 10 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-fractions-line-12", "أوصِل القارب إلى العدد 3/10", listOf(), listOf(3), "قسّم المسافة من 0 إلى 1 إلى 10 أجزاء متساوية (المقام)، ثم عُدّ 3 منها (البسط).", "3/10 تعني 3 أجزاء من 10 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-fractions-line-13", "أوصِل القارب إلى العدد 3/2", listOf(), listOf(3), "3/2 أكبر من الواحد: كل واحد فيه نصفان، فعُدّ ثلاثة أنصاف.", "3/2 تعني 3 أجزاء من 2 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 4)),
            Question("math-fractions-line-14", "أوصِل القارب إلى العدد 5/4", listOf(), listOf(5), "5/4 = واحد و1/4. تجاوز الواحد بربع.", "5/4 تعني 5 أجزاء من 4 أجزاء متساوية.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 8))
        ), 7,
    )

    private fun decimals() = Topic(
        "math-decimals", "الأعداد العشرية", "الأعشار على خط الأعداد", ActivityKind.NumberLine,
        listOf(
            LearnCard("الأعشار", "نقسم الواحد إلى 10 أجزاء متساوية؛ كل جزء = 0.1 (عُشر).\n\n3/10\n\n0.3 = ثلاثة أعشار = 3/10\n\nالفاصلة العشرية تفصل الآحاد عن الأعشار.", art = listOf("lessons/math-decimals/card-0-0")),
            LearnCard("بين 1 و2", "1.5 = واحد وخمسة أعشار = واحد ونصف.\n\n1.5\n\nكل قفزة صغيرة عُشر. عشر قفزات تساوي واحداً كاملاً.", art = listOf("lessons/math-decimals/card-1-0"))
        ),
        listOf(
            Question("math-decimals-1", "أوصِل القارب إلى العدد 0.3", listOf(), listOf(3), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.3.", "0.3 = 3 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-2", "أوصِل القارب إلى العدد 0.7", listOf(), listOf(7), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.7.", "0.7 = 7 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-3", "أوصِل القارب إلى العدد 0.2", listOf(), listOf(2), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.2.", "0.2 = 2 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-4", "أوصِل القارب إلى العدد 0.9", listOf(), listOf(9), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.9.", "0.9 = 9 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-5", "أوصِل القارب إلى العدد 0.6", listOf(), listOf(6), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.6.", "0.6 = 6 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-6", "أوصِل القارب إلى العدد 0.1", listOf(), listOf(1), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.1.", "0.1 = 1 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-7", "أوصِل القارب إلى العدد 0.4", listOf(), listOf(4), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.4.", "0.4 = 4 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-8", "أوصِل القارب إلى العدد 0.8", listOf(), listOf(8), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.8.", "0.8 = 8 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1.0, 10)),
            Question("math-decimals-9", "أوصِل القارب إلى العدد 1.2", listOf(), listOf(12), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 1.2.", "1.2 = 12 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 20)),
            Question("math-decimals-10", "أوصِل القارب إلى العدد 1.5", listOf(), listOf(15), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 1.5.", "1.5 = 15 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 20)),
            Question("math-decimals-11", "أوصِل القارب إلى العدد 1.8", listOf(), listOf(18), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 1.8.", "1.8 = 18 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 20)),
            Question("math-decimals-12", "أوصِل القارب إلى العدد 0.5", listOf(), listOf(5), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 0.5.", "0.5 = 5 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 20)),
            Question("math-decimals-13", "أوصِل القارب إلى العدد 1.1", listOf(), listOf(11), "كل قفزة صغيرة على الخط تساوي 0.1 (عُشر). عُدّ الأعشار في 1.1.", "1.1 = 11 أعشار.", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 20))
        ), 7,
    )

    private fun percent() = Topic(
        "math-percent", "النسبة المئوية", "كم من كل مئة؟", ActivityKind.Choice,
        listOf(
            LearnCard("النسبة المئوية", "العلامة % تعني «من مئة». 25% = 25 من كل 100 = 25/100 = 1/4.\n\n25%\n\nفي الشبكة مئة مربع، لوّنّا 25 منها: هذه 25%.", art = listOf("lessons/math-percent/card-0-0")),
            LearnCard("نسبة من عدد", "25% من 80 = 80 × 25 ÷ 100 = 20\n\nحيل سريعة: 50% = النصف، 25% = الربع، 10% = نقسم على 10.\n\nتذكّر الحيل السريعة، ستوفر عليك وقتاً كثيراً!", art = listOf()),
            LearnCard("من كسر إلى نسبة", "اجعل المقام 100: 3/4 = 75/100 = 75%\n75%\n\nالتاجر ينتظرك في السوق. هيّا نحسب!", art = listOf("lessons/math-percent/card-2-0"))
        ),
        listOf(
            Question("math-percent-1", "كم يساوي 25% من 80؟", listOf("20", "60", "40", "25"), listOf(0), "25% تعني 25 من كل 100. اضرب 80 في 25 ثم اقسم على 100.", "80 × 25 ÷ 100 = 20.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-2", "كم يساوي 50% من 60؟", listOf("30", "60", "50", "40"), listOf(0), "50% تعني 50 من كل 100. اضرب 60 في 50 ثم اقسم على 100.", "60 × 50 ÷ 100 = 30.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-3", "كم يساوي 10% من 90؟", listOf("9", "81", "18", "10"), listOf(0), "10% تعني 10 من كل 100. اضرب 90 في 10 ثم اقسم على 100.", "90 × 10 ÷ 100 = 9.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-4", "كم يساوي 20% من 50؟", listOf("10", "40", "20", "25"), listOf(0), "20% تعني 20 من كل 100. اضرب 50 في 20 ثم اقسم على 100.", "50 × 20 ÷ 100 = 10.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-5", "كم يساوي 75% من 40؟", listOf("30", "10", "60", "75"), listOf(0), "75% تعني 75 من كل 100. اضرب 40 في 75 ثم اقسم على 100.", "40 × 75 ÷ 100 = 30.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-6", "كم يساوي 25% من 120؟", listOf("30", "90", "60", "25"), listOf(0), "25% تعني 25 من كل 100. اضرب 120 في 25 ثم اقسم على 100.", "120 × 25 ÷ 100 = 30.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-7", "كم يساوي 10% من 250؟", listOf("25", "225", "50", "10"), listOf(0), "10% تعني 10 من كل 100. اضرب 250 في 10 ثم اقسم على 100.", "250 × 10 ÷ 100 = 25.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-8", "كم يساوي 50% من 36؟", listOf("18", "36", "50", "28"), listOf(0), "50% تعني 50 من كل 100. اضرب 36 في 50 ثم اقسم على 100.", "36 × 50 ÷ 100 = 18.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-9", "كم يساوي 20% من 35؟", listOf("7", "28", "14", "20"), listOf(0), "20% تعني 20 من كل 100. اضرب 35 في 20 ثم اقسم على 100.", "35 × 20 ÷ 100 = 7.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-10", "كم يساوي 5% من 200؟", listOf("10", "190", "20", "5"), listOf(0), "5% تعني 5 من كل 100. اضرب 200 في 5 ثم اقسم على 100.", "200 × 5 ÷ 100 = 10.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-11", "كم يساوي 30% من 70؟", listOf("21", "49", "42", "30"), listOf(0), "30% تعني 30 من كل 100. اضرب 70 في 30 ثم اقسم على 100.", "70 × 30 ÷ 100 = 21.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-12", "كم يساوي 40% من 50؟", listOf("20", "30", "40", "25"), listOf(0), "40% تعني 40 من كل 100. اضرب 50 في 40 ثم اقسم على 100.", "50 × 40 ÷ 100 = 20.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-13", "اكتب الكسر 1/2 نسبةً مئوية:", listOf("50%", "10%", "20%", "55%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "1/2 = 50/100 = 50%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-14", "اكتب الكسر 1/4 نسبةً مئوية:", listOf("25%", "10%", "40%", "75%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "1/4 = 25/100 = 25%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-15", "اكتب الكسر 3/4 نسبةً مئوية:", listOf("75%", "30%", "40%", "25%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "3/4 = 75/100 = 75%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-16", "اكتب الكسر 1/5 نسبةً مئوية:", listOf("20%", "10%", "50%", "80%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "1/5 = 20/100 = 20%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-17", "اكتب الكسر 1/10 نسبةً مئوية:", listOf("10%", "100%", "90%", "15%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "1/10 = 10/100 = 10%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-18", "اكتب الكسر 2/5 نسبةً مئوية:", listOf("40%", "20%", "50%", "60%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "2/5 = 40/100 = 40%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-19", "اكتب الكسر 3/10 نسبةً مئوية:", listOf("30%", "100%", "70%", "35%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "3/10 = 30/100 = 30%.", stimulus = "", art = listOf(), number = null),
            Question("math-percent-20", "اكتب الكسر 4/5 نسبةً مئوية:", listOf("80%", "40%", "50%", "20%"), listOf(0), "حوّل الكسر إلى كسر مقامه 100: اضرب البسط والمقام في العدد نفسه.", "4/5 = 80/100 = 80%.", stimulus = "", art = listOf(), number = null)
        ), 8,
    )

    private fun fraction_ops() = Topic(
        "math-fraction-ops", "العمليات على الكسور", "جمع وطرح وضرب الكسور", ActivityKind.Choice,
        listOf(
            LearnCard("مقامات متساوية", "2/7 + 3/7 = 5/7 — نجمع البسطين فقط ويبقى المقام.\n5/7\n\nالأجزاء من الحجم نفسه، فنعدّها فقط.", art = listOf("lessons/math-fraction-ops/card-0-0")),
            LearnCard("مقامات مختلفة", "1/2 + 1/4: نحوّل 1/2 = 2/4، ثم 2/4 + 1/4 = 3/4\n\n2/4\n3/4\n\n⚠️ لا نجمع المقامات أبداً: 1/2 + 1/4 ≠ 2/6\n\nأشهر خطأ هو جمع المقامات. لا تقع فيه!", art = listOf("lessons/math-fraction-ops/card-1-0", "lessons/math-fraction-ops/card-1-1")),
            LearnCard("الضرب", "بسط × بسط، ومقام × مقام، ثم نختصر:\n2/3 × 3/4 = 6/12 = 1/2\n\nالضرب أسهل مما تظن. هيّا نحسب حمولة السفينة!", art = listOf())
        ),
        listOf(
            Question("math-fraction-ops-1", "2/7 + 3/7 = ؟", listOf("5/7", "5/14", "6/7", "1/7"), listOf(0), "عند تساوي المقامات نجمع (أو نطرح) البسوط فقط ويبقى المقام كما هو.", "2/7 + 3/7 = 5/7.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-2", "5/9 − 2/9 = ؟", listOf("3/9", "7/9", "3/18", "7/18"), listOf(0), "عند تساوي المقامات نجمع (أو نطرح) البسوط فقط ويبقى المقام كما هو.", "5/9 − 2/9 = 3/9.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-3", "1/2 + 1/4 = ؟", listOf("3/4", "2/6", "2/4", "1/8"), listOf(0), "وحِّد المقامات أولاً: حوّل الكسرين إلى كسرين لهما المقام نفسه، ثم اجمع البسطين.", "1/2 = 2/4، و2/4 + 1/4 = 3/4.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-4", "1/3 + 1/6 = ؟", listOf("1/2", "2/9", "2/6", "1/18"), listOf(0), "وحِّد المقامات أولاً: حوّل الكسرين إلى كسرين لهما المقام نفسه، ثم اجمع البسطين.", "1/3 = 2/6، و2/6 + 1/6 = 3/6 = 1/2.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-5", "2/3 + 1/6 = ؟", listOf("5/6", "3/9", "3/6", "2/18"), listOf(0), "وحِّد المقامات أولاً: حوّل الكسرين إلى كسرين لهما المقام نفسه، ثم اجمع البسطين.", "2/3 = 4/6، و4/6 + 1/6 = 5/6.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-6", "3/4 − 1/2 = ؟", listOf("1/4", "2/2", "2/4", "1/2"), listOf(0), "وحِّد المقامات أولاً: حوّل الكسرين إلى كسرين لهما المقام نفسه، ثم اجمع البسطين.", "1/2 = 2/4، و3/4 − 2/4 = 1/4.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-7", "5/6 − 1/3 = ؟", listOf("1/2", "4/3", "4/6", "1/6"), listOf(0), "وحِّد المقامات أولاً: حوّل الكسرين إلى كسرين لهما المقام نفسه، ثم اجمع البسطين.", "1/3 = 2/6، و5/6 − 2/6 = 3/6 = 1/2.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-8", "2/5 + 3/10 = ؟", listOf("7/10", "5/15", "5/10", "6/10"), listOf(0), "وحِّد المقامات أولاً: حوّل الكسرين إلى كسرين لهما المقام نفسه، ثم اجمع البسطين.", "2/5 = 4/10، و4/10 + 3/10 = 7/10.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-9", "2/3 × 3/4 = ؟", listOf("1/2", "5/7", "6/7", "8/9"), listOf(0), "في الضرب: بسط × بسط، ومقام × مقام، ثم اختصر إن أمكن.", "2/3 × 3/4 = 6/12 = 1/2.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-10", "1/2 × 4/5 = ؟", listOf("2/5", "5/7", "4/7", "1/5"), listOf(0), "في الضرب: بسط × بسط، ومقام × مقام، ثم اختصر إن أمكن.", "1/2 × 4/5 = 4/10 = 2/5.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-11", "3/5 × 1/3 = ؟", listOf("1/5", "4/8", "3/8", "4/15"), listOf(0), "في الضرب: بسط × بسط، ومقام × مقام، ثم اختصر إن أمكن.", "3/5 × 1/3 = 3/15 = 1/5.", stimulus = "", art = listOf(), number = null),
            Question("math-fraction-ops-12", "1/4 + 1/4 = ؟", listOf("1/2", "2/8", "1/8", "1/16"), listOf(0), "عند تساوي المقامات نجمع (أو نطرح) البسوط فقط ويبقى المقام كما هو.", "1/4 + 1/4 = 2/4 = 1/2.", stimulus = "", art = listOf(), number = null)
        ), 8,
    )

    private fun integers() = Topic(
        "math-integers", "الأعداد الصحيحة", "فوق الصفر وتحته", ActivityKind.NumberLine,
        listOf(
            LearnCard("الأعداد السالبة", "الغوّاص تحت سطح البحر بـ3 أمتار: موقعه −3. الصفر هو سطح الماء.\n0 = سطح البحر\n\nالأعداد السالبة يسار الصفر، والموجبة يمينه. كلما اتجهنا يساراً صغر العدد: −4\n\nدرجات الحرارة تحت الصفر في الشتاء أعداد سالبة أيضاً!", art = listOf("lessons/math-integers/card-0-0"))
        ),
        listOf(
            Question("math-integers-1", "أوصِل القارب إلى العدد −4", listOf(), listOf(1), "العدد السالب يقع يسار الصفر. عُدّ 4 قفزات إلى اليسار.", "−4 يبعد عن الصفر 4 إلى اليسار.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-2", "أوصِل القارب إلى العدد −3", listOf(), listOf(2), "العدد السالب يقع يسار الصفر. عُدّ 3 قفزات إلى اليسار.", "−3 يبعد عن الصفر 3 إلى اليسار.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-3", "أوصِل القارب إلى العدد −2", listOf(), listOf(3), "العدد السالب يقع يسار الصفر. عُدّ 2 قفزات إلى اليسار.", "−2 يبعد عن الصفر 2 إلى اليسار.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-4", "أوصِل القارب إلى العدد −1", listOf(), listOf(4), "العدد السالب يقع يسار الصفر. عُدّ 1 قفزات إلى اليسار.", "−1 يبعد عن الصفر 1 إلى اليسار.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-5", "أوصِل القارب إلى العدد 1", listOf(), listOf(6), "العدد الموجب يقع يمين الصفر. عُدّ 1 قفزات إلى اليمين.", "1 يبعد عن الصفر 1 إلى اليمين.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-6", "أوصِل القارب إلى العدد 2", listOf(), listOf(7), "العدد الموجب يقع يمين الصفر. عُدّ 2 قفزات إلى اليمين.", "2 يبعد عن الصفر 2 إلى اليمين.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-7", "أوصِل القارب إلى العدد 3", listOf(), listOf(8), "العدد الموجب يقع يمين الصفر. عُدّ 3 قفزات إلى اليمين.", "3 يبعد عن الصفر 3 إلى اليمين.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-8", "أوصِل القارب إلى العدد 4", listOf(), listOf(9), "العدد الموجب يقع يمين الصفر. عُدّ 4 قفزات إلى اليمين.", "4 يبعد عن الصفر 4 إلى اليمين.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-9", "أوصِل القارب إلى العدد −5", listOf(), listOf(0), "العدد السالب يقع يسار الصفر. عُدّ 5 قفزات إلى اليسار.", "−5 يبعد عن الصفر 5 إلى اليسار.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-10", "أوصِل القارب إلى العدد 5", listOf(), listOf(10), "العدد الموجب يقع يمين الصفر. عُدّ 5 قفزات إلى اليمين.", "5 يبعد عن الصفر 5 إلى اليمين.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10)),
            Question("math-integers-11", "أوصِل القارب إلى العدد 0", listOf(), listOf(5), "العدد الموجب يقع يمين الصفر. عُدّ 0 قفزات إلى اليمين.", "0 يبعد عن الصفر 0 إلى اليمين.", stimulus = "", art = listOf(), number = NumberControl(-5.0, 5.0, 10))
        ), 7,
    )

    private fun ratio() = Topic(
        "math-ratio", "النسبة والتناسب", "قارِن واحسب بالتناسب", ActivityKind.Choice,
        listOf(
            LearnCard("ما النسبة؟", "عند الطبّاخة 6 بيضات و3 أكواب طحين. النسبة: 6 : 3 = 2 : 1\nنقرأ 2 : 1: «اثنان إلى واحد».\n\nالنسبة تبقى نفسها إذا ضربنا الحدّين أو قسمناهما على العدد نفسه.", art = listOf()),
            LearnCard("التناسب: قيمة الوحدة", "3 دفاتر بـ600 ليرة ← الدفتر الواحد بـ200 ← 5 دفاتر بـ1000\n\nابحث دائماً عن قيمة الواحد أولاً.", art = listOf())
        ),
        listOf(
            Question("math-ratio-1", "في الصف 12 بنتاً و8 أولاد. ما نسبة البنات إلى الأولاد؟", listOf("3 : 2", "2 : 3", "4 : 3", "12 : 20"), listOf(0), "النسبة مقارنة بين كميتين بالقسمة. اقسم الحدّين على أكبر عدد يقسمهما معاً لتصل إلى أبسط صورة.", "12 : 8 = 3 : 2 (قسمنا على 4).", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-2", "ما أبسط صورة للنسبة 5 : 15؟", listOf("1 : 3", "3 : 1", "1 : 5", "5 : 3"), listOf(0), "النسبة مقارنة بين كميتين بالقسمة. اقسم الحدّين على أكبر عدد يقسمهما معاً لتصل إلى أبسط صورة.", "نقسم الحدّين على 5: 1 : 3.", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-3", "أيّ نسبة تساوي 2 : 3؟", listOf("4 : 6", "3 : 2", "4 : 5", "2 : 5"), listOf(0), "اضرب الحدّين في العدد نفسه.", "2 : 3 = 4 : 6 (ضربنا في 2).", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-4", "في كيس 6 كرات حمراء و4 زرقاء. ما نسبة الزرقاء إلى كل الكرات؟", listOf("2 : 5", "2 : 3", "4 : 6", "3 : 5"), listOf(0), "المجموع = الحمراء + الزرقاء.", "4 : 10 = 2 : 5.", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-5", "ثمن 3 دفاتر 600 ليرة. كم ثمن 5 دفاتر؟", listOf("1000", "900", "1200", "800"), listOf(0), "في التناسب: جِد قيمة الوحدة الواحدة أولاً، ثم اضرب.", "ثمن الدفتر 200، و5 × 200 = 1000.", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-6", "خريطة مقياسها: 1 سم لكل 10 كم. المسافة على الخريطة 4 سم. كم هي في الواقع؟", listOf("40 كم", "14 كم", "4 كم", "400 كم"), listOf(0), "في التناسب: جِد قيمة الوحدة الواحدة أولاً، ثم اضرب.", "4 × 10 = 40 كم.", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-7", "وصفة تحتاج كوبَي طحين لكل 3 بيضات. كم كوب طحين لـ9 بيضات؟", listOf("6", "3", "9", "5"), listOf(0), "في التناسب: جِد قيمة الوحدة الواحدة أولاً، ثم اضرب.", "9 بيضات = 3 أضعاف، إذن 2 × 3 = 6.", stimulus = "", art = listOf(), number = null),
            Question("math-ratio-8", "سيارة تقطع 120 كم في ساعتين. كم تقطع في 5 ساعات بالسرعة نفسها؟", listOf("300 كم", "250 كم", "600 كم", "240 كم"), listOf(0), "في التناسب: جِد قيمة الوحدة الواحدة أولاً، ثم اضرب.", "60 كم في الساعة × 5 = 300 كم.", stimulus = "", art = listOf(), number = null)
        ), 7,
    )

    private fun area() = Topic(
        "math-area", "المساحة والمحيط", "كم بلاطة؟ وكم سياجاً؟", ActivityKind.Choice,
        listOf(
            LearnCard("المساحة والمحيط", "المساحة: كم مربعاً يغطي الشكل؟ 6 × 4 = 24 سم²\nالمحيط: طول السياج حوله: (6 + 4) × 2 = 20 سم\n\nالمساحة للداخل (البلاط)، والمحيط للحدود (السياج).", art = listOf("lessons/math-area/card-0-0")),
            LearnCard("مساحة المثلث", "المثلث نصف مستطيل: (6 × 4) ÷ 2 = 12 سم²\n\nلا تنسَ القسمة على اثنين في المثلث!", art = listOf("lessons/math-area/card-1-0"))
        ),
        listOf(
            Question("math-area-1", "ما مساحة هذا المستطيل؟", listOf("24 سم²", "20 سم²", "10 سم²", "48 سم²"), listOf(0), "مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).", "6 × 4 = 24 سم².", stimulus = "قياسات الرسم: 6 سم، 4 سم", art = listOf("lessons/math-area/question-0-0"), number = null),
            Question("math-area-2", "ما مساحة هذا المربع؟", listOf("25 سم²", "20 سم²", "10 سم²", "50 سم²"), listOf(0), "مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).", "5 × 5 = 25 سم².", stimulus = "قياسات الرسم: 5 سم، 5 سم", art = listOf("lessons/math-area/question-1-0"), number = null),
            Question("math-area-3", "ما مساحة هذا المستطيل؟", listOf("24 سم²", "22 سم²", "11 سم²", "48 سم²"), listOf(0), "مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).", "8 × 3 = 24 سم².", stimulus = "قياسات الرسم: 8 سم، 3 سم", art = listOf("lessons/math-area/question-2-0"), number = null),
            Question("math-area-4", "ما مساحة هذا المربع؟", listOf("49 سم²", "28 سم²", "14 سم²", "98 سم²"), listOf(0), "مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).", "7 × 7 = 49 سم².", stimulus = "قياسات الرسم: 7 سم، 7 سم", art = listOf("lessons/math-area/question-3-0"), number = null),
            Question("math-area-5", "ما مساحة هذا المستطيل؟", listOf("20 سم²", "24 سم²", "12 سم²", "40 سم²"), listOf(0), "مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).", "10 × 2 = 20 سم².", stimulus = "قياسات الرسم: 10 سم، 2 سم", art = listOf("lessons/math-area/question-4-0"), number = null),
            Question("math-area-6", "ما مساحة هذا المستطيل؟", listOf("36 سم²", "26 سم²", "13 سم²", "72 سم²"), listOf(0), "مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).", "9 × 4 = 36 سم².", stimulus = "قياسات الرسم: 9 سم، 4 سم", art = listOf("lessons/math-area/question-5-0"), number = null),
            Question("math-area-7", "ما محيط هذا المستطيل؟", listOf("20 سم", "24 سم", "10 سم", "22 سم"), listOf(0), "المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × 2، ويُقاس بالسنتيمتر (سم).", "(6 + 4) × 2 = 20 سم.", stimulus = "قياسات الرسم: 6 سم، 4 سم", art = listOf("lessons/math-area/question-6-0"), number = null),
            Question("math-area-8", "ما محيط هذا المربع؟", listOf("20 سم", "25 سم", "10 سم", "22 سم"), listOf(0), "المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × 2، ويُقاس بالسنتيمتر (سم).", "(5 + 5) × 2 = 20 سم.", stimulus = "قياسات الرسم: 5 سم، 5 سم", art = listOf("lessons/math-area/question-7-0"), number = null),
            Question("math-area-9", "ما محيط هذا المستطيل؟", listOf("22 سم", "24 سم", "11 سم", "32 سم"), listOf(0), "المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × 2، ويُقاس بالسنتيمتر (سم).", "(8 + 3) × 2 = 22 سم.", stimulus = "قياسات الرسم: 8 سم، 3 سم", art = listOf("lessons/math-area/question-8-0"), number = null),
            Question("math-area-10", "ما محيط هذا المربع؟", listOf("28 سم", "49 سم", "14 سم", "30 سم"), listOf(0), "المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × 2، ويُقاس بالسنتيمتر (سم).", "(7 + 7) × 2 = 28 سم.", stimulus = "قياسات الرسم: 7 سم، 7 سم", art = listOf("lessons/math-area/question-9-0"), number = null),
            Question("math-area-11", "ما محيط هذا المستطيل؟", listOf("24 سم", "20 سم", "12 سم", "40 سم"), listOf(0), "المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × 2، ويُقاس بالسنتيمتر (سم).", "(10 + 2) × 2 = 24 سم.", stimulus = "قياسات الرسم: 10 سم، 2 سم", art = listOf("lessons/math-area/question-10-0"), number = null),
            Question("math-area-12", "ما محيط هذا المستطيل؟", listOf("26 سم", "36 سم", "13 سم", "28 سم"), listOf(0), "المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × 2، ويُقاس بالسنتيمتر (سم).", "(9 + 4) × 2 = 26 سم.", stimulus = "قياسات الرسم: 9 سم، 4 سم", art = listOf("lessons/math-area/question-11-0"), number = null),
            Question("math-area-13", "ما مساحة هذا المثلث؟", listOf("12 سم²", "24 سم²", "10 سم²", "20 سم²"), listOf(0), "مساحة المثلث = (القاعدة × الارتفاع) ÷ 2 — نصف مساحة المستطيل.", "(6 × 4) ÷ 2 = 12 سم².", stimulus = "قياسات الرسم: 6 سم، 4 سم", art = listOf("lessons/math-area/question-12-0"), number = null),
            Question("math-area-14", "ما مساحة هذا المثلث؟", listOf("20 سم²", "40 سم²", "13 سم²", "26 سم²"), listOf(0), "مساحة المثلث = (القاعدة × الارتفاع) ÷ 2 — نصف مساحة المستطيل.", "(8 × 5) ÷ 2 = 20 سم².", stimulus = "قياسات الرسم: 8 سم، 5 سم", art = listOf("lessons/math-area/question-13-0"), number = null),
            Question("math-area-15", "ما مساحة هذا المثلث؟", listOf("15 سم²", "30 سم²", "13 سم²", "26 سم²"), listOf(0), "مساحة المثلث = (القاعدة × الارتفاع) ÷ 2 — نصف مساحة المستطيل.", "(10 × 3) ÷ 2 = 15 سم².", stimulus = "قياسات الرسم: 10 سم، 3 سم", art = listOf("lessons/math-area/question-14-0"), number = null)
        ), 8,
    )

    private fun divisibility() = Topic(
        "math-divisibility", "القواسم والمضاعفات", "قابلية القسمة، والقاسم والمضاعف المشترك", ActivityKind.Choice,
        listOf(
            LearnCard("قواعد قابلية القسمة", "2: الآحاد زوجي • 5: الآحاد 0 أو 5\n3 و9: اجمع الأرقام. 234 ← 2+3+4 = 9 ✔\n\nقواعد سريعة تغنيك عن القسمة الطويلة.", art = listOf()),
            LearnCard("القاسم والمضاعف المشترك", "قواسم 12: 1، 2، 3، 4، 6، 12\nقواسم 18: 1، 2، 3، 6، 9، 18\nالقاسم المشترك الأكبر = 6\nمضاعفات 4: 4، 8، 12… ومضاعفات 6: 6، 12… ← المضاعف المشترك الأصغر = 12\n\nالقاسم يقسم العدد، والمضاعف ينتج من ضربه.", art = listOf())
        ),
        Divisibility.questions(0), 8,
    )

    private fun angles() = Topic(
        "math-angles", "الزوايا", "وجّه السفينة بالزاوية الصحيحة", ActivityKind.Angle,
        listOf(
            LearnCard("ما الزاوية؟", "الزاوية ضلعان يبدآن من نقطة واحدة اسمها الرأس. نقيسها بالدرجات بالمنقلة.\n\nزاوية قياسها 60 درجة\n\nالدفّة تدير السفينة بزاوية، والقبطان يقيسها بالدرجات!", art = listOf("lessons/math-angles/card-0-0")),
            LearnCard("أنواع الزوايا", "حادّة: أصغر من 90\n\nقائمة: 90 تماماً\n\nمنفرجة: بين 90 و180\n\nمستقيمة: 180\n\nالزاوية القائمة مثل زاوية الكتاب تماماً.", art = listOf("lessons/math-angles/card-1-0", "lessons/math-angles/card-1-1", "lessons/math-angles/card-1-2", "lessons/math-angles/card-1-3")),
            LearnCard("مجموع الزوايا", "المتتامّتان: مجموع قياسيهما 90 درجة (30 + 60).\n\nالمتكاملتان: مجموع قياسيهما 180 درجة (70 + 110).\n\nمجموع قياسات زوايا المثلث 180 درجة.\n\nاسحب الدفّة أو استعمل الزرّين، ثم اضغط «أبحر»!", art = listOf())
        ),
        listOf(
            Question("math-angles-1", "وجّه السفينة بزاوية قائمة.", listOf(), listOf(18), "الزاوية القائمة مثل زاوية الكتاب أو زاوية الباب.", "الزاوية القائمة قياسها 90 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-2", "وجّه السفينة بأيّ زاوية حادّة.", listOf(), listOf(9), "الزاوية الحادّة أصغر من الزاوية القائمة.", "الزاوية الحادّة أكبر من 0 وأصغر من 90 درجة، مثل 45 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36, 1..17)),
            Question("math-angles-3", "وجّه السفينة بأيّ زاوية منفرجة.", listOf(), listOf(27), "الزاوية المنفرجة أكبر من القائمة وأصغر من المستقيمة.", "الزاوية المنفرجة أكبر من 90 وأصغر من 180 درجة، مثل 135 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36, 19..35)),
            Question("math-angles-4", "وجّه السفينة بزاوية مستقيمة: اعكس اتجاهها تماماً!", listOf(), listOf(36), "ضلعا الزاوية المستقيمة على خطّ واحد.", "الزاوية المستقيمة قياسها 180 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-5", "وجّه السفينة بزاوية 45 درجة.", listOf(), listOf(9), "اقرأ الأرقام على حافة الدائرة، وابدأ العدّ من الصفر عند الضلع الثابت.", "زاوية حادّة قياسها 45 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-6", "وجّه السفينة بزاوية 30 درجة.", listOf(), listOf(6), "اقرأ الأرقام على حافة الدائرة، وابدأ العدّ من الصفر عند الضلع الثابت.", "زاوية حادّة قياسها 30 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-7", "وجّه السفينة بزاوية 60 درجة.", listOf(), listOf(12), "اقرأ الأرقام على حافة الدائرة، وابدأ العدّ من الصفر عند الضلع الثابت.", "زاوية حادّة قياسها 60 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-8", "وجّه السفينة بزاوية 75 درجة.", listOf(), listOf(15), "اقرأ الأرقام على حافة الدائرة، وابدأ العدّ من الصفر عند الضلع الثابت.", "زاوية حادّة قياسها 75 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-9", "وجّه السفينة بزاوية 120 درجة.", listOf(), listOf(24), "اقرأ الأرقام على حافة الدائرة، وابدأ العدّ من الصفر عند الضلع الثابت.", "زاوية منفرجة قياسها 120 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-10", "وجّه السفينة بزاوية 150 درجة.", listOf(), listOf(30), "اقرأ الأرقام على حافة الدائرة، وابدأ العدّ من الصفر عند الضلع الثابت.", "زاوية منفرجة قياسها 150 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-11", "زاويتان متتامّتان، إحداهما 30 درجة. كم الأخرى؟", listOf(), listOf(12), "الزاويتان المتتامّتان مجموع قياسيهما زاوية قائمة.", "90 − 30 = 60 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-12", "زاويتان متتامّتان، إحداهما 55 درجة. كم الأخرى؟", listOf(), listOf(7), "الزاويتان المتتامّتان مجموع قياسيهما زاوية قائمة.", "90 − 55 = 35 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-13", "زاويتان متتامّتان، إحداهما 70 درجة. كم الأخرى؟", listOf(), listOf(4), "الزاويتان المتتامّتان مجموع قياسيهما زاوية قائمة.", "90 − 70 = 20 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-14", "زاويتان متكاملتان، إحداهما 70 درجة. كم الأخرى؟", listOf(), listOf(22), "الزاويتان المتكاملتان مجموع قياسيهما زاوية مستقيمة.", "180 − 70 = 110 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-15", "زاويتان متكاملتان، إحداهما 135 درجة. كم الأخرى؟", listOf(), listOf(9), "الزاويتان المتكاملتان مجموع قياسيهما زاوية مستقيمة.", "180 − 135 = 45 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-16", "زاويتان متكاملتان، إحداهما 40 درجة. كم الأخرى؟", listOf(), listOf(28), "الزاويتان المتكاملتان مجموع قياسيهما زاوية مستقيمة.", "180 − 40 = 140 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-17", "الساعة الثالثة تماماً: كم الزاوية بين العقربين؟", listOf(), listOf(18), "دورة الساعة كاملةً 360 درجة، وعليها اثنا عشر رقماً. كم درجة بين كل رقمين متجاورين؟", "بين كل رقمين 30 درجة، و3 × 30 = 90 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-18", "الساعة الثانية تماماً: كم الزاوية بين العقربين؟", listOf(), listOf(12), "دورة الساعة كاملةً 360 درجة، وعليها اثنا عشر رقماً. كم درجة بين كل رقمين متجاورين؟", "بين كل رقمين 30 درجة، و2 × 30 = 60 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-19", "الساعة الخامسة تماماً: كم الزاوية بين العقربين؟", listOf(), listOf(30), "دورة الساعة كاملةً 360 درجة، وعليها اثنا عشر رقماً. كم درجة بين كل رقمين متجاورين؟", "بين كل رقمين 30 درجة، و5 × 30 = 150 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-20", "في مثلث زاويتان: 50 و60 درجة. كم الثالثة؟", listOf(), listOf(14), "مجموع قياسات زوايا المثلث 180 درجة.", "180 − (50 + 60) = 70 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-21", "مثلث قائم، إحدى زاويتيه الحادّتين 35 درجة. كم الأخرى؟", listOf(), listOf(11), "زوايا المثلث مجموعها 180 درجة، وإحداها قائمة.", "180 − 90 − 35 = 55 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36)),
            Question("math-angles-22", "زوايا المثلث المتساوي الأضلاع متساوية. كم قياس كل منها؟", listOf(), listOf(12), "اقسم مجموع زوايا المثلث على عدد زواياه.", "180 ÷ 3 = 60 درجة.", stimulus = "", art = listOf(), number = NumberControl(0.0, 180.0, 36))
        ), 8,
    )

    private fun market() = Topic(
        "math-market", "الحسم والزيادة", "احسب الثمن وادفعه بالدراهم", ActivityKind.Market,
        listOf(
            LearnCard("الحسم", "سعر السجّادة 200 درهم، وعليها حسم 25%:\n\nالحسم = 200 × 25 ÷ 100 = 50\n\nالثمن = 200 − 50 = 150\n25%\n\nالحسم يُطرح من السعر، فتدفع أقلّ!", art = listOf("lessons/math-market/card-0-0")),
            LearnCard("الزيادة", "كان سعر البُنّ 70 درهماً، ثم ارتفع 10%:\n\nالزيادة = 70 × 10 ÷ 100 = 7\n\nالسعر الجديد = 70 + 7 = 77\n\nحيلة: حسم 25% يعني أنك تدفع 75% من السعر.\n\nالزيادة تُضاف إلى السعر.", art = listOf()),
            LearnCard("كيف تدفع؟", "اضغط على النقود لتضعها على الطاولة، واضغط على قطعة فوق الطاولة لتعيدها.\n\nحين يصير المجموع هو الثمن الصحيح، اضغط «ادفع».\n\nلا تدفع درهماً زيادة، ولا درهماً نقصاناً!", art = listOf())
        ),
        listOf(
            Question("math-market-1", "السجّادة: 200 درهم، وحسم اليوم 25%. ادفع الثمن بعد الحسم.", listOf(), listOf(150), "احسب الحسم أولاً: 25% من 200، ثم اطرحه من السعر.", "الحسم = 200 × 25 ÷ 100 = 50، والثمن = 200 − 50 = 150.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-2", "الفانوس: 80 درهماً، وحسم اليوم 10%. ادفع الثمن بعد الحسم.", listOf(), listOf(72), "احسب الحسم أولاً: 10% من 80، ثم اطرحه من السعر.", "الحسم = 80 × 10 ÷ 100 = 8، والثمن = 80 − 8 = 72.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-3", "الإبريق النحاسي: 120 درهماً، وحسم اليوم 50%. ادفع الثمن بعد الحسم.", listOf(), listOf(60), "احسب الحسم أولاً: 50% من 120، ثم اطرحه من السعر.", "الحسم = 120 × 50 ÷ 100 = 60، والثمن = 120 − 60 = 60.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-4", "الصندوق الخشبي: 240 درهماً، وحسم اليوم 25%. ادفع الثمن بعد الحسم.", listOf(), listOf(180), "احسب الحسم أولاً: 25% من 240، ثم اطرحه من السعر.", "الحسم = 240 × 25 ÷ 100 = 60، والثمن = 240 − 60 = 180.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-5", "صابون الغار: 60 درهماً، وحسم اليوم 20%. ادفع الثمن بعد الحسم.", listOf(), listOf(48), "احسب الحسم أولاً: 20% من 60، ثم اطرحه من السعر.", "الحسم = 60 × 20 ÷ 100 = 12، والثمن = 60 − 12 = 48.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-6", "الشال: 150 درهماً، وحسم اليوم 20%. ادفع الثمن بعد الحسم.", listOf(), listOf(120), "احسب الحسم أولاً: 20% من 150، ثم اطرحه من السعر.", "الحسم = 150 × 20 ÷ 100 = 30، والثمن = 150 − 30 = 120.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-7", "كيس التمر: 90 درهماً، وحسم اليوم 10%. ادفع الثمن بعد الحسم.", listOf(), listOf(81), "احسب الحسم أولاً: 10% من 90، ثم اطرحه من السعر.", "الحسم = 90 × 10 ÷ 100 = 9، والثمن = 90 − 9 = 81.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-8", "المصباح: 400 درهم، وحسم اليوم 15%. ادفع الثمن بعد الحسم.", listOf(), listOf(340), "احسب الحسم أولاً: 15% من 400، ثم اطرحه من السعر.", "الحسم = 400 × 15 ÷ 100 = 60، والثمن = 400 − 60 = 340.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-9", "المسبحة: 50 درهماً، وحسم اليوم 30%. ادفع الثمن بعد الحسم.", listOf(), listOf(35), "احسب الحسم أولاً: 30% من 50، ثم اطرحه من السعر.", "الحسم = 50 × 30 ÷ 100 = 15، والثمن = 50 − 15 = 35.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-10", "الصحن المزخرف: 300 درهم، وحسم اليوم 40%. ادفع الثمن بعد الحسم.", listOf(), listOf(180), "احسب الحسم أولاً: 40% من 300، ثم اطرحه من السعر.", "الحسم = 300 × 40 ÷ 100 = 120، والثمن = 300 − 120 = 180.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-11", "زجاجة زيت الزيتون: 160 درهماً، وحسم اليوم 75%. ادفع الثمن بعد الحسم.", listOf(), listOf(40), "احسب الحسم أولاً: 75% من 160، ثم اطرحه من السعر.", "الحسم = 160 × 75 ÷ 100 = 120، والثمن = 160 − 120 = 40.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-12", "السلّة: 250 درهماً، وحسم اليوم 20%. ادفع الثمن بعد الحسم.", listOf(), listOf(200), "احسب الحسم أولاً: 20% من 250، ثم اطرحه من السعر.", "الحسم = 250 × 20 ÷ 100 = 50، والثمن = 250 − 50 = 200.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-13", "كيس البُنّ: كان 70 درهماً، ثم ارتفع السعر 10%. ادفع السعر الجديد.", listOf(), listOf(77), "احسب الزيادة: 10% من 70، ثم أضفها إلى السعر.", "الزيادة = 70 × 10 ÷ 100 = 7، والسعر الجديد = 70 + 7 = 77.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-14", "القنديل: كان 200 درهم، ثم ارتفع السعر 15%. ادفع السعر الجديد.", listOf(), listOf(230), "احسب الزيادة: 15% من 200، ثم أضفها إلى السعر.", "الزيادة = 200 × 15 ÷ 100 = 30، والسعر الجديد = 200 + 30 = 230.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-15", "علبة الزعتر: كان 40 درهماً، ثم ارتفع السعر 50%. ادفع السعر الجديد.", listOf(), listOf(60), "احسب الزيادة: 50% من 40، ثم أضفها إلى السعر.", "الزيادة = 40 × 50 ÷ 100 = 20، والسعر الجديد = 40 + 20 = 60.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-16", "الحقيبة الجلدية: كان 120 درهماً، ثم ارتفع السعر 25%. ادفع السعر الجديد.", listOf(), listOf(150), "احسب الزيادة: 25% من 120، ثم أضفها إلى السعر.", "الزيادة = 120 × 25 ÷ 100 = 30، والسعر الجديد = 120 + 30 = 150.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000)),
            Question("math-market-17", "كيس الأرز: كان 80 درهماً، ثم ارتفع السعر 5%. ادفع السعر الجديد.", listOf(), listOf(84), "احسب الزيادة: 5% من 80، ثم أضفها إلى السعر.", "الزيادة = 80 × 5 ÷ 100 = 4، والسعر الجديد = 80 + 4 = 84.", stimulus = "", art = listOf(), number = NumberControl(0.0, 1000.0, 1000))
        ), 8,
    )

    private fun equivalent() = Topic(
        "math-equivalent", "الكسور المتكافئة", "املأ دلاء الناعورة بالكسر الصحيح", ActivityKind.Fill,
        listOf(
            LearnCard("كسور متكافئة", "الكسور المتكافئة تدلّ على الكمية نفسها: 1/2 = 2/4 = 4/8\n\n1/2\n2/4\n4/8\n\nانظر: الأشرطة الثلاثة ملوّنة إلى المكان نفسه!", art = listOf("lessons/math-equivalent/card-0-0", "lessons/math-equivalent/card-0-1", "lessons/math-equivalent/card-0-2")),
            LearnCard("كيف أجد كسراً مكافئاً؟", "اضرب البسط والمقام في العدد نفسه: 3/4 = 6/8 (× 2)\n\nاقسم البسط والمقام على العدد نفسه: 6/9 = 2/3 (÷ 3)\n\nالضرب والقسمة على العدد نفسه لا يغيّران قيمة الكسر.\n\nوهكذا تملأ دلواً مقسوماً إلى ثمانية أجزاء بثلاثة أرباع!", art = listOf()),
            LearnCard("عشري ونسبة مئوية", "0.5 = 1/2 • 25% = 1/4 • 0.75 = 75% = 3/4\n\nاملأ الدلو بالزرّين ▲ ▼ أو بالضغط على الجزء، ثم اضغط «اسكب».\n\nالناعورة تنتظر. املأ الدلاء بدقّة!", art = listOf())
        ),
        listOf(
            Question("math-equivalent-1", "املأ الدلو إلى 1/2\nالدلو مقسوم إلى 4 أجزاء", listOf(), listOf(2), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 4.", "1/2 = 2/4 (ضربنا البسط والمقام في 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 4.0, 4)),
            Question("math-equivalent-2", "املأ الدلو إلى 1/2\nالدلو مقسوم إلى 6 أجزاء", listOf(), listOf(3), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 6.", "1/2 = 3/6 (ضربنا البسط والمقام في 3).", stimulus = "", art = listOf(), number = NumberControl(0.0, 6.0, 6)),
            Question("math-equivalent-3", "املأ الدلو إلى 1/2\nالدلو مقسوم إلى 8 أجزاء", listOf(), listOf(4), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 8.", "1/2 = 4/8 (ضربنا البسط والمقام في 4).", stimulus = "", art = listOf(), number = NumberControl(0.0, 8.0, 8)),
            Question("math-equivalent-4", "املأ الدلو إلى 1/2\nالدلو مقسوم إلى 10 أجزاء", listOf(), listOf(5), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 10.", "1/2 = 5/10 (ضربنا البسط والمقام في 5).", stimulus = "", art = listOf(), number = NumberControl(0.0, 10.0, 10)),
            Question("math-equivalent-5", "املأ الدلو إلى 3/4\nالدلو مقسوم إلى 8 أجزاء", listOf(), listOf(6), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 8.", "3/4 = 6/8 (ضربنا البسط والمقام في 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 8.0, 8)),
            Question("math-equivalent-6", "املأ الدلو إلى 3/4\nالدلو مقسوم إلى 12 جزءاً", listOf(), listOf(9), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 12.", "3/4 = 9/12 (ضربنا البسط والمقام في 3).", stimulus = "", art = listOf(), number = NumberControl(0.0, 12.0, 12)),
            Question("math-equivalent-7", "املأ الدلو إلى 2/3\nالدلو مقسوم إلى 6 أجزاء", listOf(), listOf(4), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 6.", "2/3 = 4/6 (ضربنا البسط والمقام في 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 6.0, 6)),
            Question("math-equivalent-8", "املأ الدلو إلى 2/3\nالدلو مقسوم إلى 9 أجزاء", listOf(), listOf(6), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 9.", "2/3 = 6/9 (ضربنا البسط والمقام في 3).", stimulus = "", art = listOf(), number = NumberControl(0.0, 9.0, 9)),
            Question("math-equivalent-9", "املأ الدلو إلى 1/5\nالدلو مقسوم إلى 10 أجزاء", listOf(), listOf(2), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 10.", "1/5 = 2/10 (ضربنا البسط والمقام في 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 10.0, 10)),
            Question("math-equivalent-10", "املأ الدلو إلى 3/5\nالدلو مقسوم إلى 10 أجزاء", listOf(), listOf(6), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 10.", "3/5 = 6/10 (ضربنا البسط والمقام في 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 10.0, 10)),
            Question("math-equivalent-11", "املأ الدلو إلى 1/3\nالدلو مقسوم إلى 12 جزءاً", listOf(), listOf(4), "اضرب البسط والمقام في العدد نفسه حتى يصير المقام 12.", "1/3 = 4/12 (ضربنا البسط والمقام في 4).", stimulus = "", art = listOf(), number = NumberControl(0.0, 12.0, 12)),
            Question("math-equivalent-12", "املأ الدلو إلى 4/8\nالدلو مقسوم إلى جزأين", listOf(), listOf(1), "اقسم البسط والمقام على العدد نفسه حتى يصير المقام 2.", "4/8 = 1/2 (قسمنا البسط والمقام على 4).", stimulus = "", art = listOf(), number = NumberControl(0.0, 2.0, 2)),
            Question("math-equivalent-13", "املأ الدلو إلى 6/9\nالدلو مقسوم إلى 3 أجزاء", listOf(), listOf(2), "اقسم البسط والمقام على العدد نفسه حتى يصير المقام 3.", "6/9 = 2/3 (قسمنا البسط والمقام على 3).", stimulus = "", art = listOf(), number = NumberControl(0.0, 3.0, 3)),
            Question("math-equivalent-14", "املأ الدلو إلى 8/10\nالدلو مقسوم إلى 5 أجزاء", listOf(), listOf(4), "اقسم البسط والمقام على العدد نفسه حتى يصير المقام 5.", "8/10 = 4/5 (قسمنا البسط والمقام على 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 5.0, 5)),
            Question("math-equivalent-15", "املأ الدلو إلى 9/12\nالدلو مقسوم إلى 4 أجزاء", listOf(), listOf(3), "اقسم البسط والمقام على العدد نفسه حتى يصير المقام 4.", "9/12 = 3/4 (قسمنا البسط والمقام على 3).", stimulus = "", art = listOf(), number = NumberControl(0.0, 4.0, 4)),
            Question("math-equivalent-16", "املأ الدلو إلى 6/8\nالدلو مقسوم إلى 4 أجزاء", listOf(), listOf(3), "اقسم البسط والمقام على العدد نفسه حتى يصير المقام 4.", "6/8 = 3/4 (قسمنا البسط والمقام على 2).", stimulus = "", art = listOf(), number = NumberControl(0.0, 4.0, 4)),
            Question("math-equivalent-17", "املأ الدلو إلى 0.5\nالدلو مقسوم إلى 4 أجزاء", listOf(), listOf(2), "اكتب العدد العشري كسراً مقامه 10 أو 100، ثم اجعل مقامه 4.", "0.5 = 1/2 = 2/4.", stimulus = "", art = listOf(), number = NumberControl(0.0, 4.0, 4)),
            Question("math-equivalent-18", "املأ الدلو إلى 0.25\nالدلو مقسوم إلى 4 أجزاء", listOf(), listOf(1), "اكتب العدد العشري كسراً مقامه 10 أو 100، ثم اجعل مقامه 4.", "0.25 = 1/4.", stimulus = "", art = listOf(), number = NumberControl(0.0, 4.0, 4)),
            Question("math-equivalent-19", "املأ الدلو إلى 0.75\nالدلو مقسوم إلى 8 أجزاء", listOf(), listOf(6), "اكتب العدد العشري كسراً مقامه 10 أو 100، ثم اجعل مقامه 8.", "0.75 = 3/4 = 6/8.", stimulus = "", art = listOf(), number = NumberControl(0.0, 8.0, 8)),
            Question("math-equivalent-20", "املأ الدلو إلى 0.4\nالدلو مقسوم إلى 5 أجزاء", listOf(), listOf(2), "اكتب العدد العشري كسراً مقامه 10 أو 100، ثم اجعل مقامه 5.", "0.4 = 2/5.", stimulus = "", art = listOf(), number = NumberControl(0.0, 5.0, 5)),
            Question("math-equivalent-21", "املأ الدلو إلى 75%\nالدلو مقسوم إلى 4 أجزاء", listOf(), listOf(3), "النسبة المئوية كسر مقامه 100: 75% = 75/100. اختصره حتى يصير المقام 4.", "75% = 75/100 = 3/4.", stimulus = "", art = listOf(), number = NumberControl(0.0, 4.0, 4)),
            Question("math-equivalent-22", "املأ الدلو إلى 40%\nالدلو مقسوم إلى 5 أجزاء", listOf(), listOf(2), "النسبة المئوية كسر مقامه 100: 40% = 40/100. اختصره حتى يصير المقام 5.", "40% = 40/100 = 2/5.", stimulus = "", art = listOf(), number = NumberControl(0.0, 5.0, 5)),
            Question("math-equivalent-23", "املأ الدلو إلى 20%\nالدلو مقسوم إلى 10 أجزاء", listOf(), listOf(2), "النسبة المئوية كسر مقامه 100: 20% = 20/100. اختصره حتى يصير المقام 10.", "20% = 20/100 = 2/10.", stimulus = "", art = listOf(), number = NumberControl(0.0, 10.0, 10)),
            Question("math-equivalent-24", "املأ الدلو إلى 50%\nالدلو مقسوم إلى 6 أجزاء", listOf(), listOf(3), "النسبة المئوية كسر مقامه 100: 50% = 50/100. اختصره حتى يصير المقام 6.", "50% = 50/100 = 3/6.", stimulus = "", art = listOf(), number = NumberControl(0.0, 6.0, 6))
        ), 8,
    )
}
