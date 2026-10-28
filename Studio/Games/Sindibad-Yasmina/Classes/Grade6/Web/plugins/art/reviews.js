// Made from reviews.ts by tools/build.ts. Edit that file, then run: npm run build
// Grade 6 Art — the quick reviews of the art island's quests.
// The island plays each lesson of the book (worlds/grade6/studio.js,
// core/studio/); these quizzes are what spaced repetition brings back.
// Draft content, pending review by Syrian educators. CC-BY-SA.
import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { QUESTS, reviewOf } from '../../worlds/grade6/studio.js';
QUESTS.forEach((q, i) => registerTopic({
    id: q.topic, region: 'art', order: i + 1, icon: q.icon,
    title: q.title, blurb: q.goal,
    render: quiz({ questions: reviewOf(q.id), count: 6, intro: `نتذكّر معاً درس «${q.title}» من جزيرة الألوان! 🎨` }),
}));
