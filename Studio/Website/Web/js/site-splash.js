import { splashTimeline } from './splash-timeline.js';

const clamp = value => Math.max(0, Math.min(1, value));
const scalar = value => Array.isArray(value) ? value[0] : value;
const coordinate = (value, index) => Array.isArray(value) ? value[Math.min(index, value.length - 1)] : value;
const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;

function ease(progress, outgoing, incoming, index) {
  const x1 = coordinate(outgoing.x, index);
  const x2 = coordinate(incoming.x, index);
  let low = 0;
  let high = 1;
  for (let step = 0; step < 18; step++) {
    const middle = (low + high) / 2;
    if (bezier(middle, x1, x2) < progress) low = middle;
    else high = middle;
  }
  return bezier((low + high) / 2, coordinate(outgoing.y, index), coordinate(incoming.y, index));
}

// Evaluate the reference's 30 fps keyframes without resampling their curves.
function valueAt(property, frame) {
  if (!property.a) return property.k;
  const keys = property.k;
  if (frame <= keys[0].t) return keys[0].s;
  for (let index = 0; index < keys.length - 1; index++) {
    const key = keys[index];
    const next = keys[index + 1];
    if (frame >= next.t) continue;
    const progress = clamp((frame - key.t) / (next.t - key.t));
    return key.s.map((value, dimension) => value + (next.s[dimension] - value) * ease(progress, key.o, key.i, dimension));
  }
  return keys[keys.length - 1].s;
}

function transformAt(motion, frame) {
  const position = valueAt(motion.p, frame);
  const anchor = valueAt(motion.a, frame);
  const scale = valueAt(motion.s, frame);
  const rotation = scalar(valueAt(motion.r, frame));
  return `translate(${position[0]} ${position[1]}) rotate(${rotation}) scale(${scale[0] / 100} ${scale[1] / 100}) translate(${-anchor[0]} ${-anchor[1]})`;
}

export function playReferenceSplash(language, { onStart, onFinish } = {}) {
  const root = document.documentElement;
  const key = 'sindibad-labs-intro-2026-10-25-final';
  // The intro plays on the first visit and on every refresh of the home page. Arriving from
  // another page of the site, going back or forward, or following a section link skips it.
  const reload = performance.getEntriesByType?.('navigation')[0]?.type === 'reload';
  let seen = false;
  try {
    seen = sessionStorage.getItem(key) === 'true';
    sessionStorage.setItem(key, 'true');
  } catch {}
  if ((!reload && (seen || location.hash)) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('site-ready');
    onFinish?.();
    return;
  }
  if (reload) {
    // A refresh starts over at the hero, which the intro opens onto.
    history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
  }

  const data = innerWidth <= 768 ? splashTimeline.mobile : splashTimeline.desktop;
  const website = document.getElementById('website');
  const splash = document.createElement('div');
  const name = language === 'ar' ? 'سندباد ستوديوز' : 'Sindibad Studios';
  const glyphs = language === 'ar' ? name.split(' ') : [...name];
  splash.className = 'studio-splash';
  splash.setAttribute('aria-label', name);
  splash.setAttribute('role', 'img');
  splash.innerHTML = `<svg class="splash-vector" viewBox="0 0 ${data.width} ${data.height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><mask id="splash-cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="${data.width}" height="${data.height}" style="mask-type:luminance"><rect width="${data.width}" height="${data.height}" fill="white"/><g data-aperture><path d="${data.aperture.path}" transform="translate(${data.aperture.offset.join(' ')})" fill="black"/></g></mask></defs><g mask="url(#splash-cutout)"><rect width="${data.width}" height="${data.height}" fill="#f3efea"/><g data-composition><g data-orbit>${[...data.shapes].reverse().map(shape => `<g data-shape="${shape.name}"><path d="${shape.path}" transform="translate(${shape.offset.join(' ')})" fill="${shape.fill}"/></g>`).join('')}</g></g></g></svg><div class="splash-label"><strong aria-label="${name}">${glyphs.map(glyph => `<span class="splash-letter" aria-hidden="true">${glyph === ' ' ? '&nbsp;' : glyph}</span>`).join(language === 'ar' ? ' ' : '')}</strong></div>`;

  const composition = splash.querySelector('[data-composition]');
  const orbit = splash.querySelector('[data-orbit]');
  const aperture = splash.querySelector('[data-aperture]');
  const label = splash.querySelector('.splash-label');
  const letters = [...label.querySelectorAll('.splash-letter')];
  const shapes = data.shapes.map(shape => ({ ...shape, element: splash.querySelector(`[data-shape="${shape.name}"]`) }));
  const events = new AbortController();
  let frame = 0;
  let speed = 1;
  let previousTime;
  let request;
  let finished = false;
  let lastTouch;
  let watchdog;

  const draw = () => {
    composition.setAttribute('transform', transformAt(data.composition, frame));
    orbit.setAttribute('transform', transformAt(data.orbit, frame));
    aperture.setAttribute('transform', transformAt(data.aperture.motion, frame));
    for (const shape of shapes) {
      shape.element.setAttribute('transform', transformAt(shape.motion, frame));
      shape.element.style.opacity = frame < shape.in ? '0' : '1';
    }
    label.style.opacity = String(scalar(valueAt(data.labelOpacity, frame)) / 100);
    const viewportScale = Math.max(innerWidth / data.width, innerHeight / data.height);
    letters.forEach((letter, index) => {
      const position = index / Math.max(1, letters.length - 1) * (data.letters.length - 1);
      const lower = Math.floor(position);
      const upper = Math.ceil(position);
      const mix = position - lower;
      const a = data.letters[lower];
      const b = data.letters[upper];
      const from = valueAt(a.position, frame)[0] - valueAt(a.position, 60)[0];
      const to = valueAt(b.position, frame)[0] - valueAt(b.position, 60)[0];
      const displacement = (from + (to - from) * mix) * data.textScale * viewportScale;
      letter.style.translate = `${displacement * (language === 'ar' ? -1 : 1)}px 0`;
      letter.style.opacity = String(scalar(valueAt(a.opacity, frame)) / 100);
    });
    if (frame >= 110) root.classList.add('site-ready');
    if (frame >= 153) splash.style.opacity = '0';
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(request);
    clearTimeout(watchdog);
    events.abort();
    splash.remove();
    website.inert = false;
    root.classList.remove('intro-playing');
    root.classList.add('site-ready');
    onFinish?.();
  };
  const tick = time => {
    if (previousTime !== undefined) {
      const elapsed = Math.min(time - previousTime, 80);
      frame += elapsed * data.fps / 1000 * speed;
      speed = 1 + (speed - 1) * Math.pow(.94, elapsed / (1000 / 60));
    }
    previousTime = time;
    try { draw(); } catch (error) { finish(); console.error(error); return; }
    if (frame >= data.end) finish();
    else request = requestAnimationFrame(tick);
  };
  const accelerate = delta => { speed = Math.min(5, speed + Math.abs(delta) * .005); };
  window.addEventListener('wheel', event => {
    event.preventDefault();
    accelerate(event.deltaY);
  }, { passive: false, signal: events.signal });
  window.addEventListener('touchstart', event => { lastTouch = event.touches[0]?.clientY; }, { passive: true, signal: events.signal });
  window.addEventListener('touchmove', event => {
    event.preventDefault();
    const nextTouch = event.touches[0]?.clientY;
    if (lastTouch !== undefined && nextTouch !== undefined) accelerate(lastTouch - nextTouch);
    lastTouch = nextTouch;
  }, { passive: false, signal: events.signal });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') finish();
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Tab'].includes(event.key)) event.preventDefault();
  }, { signal: events.signal });
  document.addEventListener('visibilitychange', () => { previousTime = undefined; }, { signal: events.signal });
  watchdog = setTimeout(finish, 6500);
  try {
    website.inert = true;
    root.classList.add('intro-playing');
    draw();
    document.body.append(splash);
    onStart?.();
    request = requestAnimationFrame(tick);
  } catch (error) {
    finish();
    console.error(error);
  }
}
