// CC-BY-SA lesson prompts and feedback come from the shared Grade 6 curriculum.
import { plain } from '../../Shared/Art/tools/math-source.ts';

export function practiceCards(step) {
    function pick(prompt, options, answer, feedback = step.explain) {
        return { title: plain(step.q), text: plain(prompt), options: [...new Set(options.map(plain))],
            response: plain(answer), feedback: plain(feedback), clue: plain(step.hint) };
    }
    switch (step.kind) {
        case 'craft': return step.seq.map(s => pick(s.text, step.tools.map(t => t.label), step.tools.find(t => t.id === s.tool).label, s.say ?? step.explain));
        case 'spell': case 'build': return step.items.map(item => ({
            title: plain(step.q), text: plain(item.ar), sequence: step.kind === 'spell' ? [...item.en] : item.en.split(/\s+/), feedback: plain(step.explain) }));
        case 'verb': return step.lines.map(([q,, answer, others]) => pick(q, [answer, ...others], answer));
        case 'odd': return step.rows.map(([options, answer, why]) => pick(step.q, options, answer, why));
        case 'chat': return step.lines.flatMap((line, i) => Array.isArray(line[1]) ? [pick(step.lines[i - 1]?.[1] ?? step.q, line[1], line[1][0])] : []);
        case 'choice': return [pick(step.q, step.options, step.options[step.answer ?? 0])];
        case 'match': return step.pairs.map(([a, b]) => pick(a, step.pairs.map(pair => pair[1]), b));
        case 'tf': return step.items.map(([q, yes, why]) => pick(q, ['صح', 'خطأ'], yes ? 'صح' : 'خطأ', why));
        case 'twoway': return step.lines.map(([q, a, b]) => pick(q, [a, b], a));
        case 'sort': return step.items.map(([item, bin]) =>
            pick(item, step.bins.map(b => b.label), step.bins.find(b => b.id === bin).label));
        case 'number': return [pick(step.q + ' (' + (step.unit ?? '') + ')', [], String(step.answer))];
        case 'order': return [{ title: plain(step.q), text: plain(step.hint), sequence: step.items.map(plain), feedback: plain(step.explain) }];
        default: return [];
    }
}
