// Grade 6 Social studies — معالم سوريا ومحافظاتها (landmarks and governorates).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { match } from '../engines/match.js';

export const PAIRS = [
  { a: '🕌 الجامع الأموي', b: 'دمشق', hint: 'بُني في العاصمة أيام الدولة الأموية.' },
  { a: '🏰 القلعة الكبرى على التلّ', b: 'حلب', hint: 'مدينة الشهباء، من أقدم مدن العالم المأهولة.' },
  { a: '🎡 النواعير', b: 'حماة', hint: 'دواليب خشبية على نهر العاصي.' },
  { a: '🏛️ مدينة تدمر الأثرية', b: 'حمص', hint: 'مملكة زنوبيا في البادية، تتبع أكبر المحافظات مساحةً.' },
  { a: '🏝️ جزيرة أرواد', b: 'طرطوس', hint: 'الجزيرة الوحيدة المأهولة على الساحل السوري.' },
  { a: '⚓ المرفأ الأكبر', b: 'اللاذقية', hint: 'عروس الساحل وأكبر موانئ سوريا.' },
  { a: '🎭 المسرح الروماني الأسود', b: 'درعا', hint: 'مدرّج بُصرى المبني من حجر البازلت في حوران.' },
  { a: '🏯 قلعة جعبر', b: 'الرقة', hint: 'قلعة على شاطئ بحيرة الأسد التي صنعها سد الفرات.' },
];

registerTopic({
  id: 'social-landmarks',
  region: 'social',
  order: 1,
  icon: '🏰',
  title: 'معالم بلادي',
  blurb: 'صِل كل معلم بمحافظته',
  render: match({
    pairs: PAIRS, boards: 2, perBoard: 4,
    headA: 'المعلم', headB: 'المحافظة',
    intro: 'من فوق قلعة حلب نرى سوريا كلها! صِل كل <b>معلم</b> بـ<b>محافظته</b>.',
  }),
});
