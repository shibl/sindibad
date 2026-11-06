var e={label:{en:`A floating island world seen through a glass lens. Under the lens the same world appears as a blueprint, with the trails of thousands of simulated players flowing across it.`,ar:`عالم من جزر عائمة تحت عدسة زجاجية. تحت العدسة يظهر العالم نفسه مخططاً هندسياً، تسري فوقه مسارات آلاف اللاعبين المحاكَين.`},play:{en:`Send a player to the flag`,ar:`أرسل لاعباً إلى الراية`},trails:{en:`Player trails`,ar:`مسارات اللاعبين`},nav:{en:`Navigation mesh`,ar:`شبكة الملاحة`},contours:{en:`Contours`,ar:`خطوط الارتفاع`},wire:{en:`Wireframe`,ar:`الهيكل الشبكي`},grid:{en:`Survey grid`,ar:`شبكة المسح`},run:{en:`One simulated player`,ar:`لاعب من المحاكاة`}},t=(e,t=0,n=1)=>Math.max(t,Math.min(n,e)),n=(e,t,n)=>e+(t-e)*n,r=(e,n,r)=>{let i=t((r-e)/(n-e));return i*i*(3-2*i)},i=(e,t,n,r,i)=>.5*(2*t+(n-e)*i+(2*e-5*t+4*n-r)*i*i+(3*t-e-3*n+r)*i*i*i);function a(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(`[xray] ${e.getShaderInfoLog(r)}`);return r}function o(e,t,n){let r=e.createProgram();if(e.attachShader(r,a(e,e.VERTEX_SHADER,t)),e.attachShader(r,a(e,e.FRAGMENT_SHADER,n)),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw Error(`[xray] ${e.getProgramInfoLog(r)}`);return r}async function s(a){let{section:s,stage:c,copy:l,lang:u,rtl:d,reduce:f,signal:p,base:m}=a,h=`${m}about/xray/`,g=t=>e[t][u],_=()=>c.clientWidth<820||c.clientWidth/Math.max(1,innerHeight)<1.16||innerHeight<560,v=document.createElement(`div`);v.className=`xr-host`;let y=document.createElement(`div`);y.className=`xr-art`,y.setAttribute(`role`,`img`),y.setAttribute(`aria-label`,g(`label`));let b=document.createElement(`img`);b.className=`xr-poster`,b.alt=``,b.src=`data:image/webp;base64,UklGRj4EAABXRUJQVlA4IDIEAABwEwCdASpAACQAPikQhkKhoQoGqqoMAUJQBUk28o1QRvj4BW3l8ZL1dPQb/ovUA/wHUW8+t7G37relfTJ3uGQP/nuGXYA4C3vXm3pL/kXPs/73lo+h/YG/Wf0t+qAXhy3V37f0fVNedG/ksry1BXutyBbG3z0dr90wn7XuXo/4h7TLXDO8Jbav+ZHKrvsZ0USYYHsJLueVNT2njfqT7zA0ApxtgAD+//5bS6l0IGqb13IL4H/awD3y4BVLk8cib/rFoSo/pzKrs+x7186sk+l9bIEONXP7kIsF/VWP/XyjMfheJndk7kljT3SaOhzHt/W4m04Su6H2T2Erni9rF6fVWznX2BdZj2v+MNUTyEhPkTEuSIcEP/TX/FIdwdOhFYtVRPwMqdQT8F9U1fi/+p0PC18Vfq0/EH3HbIL2/ic9oBIb2NZD754ne3yMVtRwb8IxxVfmb/Q9oH3wGjPBRUxXTJe6kIMUVjCNkW9f63FK3eHztC+v/wOxzURjUbxQFe2DOjhrDFPzvKrRxPFTsxMxb2mWCepTN+4/Kq9eYojh+sgKmoLiZ6jNt/5ZbaARmiJ3HM2uu/IILxQH69u1YPvbxv7udz12r8SEYzpi4aCqds9mFo35FvcJ9SE00Dw5020TH1vPmuhp3x/MdEmftCTTtYajh7aMTyp04Avq+wAM7ZiNCClTlKoovJyPQq5/vHtg5gmNU4uqQKHlyBQGHDY/NyayApSq0Hmjm+59neVP5VWdPeugrurnD2U6Wcdnh5JEyA0RKg3UWB4eZxAHPEFwZzLUaKga9RFLBuMUU7MwHqVykqchT1P3bZrTBZrKSDl8jbaSP/CqCpKRK4rFsL4CQSnOP7xcrRixeOhkJI7in14+j85y1RAZMbhzftkiIbxg+B7MqQXGu9AbFKq+NPzaXbfYmkv7bIWFGW6mj0MI1cs4HMP8M/NVrUMzSsHDauSfrrL4JfDAQuUm5sQn8hpyv+rgG8zEZQ013f4dznChCIVezjbqvV++8g7iZQKHznc9qP78Rr1NBSn02CUbL/g7d3MqOFE2Ugv3O9zXXMDh/xz7kWmvRjLKH0Cj2AdQ7pJ+7DrtwG0LTpIsO4uCdFhTVsotvOkm4FVEIb0gjM0wmjUoqcLPvja9LoySECGfyWemcwui+lcT/46ychTvK7JqCgaH6wF9ATW6Zjx1jLuOR2Hg7e1r9eCijd7USiGaPkhz3nB84C5H3aPPhiF51PD9XHxpXrTUPNsUlr6RkOE8QtkSjv7pu/hv/eg8bPltpyz7Q2WnoohMV+M1p/Zu1rM2b4j5PZQLtfeyQtkNDalnMgLlIYX+kE/P5Is4XTPK8L4IOlPTH5mwEp3VihkVQ6GP/pyJh6a2Qc7mSx7H2TJfRw8mk/0tH/4XebM/VZofbZZR2jBZ3bswrmQgsdWR9l0OgAA=`;let x=document.createElement(`canvas`);x.className=`xr-canvas`,x.setAttribute(`aria-hidden`,`true`),y.append(b,x);let S=document.createElement(`div`);S.className=`xr-tag`,S.setAttribute(`aria-hidden`,`true`);let C=document.createElement(`span`);S.append(C);let w=document.createElement(`button`);w.type=`button`,w.className=`xr-play`,w.textContent=g(`play`);let T=document.createElement(`div`);T.className=`xr-spacer`,v.append(y,S,l,T,w),l.classList.add(`xr-copy`),c.append(v),s.style.marginTop=`0px`;let E=document.querySelector(`.a-hero`),D=-1,O=()=>{if(D===innerWidth||(D=innerWidth,s.style.marginTop=`0px`,!E))return;let e=s.getBoundingClientRect().top-E.getBoundingClientRect().bottom;s.style.marginTop=`${-(e+40)}px`};O();let k=_(),A=!1,j=e=>{e!==A&&(A=e,e?a.pin(1.15):(s.style.height=``,c.classList.remove(`is-pinned`)))},ee=e=>Math.max(500,Math.min(760,e*1.42)),M={w:1,h:1,imgW:1,imgH:1,offX:0,offY:0,zoom:1},N={l:0,t:0,r:0,b:0},te=(e=ie)=>{let i=c.clientWidth,a=k?v.clientHeight:c.clientHeight;if(M.w=i,M.h=a,k){let e=ee(i);M.imgH=e,M.imgW=16/9*e;let n=d?.31000000000000005:.69;M.offX=t(i/2-n*M.imgW,i-M.imgW,0),M.offY=a-e}else{let t=1.045+(f?0:.075*r(0,1,e));M.zoom=t,M.imgW=Math.max(i,16/9*a)*t,M.imgH=M.imgW*(9/16);let o=n(.24,.45,r(1.3,1.6,i/Math.max(1,a))),s=d?1-o:o;M.offX=(i-M.imgW)*s,M.offY=(a-M.imgH)*n(.42,.72,f?0:r(0,1,e))}let o=v.getBoundingClientRect(),s=l.getBoundingClientRect();N={l:s.left-o.left,t:s.top-o.top,r:s.right-o.left,b:s.bottom-o.top},ae||(b.style.cssText=`left:${M.offX}px;top:${M.offY}px;width:${M.imgW}px;height:${M.imgH}px;${d?`transform:scaleX(-1);`:``}`)},ne=(e,t)=>[(d?1-e:e)*M.imgW+M.offX,t*M.imgH+M.offY],re=(e,t)=>{let n=(e-M.offX)/M.imgW;return[d?1-n:n,(t-M.offY)/M.imgH]},ie=0,ae=!1;j(!k&&!f),c.classList.toggle(`xr-stack`,k),v.classList.toggle(`xr-stack`,k),c.classList.toggle(`xr-still-height`,!k&&f);let P=x.getContext(`webgl2`,{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:`high-performance`,depth:!1,stencil:!1}),oe=()=>{v.classList.add(`xr-still`),x.remove(),b.remove();let e=document.createElement(`img`);e.src=`${h}world.webp`,e.alt=``,e.className=`xr-still-world`;let t=document.createElement(`div`);t.className=`xr-still-glass`,t.style.backgroundImage=`url(${h}trails.webp), url(${h}blueprint.webp)`,y.append(e,t);let n=()=>{te(0),e.style.cssText=`left:${M.offX}px;top:${M.offY}px;width:${M.imgW}px;height:${M.imgH}px;${d?`transform:scaleX(-1);`:``}`;let[n,r]=ne(.66,.5),i=Math.min(M.w*.2,M.imgH*.26),a=1.15;t.style.cssText=`left:${n-i}px;top:${r-i}px;width:${2*i}px;height:${2*i}px;background-image:url(${h}trails.webp),url(${h}blueprint.webp);background-size:${M.imgW*a}px ${M.imgH*a}px;background-position:${i-.66*M.imgW*a}px ${i-.5*M.imgH*a}px;background-blend-mode:screen;${d?`transform:scaleX(-1);`:``}`};n(),addEventListener(`resize`,n,{signal:p})};if(!P)return oe(),()=>{l.classList.remove(`xr-copy`)};let F=o(P,`#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`,`#version 300 es
precision highp float;
uniform sampler2D uWorld, uBlue, uTrail, uTimeMap, uDepth, uOver, uFlow;
uniform vec2 uRes;         // canvas pixels
uniform vec2 uOff, uSize;  // the image's top-left and size, in canvas pixels
uniform float uFlip;       // 1 in Arabic: the art mirrors, so the text and the land change sides
uniform vec3 uLens;        // centre (canvas pixels, y down) and radius
uniform float uTime;
uniform vec2 uPar;         // parallax, in uv, for the nearest things
uniform float uLensOn;     // 0 to 1, the lens arriving
uniform float uMag;
uniform float uMotion;     // 0 when the visitor prefers stillness
uniform float uRimPx;      // the bevel's width
uniform float uLod;        // mip level for this zoom. Explicit, so texture reads inside the glass have no derivative seams.
uniform vec3 uTop;         // from this canvas y to this canvas y the picture melts into the hero's blue, this strongly
uniform vec3 uBot;         // from this canvas y to this canvas y it melts into the page's white
out vec4 o;

const vec3 SKY = vec3(214., 236., 240.) / 255.;

vec2 toUv(vec2 px) {
  vec2 uv = (px - uOff) / uSize;
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  return uv;
}

vec2 parallax(vec2 uv) {
  // Read a soft version of depth: the shift becomes a smooth warp with no doubled edges.
  float d = textureLod(uDepth, uv, 4.0).r;
  return uv + uPar * vec2(uFlip > 0.5 ? -1.0 : 1.0, 1.0) * (0.5 - d);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 h = vec2(127.1, 311.7);
  float a = fract(sin(dot(i, h)) * 43758.5453), b = fract(sin(dot(i + vec2(1, 0), h)) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), h)) * 43758.5453), d = fract(sin(dot(i + vec2(1, 1), h)) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 world(vec2 uv) {
  // Beyond the picture is only the page: its blue above, its white below.
  if (uv.y < 0.0) return SKY;
  if (uv.y > 1.0) return vec3(1.0);
  if (uMotion < 0.5) return textureLod(uWorld, uv, uLod).rgb;
  // The picture is alive: cloud breathes around its rest position, water runs.
  float m = textureLod(uFlow, uv, 0.0).r;
  float cloud = smoothstep(0.2, 0.5, m) * (1.0 - smoothstep(0.62, 0.8, m));
  float fall = smoothstep(0.62, 0.95, m);
  vec2 d = vec2(0.0);
  if (cloud > 0.0) {
    float T = uTime * 0.17;
    d = cloud * 0.0026 * vec2(sin(uv.y * 21.0 + T + sin(uv.x * 9.0 - T * 0.7) * 1.4), cos(uv.x * 17.0 - T * 0.8 + sin(uv.y * 11.0 + T) * 1.2));
  }
  vec3 c = textureLod(uWorld, uv + d, uLod).rgb;
  if (fall > 0.0) {
    float n = vnoise(vec2(uv.x * 460.0, uv.y * 20.0 - uTime * 1.5)) * 0.55 + vnoise(vec2(uv.x * 980.0, uv.y * 44.0 - uTime * 2.6)) * 0.45;
    c += (n - 0.5) * 0.17 * fall;
  }
  return c;
}

vec4 over(vec2 uv) {
  return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : textureLod(uOver, uv, 0.0);
}

// What's underneath: blueprint on deep teal, and the players' trails flowing along their own recorded time.
vec3 xrayTrails(vec2 uv) {
  vec3 tr = textureLod(uTrail, uv, max(uLod - 0.75, 0.0)).rgb;
  float t = textureLod(uTimeMap, uv, 1.2).r;
  float f = fract(t * 6.0 - uTime * 0.14);
  float head = smoothstep(0.0, 0.14, f) * pow(1.0 - f, 3.2) * 1.25;  // a soft front and a long tail, travelling dock to flag
  float flow = 0.66 + 1.25 * head * uMotion + (1.0 - uMotion) * 0.3;
  vec3 halo = textureLod(uTrail, uv, 2.6).rgb * 0.5 + textureLod(uTrail, uv, 4.5).rgb * 0.26;
  vec3 c = tr * flow + halo * (0.08 + 0.26 * head * uMotion);
  return 1.0 - exp(-c * 1.5);    // saturates softly, so the busiest lines glow instead of clipping into white shapes
}

vec3 hashTone(vec2 p) {
  float h = fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  return vec3(h - 0.5) / 255.0;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv0 = toUv(px);
  vec2 uv = parallax(uv0);
  vec3 col = world(uv);
  vec4 ov = over(uv);
  col = col * (1.0 - ov.a) + ov.rgb;
  // the picture's top and bottom are the page's own colours, whenever the page's other sections are on screen
  col = mix(col, SKY, smoothstep(uTop.y, uTop.x, px.y) * uTop.z);
  col = mix(col, vec3(1.0), smoothstep(uBot.x, uBot.y, px.y) * uBot.z);

  vec2 q = (px - uLens.xy) / uLens.z;
  float r = length(q);
  float R = uLens.z;
  float on = uLensOn;

  // light comes from the art's sun; in Arabic the art is mirrored, so the sun is too
  vec2 sun = normalize(vec2(uFlip > 0.5 ? 0.62 : -0.62, -0.78));

  if (on > 0.001 && r < 1.75) {
    // contact shadow: a soft, teal-tinted disc on the world, offset away from the sun, further where the world is far below the glass
    float dep = textureLod(uDepth, clamp(uv, 0.0, 1.0), 2.0).r;
    vec2 off = -sun * (0.07 + 0.16 * dep);
    float d = length(q - off);
    float shadow = smoothstep(1.34 + 0.2 * dep, 0.82, d);
    col *= mix(vec3(1.0), vec3(0.50, 0.68, 0.70), shadow * 0.72 * on);
    // light gathered by the glass: a warm crescent inside the shadow, on the far side from the sun
    float cres = smoothstep(0.34, 0.02, abs(d - 1.03)) * smoothstep(0.1, 0.95, dot(normalize(q - off + 1e-4), -sun));
    col += vec3(1.0, 0.86, 0.62) * cres * 0.34 * on;
  }

  if (r < 1.0) {
    float aa = 1.4 / R;
    float rimStart = 1.0 - clamp(uRimPx / R, 0.04, 0.14);
    float b = smoothstep(rimStart, 1.0, r);          // 0 inside, 1 at the outer edge
    vec2 dir = q / max(r, 1e-4);

    // the inside: a gently bulging magnifier
    float bulge = 1.0 / uMag * (1.0 + 0.13 * r * r);
    float ca = 0.012 * smoothstep(0.35, 0.95, r);
    vec2 base = uLens.xy;
    vec2 pR = base + q * R * bulge * (1.0 + ca);
    vec2 pG = base + q * R * bulge;
    vec2 pB = base + q * R * bulge * (1.0 - ca);
    vec2 uvG = parallax(toUv(pG));
    vec3 xr;
    float lodB = max(uLod - log2(uMag), 0.0);
    if (ca > 0.0005) {
      vec2 uvR = uvG + (toUv(pR) - toUv(pG));
      vec2 uvB = uvG + (toUv(pB) - toUv(pG));
      xr = vec3(textureLod(uBlue, uvR, lodB).r, textureLod(uBlue, uvG, lodB).g, textureLod(uBlue, uvB, lodB).b);
      vec3 tr = vec3(xrayTrails(uvR).r, xrayTrails(uvG).g, xrayTrails(uvB).b);
      xr = xr * (1.0 - 0.6 * clamp(max(tr.r, max(tr.g, tr.b)), 0.0, 1.0)) + tr;
    } else {
      xr = textureLod(uBlue, uvG, lodB).rgb;
      vec3 tr = xrayTrails(uvG);
      xr = xr * (1.0 - 0.6 * clamp(max(tr.r, max(tr.g, tr.b)), 0.0, 1.0)) + tr;
    }
    if (uvG.y < 0.0 || uvG.y > 1.0) xr = vec3(0.004, 0.22, 0.21);
    vec4 ovL = over(uvG);
    xr = xr * (1.0 - ovL.a) + ovL.rgb;
    // falls off towards the rim, as if we're looking down through a thick disc
    xr *= mix(1.0, 0.72, smoothstep(0.55, 0.9, r));

    // the bevel: the glass bends the beauty world back in along its edge, with colour fringes
    float bev = b * b;
    vec2 refr = -dir * R * (0.42 * bev + 0.05);
    vec3 rim;
    {
      // white-ish: the bevel mostly bends in the sky, and a little of the colour around it
      vec2 a0 = px + refr * 1.0;
      vec2 a1 = px + refr * 1.03;
      vec2 a2 = px + refr * 1.06;
      rim = vec3(world(toUv(a0)).r, world(toUv(a1)).g, world(toUv(a2)).b);
    }
    rim = mix(rim, vec3(dot(rim, vec3(0.3, 0.55, 0.15))), 0.34) * 1.05 + 0.04;

    float inner = smoothstep(rimStart + 0.012, rimStart - 0.012, r);
    vec3 glass = mix(rim, xr, inner);

    // inside edge: a dark line where the bevel starts, then a bright one, which is what makes glass look thick
    float line = smoothstep(0.011, 0.0, abs(r - rimStart - 0.002));
    glass *= 1.0 - 0.42 * line;
    float line2 = smoothstep(0.012, 0.0, abs(r - rimStart - 0.022));
    glass += vec3(0.8, 0.95, 0.95) * 0.14 * line2;

    // highlights
    float facing = dot(dir, sun);
    float spec = pow(max(facing, 0.0), 5.0);
    glass += vec3(1.0, 0.98, 0.92) * spec * smoothstep(0.9, 0.99, r) * smoothstep(1.0, 0.985, r) * 0.95;
    float back = pow(max(-facing, 0.0), 7.0);
    glass += vec3(0.75, 1.0, 0.98) * back * smoothstep(0.9, 0.975, r) * 0.42;
    // a window-shaped sheen sliding across the upper part of the face
    vec2 sh = q - sun * 0.42;
    float sheen = smoothstep(0.62, 0.0, length(sh * vec2(1.0, 1.65))) * smoothstep(0.86, 0.5, r);
    glass += vec3(0.88, 0.97, 1.0) * sheen * 0.075;
    float arc = smoothstep(0.02, 0.0, abs(r - 0.82)) * pow(max(facing, 0.0), 3.0);
    glass += vec3(1.0) * arc * 0.2;
    // the outermost edge
    glass += vec3(1.0) * smoothstep(0.988, 0.998, r) * 0.22;

    float cover = smoothstep(1.0, 1.0 - aa, r) * on;
    col = mix(col, glass, cover);
  }

  col += hashTone(gl_FragCoord.xy);
  o = vec4(col, 1.0);
}`),I=o(P,`#version 300 es
in vec2 aPos;      // image px at 2560 x 1440
in vec2 aSt;
in vec4 aColor;
in vec2 aMode;     // mode, depth
out vec2 vSt;
out vec4 vColor;
out vec2 vMode;
out vec2 vUv;
void main() {
  vUv = aPos / vec2(2560.0, 1440.0);
  vSt = aSt;
  vColor = aColor;
  vMode = aMode;
  gl_Position = vec4(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0, 0.0, 1.0);
}`,`#version 300 es
precision highp float;
uniform sampler2D uSprite, uDepth;
in vec2 vSt;
in vec4 vColor;
in vec2 vMode;
in vec2 vUv;
out vec4 o;
void main() {
  float mode = vMode.x;
  // pass behind whatever the depth pass says is closer
  float seen = 1.0;
  if (vMode.y > 0.0) seen = smoothstep(-0.012, 0.006, textureLod(uDepth, vUv, 0.0).r - vMode.y + 0.004);
  vec4 t = texture(uSprite, vSt);
  vec4 c;
  if (mode < 0.5) {
    float a = smoothstep(1.0, 0.6, abs(vSt.x));
    c = vec4(vColor.rgb, 1.0) * vColor.a * a;
  } else if (mode < 1.5) {
    c = t * vColor.a;
  } else if (mode < 2.5) {
    float r = length(vSt * 2.0 - 1.0);
    c = vec4(vColor.rgb, 1.0) * vColor.a * smoothstep(1.0, 0.1, r);
  } else {
    float r = length(vSt * 2.0 - 1.0);
    c = vec4(vColor.rgb, 1.0) * vColor.a * smoothstep(0.09, 0.0, abs(r - 0.86));
  }
  o = c * mix(0.0, 1.0, seen);
}`),L={};for(let e of[`uWorld`,`uBlue`,`uTrail`,`uTimeMap`,`uDepth`,`uOver`,`uFlow`,`uRes`,`uOff`,`uSize`,`uFlip`,`uLens`,`uTime`,`uPar`,`uLensOn`,`uMag`,`uMotion`,`uTop`,`uBot`,`uRimPx`,`uLod`])L[e]=P.getUniformLocation(F,e);let se=P.createBuffer(),ce=P.createVertexArray();P.bindVertexArray(ce),P.bindBuffer(P.ARRAY_BUFFER,se),P.bufferData(P.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),P.STATIC_DRAW);let le=P.getAttribLocation(F,`aPos`);P.enableVertexAttribArray(le),P.vertexAttribPointer(le,2,P.FLOAT,!1,0,0);let R=new Float32Array(6e5),ue=P.createBuffer(),de=P.createVertexArray();P.bindVertexArray(de),P.bindBuffer(P.ARRAY_BUFFER,ue),P.bufferData(P.ARRAY_BUFFER,R.byteLength,P.DYNAMIC_DRAW);let z=(e,t,n)=>{let r=P.getAttribLocation(I,e);P.enableVertexAttribArray(r),P.vertexAttribPointer(r,t,P.FLOAT,!1,40,n*4)};z(`aPos`,2,0),z(`aSt`,2,2),z(`aColor`,4,4),z(`aMode`,2,8),P.bindVertexArray(null);let B={uWorld:0,uBlue:1,uTrail:2,uTimeMap:3,uDepth:4,uOver:5,uSprite:6,uFlow:7},fe={},V=(e,t)=>{let n=P.createTexture();return P.activeTexture(P.TEXTURE0+B[e]),P.bindTexture(P.TEXTURE_2D,n),P.texImage2D(P.TEXTURE_2D,0,P.RGBA,1,1,0,P.RGBA,P.UNSIGNED_BYTE,new Uint8Array(t)),P.texParameteri(P.TEXTURE_2D,P.TEXTURE_MIN_FILTER,P.LINEAR),P.texParameteri(P.TEXTURE_2D,P.TEXTURE_MAG_FILTER,P.LINEAR),P.texParameteri(P.TEXTURE_2D,P.TEXTURE_WRAP_S,P.CLAMP_TO_EDGE),P.texParameteri(P.TEXTURE_2D,P.TEXTURE_WRAP_T,P.CLAMP_TO_EDGE),fe[e]=n,n};V(`uWorld`,[214,236,240,255]),V(`uBlue`,[1,63,59,255]),V(`uTrail`,[0,0,0,255]),V(`uTimeMap`,[0,0,0,255]),V(`uDepth`,[128,128,128,255]),V(`uSprite`,[0,0,0,0]),V(`uFlow`,[0,0,0,255]);let pe=2048,me=1152,he=V(`uOver`,[0,0,0,0]);P.activeTexture(P.TEXTURE0+B.uOver),P.texImage2D(P.TEXTURE_2D,0,P.RGBA,pe,me,0,P.RGBA,P.UNSIGNED_BYTE,null);let ge=P.createFramebuffer();P.bindFramebuffer(P.FRAMEBUFFER,ge),P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,he,0),P.clearColor(0,0,0,0),P.clear(P.COLOR_BUFFER_BIT),P.bindFramebuffer(P.FRAMEBUFFER,null),P.useProgram(I),P.uniform1i(P.getUniformLocation(I,`uSprite`),B.uSprite),P.uniform1i(P.getUniformLocation(I,`uDepth`),B.uDepth),P.useProgram(F);for(let e of[`uWorld`,`uBlue`,`uTrail`,`uTimeMap`,`uDepth`,`uOver`,`uFlow`])P.uniform1i(L[e],B[e]);P.uniform1f(L.uFlip,+!!d),P.uniform1f(L.uMag,1.2),P.uniform1f(L.uMotion,+!f);let H=a.touch?1706:2560,U=null,W=[],G=(e,t,n)=>{p.aborted||(P.activeTexture(P.TEXTURE0+B[e]),P.bindTexture(P.TEXTURE_2D,fe[e]),P.texImage2D(P.TEXTURE_2D,0,P.RGBA,P.RGBA,P.UNSIGNED_BYTE,t),n&&(P.generateMipmap(P.TEXTURE_2D),P.texParameteri(P.TEXTURE_2D,P.TEXTURE_MIN_FILTER,P.LINEAR_MIPMAP_LINEAR)),t.close())},K=async(e,t=!1,n=0)=>{let r=await fetch(h+e,{signal:p});if(!r.ok)throw Error(`[xray] ${e}: ${r.status}`);let i=n?{resizeWidth:n,resizeHeight:Math.round(n*9/16),resizeQuality:`high`}:{};return createImageBitmap(await r.blob(),{premultiplyAlpha:t?`premultiply`:`none`,colorSpaceConversion:`none`,...i})},_e=async()=>{let e=await K(`world.webp`,!1,H===2560?0:H);G(`uWorld`,e,!0),ae=!0,v.classList.add(`is-ready`),window.setTimeout(()=>b.remove(),800);let t=await(await fetch(`${h}manifest.json`,{signal:p})).json();U=t,Ce();let[n,r,i,a,o,s,c]=await Promise.all([K(`blueprint.webp`,!1,H===2560?0:H),K(`trails.webp`,!1,H===2560?0:Math.round(H*3/4)),K(`time.webp`),K(`depth.webp`),K(`flow.webp`),K(`runner.webp`,!0),fetch(`${h}routes.bin`,{signal:p}).then(e=>e.arrayBuffer())]),l=()=>new Promise(e=>requestAnimationFrame(e));G(`uDepth`,a,!0),G(`uFlow`,o,!1),await l(),G(`uBlue`,n,!0),await l(),G(`uTrail`,r,!0),await l(),G(`uTimeMap`,i,!0),await l(),G(`uSprite`,s,!0);let u=new Uint16Array(c),d=0;for(let e of t.routes){let t={n:e,x:new Float32Array(e),y:new Float32Array(e),s:new Float32Array(e),d:new Float32Array(e)};for(let n=0;n<e;n++)t.x[n]=u[d]/65535*2560,t.y[n]=u[d+1]/65535*1440,t.s[n]=u[d+2]/65535*40,t.d[n]=u[d+3]/65535,d+=4;W.push(t)}q=!0,ve=performance.now()},q=!1,ve=0;_e().catch(e=>{p.aborted||console.error(e)});let J=1,ye=()=>{let e=_();e!==k&&(k=e,c.classList.toggle(`xr-stack`,k),v.classList.toggle(`xr-stack`,k),j(!k&&!f),c.classList.toggle(`xr-still-height`,!k&&f)),O(),k?T.style.height=`${ee(c.clientWidth)*.97}px`:T.style.height=``;let t=a.touch?1.6:2;J=Math.min(devicePixelRatio||1,t),te();let n=Math.round(M.w*J),r=Math.round(M.h*J);(x.width!==n||x.height!==r)&&(x.width=n,x.height=r),be=!0},be=!0,xe=new ResizeObserver(ye);xe.observe(c),xe.observe(l),addEventListener(`resize`,ye,{signal:p}),ye();let Se=[],Ce=()=>{Se=U?.drift??[]},we=e=>{let t=Se.length;if(!t)return[.68,.5];let n=(e%t+t)%t,r=Math.floor(n),a=n-r,o=e=>Se[(r+e+t)%t];return[i(o(-1)[0],o(0)[0],o(1)[0],o(2)[0],a),i(o(-1)[1],o(0)[1],o(1)[1],o(2)[1],a)]},Y={x:0,y:0,vx:0,vy:0,r:0,tr:0,on:0,s:.4},Te=!1,X={x:0,y:0,active:!1,last:-1e9,touch:!1},Ee=(e,t,n)=>{let r=n*1.14+16,{l:i,t:a,r:o,b:s}=N;if(e>i-r&&e<o+r&&t>a-r&&t<s+r){let c=[[o+r,t],[i-r,t],[e,s+r],[e,a-r]],l=c[0],u=0xe8d4a51000;for(let r of c){let i=r[0]>n*.4&&r[0]<M.w-n*.4&&r[1]>-n*.3&&r[1]<M.h+n*.3,a=(r[0]-e)**2+(r[1]-t)**2+(i?0:1e9);a<u&&(u=a,l=r)}return l}return[e,t]},De=e=>{let t=v.getBoundingClientRect();return[e.clientX-t.left,e.clientY-t.top]};v.addEventListener(`pointermove`,e=>{if(f)return;let[t,n]=De(e);X.x=t,X.y=n,X.active=!0,X.touch=e.pointerType===`touch`,X.last=performance.now()},{signal:p,passive:!0}),v.addEventListener(`pointerdown`,e=>{if(f)return;let[t,n]=De(e);X.x=t,X.y=n,X.active=!0,X.touch=e.pointerType===`touch`,X.last=performance.now()},{signal:p,passive:!0});let Oe=()=>{X.active=!1};v.addEventListener(`pointerleave`,Oe,{signal:p,passive:!0}),v.addEventListener(`pointercancel`,Oe,{signal:p,passive:!0}),v.addEventListener(`pointerup`,e=>{e.pointerType===`touch`&&Oe()},{signal:p,passive:!0}),y.addEventListener(`click`,e=>{let t=v.getBoundingClientRect(),[n,r]=re(e.clientX-t.left,e.clientY-t.top);Me(n,r)},{signal:p}),w.addEventListener(`click`,()=>Me(U?.drift[0][0]??.5,U?.drift[0][1]??.56),{signal:p}),w.hidden=f;let Z=null,ke=!1,Ae=6,je=!1,Q=[],Me=(e,t)=>{if(!W.length||f)return;let n=e*2560,r=t*1440,i=W[0],a=0,o=0xe8d4a51000;for(let e of W){let t=Math.max(0,e.n-28);for(let s=0;s<t;s+=1){let t=(e.x[s]-n)**2+(e.y[s]-r)**2;t<o&&(o=t,i=e,a=s)}}Z={route:i,start:a,i:a,phase:`in`,t:0,speed:0,face:1,drawn:a,fadeOut:1,dist:0},Q.length=0,Ae=22},Ne=!1,Pe=[8,9,10,9],Fe=(e,t,n,r,i,a,o,s,c,l,u,d)=>{let f=(t,n,r,i)=>{R.set([t,n,r,i,l[0],l[1],l[2],l[3],u,d],e),e+=10};return f(t,n,a,o),f(r,n,s,o),f(r,i,s,c),f(t,n,a,o),f(r,i,s,c),f(t,i,a,c),e},Ie=()=>{let e=0,i=Z;if(i){let a=i.route,o=Math.max(i.start,0),s=Math.min(Math.ceil(i.drawn),a.n-1),c=i.fadeOut,l=[250/255,42/255,111/255],u=(t,n)=>{for(let i=o;i<s&&e<R.length-120;i++){let s=i+1,u=a.x[s]-a.x[i],d=a.y[s]-a.y[i],f=Math.hypot(u,d)+.001,p=-d/f*(t*a.s[i]/12),m=u/f*(t*a.s[i]/12),h=r(o,o+12,i),g=n*c*h,_=[l[0]*g,l[1]*g,l[2]*g,g],v=a.d[i],y=(t,n,r)=>{R.set([t,n,r,0,_[0]/Math.max(g,.001),_[1]/Math.max(g,.001),_[2]/Math.max(g,.001),g,0,v],e),e+=10};y(a.x[i]-p,a.y[i]-m,-1),y(a.x[i]+p,a.y[i]+m,1),y(a.x[s]+p,a.y[s]+m,1),y(a.x[i]-p,a.y[i]-m,-1),y(a.x[s]+p,a.y[s]+m,1),y(a.x[s]-p,a.y[s]-m,-1)}};u(11,.22),u(4.6,.98);let d=t(Math.floor(i.i),0,a.n-1),f=Math.min(d+1,a.n-1),p=t(i.i-d),m=n(a.x[d],a.x[f],p),h=n(a.y[d],a.y[f],p),g=a.s[d],_=a.d[d],v=4.6*g*(256/150),y=0,b=0,x=1,S=1,C=1;if(i.phase===`in`){let e=t(i.t/.52);b=(1-e*e)*v*1.5,C=r(0,.2,i.t);let n=r(.5,.58,i.t)*(1-r(.62,.92,i.t));x=1+.26*n,S=1-.3*n,e<1&&(S*=1.08),y=11}else if(i.phase===`run`)y=Math.floor(i.dist*.8)%8,b=Math.abs(Math.sin(i.dist*.8*Math.PI/4))*v*.05;else if(i.phase===`cheer`){let e=Math.abs(Math.sin(i.t*5.2));b=e*v*.34;let t=r(.82,1,1-e);x=1+.16*t,S=1-.18*t+.08*e,y=Pe[Math.floor(i.t*6.5)%Pe.length]}else{let e=t(i.t/.4);x=1+.2*Math.sin(e*Math.PI),S=1-.9*e,C=1-e,y=11}let w=v*.34*(1-t(b/v)*.5),T=v*.07;e=Fe(e,m-w+T,h-w*.32+v*.015,m+w+T,h+w*.32+v*.015,0,0,1,1,[0,.15,.17,.46*C],2,_);let E=v*x/2,D=v*S,O=h-b-D*.89,k=O+D,A=y/12,j=(y+1)/12,[ee,M]=i.face>=0?[A,j]:[j,A];if(e=Fe(e,m-E,O,m+E,k,ee,0,M,1,[1,1,1,C],1,_),i.phase===`cheer`||i.phase===`out`){let n=i.phase===`cheer`?i.t:2.6+i.t;for(let r=0;r<3;r++){let i=t((n-r*.28)/1.1);if(i>0&&i<1){let t=v*(.4+2.4*i);e=Fe(e,m-t,h-t*.46,m+t,h+t*.46,0,0,1,1,[l[0],l[1],l[2],(1-i)*.8],3,0)}}for(let n of Q){let r=t(n.life*2),i=n.c<.5?l:n.c<.8?[1,.82,.36]:[.2,.86,.78];e=Fe(e,n.x-n.s,n.y-n.s,n.x+n.s,n.y+n.s,0,0,1,1,[i[0],i[1],i[2],r],2,0)}}}P.bindFramebuffer(P.FRAMEBUFFER,ge),P.viewport(0,0,pe,me),P.clearColor(0,0,0,0),P.clear(P.COLOR_BUFFER_BIT),e>0&&(P.useProgram(I),P.bindVertexArray(de),P.bindBuffer(P.ARRAY_BUFFER,ue),P.bufferSubData(P.ARRAY_BUFFER,0,R.subarray(0,e)),P.enable(P.BLEND),P.blendFunc(P.ONE,P.ONE_MINUS_SRC_ALPHA),P.drawArrays(P.TRIANGLES,0,e/10),P.disable(P.BLEND)),P.bindFramebuffer(P.FRAMEBUFFER,null)},Le=e=>{let i=Z;if(!i)return;let a=i.route;if(i.t+=e,i.phase===`in`)i.drawn=i.start,i.t>.95&&(i.phase=`run`,i.t=0);else if(i.phase===`run`){let t=a.n-1-i.i,o=Math.min(1.15,.4+i.t*1.2)*(8+9*r(0,1,(a.n-i.start)/130))*r(0,10,t+2.5);i.speed=n(i.speed,o,1-Math.exp(-e*6)),i.i=Math.min(a.n-1,i.i+i.speed*e),i.dist+=i.speed*e,i.drawn=i.i;let s=Math.min(a.n-1,Math.floor(i.i)+2),c=Math.max(0,Math.floor(i.i)-1),l=a.x[s]-a.x[c];if(Math.abs(l)>.8&&(i.face=l>0?1:-1),i.i>=a.n-1.5){i.phase=`cheer`,i.t=0;for(let e=0;e<34;e++){let e=Math.random()*Math.PI*2,t=16+Math.random()*42;Q.push({x:a.x[a.n-1],y:a.y[a.n-1]-30,vx:Math.cos(e)*t,vy:-46-Math.random()*62+Math.sin(e)*t*.3,life:1+Math.random()*1.1,c:Math.random(),s:1.8+Math.random()*2.4})}}}else i.phase===`cheer`?i.t>2.6&&(i.phase=`out`,i.t=0):(i.fadeOut=1-t(i.t/2.2),i.t>2.3&&(Z=null,Ne=!1));for(let t of Q)t.vy+=92*e,t.vx*=Math.exp(-e*1.2),t.x+=t.vx*e,t.y+=t.vy*e,t.life-=e;for(;Q.length&&Q[Q.length-1].life<=0;)Q.pop();ke=!0},$=``,Re=``,ze=0,Be=[`grid`,`wire`,`nav`,`trails`,`contours`],Ve=(e,n)=>{let r=U?.labels;if(!r)return`grid`;let i=t(Math.floor(e*64),0,63),a=t(Math.floor(n*36),0,35);return Be[Number(r[a*64+i])]??`grid`},He=0,Ue=(e,i)=>{ie=i,(!k&&!f||k&&Math.abs(M.h-v.clientHeight)>1)&&te(i);let a=M.w,o=-v.getBoundingClientRect().top,c=o+innerHeight,l=(k?Math.min(a*.33,180):t(Math.min(a*.135,M.h*.215),110,250))*n(1,1.62,k||f?0:r(.05,.75,i));k||(l=Math.min(l,((d?N.l:a-N.r)-20)*.5)),Y.tr=l;let u=performance.now(),m=X.active&&(!X.touch||u-X.last<2200)&&u-X.last<4200,h,_,y=m?150:16;if(m)h=X.x,_=X.y,Ne=!1;else if(Z){Ne=!0;let e=Z.route,n=t(Math.floor(Z.i+7),0,e.n-1);[h,_]=ne(e.x[n]/2560,e.y[n]/1440)}else{Y.s+=e*(f?0:.085)*(k?.8:1);let r=Y.s+(k?i*3.2:i*1.6),a=f?[.74,.45]:we(r);if([h,_]=ne(a[0],a[1]),k){let e=(o+c)/2,r=Math.max(N.b+Y.r+10,o+Y.r*.7),i=Math.min(M.offY+M.imgH*.9,c-Y.r*.7);_=i>r?t(n(_,e,.3),r,i):Math.max(r,M.offY+M.imgH*.6)}}if(k&&(h=t(h,Y.r*.72,a-Y.r*.72),_=Math.max(_,N.b+Y.r+14)),!k){let e=m?.3:.8;h=t(h,Y.r*e,a-Y.r*e),_=t(_,Y.r*e,M.h-Y.r*e),[h,_]=Ee(h,_,Y.r)}Te||=(Y.x=h,Y.y=_,Y.r=l,!0);let b=y,w=2*Math.sqrt(b)*.82;for(let t=0;t<2;t++){let t=e/2;Y.vx+=(b*(h-Y.x)-w*Y.vx)*t,Y.vy+=(b*(_-Y.y)-w*Y.vy)*t,Y.x+=Y.vx*t,Y.y+=Y.vy*t}Y.r+=(Y.tr-Y.r)*(1-Math.exp(-e*5)),q&&(Y.on=f?1:Math.min(1,Y.on+e/.8)),f&&(Y.r=l);let T=f?1:r(0,1,Y.on),E=Y.r*n(.8,1,1-(1-T)**3)*(1+.05*Math.sin(T*Math.PI));if(!f){if(He+=e,q&&!Z&&s.getBoundingClientRect().top<innerHeight*.4&&(Ae-=e,Ae<0)){let e=!je;je=!0;let[t,n]=e&&U?U.drift[0]:re(Y.x,Y.y);Me(t,n)}Z&&Le(e)}ke&&=(Ie(),!!Z),P.bindFramebuffer(P.FRAMEBUFFER,null),P.viewport(0,0,x.width,x.height),P.useProgram(F),P.bindVertexArray(ce),P.uniform2f(L.uRes,x.width,x.height),P.uniform2f(L.uOff,M.offX*J,M.offY*J),P.uniform2f(L.uSize,M.imgW*J,M.imgH*J),P.uniform3f(L.uLens,Y.x*J,Y.y*J,Math.max(E,1)*J),P.uniform1f(L.uTime,He);let D=(Y.x/Math.max(a,1)-.5)*2,O=(Y.y/Math.max(M.h,1)-.5)*2;if(f?P.uniform2f(L.uPar,0,0):P.uniform2f(L.uPar,(d?-D:D)*.008,O*.006+(k?0:(i-.5)*.024)),P.uniform3f(L.uTop,34*J,Math.min(M.h*.26,240)*J,k?0:1-r(.03,.26,i)),P.uniform3f(L.uBot,(M.h-90)*J,M.h*J,k?1:r(.72,1,i)),P.uniform1f(L.uLensOn,Y.on),P.uniform1f(L.uRimPx,(k?13:21)*J),P.uniform1f(L.uLod,Math.max(0,Math.log2(H/Math.max(1,M.imgW*J))-.25)),P.drawArrays(P.TRIANGLES,0,3),q&&U){let[t,n]=re(Y.x,Y.y),r=Z&&Ne?`run`:Ve(t,n);r!==Re&&(Re=r,ze=0),ze+=e,r!==$&&(ze>.5||!$||r===`run`)&&($=r,S.classList.remove(`is-on`),window.setTimeout(()=>{p.aborted||(C.textContent=g($),S.classList.add(`is-on`))},C.textContent?180:0));let i=E*.895-30;S.style.transform=`translate3d(${Y.x.toFixed(1)}px, ${(Y.y+i).toFixed(1)}px, 0) translate(-50%, 0)`,S.style.opacity=String(Y.on)}},We=0;return a.frame((e,t)=>{if(!p.aborted){if(f){if((be||!q)&&(We=0),be=!1,We++>6)return;Te=!1}Ue(f?0:t,e)}}),()=>{xe.disconnect(),l.classList.remove(`xr-copy`);let e=P.getExtension(`WEBGL_lose_context`);for(let e of Object.values(fe))e&&P.deleteTexture(e);P.deleteFramebuffer(ge),P.deleteBuffer(se),P.deleteBuffer(ue),P.deleteVertexArray(ce),P.deleteVertexArray(de),P.deleteProgram(F),P.deleteProgram(I),e?.loseContext(),v.remove()}}export{s as default};