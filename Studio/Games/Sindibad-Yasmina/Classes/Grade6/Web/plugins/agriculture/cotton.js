// Made from cotton.ts by tools/build.ts. Edit that file, then run: npm run build
// Grade 6 Agriculture — cotton, "white gold" (book: «الذهب الأبيض»).
// Quick review for the farm island's quest (worlds/grade6/farm.js).
// Draft content, pending review by Syrian educators. CC-BY-SA.
import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
export const QUESTIONS = [
    { q: 'متى نبذر القطن لتكون أليافه طويلة متينة؟', options: ['مبكراً، من 15 آذار', 'في أيلول', 'في كانون الثاني'], answer: 0, hint: 'في أول الربيع.', explain: 'من 15 آذار إلى أول نيسان.' },
    { q: 'على أيّ عمق نبذر القطن؟', options: ['5 سم', '30 سم', 'فوق السطح'], answer: 0, hint: 'البذرة صغيرة.', explain: 'على عمق 5 سم، في خطوط.' },
    { q: 'ما «التفريد»؟', options: ['تخفيف البادرات المتزاحمة', 'قطف الجوزات', 'ربط النبات بأوتاد'], answer: 0, hint: 'لتأخذ كل نبتة حاجتها.', explain: 'نخفّف البادرات فيصير لكل نبتة مكان يكفيها.' },
    { q: 'لماذا نقطف القطن على 2–3 قطفات؟', options: ['لأن الجوزات تتفتّح بالتتابع من الأسفل إلى الأعلى', 'لأن السلّة صغيرة', 'لأن القطن يذبل بسرعة'], answer: 0, hint: 'الجوزات لا تتفتّح كلها معاً.', explain: 'تتفتّح الجوزات بالتتابع من أسفل النبات إلى أعلاه.' },
    { q: 'متى يبدأ قطاف القطن؟', options: ['من نهاية أيلول', 'في أول آذار', 'في كانون الثاني'], answer: 0, hint: 'في الخريف.', explain: 'يبدأ القطاف في 30 أيلول تقريباً.' },
    { q: 'ما الصحيح عن القطن في سورية؟', options: ['محصول نقدي مهم: للصناعة والغذاء والعلف', 'نبات زينة فقط', 'لا يُزرع في سورية'], answer: 0, hint: 'يسمّونه «الذهب الأبيض».', explain: 'القطن محصول نقدي: ألياف وزيت وعلف.' },
    { q: 'بعد كم أسبوعاً يزهر القطن؟', options: ['8–10 أسابيع', 'أسبوع واحد', '50 أسبوعاً'], answer: 0, hint: 'نحو شهرين.', explain: 'يزهر بعد 8–10 أسابيع، وتتفتّح الجوزات بعد 18–20 أسبوعاً.' },
    { q: 'ماذا نفعل مباشرة بعد بذار القطن؟', options: ['نسقي', 'نقطف', 'نوقف السقاية'], answer: 0, hint: 'البذور تحتاج إلى ماء لتنبت.', explain: 'نسقي بعد البذار مباشرة.' },
];
registerTopic({
    id: 'farm-cotton', region: 'farm', order: 6, icon: '☁️',
    title: 'الذهب الأبيض', blurb: 'زراعة القطن',
    render: quiz({ questions: QUESTIONS, count: 6, intro: 'نتذكّر كيف زرعنا القطن!' }),
});
