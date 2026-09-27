// Grade 6 Arabic — الفاعل والمفعول به (subject and object of a verbal sentence).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { tapword } from '../engines/tapword.js';

const SENTENCES = [
  ['كتبَ', 'الطالبُ', 'الدرسَ'],
  ['قرأتْ', 'ياسمينةُ', 'القصةَ'],
  ['رفعَ', 'البحّارُ', 'الشراعَ'],
  ['يحبُّ', 'سندبادُ', 'البحرَ'],
  ['أضاءَ', 'المنارُ', 'الطريقَ'],
  ['شربَ', 'العصفورُ', 'الماءَ'],
  ['زرعَ', 'الفلاحُ', 'الزيتونَ'],
  ['فتحَ', 'المعلمُ', 'البابَ'],
  ['رسمَ', 'الطفلُ', 'السفينةَ'],
  ['يقرأُ', 'الهدهدُ', 'الخريطةَ'],
  ['قطفَتْ', 'البنتُ', 'الياسمينَ'],
  ['سقى', 'الولدُ', 'الشجرةَ'],
];

const FAEL = {
  ask: 'الفاعل',
  hint: 'الفاعل هو مَن قام بالفعل. اسأل نفسك: مَن الذي فعل؟ وهو مرفوع، وعلامته غالباً الضمة.',
  explain: 'الفاعل اسم مرفوع يدل على مَن قام بالفعل.',
};
const MAFOOL = {
  ask: 'المفعول به',
  hint: 'المفعول به هو ما وقع عليه الفعل. اسأل: ماذا فعل؟ ومَن؟ وهو منصوب، وعلامته غالباً الفتحة.',
  explain: 'المفعول به اسم منصوب يدل على ما وقع عليه فعل الفاعل.',
};

export const ITEMS = SENTENCES.flatMap(words => [
  { words, answer: 1, ...FAEL, note: `«${words[1]}» فاعل مرفوع بالضمة.` },
  { words, answer: 2, ...MAFOOL, note: `«${words[2]}» مفعول به منصوب بالفتحة.` },
]);

registerTopic({
  id: 'arabic-fael-mafool',
  region: 'arabic',
  order: 1,
  icon: '✍️',
  title: 'الفاعل والمفعول به',
  blurb: 'مَن قام بالفعل؟ وعلى مَن وقع؟',
  render: tapword({
    items: ITEMS, count: 8,
    intro: 'بوابة الحروف مقفلة بشيفرة! في كل جملة فعلية: <b>فعل</b> ثم <b>فاعل</b> مرفوع ثم <b>مفعول به</b> منصوب.',
  }),
});
