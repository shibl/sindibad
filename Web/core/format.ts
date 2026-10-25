// Number formatting. The game writes numbers with the digits 1 2 3
// (owner decision 2026-10-12: «الأرقام العربية» 0123456789, not ٠١٢٣٤٥٦٧٨٩),
// a dot for decimals and a true minus sign.

export function num(n: number | string): string {
  return String(n).replace(/-/g, '−');
}

// A stacked fraction as HTML: frac(3, 4) → ¾ drawn with a bar.
export function frac(n: number | string, d: number | string): string {
  return `<span class="frac" aria-label="${num(n)} على ${num(d)}"><span>${num(n)}</span><span>${num(d)}</span></span>`;
}
