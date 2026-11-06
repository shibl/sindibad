var e={en:{setSail:`Set sail`,weight:`A one-time download of about {mb} MB`,art:`A dhow under full sail on a golden sea, with islands on the horizon.`,title:`Set sail: a small game`,loading:`Hoisting the sail`,noGl:`This device can’t run the game. It needs a browser with WebGL 2.`,noLoad:`The game didn’t load. Please check your connection and try again.`,close:`Close the game`,mute:`Turn the sound off`,unmute:`Turn the sound on`,hintKeys:`Steer with ← → or the pointer`,hintTouch:`Hold the left or right of the screen to steer`,follow:`Follow the hoopoe to the islands`,isles:{beautiful:{name:`Beautiful`,line:`The island of beautiful things`},research:{name:`Research`,line:`The island of finding out`},play:{name:`Play`,line:`The island of play`}},chart:`The chart is yours now`,tapDesktop:`Press space or click, and they jump`,tapTouch:`Tap, and they jump`,toFind:`islands found`,again:`Sail again`,back:`Back to the site`},ar:{setSail:`أبحِر`,weight:`تحميل لمرة واحدة بحجم {mb} ميغابايت تقريباً`,art:`مركب شراعي تقليدي يبحر بكامل أشرعته فوق بحر ذهبي، وفي الأفق جزر.`,title:`أبحِر: لعبة صغيرة`,loading:`نرفع الشراع`,noGl:`لا يستطيع هذا الجهاز تشغيل اللعبة، فهي تحتاج إلى متصفح يدعم WebGL 2.`,noLoad:`لم تُحمَّل اللعبة. تحقّق من اتصالك وحاول مرة أخرى.`,close:`أغلق اللعبة`,mute:`أوقف الصوت`,unmute:`شغّل الصوت`,hintKeys:`وجّه المركب بالسهمين ← → أو بالمؤشر`,hintTouch:`اضغط مطوّلاً على يمين الشاشة أو يسارها لتوجيه المركب`,follow:`اتبع الهدهد إلى الجزر`,isles:{beautiful:{name:`الجمال`,line:`جزيرة الجمال`},research:{name:`البحث`,line:`جزيرة البحث والاكتشاف`},play:{name:`اللعب`,line:`جزيرة اللعب`}},chart:`الخريطة بين يديك الآن`,tapDesktop:`اضغط المسافة أو انقر لتقفز الأسماك`,tapTouch:`انقر لتقفز الأسماك`,toFind:`جزر اكتُشفت`,again:`أبحِر من جديد`,back:`العودة إلى الموقع`}},t=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/></svg>`,n=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor"/><path d="M17 10l4 4M21 10l-4 4"/></svg>`,r=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,i=`<svg viewBox="0 0 64 56" aria-hidden="true"><path fill="currentColor" d="M31 3 C20 13 13 26 10 39 L31 39 Z"/><path fill="currentColor" opacity=".78" d="M35 12 C43 19 49 28 52 39 L35 39 Z"/><path fill="currentColor" d="M4 42 H60 C57 50 50 54 42 54 H20 C12 54 7 50 4 42 Z"/></svg>`,a={beautiful:`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="12" cy="5.7" r="3.8"/><circle cx="18" cy="10" r="3.8"/><circle cx="15.7" cy="17.1" r="3.8"/><circle cx="8.3" cy="17.1" r="3.8"/><circle cx="6" cy="10" r="3.8"/></g><circle cx="12" cy="11.8" r="2.4" fill="var(--sg-chip, #013f3b)"/></svg>`,research:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 8h6l1.7 13H7.3L9 8z"/><path fill="currentColor" d="M8.5 4.5h7V7h-7zM10 2h4v2h-4z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M17.5 4 22 2.6M17.5 6.2 22 7.6M6.5 4 2 2.6M6.5 6.2 2 7.6"/></svg>`,play:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a1.6 1.6 0 0 1 1.6 1.6v.5c3 .8 4.7 3.2 4.7 6.3 0 3.3.8 4.8 2.2 6.3.4.5.1 1.3-.6 1.3H4.1c-.7 0-1-.8-.6-1.3 1.4-1.5 2.2-3 2.2-6.3 0-3.1 1.7-5.5 4.7-6.3v-.5A1.6 1.6 0 0 1 12 3z"/><path fill="currentColor" d="M9.8 20.8h4.4a2.2 2.2 0 0 1-4.4 0z"/></svg>`},o=[`beautiful`,`research`,`play`],s=null;function c(){s?.()}var l={beautiful:{x:-330,z:640,r:130},research:{x:520,z:880,r:118},play:{x:40,z:1320,r:118}},u={x0:-760,z0:-110,w:1640,h:1640};function d(c,d,f){if(s)return;let p=e[c.lang],m=c.base,h=document.createElement(`div`);h.className=`sg`,h.dir=c.rtl?`rtl`:`ltr`,h.lang=c.lang,h.setAttribute(`role`,`dialog`),h.setAttribute(`aria-modal`,`true`),h.setAttribute(`aria-label`,p.title),h.setAttribute(`data-lenis-prevent`,``);let g=matchMedia(`(pointer: coarse)`).matches,ee=o.map(e=>`<li data-id="${e}"><i>${a[e]}</i><span>${p.isles[e].name}</span></li>`).join(``);h.innerHTML=`
    <div class="sg-load" aria-live="polite">
      <div class="sg-load-art" aria-hidden="true"></div>
      <div class="sg-load-box">
        <b>${p.loading}</b>
        <div class="sg-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${p.loading}">
          <svg class="sg-wave" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true"><path class="sg-wave-off" d="M0 12 Q 12.5 2 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12 T 225 12 T 250 12 T 275 12 T 300 12 T 325 12 T 350 12 T 375 12 T 400 12"/><path class="sg-wave-on" pathLength="1" d="M0 12 Q 12.5 2 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12 T 225 12 T 250 12 T 275 12 T 300 12 T 325 12 T 350 12 T 375 12 T 400 12"/></svg>
          <span class="sg-boat">${i}</span>
        </div>
        <small><span class="sg-pct">0%</span> · ${p.weight.replace(`{mb}`,f)}</small>
      </div>
    </div>
    <iframe class="sg-frame" title="${p.title}" allow="autoplay; fullscreen; gamepad" src="${m}about/sail/game/index.html"></iframe>
    <div class="sg-curtain" aria-hidden="true"></div>
    <div class="sg-say" role="status"></div>
    <div class="sg-word" aria-live="polite"><b></b><span></span></div>
    <div class="sg-arrow" aria-hidden="true"><i></i></div>
    <div class="sg-hud">
      <ul class="sg-chips" aria-label="${p.toFind}">${ee}</ul>
      <div class="sg-map" aria-hidden="true"><canvas width="264" height="264"></canvas></div>
    </div>
    <div class="sg-card" role="status">
      <h2></h2>
      <div class="sg-card-row">
        <a class="sg-btn is-main" data-a="work" href="#contact"></a>
        <button type="button" class="sg-btn" data-a="again">${p.again}</button>
        <button type="button" class="sg-btn" data-a="leave">${p.back}</button>
      </div>
    </div>
    <div class="sg-top">
      <button type="button" class="sg-round" data-a="sound" aria-label="${p.mute}">${t}</button>
      <button type="button" class="sg-round" data-a="exit" aria-label="${p.close}">${r}</button>
    </div>`,c.section.append(h);let _=e=>h.querySelector(e),v=_(`.sg-frame`),y=_(`.sg-load`),b=_(`.sg-say`),x=_(`.sg-word`),S=_(`.sg-card`),C=_(`.sg-arrow`),w=_(`.sg-map`),te=w.querySelector(`canvas`),T=_(`.sg-track`),E=_(`.sg-pct`),D=_(`.sg-curtain`),O=_(`.sg-load-art`);O.style.backgroundImage=`url(${m}about/sail/${c.touch?`tall`:`wide`}.webp)`,S.querySelector(`h2`).textContent=c.headline.textContent,_(`[data-a="work"]`).textContent=c.cta.textContent;let k=[];for(let e=h;e!==document.body;e=e.parentElement)for(let t of e.parentElement.children)t!==e&&t instanceof HTMLElement&&!t.inert&&k.push(t);k.forEach(e=>e.inert=!0);let A=document.querySelector(`.about-switch`),j=A?.style.visibility??``;A&&(A.style.visibility=`hidden`);let M=window.scrollY,N=document.documentElement.style.overflow;document.documentElement.style.overflow=`hidden`,document.documentElement.dataset.sailGame=`on`,requestAnimationFrame(()=>h.classList.add(`is-on`));let P=new AbortController,{signal:F}=P;c.signal.addEventListener(`abort`,()=>V(),{signal:F});let I=(e,t=``,n=!0)=>v.contentWindow?.postMessage({fn:e,arg:t,focus:n},location.origin),L=()=>v.focus(),R=0,z=0,B=(e,t=0)=>{clearTimeout(R),b.textContent=e,b.classList.toggle(`is-on`,!!e),t&&(R=window.setTimeout(()=>b.classList.remove(`is-on`),t))},ne=(e,t,n=5200)=>{clearTimeout(z),x.querySelector(`b`).textContent=e,x.querySelector(`span`).textContent=t,x.classList.add(`is-on`),z=window.setTimeout(()=>x.classList.remove(`is-on`),n)},re=!1;function V(e=!1){re||(re=!0,s=null,P.abort(),clearTimeout(R),clearTimeout(z),clearTimeout(X),clearTimeout(Z),cancelAnimationFrame(W),h.classList.remove(`is-on`),document.documentElement.style.overflow=N,delete document.documentElement.dataset.sailGame,k.forEach(e=>e.inert=!1),A&&(A.style.visibility=j),window.scrollTo({top:M,behavior:`instant`}),v.src=`about:blank`,setTimeout(()=>h.remove(),320),e?document.querySelector(`#contact`)?.scrollIntoView({behavior:`smooth`}):d.focus({preventScroll:!0}))}s=()=>V();let ie=te.getContext(`2d`),H=0,U=0,W=0,G=new Set,K={x:0,z:0,h:0},q=e=>(e-u.x0)/u.w*264,J=e=>264-(e-u.z0)/u.h*264,ae=e=>{if(W=requestAnimationFrame(ae),!H)return;U=Math.min(1,U+.02);let t=ie;t.clearRect(0,0,264,264),t.save(),t.beginPath(),t.arc(132,132,128*(1-(1-U)**3),0,Math.PI*2),t.clip(),t.fillStyle=`rgba(2, 40, 44, 0.86)`,t.fillRect(0,0,264,264),t.strokeStyle=`rgba(255, 228, 170, 0.28)`,t.lineWidth=1;for(let e of[44,88,128])t.beginPath(),t.arc(132,132,e,0,Math.PI*2),t.stroke();for(let e=0;e<8;e++){let n=e/8*Math.PI*2;t.beginPath(),t.moveTo(132+Math.cos(n)*18,132+Math.sin(n)*18),t.lineTo(132+Math.cos(n)*128,132+Math.sin(n)*128),t.stroke()}t.setLineDash([3,5]),t.lineDashOffset=-e/80,t.strokeStyle=`rgba(255, 228, 170, 0.8)`;for(let e of o){if(G.has(e))continue;let n=l[e];t.beginPath(),t.moveTo(q(K.x),J(K.z)),t.lineTo(q(n.x),J(n.z)),t.stroke()}t.setLineDash([]);for(let e of o){let n=l[e],r=G.has(e);t.beginPath(),t.arc(q(n.x),J(n.z),n.r/u.w*264,0,Math.PI*2),t.fillStyle=r?`rgba(255, 228, 170, 0.3)`:`rgba(255, 228, 170, 0.92)`,t.fill()}t.translate(q(K.x),J(K.z)),t.rotate(K.h*Math.PI/180),t.fillStyle=`#fa2a6f`,t.strokeStyle=`#fff`,t.lineWidth=2,t.beginPath(),t.moveTo(0,-9),t.lineTo(6,7),t.lineTo(0,4),t.lineTo(-6,7),t.closePath(),t.stroke(),t.fill(),t.restore()};W=requestAnimationFrame(ae),window.addEventListener(`message`,e=>{if(e.origin!==location.origin||e.source!==v.contentWindow||!e.data?.sail)return;let{sail:t,value:n}=e.data;switch(t){case`progress`:{let e=Math.max(.02,Math.min(1,Number(n)));T.style.setProperty(`--p`,String(e)),T.setAttribute(`aria-valuenow`,String(Math.round(e*100))),E.textContent=new Intl.NumberFormat(c.lang,{style:`percent`}).format(e);break}case`ready`:h.classList.add(`is-ready`),c.reduce&&I(`ReduceMotion`),se(),L();break;case`fail`:{let e=n===`webgl2`;y.querySelector(`b`).textContent=e?p.noGl:p.noLoad,y.querySelector(`.sg-track`)?.remove(),y.querySelector(`small`)?.remove(),y.classList.add(`is-failed`);break}case`esc`:V();break;case`state`:oe(n);break;case`arrive`:{let e=p.isles[n];e&&(B(``),ne(e.name,e.line),h.querySelector(`.sg-chips [data-id="${n}"]`)?.classList.add(`is-found`),G.add(n));break}case`chart`:H=1,w.classList.add(`is-on`),B(p.chart,4200);break;case`tap`:n===`1`&&B(g?p.tapTouch:p.tapDesktop,6e3);break;case`pos`:{let[e,t,r,i,a,o,s]=n.split(`,`).map(Number);K={x:e,z:t,h:r};let c=i>=0&&(s<0||a<.04||a>.96||o<.06||o>.94);if(Q=c?Q+1:0,C.classList.toggle(`is-on`,Q>10),c){let e=(s<0?-(a-.5):a-.5)>=0;C.style.setProperty(`--x`,e?`92%`:`8%`),C.style.setProperty(`--r`,e?`90deg`:`-90deg`)}break}case`done`:h.classList.add(`is-done`),S.classList.add(`is-on`),S.querySelector(`.is-main`).focus({preventScroll:!0})}window.dispatchEvent(new CustomEvent(`sail:event`,{detail:{sail:t,value:n}}))},{signal:F});function oe(e){e===`moment`&&clearTimeout(X),e===`sail`&&!Y&&(Y=!0,B(g?p.hintTouch:p.hintKeys),X=window.setTimeout(()=>B(p.follow,5e3),5e3))}let Y=!1,X=0,Z=0,Q=0;window.addEventListener(`keydown`,e=>{e.key===`Escape`?(e.preventDefault(),e.stopImmediatePropagation(),V()):(document.activeElement?.tagName!==`A`||e.key!==`Enter`)&&(e.key.startsWith(`Arrow`)||e.key===` `||/^[0-9a-zA-Z]$/.test(e.key))&&((document.activeElement?.tagName!==`BUTTON`||e.key!==` `)&&e.preventDefault(),e.stopImmediatePropagation(),S.classList.contains(`is-on`)||L())},{capture:!0,signal:F});let $=!1,se=()=>I(`AudioOn`,$||document.hidden?`0`:`1`,!1);document.addEventListener(`visibilitychange`,se,{signal:F}),h.addEventListener(`click`,e=>{let r=e.target.closest(`[data-a]`);if(r)switch(r.dataset.a){case`exit`:case`leave`:V();break;case`work`:e.preventDefault(),V(!0);break;case`again`:S.classList.remove(`is-on`),h.classList.remove(`is-done`),h.querySelectorAll(`.is-found`).forEach(e=>e.classList.remove(`is-found`)),G.clear(),H=0,U=0,w.classList.remove(`is-on`),Y=!1,D.classList.add(`is-on`),Z=window.setTimeout(()=>{I(`Again`),L(),Z=window.setTimeout(()=>D.classList.remove(`is-on`),160)},420);break;case`sound`:$=!$,r.innerHTML=$?n:t,r.setAttribute(`aria-label`,$?p.unmute:p.mute),se(),L()}},{signal:F}),v.addEventListener(`load`,L,{signal:F})}var f=`#version 300 es
out vec2 vP;
void main() {
  vec2 p = vec2(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0);
  vP = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`,p=`#version 300 es
precision highp float;
in vec2 vP;
out vec4 O;
uniform sampler2D uArt, uMap;
uniform vec2 uRes;
uniform float uImg;       // the picture's aspect
uniform vec4 uRect;       // the part of the picture on show: left, top, width, height
uniform float uT;
uniform vec2 uPtr;
uniform float uScroll;
uniform float uFlip;
uniform vec2 uSun;
uniform float uHorizon;
uniform vec2 uBoat;       // the boat's waterline, the point it rocks about
uniform vec2 uBoatR;
uniform float uDpr;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 3.7) + 0.15 * noise(p * 4.3 + 9.1);
}
vec2 cover(vec2 p) {
  return uRect.xy + p * uRect.zw;
}

void main() {
  vec2 p = vP;
  if (uFlip > 0.5) p.x = 1.0 - p.x;
  vec2 uv = cover(p);

  // The boat rides the swell: everything around its waterline turns a hair and rises and falls, fading out to nothing,
  // so the picture bends rather than tears.
  vec2 fromBoat = uv - uBoat;
  vec2 stretch = vec2(uImg, 1.0);
  float r = length((fromBoat - vec2(0.0, -uBoatR.y)) * stretch / (uBoatR.x * uImg));
  float rock = smoothstep(1.25, 0.5, r);
  float th = (sin(uT * 0.62) * 0.0075 + sin(uT * 0.97 + 1.2) * 0.004) * rock;
  float cth = cos(th), sth = sin(th);
  vec2 q = fromBoat * stretch;
  q = vec2(q.x * cth - q.y * sth, q.x * sth + q.y * cth) / stretch;
  uv = uBoat + q + vec2(0.0, (sin(uT * 0.8) * 0.0028 + sin(uT * 1.31 + 0.8) * 0.0012) * rock);

  // Parallax: near things slide further than far ones, by how far the pointer has moved and how far the page has scrolled.
  vec4 m0 = texture(uMap, uv);
  float near = pow(clamp(1.0 - m0.r, 0.0, 1.0), 1.4);
  vec2 par = (uPtr * vec2(0.022, 0.012) + vec2(0.0, uScroll * 0.03)) * (0.1 + near * 1.6);
  vec2 st = uv + par;
  vec4 m = texture(uMap, st);
  float sea = smoothstep(0.35, 0.8, m.g);
  float sky = smoothstep(0.55, 0.95, m.b);

  vec3 col;
  if (sea > 0.002) {
    // The water's surface in perspective: coordinates that stretch with distance, as far water would.
    float wy = clamp((st.y - uHorizon) / (1.0 - uHorizon), 0.0015, 1.0);
    vec2 w = vec2((st.x - 0.5) * uImg / wy, 0.32 / wy);
    float t = uT;
    vec2 d = vec2(
      fbm(w * 5.5 + vec2(t * 0.34, t * 0.6)) + 0.6 * fbm(w * 14.0 + vec2(-t * 0.5, t * 0.9)) - 0.8,
      fbm(w * 4.7 + vec2(-t * 0.28, t * 0.47) + 11.0) + 0.6 * fbm(w * 12.0 + vec2(t * 0.42, t * 0.8) + 5.0) - 0.8
    );
    vec2 disp = d * vec2(0.0065, 0.009) * (0.1 + wy * 1.1);
    vec3 c = texture(uArt, st + disp * sea).rgb;
    // A slow breath across the swell.
    float swell = fbm(w * 1.4 + vec2(t * 0.09, t * 0.2));
    c *= 0.965 + 0.07 * swell;
    // The sun's road: tiny points of light flick on and off along it, densest under the sun and scattered to either side.
    // They're laid out in screen space, so they stay the same fine size whatever the picture's scale.
    float dx = (st.x - uSun.x) * uImg;
    float road = exp(-dx * dx / (0.012 + wy * wy * 0.1));
    vec2 gp = vP * uRes / vec2(6.0, 3.0 + wy * 4.0) / uDpr;
    vec2 cellId = floor(gp);
    float h = hash(cellId);
    float chance = road * 0.42 + 0.006;
    if (h > 1.0 - chance) {
      vec2 off = vec2(hash(cellId + 3.1), hash(cellId + 7.7)) - 0.5;
      float dist = length(fract(gp) - 0.5 - off * 0.5);
      float tw = max(0.0, sin(t * (1.6 + h * 3.0) + h * 80.0));
      tw *= tw * tw;
      c += vec3(1.0, 0.86, 0.6) * smoothstep(0.34, 0.06, dist) * tw * (0.22 + road * 0.8) * (0.4 + wy * 0.6);
    }
    col = mix(texture(uArt, st).rgb, c, sea);
  } else {
    col = texture(uArt, st).rgb;
  }
  if (sky > 0.002) {
    // Clouds drift: two sliding copies crossfaded on a slow cycle, held still at the sun and the boat so they stay crisp.
    float cyc = uT / 44.0;
    float a = fract(cyc), b = fract(cyc + 0.5);
    float high = clamp(1.0 - st.y / max(uHorizon, 0.01), 0.0, 1.0);
    vec2 flow = vec2(0.03 + 0.05 * high, 0.002);
    float keep = smoothstep(0.03, 0.2, length((st - uSun) * stretch))
               * smoothstep(0.0, 0.32, length((st - uBoat + vec2(0.0, uBoatR.y)) * stretch) - uBoatR.x * uImg * 0.72);
    float fade = abs(2.0 * a - 1.0);
    vec3 c1 = texture(uArt, st - flow * (a - 0.5) * keep).rgb;
    vec3 c2 = texture(uArt, st - flow * (b - 0.5) * keep).rgb;
    vec3 c = mix(c1, c2, fade);
    // Thin veils of high cloud pass in front of it all, catching a little of the light.
    float veil = fbm(vec2(st.x * uImg * 2.0 - uT * 0.012, st.y * 7.0 + uT * 0.003));
    veil = smoothstep(0.52, 0.86, veil) * high;
    c = mix(c, c + vec3(0.2, 0.16, 0.12), veil * 0.26);
    col = mix(col, c, sky);
  }
  O = vec4(col, 1.0);
}`;function m(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader failed`);return r}var h=e=>new Promise((t,n)=>{if(e.complete&&e.naturalWidth)return t(e);e.addEventListener(`load`,()=>t(e),{once:!0}),e.addEventListener(`error`,()=>n(Error(`poster failed`)),{once:!0})}),g=(e,t)=>new Promise((n,r)=>{let i=new Image;i.decoding=`async`,i.onload=()=>n(i),i.onerror=()=>r(Error(`could not load ${e}`)),t.addEventListener(`abort`,()=>r(Error(`aborted`)),{once:!0}),i.src=e});function ee(e){let t=e.canvas.getContext(`webgl2`,{antialias:!1,alpha:!1,powerPreference:`high-performance`,depth:!1,stencil:!1});if(!t)return null;let n=t.createProgram();if(t.attachShader(n,m(t,t.VERTEX_SHADER,f)),t.attachShader(n,m(t,t.FRAGMENT_SHADER,p)),t.linkProgram(n),!t.getProgramParameter(n,t.LINK_STATUS))throw Error(t.getProgramInfoLog(n)??`link failed`);t.useProgram(n);let r=e=>t.getUniformLocation(n,e),i={res:r(`uRes`),t:r(`uT`),ptr:r(`uPtr`),scroll:r(`uScroll`),rect:r(`uRect`)};t.uniform1i(r(`uArt`),0),t.uniform1i(r(`uMap`),1),t.uniform1f(r(`uImg`),e.aspect),t.uniform1f(r(`uFlip`),+!!e.flip),t.uniform2f(r(`uSun`),e.sun[0],e.sun[1]),t.uniform1f(r(`uHorizon`),e.horizon),t.uniform2f(r(`uBoat`),e.boat[0],e.boat[1]),t.uniform2f(r(`uBoatR`),e.boatSize[0],e.boatSize[1]),t.uniform1f(r(`uDpr`),e.dpr);let a=t.createVertexArray();t.bindVertexArray(a);let o=[],s=(e,n,r)=>{let i=t.createTexture();o.push(i),t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,i),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.MIRRORED_REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.MIRRORED_REPEAT),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,n)},c=!1,l=0,u=0,d=0;return Promise.all([h(e.art),g(e.map,e.signal)]).then(async([t,n])=>{e.signal.aborted||(s(0,t,!0),s(1,n,!1),c=!0,e.onReady())}).catch(()=>{}),{frame(e,n,r,a){t.uniform4f(i.rect,e,n,r,a)},draw(n,r,a,o){if(!c)return;l+=n;let s=Math.round(e.canvas.clientWidth*e.dpr),f=Math.round(e.canvas.clientHeight*e.dpr);(s!==u||f!==d)&&(u=s,d=f,e.canvas.width=s,e.canvas.height=f,t.viewport(0,0,s,f),t.uniform2f(i.res,s,f)),t.uniform1f(i.t,l),t.uniform2f(i.ptr,e.flip?-r:r,a),t.uniform1f(i.scroll,o),t.drawArrays(t.TRIANGLES,0,3)},destroy(){for(let e of o)t.deleteTexture(e);t.deleteProgram(n),t.deleteVertexArray(a),t.getExtension(`WEBGL_lose_context`)?.loseContext()}}}var _={desktop:11,phone:12},v={file:`wide`,aspect:2400/1350,anchor:[.62,.7],sun:[.612,.4],horizon:.802,boat:[.65,.915],boatSize:[.21,.38]},y={file:`tall`,aspect:1e3/2600,anchor:[.44,1],sun:[.19,.66],horizon:.79,boat:[.4,.82],boatSize:[.26,.1]},b=.955,x=765.6,S=.845,C=22,w=.54;function te(e,t,n,r){let i=t/n,a=(i>e.aspect?1:i/e.aspect)*b,o=e.anchor[0]*(1-a);if(e.file===`wide`){let n=(r+x)/t;(e.sun[0]-o)/a<n&&(a=Math.min(a,e.sun[0]/n),o=Math.max(0,e.sun[0]-a*n,S-.985*a))}let s=a*e.aspect/i;return{l:o,t:e.anchor[1]*(1-s),w:a,h:s}}var T=`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.5 2.5C7.6 7 5 12 3.8 17h7.7V2.5z"/><path fill="currentColor" opacity=".72" d="M13.3 7.2c2.7 2.8 4.8 6.2 6 9.8h-6V7.2z"/><path fill="currentColor" d="M2 18.7h20c-1 2.2-3.2 3.3-5.5 3.3h-9C5.200 22 3 20.900 2 18.700z"/></svg>`,E=t=>{let n=e[t.lang],r=matchMedia(`(max-width: 760px) and (orientation: portrait)`),i=()=>t.touch||r.matches?y:v,a=`${t.base}about/sail/`,o=(()=>{try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}})(),s=new Intl.NumberFormat(t.lang===`ar`?`ar-EG`:`en`).format(t.touch?_.phone:_.desktop),l=document.createElement(`div`);l.dir=t.rtl?`rtl`:`ltr`;let u=document.createElement(`img`);u.className=`sail-still`,u.alt=n.art,u.decoding=`async`;let f=document.createElement(`div`);f.className=`sail-shade`,f.setAttribute(`aria-hidden`,`true`);let p=document.createElement(`div`);p.className=`sail-actions`;let m=document.createElement(`button`);m.type=`button`,m.className=`sail-go`,m.innerHTML=`${T}<span>${n.setSail}</span>`;let h=document.createElement(`p`);h.className=`sail-note`,h.textContent=o?n.weight.replace(`{mb}`,s):n.noGl,o&&p.append(m),p.append(h,t.cta),t.copy.append(p),t.copy.classList.add(`sail-copy`),l.append(u,f,t.copy),t.stage.append(l),m.addEventListener(`click`,()=>d(t,m,s),{signal:t.signal});let g=null,x=null,S=``,E=o&&!t.reduce,D=()=>{let e=i();if(e.file===S||(S=e.file,g?.destroy(),g=null,x?.remove(),l.className=`sail is-${e.file}`,u.src=`${a}${e.file}.webp`,u.style.transform=t.rtl?`scaleX(-1)`:``,A=e,O(),!E))return;x=document.createElement(`canvas`),x.className=`sail-live`,x.setAttribute(`aria-hidden`,`true`),u.after(x);let n=ee({canvas:x,art:u,map:`${a}${e.file}-map.webp`,aspect:e.aspect,sun:e.sun,horizon:e.horizon,boat:e.boat,boatSize:e.boatSize,flip:t.rtl,dpr:Math.min(devicePixelRatio||1,t.touch?1.5:2),signal:t.signal,onReady:()=>{g===n&&l.classList.add(`is-live`)}});g=n,O()};function O(){if(!A)return;let e=l.clientWidth;if(!e)return;A.file===`tall`?k(A,e):(l.style.paddingBlockEnd=``,f.style.bottom=``,f.style.height=``);let n=l.clientHeight;if(!n)return;let r=parseFloat(getComputedStyle(t.copy).paddingInlineStart)||0,i=te(A,e,n,r),a=e/i.w,o=n/i.h,s=-i.l*a;u.style.width=`${a}px`,u.style.height=`${o}px`,u.style.left=`${t.rtl?e-s-a:s}px`,u.style.top=`${-i.t*o}px`,g?.frame(i.l,i.t,i.w,i.h)}function k(e,n){let r=l.getBoundingClientRect().top,i=t.copy.getBoundingClientRect().bottom-r,a=i+C,o=a/(.5269999999999999/b);n/o>e.aspect&&(o=a+.42800000000000005*n/(b*e.aspect));let s=Math.ceil(o-i);Math.abs(parseFloat(l.style.paddingBlockEnd||`0`)-s)>=1&&(l.style.paddingBlockEnd=`${s}px`),f.style.bottom=`auto`,f.style.height=`${(h.getBoundingClientRect().bottom-r)/w}px`}let A=null;D(),r.addEventListener(`change`,D,{signal:t.signal});let j=new ResizeObserver(O);j.observe(l);let M=0,N=0,P=0,F=0,I=0;return t.touch||(t.section.addEventListener(`pointermove`,e=>{let t=l.getBoundingClientRect();M=(e.clientX-t.left)/t.width*2-1,N=(e.clientY-t.top)/t.height*2-1},{signal:t.signal}),t.section.addEventListener(`pointerleave`,()=>{M=0,N=0},{signal:t.signal})),t.frame((e,n)=>{if(!g||!l.classList.contains(`is-live`)||document.documentElement.dataset.sailGame)return;I+=n;let r=t.touch?Math.sin(I*.37)*.35:0,i=1-Math.exp(-n*2.4);P+=(M+r-P)*i,F+=(N-F)*i,g.draw(n,P,F,e-.5)}),()=>{c(),j.disconnect(),g?.destroy(),t.copy.classList.remove(`sail-copy`),t.copy.append(t.cta),p.remove(),h.remove(),l.remove()}};export{E as default};