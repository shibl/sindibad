// Treasure island — mixed review of the whole grade.
//
// Reuses other topics' question banks, converted to multiple choice, so the
// student revisits everything spaced out over time (SPEC: adaptive review).
// This shows a plugin can build on other plugins' exported content without
// the core knowing anything about it.

import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { mixed as questions } from './pools.js';

registerTopic({
  id: 'review-treasure',
  region: 'treasure',
  order: 1,
  icon: '💎',
  title: 'قفل الكنز',
  blurb: 'مراجعة من كل الجزر',
  render: quiz({
    questions, count: 10,
    intro: 'قفل الصندوق له عشرة أرقام سرية، وكل رقم سؤال من جزيرة زرتها. تذكّر جيداً!',
  }),
});
