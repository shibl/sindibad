// Modals, toasts and small helpers shared by the board and the minigames.

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

let stack = 0;

// Opens a modal; onOpen(el, close) wires it up. Returns { el, close }.
export function modal(html, { cls = '', onOpen, dismissable = false, onClose } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.getElementById('modal-root').append(ov);
  stack++;
  document.body.classList.add('has-modal');
  requestAnimationFrame(() => ov.classList.add('in'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    ov.classList.remove('in');
    setTimeout(() => {
      ov.remove();
      if (--stack === 0) document.body.classList.remove('has-modal');
    }, 160);
    onClose?.();
  };
  if (dismissable) {
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  }
  onOpen?.(ov.firstElementChild, close);
  return { el: ov.firstElementChild, close };
}

// Modal that resolves when its primary button is pressed.
export function info(html, { cls = '', btn = 'متابعة' } = {}) {
  return new Promise(res => {
    modal(`${html}<div class="m-foot"><button class="btn primary" data-ok>${btn}</button></div>`, {
      cls,
      onOpen: (el, close) => {
        const b = el.querySelector('[data-ok]');
        b.focus();
        b.onclick = () => { close(); res(); };
      },
    });
  });
}

export function toast(text, kind = '') {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = text;
  box.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 300);
  }, 2600);
}
