// Maintainer-only curriculum reader. Captures declarative lesson data without
// importing the game's runtime, creating a DOM, or starting a renderer.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as format from '../../../Web/core/format.js';
import * as visuals from '../../../Web/plugins/engines/visuals.js';

export const mathFiles = ['fractions-line', 'decimals', 'percent', 'fraction-ops',
  'integers', 'ratio', 'area', 'divisibility', 'angles', 'market', 'equivalent'];

/** A card of a topic's mini-lesson. */
export interface MathCard { title: string; html: string; say?: string }
/** A question as the math plugins write it: each engine reads its own fields. */
export interface MathQuestion {
  q?: string; options?: string[]; answer?: number; hint?: string; explain?: string;
  /** NumberLine: the label, the value and the line's ends and ticks. */
  label?: string; value?: number; min?: number; max?: number; ticks?: number;
  /** Angle: the angle, or the one shown within a range. */
  angle?: number; show?: number; range?: [number, number];
  /** Fill: the number of parts. Market: the price to pay. */
  parts?: number; target?: number;
}
/** A math topic, with its engine's kind, question count and questions. */
export interface MathTopic { id: string; title: string; blurb: string; learn: MathCard[]; kind: string; count: number; questions: MathQuestion[] }
type Options = { kind: string; count: number; items?: MathQuestion[]; questions?: MathQuestion[] | (() => MathQuestion[]) };

export async function captureMath(name: string): Promise<MathTopic> {
  const source = await fs.readFile(new URL(`../../../Web/plugins/math/${name}.js`, import.meta.url), 'utf8');
  let topic: (Omit<MathTopic, 'questions' | 'kind' | 'count'> & { render: Options }) | undefined;
  const capture = (kind: string) => (options: object) => ({ kind, ...options });
  const context = vm.createContext({
    ...format, ...visuals, f: format.frac,
    registerTopic: (value: typeof topic) => { topic = value; },
    quiz: capture('Choice'), numberline: capture('NumberLine'), helm: capture('Angle'),
    market: capture('Market'), fill: capture('Fill'),
    // Only divisibility's render data is a function; it is generated in Kotlin.
    shuffle: (values: unknown[]) => [...values],
  });
  vm.runInContext(source.replace(/^import .*;\s*$/gm, '').replace(/\bexport /g, ''), context,
    { timeout: 1000, filename: name });
  if (!topic) throw new Error(`${name}: no topic registered`);
  const options = topic.render;
  const questions = name === 'divisibility' ? [] :
    options.items || (typeof options.questions === 'function' ? options.questions() : options.questions) || [];
  return { ...topic, questions, kind: options.kind, count: options.count };
}

export function plain(html = '') {
  return String(html)
    .replace(/<svg\b[\s\S]*?<\/svg>/g, '')
    .replace(/<span class="frac"[^>]*><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '$1/$2')
    .replace(/<(?:br\s*\/?|\/p|\/div|small\b[^>]*)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
