import { splashTimeline } from './splash-timeline.js';

const clamp = value => Math.max(0, Math.min(1, value));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let featureId = 0;

export function mountScenes(signal) {
  const animations = new Set();
  const requests = new Set();
  const schedule = callback => {
    const id = requestAnimationFrame(time => { requests.delete(id); if (!signal.aborted) callback(time); });
    requests.add(id);
    return id;
  };
  const animate = (element, frames, options) => {
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => {});
    return animation;
  };
  signal.addEventListener('abort', () => {
    requests.forEach(cancelAnimationFrame);
    animations.forEach(animation => animation.cancel());
  }, { once: true });

  document.querySelectorAll('[data-feature]').forEach(feature => {
    const slides = [...feature.querySelectorAll('[data-feature-image]')];
    const art = feature.querySelector('.studio-hero-art');
    const dots = [...feature.querySelectorAll('[data-feature-index]')];
    const id = `feature-reveal-${++featureId}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('feature-definitions');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs><clipPath id="${id}" clipPathUnits="objectBoundingBox"><path/></clipPath></defs>`;
    feature.append(svg);
    const path = svg.querySelector('path');
    const shapes = ['Pink', 'Green', 'Yellow'].map(name => splashTimeline.desktop.shapes.find(shape => shape.name === name).path);
    // Exact growth curves and duration variants used by the reference hero.
    const variants = [
      { duration: 1550, rotation: 850, direction: -1, curve: [[0,0,.10,.16,.26,.115,.34,.115],[.34,.115,.50,.115,.78,.85,1,1]] },
      { duration: 1500, rotation: 700, direction: 1, curve: [[0,0,.09,.16,.24,.110,.32,.110],[.32,.110,.46,.110,.74,.88,1,1]] },
      { duration: 1750, rotation: 1000, direction: -1, curve: [[0,0,.12,.18,.28,.130,.38,.130],[.38,.130,.58,.130,.80,.84,1,1]] },
    ];
    const cubic = (t, a, b, c, d) => (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d;
    const revealEase = (progress, curve) => {
      const c = curve.find(segment => progress <= segment[6]) || curve[curve.length - 1];
      let low = 0;
      let high = 1;
      for (let step = 0; step < 16; step++) {
        const t = (low + high) / 2;
        if (cubic(t, c[0], c[2], c[4], c[6]) < progress) low = t;
        else high = t;
      }
      return cubic((low + high) / 2, c[1], c[3], c[5], c[7]);
    };
    let active = 0;
    let busy = false;
    let visible = true;
    let progressAnimation;
    let variantIndex = 0;
    let timerVersion = 0;
    let resumeTransition;

    const mayPlay = () => visible && !document.hidden && !reduced() && document.documentElement.classList.contains('site-ready') && !document.documentElement.classList.contains('intro-playing') && !feature.querySelector(':focus-visible');
    const syncPlayback = () => {
      if (resumeTransition && visible && !document.hidden) {
        const tick = resumeTransition;
        resumeTransition = undefined;
        schedule(tick);
      }
      if (!progressAnimation) return;
      if (mayPlay()) progressAnimation.play();
      else progressAnimation.pause();
    };
    const startProgress = () => {
      const version = ++timerVersion;
      progressAnimation?.cancel();
      dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === active);
        dot.setAttribute('aria-current', String(index === active));
        dot.querySelector('span').style.transform = index === active ? 'scaleX(0)' : 'scaleX(1)';
      });
      if (reduced()) { dots[active].querySelector('span').style.transform = 'scaleX(1)'; return; }
      progressAnimation = dots[active].querySelector('span').animate([
        { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' },
      ], { duration: 5000, easing: 'linear', fill: 'forwards' });
      syncPlayback();
      progressAnimation.finished.then(() => {
        if (!signal.aborted && timerVersion === version) show((active + 1) % slides.length);
      }, () => {});
    };
    const show = async index => {
      if (busy || index === active) return;
      busy = true;
      ++timerVersion;
      progressAnimation?.cancel();
      const previous = slides[active];
      const incoming = slides[index];
      const image = incoming.querySelector('.feature-media img');
      if (image) {
        image.loading = 'eager';
        try { await image.decode(); } catch {}
      }
      if (signal.aborted) return;
      const finish = () => {
        previous.classList.remove('is-active');
        previous.setAttribute('aria-hidden', 'true');
        previous.inert = true;
        previous.style.zIndex = '';
        incoming.classList.add('is-active');
        incoming.style.clipPath = '';
        incoming.style.zIndex = '';
        incoming.style.opacity = '';
        incoming.removeAttribute('aria-hidden');
        incoming.inert = false;
        active = index;
        busy = false;
        startProgress();
      };
      if (reduced()) { finish(); return; }
      dots.forEach((dot, current) => {
        dot.classList.toggle('is-active', current === index);
        dot.setAttribute('aria-current', String(current === index));
        dot.querySelector('span').style.transform = current === index ? 'scaleX(0)' : 'scaleX(1)';
      });
      previous.style.zIndex = '1';
      incoming.style.zIndex = '2';
      incoming.style.opacity = '1';
      incoming.style.clipPath = `url(#${id})`;
      path.setAttribute('d', shapes[index]);
      const width = art.clientWidth;
      const height = art.clientHeight;
      const radius = Math.max(width, height) * 4 / 275;
      const variant = variants[variantIndex++ % variants.length];
      const set = elapsed => {
        const amount = revealEase(clamp(elapsed / variant.duration), variant.curve);
        const rotation = 180 * variant.direction * (1 - (1 - clamp(elapsed / variant.rotation)) ** 3);
        path.setAttribute('transform', `translate(.5 .5) scale(${1 / width} ${1 / height}) rotate(${rotation}) scale(${radius * amount})`);
      };
      set(0);
      let elapsed = 0;
      let lastTime;
      const tick = time => {
        if (!visible || document.hidden) { lastTime = undefined; resumeTransition = tick; return; }
        if (lastTime !== undefined) elapsed += Math.min(time - lastTime, 80);
        lastTime = time;
        set(elapsed);
        if (elapsed < variant.duration) schedule(tick);
        else finish();
      };
      schedule(tick);
    };
    feature.addEventListener('click', event => {
      const direction = event.target.closest('[data-feature-step]');
      const target = event.target.closest('[data-feature-index]');
      if (direction) show((active + Number(direction.dataset.featureStep) + slides.length) % slides.length);
      if (target) show(Number(target.dataset.featureIndex));
    }, { signal });
    feature.addEventListener('focusin', syncPlayback, { signal });
    feature.addEventListener('focusout', () => schedule(syncPlayback), { signal });
    document.addEventListener('visibilitychange', syncPlayback, { signal });
    window.addEventListener('sindibad:intro-complete', syncPlayback, { signal });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPlayback(); });
      observer.observe(art);
      signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    }
    signal.addEventListener('abort', () => { ++timerVersion; progressAnimation?.cancel(); }, { once: true });
    startProgress();
  });

  document.querySelectorAll('[data-shape-pile]').forEach(pile => mountShapePile(pile, signal, schedule));
  document.querySelectorAll('[data-kalam-scene]').forEach(scene => mountKalamScene(scene, signal));

  if (reduced()) {
    const updateHeader = () => {
      const hero = document.querySelector('.studio-hero-art');
      if (hero) document.querySelector('.site-header')?.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < 100);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true, signal });
    return;
  }

  const galleries = [...document.querySelectorAll('[data-gallery-arrival]')];
  // The cards rise into place with the scroll itself, so they never trail behind it: they start
  // as the gallery's top enters the screen and are settled once it is 40% of the way up.
  const arrive = (gallery, box, height) => {
    const progress = clamp((height - box.top) / (height * .6));
    const rtl = document.documentElement.dir === 'rtl' ? -1 : 1;
    gallery.querySelectorAll('.gallery-slide').forEach((card, index) => {
      const local = clamp((progress - index * .08) / .84);
      const eased = 1 - (1 - local) ** 3;
      const rest = eased > .999;
      card.style.transform = rest ? '' : `translate(${(1 - index) * 100 * rtl * (1 - eased)}px, ${(140 + index * 55) * (1 - eased)}px)`;
      card.style.opacity = rest ? '' : String(clamp(local / .45));
    });
  };
  const scenes = [...document.querySelectorAll('[data-scroll-scene]')];
  const growers = [...document.querySelectorAll('[data-grow-scene]')];
  const drawers = [...document.querySelectorAll('[data-draw-scene]')];
  let pending = false;
  const updateScroll = () => {
    pending = false;
    const height = innerHeight;
    const hero = document.querySelector('.studio-hero-art');
    if (hero) document.querySelector('.site-header')?.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < 100);
    for (const element of scenes) {
      const box = element.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height) continue;
      element.style.setProperty('--scene-progress', clamp(-box.top / box.height));
    }
    for (const gallery of galleries) {
      const box = gallery.getBoundingClientRect();
      arrive(gallery, box, height);
      if (box.bottom < 0 || box.top > height) continue;
      gallery.style.setProperty('--gallery-progress', clamp((height - box.top) / (height + box.height)));
    }
    for (const element of growers) {
      const box = element.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height) continue;
      element.style.setProperty('--scene-grow', clamp((height - box.top) / (height * .85)));
    }
    // 0 as the panel's top enters the screen, 1 once its middle reaches the middle of the screen.
    for (const element of drawers) {
      const box = element.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height) continue;
      element.style.setProperty('--draw', clamp((height - box.top) / ((height + box.height) / 2)));
    }
  };
  const queueScroll = () => {
    if (pending) return;
    pending = true;
    schedule(updateScroll);
  };
  window.addEventListener('scroll', queueScroll, { passive: true, signal });
  window.addEventListener('resize', queueScroll, { passive: true, signal });
  updateScroll();
}

// Google Labs' footer: play shapes drop into a pile. They can be picked up, carried and tossed,
// and a quick swipe nudges them. Each shape is a circle to the physics; rounded corners hide the overlap.
const pileScale = [1, .94, 1.04, .9, .96, 1.1, 1, .88, .84];
const pileReach = { Blue: 1, Pink: 1.03, Green: 1.06, Yellow: 1.02 };
// Resting on the floor, a shape tips onto a flat side: squares every 90°, the hexagon every 60°.
const pileRest = { Green: [Math.PI / 2, 0], Pink: [Math.PI / 3, Math.PI / 6], Yellow: [Math.PI / 2, 0] };

function mountShapePile(pile, signal, schedule) {
  const gravity = 2200;
  const step = 1 / 240;
  const throwSpeed = 900;
  const bodies = [...pile.querySelectorAll('.pile-shape')].map((element, index) => ({
    element, index, x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, lastAngle: 0, angle: (index % 3 - 1) * .22, spin: 0, size: 0, r: 0,
    reach: pileReach[element.dataset.shape] || 1, rest: pileRest[element.dataset.shape], active: false, born: 0,
  }));
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, r: 22, time: 0, id: undefined, moved: 0, startX: 0, startY: 0 };
  let held;
  let width = 0;
  let height = 0;
  let clock = 0;
  let running = false;
  let visible = false;
  let dropped = false;
  let lastTime;
  let calm = 0;

  const layout = () => {
    const previous = width;
    width = pile.clientWidth;
    height = pile.clientHeight;
    // Two rows of shapes, with open space above so a lifted or tossed shape stays in view.
    const radius = Math.max(22, Math.min(116, width / (width < 600 ? 11.5 : 15.5), height / 5));
    for (const body of bodies) {
      body.size = radius * pileScale[body.index % pileScale.length];
      body.r = body.size * body.reach;
      body.element.style.setProperty('--size', `${body.size * 2}px`);
      if (previous) body.x = Math.min(width - body.r, Math.max(body.r, body.x * width / previous));
      body.y = Math.min(body.y, height - body.r);
    }
  };
  const render = () => {
    for (const body of bodies) {
      const grow = body.active ? Math.min(1, .45 + (clock - body.born) / .28 * .55) : 0;
      body.element.style.opacity = body.active ? '1' : '0';
      body.element.style.transform = `translate(${body.x - body.size}px, ${body.y - body.size}px) rotate(${body.angle}rad) scale(${grow})`;
    }
  };
  // Shapes appear one after another near the top of the area, then fall.
  const spawn = body => {
    body.active = true;
    body.born = clock;
    body.x = (body.index + .5) * width / bodies.length;
    body.y = body.rest ? body.size * 1.3 : body.r;
    body.vx = (body.index % 2 ? 1 : -1) * 30;
    body.vy = 0;
  };

  const constrain = body => {
    if (body.y + body.r > height) { body.y = height - body.r; if (body.vy > 0) body.vy *= -.2; }
    // The ceiling allows for a turned square's corner, so a lifted shape is never clipped.
    const top = body.rest ? body.size * 1.3 : body.r;
    if (body.y - top < 0) { body.y = top; if (body.vy < 0) body.vy *= -.3; }
    if (body.x - body.r < 0) { body.x = body.r; if (body.vx < 0) body.vx *= -.35; }
    if (body.x + body.r > width) { body.x = width - body.r; if (body.vx > 0) body.vx *= -.35; }
  };
  const integrate = dt => {
    clock += dt;
    const live = bodies.filter(body => body.active);
    for (const body of live) {
      if (body === held) {
        // A held shape follows the pointer on a spring, and turns a little as it is carried.
        body.vx = Math.max(-1600, Math.min(1600, (pointer.x - body.x) * 22));
        body.vy = Math.max(-1600, Math.min(1600, (pointer.y - body.y) * 22));
        body.spin += (body.vx / body.r * .25 - body.spin) * Math.min(1, 8 * dt);
      } else {
        body.vy += gravity * dt;
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.spin * dt;
      body.spin *= 1 - 2.2 * dt;
      constrain(body);
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i];
          const b = live[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const reach = a.r + b.r;
          const distance = Math.hypot(dx, dy);
          if (distance >= reach || distance === 0) continue;
          const nx = dx / distance;
          const ny = dy / distance;
          // The held shape is immovable to the others: it pushes them, they do not push it.
          const ia = a === held ? 0 : 1 / (a.r * a.r);
          const ib = b === held ? 0 : 1 / (b.r * b.r);
          const share = (reach - distance) / (ia + ib);
          a.x -= nx * share * ia;
          a.y -= ny * share * ia;
          b.x += nx * share * ib;
          b.y += ny * share * ib;
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const normal = rvx * nx + rvy * ny;
          if (normal >= 0) continue;
          const impulse = -1.15 * normal / (ia + ib);
          a.vx -= impulse * nx * ia;
          a.vy -= impulse * ny * ia;
          b.vx += impulse * nx * ib;
          b.vy += impulse * ny * ib;
          if (normal > -40) continue;
          const tangent = -rvx * ny + rvy * nx;
          if (a !== held) a.spin -= tangent * .06 / a.r;
          if (b !== held) b.spin -= tangent * .06 / b.r;
        }
      }
      live.forEach(constrain);
    }
    // Only a quick swipe nudges the shapes, so a slow hand can reach in and pick one up.
    const speed = Math.hypot(pointer.vx, pointer.vy);
    if (!held && speed > 350) {
      for (const body of live) {
        const dx = body.x - pointer.x;
        const dy = body.y - pointer.y;
        const reach = body.r + pointer.r;
        const distance = Math.hypot(dx, dy);
        if (distance >= reach || distance === 0) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        body.x += nx * (reach - distance) * .5;
        body.y += ny * (reach - distance) * .5;
        const normal = (body.vx - pointer.vx * .6) * nx + (body.vy - pointer.vy * .6) * ny;
        if (normal < 0) {
          body.vx -= normal * nx;
          body.vy -= normal * ny;
          body.spin += ((pointer.vx * -ny + pointer.vy * nx) / body.r) * .15;
        }
      }
    }
    for (const body of live) {
      constrain(body);
      if (body === held || body.y + body.r < height - .5) continue;
      body.vx *= 1 - Math.min(1, 5 * dt);
      if (Math.abs(body.vx) < 4) body.vx *= .5;
      body.spin += (body.vx / body.r - body.spin) * Math.min(1, 12 * dt);
      if (Math.abs(body.vx) < 8) body.spin *= 1 - Math.min(1, 10 * dt);
      if (body.rest && Math.abs(body.vx) < 40) {
        const [period, offset] = body.rest;
        const flat = Math.round((body.angle - offset) / period) * period + offset;
        body.angle += (flat - body.angle) * Math.min(1, 6 * dt);
      }
    }
  };
  // Resting contact keeps a little velocity, so stillness is measured by movement per frame.
  const settled = () => bodies.every(body => {
    // A circle's turning cannot be seen, so only the other shapes' angles count.
    const still = Math.abs(body.x - body.lastX) + Math.abs(body.y - body.lastY) < .12 && (!body.rest || Math.abs(body.angle - body.lastAngle) < .002);
    body.lastX = body.x;
    body.lastY = body.y;
    body.lastAngle = body.angle;
    return still;
  });

  let spawned = 0;
  const frame = time => {
    if (!running) return;
    const elapsed = lastTime === undefined ? step : Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    while (spawned < bodies.length && clock >= spawned * .12) spawn(bodies[spawned++]);
    const count = Math.max(1, Math.round(elapsed / step));
    for (let index = 0; index < count; index++) integrate(elapsed / count);
    render();
    calm = !held && spawned === bodies.length && settled() ? calm + 1 : 0;
    if (calm > 45 || !visible) { running = false; lastTime = undefined; return; }
    schedule(frame);
  };
  const wake = () => {
    if (running || !dropped || !visible) return;
    running = true;
    calm = 0;
    schedule(frame);
  };
  const drop = () => {
    if (dropped) return;
    dropped = true;
    if (reduced()) {
      bodies.forEach((body, index) => { spawn(body); body.y = body.r + (index % 3) * body.r * 1.2; });
      spawned = bodies.length;
      clock = 1;
      for (let index = 0; index < 1600; index++) integrate(step);
      render();
      return;
    }
    wake();
  };

  const local = event => {
    const box = pile.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };
  const track = event => {
    const [x, y] = local(event);
    const dt = Math.max(8, event.timeStamp - pointer.time) / 1000;
    if (pointer.time) {
      pointer.vx = Math.max(-1200, Math.min(1200, (x - pointer.x) / dt));
      pointer.vy = Math.max(-1200, Math.min(1200, (y - pointer.y) / dt));
    }
    pointer.moved = Math.max(pointer.moved, Math.hypot(x - pointer.startX, y - pointer.startY));
    pointer.x = x;
    pointer.y = y;
    pointer.time = event.timeStamp;
  };
  const release = () => {
    if (!held) return;
    const body = held;
    held = undefined;
    pile.classList.remove('is-holding');
    body.element.classList.remove('is-held');
    if (pointer.moved < 6) {
      // A tap is a small hop rather than a throw.
      body.vy = -Math.sqrt(2 * gravity * body.r * 1.6);
      body.spin += (body.index % 2 ? 1 : -1) * 3;
    } else {
      const speed = Math.hypot(body.vx, body.vy);
      if (speed > throwSpeed) { body.vx *= throwSpeed / speed; body.vy *= throwSpeed / speed; }
    }
    wake();
  };

  layout();
  render();
  pile.addEventListener('pointermove', event => {
    if (pointer.id !== undefined && event.pointerId !== pointer.id) return;
    if (event.pointerType === 'touch' && !held) return;
    track(event);
    if (!reduced()) wake();
  }, { signal });
  pile.addEventListener('pointerleave', () => { if (!held) { pointer.x = pointer.y = -1e4; pointer.time = 0; pointer.vx = pointer.vy = 0; } }, { signal });
  pile.addEventListener('pointerdown', event => {
    if (reduced() || held || event.button > 0) return;
    const [x, y] = local(event);
    const live = bodies.filter(body => body.active);
    if (!live.length) return;
    const target = live.reduce((best, body) => Math.hypot(body.x - x, body.y - y) - body.r < Math.hypot(best.x - x, best.y - y) - best.r ? body : best);
    if (Math.hypot(target.x - x, target.y - y) > target.r * 1.15) return;
    event.preventDefault();
    held = target;
    pile.setPointerCapture(event.pointerId);
    pile.classList.add('is-holding');
    target.element.classList.add('is-held');
    Object.assign(pointer, { id: event.pointerId, x, y, startX: x, startY: y, moved: 0, vx: 0, vy: 0, time: event.timeStamp });
    wake();
  }, { signal });
  const end = event => {
    if (event.pointerId !== pointer.id) return;
    pointer.id = undefined;
    release();
    if (event.pointerType === 'touch') { pointer.x = pointer.y = -1e4; pointer.time = 0; pointer.vx = pointer.vy = 0; }
  };
  pile.addEventListener('pointerup', end, { signal });
  pile.addEventListener('pointercancel', end, { signal });
  window.addEventListener('resize', () => { layout(); render(); wake(); }, { passive: true, signal });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && entry.intersectionRatio > .3) drop();
      wake();
    }, { threshold: [0, .3, .5] });
    // The pile sits in a fixed panel, so visibility is read from the footer's slot in the page.
    observer.observe(pile.closest('.site-footer') || pile);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  } else {
    visible = true;
    drop();
  }
}

// Kalam's mock scene: the timer shrinks from both ends, an answer (or the silence when it runs out)
// brings the notice in the top corner, then the moment resets. It waits while offscreen.
function mountKalamScene(scene, signal) {
  const bar = scene.querySelector('.scene-timer i');
  const notice = scene.querySelector('.scene-notice');
  const notices = JSON.parse(notice.dataset.notices);
  const choices = [...scene.querySelectorAll('.scene-choice')];
  let timer;
  let reset;
  let visible = false;
  const start = () => {
    clearTimeout(reset);
    scene.classList.remove('is-answered');
    choices.forEach(choice => choice.classList.remove('is-chosen'));
    notice.classList.remove('is-shown');
    timer?.cancel();
    if (reduced()) return;
    timer = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 7000, easing: 'linear', fill: 'forwards' });
    if (!visible || document.hidden) timer.pause();
    timer.finished.then(() => answer(choices.find(choice => choice.dataset.reaction === 'silence')), () => {});
  };
  const answer = choice => {
    if (scene.classList.contains('is-answered')) return;
    timer?.pause();
    scene.classList.add('is-answered');
    choice.classList.add('is-chosen');
    notice.textContent = notices[choice.dataset.reaction];
    notice.classList.add('is-shown');
    reset = setTimeout(start, 3200);
  };
  const sync = () => {
    if (!timer || scene.classList.contains('is-answered')) return;
    if (visible && !document.hidden) timer.play();
    else timer.pause();
  };
  scene.addEventListener('click', event => {
    const choice = event.target.closest('.scene-choice');
    if (choice) answer(choice);
  }, { signal });
  scene.addEventListener('keydown', event => {
    const choice = choices[Number(event.key) - 1];
    if (choice) { event.preventDefault(); choice.focus(); answer(choice); }
  }, { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .35 });
    observer.observe(scene);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  } else visible = true;
  signal.addEventListener('abort', () => { clearTimeout(reset); timer?.cancel(); }, { once: true });
  start();
}
