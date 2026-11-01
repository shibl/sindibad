// Everything the browser tells about the phone and itself, for the
// diagnostics report (core/diag.ts): the browser and its exact version, the
// phone's model and Android version, memory, processor, screen, display,
// network, storage, battery, sound, voices, graphics (WebGPU too), what the
// browser can do, permissions, and how the page loaded.
//
// Never: the location, the camera or microphone, contacts, the IP address,
// or anything the child typed. Asking costs nothing the child sees: no
// permission prompt is ever shown (permissions are only read).
//
// detailsNow() answers at once; gatherDetails() fills in the answers the
// browser gives later (the exact versions and model, storage, battery,
// WebGPU, voices, permissions), so call it early and the report has them.

type Json = Record<string, unknown>;

const later: Json = {};
let gathering: Promise<Json> | null = null;

const safe = <T>(fn: () => T): T | string => { try { return fn(); } catch (err) { return `error: ${err instanceof Error ? err.message : String(err)}`; } };
const media = (q: string) => safe(() => matchMedia(q).matches);
const first = (options: string[]) => options.find(o => media(`(${o})`) === true) ?? null;

interface Conn { type?: string; effectiveType?: string; downlink?: number; downlinkMax?: number; rtt?: number; saveData?: boolean }
interface UAData { brands?: { brand: string; version: string }[]; mobile?: boolean; platform?: string; getHighEntropyValues?(h: string[]): Promise<Json> }
type Nav = Navigator & {
  userAgentData?: UAData; connection?: Conn; deviceMemory?: number;
  getBattery?(): Promise<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number }>;
  gpu?: { requestAdapter(o?: object): Promise<null | { info?: Json; features?: Set<string>; limits?: Json; isFallbackAdapter?: boolean }> };
  standalone?: boolean;
};
type Perf = Performance & { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } };

function browser(nav: Nav): Json {
  return {
    userAgent: nav.userAgent,
    appVersion: nav.appVersion,
    platform: nav.platform,
    vendor: nav.vendor,
    product: nav.product,
    languages: nav.languages,
    language: nav.language,
    uaData: nav.userAgentData ? { brands: nav.userAgentData.brands, mobile: nav.userAgentData.mobile, platform: nav.userAgentData.platform } : null,
    cookies: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack,
    webdriver: nav.webdriver,
    pdfViewer: (nav as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled ?? null,
    inApp: /; wv\)/.test(nav.userAgent) ? 'Android WebView' : null,
    standalone: media('(display-mode: standalone)') === true || nav.standalone === true,
  };
}

function hardware(nav: Nav): Json {
  return {
    memoryGB: nav.deviceMemory ?? null,
    cores: nav.hardwareConcurrency ?? null,
    touchPoints: nav.maxTouchPoints,
    jsHeap: (performance as Perf).memory
      ? { limitMB: Math.round((performance as Perf).memory!.jsHeapSizeLimit / 1048576), usedMB: Math.round((performance as Perf).memory!.usedJSHeapSize / 1048576) }
      : null,
  };
}

function screenInfo(): Json {
  const o = screen.orientation;
  const vv = window.visualViewport;
  return {
    screen: `${screen.width}x${screen.height}`,
    available: `${screen.availWidth}x${screen.availHeight}`,
    window: `${innerWidth}x${innerHeight}`,
    outer: `${outerWidth}x${outerHeight}`,
    visualViewport: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} scale ${vv.scale}` : null,
    pixelRatio: devicePixelRatio,
    physical: `${Math.round(screen.width * devicePixelRatio)}x${Math.round(screen.height * devicePixelRatio)}`,
    colorDepth: screen.colorDepth,
    orientation: o ? `${o.type} ${o.angle}°` : null,
  };
}

function display(): Json {
  return {
    colorScheme: first(['prefers-color-scheme: dark', 'prefers-color-scheme: light']),
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    reducedData: media('(prefers-reduced-data: reduce)'),
    contrast: first(['prefers-contrast: more', 'prefers-contrast: less', 'prefers-contrast: no-preference']),
    forcedColors: media('(forced-colors: active)'),
    gamut: first(['color-gamut: rec2020', 'color-gamut: p3', 'color-gamut: srgb']),
    hdr: media('(dynamic-range: high)'),
    pointer: first(['pointer: coarse', 'pointer: fine', 'pointer: none']),
    hover: media('(hover: hover)'),
    displayMode: first(['display-mode: fullscreen', 'display-mode: standalone', 'display-mode: minimal-ui', 'display-mode: browser']),
    fontSize: safe(() => getComputedStyle(document.documentElement).fontSize),
  };
}

function network(nav: Nav): Json {
  const c = nav.connection;
  return {
    online: nav.onLine,
    type: c?.type ?? null,
    effectiveType: c?.effectiveType ?? null,
    downlinkMbps: c?.downlink ?? null,
    downlinkMax: c?.downlinkMax ?? null,
    rttMs: c?.rtt ?? null,
    saveData: c?.saveData ?? null,
  };
}

function time(): Json {
  const r = Intl.DateTimeFormat().resolvedOptions();
  return {
    zone: r.timeZone,
    offsetMin: -new Date().getTimezoneOffset(),
    locale: r.locale,
    calendar: r.calendar,
    numbering: r.numberingSystem,
    hour12: new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? null,
    clock: new Date().toString(),
  };
}

// What the browser can do (true/false each), the things the game uses or
// could: 3D, sound, speech, storage, sharing, workers, newer CSS.
function features(): Json {
  const w = window as unknown as Json;
  const has = (name: string) => name in w;
  const css = (rule: string) => safe(() => CSS.supports(rule));
  const audio = document.createElement('audio');
  const play = (type: string) => audio.canPlayType(type) || 'no';
  return {
    webgl: has('WebGLRenderingContext'),
    webgl2: has('WebGL2RenderingContext'),
    webgpu: 'gpu' in navigator,
    offscreenCanvas: has('OffscreenCanvas'),
    webAssembly: typeof WebAssembly === 'object',
    sharedArrayBuffer: has('SharedArrayBuffer'),
    crossOriginIsolated: crossOriginIsolated,
    secureContext: isSecureContext,
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: has('indexedDB'),
    cacheStorage: has('caches'),
    localStorage: safe(() => { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; }),
    compressionStream: has('CompressionStream'),
    audioContext: has('AudioContext') || has('webkitAudioContext'),
    speechSynthesis: 'speechSynthesis' in window,
    speechRecognition: has('SpeechRecognition') || has('webkitSpeechRecognition'),
    vibrate: 'vibrate' in navigator,
    share: 'share' in navigator,
    clipboard: 'clipboard' in navigator,
    wakeLock: 'wakeLock' in navigator,
    fullscreen: !!document.documentElement.requestFullscreen,
    pointerEvents: has('PointerEvent'),
    resizeObserver: has('ResizeObserver'),
    importMaps: safe(() => HTMLScriptElement.supports?.('importmap') ?? null),
    cssHas: css('selector(:has(a))'),
    cssContainer: css('container-type: inline-size'),
    cssDvh: css('height: 100dvh'),
    cssBackdrop: css('backdrop-filter: blur(1px)'),
    audioFormats: { mp3: play('audio/mpeg'), ogg: play('audio/ogg; codecs="vorbis"'), opus: play('audio/ogg; codecs="opus"'), aac: play('audio/aac'), wav: play('audio/wav') },
  };
}

function page(): Json {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
  const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return {
    url: location.href.replace(/([?&]api=)[^&]*/, '$1…'),
    referrer: document.referrer ? new URL(document.referrer).origin : '',
    load: nav ? { type: nav.type, ms: Math.round(nav.duration), domReady: Math.round(nav.domContentLoadedEventEnd), bytes: nav.transferSize, protocol: nav.nextHopProtocol } : null,
    paint: paints,
    files: { count: res.length, fromCache: res.filter(r => r.transferSize === 0).length, kB: Math.round(res.reduce((n, r) => n + (r.transferSize || 0), 0) / 1024) },
    serviceWorker: navigator.serviceWorker?.controller ? navigator.serviceWorker.controller.state : 'none',
    visibility: document.visibilityState,
    upSecs: Math.round(performance.now() / 1000),
  };
}

function audioInfo(): Json {
  return safe(() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return { available: false };
    const ctx = new AC();
    const out = { available: true, sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency ?? null, outputLatency: (ctx as AudioContext & { outputLatency?: number }).outputLatency ?? null, channels: ctx.destination.maxChannelCount, state: ctx.state };
    ctx.close().catch(() => {});
    return out;
  }) as Json;
}

/** What the browser answers at once. */
export function detailsNow(): Json {
  const nav = navigator as Nav;
  return {
    browser: browser(nav),
    hardware: hardware(nav),
    screen: screenInfo(),
    display: display(),
    network: network(nav),
    time: time(),
    features: features(),
    page: page(),
    ...later,
  };
}

/** The answers that come later; once is enough (the report keeps them). */
export function gatherDetails(): Promise<Json> {
  const nav = navigator as Nav;
  return (gathering ||= (async () => {
    const tasks: Record<string, () => Promise<unknown>> = {
      // The exact browser version, the phone's model and Android version.
      uaHigh: async () => nav.userAgentData?.getHighEntropyValues?.(['architecture', 'bitness', 'formFactors', 'fullVersionList', 'model', 'platformVersion', 'uaFullVersion', 'wow64']) ?? null,
      storage: async () => {
        const e = await navigator.storage?.estimate?.();
        return e ? { quotaMB: Math.round((e.quota || 0) / 1048576), usedMB: Math.round((e.usage || 0) / 1048576), persisted: await navigator.storage.persisted?.() } : null;
      },
      caches: async () => (typeof caches === 'object' ? await caches.keys() : null),
      battery: async () => {
        const b = await nav.getBattery?.();
        return b ? { level: Math.round(b.level * 100), charging: b.charging } : null;
      },
      webgpu: async () => {
        if (!nav.gpu) return null;
        const a = await nav.gpu.requestAdapter();
        if (!a) return { adapter: 'none' };
        return { info: a.info ? { vendor: a.info.vendor, architecture: a.info.architecture, device: a.info.device, description: a.info.description } : null, fallback: (a as unknown as { isFallbackAdapter?: boolean }).isFallbackAdapter ?? null, features: a.features ? [...a.features] : [] };
      },
      permissions: async () => {
        if (!navigator.permissions?.query) return null;
        const out: Json = {};
        for (const name of ['notifications', 'persistent-storage', 'clipboard-write', 'screen-wake-lock']) {
          try { out[name] = (await navigator.permissions.query({ name } as PermissionDescriptor)).state; } catch { out[name] = 'unknown'; }
        }
        return out;
      },
      voices: () => new Promise(done => {
        if (!('speechSynthesis' in window)) { done(null); return; }
        const read = () => {
          const v = speechSynthesis.getVoices();
          return { count: v.length, arabic: v.filter(x => /^ar/i.test(x.lang)).map(x => `${x.name} (${x.lang}${x.localService ? '' : ', online'})`), english: v.filter(x => /^en/i.test(x.lang)).length, languages: [...new Set(v.map(x => x.lang))].sort() };
        };
        if (speechSynthesis.getVoices().length) { done(read()); return; }
        const t = setTimeout(() => done(read()), 3000);
        speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); done(read()); }, { once: true });
      }),
      audio: async () => audioInfo(),
    };
    await Promise.all(Object.entries(tasks).map(async ([k, fn]) => {
      try { later[k] = await Promise.race([fn(), new Promise(r => setTimeout(() => r('no answer in 5 s'), 5000))]); }
      catch (err) { later[k] = `error: ${err instanceof Error ? err.message : String(err)}`; }
    }));
    return later;
  })());
}
