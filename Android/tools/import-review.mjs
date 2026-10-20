// Existing declarative review banks only; does not launch any game runtime.
import fs from 'node:fs/promises';
import { plain } from '../../Shared/Art/tools/math-source.mjs';
const quote = value => JSON.stringify(plain(value)).replace(/\$/g, '\\$');
const functions = [];
for (const [region, source] of [['science', 'lab'], ['social', 'atlas'], ['art', 'studio'], ['english', 'english']]) {
  const { QUESTS, reviewOf } = await import(`../../Web/worlds/grade6/${source}.js`);
  const rows = QUESTS.flatMap(quest => reviewOf(quest.id).map((q, i) =>
    `Question(${quote(`review-${region}-${quest.id}-${i}`)}, ${quote(q.q)}, listOf(${q.options.map(quote).join(', ')}), listOf(${q.answer}), ${quote(q.hint)}, ${quote(q.explain)})`));
  functions.push(`    fun ${region}(): List<Question> = listOf(\n        ${rows.join(',\n        ')}\n    )`);
}
await fs.writeFile(new URL('../app/src/main/kotlin/org/sindibad/android/content/ReviewBank.kt', import.meta.url),
`// Draft content, pending review by Syrian educators. CC-BY-SA.
// Existing website review content; regenerate with Android/tools/import-review.mjs.
package org.sindibad.android.content
import org.sindibad.android.domain.Question
object ReviewBank {
${functions.join('\n\n')}
}
`);
