// Grade 6 Social studies — حضارات سوريا القديمة (ancient civilizations of Syria).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { match } from '../engines/match.js';
import { cards } from '../engines/visuals.js';

export const PAIRS = [
  { a: '🔤 أوغاريت', b: 'أول أبجدية في العالم', hint: 'مملكة على الساحل قرب اللاذقية.' },
  { a: '📚 إيبلا', b: 'مكتبة ضخمة من الألواح الطينية', hint: 'قرب إدلب، وُجد فيها آلاف الرُّقُم.' },
  { a: '🏛️ ماري', b: 'قصر عظيم على نهر الفرات', hint: 'في الشرق قرب البوكمال.' },
  { a: '👑 تدمر', b: 'الملكة زنوبيا', hint: 'مدينة القوافل في البادية.' },
  { a: '🎭 بصرى', b: 'مسرح روماني من حجر البازلت', hint: 'في حوران جنوب سوريا.' },
  { a: '🏙️ دمشق', b: 'من أقدم العواصم المأهولة في العالم', hint: 'مدينة الياسمين.' },
];

registerTopic({
  id: 'social-civilizations', region: 'social', order: 3, icon: '🏺',
  title: 'حضارات بلادي', blurb: 'أوغاريت وإيبلا وماري',
  learn: [{
    title: 'أرض الحضارات',
    html: `<p>على أرض سوريا قامت حضارات من أقدم حضارات العالم، وفي <b>أوغاريت</b> كُتبت أول أبجدية عرفها البشر!</p>${cards(PAIRS.map(p => [p.a.split(' ')[0], p.a.split(' ').slice(1).join(' '), p.b]))}`,
    say: 'أبجدية أوغاريت كانت ثلاثين حرفاً فقط، بدل مئات الرموز.',
  }],
  render: match({ pairs: PAIRS, boards: 2, perBoard: 3, headA: 'المدينة', headB: 'اشتهرت بـ', intro: 'عالمة الآثار وجدت بطاقات متناثرة: صِل كل مدينة قديمة بما اشتهرت به.' }),
});
