// Grade 6 Arabic — أنواع الجمع (sound masculine / sound feminine / broken plurals).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { sort } from '../engines/sort.js';

const M = { bin: 'm', hint: 'جمع المذكر السالم ينتهي بـ«ونَ» أو «ينَ» ويبقى فيه المفرد سليماً.' };
const F = { bin: 'f', hint: 'جمع المؤنث السالم ينتهي بـ«ات» ويبقى فيه المفرد سليماً.' };
const B = { bin: 'b', hint: 'جمع التكسير يتغيّر فيه شكل المفرد، مثل: كتاب ← كُتُب.' };

export const ITEMS = [
  { text: 'المعلمونَ', ...M }, { text: 'المهندسينَ', ...M }, { text: 'الفلاحونَ', ...M },
  { text: 'اللاعبينَ', ...M }, { text: 'المسافرونَ', ...M }, { text: 'البحّارونَ', ...M },
  { text: 'المعلماتُ', ...F }, { text: 'الطالباتُ', ...F }, { text: 'الشجراتُ', ...F },
  { text: 'السياراتُ', ...F }, { text: 'الرحلاتُ', ...F }, { text: 'الزهراتُ', ...F },
  { text: 'كُتُبٌ', ...B }, { text: 'بحارٌ', ...B }, { text: 'سُفُنٌ', ...B },
  { text: 'أشجارٌ', ...B }, { text: 'جُزُرٌ', ...B }, { text: 'نجومٌ', ...B }, { text: 'قلاعٌ', ...B },
].map(it => ({
  ...it,
  explain: { m: 'هذا جمع مذكر سالم: زِدنا على المفرد «ونَ/ينَ».', f: 'هذا جمع مؤنث سالم: زِدنا على المفرد «ات».', b: 'هذا جمع تكسير: تغيّر بناء المفرد.' }[it.bin],
}));

registerTopic({
  id: 'arabic-plurals',
  region: 'arabic',
  order: 3,
  icon: '📚',
  title: 'أنواع الجمع',
  blurb: 'مذكر سالم، مؤنث سالم، أم تكسير؟',
  render: sort({
    items: ITEMS, count: 9,
    prompt: 'في أي سلّة نضع هذا الجمع؟',
    bins: [
      { id: 'm', label: 'جمع مذكر سالم', icon: '👨‍🎓' },
      { id: 'f', label: 'جمع مؤنث سالم', icon: '👩‍🎓' },
      { id: 'b', label: 'جمع تكسير', icon: '🔨' },
    ],
    intro: 'في الميناء صناديق مختلطة! ضع كل جمع في سلّته الصحيحة.',
  }),
});
