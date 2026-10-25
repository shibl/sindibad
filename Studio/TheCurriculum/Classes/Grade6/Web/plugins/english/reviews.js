// Grade 6 English — the quick reviews of the English island's quests.
// The island plays each unit of the book (worlds/grade6/english.js,
// core/english/); these quizzes are what spaced repetition brings back.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { QUESTS, reviewOf } from '../../worlds/grade6/english.js';

QUESTS.forEach((q, i) => registerTopic({
  id: q.topic, region: 'english', order: i + 1, icon: q.icon,
  title: q.title, blurb: q.goal,
  render: quiz({ questions: reviewOf(q.id), count: 6, intro: `نتذكّر معاً درس «${q.title}» من جزيرة Hello! ⭐` }),
}));
