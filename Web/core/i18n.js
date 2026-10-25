// Made from i18n.ts by tools/build.ts. Edit that file, then run: npm run build
// Device-wide game language. Curriculum data and save identifiers stay stable.
// Display text is translated in place: changing
// language must not reconstruct a question, lose a typed answer or restart 3D.
import { storeKey, STAGING } from './env.js';
import { EN } from './i18n/en.js';
import { CONTENT_EN } from './i18n/content-en.js';
import { ARABIC_EN } from './i18n/arabic-en.js';
import { MATH_EN } from './i18n/math-en.js';
const KEY = storeKey('language');
let language = 'ar';
try {
    if (typeof window !== 'undefined' && localStorage.getItem(KEY) === 'en')
        language = 'en';
}
catch { /* Private browsing: keep it in memory. */ }
export const getLanguage = () => language;
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const reviewedPhrases = Object.fromEntries(Object.entries({ ...ARABIC_EN, ...MATH_EN }).filter(([ar]) => ar.length > 20));
const catalogue = { ...CONTENT_EN, ...EN, ...reviewedPhrases };
const exact = (entries) => new Map(Object.entries(entries).map(([ar, en]) => [normalize(ar), en]));
const dictionaries = {
    all: exact(catalogue),
    arabic: exact({ ...catalogue, ...ARABIC_EN }),
    math: exact({ ...catalogue, ...MATH_EN }),
    music: exact({ ...catalogue, 'لا': 'La', ': لا.': ': La.' }),
};
const patterns = Object.entries({ ...catalogue, ...ARABIC_EN, ...MATH_EN }).filter(([ar]) => /\{\w+\}/.test(ar)).map(([ar, en]) => {
    const keys = [];
    const parts = normalize(ar).split(/(\{\w+\})/g);
    const source = parts.map(part => {
        if (/^\{\w+\}$/.test(part)) {
            keys.push(part);
            return '(.*?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return { re: new RegExp(`^${source}$`, 'u'), keys, en, weight: ar.replace(/\{\w+\}/g, '').length };
}).sort((a, b) => b.weight - a.weight);
/** Translate a complete display phrase, with named/numbered placeholders.
 * Unknown phrases deliberately keep the original teaching content intact. */
export function translate(value, lang = language, depth = 0, subject = '') {
    if (lang === 'ar' || !/[\u0600-\u06ff]/.test(value))
        return value;
    const key = normalize(value);
    const dictionary = dictionaries[subject] || dictionaries.all;
    let result = dictionary.get(key);
    if (result === undefined && depth < 4) {
        for (const p of patterns) {
            const match = p.re.exec(key);
            if (!match)
                continue;
            result = p.en.replace(/\{\w+\}/g, k => {
                const index = p.keys.indexOf(k);
                if (index < 0)
                    return k;
                // Guillemets in an English grammar entry identify an Arabic example,
                // whose spelling/ending is part of the question, not a display label.
                return p.en.includes(`«${k}»`) ? match[index + 1] : translate(match[index + 1], lang, depth + 1, subject);
            });
            break;
        }
    }
    // Icons are presentation, not part of the phrase. Do not translate pieces
    // of an unknown sentence: that would produce mixed, misleading lesson text.
    if (result === undefined) {
        const decorated = /^(\P{L}*)(.*?)(\P{L}*)$/u.exec(key);
        if (decorated?.[2] && decorated[2] !== key) {
            const inner = translate(decorated[2], lang, depth + 1, subject);
            if (inner !== decorated[2])
                result = decorated[1] + inner + decorated[3];
        }
    }
    if (result === undefined)
        return value;
    return value.slice(0, value.length - value.trimStart().length) + result + value.slice(value.trimEnd().length);
}
const texts = new WeakMap();
const attributes = new WeakMap();
const ATTRS = ['aria-label', 'aria-description', 'alt', 'title', 'placeholder', 'data-text'];
const SKIP = 'script, style, noscript, textarea, [translate="no"], [data-language]';
let observer;
// Arabic words being studied must keep their spelling and case endings.
// Instructions, explanations and grammatical labels still use the chosen
// language. Mixed reviews mark only the relevant question as Arabic.
function curriculum(el) {
    if (!el.closest('[data-curriculum="arabic"]'))
        return false;
    return !!el.closest('.word, .role > b, .plurals, .sort-card, .choice, .learn__body .big, .learn__body mark');
}
/** Names are user data, never translation keys or HTML. */
export function playerName(name, fallback) {
    if (!name)
        return fallback;
    const escaped = name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    return `<bdi translate="no">${escaped}</bdi>`;
}
function update(value, previous, el) {
    const original = previous?.shown === value ? previous.original : value;
    const subject = el?.closest('[data-curriculum]')?.dataset.curriculum || '';
    return { original, shown: translate(original, language, 0, subject) };
}
function textNode(node) {
    if (!node.parentElement || node.parentElement.closest(SKIP) || curriculum(node.parentElement))
        return;
    if (!texts.has(node) && !/[\u0600-\u06ff]/.test(node.data))
        return;
    const record = update(node.data, texts.get(node), node.parentElement);
    texts.set(node, record);
    if (node.data !== record.shown)
        node.data = record.shown;
    if (!node.parentElement.childElementCount)
        node.parentElement.setAttribute('lang', language);
}
function element(el) {
    if (el.matches('[data-localized-direction]')) {
        el.setAttribute('lang', language);
        el.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    }
    if (el.closest(SKIP))
        return;
    if (curriculum(el)) {
        el.setAttribute('lang', 'ar');
        return;
    }
    const records = attributes.get(el) || new Map();
    for (const attr of ATTRS) {
        const value = el.getAttribute(attr);
        if (value === null) {
            records.delete(attr);
            continue;
        }
        if (!records.has(attr) && !/[\u0600-\u06ff]/.test(value))
            continue;
        const record = update(value, records.get(attr), el);
        records.set(attr, record);
        if (value !== record.shown)
            el.setAttribute(attr, record.shown);
    }
    if (records.size)
        attributes.set(el, records);
}
function localize(root) {
    if (root instanceof Text) {
        textNode(root);
        return;
    }
    if (!(root instanceof Element) || root.closest(SKIP))
        return;
    element(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            return node instanceof Element && node.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        },
    });
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node instanceof Text)
            textNode(node);
        else
            element(node);
    }
}
function observe() {
    observer?.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
function apply() {
    observer?.disconnect();
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = (STAGING ? '🧪 ' : '') + translate(document.body.dataset.pageTitle || 'رحلات سندباد وياسمينة');
    localize(document.body);
    document.querySelectorAll('[data-language]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    observe();
}
export function setLanguage(next) {
    if (next !== 'ar' && next !== 'en' || next === language)
        return;
    language = next;
    try {
        localStorage.setItem(KEY, next);
    }
    catch { /* Language still changes for this session. */ }
    if ('speechSynthesis' in window)
        window.speechSynthesis.cancel();
    apply();
    document.dispatchEvent(new Event('languagechange'));
}
export function initLanguage() {
    document.querySelectorAll('[data-language]').forEach(button => {
        button.addEventListener('click', () => setLanguage(button.dataset.language));
    });
    apply();
    observer = new MutationObserver(records => {
        observer.disconnect();
        for (const record of records) {
            if (record.type === 'attributes')
                element(record.target);
            else if (record.type === 'characterData')
                textNode(record.target);
            else {
                if (record.target instanceof Element)
                    element(record.target);
                record.addedNodes.forEach(localize);
            }
        }
        observe();
    });
    observe();
}
