// Tiny formula renderer: "Fe(s) + 2HCl(aq) -> FeCl2(aq) + H2(g)" → HTML with subscripts, charges and arrows.
// Charges: Mg^{+2}, H^+, e^- . Explicit subscript: H^+_{(aq)} . Arrow label: ->[Δ] . Reversible: <=> .

const STATE = /^\((s|l|g|aq)\)/;

function group(s, i) {
  // returns [content, nextIndex] for "^{..}" / "^x" / "_{..}" / "_x" starting at s[i] (the ^ or _)
  if (s[i + 1] === '{') {
    const j = s.indexOf('}', i + 2);
    return [s.slice(i + 2, j), j + 1];
  }
  return [s[i + 1], i + 2];
}

function species(s) {
  let out = '';
  let i = 0;
  const lead = s.match(/^\d+(?=[A-Za-z(])/);
  if (lead) {
    out += `<span class="coef">${lead[0]}</span>`;
    i = lead[0].length;
  }
  while (i < s.length) {
    const c = s[i];
    if (c === '^' || c === '_') {
      const [v, j] = group(s, i);
      out += c === '^' ? `<sup>${v.replace(/-/g, '−')}</sup>` : `<sub>${v}</sub>`;
      i = j;
      continue;
    }
    const st = c === '(' && s.slice(i).match(STATE);
    if (st) {
      out += `<sub class="st">${st[0]}</sub>`;
      i += st[0].length;
      continue;
    }
    if (/\d/.test(c) && i > 0 && /[A-Za-z)]/.test(s[i - 1])) {
      let j = i;
      while (j < s.length && /\d/.test(s[j])) j++;
      out += `<sub>${s.slice(i, j)}</sub>`;
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function token(t) {
  if (t === '->') return '<span class="arr">→</span>';
  if (t === '<=>') return '<span class="arr">⇌</span>';
  const lbl = t.match(/^->\[(.+)\]$/);
  if (lbl) return `<span class="arr lab"><small>${lbl[1]}</small>→</span>`;
  if (t === '+') return '<span class="op">+</span>';
  return species(t);
}

export function ce(src) {
  return `<span class="ce" dir="ltr">${src.trim().split(/\s+/).map(token).join(' ')}</span>`;
}

// Book-text markup: [[formula]] and {{left-to-right run}}.
export function fmt(html) {
  return String(html)
    .replace(/\[\[(.+?)\]\]/g, (_, s) => ce(s))
    .replace(/\{\{(.+?)\}\}/g, (_, s) => `<bdi class="ltr" dir="ltr">${s}</bdi>`);
}

// Same species with the coefficient dropped, for comparing answers ("2H^+" ≡ "H^+").
export const bare = s => s.replace(/^\d+(?=[A-Za-z(])/, '');
