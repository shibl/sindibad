// Number formatting. Syrian textbooks use Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)
// and the Arabic decimal separator (٫).

const DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function num(n) {
  return String(n).replace(/[0-9]/g, d => DIGITS[d]).replace(/\./g, '٫').replace(/-/g, '−');
}

// A stacked fraction as HTML: frac(3, 4) → ¾ drawn with a bar.
export function frac(n, d) {
  return `<span class="frac" aria-label="${num(n)} على ${num(d)}"><span>${num(n)}</span><span>${num(d)}</span></span>`;
}
