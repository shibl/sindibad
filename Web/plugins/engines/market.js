// Made from market.ts by tools/build.ts. Edit that file, then run: npm run build
// Market engine: "pay the exact price". The student works out an amount —
// a price after a discount, a total, a share — and pays it with coins and
// notes, or weighs it out with weights. The running total is shown: the
// thinking is in finding the amount, not in adding up coins.
//
// market({ items, count, intro, pieces, kind, unit, total, go })
// items:  [{ q: html, target: 150, hint, explain, note }]
// pieces: values to pay with, largest first (default [100, 50, 20, 10, 5, 1])
// kind:   'coin' (default; values of 50 and up are drawn as notes) or 'weight'
// unit:   small text under each piece, e.g. 'كغ' (default none)
// total:  label of the running total (default 'المجموع')
// go:     label of the pay button (default 'ادفع 💰')
// An item may override any of these. Decimal values are fine (0.25).
import { runRounds, draw, h, TEST } from './kit.js';
const cents = (v) => Math.round(v * 100);
// The fewest pieces that make `amount` (largest first), or null.
export function change(amount, pieces) {
    const out = [];
    let left = cents(amount);
    for (const p of pieces)
        while (left >= cents(p)) {
            out.push(p);
            left -= cents(p);
        }
    return left === 0 ? out : null;
}
export function market({ items, count = 8, intro, pieces = [100, 50, 20, 10, 5, 1], kind = 'coin', unit = '', total = 'المجموع', go = 'ادفع 💰' }) {
    return (container, onComplete, ctx) => {
        runRounds({
            container, ctx, items: draw(ctx, items, count), onComplete, intro,
            renderRound(item, round, stage) {
                const o = { pieces, kind, unit, total, go, ...item };
                const heavy = o.kind === 'weight';
                let paid = [], locked = false;
                const sum = () => paid.reduce((a, v) => a + cents(v), 0);
                const pieceClass = (v) => `piece piece--${heavy ? 'weight' : cents(v) >= 5000 ? 'note' : 'coin'}`;
                const label = (v) => `<b>${ctx.num(v)}</b>${o.unit ? `<small>${o.unit}</small>` : ''}`;
                stage.classList.add('round--compact');
                stage.append(h(`<p class="prompt">${item.q}</p>`));
                const box = h(`
          <div class="market market--${heavy ? 'weight' : 'coin'}">
            <div class="market__tray">
              <div class="market__pile"></div>
              <div class="market__foot">
                <p class="market__total" aria-live="polite">${o.total}: <b></b></p>
                <div class="market__actions">
                  <button class="btn btn--round market__clear" aria-label="أفرغ">↺</button>
                  <button class="btn btn--gold market__go">${o.go}</button>
                </div>
              </div>
            </div>
            <div class="market__pieces"></div>
          </div>`);
                const pile = box.querySelector('.market__pile');
                const shown = box.querySelector('.market__total b');
                const row = box.querySelector('.market__pieces');
                const goBtn = box.querySelector('.market__go');
                const actions = box.querySelector('.market__actions');
                o.pieces.forEach(v => {
                    const b = h(`<button class="${pieceClass(v)}" data-v="${v}" aria-label="${ctx.num(v)} ${o.unit}">${label(v)}</button>`);
                    b.addEventListener('click', () => {
                        if (locked)
                            return;
                        ctx.sfx.tap();
                        paid.push(v);
                        refresh();
                    });
                    row.append(b);
                });
                function refresh() {
                    // One stack per value, with a count: tap a stack to take one back.
                    const stacks = o.pieces.map(v => [v, paid.filter(x => x === v).length]).filter(([, n]) => n);
                    pile.replaceChildren(...stacks.map(([v, n]) => {
                        const c = h(`<button class="${pieceClass(v)} piece--chip" aria-label="أعِد ${ctx.num(v)}">${label(v)}${n > 1 ? `<i class="piece__n">×${ctx.num(n)}</i>` : ''}</button>`);
                        c.addEventListener('click', () => { if (locked)
                            return; ctx.sfx.tap(); paid.splice(paid.lastIndexOf(v), 1); refresh(); });
                        return c;
                    }));
                    if (!paid.length)
                        pile.append(h(`<span class="market__empty">${heavy ? 'اضغط على الأوزان لتضعها في الكفّة' : 'اضغط على النقود لتضعها هنا'}</span>`));
                    shown.textContent = ctx.num(sum() / 100);
                    if (TEST)
                        mark();
                }
                // Test hook: the next piece the fewest-pieces payment needs.
                function mark() {
                    stage.querySelectorAll('[data-step], [data-ok]').forEach(b => { delete b.dataset.step; delete b.dataset.ok; });
                    if (locked)
                        return;
                    const left = cents(item.target) - sum();
                    if (left === 0)
                        goBtn.dataset.ok = '';
                    else if (left > 0) {
                        const next = o.pieces.find(v => cents(v) <= left);
                        row.querySelector(`[data-v="${next}"]`).dataset.step = '';
                    }
                    else
                        pile.lastElementChild.dataset.step = '';
                }
                box.querySelector('.market__clear').addEventListener('click', () => { if (locked || !paid.length)
                    return; ctx.sfx.tap(); paid = []; refresh(); });
                goBtn.addEventListener('click', () => {
                    if (locked)
                        return;
                    if (!paid.length) {
                        ctx.say(heavy ? 'ضع بعض الأوزان في الكفّة أولاً.' : 'ضع النقود على الطاولة أولاً.', 'think');
                        return;
                    }
                    const diff = sum() - cents(item.target);
                    if (diff === 0) {
                        locked = true;
                        box.classList.add('is-right', 'is-locked');
                        actions.style.visibility = 'hidden';
                        if (TEST)
                            mark();
                        round.right(item.note);
                        return;
                    }
                    box.classList.remove('is-wrong');
                    void box.offsetWidth;
                    box.classList.add('is-wrong');
                    const how = heavy ? (diff > 0 ? 'أثقل من المطلوب!' : 'أخفّ من المطلوب!') : (diff > 0 ? 'أكثر من الثمن!' : 'أقلّ من الثمن!');
                    round.wrong(`${how} ${item.hint || ''}`);
                });
                round.onReveal = () => {
                    locked = true;
                    paid = change(item.target, o.pieces) || [];
                    refresh();
                    box.classList.add('is-locked');
                    actions.style.visibility = 'hidden';
                    box.querySelector('.market__tray').classList.add('is-right');
                };
                stage.append(box);
                refresh();
            },
        });
    };
}
