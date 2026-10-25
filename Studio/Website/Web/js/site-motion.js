import Lenis from '../vendor/lenis/lenis.mjs';
import { playReferenceSplash } from './site-splash.js';
import { mountScenes } from './site-scenes.js';

let lenis;
let mounted;
let revealObserver;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountSiteMotion() {
  mounted?.abort();
  lenis?.destroy();
  revealObserver?.disconnect();
  mounted = new AbortController();
  const { signal } = mounted;
  mountScenes(signal);
  lenis = reducedMotion() ? null : new Lenis({
    autoRaf: true,
    lerp: .12,
    smoothWheel: true,
    anchors: false,
  });
  if (document.documentElement.classList.contains('intro-playing')) lenis?.stop();

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (!url.hash || url.origin !== location.origin || url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '') || url.search !== location.search) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    history.pushState(null, '', url.hash);
    const atTop = target.id === 'top';
    const offset = atTop ? 0 : -(document.querySelector('.site-header')?.offsetHeight || 0) - 16;
    const focus = () => {
      if (!target.matches('a, button, input, [tabindex]')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    };
    if (lenis) lenis.scrollTo(atTop ? 0 : target, { offset, duration: 1.35, lerp: 0, easing: t => 1 - Math.pow(1 - t, 4), onComplete: focus });
    else {
      if (atTop) window.scrollTo({ top: 0 });
      else target.scrollIntoView();
      focus();
    }
  }, { signal });

  if (!reducedMotion() && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top < innerHeight * .94) return;
      element.classList.add('will-reveal');
      if (element.classList.contains('grade-link')) element.style.setProperty('--reveal-delay', `${[...element.parentElement.children].indexOf(element) % 6 * 55}ms`);
      revealObserver.observe(element);
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-disclosure]');
    if (!button) return;
    const panel = document.getElementById(button.dataset.disclosure);
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
    panel.classList.toggle('is-open', open);
  }, { signal });

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const track = gallery.querySelector('.gallery-track');
    const slides = [...track.children];
    const previous = gallery.querySelector('[data-gallery-step="-1"]');
    const next = gallery.querySelector('[data-gallery-step="1"]');
    const counter = gallery.querySelector('.gallery-position');
    const rtl = document.documentElement.dir === 'rtl';
    let active = 0;
    let ticking = false;
    const update = () => {
      const bounds = track.getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
      const distances = slides.map(slide => {
        const rect = slide.getBoundingClientRect();
        return Math.abs(rtl ? bounds.right - inset - rect.right : bounds.left + inset - rect.left);
      });
      const atEnd = Math.abs(track.scrollLeft) >= track.scrollWidth - track.clientWidth - 3;
      active = atEnd ? slides.length - 1 : distances.indexOf(Math.min(...distances));
      previous.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      ticking = false;
    };
    const goTo = index => {
      const target = slides[Math.max(0, Math.min(slides.length - 1, index))];
      const bounds = track.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
      track.scrollBy({ left: rtl ? rect.right - bounds.right + inset : rect.left - bounds.left - inset, behavior: reducedMotion() ? 'instant' : 'smooth' });
    };
    gallery.addEventListener('click', event => {
      const button = event.target.closest('[data-gallery-step]');
      if (button) goTo(active + Number(button.dataset.galleryStep));
    }, { signal });
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true, signal });
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') goTo(0);
      else if (event.key === 'End') goTo(slides.length - 1);
      else goTo(active + ((event.key === 'ArrowRight') !== rtl ? 1 : -1));
    }, { signal });
    window.addEventListener('resize', update, { signal });
    update();
  });
}


export function playStudioSplash(language) {
  playReferenceSplash(language, {
    onStart: () => lenis?.stop(),
    onFinish: () => { lenis?.start(); lenis?.resize(); window.dispatchEvent(new Event('sindibad:intro-complete')); },
  });
}
