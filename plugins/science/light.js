// Grade 6 Science — الضوء: مواد شفافة ونصف شفافة ومعتمة.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { sort } from '../engines/sort.js';
import { cards } from '../engines/visuals.js';

const T = { bin: 't', hint: 'الشفاف يمرّر الضوء كله، فنرى ما خلفه بوضوح.', explain: 'مادة شفافة: نرى من خلالها بوضوح.' };
const H = { bin: 'h', hint: 'نصف الشفاف يمرّر جزءاً من الضوء، فنرى ما خلفه غير واضح.', explain: 'مادة نصف شفافة: نرى خلفها بغير وضوح.' };
const O = { bin: 'o', hint: 'المعتم لا يمرّر الضوء، ويصنع ظلاً خلفه.', explain: 'مادة معتمة: تحجب الضوء فيتكوّن ظل.' };

export const ITEMS = [
  { text: '🪟 زجاج النافذة', ...T }, { text: '💧 الماء الصافي', ...T }, { text: '🌬️ الهواء', ...T }, { text: '🥤 كيس بلاستيك شفاف', ...T },
  { text: '🧈 ورق الزبدة', ...H }, { text: '🚿 الزجاج المحبّب', ...H }, { text: '🌫️ الضباب', ...H }, { text: '🧣 قماش رقيق', ...H },
  { text: '🪵 الخشب', ...O }, { text: '🔩 الحديد', ...O }, { text: '🪨 الحجر', ...O }, { text: '📦 الكرتون', ...O },
];

registerTopic({
  id: 'science-light', region: 'science', order: 4, icon: '💡',
  title: 'الضوء والمواد', blurb: 'شفاف، نصف شفاف، أم معتم؟',
  learn: [{
    title: 'الضوء يسير في خطوط مستقيمة',
    html: cards([['🪟', 'شفاف', 'يمرّر الضوء كله'], ['🧈', 'نصف شفاف', 'يمرّر بعضه'], ['🪵', 'معتم', 'يحجبه ويصنع ظلاً']]),
    say: 'الظل يتكوّن عندما تحجب مادة معتمة الضوء.',
  }],
  render: sort({
    items: ITEMS, count: 9, prompt: 'كيف تتعامل هذه المادة مع الضوء؟',
    bins: [{ id: 't', label: 'شفافة', icon: '🔆' }, { id: 'h', label: 'نصف شفافة', icon: '🌗' }, { id: 'o', label: 'معتمة', icon: '🌑' }],
    intro: 'المصوّر يحتاج مواد لصوره: رتّبها حسب مرور الضوء فيها.',
  }),
});
