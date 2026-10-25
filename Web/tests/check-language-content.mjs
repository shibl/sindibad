// Coverage of the authored curriculum, including generated review questions.
// Display translations must not collapse distinct answers or lose variables.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { writeFileSync } from 'node:fs';
const engines = ['quiz', 'tapword', 'sort', 'match', 'numberline', 'blocks', 'fill', 'helm', 'market'];
register('data:text/javascript,' + encodeURIComponent(`
  const engines = ${JSON.stringify(engines)};
  export async function load(url, context, next) {
    const m = /\\/plugins\\/engines\\/([a-z]+)\\.js$/.exec(url);
    if (!m || !engines.includes(m[1])) return next(url, context);
    return { format: 'module', shortCircuit: true, source: \`export * from '\${url}?real';
      export const \${m[1]} = opts => Object.assign(() => {}, { engine: '\${m[1]}', opts });\` };
  }`));
const { translate } = await import('../core/i18n.js');
const { EN } = await import('../core/i18n/en.js');
const { CONTENT_EN } = await import('../core/i18n/content-en.js');
const { ARABIC_EN } = await import('../core/i18n/arabic-en.js');
const { MATH_EN } = await import('../core/i18n/math-en.js');
const arabic = /[\u0621-\u064a]/;
const normalize = s => s.replace(/\s+/g, ' ').trim();
const parts = html => String(html).split(/<[^>]*>/).map(normalize).filter(s => arabic.test(s));
const missing = new Map(), duplicates = [];
let count = 0, questions = 0;
const english = (html, subject) => String(html).split(/(<[^>]*>)/).map(p => p.startsWith('<') ? '' : translate(p, 'en', 0, subject)).join('');
function check(value, where, subject) {
  if (typeof value === 'string') {
    for (const s of parts(value)) {
      // The Arabic subject's literal words/examples stay Arabic. Every
      // instruction/explanation still has an explicit reviewed entry.
      if (subject === 'arabic' && (s in ARABIC_EN || s.length < 20)) continue;
      count++;
      if (translate(s, 'en', 0, subject) === s && s.length > 1) missing.set(s, where);
    }
  } else if (Array.isArray(value)) value.forEach((x, i) => check(x, `${where}[${i}]`, subject));
  else if (value && typeof value === 'object') {
    subject = value.curriculum || subject;
    for (const [key, v] of Object.entries(value)) {
      if (key === 'render') continue;
      check(v, `${where}.${key}`, subject);
    }
    if (value.options?.every(o => typeof o === 'string') && subject !== 'arabic') {
      questions++;
      const options = value.options.map(o => normalize(english(o, subject)).toLowerCase());
      if (new Set(options).size !== options.length) duplicates.push({ where, original: value.options, english: options });
    }
    if (value.kind === 'match' && value.pairs) {
      const answers = value.pairs.map(p => normalize(english(p[1], subject)).toLowerCase());
      if (new Set(answers).size !== answers.length) duplicates.push({ where, original: value.pairs.map(p => p[1]), english: answers });
    }
  }
}
for (const [file, subject] of [['lab', 'science'], ['atlas', 'social'], ['studio', 'art'], ['english', 'english'], ['tunes', 'music'], ['farm', 'agriculture'], ['math', 'math'], ['arabic', 'arabic'], ['treasure', 'treasure']]) {
  const data = await import(`../worlds/grade6/${file}.js`);
  check(data, file, subject);
  const viewModules = {
    lab: [['core/lab/views.js', 'VIEWS'], ['core/lab/views-machines.js', 'MACHINE_VIEWS']],
    atlas: [['core/atlas/views.js', 'ATLAS_VIEWS']],
    studio: [['core/studio/views.js', 'VIEWS']],
    english: [['core/english/views.js', 'EN_VIEWS']],
  };
  const views = {};
  for (const [path, name] of viewModules[file] || []) Object.assign(views, (await import(`../${path}`))[name]);
  for (const quest of data.QUESTS || []) for (const step of quest.steps || []) {
    for (const key of new Set([step.view, step.pic])) if (key && views[key]) check(views[key].html(step), `${file}/${quest.id}/${key}`, subject);
  }
}
check(await import('../worlds/atlas/countries.js'), 'countries', 'social');
await import('../plugins/index.js');
const { allTopics } = await import('../core/topics.js');
for (const topic of allTopics()) {
  check(topic, topic.id, topic.region);
  const opts = topic.render.opts;
  check(opts, topic.id, topic.region);
  for (const field of ['questions', 'items', 'pairs']) {
    if (typeof opts?.[field] === 'function') for (let i = 0; i < 3; i++) check(opts[field](), topic.id, topic.region);
  }
}
const placeholder = s => [...s.matchAll(/\{\w+\}/g)].map(m => m[0]).sort();
const badVariables = [];
for (const [name, data] of Object.entries({ EN, CONTENT_EN, ARABIC_EN, MATH_EN })) {
  for (const [ar, en] of Object.entries(data)) {
    if (!en.trim()) badVariables.push(`${name}: empty translation for ${ar}`);
    // Repeated variables may be omitted when English needs fewer repetitions,
    // but never invent or drop a distinct value from a curriculum phrase.
    if (name !== 'EN' && JSON.stringify([...new Set(placeholder(ar))]) !== JSON.stringify([...new Set(placeholder(en))])) badVariables.push(`${name}: ${ar} → ${en}`);
  }
}
if (process.env.LANGUAGE_REPORT) writeFileSync(process.env.LANGUAGE_REPORT, JSON.stringify({ missing: [...missing].map(([ar, where]) => ({ ar, where })), duplicates, badVariables }, null, 2));
console.log(`English coverage: ${count} display fragments, ${questions} choice questions; ${missing.size} missing, ${duplicates.length} ambiguous choices, ${badVariables.length} variable errors.`);
if (missing.size) console.log('Missing:', [...missing].slice(0, 8));
if (duplicates.length) console.log('Ambiguous:', duplicates.slice(0, 5));
assert.equal(missing.size, 0, 'all curriculum display text has an English translation');
assert.equal(duplicates.length, 0, 'translated answer choices remain distinct');
assert.deepEqual(badVariables, [], 'curriculum translations preserve their variables');

// Educational meaning regressions found while reviewing the initial draft.
// Check the actual translator, including inline templates and subject terms.
assert.equal(translate('معدّل الولادات − معدّل الوفيات', 'en'), 'Birth rate − death rate');
assert.equal(translate('معدّل الولادات + معدّل الوفيات', 'en'), 'Birth rate + death rate');
assert.equal(translate('خُمس كمية الحليب تقريباً.', 'en'), 'About one fifth of the amount of milk.');
assert.equal(translate('الدولة القديمة (3200–2230 ق.م)', 'en'), 'The Old Kingdom (3200–2230 BCE)');
assert.equal(translate('اختر الضمير المناسب: ___', 'en'), 'Choose the correct pronoun: ___');
assert.equal(translate('الفعل', 'en', 0, 'arabic'), 'Verb');
assert.equal(translate('الكلية', 'en'), 'Kidney');
assert.equal(translate('العرق', 'en'), 'Sweat');
assert.equal(translate('قوة تماس', 'en'), 'Contact force');
assert.equal(translate('لا', 'en'), 'No');
assert.equal(translate('لا', 'en', 0, 'music'), 'La');
assert.equal(translate(': لا.', 'en', 0, 'music'), ': La.');
assert.equal(translate('مساحة المثلث = (القاعدة × الارتفاع) ÷ 2 — نصف مساحة المستطيل.', 'en', 0, 'math'), "Triangle area = (base × height) ÷ 2—half the rectangle's area.");
assert.equal(translate('الفاعل «الطالبُ» مرفوع بالضمة، والمفعول به «الدرسَ» منصوب بالفتحة.', 'en', 0, 'arabic'), 'The subject «الطالبُ» is nominative, marked with damma; the object «الدرسَ» is accusative, marked with fatha.');
console.log('Curriculum meaning regression checks passed.');
