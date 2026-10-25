import translations from './lab-en.json' with { type: 'json' };
import { lang } from './locale.js';
export { lang };

const arabic = /[\u0600-\u06ff]/;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const letters = '\\p{Script=Arabic}';
const phrases = Object.keys(translations).sort((a, b) => b.length - a.length);
const pattern = new RegExp(`(?<![${letters}])(?:${phrases.map(escape).join('|')})(?![${letters}])`, 'gu');

// Preserve formulas and markup. Exact prose matches take precedence over the
// bounded phrases used around dynamic numbers, chemical formulas, and UI values.
function translatePart(value) {
  const trimmed = value.trim();
  if (Object.hasOwn(translations, trimmed)) return value.replace(trimmed, translations[trimmed]);
  return value.replace(pattern, match => translations[match]);
}
export function tr(value) {
  if (lang === 'ar' || typeof value !== 'string' || !arabic.test(value)) return value;
  if (Object.hasOwn(translations, value)) return translations[value];
  return value.split(/(<[^>]*>|\[\[.*?\]\]|\{\{.*?\}\})/g).map(part => {
    if (part.startsWith('[[') || part.startsWith('{{')) return part;
    if (part.startsWith('<')) return part.replace(/((?:title|aria-label)=["'])([^"']*)(["'])/g, (_, before, content, after) => before + translatePart(content) + after);
    return translatePart(part);
  }).join('');
}
