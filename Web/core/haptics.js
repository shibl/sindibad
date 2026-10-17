// Made from haptics.ts by tools/build.ts. Edit that file, then run: npm run build
// Vibrations: the phone answers the child's finger. A light tick when
// something is picked, a tap for a button, a firm press for a long press, a
// happy double pulse for a right answer, a buzz-buzz for a wrong one, and a
// little drum roll for stars and rewards.
//
//   buzz('tick' | 'tap' | 'press' | 'long' | 'success' | 'error' | 'warning' | 'reward')
//
// Most buzzes come from the sound effects (core/sound.js plays one with each
// sound), so every island and lesson gets them without asking. They work
// even with the sound off; the settings (⚙️) have their own switch.
//
// Android browsers vibrate with navigator.vibrate. iPhones have no
// vibration API, but Safari (iOS 18+) gives a tick when a switch is toggled,
// so a hidden switch stands in for the light patterns there.
import { save } from './save.js';
// Milliseconds: on, off, on… Short and soft: a game, not an alarm.
export const PATTERNS = {
    tick: [6],
    tap: [12],
    press: [22],
    long: [40],
    success: [12, 60, 22],
    error: [30, 50, 30],
    warning: [18, 80, 18],
    reward: [10, 45, 10, 45, 34],
};
// How many iOS switch ticks stand in for each pattern.
const IOS_TICKS = { tick: 1, tap: 1, press: 1, long: 1, success: 1, error: 2, warning: 2, reward: 3 };
const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);
// The settings switch (⚙️ «الاهتزاز»); stored inverted, like `muted`.
export const hapticsOn = () => !save.get().noVibrate;
export const hapticsAvailable = () => canVibrate || isIOS;
// For the end-to-end test: every buzz played, in order.
export const played = [];
let last = 0, lastKind = null, lastPress = -1e9;
let iosSwitch = null;
function iosTick(n) {
    if (!iosSwitch) {
        const label = document.createElement('label');
        label.setAttribute('aria-hidden', 'true');
        label.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        input.tabIndex = -1;
        label.append(input);
        document.body.append(label);
        iosSwitch = label;
    }
    for (let i = 0; i < n; i++)
        setTimeout(() => iosSwitch?.click(), i * 90);
}
export function buzz(kind) {
    if (!hapticsOn() || document.hidden)
        return;
    const now = performance.now();
    // A button already ticked when the finger touched it (core/touch.ts):
    // its tap sound doesn't buzz again.
    if (kind === 'tap' && now - lastPress < 450)
        return;
    // The same buzz twice in a row within 40 ms is one buzz (a tap that also
    // plays a sound); a light one never cuts a stronger one short.
    if (now - last < 40 && (kind === lastKind || kind === 'tick' || kind === 'tap'))
        return;
    last = now;
    lastKind = kind;
    if (TEST) {
        played.push(kind);
        if (played.length > 200)
            played.shift();
        return;
    }
    try {
        if (canVibrate)
            navigator.vibrate(PATTERNS[kind]);
        else if (isIOS)
            iosTick(IOS_TICKS[kind]);
    }
    catch { /* a browser may refuse before the first tap: no matter */ }
}
// The buzz of a finger touching something (core/touch.ts): plays now, and
// the tap that follows when it is released stays silent.
export function pressBuzz(kind = 'tap') {
    buzz(kind);
    lastPress = performance.now();
}
// Stop a pattern that is still playing (leaving a screen mid-reward).
export function stopBuzz() {
    if (canVibrate)
        try {
            navigator.vibrate(0);
        }
        catch { /* ignore */ }
}
// Press and hold: calls `onLong(event)` after `ms` of holding still on an
// element matching `selector` inside `root`, with a firm buzz. The click
// that follows a long press is swallowed, so the element's tap does not
// also fire. Returns a function that removes the listeners.
// `when(el)` may say no (nothing to do for this element right now): then
// the press is an ordinary tap.
export function onLongPress(root, selector, onLong, { ms = 480, when } = {}) {
    let timer = 0, startX = 0, startY = 0, target = null, fired = false;
    const cancel = () => { clearTimeout(timer); target?.classList.remove('is-holding'); target = null; };
    const down = (e) => {
        const pe = e;
        if (pe.button > 0)
            return;
        const el = pe.target?.closest(selector);
        if (!el || (when && !when(el)))
            return;
        cancel();
        fired = false;
        target = el;
        startX = pe.clientX;
        startY = pe.clientY;
        el.classList.add('is-holding');
        timer = window.setTimeout(() => {
            if (!target)
                return;
            fired = true;
            buzz('long');
            const t = target;
            cancel();
            onLong(t, pe);
        }, ms);
    };
    const move = (e) => {
        const pe = e;
        if (target && Math.hypot(pe.clientX - startX, pe.clientY - startY) > 10)
            cancel();
    };
    const click = (e) => { if (fired) {
        fired = false;
        e.stopPropagation();
        e.preventDefault();
    } };
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointermove', move);
    for (const t of ['pointerup', 'pointercancel', 'pointerleave'])
        root.addEventListener(t, cancel);
    root.addEventListener('click', click, true);
    return () => {
        root.removeEventListener('pointerdown', down);
        root.removeEventListener('pointermove', move);
        for (const t of ['pointerup', 'pointercancel', 'pointerleave'])
            root.removeEventListener(t, cancel);
        root.removeEventListener('click', click, true);
    };
}
