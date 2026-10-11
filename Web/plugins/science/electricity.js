// Grade 6 Science — الكهرباء: المواد الموصلة والعازلة.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { sort } from '../engines/sort.js';
import { cards } from '../engines/visuals.js';

const C = { bin: 'c', hint: 'المعادن تسمح بمرور التيار الكهربائي، فهي موصلة.', explain: 'مادة موصلة: يمرّ فيها التيار فيضيء المصباح.' };
const I = { bin: 'i', hint: 'البلاستيك والخشب الجاف والمطاط لا تسمح بمرور التيار: إنها عازلة.', explain: 'مادة عازلة: لا يمرّ فيها التيار، لذلك نغطي بها الأسلاك.' };

export const ITEMS = [
  { text: '🟠 سلك نحاس', ...C }, { text: '🔩 مسمار حديد', ...C }, { text: '🥫 علبة ألمنيوم', ...C }, { text: '✏️ رصاص القلم', ...C }, { text: '🔑 مفتاح معدني', ...C },
  { text: '🧴 بلاستيك', ...I }, { text: '🪵 خشب جاف', ...I }, { text: '🎈 مطاط', ...I }, { text: '🥛 كأس زجاج', ...I }, { text: '📄 ورق', ...I },
];

registerTopic({
  id: 'science-electricity', region: 'science', order: 6, icon: '🔌',
  title: 'موصل أم عازل؟', blurb: 'هل يضيء المصباح؟',
  learn: [{
    title: 'الدارة الكهربائية',
    html: cards([['🔋', 'البطارية', 'مصدر الطاقة'], ['💡', 'المصباح', 'يضيء إذا اكتملت الدارة'], ['🟠', 'الموصل', 'يمرّر التيار'], ['🧴', 'العازل', 'يمنع التيار']]),
    say: 'لهذا نغلّف الأسلاك بالبلاستيك: العازل يحمينا من الكهرباء. ولا نلمس الكهرباء بأيدٍ مبلّلة أبداً!',
  }],
  render: sort({
    items: ITEMS, count: 8, prompt: 'إذا وضعنا هذه المادة في الدارة، هل يضيء المصباح؟',
    bins: [{ id: 'c', label: 'موصلة (يضيء)', icon: '💡' }, { id: 'i', label: 'عازلة (لا يضيء)', icon: '🚫' }],
    intro: 'الكهربائي يختبر المواد: أيّها يوصل الكهرباء؟',
  }),
});
