// Made from touch.ts by tools/build.ts. Edit that file, then run: npm run build
// The game on a phone: how it answers the child's finger.
//
// - Touch feedback: a tick the moment a finger touches a button, a card or
//   a spot (core/haptics.ts), and a soft ring where it touched.
// - Press and hold an answer, a question or a card to hear it read aloud
//   (core/voice.ts; only when the phone has a voice for its language). The
//   tap that would follow is swallowed, so holding never answers.
// - No browser menu on a long press, no pull-to-refresh (style.css).
// - The phone's back button goes back in the game (closes a card, leaves an
//   island or a lesson) instead of closing it.
// - The screen stays awake while the child plays, and may sleep again after
//   three minutes without a touch.
// - On the title screen the scene tilts with the phone.
//
//   initTouch()   once, at start-up (app.js)
import { pressBuzz, onLongPress } from './haptics.js';
import { canSpeak, speak } from './voice.js';
const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const calm = () => document.body.classList.contains('calm') || document.body.classList.contains('lite');
// What a finger can press, and how firmly it answers.
const BUTTONS = '.btn, .hud-pill, .voyage--open, .who__card, .hero-card, .switch-row, .act-btn, .farm-tool, .fm-q__btn';
const LIGHT = 'button, [role=button], .lx-spot, .lq-hit, .isle, .tn-tag, a[href]';
// ---------- Touch feedback ----------
function splash(x, y, strong) {
    if (calm())
        return;
    const el = document.createElement('i');
    el.className = `touch-ring${strong ? ' touch-ring--strong' : ''}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.append(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 700);
}
function onDown(e) {
    if (e.pointerType === 'mouse' || e.button > 0)
        return;
    const t = e.target;
    const el = t?.closest(`${BUTTONS}, ${LIGHT}`);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true')
        return;
    const strong = el.matches(BUTTONS);
    const kind = strong ? 'tap' : 'tick';
    pressBuzz(kind);
    splash(e.clientX, e.clientY, strong);
}
// ---------- Hold to hear ----------
const READABLE = '.lq-opt, .lq-ask, .lq-tf__s, .lq-lines li, .lx-card, .lx-note__card, .choice, .prompt, .word, .piece, .bubble, [data-say]';
const textOf = (el) => (el.dataset.say || el.innerText || '').trim();
// English words (the English island) are read by an English voice.
const langOf = (text) => {
    const latin = (text.match(/[A-Za-z]/g) || []).length, arabic = (text.match(/[؀-ۿ]/g) || []).length;
    return latin > arabic ? 'en' : 'ar';
};
function holdToHear() {
    onLongPress(document, READABLE, el => {
        const text = textOf(el);
        el.classList.remove('is-read');
        void el.offsetWidth;
        el.classList.add('is-read');
        speak(el.dataset.say || el.innerHTML, langOf(text));
    }, { when: el => { const text = textOf(el); return !!text && canSpeak(langOf(text)); } });
}
// ---------- The back button ----------
// The way back from where the child is now: an open card's ✕, else the
// screen's own back button (the first round button in its top bar).
function backTarget() {
    const overlays = ['.settings [data-close]', '.album [data-close]', '#story [data-st=skip]'];
    for (const sel of overlays) {
        const b = document.querySelector(sel);
        if (b && b.offsetParent)
            return b;
    }
    const screen = document.querySelector('.screen[data-active]');
    if (!screen)
        return null;
    const modal = screen.querySelector('.farm-modal:not([hidden]) [data-close], .tn-panel:not([hidden]) [data-quit]');
    if (modal)
        return modal;
    for (const host of screen.querySelectorAll('.gl-host:not([hidden]), .st-host:not([hidden]), .en-host:not([hidden])')) {
        const x = host.querySelector('[data-close], .gl-x');
        if (x)
            return x;
    }
    if (screen.id === 'screen-map')
        return document.querySelector('#sheet:not([hidden]) [data-close]') || screen.querySelector('.map-voyages');
    if (screen.id === 'screen-select' || screen.id === 'screen-who')
        return screen.querySelector('[data-go=title]');
    return screen.querySelector('.topbar > .btn--round:first-child');
}
function backButton() {
    if (!history.pushState)
        return;
    const arm = () => { if (history.state?.sindbad !== 'here')
        history.pushState({ sindbad: 'here' }, ''); };
    // Armed after the first touch, so the browser counts it as the child's.
    addEventListener('pointerdown', arm, { once: true });
    addEventListener('popstate', () => {
        const screen = document.body.dataset.screen || 'title';
        if (screen === 'title') {
            history.back();
            return;
        } // on the title screen, back leaves the game
        const b = backTarget();
        history.pushState({ sindbad: 'here' }, '');
        b?.click();
    });
}
function keepAwake() {
    const wl = navigator.wakeLock;
    if (!wl)
        return;
    let lock = null, idle = 0;
    const want = () => !document.hidden && (document.body.dataset.screen || 'title') !== 'title';
    const take = () => {
        if (lock && !lock.released)
            return;
        if (!want())
            return;
        wl.request('screen').then(l => { lock = l; }).catch(() => { });
    };
    const drop = () => { lock?.release().catch(() => { }); lock = null; };
    addEventListener('pointerdown', () => { take(); clearTimeout(idle); idle = window.setTimeout(drop, 3 * 60 * 1000); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden)
        take(); });
}
// ---------- Tilt the title scene with the phone ----------
function tilt() {
    if (!('DeviceOrientationEvent' in window))
        return;
    // iPhones ask for permission first; they keep the finger parallax only.
    if (typeof DeviceOrientationEvent.requestPermission === 'function')
        return;
    const scene = document.getElementById('scene');
    if (!scene)
        return;
    let raf = 0, gx = 0, gy = 0;
    addEventListener('deviceorientation', e => {
        if (calm() || (document.body.dataset.screen || 'title') !== 'title' || e.gamma == null || e.beta == null)
            return;
        gx = Math.max(-1, Math.min(1, e.gamma / 30)) * 0.5;
        gy = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.5;
        if (raf)
            return;
        raf = requestAnimationFrame(() => { raf = 0; scene.style.setProperty('--px', gx.toFixed(3)); scene.style.setProperty('--py', gy.toFixed(3)); });
    });
}
export function initTouch() {
    addEventListener('pointerdown', onDown, { passive: true });
    // No browser menu (save image, select text…) on a long press.
    addEventListener('contextmenu', e => { if (!e.target?.closest('input, textarea'))
        e.preventDefault(); });
    holdToHear();
    backButton();
    if (!TEST) {
        keepAwake();
        tilt();
    }
}
