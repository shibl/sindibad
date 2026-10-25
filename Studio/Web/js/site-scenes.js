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
      const image = incoming.querySelector('img');
      image.loading = 'eager';
      try { await image.decode(); } catch {}
      if (signal.aborted) return;
      const finish = () => {
        previous.classList.remove('is-active');
        previous.setAttribute('aria-hidden', 'true');
        previous.style.zIndex = '';
        incoming.classList.add('is-active');
        incoming.style.clipPath = '';
        incoming.style.zIndex = '';
        incoming.style.opacity = '';
        incoming.removeAttribute('aria-hidden');
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
  const scenes = [...document.querySelectorAll('[data-scroll-scene]')];
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
      if (box.bottom < 0 || box.top > height) continue;
      gallery.style.setProperty('--gallery-progress', clamp((height - box.top) / (height + box.height)));
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

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (entry.target.matches('[data-gallery-arrival]')) {
          entry.target.querySelectorAll('.gallery-slide').forEach((card, index) => {
            const rtl = document.documentElement.dir === 'rtl' ? -1 : 1;
            animate(card, [
              { opacity: 0, translate: `${(1 - index) * 100 * rtl}px ${140 + index * 55}px` },
              { opacity: 1, translate: '0 0' },
            ], { duration: 1800, delay: index * 70, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'backwards' });
          });
        } else {
          entry.target.querySelectorAll(':scope > span').forEach((shape, index) => {
            animate(shape, [
              { translate: '0 -180px', opacity: 0, offset: 0 },
              { translate: '0 0', opacity: 1, offset: .62 },
              { translate: '0 -32px', opacity: 1, offset: .8 },
              { translate: '0 0', opacity: 1, offset: 1 },
            ], { duration: 1250, delay: index * 100, easing: 'cubic-bezier(.3,0,.65,1)', fill: 'backwards' });
          });
        }
      }
    }, { threshold: .12 });
    galleries.forEach(element => observer.observe(element));
    document.querySelectorAll('.footer-play-shapes').forEach(element => observer.observe(element));
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }

  document.querySelectorAll('.footer-play-shapes > span').forEach(shape => {
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let moving = false;
    const tick = () => {
      x += (targetX - x) * .1;
      y += (targetY - y) * .1;
      shape.style.setProperty('--shape-x', `${x}px`);
      shape.style.setProperty('--shape-y', `${y}px`);
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .1) schedule(tick);
      else moving = false;
    };
    const move = () => { if (!moving) { moving = true; schedule(tick); } };
    shape.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const box = shape.getBoundingClientRect();
      targetX = (event.clientX - box.left - box.width / 2) * -.16;
      targetY = (event.clientY - box.top - box.height / 2) * -.16;
      move();
    }, { signal });
    shape.addEventListener('pointerleave', () => { targetX = targetY = 0; move(); }, { signal });
  });
}
