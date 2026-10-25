// Made from blocks.ts by tools/build.ts. Edit that file, then run: npm run build
// Word-blocks engine: "build the sentence". A row of labelled slots
// (فعل، فاعل، مفعول به …) and a tray of word blocks: the sentence's words
// plus look-alikes with the wrong ending. Tap a block to drop it into the
// next empty slot, tap a placed block to take it back, then check. Wrong
// blocks bounce back to the tray; the right ones stay.
//
// blocks({ items, count, intro, prompt })
// items: [{ words: ['كانَ', 'الجوُّ', 'جميلاً'],
//           slots: [['كان', 'verb'], ['اسمها', 'fael'], ['خبرها', 'mafool']],
//           extra: ['الجوَّ', 'جميلٌ'], q: html (optional), hint, explain, note }]
// slots: one label per word, each optionally with a colour role
//        (verb · fael · mafool · mubtada · khabar — the colours of visuals.roles).
import { runRounds, draw, shuffle, h, TEST } from './kit.js';
export function blocks({ items, count = 8, intro, prompt = 'ابنِ الجملة: ضع كل كلمة في مكانها.' }) {
    return (container, onComplete, ctx) => {
        runRounds({
            container, ctx, items: draw(ctx, items, count), onComplete, intro,
            renderRound(item, round, stage) {
                const tiles = shuffle([...item.words, ...(item.extra || [])]).map((text, id) => ({ text, id }));
                const placed = item.words.map(() => null); // tile id in each slot
                let locked = false;
                stage.classList.add('round--compact');
                stage.append(h(`<p class="prompt">${item.q || prompt}</p>`));
                const box = h(`
          <div class="blocks">
            <div class="blocks__slots" dir="rtl">
              ${item.slots.map(s => { const [label, role] = [].concat(s); return `<div class="slot${role ? ` slot--${role}` : ''}"><div class="slot__box"></div><small>${label}</small></div>`; }).join('')}
            </div>
            <div class="blocks__tray" dir="rtl"></div>
            <button class="btn btn--gold blocks__go" hidden>تحقّق ✔</button>
          </div>`);
                const slots = [...box.querySelectorAll('.slot')];
                const tray = box.querySelector('.blocks__tray');
                const goBtn = box.querySelector('.blocks__go');
                const trayBtns = tiles.map(t => {
                    const b = h(`<button class="word block">${t.text}</button>`);
                    b.addEventListener('click', () => {
                        const i = placed.indexOf(null);
                        if (locked || i < 0 || placed.includes(t.id))
                            return;
                        ctx.sfx.tap();
                        placed[i] = t.id;
                        refresh();
                    });
                    tray.append(b);
                    return b;
                });
                slots.forEach((s, i) => s.querySelector('.slot__box').addEventListener('click', () => {
                    if (locked || placed[i] === null)
                        return;
                    ctx.sfx.tap();
                    placed[i] = null;
                    s.classList.remove('is-ok');
                    refresh();
                }));
                function refresh() {
                    slots.forEach((s, i) => {
                        const t = tiles[placed[i]];
                        s.querySelector('.slot__box').innerHTML = t ? `<button class="word block block--placed">${t.text}</button>` : '';
                        s.classList.toggle('is-filled', !!t);
                    });
                    trayBtns.forEach((b, id) => b.classList.toggle('is-used', placed.includes(id)));
                    goBtn.hidden = placed.includes(null); // shown once every slot is filled
                    if (TEST)
                        mark();
                }
                // Test hook: take back a misplaced block, else the block that belongs
                // in the next empty slot, then "check".
                function mark() {
                    stage.querySelectorAll('[data-step], [data-ok]').forEach(b => { delete b.dataset.step; delete b.dataset.ok; });
                    if (locked || box.classList.contains('is-locked'))
                        return;
                    const bad = placed.findIndex((id, k) => id !== null && tiles[id].text !== item.words[k]);
                    if (bad >= 0) {
                        slots[bad].querySelector('.block').dataset.step = '';
                        return;
                    }
                    const i = placed.indexOf(null);
                    if (i < 0) {
                        goBtn.dataset.ok = '';
                        return;
                    }
                    const t = tiles.find(x => x.text === item.words[i] && !placed.includes(x.id));
                    trayBtns[t.id].dataset.step = '';
                }
                goBtn.addEventListener('click', () => {
                    if (locked || placed.includes(null))
                        return;
                    const wrong = placed.map((id, i) => tiles[id].text !== item.words[i]);
                    if (!wrong.includes(true)) {
                        locked = true;
                        box.classList.add('is-right', 'is-locked');
                        slots.forEach(s => s.classList.add('is-ok'));
                        goBtn.style.visibility = 'hidden';
                        if (TEST)
                            mark();
                        round.right(item.note);
                        return;
                    }
                    slots.forEach((s, i) => { s.classList.toggle('is-ok', !wrong[i]); s.classList.toggle('is-bad', wrong[i]); });
                    round.wrong(item.hint);
                    box.classList.add('is-locked');
                    if (TEST)
                        mark();
                    setTimeout(() => {
                        if (ctx.signal.aborted || locked)
                            return; // second miss: the answer is shown instead
                        slots.forEach((s, i) => { s.classList.remove('is-bad'); if (wrong[i])
                            placed[i] = null; });
                        box.classList.remove('is-locked');
                        refresh();
                    }, 750);
                });
                round.onReveal = () => {
                    locked = true;
                    item.words.forEach((w, i) => { placed[i] = tiles.find(t => t.text === w && !placed.slice(0, i).includes(t.id)).id; });
                    refresh();
                    slots.forEach(s => { s.classList.remove('is-bad'); s.classList.add('is-ok'); });
                    box.classList.add('is-locked');
                    goBtn.style.visibility = 'hidden';
                };
                stage.append(box);
                refresh();
            },
        });
    };
}
