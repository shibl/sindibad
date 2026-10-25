// Materials and canvas textures.
import { THREE, E } from './engine.js';

import { lang } from './locale.js';
export const FONT = lang === 'ar' ? '"Noto Sans Arabic", sans-serif' : '"Google Sans Flex", sans-serif';

// Glass: dark base so only reflections show; alpha rises at grazing angles (Fresnel) and with highlight brightness.
export function glass({ base = 0.05, edge = 0.55, rough = 0.03, tint = 0x0d1318, frost = 0 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: tint, metalness: 0, roughness: rough + frost, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    envMapIntensity: 1.7, clearcoat: 1, clearcoatRoughness: 0.04 + frost, specularIntensity: 1, ior: 1.5,
  });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);
      float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(outgoingLight, clamp(${base.toFixed(3)} + ${frost.toFixed(3)} + fres * ${edge.toFixed(3)} + lum * 0.45, 0.0, 0.96));`);
  };
  m.customProgramCacheKey = () => `glass${base}${edge}${frost}`;
  return m;
}

// Liquids: tinted, a little self-lit so they read against the dark bench, brighter at the edges.
export function liquidMat(color, opacity = 0.55) {
  const m = new THREE.MeshPhysicalMaterial({
    color, transparent: true, opacity, roughness: 0.06, metalness: 0, envMapIntensity: 1.2,
    clearcoat: 0.6, clearcoatRoughness: 0.05, side: THREE.FrontSide, depthWrite: false,
    emissive: color, emissiveIntensity: 0.22,
  });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float lf = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
      gl_FragColor = vec4(outgoingLight + lf * 0.12, clamp(diffuseColor.a + lf * 0.35, 0.0, 0.97));`);
  };
  m.customProgramCacheKey = () => 'liquid';
  return m;
}

export const metal = (color = 0xc7ccd2, roughness = 0.3) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness });
export const matte = (color, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
export const plastic = (color, roughness = 0.42) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4 });
export const rubber = (color = 0x2a2c30) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

// ── canvas helpers ──
export function canvasTex(w, h, draw, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(aniso, E.renderer.capabilities.getMaxAnisotropy());
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData.canvas = c;
  return t;
}

export function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Formula text for canvases: digits after letters become small and low.
export function drawFormula(g, s, x, y, size, align = 'center') {
  const parts = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const sub = /\d/.test(c) && i > 0 && /[A-Za-z)]/.test(s[i - 1]) || (/\d/.test(c) && parts.length && parts.at(-1).sub);
    parts.push({ c, sub });
  }
  g.save();
  g.direction = 'ltr';
  const big = `600 ${size}px ${FONT}`, small = `600 ${Math.round(size * 0.66)}px ${FONT}`;
  let w = 0;
  for (const p of parts) { g.font = p.sub ? small : big; w += g.measureText(p.c).width; }
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.textAlign = 'left';
  for (const p of parts) {
    g.font = p.sub ? small : big;
    g.fillText(p.c, cx, p.sub ? y + size * 0.22 : y);
    cx += g.measureText(p.c).width;
  }
  g.restore();
}

export function hazardDiamond(g, cx, cy, s, kind) {
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#fff';
  g.strokeStyle = '#d4202b';
  g.lineWidth = s * 0.09;
  g.fillRect(-s / 2, -s / 2, s, s);
  g.strokeRect(-s / 2 + g.lineWidth / 2, -s / 2 + g.lineWidth / 2, s - g.lineWidth, s - g.lineWidth);
  g.restore();
  g.save();
  g.translate(cx, cy);
  g.fillStyle = '#111';
  g.strokeStyle = '#111';
  const k = s / 100;
  if (kind === 'corrosive') {
    // two drops falling on a surface and a hand
    g.fillRect(-34 * k, 8 * k, 30 * k, 7 * k);
    g.fillRect(4 * k, 8 * k, 32 * k, 7 * k);
    for (const x of [-20, 20]) { g.beginPath(); g.moveTo(x * k, -26 * k); g.quadraticCurveTo((x + 7) * k, -10 * k, x * k, -6 * k); g.quadraticCurveTo((x - 7) * k, -10 * k, x * k, -26 * k); g.fill(); }
    g.fillRect(-36 * k, 18 * k, 72 * k, 5 * k);
  } else if (kind === 'flame') {
    g.beginPath();
    g.moveTo(0, -32 * k);
    g.bezierCurveTo(22 * k, -10 * k, 20 * k, 16 * k, 0, 22 * k);
    g.bezierCurveTo(-20 * k, 16 * k, -22 * k, -6 * k, -6 * k, -14 * k);
    g.bezierCurveTo(-4 * k, -2 * k, 4 * k, -10 * k, 0, -32 * k);
    g.fill();
    g.fillRect(-26 * k, 26 * k, 52 * k, 6 * k);
  } else if (kind === 'toxic') {
    g.beginPath(); g.arc(0, -8 * k, 16 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(-6 * k, -10 * k, 4 * k, 0, Math.PI * 2); g.arc(6 * k, -10 * k, 4 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111';
    g.lineWidth = 6 * k;
    g.beginPath(); g.moveTo(-24 * k, 10 * k); g.lineTo(24 * k, 28 * k); g.moveTo(24 * k, 10 * k); g.lineTo(-24 * k, 28 * k); g.stroke();
  } else if (kind === 'oxidizer') {
    g.beginPath(); g.arc(0, 12 * k, 14 * k, 0, Math.PI * 2); g.lineWidth = 6 * k; g.stroke();
    g.beginPath(); g.moveTo(0, -32 * k); g.bezierCurveTo(16 * k, -14 * k, 14 * k, 0, 0, 2 * k); g.bezierCurveTo(-14 * k, 0, -16 * k, -14 * k, 0, -32 * k); g.fill();
  } else {
    g.font = `800 ${60 * k}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('!', 0, 2 * k);
  }
  g.restore();
}

// Reagent label: Arabic name, formula, optional hazard.
export function labelTex({ name, formula = '', hazard = null, color = '#0f766e', w = 512, h = 300 }) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#f7f5ef';
    g.fillRect(0, 0, w, h);
    g.fillStyle = color;
    g.fillRect(0, 0, w, 34);
    g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    const hx = hazard ? w * 0.42 : w / 2;
    let fs = 64;
    g.font = `700 ${fs}px ${FONT}`;
    while (g.measureText(name).width > (hazard ? w * 0.7 : w * 0.9) && fs > 30) { fs -= 2; g.font = `700 ${fs}px ${FONT}`; }
    g.fillText(name, hx, formula ? 128 : 170);
    if (formula) { g.fillStyle = '#333'; drawFormula(g, formula, hx, 220, 62); }
    if (hazard) hazardDiamond(g, w * 0.86, h * 0.56, 92, hazard);
  });
}

// Soft round sprite texture (steam, gas, glow).
let _soft;
export function softTex() {
  if (_soft) return _soft;
  _soft = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
  return _soft;
}

// Graduation marks for beakers: white ticks on transparent.
export function gradTex(n = 5) {
  return canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.92)';
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.lineWidth = 5;
    g.font = `600 34px ${FONT}`;
    g.textAlign = 'left';
    for (let i = 1; i <= n * 2; i++) {
      const y = h - (i / (n * 2 + 1)) * h;
      const major = i % 2 === 0;
      g.beginPath();
      g.moveTo(20, y);
      g.lineTo(major ? 110 : 70, y);
      g.stroke();
      if (major) g.fillText(String((i / 2) * 50), 122, y + 12);
    }
  });
}
