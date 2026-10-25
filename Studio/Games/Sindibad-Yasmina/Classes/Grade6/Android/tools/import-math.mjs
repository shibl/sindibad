// Maintainer-only content import. Native interaction/scoring are handwritten
// Kotlin; this preserves the existing curriculum wording and diagram IDs.
import fs from 'node:fs/promises';
import { captureMath, mathFiles, plain } from '../../Shared/Art/tools/math-source.mjs';
const diagrams = JSON.parse(await fs.readFile(new URL('../../Shared/Art/lesson-diagrams.json', import.meta.url), 'utf8'));
const quote = value => JSON.stringify(String(value)).replace(/\$/g, '\\$');
const strings = values => `listOf(${values.map(quote).join(', ')})`;
const double = value => Number.isInteger(value) ? `${value}.0` : String(value);
const functions = [];
for (const name of mathFiles) {
  const t = await captureMath(name);
  const cards = t.learn.map((c, i) =>
    `LearnCard(${quote(c.title)}, ${quote([plain(c.html), plain(c.say)].filter(Boolean).join('\n\n'))}, art = ${strings(diagrams[`${t.id}/card-${i}`] || [])})`);
  const questions = t.questions.map((q, i) => {
    let prompt = plain(q.q), number = 'null', answer = q.answer, choices = (q.options || []).map(plain);
    const measurements = [...(q.q || '').matchAll(/<svg\b[\s\S]*?<\/svg>/g)]
      .flatMap(m => [...m[0].matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(t => plain(t[1])));
    const stimulus = measurements.length ? `قياسات الرسم: ${measurements.join('، ')}` : '';
    if (t.kind === 'NumberLine') {
      prompt = `أوصِل القارب إلى العدد ${plain(q.label)}`;
      answer = Math.round((q.value - q.min) * q.ticks / (q.max - q.min));
      number = `NumberControl(${double(q.min)}, ${double(q.max)}, ${q.ticks})`;
    } else if (t.kind === 'Angle') {
      answer = (q.angle ?? q.show) / 5;
      number = `NumberControl(0.0, 180.0, 36${q.range ? `, ${q.range[0] / 5}..${q.range[1] / 5}` : ''})`;
    } else if (t.kind === 'Fill') {
      number = `NumberControl(0.0, ${double(q.parts)}, ${q.parts})`;
    } else if (t.kind === 'Market') {
      answer = q.target;
      number = 'NumberControl(0.0, 1000.0, 1000)';
    }
    return `Question(${quote(`${t.id}-${i + 1}`)}, ${quote(prompt)}, ${strings(choices)}, listOf(${answer}), ${quote(plain(q.hint))}, ${quote(plain(q.explain))}, stimulus = ${quote(stimulus)}, art = ${strings(diagrams[`${t.id}/question-${i}`] || [])}, number = ${number})`;
  });
  const functionName = name.replaceAll('-', '_');
  functions.push(`    private fun ${functionName}() = Topic(
        ${quote(t.id)}, ${quote(t.title)}, ${quote(t.blurb)}, ActivityKind.${t.kind},
        listOf(\n            ${cards.join(',\n            ')}\n        ),
        ${name === 'divisibility' ? 'Divisibility.questions(0)' : `listOf(\n            ${questions.join(',\n            ')}\n        )`}, ${t.count},
    )`);
}
const source = `// Draft content, pending review by Syrian educators. CC-BY-SA.
// Curriculum data from Web/plugins/math; regenerate: node Android/tools/import-math.mjs
// No browser HTML or gameplay code is executed by Android.
package org.sindibad.android.content

import org.sindibad.android.domain.*

object MathTopics {
    val all: List<Topic> by lazy { listOf(${mathFiles.map(n => n.replaceAll('-', '_') + '()').join(', ')}) }
    fun get(id: String, seed: Int = 0): Topic {
        val topic = all.first { it.id == id }
        return if (id == "math-divisibility") topic.copy(questions = Divisibility.questions(seed)) else topic
    }
${functions.join('\n\n')}
}
`;
await fs.writeFile(new URL('../app/src/main/kotlin/org/sindibad/android/content/MathTopics.kt', import.meta.url), source);
console.log(`Imported ${mathFiles.length} native math topics; dynamic divisibility stays in Kotlin.`);
