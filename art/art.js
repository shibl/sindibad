// Shared inline-SVG art for the game.
//
// Art lives here as SVG strings (rather than separate .svg files loaded via
// <img>) so that the page's CSS animations in style.css can reach inside
// them — sail flapping, Sindbad waving, Yasmina's wings, palm leaves swaying.
// The class names used below (.sail-cloth, .wave-arm, .wing, .leaves) are
// the hooks those animations target.
//
// Originally sketched in demos/*.html; cleaned up and consolidated here.
// Licence: CC-BY-SA (see README.md).

// Sindbad: the young explorer, drawn standing on deck, one arm waving.
const sindbad = `
  <g class="sindbad" transform="translate(48,78)">
    <circle cx="12" cy="6" r="7" fill="#e0a878"/>
    <path d="M4 4 Q12 -6 20 4 Q20 -2 12 -3 Q4 -2 4 4Z" fill="#2e7d5b"/>
    <rect x="6" y="12" width="12" height="16" rx="4" fill="#2e7d5b"/>
    <g class="wave-arm"><rect x="15" y="12" width="4" height="12" rx="2" fill="#e0a878"/></g>
  </g>`;

// Yasmina: "ياسمينة العصفورة الحكيمة" — the wise messenger bird, perched on
// top of the mast. (The early demos drew her as a girl; SPEC.md defines her
// as a bird.) Jasmine-white body, rose wing, amber beak.
const yasmina = `
  <g class="yasmina" transform="translate(76,2)">
    <ellipse cx="10" cy="12" rx="9" ry="7" fill="#fdf6ec" stroke="#c9457a" stroke-width="1"/>
    <circle cx="16" cy="6" r="5" fill="#fdf6ec" stroke="#c9457a" stroke-width="1"/>
    <path d="M20 5 L25 7 L20 8Z" fill="#f2a33a"/>
    <circle cx="17" cy="5" r="1.2" fill="#3a2a1a"/>
    <path d="M1 12 L-4 9 L-3 15Z" fill="#c9457a"/>
    <path class="wing" d="M5 11 Q10 3 15 11 Q10 15 5 11Z" fill="#c9457a"/>
    <path d="M8 18 L8 21 M12 18 L12 21" stroke="#f2a33a" stroke-width="1.2"/>
  </g>`;

// The ship carrying both companions. viewBox is 170×140.
export function shipSVG({ withCrew = true } = {}) {
  return `
<svg class="ship-art" viewBox="-6 -2 182 142" aria-hidden="true">
  <path d="M10 100 Q85 130 160 100 L142 118 Q85 138 28 118 Z" fill="#6b3d1f"/>
  <path d="M22 106 Q85 128 148 106" fill="none" stroke="#8a5530" stroke-width="2"/>
  <rect x="82" y="18" width="4" height="82" fill="#4a2a12"/>
  <path class="sail-cloth" d="M86 22 Q135 44 88 92 Z" fill="#f2e2c0" stroke="#c9a86a"/>
  <path class="sail-cloth" style="animation-delay:-1s" d="M84 32 Q45 50 84 82 Z" fill="#f2e2c0" stroke="#c9a86a"/>
  ${withCrew ? sindbad + yasmina : ''}
</svg>`;
}

// A date palm with swaying leaves. viewBox is 60×100.
export function palmSVG() {
  return `
<svg class="palm-art" viewBox="-8 -8 76 108" aria-hidden="true">
  <rect x="27" y="40" width="6" height="60" fill="#6b4423"/>
  <g class="leaves">
    <path d="M30 40 Q0 20 -5 5" stroke="#2f6b34" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M30 40 Q60 20 65 5" stroke="#2f6b34" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M30 40 Q30 10 20 -5" stroke="#3d8a44" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M30 40 Q30 10 40 -5" stroke="#3d8a44" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

// A distant gull, drawn as a simple "M" stroke.
export function gullSVG() {
  return `<svg class="gull-art" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 8 Q6 0 12 8 Q18 0 24 8" fill="none" stroke="#3a2a1a" stroke-width="2"/></svg>`;
}
