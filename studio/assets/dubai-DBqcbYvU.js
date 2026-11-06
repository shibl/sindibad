var e=e=>e*Math.PI/180,t=e=>e*180/Math.PI,n=e=>(e%360+540)%360-180,r=e=>Math.max(0,Math.min(1,e)),i=(e,t,n)=>{let i=r((n-e)/(t-e));return i*i*(3-2*i)},a=e=>e.getTime()/864e5-10957.5;function o(n,r,i){let o=e(((280.46061837+360.98564736629*a(i)+55.2708)%360+360)%360)-n,s=e(25.2048),c=Math.asin(Math.sin(s)*Math.sin(r)+Math.cos(s)*Math.cos(r)*Math.cos(o)),l=Math.atan2(-Math.cos(r)*Math.sin(o),Math.sin(r)*Math.cos(s)-Math.cos(r)*Math.sin(s)*Math.cos(o)),u=Math.atan2(Math.sin(o),Math.tan(s)*Math.cos(r)-Math.sin(r)*Math.cos(o));return{el:t(c),az:(t(l)+360)%360,q:u}}function s(t){let n=a(t),r=e((357.529+.98560028*n)%360),i=e(280.459+.98564736*n+1.915*Math.sin(r)+.02*Math.sin(2*r)),s=e(23.439-36e-8*n);return{...o(Math.atan2(Math.cos(s)*Math.sin(i),Math.cos(i)),Math.asin(Math.sin(s)*Math.sin(i)),t),lon:i}}function c(t){let n=a(t)/36525,r=(t,n)=>t*Math.sin(e(n)),i=218.32+481267.881*n+r(6.29,135+477198.87*n)+r(-1.27,259.3-413335.36*n)+r(.66,235.7+890534.22*n)+r(.21,269.9+954397.74*n)+r(-.19,357.5+35999.05*n)+r(-.11,186.5+966404.03*n),c=r(5.13,93.3+483202.02*n)+r(.28,228.2+960400.89*n)+r(-.28,318.3+6003.15*n)+r(-.17,217.6-407332.21*n),l=e(i),u=e(c),d=e(23.439-.013*n),f=Math.cos(u)*Math.cos(l),p=Math.cos(d)*Math.cos(u)*Math.sin(l)-Math.sin(d)*Math.sin(u),m=Math.sin(d)*Math.cos(u)*Math.sin(l)+Math.cos(d)*Math.sin(u),h=Math.atan2(p,f),g=Math.asin(m),_=s(t),v=Math.acos(Math.cos(u)*Math.cos(l-_.lon));return{...o(h,g,t),lit:(1-Math.cos(v))/2}}var l=e=>{let t=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,n=parseInt(e.slice(1),16);return[t((n>>16&255)/255),t((n>>8&255)/255),t((n&255)/255)]},u=e=>e.map(e=>Math.round(255*(e<=.0031308?12.92*e:1.055*Math.max(e,0)**(1/2.4)-.055))).join(` `),d=[{el:-18,sky:l(`#0d1636`),zen:l(`#040818`),amb:[.042,.056,.115],light:[0,0,0],glow:[0,0,0],fade:l(`#0a1026`)},{el:-10,sky:l(`#1c2652`),zen:l(`#070d28`),amb:[.065,.085,.17],light:[0,0,0],glow:[.02,.012,.03],fade:l(`#0d1430`)},{el:-5,sky:l(`#5e5a9c`),zen:l(`#141f55`),amb:[.12,.13,.27],light:[0,0,0],glow:[.28,.1,.09],fade:l(`#1b2150`)},{el:-1,sky:l(`#b98498`),zen:l(`#34488f`),amb:[.19,.17,.32],light:[.3,.13,.08],glow:[.72,.27,.1],fade:l(`#2f2a5a`)},{el:1,sky:l(`#e8a98f`),zen:l(`#5479bd`),amb:[.22,.19,.32],light:[.75,.36,.16],glow:[.72,.3,.1],fade:l(`#4c3f68`)},{el:2,sky:l(`#f6bd97`),zen:l(`#6490cf`),amb:[.23,.2,.32],light:[1.05,.54,.25],glow:[.68,.3,.1],fade:l(`#fbe6d4`)},{el:4,sky:l(`#ffcfa6`),zen:l(`#78a3dd`),amb:[.26,.24,.35],light:[1.3,.74,.36],glow:[.55,.27,.09],fade:l(`#fff0e0`)},{el:9,sky:l(`#ffe4c8`),zen:l(`#8fbee9`),amb:[.33,.34,.44],light:[1.2,.9,.6],glow:[.2,.11,.04],fade:l(`#fff7ee`)},{el:18,sky:l(`#e9f0ee`),zen:l(`#9cd0f0`),amb:[.44,.47,.5],light:[.95,.86,.72],glow:[0,0,0],fade:l(`#ffffff`)},{el:35,sky:l(`#d9eef9`),zen:l(`#9fd2f3`),amb:[.39,.44,.48],light:[.78,.74,.68],glow:[0,0,0],fade:l(`#ffffff`)},{el:55,sky:l(`#d9eef9`),zen:l(`#9fd2f3`),amb:[.31,.385,.43],light:[.7,.67,.62],glow:[0,0,0],fade:l(`#ffffff`)}],f=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n];function p(e){if(e<=d[0].el)return d[0];for(let t=1;t<d.length;t++)if(e<=d[t].el){let n=d[t-1],r=d[t],i=(e-n.el)/(r.el-n.el);return{el:e,sky:f(n.sky,r.sky,i),zen:f(n.zen,r.zen,i),amb:f(n.amb,r.amb,i),light:f(n.light,r.light,i),glow:f(n.glow,r.glow,i),fade:f(n.fade,r.fade,i)}}return d[d.length-1]}var m=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],h=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],g=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},_=(t,n)=>{let r=e(t),i=e(n);return[Math.sin(r)*Math.cos(i),Math.cos(r)*Math.cos(i),Math.sin(i)]};function v(e){let t=s(e),a=c(e),o=t.az<180,l=n(t.az-318),d=1-i(4,24,t.el),v=318+l+n((o?25:-25)-l)*d,y=_(v,t.el),b=n(a.az-318),x=318+(Math.abs(b)<16?b<0?-16:16:Math.abs(b)<26?b:b>0?22:-22),S=i(-1,2,a.el),C=_(x,4+.9*r(a.el/50)),w=p(t.el),T=_(v,Math.max(t.el,3)),E=w.light;if(t.el<-1.5){T=_(x,Math.max(a.el,34));let e=S*Math.sqrt(a.lit)*i(-1.5,-6,t.el);E=[.14*e,.18*e,.27*e]}let D=_(a.az,a.el),O=_(t.az,t.el),k=g(m(D,[0,0,1])),ee=m(k,D),te=h(O,k),ne=h(O,ee),re=Math.hypot(te,ne)||1,ie=1-i(-8,.5,t.el),ae=t.el<1.5;return{mode:t.el>8?`day`:t.el<-6?`night`:o?`dawn`:`dusk`,sunEl:t.el,sunAz:t.az,moonEl:a.el,moonAz:a.az,moonLit:a.lit,moonUp:S,moonPhase:2*a.lit-1,moonLimb:[te/re,ne/re],moonRot:a.q,sunDir:y,moonDir:C,L:T,light:E,amb:w.amb,sky:w.sky,zenith:w.zen,glow:w.glow,night:ie,stars:1-i(-13,-4,t.el),skyShow:1-i(5,16,t.el),fade:u(w.fade),top:u(f(w.sky,w.zen,.45*(1-i(5,16,t.el)))),dark:ae}}function y(){let e=new URLSearchParams(location.search),t=/^(\d{1,2}):(\d{2})$/.exec(e.get(`time`)??``),n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e.get(`date`)??``),r=new Date;if(!t&&!n)return r;let i=new Date(r.getTime()+144e5);return new Date(Date.UTC(n?+n[1]:i.getUTCFullYear(),n?n[2]-1:i.getUTCMonth(),n?+n[3]:i.getUTCDate(),(t?+t[1]:i.getUTCHours())-4,t?+t[2]:i.getUTCMinutes()))}var b=`/concepts/dubai/`;function x(e){let t=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,n=parseInt(e.slice(1),16);return[t((n>>16&255)/255),t((n>>8&255)/255),t((n&255)/255)]}var S=(e,t)=>[(t-55.27436)*Math.cos(25.19716*Math.PI/180)*111320/100,(e-25.19716)*110574/100],C=([e,t,n])=>`vec3(${e.toFixed(5)},${t.toFixed(5)},${n.toFixed(5)})`,w=e=>(e=Math.max(0,Math.min(1,e)),e*e*e*(e*(6*e-15)+10)),T=(e,t,n)=>e+(t-e)*n,E=e=>e*Math.PI/180,D=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DShadow;
uniform mat4 u_vp, u_lvp;
uniform vec3 u_eye, u_L, u_light, u_amb, u_sky, u_zen, u_glow, u_sunDir;
uniform float u_t, u_time, u_haze, u_night;
#define L u_L
#define SUN u_light
#define AMB u_amb
#define SKY u_sky
#define ZENITH u_zen
#define OPEN (SUN * L.z + AMB)
const vec2 MER = vec2(-18.3, 33.7);      // La Mer's beach, whose low-rise buildings get their own paint and height
float outBack(float x, float o) { x = clamp(x, 0., 1.) - 1.; return 1. + (o + 1.) * x * x * x + o * x * x; }
vec3 srgb(vec3 c) { c = clamp(c, 0., 1.); return mix(12.92 * c, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
// The colour of the air looking a given way: warmer toward a low sun.
vec3 air(vec3 d) {
  vec3 n = normalize(d);
  float g = max(dot(normalize(n.xy + 1e-5), normalize(u_sunDir.xy + 1e-5)), 0.);
  // After dark the city's own light hangs low in the air, over land and sea alike.
  return SKY + u_glow * (g * g * g * g * .8 + g * .2) + u_night * vec3(.044, .03, .04) * exp(-abs(n.z) * 20.);
}
vec3 haze(vec3 c, vec3 P) { vec3 d = P - u_eye; return mix(c, air(d), 1. - exp(-pow(length(d) / (260. * u_haze), 1.6))); }
`,O=`
uniform sampler2D u_ao;
uniform sampler2DShadow u_sdw;
uniform vec4 u_bake;
// How much sky each spot of ground can see, baked in Blender with every tower standing. It sweeps in with the rising towers.
float aoAt(vec2 xy) {
  vec2 uv = vec2((xy.x - u_bake.x) / u_bake.z, 1. - (xy.y - u_bake.y) / u_bake.z);
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return 1.;
  float r = smoothstep(.25, 1., (u_t - (.55 + min(length(xy) / 62., 1.) * 1.25)) / .85);
  return mix(1., texture(u_ao, uv).r, r);
}
float sunSeen(vec3 P, vec3 N) {
  vec4 q = u_lvp * vec4(P + N * .035, 1.);
  vec3 c = q.xyz * .5 + .5;
  if (c.x < 0. || c.y < 0. || c.x > 1. || c.y > 1.) return 1.;
  // Four rotated taps, each filtered by the hardware, soften the edge for a fraction of the cost of many.
  float z = c.z - .00015, r = .00027, q2 = r * .38;
  return (texture(u_sdw, vec3(c.x + r, c.y + q2, z)) + texture(u_sdw, vec3(c.x - r, c.y - q2, z)) +
    texture(u_sdw, vec3(c.x - q2, c.y + r, z)) + texture(u_sdw, vec3(c.x + q2, c.y - r, z))) * .25;
}
float sunOn() { return step(.004, SUN.r + SUN.g + SUN.b); }
// Sky light plus the sun or moon, whichever is up, with live shadows from the towers.
vec3 groundLight(vec3 P) {
  float d = length(P - u_eye), seen = 1.;
  if (sunOn() > 0. && d < 90.) seen = mix(sunSeen(P, vec3(0, 0, 1)), 1., smoothstep(70., 90., d));
  return AMB * aoAt(P.xy) + SUN * L.z * seen;
}
`,k=`${D}
uniform vec4 u_b;
in vec2 a_p;
out vec3 v_P;
out float v_side;
void main() { v_P = vec3(mix(u_b.xy, u_b.zw, a_p), 0.); v_side = (gl_VertexID & 1) == 0 ? 1. : -1.; gl_Position = u_vp * vec4(v_P, 1.); }`,ee=[1.35,-2.05],te=E(12),ne=`
uniform float u_show;
const vec2 JET_AT = vec2(${ee[0].toFixed(3)}, ${ee[1].toFixed(3)});
const vec2 JET_N = vec2(${(-Math.sin(te)).toFixed(5)}, ${Math.cos(te).toFixed(5)});
float jetK(vec3 i) {
  float T = u_time, q = dot(i.xy - JET_AT, vec2(JET_N.y, -JET_N.x));
  float a = pow(sin(q * 3.4 - T * 1.9) * .5 + .5, 2.);
  float b = pow(sin(T * 1.25) * .5 + .5, 1.5) * (1. - min(abs(q) / 1.5, 1.) * .78);
  float c = step(.5, fract(q * 2.2 + floor(T * .9) * .5)) * (.55 + .45 * sin(T * 2.2));
  float m = mod(floor(T / 7.), 3.);
  float pick = m < 1. ? a : m < 2. ? b : c;
  return smoothstep(3., 3.6, u_t) * mix((.3 + .7 * a) * .8, .22 + pick * .85, u_show) * mix(1., 1.75, u_show);
}
`,re=`${D}${O}${ne}
uniform int u_mode;
uniform float u_surf, u_deep;
uniform sampler2D u_noise, u_coast;
uniform vec3 u_moonDir;
uniform float u_moonLit, u_moonUp;
in vec3 v_P;
in float v_side;
out vec4 o;
const vec3 W0 = ${C(x(`#6cc4f3`))}, W1 = ${C(x(`#86d3f8`))};
const vec3 D0 = ${C(x(`#1d7fcb`))}, D1 = ${C(x(`#2c97db`))};
void main() {
  vec2 xy = v_P.xy;
  vec3 c;
  if (u_mode == 3) {
    float d = length(v_P - u_eye);
    float swell = smoothstep(.3, .7, texture(u_noise, xy / 178.).r);
    vec3 base = mix(mix(W0, W1, swell), mix(D0, D1, swell), u_deep);
    // Near the shore the sea turns to pale turquoise shallows, baked from the real coastline, with surf rolling in.
    vec2 cuv = vec2((xy.x + 190.) / 300., 1. - (xy.y + 120.) / 300.);
    float shore = (cuv.x < 0. || cuv.y < 0. || cuv.x > 1. || cuv.y > 1.) ? 0. : texture(u_coast, cuv).r;
    shore *= smoothstep(0., .012, min(min(cuv.x, cuv.y), min(1. - cuv.x, 1. - cuv.y)));
    base = mix(base, mix(${C(x(`#8fe6df`))}, ${C(x(`#55d9cf`))}, u_deep), smoothstep(.05, .6, shore) * .9);
    // Moving ripples catch the sky and the sun. They fade out with distance, before they could shimmer.
    float fade = exp(-d / 55.);
    vec3 N = vec3(0, 0, 1);
    vec2 flow = vec2(u_time * .35, u_time * .22);
    if (fade > .02) {
      vec2 a = texture(u_noise, (xy * 9. + flow) / 8.).gb * 2. - 1.;
      vec2 b = texture(u_noise, (xy * 20.7 - flow * 1.4) / 8.).gb * 2. - 1.;
      N = normalize(vec3((a + b * .6) * .13 * fade, 1.));
    }
    vec3 V = normalize(u_eye - v_P);
    float fres = pow(1. - max(dot(N, V), 0.), 5.);
    vec3 sunAndSky = groundLight(v_P);
    c = base * sunAndSky;
    // Out at sea after dark there are no city lights to see by, so the moon does more: shallows glow a soft teal round the islands.
    c += base * u_deep * u_night * vec3(.09, .14, .2) * (1. + 2. * smoothstep(.05, .6, shore));
    c = mix(c, mix(ZENITH, air(-V), .35) * 1.12, fres * .55 + .05);
    // The fountain mirrored in the lake: each spot of water looks along its reflected ray to the wall of jets, ripples and all.
    if (d < 40. && abs(xy.x - JET_AT.x) < 4. && abs(xy.y - JET_AT.y) < 4.) {
      vec3 Rr = reflect(-V, normalize(vec3(N.xy * 2.4, 1.)));
      float across = dot(Rr.xy, JET_N);
      float hit = dot(JET_AT - v_P.xy, JET_N) / (abs(across) < .001 ? .001 : across);
      if (hit > 0.) {
        vec3 H = v_P + Rr * hit;
        float along = dot(H.xy - JET_AT, vec2(JET_N.y, -JET_N.x));
        float tall = (.58 + .22 * abs(sin(along * 2.15 + .7))) * jetK(vec3(H.xy, 0.));
        float a = smoothstep(1.75, .75, abs(along)) * smoothstep(tall, tall * .35, H.z) * step(0., H.z);
        c += mix(OPEN * .34, vec3(1., .86, .62) * .46, u_night) * a * mix(.5, 1., u_show) * pow(1. - V.z, 1.5);
      }
    }
    // After dark the lit shore smears across the water in long wavering columns.
    if (u_night > .01 && fade > .02) {
      vec2 lookW = normalize(v_P.xy - u_eye.xy);
      float angW = atan(lookW.y, lookW.x);
      float lightsW = smoothstep(.5, .72, texture(u_noise, vec2(angW * 7.3, 9. / d + u_time * .012)).r);
      float tone = texture(u_noise, vec2(angW * 2.1, .4)).r;
      float breakUp = .55 + .9 * length(N.xy) / max(.13 * fade, .01);
      c += mix(vec3(1., .74, .46), vec3(.62, .78, 1.), smoothstep(.42, .6, tone)) * lightsW * breakUp * exp(-V.z * 9.) * u_night * .3 * smoothstep(.0, .35, shore + (1. - u_surf));
    }
    if (u_surf > 0. && shore > .25) {
      // Thin lines of foam close in along the waterline, broken up, each creeping toward the sand.
      float wob = texture(u_noise, xy / 6.5).r * 3.;
      float wave = sin(shore * 62. - u_time * .85 + wob);
      float crest = smoothstep(.8, .98, wave) * smoothstep(.56, .7, shore);
      crest *= smoothstep(.34, .6, texture(u_noise, xy / 1.3 + flow * .03).r) * exp(-d / 60.);
      c = mix(c, sunAndSky * vec3(1.02), crest * .8);
    }
    c += SUN * pow(max(dot(reflect(-L, N), V), 0.), 420.) * 2. * fade;
    // A glittering column on the water under a low sun or the moon, breaking into dashes that drift toward us.
    vec2 look = normalize(v_P.xy - u_eye.xy);
    // Coordinates that go as 1/distance keep the dashes evenly spaced up the screen, thinning toward the horizon.
    float ang = atan(look.y, look.x);
    float v1 = texture(u_noise, vec2(ang * 1.3, 120. / d + u_time * .03)).r;
    float v2 = texture(u_noise, vec2(ang * 3.4 + .31, 410. / d - u_time * .05)).r;
    float dash = smoothstep(.4, .62, v1 * .5 + v2 * .5);
    float wide = mix(420., 2600., smoothstep(8., 130., d));
    if (u_sunDir.z > -.05 && u_sunDir.z < .5) {
      float az = pow(max(dot(look, normalize(u_sunDir.xy)), 0.), wide) * exp(-V.z * 7.);
      vec3 tint = u_glow * 1.2 + SUN * .8;
      float k = max(dot(reflect(-u_sunDir, vec3(0, 0, 1)), V), 0.);
      c += tint * (az * (.25 + dash * 1.5) + pow(k, 30.) * .07) * (1. - smoothstep(.22, .5, u_sunDir.z));
    }
    if (u_moonLit > .01 && u_night > .01) {
      float az = pow(max(dot(look, normalize(u_moonDir.xy)), 0.), wide) * exp(-V.z * 8.);
      c += vec3(.66, .72, .86) * az * (.12 + dash * 1.05) * sqrt(u_moonLit) * u_moonUp * u_night;
    }
  } else {
    if (u_mode == 0) c = mix(${C(x(`#f5efe2`))}, ${C(x(`#f0e6d2`))}, smoothstep(.32, .68, texture(u_noise, xy / 160.).r));
    else if (u_mode == 1) c = ${C(x(`#f8eecb`))};
    else c = mix(${C(x(`#bbe59c`))}, ${C(x(`#c7ebab`))}, smoothstep(.32, .68, texture(u_noise, xy / 20.).r));
    vec3 paper = c;
    c *= groundLight(v_P);
    c += paper * u_deep * u_night * vec3(.27, .29, .36);      // moonlit sand, on the tours out at sea
    // After dark the city lifts the ground around it with its own light.
    c += u_night * vec3(.075, .045, .022) * exp(-length(xy) / 48.);
  }
  o = vec4(srgb(haze(c, v_P)), 1.);
}`,ie=`${D}${O}
uniform vec3 u_c, u_c2, u_emit;
uniform float u_w, u_fill, u_far;
in vec3 v_P;
in float v_side;
out vec4 o;
void main() {
  float w = fwidth(v_side), s = abs(v_side);
  float a = 1. - smoothstep(u_w - w, u_w, s);
  a *= min(1., 2. * u_w / max(w, 1e-3));      // thinner than a pixel: fade, so it can't shimmer
  a *= 1. - smoothstep(u_far * .5, u_far, length(v_P - u_eye));
  if (a < .004) discard;
  vec3 c = mix(u_c, u_c2, smoothstep(u_fill - w, u_fill, s));
  float close = smoothstep(4., 42., length(v_P - u_eye));
  vec3 lamp = u_emit * u_night * mix(.42, 1., close) * (.72 + .28 * smoothstep(.1, .8, s));
  o = vec4(srgb(haze(c * groundLight(v_P) + lamp, v_P)), a);
}`,ae=`${D}
uniform float u_zmax;
uniform vec4 u_b;
in vec2 a_xy;
in float a_z;
in vec3 a_a;
in float a_k;
out vec3 v_P;
out vec3 v_a;
flat out int v_k;
float rise() {
  int k = int(a_k + .5);
  if (k == 2) return outBack((u_t - 1.1) / .9, 1.);
  if (k == 3) return outBack((u_t - 1.) / 1., .8);
  if (k > 3 || a_a.z > .999) return 1.;
  return outBack((u_t - (.55 + a_a.z * 1.255)) / .85, .7);
}
void main() {
  vec2 xy = mix(u_b.xy, u_b.zw, a_xy);
  float z = a_z * u_zmax;
  // La Mer is low-rise: two or three floors of restaurants and shops behind the sand.
  float mer = 1. - smoothstep(6., 10., length(xy - MER));
  if (mer > 0. && a_k < .5) {
    float top = a_a.x * a_a.x * 8.3, want = .09 + .17 * fract(a_a.y * 7.3);
    if (top > want) z *= mix(1., want / top, mer);
  }
  v_P = vec3(xy, z * max(rise(), .0015));
  v_a = a_a;
  v_k = int(a_k + .5);
#ifdef SHADOW
  gl_Position = u_lvp * vec4(v_P, 1.);
#else
  gl_Position = u_vp * vec4(v_P, 1.);
#endif
}`,oe=`${D}${O}
in vec3 v_P;
in vec3 v_a;
flat in int v_k;
out vec4 o;
const vec3 TINT[5] = vec3[5](${C(x(`#f1eadc`))}, ${C(x(`#ebe2d0`))}, ${C(x(`#efe6d6`))}, ${C(x(`#e6dcc9`))}, ${C(x(`#f4eee3`))});
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Lit windows. Up close they are real rows of windows, some on and some off; further away they melt into a glow that
// still varies from floor to floor and building to building, so nothing can shimmer.
vec3 windows(vec3 N, float h) {
  float along = v_P.x * N.y - v_P.y * N.x;
  vec2 g = vec2(along / .085, v_P.z / .068);
  vec2 id = floor(g), f = fract(g);
  float seed = floor(v_a.y * 97.);
  float r = hash(id + seed);
  float mask = smoothstep(.1, .2, f.x) * smoothstep(.9, .8, f.x) * smoothstep(.16, .28, f.y) * smoothstep(.84, .72, f.y);
  float px = max(fwidth(g.x), fwidth(g.y));
  float near = 1. - smoothstep(.35, 1.1, px);
  float patchy = hash(floor(vec2(along, v_P.z) / vec2(.42, .3)) + seed);
  float farGlow = .05 + .34 * patchy * patchy;
  float on = step(.6, r) * mask;
  vec3 tone = mix(${C(x(`#ffc77f`))}, ${C(x(`#fff0d6`))}, fract(r * 7.3));
  if (fract(r * 13.7) > .86) tone = ${C(x(`#bcd8ff`))};
  return tone * mix(farGlow, on * 1.25, near) * mix(.55, 1.1, smoothstep(12., 70., h));
}
void main() {
  vec3 V = normalize(u_eye - v_P);
  vec3 N = normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, V) < 0.) N = -N;
  float h = v_a.x * v_a.x * 830.;     // metres
  float wall = 1. - smoothstep(.2, .8, N.z);
  float zw = fwidth(v_P.z);
  float mer = (1. - smoothstep(6., 10., length(v_P.xy - MER))) * float(v_k == 0);
  vec3 c;
  float gloss = 0.;
  if (v_k == 0) {
    float tall = smoothstep(45., 130., h);
    c = mix(TINT[int(min(v_a.y * 5., 4.))], ${C(x(`#e3e5e2`))}, tall);
    float period = .11;
    float band = smoothstep(.2, .7, sin(v_P.z * 6.2832 / period)) * (1. - smoothstep(.2, .55, zw / period));
    c = mix(c, ${C(x(`#8d9ea8`))}, wall * band * tall * .35);
    gloss = tall * .22;
    if (mer > 0.) {
      // Pale plaster, slatted timber and a few bright fronts, with rows of glazing and a coloured awning over the ground floor.
      float id = fract(v_a.y * 7.3), id2 = fract(v_a.y * 23.7);
      bool timber = id >= .6 && id < .8;
      vec3 paint = id < .4 ? ${C(x(`#f8f3e8`))} : id < .6 ? ${C(x(`#f4e4cf`))} : timber ? ${C(x(`#c39a6e`))} : id < .9 ? ${C(x(`#c7e6e8`))} : ${C(x(`#f3c0a8`))};
      float along = v_P.x * N.y - v_P.y * N.x;
      vec2 g = vec2(along / .055, v_P.z / .042);
      float gpx = max(fwidth(g.x), fwidth(g.y)), close = 1. - smoothstep(.1, .34, gpx);
      if (timber) paint *= 1. + (smoothstep(-.3, .3, sin(along * 330.)) - .5) * .28 * (1. - smoothstep(.1, .5, fwidth(along * 52.)));
      vec2 fg = fract(g);
      float pane = smoothstep(.12, .2, fg.x) * smoothstep(.88, .8, fg.x) * smoothstep(.22, .3, fg.y) * smoothstep(.8, .72, fg.y);
      // Further off the panes melt into a soft shade across each floor, so nothing can sparkle.
      float floors = smoothstep(-.2, .5, sin(v_P.z * 149.6)) * (1. - smoothstep(.2, .7, fwidth(v_P.z * 23.8)));
      float glazed = mix(floors * .2, pane * .8, close);
      paint = mix(paint, ${C(x(`#5f7c8c`))}, glazed * wall * step(.05, v_P.z));
      float awn = smoothstep(.034, .036, v_P.z) * smoothstep(.052, .05, v_P.z) * wall;
      vec3 accent = id2 < .33 ? ${C(x(`#fa2a6f`))} : id2 < .66 ? ${C(x(`#ffd166`))} : ${C(x(`#2fb7d6`))};
      paint = mix(paint, accent, awn);
      paint = mix(paint, ${C(x(`#f6f3ec`))}, smoothstep(.6, .9, N.z));
      c = mix(c, paint, mer);
    }
  } else if (v_k == 2) { c = ${C(x(`#d8e4ec`))}; gloss = .6; }
  else if (v_k == 3) { c = ${C(x(`#eac870`))}; gloss = .5; }
  else if (v_k == 4) { c = ${C(x(`#f2f4f6`))}; gloss = .2; }
  else { c = ${C(x(`#e7ebee`))}; gloss = .2; }
  // Walls darken toward the ground by as much as the ground around them is shaded, so towers sit in their surroundings.
  // Roofs look at the open sky, and the bright ground lights every wall from below.
  float low = 1.;
  if (wall > .01 && v_P.z < .8) low = mix(clamp(aoAt(v_P.xy), .5, 1.), 1., smoothstep(0., .8, v_P.z));
  vec3 bounce = OPEN * ${C(x(`#efe6d4`))} * vec3(1.08, 1., .88) * .84;
  vec3 amb = AMB * (.5 + .5 * N.z) + bounce * (.5 - .5 * N.z) * mix(1., low, wall);
  amb *= mix(1., mix(.72, 1., smoothstep(0., .6, v_P.z)), wall);
  // The sky-light map and the darkening toward the ground would together halve the light on these little walls: they stand
  // on open, bright sand and are lit from all round.
  amb = mix(amb, AMB * (.62 + .38 * N.z) + bounce * (.5 - .5 * N.z) + OPEN * .16 * wall, mer);
  float ndl = max(dot(N, L), 0.);
  float dist = length(v_P - u_eye), seen = 1.;
  if (ndl > 0. && dist < 90. && sunOn() > 0.) seen = mix(sunSeen(v_P, N), 1., smoothstep(70., 90., dist));
  vec3 col = c * (SUN * ndl * seen + amb);
  float fres = pow(1. - max(dot(N, V), 0.), 4.);
  col = mix(col, mix(ZENITH, air(-V), .5) * 1.05, fres * gloss);
  col += SUN * pow(max(dot(reflect(-L, N), V), 0.), 40.) * gloss * .22;
  if (u_night > .01) {
    vec3 glow = vec3(0);
    if (v_k == 0) {
      glow = windows(N, h) * wall;
    } else if (v_k == 2) {
      glow = ${C(x(`#bfe9ff`))} * (.42 + .22 * sin(v_P.x * 6. + u_time * .7));
    } else if (v_k == 3) {
      glow = ${C(x(`#ffc35a`))} * .8;
    } else if (v_k == 4) {
      glow = ${C(x(`#9a8cff`))} * .55;
    } else {
      glow = ${C(x(`#ff7ab8`))} * .75;
    }
    col += glow * u_night;
  }
  o = vec4(srgb(haze(col, v_P)), 1.);
}`,se=`${D}
uniform mat4 u_lvp2;
uniform float u_zmax;
uniform vec4 u_b;
uniform vec3 u_rise;
in vec2 a_xy;
in float a_z;
in float a_s;
in float a_k;
in vec3 a_n;
out vec3 v_P;
out vec3 v_n;
out float v_s;
flat out int v_k;
void main() {
  v_P = vec3(mix(u_b.xy, u_b.zw, a_xy), a_z * u_zmax * max(outBack((u_t - u_rise.x) / u_rise.y, u_rise.z), .0015));
  v_n = a_n;
  v_s = a_s * 2000.;
  v_k = int(a_k + .5);
#if defined(SHADOW2)
  gl_Position = u_lvp2 * vec4(v_P, 1.);
#elif defined(SHADOW)
  gl_Position = u_lvp * vec4(v_P, 1.);
#else
  gl_Position = u_vp * vec4(v_P, 1.);
#endif
}`,ce=`${D}${O}
uniform sampler2DShadow u_sdw2;
uniform sampler2D u_noise;
uniform mat4 u_lvp2;
in vec3 v_P;
in vec3 v_n;
in float v_s;
flat in int v_k;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Bright rings round the tower. Each ring is drawn while it's big enough to see, then every second one, every fourth and so
// on, so the stripes hold at any distance without shimmering.
float stripes(float h, float wh) {
  float lod = log2(max(wh * 3.2, 1.)), l0 = floor(lod), p0 = pow(2., l0);
  float s0 = fract(h / p0), a0 = wh / p0, s1 = fract(h / (p0 * 2.)), a1 = a0 * .5;
  float b = mix(smoothstep(.58 - a0, .58 + a0, s0) - smoothstep(1. - a0, 1. + a0, s0),
    smoothstep(.58 - a1, .58 + a1, s1) - smoothstep(1. - a1, 1. + a1, s1), lod - l0);
  return mix(b, .42, smoothstep(3., 5., lod));
}
float seenNear(vec3 P, vec3 N) {
  vec3 c = (u_lvp2 * vec4(P + N * .012, 1.)).xyz * .5 + .5;
  if (c.x < 0. || c.y < 0. || c.x > 1. || c.y > 1.) return 1.;
  float z = c.z - .0007, r = .00042, q2 = r * .38;
  return (texture(u_sdw2, vec3(c.x + r, c.y + q2, z)) + texture(u_sdw2, vec3(c.x - r, c.y - q2, z)) +
    texture(u_sdw2, vec3(c.x - q2, c.y + r, z)) + texture(u_sdw2, vec3(c.x + q2, c.y - r, z))) * .25;
}
vec3 envAt(vec3 R) {
  if (R.z >= 0.) return mix(air(R), ZENITH, smoothstep(0., .32, R.z));
  vec3 ground = OPEN * vec3(.74, .71, .62) + u_night * vec3(.2, .13, .08);
  return mix(air(R), ground, smoothstep(0., -.16, R.z));
}
void main() {
  vec3 V = normalize(u_eye - v_P);
  vec3 N = dot(v_n, v_n) > .04 ? normalize(v_n) : normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, V) < 0.) N = -N;
  float ndl = max(dot(N, L), 0.);
  float seen = 1.;
  if (ndl > 0. && sunOn() > 0.) seen = v_k >= 7 || v_P.z < -1. ? sunSeen(v_P, N) : seenNear(v_P, N);
  float wall = 1. - smoothstep(.2, .8, N.z);
  float low = mix(clamp(aoAt(v_P.xy), .55, 1.), 1., smoothstep(0., .5, v_P.z));
  vec3 bounce = OPEN * vec3(.82, .77, .66) * .84;
  vec3 lit = SUN * ndl * seen + (AMB * (.5 + .5 * N.z) + bounce * (.5 - .5 * N.z)) * mix(1., low, wall);
  vec3 R = reflect(-V, N);
  float fresBase = pow(1. - max(dot(N, V), 0.), 4.);
  vec3 col, glow = vec3(0);
  if (v_k == 0) {
    vec2 g = vec2(v_s / 1.9, v_P.z / .0392);
    vec2 w = fwidth(g), id = floor(g), f = fract(g);
    float detail = 1. - smoothstep(.22, .85, max(w.x, w.y));
    vec3 Np = N;
    if (detail > 0.) Np = normalize(N + (vec3(hash(id), hash(id + 7.3), hash(id + 13.1)) - .5) * .035 * detail);
    vec3 Rp = reflect(-V, Np);
    float fres = mix(.28, .66, pow(1. - max(dot(Np, V), 0.), 4.));
    vec3 glass = mix(${C(x(`#9aaabb`))} * lit * .72, envAt(Rp) * vec3(.72, .78, .86), fres);
    glass += SUN * pow(max(dot(Rp, L), 0.), 260.) * 1.1 * seen;
    vec3 metal = ${C(x(`#d8e0e7`))} * lit + envAt(Rp) * .32;
    metal += SUN * pow(max(dot(Rp, L), 0.), 14.) * .28 * seen;
    // Up close a floor is a bright spandrel over darker glass. From further off the floors melt into a soft texture on smooth
    // silver, as they do on the real tower, so the lobes are what the eye reads.
    float ringsUp = mix(.16, 1., 1. - smoothstep(.05, .22, w.y));
    float band = stripes(g.y, w.y);
    float mull = (1. - smoothstep(.07, .07 + max(w.x, .02), min(f.x, 1. - f.x))) * (1. - smoothstep(.1, .28, w.x));
    float share = max(mix(.5, band * .74, ringsUp), mull * .6);
    col = mix(glass, metal, share);
    if (u_night > .01) {
      vec2 gw = vec2(v_s / 3.8, v_P.z / .04), idw = floor(gw);
      float r = hash(idw);
      vec3 tone = mix(${C(x(`#ffd9a3`))}, ${C(x(`#f6f3e8`))}, fract(r * 7.3));
      // Some lights are on, and the whole face carries a slow wash of cool light climbing upward, like its LED facade.
      glow = tone * mix(.2, step(.68, r) * (1. - share) * 1.05, detail);
      glow += ${C(x(`#7fb2ff`))} * (.17 + .17 * sin(v_P.z * 1.5 - u_time * .9));
    }
  } else if (v_k == 1) {
    // Mechanical floors: plain louvred metal, a narrow dark belt round the tower.
    float lg = v_s / .95, lw = fwidth(lg);
    float lou = (1. - smoothstep(.18, .18 + max(lw, .03), abs(fract(lg) - .5))) * (1. - smoothstep(.3, .9, lw));
    col = mix(${C(x(`#8a96a1`))}, ${C(x(`#707c87`))}, lou * .6) * lit + envAt(R) * (.06 + fresBase * .2);
    glow = ${C(x(`#34506f`))} * .25;
  } else if (v_k == 2) {
    // The spire: rings of open steelwork and fine ribs running up it, then the bare needle at the very top.
    float az = atan(v_P.y, v_P.x) * 20. / 6.2832;
    vec2 g = vec2(az, v_P.z / .05);
    vec2 w = fwidth(g), f = fract(g);
    float detail = 1. - smoothstep(.25, .9, max(w.x, w.y));
    float needle = smoothstep(7.78, 7.84, v_P.z);
    float ribLine = (1. - smoothstep(.06, .06 + max(w.x, .03), min(f.x, 1. - f.x))) * detail;
    float ring = mix(.66, stripes(g.y, w.y), mix(.1, 1., 1. - smoothstep(.06, .2, w.y))) * (1. - needle);
    float seam =(1. - needle) * max(ribLine * .55, 1. - ring);
    vec3 panel = mix(${C(x(`#d5dce2`))}, ${C(x(`#7b8893`))}, seam);
    col = panel * lit + envAt(R) * (.14 + fresBase * .4) * (1. - seam * .6);
    col += SUN * pow(max(dot(R, L), 0.), 90.) * .9 * seen * (1. - seam);
    glow = ${C(x(`#9fc4ff`))} * (.18 + .08 * sin(v_P.z * 3. - u_time)) * (1. + ring * 1.6);
    glow += vec3(1., .07, .04) * smoothstep(8.1, 8.24, v_P.z) * step(.45, fract(u_time * .55)) * 5.;
  } else if (v_k == 3) {
    col = ${C(x(`#e9e0cf`))} * lit;
    glow = ${C(x(`#ffd29a`))} * .16;
  } else if (v_k == 4) {
    col = ${C(x(`#a9d98d`))} * lit;
  } else if (v_k == 5) {
    col = mix(${C(x(`#4fc4e6`))} * lit, envAt(R), .2 + fresBase * .5);
    glow = ${C(x(`#37c6e8`))} * .5;
  } else {
    col = ${C(x(`#e4e8ea`))} * lit;
    glow = ${C(x(`#d6e8ff`))} * .4;
  }
  if (v_k < 2) {
    // The valleys between the wings see less sky, which is what separates the lobes from afar.
    // And a lobe's edges turn away towards the darker surroundings, which is what makes it look round.
    float va = mod(atan(v_P.y, v_P.x) - .96, 2.0944);
    float wing = .155 - .085 * pow(max(v_P.z, 0.) / 6., 1.2);
    float valley = smoothstep(.08, .95, min(va, 2.0944 - va) * length(v_P.xy) / wing);
    col *= mix(.38, 1., valley) * mix(.46, 1., pow(max(dot(N, V), 0.), .8));
    // A bright streak runs down each lobe, where its curve turns the sun toward the viewer, over a softer one from the open sky.
    vec2 Vh = normalize(V.xy + 1e-5), Lh = normalize(L.xy + 1e-5), Hh = normalize(Lh + Vh + 1e-5);
    float sunSide = smoothstep(0., .25, dot(N.xy, Lh));
    col += (SUN * seen * sunSide * .42 * pow(max(dot(N.xy, Hh), 0.), 36.) + OPEN * .16 * pow(max(dot(N.xy, Vh), 0.), 5.)) * valley * step(N.z, .5);
  }
  col += glow * u_night;
  o = vec4(srgb(haze(col, v_P)), 1.);
}`,le=`${D}
uniform float u_zmax;
uniform vec4 u_b;
uniform vec3 u_rise;
in vec2 a_xy;
in float a_z;
in float a_s;
in float a_k;
in vec3 a_n;
in float a_t;
out vec3 v_P;
out vec3 v_n;
out vec2 v_uv;
flat out int v_k;
void main() {
  v_P = vec3(mix(u_b.xy, u_b.zw, a_xy), a_z * u_zmax * max(outBack((u_t - u_rise.x) / u_rise.y, u_rise.z), .0015));
  v_n = a_n;
  v_uv = vec2(a_s, a_t);
  v_k = int(a_k + .5);
  gl_Position = u_vp * vec4(v_P, 1.);
}`,ue=`${D}${O}
uniform sampler2D u_noise, u_script;
in vec3 v_P;
in vec3 v_n;
in vec2 v_uv;
flat in int v_k;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 envAt(vec3 R) {
  if (R.z >= 0.) return mix(air(R), ZENITH, smoothstep(0., .32, R.z));
  vec3 ground = OPEN * vec3(.74, .71, .62) + u_night * vec3(.2, .13, .08);
  return mix(air(R), ground, smoothstep(0., -.16, R.z));
}
void main() {
  vec3 V = normalize(u_eye - v_P);
  vec3 N = normalize(v_n);
  if (dot(N, V) < 0.) N = -N;
  float ndl = max(dot(N, L), 0.);
  float seen = ndl > 0. && sunOn() > 0. ? sunSeen(v_P, N) : 1.;
  vec3 lit = SUN * ndl * seen + AMB * (.55 + .45 * N.z) + OPEN * vec3(.8, .75, .62) * .62 * (.5 - .5 * N.z);
  vec3 col, glow = vec3(0);
  if (v_k == 7) {
    // The surface comes in four patches, one for each half of the loop on each face, every one turned so its script stands
    // upright and reads the right way round from where you'd see it.
    float su = v_uv.x * 2., sv = v_uv.y * 2.;
    bool top = su < 1., nw = sv < 1.;
    float a = fract(su), b = fract(sv);
    vec2 pu = nw == top ? vec2(a, b) : vec2(1. - a, 1. - b);
    vec2 uv = (pu + vec2(top ? 0. : 1., nw ? 0. : 1.)) * .5;
    vec2 dx = dFdx(v_uv), dy = dFdy(v_uv);
    float r = textureGrad(u_script, uv, dx, dy).r;
    float px = max(length(dx * vec2(4096., 1600.)), length(dy * vec2(4096., 1600.)));
    float far = smoothstep(2.5, 9., px);
    float w = max(fwidth(r), .002);
    if (px > 40.) w = .002;
    float rim = smoothstep(0., .018, min(a, 1. - a)) * smoothstep(0., .03, min(b, 1. - b));
    float hard = smoothstep(.33 - w, .33 + w, r);
    float stroke = mix(hard, min(r * 1.5, 1.), far) * rim;
    float line = (1. - smoothstep(.0, w * 1.2 + .05, abs(r - .33))) * (1. - far) * rim;
    // Steel panels, each set a hair differently so the light breaks across them.
    vec2 m = vec2(a * 125.5, b * 54.) / vec2(3.4, 2.8);
    vec2 pid = floor(m) + vec2(top ? 0. : 200., nw ? 0. : 100.), pf = fract(m);
    vec2 pw = fwidth(m);
    float near = 1. - smoothstep(.15, .6, max(pw.x, pw.y));
    vec3 Np = N;
    if (near > 0.) Np = normalize(N + (vec3(hash(pid), hash(pid + 7.3), hash(pid + 13.1)) - .5) * .05 * near);
    vec3 Rp = reflect(-V, Np);
    float fres = pow(1. - max(dot(Np, V), 0.), 4.);
    float seam = near * (1. - smoothstep(.0, max(pw.x, .02) * 1.5, min(pf.x, 1. - pf.x)) * smoothstep(.0, max(pw.y, .02) * 1.5, min(pf.y, 1. - pf.y)));
    float tone = 1. + (hash(pid + 3.1) - .5) * .09 * near;
    // Polished steel mirrors the dark line of the buildings round the horizon, which is what makes it read as metal.
    vec3 steel = ${C(x(`#a8afb5`))} * lit * .78 * tone + envAt(Rp) * (.24 + fres * .6) * (1. - .55 * exp(-Rp.z * Rp.z * 26.));
    steel += SUN * pow(max(dot(Rp, L), 0.), 34.) * .5 * seen;
    steel *= 1. - seam * .07;
    vec3 Rw = reflect(-V, N);
    float fw = pow(1. - max(dot(N, V), 0.), 3.);
    vec3 win = ${C(x(`#101b28`))} * lit + envAt(Rw) * (.07 + fw * .22);
    win += SUN * pow(max(dot(Rw, L), 0.), 300.) * 1.2 * seen;
    col = mix(steel, win, stroke);
    col = mix(col, ${C(x(`#f2f5f6`))} * lit, line * .35);
    // Night: floodlit warm from below, with each letter of the script outlined in white.
    float wash = .05 + .13 * smoothstep(.75, .1, v_P.z) + .07 * (.5 - .5 * N.z);
    glow = ${C(x(`#c9b892`))} * wash * (1. - stroke);
    glow += ${C(x(`#fff4de`))} * (line * 3.2 + far * r * .85) * rim;
    glow += ${C(x(`#ffdca8`))} * stroke * (1. - far) * .07;
  } else if (v_k == 4) {
    float n = texture(u_noise, v_P.xy * .9).r, n2 = texture(u_noise, v_P.xy * 5.3).r;
    col = mix(${C(x(`#7fc06c`))}, ${C(x(`#a7d98a`))}, smoothstep(.3, .7, n));
    col *= .86 + .28 * n2;
    col *= lit;
    glow = ${C(x(`#5c8f54`))} * .14;
  } else {
    // The plinth: a flowing white band over a strip of glazing.
    float glass = smoothstep(.178, .172, v_P.z);
    col = mix(${C(x(`#f3f1ea`))} * lit, ${C(x(`#2b3b4c`))} * lit + envAt(reflect(-V, N)) * .3, glass);
    glow = mix(${C(x(`#f2d9b0`))} * .34, ${C(x(`#ffe8c4`))} * 1.3, glass);
  }
  col += glow * u_night;
  o = vec4(srgb(haze(col, v_P)), 1.);
}`,de=`${D}
uniform vec4 u_b;
in vec3 a_v;
in float a_c;
in vec2 a_xy;
in vec4 a_a;
out vec3 v_P;
flat out vec3 v_col;
flat out float v_lit;
const vec3 PAL[7] = vec3[7](${C(x(`#fa2a6f`))}, ${C(x(`#ffd166`))}, ${C(x(`#2fb7d6`))}, ${C(x(`#ffffff`))}, ${C(x(`#ff8a5c`))}, ${C(x(`#7ad9a8`))}, ${C(x(`#4f6bed`))});
const vec3 FIXED[8] = vec3[8](vec3(1), ${C(x(`#8b6b4a`))}, ${C(x(`#6dbd5f`))}, ${C(x(`#88cc6c`))}, ${C(x(`#f6f6f2`))}, ${C(x(`#9a7450`))}, ${C(x(`#7d8488`))}, ${C(x(`#1d2a38`))});
void main() {
  float ang = a_a.x * 6.2832, s = a_a.y * 3. * 1.5;
  vec3 p = a_v * s * .01;
  float h = a_v.z / 12.;
  vec2 xy = mix(u_b.xy, u_b.zw, a_xy);
  p.xy += sin(u_time * 1.15 + xy * 37.) * .004 * h * h;
  float cs = cos(ang), sn = sin(ang);
  v_P = vec3(xy + vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs), p.z * max(outBack((u_t - 2.2) / .7, 1.4), .0));
  int c = int(a_c + .5);
  v_col = c == 0 ? PAL[int(a_a.z * 255. + .5) % 7] : FIXED[c];
  v_lit = c == 0 ? 1. : 0.;
  gl_Position = u_vp * vec4(v_P, 1.);
}`,fe=`${D}
in vec3 v_P;
flat in vec3 v_col;
flat in float v_lit;
out vec4 o;
void main() {
  vec3 N = normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, u_eye - v_P) < 0.) N = -N;
  vec3 col = v_col * (SUN * max(dot(N, L), 0.) + AMB * (.62 + .38 * N.z) + OPEN * vec3(.28, .26, .2) * (.5 - .5 * N.z));
  col += v_col * v_lit * u_night * .28;
  o = vec4(srgb(haze(col, v_P)), 1.);
}`,pe=`${D}${ne}
uniform vec3 u_right, u_up;
uniform float u_at;
in vec2 a_q;
in vec3 a_i;
out vec3 v_P;
out vec2 v_q;
out vec2 v_n;
out float v_a;
void main() {
  float h = a_i.z * jetK(a_i);
  float r = u_at > .5 ? .05 + h * .28 : .05 + h * .13;
  float T = u_time, seed = fract(a_i.x * 17.3 + a_i.y * 7.1);
  vec2 drift = vec2(sin(T * .31 + seed * 6.) * .05 + .04, cos(T * .23 + seed * 9.) * .03) * h;
  vec3 at = vec3(a_i.xy + drift * u_at, h * u_at * .92 + r * (1. - u_at) * .5 + .01);
  v_P = at + (u_right * a_q.x + u_up * a_q.y) * r;
  v_q = a_q;
  v_n = a_q * .13 + seed * 7.;
  // It thins out as the camera comes close, so flying through it doesn't white out the picture.
  vec3 toEye = u_eye - at;
  float eyeD = length(toEye);
  float broadside = abs(dot(normalize(toEye.xy + 1e-4), JET_N));
  v_a = smoothstep(.02, .22, h) * (u_at > .5 ? .03 : .085) * smoothstep(.2, 1.5, eyeD) * mix(.5, 1., u_night);
  v_a *= mix(.3, 1., broadside) * (1. - smoothstep(.2, .8, toEye.z / max(eyeD, .001)) * .8);
  gl_Position = u_vp * vec4(v_P, 1.);
}`,me=`${D}
uniform sampler2D u_noise;
in vec3 v_P;
in vec2 v_q;
in vec2 v_n;
in float v_a;
out vec4 o;
const vec3 WARM = vec3(1., .84, .56);
void main() {
  float a = smoothstep(1., .1, length(v_q));
  a *= .55 + .9 * texture(u_noise, v_n + u_time * .025).r;
  a *= v_a;
  vec3 c = srgb(haze(mix(min(OPEN, vec3(1)) * .98, WARM * .72, u_night), v_P));
  o = vec4(c * a, a);
}`,he=`#version 300 es
precision highp float;
void main() {}`,ge=`${D}
uniform vec4 u_b;
in vec3 a_v;
in vec2 a_xy;
in vec4 a_a;
out vec3 v_P;
out vec3 v_N;
out float v_tone;
out float v_up;
void main() {
  vec2 xy = mix(u_b.xy, u_b.zw, a_xy);
  float pop = outBack((u_t - (1.5 + a_a.w * 1.105)) / .6, 1.6);
  float s = a_a.x * .2, z = a_a.y * .4;
  vec3 p = vec3(a_v.xy * s, (a_v.z + 1.) * z) * max(pop, 0.);
  p.xy += sin(u_time * 1.1 + xy * 2.3) * .006 * (a_v.z + 1.);
  v_P = vec3(xy, 0.) + p;
  v_N = normalize(a_v + vec3(0, 0, .15));
  v_tone = a_a.z;
  v_up = (a_v.z + 1.) * .5;
  gl_Position = u_vp * vec4(v_P, 1.);
}`,_e=`${D}${O}
in vec3 v_P;
in vec3 v_N;
in float v_tone;
in float v_up;
out vec4 o;
void main() {
  vec3 N = normalize(v_N);
  vec3 c = mix(${C(x(`#a2d28e`))}, ${C(x(`#bbe0a2`))}, v_tone);
  float ao = mix(.62, 1., smoothstep(0., .7, v_up));
  vec3 amb = (AMB * (.5 + .5 * N.z) + OPEN * ${C(x(`#c9dcae`))} * .85 * (.5 - .5 * N.z)) * ao;
  // One shadow lookup is plenty for something this small.
  float seen = 1.;
  if (sunOn() > 0. && length(v_P - u_eye) < 90.) {
    vec3 q = (u_lvp * vec4(v_P + L * .05, 1.)).xyz * .5 + .5;
    seen = texture(u_sdw, vec3(q.xy, q.z - .00015));
  }
  vec3 col = c * (SUN * max(dot(N, L), 0.) * seen + amb);
  o = vec4(srgb(haze(col, v_P)), 1.);
}`,ve=`${D}
uniform sampler2D u_routes;
in vec3 a_v;
in vec4 a_i;      // route, offset, signed speed, lane
in vec2 a_i2;     // length, colour
out vec3 v_P;
out float v_long;
out float v_tall;
flat out float v_c;
flat out float v_face;
void main() {
  float len = a_i2.x - 2.;
  float q = mod(a_i.y + u_time * a_i.z, len);
  if (q < 0.) q += len;
  int i = int(q);
  float f = q - float(i);
  int r = int(a_i.x);
  vec2 A = texelFetch(u_routes, ivec2(i, r), 0).xy, B = texelFetch(u_routes, ivec2(i + 1, r), 0).xy;
  vec2 d = normalize(B - A + 1e-5);
  vec2 n = vec2(-d.y, d.x);
  float end = smoothstep(0., 5., q) * smoothstep(0., 5., len - q);
  float sc = end * smoothstep(3.2, 3.8, u_t) * (1. + u_night * .35);
  vec2 xy = mix(A, B, f) + n * a_i.w;
  v_P = vec3(xy + d * a_v.x * .17 * sc + n * a_v.y * .075 * sc, (a_v.z * .055 + .002) * sc);
  v_c = a_i2.y;
  v_long = a_v.x;
  v_tall = a_v.z;
  v_face = dot(d * sign(a_i.z), u_eye.xy - xy);     // coming toward us we see headlights, going away tail lights
  gl_Position = u_vp * vec4(v_P, 1.);
}`,ye=`${D}
in vec3 v_P;
in float v_long;
in float v_tall;
flat in float v_c;
flat in float v_face;
out vec4 o;
const vec3 CARS[6] = vec3[6](vec3(.94), vec3(.88), ${C(x(`#e8505b`))}, ${C(x(`#34404a`))}, ${C(x(`#f4c95d`))}, ${C(x(`#5f7486`))});
void main() {
  vec3 N = normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, u_eye - v_P) < 0.) N = -N;
  vec3 col = CARS[int(v_c) % 6] * (SUN * max(dot(N, L), 0.) + AMB * (.6 + .4 * N.z));
  vec3 lamp = v_face > 0. ? vec3(1., .93, .74) * 1.5 : vec3(1., .13, .08) * 1.15;
  // From afar a car at night is just its lights. Close up it's a dark body with a pair of lamps at the end facing us.
  float near = smoothstep(9., 2.5, length(v_P - u_eye));
  float ends = smoothstep(.72, .86, abs(v_long)) * smoothstep(.2, .45, v_tall);
  o = vec4(srgb(haze(mix(col, mix(lamp, col + lamp * ends, near), u_night), v_P)), 1.);
}`,be=`${D}${ne}
in vec2 a_v;      // across -1 to 1, up the jet 0 to 1
in vec3 a_i;
out vec3 v_P;
out vec2 v_q;
out float v_seed;
out float v_h;
out float v_near;
out float v_glow;
// Each jet is a ribbon turned to face the camera: it climbs, slows, leans into the show's sway and frays into mist at the top.
void main() {
  float h = a_i.z * jetK(a_i), t = a_v.y;
  float seed = fract(a_i.x * 17.3 + a_i.y * 7.1);
  float sway = sin(u_time * 1.05 + a_i.x * 2.6 + seed) * mix(.05, .3, u_show) + (seed - .5) * .1;
  vec2 lean = vec2(.95, .3) * sway * h * t * t;
  vec3 p = vec3(a_i.xy + lean, h * t * (1.22 - .22 * t) + .008);
  vec3 axis = normalize(vec3(vec2(.95, .3) * sway * 2. * t, 1.));
  vec3 across = cross(axis, normalize(u_eye - p));
  across /= max(length(across), .05);
  float dist = length(p - u_eye);
  // Up close the ribbons slim down, so they stay separate streaks of water rather than sheets across the whole picture.
  float w = (.004 + h * (.007 + .008 * t + .05 * t * t * t)) * mix(.4, 1., smoothstep(.35, 2.2, dist));
  v_P = p + across * a_v.x * w;
  v_q = a_v;
  v_seed = seed;
  v_h = h;
  // Each ribbon thins where it would pile up on its neighbours: looking along the line of jets or down on it, and close to the
  // camera. So the wall never adds up to a solid mass, and the sky and city keep showing through.
  vec3 view = (u_eye - p) / max(dist, .001);
  float broadside = abs(dot(normalize(view.xy + 1e-4), JET_N));
  v_near = smoothstep(.1, 1.15, dist) * mix(.3, 1., broadside) * (1. - smoothstep(.2, .8, view.z) * .78);
  v_glow = smoothstep(2., 5., dist);
  gl_Position = u_vp * vec4(v_P, 1.);
}`,xe=`${D}
uniform sampler2D u_noise;
in vec3 v_P;
in vec2 v_q;
in float v_seed;
in float v_h;
in float v_near;
in float v_glow;
out vec4 o;
const vec3 WARM = vec3(1., .85, .58);
void main() {
  float s = v_q.x, t = v_q.y, T = u_time;
  float n1 = texture(u_noise, vec2(s * .05 + v_seed, t * .1 - T * .11)).r;
  float n2 = texture(u_noise, vec2(s * .13 + v_seed * 3., t * .3 * (.4 + v_h) - T * .26)).r;
  float streak = smoothstep(.34, .66, n1 * .55 + n2 * .6);
  // Fine droplets flying off the upper part of each jet.
  float drops = smoothstep(.6, .68, texture(u_noise, vec2(s * .4 + v_seed * 9., t * 1.7 * (.4 + v_h) - T * .42)).r) * smoothstep(.25, .7, t);
  float a = (1. - s * s) * smoothstep(0., .02, t) * smoothstep(1., .55, t);
  a *= mix(.7, streak * .62 + drops * .4, smoothstep(.04, .5, t));
  a *= smoothstep(.0, .22, v_h) * v_near;
  // Lit from the water by floodlights: brightest at the foot, fading as it rises. By day, white water with a grey-blue shade.
  // Mostly ordinary "over" blending, not adding: however many ribbons stack up, the wall stays this colour instead of going
  // white. Only from further off does it add a little, which gives the whole show its glow.
  vec3 night = WARM * mix(.95, .52, smoothstep(0., .75, t)) + WARM * drops * .2;
  vec3 day = min(OPEN, vec3(1)) * mix(vec3(.74, .8, .86), vec3(1.), streak * .9 + .1);
  vec3 c = srgb(haze(mix(day, night, u_night), v_P));
  o = vec4(c * a, a * (1. - u_night * v_glow * .4));
}`,Se=`${D}
uniform mat4 u_ivp;
out vec3 v_d;
void main() {
  vec2 p = vec2((gl_VertexID & 1) * 4 - 1, (gl_VertexID & 2) * 2 - 1);
  vec4 w = u_ivp * vec4(p, 1., 1.);
  v_d = w.xyz / w.w - u_eye;
  gl_Position = vec4(p, 1., 1.);
}`,Ce=`${D}
uniform sampler2D u_noise, u_moonTex;
uniform vec3 u_moonDir;
uniform vec2 u_moonLimb, u_moonPos, u_sunPos;
uniform float u_moonLit, u_moonUp, u_moonPhase, u_moonRot, u_moonR, u_sunR, u_stars;
in vec3 v_d;
out vec4 o;
float h31(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float starField(vec3 d, float scale, float keep) {
  vec3 q = d * scale, i = floor(q), f = fract(q) - .5;
  float r = h31(i);
  if (r < keep) return 0.;
  vec3 jit = vec3(h31(i + 1.), h31(i + 2.), h31(i + 3.)) - .5;
  float b = (r - keep) / (1. - keep);
  float tw = .72 + .28 * sin(u_time * (1.4 + r * 3.5) + r * 60.);
  return smoothstep(.13 + .1 * b, 0., length(f - jit * .55)) * (.35 + b * .95) * tw;
}
void main() {
  vec3 d = normalize(v_d);
  float h = max(d.z, 0.);
  vec3 c = mix(air(d), ZENITH, smoothstep(0., .32, h));
  // Thin high cloud, catching the colour of a low sun.
  vec2 cu = d.xy / (d.z + .16) * vec2(.11, .26) + vec2(u_time * .0016, 0.);
  float cloud = smoothstep(.5, .78, texture(u_noise, cu).r) * smoothstep(.015, .1, h) * smoothstep(.42, .16, h);
  vec3 cc = mix(mix(ZENITH, SKY, .6) * 1.06, SKY + u_glow * 1.5, smoothstep(0., .9, dot(u_glow, vec3(1.))));
  float amount = mix(.34, .12, u_night) + dot(u_glow, vec3(.34));
  c = mix(c, cc, cloud * amount);
  if (u_stars > .01) {
    float s = u_stars * smoothstep(.004, .055, h) * (1. - cloud * .7);
    vec3 axis = normalize(vec3(.42, .52, .74));
    float band = exp(-pow(dot(d, axis) * 3.6, 2.));
    c += vec3(.15, .15, .23) * band * texture(u_noise, d.xy * 1.7 + .3).r * s * .7;
    c += vec3(.92, .95, 1.) * (starField(d, 130., .94) * 1.9 + starField(d, 260., .955) * 1.2 + starField(d, 520., .97) * .7) * s;
  }
  // The sun, a little larger than life so it reads on a web page. It's measured in screen pixels, so a wide lens can't squash it.
  float sd = dot(d, u_sunDir);
  if (u_sunDir.z > -.09 && u_sunR > 0.) {
    vec3 tint = mix(vec3(1., .52, .2), vec3(1., .94, .74), smoothstep(.0, .16, u_sunDir.z));
    c += tint * (pow(max(sd, 0.), 900.) * .3 + pow(max(sd, 0.), 70.) * .17) * smoothstep(-.09, 0., u_sunDir.z);
    float rs = length(gl_FragCoord.xy - u_sunPos) / u_sunR, a = fwidth(rs) * 1.2;
    float disc = (1. - smoothstep(1. - a, 1. + a, rs)) * smoothstep(-.09, -.012, u_sunDir.z);
    c = mix(c, tint * 1.5 + vec3(.1), disc * smoothstep(-.015, .004, d.z));
  }
  // The real moon: NASA's map of the near side, turned the way it hangs in Dubai's sky tonight, lit to tonight's true phase.
  float vis = u_moonUp * smoothstep(.05, .5, u_night);     // a pale day moon just reads as a smudge here
  if (vis > .001 && u_moonR > 0.) {
    vec2 p = (gl_FragCoord.xy - u_moonPos) / u_moonR;
    float r = length(p);
    float bright = sqrt(max(u_moonLit, 0.));
    // A soft halo in the air around it, stronger the fuller it is.
    if (r < 9. && r > .9) {
      float e = max(r - 1., 0.);
      c += vec3(.6, .68, .92) * (exp(-e * 2.6) * .13 + exp(-e * .62) * .05) * bright * vis;
    }
    if (r < 1.03) {
      float z = sqrt(max(1. - r * r, 0.));
      vec3 sunL = vec3(u_moonLimb * sqrt(max(1. - u_moonPhase * u_moonPhase, 0.)), u_moonPhase);
      float cosI = dot(vec3(p, z), sunL);
      float lit = max(cosI, 0.);
      // Moon dust doesn't dim toward the edge the way a matte ball does: its full face looks almost flat, as the real one does.
      float dust = 2. * lit / (lit + z + .001);
      float cs = cos(u_moonRot), sn = sin(u_moonRot);
      vec2 t = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);
      vec3 map = texture(u_moonTex, vec2(t.x, -t.y) * .5 + .5).rgb;
      vec3 day = pow(map, vec3(.66)) * vec3(1., .985, .945) * (.16 + 1.08 * dust);
      float side = smoothstep(-.015, .07, cosI);
      vec3 night_ = map * vec3(.55, .65, .95) * .028;      // earthshine: the dark side barely shows against the sky
      float a = fwidth(r) * 1.3;
      float keep = (1. - smoothstep(1. - a, 1. + a, r)) * vis * smoothstep(-.015, .004, d.z);
      c = mix(c, mix(night_ + c * .8, day, side), keep);
    }
  }
  o = vec4(srgb(c), 1.);
}`,we={uint8:Uint8Array,uint16:Uint16Array,uint32:Uint32Array,float32:Float32Array};async function Te(e){let t=await fetch(b+e),n=await new Response(t.body.pipeThrough(new DecompressionStream(`gzip`))).arrayBuffer(),r=new DataView(n).getUint32(0,!0);return{head:JSON.parse(new TextDecoder().decode(new Uint8Array(n,4,r))),base:4+r+(8-(4+r)%8)%8,buf:n}}var A=(e,t)=>{let n=e.head.sections[t];return new we[n.type](e.buf,e.base+n.offset,n.count)};function Ee(e){let t=new Uint32Array(e.length),n=0;for(let r=0;r<e.length;r++){let i=e[r];n+=i>>>1^-(i&1),t[r]=n}return t}function De(e,t,n,r,i){let a=e.length/3,o=new Uint16Array(a),s=new Uint32Array(324);for(let n=0;n<a;n++){let r=e[n*3],i=(t[r*2]*18>>>16)+18*(t[r*2+1]*18>>>16);o[n]=i,s[i]++}let c=new Uint32Array(324);for(let e=1,t=0;e<324;e++)t+=s[e-1],c[e]=t;let l=c.slice(),u=new Uint32Array(e.length),d=new Float64Array(1620);for(let e=0;e<324;e++)d[e*5]=1e9,d[e*5+1]=1e9,d[e*5+2]=-1e9,d[e*5+3]=-1e9;let f=(r[2]-r[0])/65535,p=(r[3]-r[1])/65535,m=i/65535;for(let i=0;i<a;i++){let a=o[i],s=l[a]++*3;for(let o=0;o<3;o++){let c=e[i*3+o];u[s+o]=c;let l=r[0]+t[c*2]*f,h=r[1]+t[c*2+1]*p;l<d[a*5]&&(d[a*5]=l),h<d[a*5+1]&&(d[a*5+1]=h),l>d[a*5+2]&&(d[a*5+2]=l),h>d[a*5+3]&&(d[a*5+3]=h),n&&n[c]*m>d[a*5+4]&&(d[a*5+4]=n[c]*m)}}let h=[];for(let e=0;e<324;e++){if(!s[e])continue;let[t,n,r,i,a]=d.subarray(e*5,e*5+5);h.push({start:c[e]*3,count:s[e]*3,x0:t,y0:n,x1:r,y1:i,z1:a*1.2+.05,cx:(t+r)/2,cy:(n+i)/2,d:0})}return{out:u,chunks:h}}function Oe(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[r*4+i]=e[i]*t[r*4]+e[i+4]*t[r*4+1]+e[i+8]*t[r*4+2]+e[i+12]*t[r*4+3];return n}function ke(e){let[t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g]=e,_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=1/(_*O-v*D+y*E+b*T-x*w+S*C);return new Float32Array([(o*O-s*D+c*E)*k,(r*D-n*O-i*E)*k,(m*S-h*x+g*b)*k,(d*x-u*S-f*b)*k,(s*T-a*O-c*w)*k,(t*O-r*T+i*w)*k,(h*y-p*S-g*v)*k,(l*S-d*y+f*v)*k,(a*D-o*T+c*C)*k,(n*T-t*D-i*C)*k,(p*x-m*y+g*_)*k,(u*y-l*x-f*_)*k,(o*w-a*E-s*C)*k,(t*E-n*w+r*C)*k,(m*v-p*b-h*_)*k,(l*b-u*v+d*_)*k])}var Ae={tx:0,ty:0,tz:2.7,dist:29,az:138,el:15.5},je={tz:4.18,dist:22.2,el:7.3},Me={tx:.6,ty:.4,tz:0,dist:62,az:Ae.az-62,el:89.6},Ne=118/30,Pe=4.5;function Fe(e,t,n,r,i,a){let o=e.keys,s=e=>e===0?[0,n,r,i,a,0,0,0]:o[e],c=0;for(;c<o.length-2&&t>o[c+1][0];)c++;let l=s(Math.max(c-1,0)),u=s(c),d=s(c+1),f=s(Math.min(c+2,o.length-1)),p=Math.max(0,Math.min(1,(t-u[0])/(d[0]-u[0]))),m=e=>{let t=l[e]??0,n=u[e]??0,r=d[e]??0,i=f[e]??0,a=(r-t)/2,o=(i-n)/2,s=p*p,c=s*p;return(2*c-3*s+1)*n+(c-2*s+p)*a+(-2*c+3*s)*r+(c-s)*o};return{az:m(1),r:m(2),z:m(3),lz:m(4),side:m(5),free:Math.max(0,Math.min(1,m(6))),yaw:m(7)}}var Ie=(e,t)=>[(t-55.27436)*Math.cos(E(25.19716))*111320/100,(e-25.19716)*110574/100],Le={burj_khalifa:[0,0,8.45],fountain:[ee[0]+1.35,ee[1]+.3,1],future:[...Ie(25.21925,55.28173),.95],la_mer:[...Ie(25.2318,55.2508),.1],world:[...Ie(25.2245,55.174),.05]},Re=null;function ze(){return Re??=M()}function Be(){Re=null}function j(){try{return!!document.createElement(`canvas`).getContext(`webgl2`)&&`DecompressionStream`in window}catch{return!1}}async function M(){let e=(navigator.hardwareConcurrency||8)>=6&&(navigator.deviceMemory??8)>=6,[t,n,r,i,a,o,s]=await Promise.all([Te(`city.dat`),Te(`burj.dat`),Te(`extras.dat`),fetch(b+`coast.webp`).then(e=>e.blob()).then(e=>createImageBitmap(e,{premultiplyAlpha:`none`,colorSpaceConversion:`none`})),fetch(b+`script.webp`).then(e=>e.blob()).then(e=>createImageBitmap(e,{premultiplyAlpha:`none`,colorSpaceConversion:`none`})),fetch(b+`moon.webp`).then(e=>e.blob()).then(e=>createImageBitmap(e,{premultiplyAlpha:`none`,colorSpaceConversion:`none`})),fetch(b+`ao.webp`).then(e=>e.blob()).then(t=>createImageBitmap(t,{premultiplyAlpha:`none`,colorSpaceConversion:`none`,...e?{}:{resizeWidth:4096,resizeHeight:4096,resizeQuality:`high`}}))]),c=document.createElement(`canvas`);c.className=`dm-gl`;let l=c.getContext(`webgl2`,{antialias:!0,alpha:!1,powerPreference:`high-performance`,preserveDrawingBuffer:!1});l.getExtension(`EXT_color_buffer_float`);let u=l.getExtension(`EXT_texture_filter_anisotropic`),d=(e,t)=>{let n=l.createShader(e);if(l.shaderSource(n,t),l.compileShader(n),!l.getShaderParameter(n,l.COMPILE_STATUS))throw Error(`shader: ${l.getShaderInfoLog(n)}`);return n},f=(e,t,n=``)=>{let r=l.createProgram();if(l.attachShader(r,d(l.VERTEX_SHADER,n?e.replace(`precision highp float;`,`#define ${n}\nprecision highp float;`):e)),l.attachShader(r,d(l.FRAGMENT_SHADER,t)),l.linkProgram(r),!l.getProgramParameter(r,l.LINK_STATUS))throw Error(`link: ${l.getProgramInfoLog(r)}`);let i={},a=l.getProgramParameter(r,l.ACTIVE_UNIFORMS);for(let e=0;e<a;e++){let t=l.getActiveUniform(r,e).name;i[t]=l.getUniformLocation(r,t)}return{p:r,u:i,a:e=>l.getAttribLocation(r,e)}},p=()=>new Promise(e=>setTimeout(e)),m=f(k,re);await p();let h=f(k,ie);await p();let g=f(ae,oe);await p();let _=f(ae,he,`SHADOW`);await p();let y=f(ge,_e);await p();let C=f(ve,ye);await p();let D=f(be,xe),O=f(se,ce);await p();let ne=f(se,he,`SHADOW`),we=f(se,he,`SHADOW2`),Le=f(de,fe),Re=f(le,ue);await p();let ze=f(pe,me);await p();let Be=f(Se,Ce);await p();let j={flat:m,road:h,bld:g,sdw:_,tree:y,car:C,jet:D,sky:Be,burj:O,burjS1:ne,burjS2:we,prop:Le,spray:ze,mus:Re},M=(e,t=l.ARRAY_BUFFER)=>{let n=l.createBuffer();return l.bindBuffer(t,n),l.bufferData(t,e,l.STATIC_DRAW),n},P=t.head.bounds,F=new Float32Array([P[0],P[1],P[2],P[3]]),I=(e,n=!1)=>{let r=Ee(A(t,e+`_i`)),i=null;n&&({out:r,chunks:i}=De(r,A(t,e+`_p`),null,P,0));let a=l.createVertexArray();l.bindVertexArray(a),M(A(t,e+`_p`));for(let e of[j.flat,j.road]){let t=e.a(`a_p`);l.enableVertexAttribArray(t),l.vertexAttribPointer(t,2,l.UNSIGNED_SHORT,!0,0,0)}return M(r,l.ELEMENT_ARRAY_BUFFER),l.bindVertexArray(null),{vao:a,count:r.length,chunks:i}},L={land:I(`land`),sand:I(`sand`),green:I(`green`),water:I(`water`),road:I(`road`,!0),big:I(`big`),rail:I(`rail`)};await p();let Ue=Ie(25.06,55.1)[0],R=Ie(25.06,55.1)[1],z=Ie(25.3,55.36)[0],B=Ie(25.3,55.36)[1],V=e=>{let t=l.createVertexArray();l.bindVertexArray(t);let n=[];for(let[t,r,i,a]of e)n.push(t,r,i,r,i,a,t,r,i,a,t,a);M(new Float32Array(n));for(let e of[j.flat,j.road]){let t=e.a(`a_p`);l.enableVertexAttribArray(t),l.vertexAttribPointer(t,2,l.FLOAT,!1,0,0)}return l.bindVertexArray(null),{vao:t,count:n.length/2,chunks:null}},We=V([[-6e3,-6e3,6e3,6e3]]),Ge=V([[z,R-3e3,z+3e3,B+40],[Ue-3e3,R-3e3,z,R]]),Ke=l.createVertexArray();l.bindVertexArray(Ke);for(let e of[j.bld,j.sdw]){l.bindAttribLocation(e.p,0,`a_xy`),l.bindAttribLocation(e.p,1,`a_z`),l.bindAttribLocation(e.p,2,`a_a`),l.bindAttribLocation(e.p,3,`a_k`),l.linkProgram(e.p);let t=l.getProgramParameter(e.p,l.ACTIVE_UNIFORMS);for(let n=0;n<t;n++){let t=l.getActiveUniform(e.p,n).name;e.u[t]=l.getUniformLocation(e.p,t)}}M(A(t,`bld_xy`)),l.enableVertexAttribArray(0),l.vertexAttribPointer(0,2,l.UNSIGNED_SHORT,!0,0,0),M(A(t,`bld_z`)),l.enableVertexAttribArray(1),l.vertexAttribPointer(1,1,l.UNSIGNED_SHORT,!0,0,0),M(A(t,`bld_a`)),l.enableVertexAttribArray(2),l.vertexAttribPointer(2,3,l.UNSIGNED_BYTE,!0,0,0);let{out:qe,chunks:Je}=De(Ee(A(t,`bld_i`)),A(t,`bld_xy`),A(t,`bld_z`),P,t.head.zmax);M(qe,l.ELEMENT_ARRAY_BUFFER),await p(),l.disableVertexAttribArray(3);for(let e of[j.burj,j.burjS1,j.burjS2,j.mus]){l.bindAttribLocation(e.p,5,`a_t`),l.bindAttribLocation(e.p,0,`a_xy`),l.bindAttribLocation(e.p,1,`a_z`),l.bindAttribLocation(e.p,2,`a_s`),l.bindAttribLocation(e.p,3,`a_k`),l.bindAttribLocation(e.p,4,`a_n`),l.linkProgram(e.p);let t=l.getProgramParameter(e.p,l.ACTIVE_UNIFORMS);for(let n=0;n<t;n++){let t=l.getActiveUniform(e.p,n).name;e.u[t]=l.getUniformLocation(e.p,t)}}let Ye=l.createVertexArray();l.bindVertexArray(Ye),M(A(n,`xy`)),l.enableVertexAttribArray(0),l.vertexAttribPointer(0,2,l.UNSIGNED_SHORT,!0,0,0),M(A(n,`z`)),l.enableVertexAttribArray(1),l.vertexAttribPointer(1,1,l.UNSIGNED_SHORT,!0,0,0),M(A(n,`s`)),l.enableVertexAttribArray(2),l.vertexAttribPointer(2,1,l.UNSIGNED_SHORT,!0,0,0),M(A(n,`k`)),l.enableVertexAttribArray(3),l.vertexAttribPointer(3,1,l.UNSIGNED_BYTE,!1,0,0);let H=n.head.sections.n;M(new Int8Array(n.buf,n.base+H.offset,H.count)),l.enableVertexAttribArray(4),l.vertexAttribPointer(4,3,l.BYTE,!0,0,0);let Xe=Ee(A(n,`i`));M(Xe,l.ELEMENT_ARRAY_BUFFER);let U=n.head.bounds,W=S(25.21925,55.28173),G=r.head.bounds,Ze=l.createVertexArray();l.bindVertexArray(Ze),M(A(r,`mus_xy`)),l.enableVertexAttribArray(0),l.vertexAttribPointer(0,2,l.UNSIGNED_SHORT,!0,0,0),M(A(r,`mus_z`)),l.enableVertexAttribArray(1),l.vertexAttribPointer(1,1,l.UNSIGNED_SHORT,!0,0,0),M(A(r,`mus_s`)),l.enableVertexAttribArray(2),l.vertexAttribPointer(2,1,l.UNSIGNED_SHORT,!0,0,0),M(A(r,`mus_k`)),l.enableVertexAttribArray(3),l.vertexAttribPointer(3,1,l.UNSIGNED_BYTE,!1,0,0);let Qe=r.head.sections.mus_n;M(new Int8Array(r.buf,r.base+Qe.offset,Qe.count)),l.enableVertexAttribArray(4),l.vertexAttribPointer(4,3,l.BYTE,!0,0,0),M(A(r,`mus_t`)),l.enableVertexAttribArray(5),l.vertexAttribPointer(5,1,l.UNSIGNED_SHORT,!0,0,0);let K=Ee(A(r,`mus_i`));M(K,l.ELEMENT_ARRAY_BUFFER);let $e=e=>{l.vertexAttrib3f(4,0,0,0),l.uniform4f(e.u.u_b,U[0],U[1],U[2],U[3]),l.uniform3f(e.u.u_rise,.45,3,.32),l.bindVertexArray(Ye),l.drawElements(l.TRIANGLES,Xe.length,l.UNSIGNED_INT,0)},et=e=>{e.u.u_script&&l.uniform1i(e.u.u_script,7),l.uniform4f(e.u.u_b,W[0]+G[0],W[1]+G[1],W[0]+G[2],W[1]+G[3]),l.uniform3f(e.u.u_rise,1.1,.9,1),l.bindVertexArray(Ze),l.drawElements(l.TRIANGLES,K.length,l.UNSIGNED_INT,0)},tt=[`palm`,`umbrella`,`hut`,`boat`,`rock`].map(e=>{let t=l.createVertexArray();l.bindVertexArray(t),M(A(r,e+`_v`));{let e=j.prop.a(`a_v`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,3,l.FLOAT,!1,0,0)}M(A(r,e+`_c`));{let e=j.prop.a(`a_c`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,1,l.UNSIGNED_BYTE,!1,0,0)}let n=A(r,e+`_xy`);M(n);{let e=j.prop.a(`a_xy`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,2,l.UNSIGNED_SHORT,!0,0,0),l.vertexAttribDivisor(e,1)}M(A(r,e+`_a`));{let e=j.prop.a(`a_a`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,4,l.UNSIGNED_BYTE,!0,0,0),l.vertexAttribDivisor(e,1)}let i=A(r,e+`_i`);return M(i,l.ELEMENT_ARRAY_BUFFER),{vao:t,count:i.length,n:n.length/2}});await p();let nt=l.createVertexArray();l.bindVertexArray(nt),M(A(t,`mark_xy`)),l.enableVertexAttribArray(0),l.vertexAttribPointer(0,2,l.UNSIGNED_SHORT,!0,0,0),M(A(t,`mark_z`)),l.enableVertexAttribArray(1),l.vertexAttribPointer(1,1,l.UNSIGNED_SHORT,!0,0,0),M(A(t,`mark_k`)),l.enableVertexAttribArray(3),l.vertexAttribPointer(3,1,l.UNSIGNED_BYTE,!1,0,0),l.disableVertexAttribArray(2);let rt=Ee(A(t,`mark_i`));M(rt,l.ELEMENT_ARRAY_BUFFER);let it=1.618,at=[[-1,it,0],[1,it,0],[-1,-1.618,0],[1,-1.618,0],[0,-1,it],[0,1,it],[0,-1,-1.618],[0,1,-1.618],[it,0,-1],[it,0,1],[-1.618,0,-1],[-1.618,0,1]].map(e=>{let t=Math.hypot(e[0],e[1],e[2]);return e.map(e=>e/t)}),ot=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],st=at,ct=ot,lt=A(t,`tree_xy`).length/2,ut=l.createVertexArray();l.bindVertexArray(ut),M(new Float32Array(st.flat()));{let e=j.tree.a(`a_v`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,3,l.FLOAT,!1,0,0)}M(A(t,`tree_xy`));{let e=j.tree.a(`a_xy`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,2,l.UNSIGNED_SHORT,!0,0,0),l.vertexAttribDivisor(e,1)}M(A(t,`tree_a`));{let e=j.tree.a(`a_a`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,4,l.UNSIGNED_BYTE,!0,0,0),l.vertexAttribDivisor(e,1)}M(new Uint16Array(ct),l.ELEMENT_ARRAY_BUFFER);let dt=(()=>{let e=[],[t,n]=ee,r=Math.cos(te),i=Math.sin(te),a=(a,o,s)=>e.push(t+r*a-i*o,n+i*a+r*o,s),o=1.37;for(let e=0;e<=120;e++){let t=(e/120-.5)*2*o,n=.2*(1-(t/o)**2);a(t,n,.58+.22*Math.abs(Math.sin(t*2.15+.7))),e%2==0&&(a(t+.02,n-.17,.42),a(t-.02,n+.17,.42))}for(let e of[-1,-.5,0,.5,1]){let t=e*1.14,n=.2*(1-(t/o)**2)-.02;for(let e=0;e<16;e++){let r=e/16*Math.PI*2;a(t+Math.cos(r)*.15,n+Math.sin(r)*.15,.26+e%2*.1)}}return new Float32Array(e)})(),ft=dt.length/3,pt=l.createVertexArray();l.bindVertexArray(pt);let mt=[];for(let e=0;e<12;e++){let t=e/12,n=(e+1)/12;mt.push(-1,t,1,t,1,n,-1,t,1,n,-1,n)}M(new Float32Array(mt));{let e=j.jet.a(`a_v`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,2,l.FLOAT,!1,0,0)}let ht=M(dt);{let e=j.jet.a(`a_i`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,3,l.FLOAT,!1,0,0),l.vertexAttribDivisor(e,1)}let gt=l.createVertexArray();l.bindVertexArray(gt),M(new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]));{let e=j.spray.a(`a_q`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,2,l.FLOAT,!1,0,0)}l.bindBuffer(l.ARRAY_BUFFER,ht);{let e=j.spray.a(`a_i`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,3,l.FLOAT,!1,0,0),l.vertexAttribDivisor(e,1)}let _t=t.head.sections.routes,vt=l.createTexture();l.activeTexture(l.TEXTURE2),l.bindTexture(l.TEXTURE_2D,vt),l.pixelStorei(l.UNPACK_ALIGNMENT,1),l.texImage2D(l.TEXTURE_2D,0,l.RG32F,_t.width,_t.height,0,l.RG,l.FLOAT,A(t,`routes`)),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.NEAREST),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.NEAREST);let yt=A(t,`route_len`),bt=A(t,`route_flag`),xt=[],St=11,Ct=()=>(St=St*16807%2147483647)/2147483647;for(let e=0;e<yt.length;e++){let t=bt[e]&2?.34:bt[e]&4?.28:.12,n=Math.round(yt[e]*t),r=bt[e]&1;for(let t=0;t<n;t++){let t=r||Ct()<.5?1:-1,n=(1.1+Ct()*.9)*t,i=(r?(Ct()-.5)*.16:.07+Ct()*.05)*(t>0?1:-1);xt.push(e,Ct()*yt[e],n,i,yt[e],Math.floor(Ct()*6))}}let wt=xt.length/6,Tt=[[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],[-.5,-.5,1],[.5,-.5,1],[.5,.5,1],[-.5,.5,1]],Et=[0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7],Dt=l.createVertexArray();l.bindVertexArray(Dt),M(new Float32Array(Tt.flat()));{let e=j.car.a(`a_v`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,3,l.FLOAT,!1,0,0)}M(new Float32Array(xt));{let e=j.car.a(`a_i`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,4,l.FLOAT,!1,24,0),l.vertexAttribDivisor(e,1)}{let e=j.car.a(`a_i2`);l.enableVertexAttribArray(e),l.vertexAttribPointer(e,2,l.FLOAT,!1,24,16),l.vertexAttribDivisor(e,1)}M(new Uint16Array(Et),l.ELEMENT_ARRAY_BUFFER),l.bindVertexArray(null);let Ot=new Uint8Array(262144);{let e=e=>{let t=new Float32Array(e*e);for(let e=0;e<t.length;e++)t[e]=Ct();return t},t=(e,t,n,r)=>{let i=Math.floor(n),a=Math.floor(r),o=n-i,s=r-a;o=o*o*(3-2*o),s=s*s*(3-2*s);let c=e[a%t*t+i%t],l=e[a%t*t+(i+1)%t],u=e[(a+1)%t*t+i%t],d=e[(a+1)%t*t+(i+1)%t];return(c+(l-c)*o)*(1-s)+(u+(d-u)*o)*s},n=e(8),r=e(16),i=e(32),a=e(8),o=e(16),s=e(32),c=(e,n,r,i,a)=>.55*t(e,8,i*8,a*8)+.3*t(n,16,i*16,a*16)+.15*t(r,32,i*32,a*32),l=1/256;for(let e=0;e<256;e++)for(let t=0;t<256;t++){let u=t/256,d=e/256,f=(e*256+t)*4,p=c(a,o,s,u,d);Ot[f]=c(n,r,i,u,d)*255,Ot[f+1]=Math.max(0,Math.min(255,127.5+(p-c(a,o,s,(u+l)%1,d))*2600)),Ot[f+2]=Math.max(0,Math.min(255,127.5+(p-c(a,o,s,u,(d+l)%1))*2600)),Ot[f+3]=255}}l.activeTexture(l.TEXTURE3),l.bindTexture(l.TEXTURE_2D,l.createTexture()),l.texImage2D(l.TEXTURE_2D,0,l.RGBA8,256,256,0,l.RGBA,l.UNSIGNED_BYTE,Ot),l.generateMipmap(l.TEXTURE_2D),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR_MIPMAP_LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),u&&l.texParameterf(l.TEXTURE_2D,u.TEXTURE_MAX_ANISOTROPY_EXT,4),await p(),l.activeTexture(l.TEXTURE6),l.bindTexture(l.TEXTURE_2D,l.createTexture()),l.texImage2D(l.TEXTURE_2D,0,l.RGBA8,l.RGBA,l.UNSIGNED_BYTE,i),l.generateMipmap(l.TEXTURE_2D),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR_MIPMAP_LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE),i.close(),l.activeTexture(l.TEXTURE7),l.bindTexture(l.TEXTURE_2D,l.createTexture()),l.texImage2D(l.TEXTURE_2D,0,l.RGBA8,l.RGBA,l.UNSIGNED_BYTE,a),l.generateMipmap(l.TEXTURE_2D),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR_MIPMAP_LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE),u&&l.texParameterf(l.TEXTURE_2D,u.TEXTURE_MAX_ANISOTROPY_EXT,8),a.close(),l.activeTexture(l.TEXTURE4),l.bindTexture(l.TEXTURE_2D,l.createTexture()),l.texImage2D(l.TEXTURE_2D,0,l.SRGB8_ALPHA8,l.RGBA,l.UNSIGNED_BYTE,o),l.generateMipmap(l.TEXTURE_2D),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR_MIPMAP_LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE),o.close();let kt=l.createTexture();l.activeTexture(l.TEXTURE0),l.bindTexture(l.TEXTURE_2D,kt),l.texImage2D(l.TEXTURE_2D,0,l.SRGB8_ALPHA8,l.RGBA,l.UNSIGNED_BYTE,s),l.generateMipmap(l.TEXTURE_2D),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR_MIPMAP_LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE),u&&l.texParameterf(l.TEXTURE_2D,u.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,l.getParameter(u.MAX_TEXTURE_MAX_ANISOTROPY_EXT))),s.close(),await p();let At=Math.min(e?8192:4096,l.getParameter(l.MAX_TEXTURE_SIZE)),jt=l.createTexture();l.activeTexture(l.TEXTURE1),l.bindTexture(l.TEXTURE_2D,jt),l.texStorage2D(l.TEXTURE_2D,1,l.DEPTH_COMPONENT24,At,At),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_COMPARE_MODE,l.COMPARE_REF_TO_TEXTURE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_COMPARE_FUNC,l.LEQUAL),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE);let Mt=l.createFramebuffer();l.bindFramebuffer(l.FRAMEBUFFER,Mt),l.framebufferTexture2D(l.FRAMEBUFFER,l.DEPTH_ATTACHMENT,l.TEXTURE_2D,jt,0),l.drawBuffers([l.NONE]),l.readBuffer(l.NONE),l.bindFramebuffer(l.FRAMEBUFFER,null);let q=v(new Date),Nt=(e,t,n)=>{let r=t,i=N(Ve(r,n)),a=Ve(i,r);return new Float32Array([i[0],a[0],-r[0],0,i[1],a[1],-r[1],0,i[2],a[2],-r[2],0,-He(i,e),-He(a,e),He(r,e),1])},Pt=e?4096:2048,Ft=l.createTexture();l.activeTexture(l.TEXTURE5),l.bindTexture(l.TEXTURE_2D,Ft),l.texStorage2D(l.TEXTURE_2D,1,l.DEPTH_COMPONENT24,Pt,Pt),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_COMPARE_MODE,l.COMPARE_REF_TO_TEXTURE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_COMPARE_FUNC,l.LEQUAL),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE);let It=l.createFramebuffer();l.bindFramebuffer(l.FRAMEBUFFER,It),l.framebufferTexture2D(l.FRAMEBUFFER,l.DEPTH_ATTACHMENT,l.TEXTURE_2D,Ft,0),l.drawBuffers([l.NONE]),l.readBuffer(l.NONE),l.bindFramebuffer(l.FRAMEBUFFER,null);let Lt=[-6,7],Rt=Je.filter(e=>e.x1>Lt[0]-92-40&&e.x0<Lt[0]+92+40&&e.y1>Lt[1]-92-40&&e.y0<Lt[1]+92+40),zt=()=>{let e=q.L,t=[...Lt,0],n=[t[0]+e[0]*135,t[1]+e[1]*135,t[2]+e[2]*135],r=Nt(n,N([-e[0],-e[1],-e[2]]),[0,0,1]);return Oe(new Float32Array([1/92,0,0,0,0,1/92,0,0,0,0,-2/279,0,0,0,-281/279,1]),r)},Bt=zt(),Vt=()=>{let e=q.L,t=6.6,n=[e[0]*26,e[1]*26,4.3+e[2]*26],r=Nt(n,N([-e[0],-e[1],-e[2]]),[0,0,1]);return Oe(new Float32Array([1/t,0,0,0,0,1/t,0,0,0,0,-2/51,0,0,0,-53/51,1]),r)},Ht=Vt(),J={t:0,speed:0,time:0,running:!1,last:0,shadowT:-1,resolve:null,onFrame:null,dpr:Math.min(devicePixelRatio||1,2),frames:0,slow:0,fpsAvg:0,W:0,H:0,visible:!0,tick:0},Ut={az:0,el:0},Wt={x:0,y:0},Y={az:0,el:0,x:0,y:0},X={p:0,target:0,rate:0,z:0,hold:!1,tour:null,orbit:0},Gt=[1,0,0],Kt=[0,0,1],Z=new Float32Array(16),qt=new Float32Array(16),Q=[0,0,0],Jt=()=>{let e=J.t*30/118,t=w((e-.06)/.94),n=w((e-.12)/.88),r=w((J.t-Ne+.4)/.9);Y.az+=(Ut.az-Y.az)*.09,Y.el+=(Ut.el-Y.el)*.09,Y.x+=(Wt.x-Y.x)*.045,Y.y+=(Wt.y-Y.y)*.045;let i=T(Me.az,Ae.az,t)+r*(Y.az+Y.x*1.6+Math.sin(J.time*.11)*1.4),a=Math.max(6,T(Me.el,T(Ae.el,je.el,q.skyShow),n)+r*(Y.el-Y.y*.8+Math.sin(J.time*.07)*.35)),o=T(Ae.dist,je.dist,q.skyShow),s=Me.dist*(o/Me.dist)**t,c=[T(Me.tx,Ae.tx,t),T(Me.ty,Ae.ty,t),T(Me.tz,T(Ae.tz,je.tz,q.skyShow),t)],l=E(i),u=E(a);Q=[c[0]+s*Math.sin(l)*Math.cos(u),c[1]+s*Math.cos(l)*Math.cos(u),c[2]+s*Math.sin(u)];let d=[-Math.sin(l),-Math.cos(l),0],f=c;if(X.p>4e-4&&X.tour){let e=X.tour,t=e.center[0],n=e.center[1],r=Q[0]-t,i=Q[1]-n,a=Math.atan2(r,i)*180/Math.PI,o=e.keys[1][1];for(;a<o-180;)a+=360;for(;a>o+180;)a-=360;let s=Fe(e,X.p,a,Math.hypot(r,i),Q[2],c[2]),l=e.sway?e.sway*Math.sin(X.orbit/e.sway):X.orbit,u=E(s.az+l+Y.x*1.3);Q=[t+s.r*Math.sin(u),n+s.r*Math.cos(u),s.z],d=[-Math.sin(u),-Math.cos(u),0];let p=N(Ve(d,[0,0,1])),m=s.side*Math.abs(s.r)*(document.documentElement.dir===`rtl`?-1:1),h=[t-p[0]*m,n-p[1]*m,s.lz-Y.y*.12],g=E(s.yaw),_=Math.cos(g),v=Math.sin(g),y=[d[0]*_-d[1]*v,d[0]*v+d[1]*_],b=[Q[0]+y[0]*3,Q[1]+y[1]*3,s.lz],x=s.free,S=w(X.p/.13);f=[0,1,2].map(e=>T(c[e],T(h[e],b[e],x),S)),X.z=s.z}else X.z=0;let p=N([f[0]-Q[0],f[1]-Q[1],f[2]-Q[2]]),m=X.tour?.north?1-w((X.p-.6)/.3):1,h=Math.hypot(p[0],p[1]),g=X.p>4e-4?Math.max(0,Math.min(1,(h-.05)/.25))*m:0,_=Ve(g>0?N([T(d[0],p[0]/h,g),T(d[1],p[1]/h,g),0]):d,[0,0,1]),v=He(_,p),y=N([_[0]-p[0]*v,_[1]-p[1]*v,_[2]-p[2]*v]),b=N(Ve(y,p));Gt=y,Kt=b;let x=new Float32Array([y[0],b[0],-p[0],0,y[1],b[1],-p[1],0,y[2],b[2],-p[2],0,-He(y,Q),-He(b,Q),He(p,Q),1]),S=J.W/Math.max(J.H,1),C=18/27,D=C/S;S<16/9&&(D=.375,C=D*S);let O=T(2,.05,w(X.p/.16)),k=8e3;Z=Oe(new Float32Array([1/C,0,0,0,0,1/D,0,0,0,0,-(k+O)/(k-O),-1,0,0,-2*k*O/(k-O),0]),x),qt=ke(Z)},$=e=>{l.useProgram(e.p);let n=e.u;n.u_vp&&l.uniformMatrix4fv(n.u_vp,!1,Z),n.u_lvp&&l.uniformMatrix4fv(n.u_lvp,!1,Bt),n.u_lvp2&&l.uniformMatrix4fv(n.u_lvp2,!1,Ht),n.u_sdw2&&l.uniform1i(n.u_sdw2,5),n.u_eye&&l.uniform3f(n.u_eye,Q[0],Q[1],Q[2]),n.u_t&&l.uniform1f(n.u_t,J.t),n.u_time&&l.uniform1f(n.u_time,J.time),n.u_haze&&l.uniform1f(n.u_haze,T(6,1+q.skyShow*.7,w((J.t*30/118-.25)/.6))*(1+(X.tour?.deep??0)*3*w(X.p/.3))),n.u_ao&&l.uniform1i(n.u_ao,0),n.u_L&&l.uniform3fv(n.u_L,q.L),n.u_light&&l.uniform3fv(n.u_light,q.light),n.u_amb&&l.uniform3fv(n.u_amb,q.amb),n.u_sky&&l.uniform3fv(n.u_sky,q.sky),n.u_zen&&l.uniform3fv(n.u_zen,q.zenith),n.u_glow&&l.uniform3fv(n.u_glow,q.glow),n.u_sunDir&&l.uniform3fv(n.u_sunDir,q.sunDir),n.u_night&&l.uniform1f(n.u_night,q.night),n.u_moonDir&&l.uniform3fv(n.u_moonDir,q.moonDir),n.u_moonLit&&l.uniform1f(n.u_moonLit,q.moonLit),n.u_moonUp&&l.uniform1f(n.u_moonUp,q.moonUp),n.u_moonPhase&&l.uniform1f(n.u_moonPhase,q.moonPhase),n.u_moonRot&&l.uniform1f(n.u_moonRot,q.moonRot),n.u_moonTex&&l.uniform1i(n.u_moonTex,4),n.u_moonLimb&&l.uniform2fv(n.u_moonLimb,q.moonLimb),n.u_stars&&l.uniform1f(n.u_stars,q.stars),n.u_sdw&&l.uniform1i(n.u_sdw,1),n.u_routes&&l.uniform1i(n.u_routes,2),n.u_noise&&l.uniform1i(n.u_noise,3),n.u_coast&&l.uniform1i(n.u_coast,6),n.u_show&&l.uniform1f(n.u_show,X.tour?.show?w(X.p/.42):0),n.u_deep&&l.uniform1f(n.u_deep,(X.tour?.deep??0)*w(X.p/.3)),n.u_bake&&l.uniform4f(n.u_bake,-122.4,-80.4,204.8,204.8),n.u_b&&l.uniform4fv(n.u_b,F),n.u_zmax&&l.uniform1f(n.u_zmax,t.head.zmax)},Yt=()=>{l.bindFramebuffer(l.FRAMEBUFFER,Mt),l.viewport(0,0,At,At),l.enable(l.DEPTH_TEST),l.depthMask(!0),l.clear(l.DEPTH_BUFFER_BIT),l.enable(l.CULL_FACE),l.cullFace(l.FRONT),l.disable(l.BLEND),$(j.sdw),l.vertexAttrib1f(3,0),l.bindVertexArray(Ke);for(let e of Rt)l.drawElements(l.TRIANGLES,e.count,l.UNSIGNED_INT,e.start*4);l.vertexAttrib3f(2,1,.5,1),l.bindVertexArray(nt),l.drawElements(l.TRIANGLES,rt.length,l.UNSIGNED_INT,0),l.disable(l.CULL_FACE),$(j.burjS1),$e(j.burjS1),et(j.burjS1),l.bindFramebuffer(l.FRAMEBUFFER,It),l.viewport(0,0,Pt,Pt),l.clear(l.DEPTH_BUFFER_BIT),$(j.burjS2),$e(j.burjS2),l.cullFace(l.BACK),l.bindFramebuffer(l.FRAMEBUFFER,null)},Xt=()=>{let e=c.clientWidth,t=c.clientHeight;if(!e||!t)return;J.W=e,J.H=t;let n=Math.round(e*J.dpr),r=Math.round(t*J.dpr);(c.width!==n||c.height!==r)&&(c.width=n,c.height=r)},Zt=new Float32Array(24),Qt=()=>{let e=Z;for(let t=0;t<3;t++)for(let n=0;n<2;n++){let r=(t*2+n)*4,i=n?-1:1;for(let n=0;n<4;n++)Zt[r+n]=e[n*4+3]+i*e[n*4+t]}},$t=e=>{for(let t=0;t<24;t+=4){let n=Zt[t],r=Zt[t+1],i=Zt[t+2],a=Zt[t+3];if(n*(n>0?e.x1:e.x0)+r*(r>0?e.y1:e.y0)+i*(i>0?e.z1:0)+a<0)return!1}return!0},en=[],tn=!1,nn=()=>{Xt(),Jt(),Qt(),J.tick++,J.t!==J.shadowT&&(tn||!J.speed||J.tick%2==0)&&(Yt(),J.shadowT=J.t),l.bindFramebuffer(l.FRAMEBUFFER,null),l.viewport(0,0,c.width,c.height),l.clearColor(.85,.93,.97,1),l.depthMask(!0),l.clear(l.COLOR_BUFFER_BIT|l.DEPTH_BUFFER_BIT),l.disable(l.DEPTH_TEST),l.depthMask(!1),l.disable(l.CULL_FACE),l.disable(l.BLEND),$(j.sky),l.uniformMatrix4fv(j.sky.u.u_ivp,!1,qt);let e=e=>{let t=Q[0]+e[0]*1e3,n=Q[1]+e[1]*1e3,r=Q[2]+e[2]*1e3,i=Z[3]*t+Z[7]*n+Z[11]*r+Z[15];return[((Z[0]*t+Z[4]*n+Z[8]*r+Z[12])/i*.5+.5)*c.width,((Z[1]*t+Z[5]*n+Z[9]*r+Z[13])/i*.5+.5)*c.height,i]},t=Math.min(c.height,c.width*.6),n=e(q.moonDir),r=e(q.sunDir);l.uniform2f(j.sky.u.u_moonPos,n[0],n[1]),l.uniform1f(j.sky.u.u_moonR,n[2]>0?t*.058:0),l.uniform2f(j.sky.u.u_sunPos,r[0],r[1]),l.uniform1f(j.sky.u.u_sunR,r[2]>0?t*.046:0),l.bindVertexArray(null),l.drawArrays(l.TRIANGLES,0,3),l.enable(l.DEPTH_TEST),l.depthFunc(l.LEQUAL),l.depthMask(!0),l.enable(l.CULL_FACE),$(j.bld),l.vertexAttrib1f(3,0),l.bindVertexArray(Ke),en.length=0;for(let e of Je)$t(e)&&(e.d=(e.cx-Q[0])**2+(e.cy-Q[1])**2,en.push(e));en.sort((e,t)=>e.d-t.d);for(let e of en)l.drawElements(l.TRIANGLES,e.count,l.UNSIGNED_INT,e.start*4);if(l.vertexAttrib3f(2,1,.5,1),l.bindVertexArray(nt),l.drawElements(l.TRIANGLES,rt.length,l.UNSIGNED_INT,0),l.disable(l.CULL_FACE),$(j.burj),$e(j.burj),$(j.mus),et(j.mus),J.t>2){$(j.prop);for(let e of tt)l.bindVertexArray(e.vao),l.drawElementsInstanced(l.TRIANGLES,e.count,l.UNSIGNED_SHORT,0,e.n)}l.enable(l.CULL_FACE),J.t>1.4&&($(j.tree),l.bindVertexArray(ut),l.drawElementsInstanced(l.TRIANGLES,ct.length,l.UNSIGNED_SHORT,0,lt)),J.t>3.1&&($(j.car),l.disable(l.CULL_FACE),l.bindVertexArray(Dt),l.drawElementsInstanced(l.TRIANGLES,Et.length,l.UNSIGNED_SHORT,0,wt)),l.disable(l.CULL_FACE),l.depthMask(!1),l.enable(l.POLYGON_OFFSET_FILL),l.polygonOffset(2,8),$(j.flat);let i=(e,t,n=!1)=>{l.uniform1i(j.flat.u.u_mode,t),l.uniform1f(j.flat.u.u_surf,+(e===We)),l.uniform4f(j.flat.u.u_b,n?0:F[0],n?0:F[1],n?1:F[2],n?1:F[3]),l.bindVertexArray(e.vao),n?l.drawArrays(l.TRIANGLES,0,e.count):l.drawElements(l.TRIANGLES,e.count,l.UNSIGNED_INT,0)};i(We,3,!0),i(Ge,0,!0),i(L.land,0),i(L.sand,1),i(L.green,2),i(L.water,3),l.enable(l.BLEND),l.blendFunc(l.SRC_ALPHA,l.ONE_MINUS_SRC_ALPHA),$(j.road);let a=(e,t,n,r,i,a,o)=>{if(l.uniform3f(j.road.u.u_emit,o[0],o[1],o[2]),l.uniform3f(j.road.u.u_c,t[0],t[1],t[2]),l.uniform3f(j.road.u.u_c2,n[0],n[1],n[2]),l.uniform1f(j.road.u.u_w,r),l.uniform1f(j.road.u.u_fill,i),l.uniform1f(j.road.u.u_far,a*(1+q.night)),l.bindVertexArray(e.vao),!e.chunks)l.drawElements(l.TRIANGLES,e.count,l.UNSIGNED_INT,0);else for(let t of e.chunks)$t(t)&&l.drawElements(l.TRIANGLES,t.count,l.UNSIGNED_INT,t.start*4)},o=x(`#f0a6a0`),s=x(`#d9cfb9`),u=x(`#fff7dc`);a(L.rail,o,o,1,2,400,ln),a(L.road,rn,an,1,.78,150,on),a(L.big,s,s,1,2,600,cn),a(L.big,u,u,.84,2,600,sn),l.disable(l.POLYGON_OFFSET_FILL),J.t>3.1&&(l.blendFunc(l.ONE,l.ONE_MINUS_SRC_ALPHA),$(j.spray),l.uniform3f(j.spray.u.u_right,Gt[0],Gt[1],Gt[2]),l.uniform3f(j.spray.u.u_up,Kt[0],Kt[1],Kt[2]),l.bindVertexArray(gt),l.uniform1f(j.spray.u.u_at,0),l.drawArraysInstanced(l.TRIANGLES,0,6,ft),$(j.jet),l.bindVertexArray(pt),l.drawArraysInstanced(l.TRIANGLES,0,72,ft),$(j.spray),l.bindVertexArray(gt),l.uniform1f(j.spray.u.u_at,1),l.drawArraysInstanced(l.TRIANGLES,0,6,ft)),l.disable(l.BLEND),l.depthMask(!0),l.bindVertexArray(null)},rn=x(`#ffffff`),an=x(`#dcd5c7`),on=x(`#e39b58`),sn=x(`#ffc070`),cn=x(`#b37436`),ln=x(`#d9545c`),un=e=>{let t=Z,n=t[0]*e[0]+t[4]*e[1]+t[8]*e[2]+t[12],r=t[1]*e[0]+t[5]*e[1]+t[9]*e[2]+t[13],i=t[3]*e[0]+t[7]*e[1]+t[11]*e[2]+t[15];return[(n/i*.5+.5)*J.W,(.5-r/i*.5)*J.H,i>0]},dn=e=>{if(!J.running)return;requestAnimationFrame(dn);let t=Math.min((e-J.last)/1e3,.05),n=(e-J.last)/1e3;J.last=e,!document.hidden&&J.visible&&(J.time+=t,J.speed&&(J.t+=t*J.speed,J.speed>0&&J.t>=4.5&&(J.t=Pe,J.speed=0,J.resolve?.(),J.resolve=null),J.speed<0&&J.t<=0&&(J.t=0,J.speed=0,J.resolve?.(),J.resolve=null)),(X.rate||X.target!==X.p)&&(X.target=Math.max(0,Math.min(1,X.target+X.rate*t)),X.p+=(X.target-X.p)*(1-Math.exp(-t*3.4)),Math.abs(X.target-X.p)<2e-4&&(X.p=X.target)),X.tour&&(X.orbit=X.p>.995?X.orbit+t*X.tour.orbit:X.orbit*Math.exp(-t*2.5)),J.frames++,J.fpsAvg+=(n-J.fpsAvg)*.05,J.frames>30&&J.fpsAvg>1/48&&J.dpr>1&&(J.dpr=Math.max(1,J.dpr-.25),J.frames=0,J.fpsAvg=1/60),nn(),J.onFrame?.(un,J.t))};return c.width=c.height=64,J.W=J.H=64,J.t=Pe,nn(),l.readPixels(0,0,1,1,l.RGBA,l.UNSIGNED_BYTE,new Uint8Array(4)),J.t=0,J.shadowT=-1,J.tick=0,{canvas:c,drag:Ut,aim:Wt,ride:X,setVisible(e){J.visible=e},setEnv(e){let t=Math.hypot(e.L[0]-q.L[0],e.L[1]-q.L[1],e.L[2]-q.L[2])>.002;q=e,t&&(Bt=zt(),Ht=Vt(),J.shadowT=-1)},fps:()=>J.fpsAvg?1/J.fpsAvg:0,play(e){return J.speed=e,new Promise(e=>{J.resolve?.(),J.resolve=e})},start(e){J.onFrame=e,!J.running&&(J.running=!0,J.last=performance.now(),requestAnimationFrame(dn))},stop(){J.running=!1,J.onFrame=null,J.resolve=null,J.t=0,J.speed=0,J.shadowT=-1},debugTime(e,t=!1){let n=new Uint8Array(4),r=[];tn=t;for(let i=0;i<e;i++){let e=performance.now();J.time+=.016,t&&(J.shadowT=-1),nn(),l.readPixels(0,0,1,1,l.RGBA,l.UNSIGNED_BYTE,n),r.push(performance.now()-e)}return tn=!1,r.sort((e,t)=>e-t),{median:r[e>>1],worst:r[e-1],size:`${c.width}x${c.height}`}},debugSeek(e,t){J.t=e,t!==void 0&&(J.time=t),Y.az=Ut.az,Y.el=Ut.el,nn(),J.onFrame?.(un,J.t)}}}function Ve(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function He(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function N(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}var P=(e,t)=>[(t-55.27436)*Math.cos(25.19716*Math.PI/180)*111320/100,(e-25.19716)*110574/100],F=P(25.2245,55.174),I=(e,t,n)=>`${e} ${t}`,L=e=>{let t=[[0,0],[452,124],[555,148],[585,163]];for(let n=1;n<t.length;n++)if(e<=t[n][0])return Math.round(t[n-1][1]+(e-t[n-1][0])/(t[n][0]-t[n-1][0])*(t[n][1]-t[n-1][1]));return 163},Ue={burj_khalifa:{id:`burj_khalifa`,center:[0,0],rate:.055,orbit:1.6,keys:[[0,0,0,0,0,0],[.1,156,10.5,3.4,1.6,0],[.2,178,3.7,.45,2.9,.1],[.3,205,2.8,.95,3.4,.16],[.46,300,2.05,2.7,3.9,.18],[.6,405,1.55,4.2,5.2,.18],[.74,515,.95,5.75,6.55,.2],[.86,615,.62,7.45,8.05,.2],[.93,690,1.3,9,8,.08],[1,770,6.6,12.8,1.2,0]],facts:[[.15,`Burj Khalifa. The tallest building in the world, opened on 4 January 2010.`,`برج خليفة. أطول مبنى في العالم، افتُتح في 4 يناير 2010.`],[.37,`Its three-lobed shape was inspired by the Hymenocallis flower.`,`شكله الثلاثي مستوحى من زهرة الهايمنوكاليس.`],[.5,`The three wings step back as it climbs, which is what keeps it so stable.`,`تتراجع أجنحته الثلاثة كلما ارتفع، وهذا ما يمنحه ثباته.`],[.62,`Levels 124 and 125: the At the Top observation decks.`,`الطابقان 124 و125: منصّتا المراقبة At the Top.`],[.71,`Level 148: the At the Top SKY deck.`,`الطابق 148: منصّة At the Top SKY.`],[.76,`Past the last floor, the spire carries on alone.`,`بعد آخر طابق، يكمل البرج صعوده بقمّته المدبّبة.`],[.985,`828 metres. And all of Dubai below you.`,`828 متراً. ودبي كلها تحتك.`]],meter(e,t,n){let r=e.p<.2?0:Math.max(0,Math.min((e.z-.5)/7.78*828,828)),i=Math.round(r);return{name:i>590?t?`القمّة`:`Spire`:t?`الطابق`:`Level`,big:n(L(i)),small:I(n(i),t?`م`:`m`,t),bar:i/828}}},fountain:{id:`fountain`,center:[1.35,-2.05],rate:.055,orbit:2.2,sway:6,show:!0,keys:[[0,0,0,0,0,0],[.14,178,8,3,.7,0],[.27,182,3.4,.5,.5,.05],[.36,205,2.2,.3,.36,.07],[.43,232,1.4,.14,.26,.06],[.48,232,.62,.13,.32,.04,.25,0],[.52,228,-.08,.16,.42,0,1,0],[.59,225,-.72,.46,.6,0,.85,100],[.67,240,-1.15,.98,.5,0,.1,180],[.8,285,-1.85,.9,.55,0,0,180],[.91,340,-2.4,.6,.8,-.05,0,180],[1,370,-2.4,.32,.92,-.1,0,180]],facts:[[.17,`The Dubai Fountain, on a 30-acre lake at the foot of Burj Khalifa.`,`نافورة دبي، على بحيرة مساحتها 30 فداناً عند قاعدة برج خليفة.`],[.33,`About 275 metres from end to end.`,`طولها نحو 275 متراً من طرف إلى طرف.`],[.62,`Its jets throw water as high as 140 metres.`,`تقذف نوافيرها المياه حتى ارتفاع 140 متراً.`],[.9,`Designed by WET Design, who also made the Bellagio’s fountains in Las Vegas.`,`صمّمتها شركة WET Design، صاحبة نوافير بيلاجيو في لاس فيغاس.`]],meter(e,t,n){let r=Math.min(e.p/.5,1),i=Math.round((70+70*(Math.sin(e.time*1.05)*.5+.5)**1.4)*r);return{name:t?`ارتفاع الماء`:`Water height`,big:n(i),small:t?`متراً`:`metres`,bar:i/140}}},future:{id:`future`,center:P(25.21925,55.28173),rate:.062,orbit:2.4,sway:26,keys:[[0,0,0,0,0,0],[.17,300,8.5,2.5,.55,.06],[.3,312,4.6,1.2,.5,.12],[.42,320,2.3,.62,.48,.17,.1,0],[.5,325,1.15,.47,.46,0,.7,0],[.56,325,.1,.46,.46,0,1,0],[.6,325,-.8,.48,.46,0,.95,50],[.66,325,-1.45,.58,.5,0,.35,165],[.74,318,-1.85,.68,.5,-.12,0,180],[.88,300,-1.9,.72,.5,-.14,0,180],[1,282,-1.9,.7,.47,-.14,0,180]],facts:[[.25,`The Museum of the Future, 77 metres tall, opened on 22 February 2022.`,`متحف المستقبل، بارتفاع 77 متراً، افتُتح في 22 فبراير 2022.`],[.56,`Seven floors wrapped around an elliptical void. Right through the middle.`,`سبعة طوابق تلتفّ حول فراغ بيضاوي. مباشرة عبر قلبه.`],[.76,`Stainless steel and glass, with windows shaped by Arabic calligraphy.`,`فولاذ مقاوم للصدأ وزجاج، ونوافذ تشكّلها الخطوط العربية.`],[.96,`The script is by the artist Mattar bin Lahej. Designed by Killa Design.`,`الخط للفنان مطر بن لاحج، والتصميم لشركة Killa Design.`]],meter(e,t,n){let r=Math.max(0,Math.min((e.p-.15)/.6,1));return{name:t?`الارتفاع`:`Height`,big:n(Math.round(77*r)),small:t?`متراً`:`metres`,bar:r}}},la_mer:{id:`la_mer`,center:[-18.3,33.7],rate:.062,orbit:2,sway:14,deep:.3,keys:[[0,0,0,0,0,0],[.2,300,11,3.2,.3,0],[.36,322,5.6,.95,.2,.05],[.52,328,3.2,.34,.18,.08],[.68,345,1.75,.17,.16,.12],[.82,388,1.3,.2,.14,.1],[.92,366,2.05,.62,.2,.1],[1,338,2.7,.32,.3,.1]],facts:[[.24,`La Mer, on the Jumeirah 1 shoreline.`,`لا مير، على شاطئ جميرا 1.`],[.56,`Built by Meraas, with its first phase opening in October 2017.`,`من تطوير مِراس، وافتُتحت مرحلتها الأولى في أكتوبر 2017.`],[.84,`About 2.5 kilometres of white sand.`,`نحو 2.5 كيلومتر من الرمال البيضاء.`]],meter(e,t,n){let r=Math.max(0,Math.min((e.p-.2)/.7,1));return{name:t?`الشاطئ`:`Beach`,big:n(Math.round(r*25)/10),small:t?`كيلومتر`:`kilometres`,bar:r}}},world:{id:`world`,center:F,rate:.06,orbit:1.1,sway:5,deep:1,north:!0,keys:[[0,0,0,0,0,0],[.22,128,66,24,0,0],[.48,150,42,56,0,.15],[.72,172,22,96,0,.5],[1,180,14,124,0,1]],labels:{from:.74,at:[[F[0]-28,F[1]-13,.1,`North America`,`أمريكا الشمالية`],[F[0]-9,F[1]-25,.1,`South America`,`أمريكا الجنوبية`],[F[0]-13,F[1]+1,.1,`Europe`,`أوروبا`],[F[0]+0,F[1]-8,.1,`Africa`,`أفريقيا`],[F[0]+3,F[1]+14,.1,`Asia`,`آسيا`]]},facts:[[.26,`The World: islands built in the shape of a world map.`,`العالم: جزر شُيّدت على شكل خريطة العالم.`],[.52,`About 4 kilometres off Dubai’s shore, 9 kilometres long and 6 wide.`,`على بعد نحو 4 كيلومترات من الشاطئ، بطول 9 كيلومترات وعرض 6.`],[.8,`Built by Nakheel, with reclamation finished in 2008.`,`من تطوير نخيل، واكتمل استصلاحها في 2008.`]],meter(e,t,n){let r=Math.max(0,Math.min((e.p-.2)/.72,1));return{name:t?`الجزر`:`Islands`,big:n(Math.round(300*r)),small:t?`جزيرة تقريباً`:`or so`,bar:r}}}},R=`/concepts/dubai/`,z=document.documentElement.lang===`ar`,B=()=>matchMedia(`(prefers-reduced-motion: reduce)`).matches,V=z?{place:`دبي · الإمارات العربية المتحدة`,title:[`نحن في`,`دبي!`],sub:`لكن ما زال بإمكاننا أن نلعب معاً!`,contact:`تواصل معنا`,close:`العودة`}:{place:`Dubai · United Arab Emirates`,title:[`We are in`,`Dubai!`],sub:`But, we still can play together!`,contact:`Contact us`,close:`Back`},We=[[`burj_khalifa`,`Burj Khalifa`,`برج خليفة`],[`fountain`,`The Dubai Fountain`,`نافورة دبي`],[`future`,`Museum of the Future`,`متحف المستقبل`],[`la_mer`,`La Mer`,`لا مير`],[`world`,`The World Islands`,`جزر العالم`]],Ge=new Intl.NumberFormat(z?`ar-AE`:`en-US`),Ke=`cubic-bezier(.76, 0, .24, 1)`,qe=e=>e.split(` `).map(e=>`<span class="dm-w"><span>${e}</span></span>`).join(` `),Je=(e,t)=>`<span class="dm-pin-bob"><span class="dm-pin-pop"><u class="dm-pin-ring"></u><img src="${R}pin-${e}.webp" alt="" /><i></i><b>${t}</b></span></span>`,Ye=null,H=null,Xe=!1,U=0,W=()=>{},G=null,Ze=()=>{},Qe=[],K=(e,t)=>Qe.push(window.setTimeout(t,e)),$e=()=>{Qe.forEach(clearTimeout),Qe.length=0};async function et(){return H??=await fetch(R+`dubai-map.json`).then(e=>e.json()).catch(()=>null),H}var tt=()=>!B()&&innerWidth>768&&j(),nt=!1;function rt(){if(!(nt||navigator.connection?.saveData)){if(nt=!0,tt())ze().catch(()=>{});else{et();for(let e of[`final.webp`,`fly.mp4`]){let t=document.createElement(`link`);t.rel=`prefetch`,t.href=R+e,document.head.append(t)}}}}function it(e){let t=document.createElement(`div`);return t.className=`dm`,t.setAttribute(`aria-hidden`,`true`),t.innerHTML=`
    <div class="dm-stage">
      <img class="dm-still" alt="" />
      <video class="dm-video" muted playsinline></video>
      <canvas class="dm-traffic"></canvas>
      <div class="dm-pins"></div>
    </div>
    <div class="dm-top"></div>
    <div class="dm-frost"></div>
    <div class="dm-ring"></div>
    <div class="dm-copy">
      <p class="dm-place">${V.place} · <time class="dm-clock"></time></p>
      <h2 class="dm-title">${qe(V.title[0])} <em>${qe(V.title[1])}</em></h2>
      <p class="dm-sub">${qe(V.sub)}</p>
      <a class="a-pill dm-contact" href="#contact">${V.contact}</a>
    </div>
    <div class="dm-ride">
      <button class="dm-back" type="button">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${z?`العودة إلى دبي`:`Back to Dubai`}
      </button>
      <div class="dm-tags" aria-hidden="true"></div>
      <div class="dm-rail" aria-hidden="true"><span></span></div>
      <p class="dm-fact" aria-live="polite"></p>
      <div class="dm-meter" aria-hidden="true">
        <small class="dm-level-name">${z?`الطابق`:`Level`}</small>
        <strong class="dm-level">0</strong>
        <span class="dm-height">0 m</span>
      </div>
      <p class="dm-hint" aria-hidden="true">${z?`مرّر للتحكم بالرحلة`:`Scroll to steer the ride`}</p>
    </div>
    <button class="dm-close" type="button" aria-label="${V.close}">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>
    </button>`,e.prepend(t),t.querySelector(`.dm-close`).addEventListener(`click`,()=>yt()),t}function at(e){let t=e.clientWidth,n=e.clientHeight,r=Math.max(t/16,n/9),i=16*r,a=9*r;return{w:t,h:n,pw:i,ph:a,x:e=>(t-i)/2+e*i,y:e=>(n-a)/2+e*a}}function ot(e){if(!H)return;let t=e.querySelector(`.dm-pins`),n=at(e);t.innerHTML=``;let r=e.querySelector(`.dm-copy`),i=e.querySelector(`.dm-title`).getBoundingClientRect(),a=e.getBoundingClientRect().left;We.forEach(([e,o,s],c)=>{let l=H.pins[e];if(!l)return;let u=n.x(l[0]),d=n.y(l[1]);if(u<50||u>n.w-50||d<90)return;let f=u>i.left-a-90&&u<i.right-a+90;if(d+34>r.offsetTop&&(f||d>n.h*.72))return;let p=document.createElement(`div`);p.className=`dm-pin`,p.style.left=`${u}px`,p.style.top=`${d}px`,p.style.setProperty(`--i`,String(c)),p.innerHTML=Je(e,z?s:o),t.append(p)})}function st(e){B()||e.querySelectorAll(`.dm-pin`).forEach((e,t)=>{let n=t*150,r=e.querySelector(`.dm-pin-pop`);r.getAnimations().forEach(e=>e.cancel()),r.animate([{scale:`0`,opacity:0,easing:`cubic-bezier(.2,.9,.3,1)`},{scale:`1.32`,opacity:1,offset:.34,easing:`cubic-bezier(.4,0,.6,1)`},{scale:`0.88`,offset:.58,easing:`cubic-bezier(.4,0,.6,1)`},{scale:`1.07`,offset:.78,easing:`cubic-bezier(.4,0,.6,1)`},{scale:`1`}],{duration:780,delay:n,fill:`backwards`}),e.querySelector(`.dm-pin-ring`).animate([{scale:`0.5`,opacity:.95},{scale:`2.1`,opacity:0}],{duration:620,delay:n+90,easing:`cubic-bezier(.15,.7,.3,1)`,fill:`backwards`}),e.querySelector(`b`).animate([{opacity:0,translate:`0 -7px`,scale:`0.8`},{opacity:1,translate:`0 0`,scale:`1`}],{duration:340,delay:n+240,easing:`cubic-bezier(.3,1.5,.5,1)`,fill:`backwards`})})}function ct(e){B()||e.querySelectorAll(`.dm-pin-pop`).forEach((e,t)=>{e.animate([{scale:`1`,opacity:1},{scale:`1.15`,opacity:1,offset:.3},{scale:`0`,opacity:0}],{duration:240,delay:t*25,easing:`cubic-bezier(.5,0,.8,.4)`,fill:`forwards`})})}function lt(e){let t=e.querySelector(`.dm-traffic`),n=t.getContext(`2d`);if(!n||!H||B())return()=>{};let r=at(e),i=0,a=0,o=!0,s=Math.min(devicePixelRatio||1,2),c=()=>{r=at(e),t.width=r.w*s,t.height=r.h*s};c();let l=[`#ffffff`,`#ffffff`,`#e8505b`,`#2d3a44`,`#f4c95d`,`#6b7c8a`],u=[];for(let e of H.routes){let t=Math.min(26,Math.round(e.p.length*(e.k===`motorway`?.5:.28)));for(let n=0;n<t;n++)u.push({r:e,at:Math.random()*(e.p.length-1),dir:1,v:.7+Math.random()*.6,c:l[Math.random()*l.length|0]})}let d=new IntersectionObserver(([e])=>o=e.isIntersecting);d.observe(e);let f=new ResizeObserver(c);f.observe(e);let p=e=>{i=requestAnimationFrame(p);let t=Math.min((e-a)/1e3,.1);if(a=e,o){n.setTransform(s,0,0,s,0,0),n.clearRect(0,0,r.w,r.h);for(let e of u){let i=e.r.p;e.at+=e.dir*e.v*t*1.5,e.at>=i.length-1&&(e.at=0);let a=Math.floor(e.at),o=e.at-a,s=i[a],c=i[a+1]??s,l=r.x(s[0]+(c[0]-s[0])*o),u=r.y(s[1]+(c[1]-s[1])*o),d=Math.atan2(r.y(c[1])-r.y(s[1]),r.x(c[0])-r.x(s[0])),f=Math.max(.55,s[2]*32*(r.ph/1080)),p=Math.min(1,e.at/2,(i.length-1-e.at)/2);n.globalAlpha=Math.max(0,p),n.save(),n.translate(l,u),n.rotate(d),n.fillStyle=`rgba(40,50,60,.22)`,n.fillRect(-1.8*f,-.5*f,3.6*f,1.6*f),n.fillStyle=e.c,n.fillRect(-1.6*f,-.8*f,3.2*f,1.5*f),n.restore()}n.globalAlpha=1}};return a=performance.now(),i=requestAnimationFrame(p),t.animate([{opacity:0},{opacity:1}],{duration:900,fill:`both`}),()=>{cancelAnimationFrame(i),d.disconnect(),f.disconnect()}}var ut=(e,t)=>{let n=B();e.querySelectorAll(`.a-hero h1 > span`).forEach((e,r)=>{e.getAnimations().forEach(e=>e.cancel());let i={translate:`0 -0.5em`,opacity:0,filter:`blur(10px)`},a={translate:`0 0`,opacity:1,filter:`blur(0)`};e.animate(t?[a,i]:[{...i,translate:`0 0.5em`},a],{duration:n?1:t?460:720,delay:n?0:r*70,easing:t?`cubic-bezier(.6,0,.9,.4)`:`cubic-bezier(.16,1,.3,1)`,fill:`both`})}),e.querySelectorAll(`.a-eyebrow, .a-hero-description`).forEach(e=>{e.getAnimations().forEach(e=>e.cancel()),e.animate(t?[{opacity:1},{opacity:0}]:[{opacity:0},{opacity:1}],{duration:n?1:t?280:640,delay:!t&&!n?240:0,fill:`both`})})};function dt(e,t){let n=e.getBoundingClientRect(),r=t.getBoundingClientRect(),i=n.left+n.width/2-r.left,a=n.top+n.height/2-r.top;return{x:i,y:a,R:Math.hypot(Math.max(i,r.width-i),Math.max(a,r.height-a))+40}}var ft=0;function pt(e){let t=document.documentElement;`dmDark`in t.dataset!==e&&(t.classList.add(`dm-theming`),clearTimeout(ft),ft=window.setTimeout(()=>t.classList.remove(`dm-theming`),950),e?t.dataset.dmDark=`on`:delete t.dataset.dmDark)}var mt=new Intl.DateTimeFormat(z?`ar-AE`:`en-US`,{timeZone:`Asia/Dubai`,hour:`numeric`,minute:`2-digit`});function ht(e,t,n=!0){let r=y();e.querySelector(`.dm-clock`).textContent=mt.format(r);let i=document.documentElement.style;if(!n){e.style.setProperty(`--dm-fade`,`255 255 255`),i.setProperty(`--dm-top`,`217 238 249`);return}let a=v(r);return e.style.setProperty(`--dm-fade`,a.fade),i.setProperty(`--dm-top`,a.top),e.classList.toggle(`is-dark`,a.dark),e.dataset.mode=a.mode,pt(a.dark),t?.setEnv(a),a}var gt=null;function _t(e,t){let n=e.querySelector(`.dm-stage`);e.classList.add(`is-live`,`is-waiting`),e.querySelector(`.dm-traffic`)?.remove();let r=e.querySelector(`.dm-pins`),i=We.map(([e,t,n],i)=>{let a=document.createElement(`div`);return a.className=`dm-pin is-go`,a.style.setProperty(`--i`,String(i)),a.innerHTML=Je(e,z?n:t),r.append(a),{pin:a,id:e,name:z?n:t,at:Le[e],hide:!1}}),a=e.querySelector(`.dm-copy`),o=new AbortController;W=()=>o.abort();let s=window.setInterval(()=>ht(e,gt),3e4);o.signal.addEventListener(`abort`,()=>clearInterval(s));let c=new IntersectionObserver(([e])=>gt?.setVisible(e.isIntersecting));c.observe(e),o.signal.addEventListener(`abort`,()=>{c.disconnect(),gt?.setVisible(!0)}),K(780,()=>e.classList.add(`is-title`)),ze().then(r=>{if(o.signal.aborted||t!==U)return;gt=r,n.prepend(r.canvas),ht(e,r),r.drag.az=r.drag.el=0,r.canvas.addEventListener(`webglcontextlost`,()=>{if(Be(),e.isConnected){let t=e.querySelector(`.dm-still`);t.src=R+`final.webp`,e.classList.remove(`is-live`,`is-waiting`),e.classList.add(`is-landed`,`is-title`),r.canvas.remove()}},{signal:o.signal});let s=!1,c=null,l=e.querySelector(`.dm-level`),u=e.querySelector(`.dm-height`),d=e.querySelector(`.dm-level-name`),f=e.querySelector(`.dm-rail span`),p=e.querySelector(`.dm-fact`),m=e.querySelector(`.dm-tags`),h=!1,g=!1,_=-1,v=``,y=0,b=null,x=e=>{_=e,p.textContent=e<0||!b?``:z?b.facts[e][2]:b.facts[e][1],e>=0&&!B()&&p.animate([{opacity:0,translate:`0 16px`,filter:`blur(5px)`},{opacity:1,translate:`0 0`,filter:`blur(0)`}],{duration:620,easing:`cubic-bezier(.16,1,.3,1)`})},S=()=>{if(!h||!b)return;let t=r.ride;!g&&t.rate>=0&&(t.rate=t.hold||performance.now()-y<1300||t.target>=1?0:b.rate);let n=b.meter({p:t.p,z:t.z,time:performance.now()/1e3},z,e=>Ge.format(e)),i=n.name+n.big+n.small;if(i!==v&&(v=i,l.textContent=n.big,u.textContent=n.small,d.textContent=n.name),f.style.scale=`1 ${n.bar}`,b.labels&&c){let e=!g&&t.p>=b.labels.from;m.classList.toggle(`is-on`,e),e&&b.labels.at.forEach(([e,t,n],r)=>{let[i,a,o]=c([e,t,n]),s=m.children[r];s.style.visibility=o?``:`hidden`,s.style.transform=`translate3d(${i}px, ${a}px, 0) translate(-50%, -50%)`})}let a=-1;b.facts.forEach(([e],n)=>{t.p>=e&&(a=n)}),!g&&a!==_&&x(a),g&&t.p<.002&&(t.p=t.target=t.rate=t.orbit=0,t.tour=null,b=null,h=g=!1,G=null,e.classList.remove(`is-ride`,`is-ride-out`),e.removeAttribute(`data-lenis-prevent`),delete document.documentElement.dataset.dubaiRide,x(-1),e.classList.remove(`is-title`),requestAnimationFrame(()=>e.classList.add(`is-title`)),st(e))},C=t=>{h||!s||e.classList.contains(`is-leaving`)||(h=!0,b=Ue[t],v=``,m.classList.remove(`is-on`),m.replaceChildren(...(b.labels?.at??[]).map(([,,,e,t])=>{let n=document.createElement(`span`);return n.textContent=z?t:e,n})),e.dataset.tour=t,r.ride.tour=b,r.ride.orbit=0,y=0,ct(e),window.scrollTo({top:0,behavior:`instant`}),e.classList.add(`is-ride`),e.setAttribute(`data-lenis-prevent`,``),document.documentElement.dataset.dubaiRide=`on`,r.drag.az=r.drag.el=0,r.ride.target=.002,r.ride.rate=b.rate,G=()=>{g||(g=!0,e.classList.add(`is-ride-out`),x(-1),r.ride.rate=-.52)})};e.querySelector(`.dm-back`).addEventListener(`click`,()=>G?.(),{signal:o.signal}),e.addEventListener(`wheel`,e=>{h&&!g&&(e.preventDefault(),e.stopPropagation(),y=performance.now(),r.ride.rate=0,r.ride.target=Math.max(.06,Math.min(1,r.ride.target+e.deltaY*32e-5)))},{passive:!1,signal:o.signal}),window.addEventListener(`keydown`,e=>{!h||g||e.key!==`ArrowDown`&&e.key!==`ArrowUp`||(e.preventDefault(),y=performance.now(),r.ride.rate=0,r.ride.target=Math.max(.06,Math.min(1,r.ride.target+(e.key===`ArrowDown`?.04:-.04))))},{signal:o.signal});for(let e of i){let t=e.pin.querySelector(`.dm-pin-pop`);t.setAttribute(`role`,`button`),t.tabIndex=0,t.setAttribute(`aria-label`,z?`طِر إلى ${e.name}`:`Fly to ${e.name}`),t.addEventListener(`click`,()=>C(e.id),{signal:o.signal}),t.addEventListener(`keydown`,t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),C(e.id))},{signal:o.signal})}let w=(e,t)=>{if(!c)return!1;let[n,r]=c([0,0,.3]),[i,a]=c([0,0,8.2]),o=i-n,s=a-r,l=Math.max(0,Math.min(1,((e-n)*o+(t-r)*s)/(o*o+s*s)));return Math.hypot(e-(n+o*l),t-(r+s*l))<16+30*(1-l)};r.start((t,n)=>{if(c=t,S(),h||(n>3.683333333333333&&!s&&!e.classList.contains(`is-leaving`)&&(s=!0,e.classList.add(`is-pins`),st(e)),!s))return;let r=a.offsetTop;for(let n of i){let[i,a,o]=t(n.at),s=e.clientWidth,c=!o||i<-420||i>s+420||a<-200||a>r+300;c!==n.hide&&(n.hide=c,n.pin.style.visibility=c?`hidden`:``),n.pin.style.transform=`translate3d(${Math.max(84,Math.min(i,s-84))}px, ${Math.max(150,Math.min(a,r-34))}px, 0)`}}),requestAnimationFrame(()=>e.classList.remove(`is-waiting`)),r.play(1);let T=null,E=0;e.addEventListener(`pointermove`,t=>{let n=e.getBoundingClientRect();r.aim.x=((t.clientX-n.left)/n.width-.5)*2,r.aim.y=((t.clientY-n.top)/n.height-.5)*2,r.canvas.classList.toggle(`is-over-tower`,!T&&!h&&s&&w(t.clientX-n.left,t.clientY-n.top)),T&&(E=Math.max(E,Math.hypot(t.clientX-T.x,t.clientY-T.y)),r.drag.az=Math.max(-55,Math.min(55,T.az-(t.clientX-T.x)*.14)),r.drag.el=Math.max(-7,Math.min(32,T.el+(t.clientY-T.y)*.09)))},{signal:o.signal}),r.canvas.addEventListener(`pointerdown`,e=>{h||(E=0,T={x:e.clientX,y:e.clientY,az:r.drag.az,el:r.drag.el},r.canvas.setPointerCapture(e.pointerId),r.canvas.classList.add(`is-dragging`))},{signal:o.signal});let D=()=>{T=null,r.canvas.classList.remove(`is-dragging`)};r.canvas.addEventListener(`pointerup`,t=>{let n=T&&E<6;D();let r=e.getBoundingClientRect();n&&w(t.clientX-r.left,t.clientY-r.top)&&C(`burj_khalifa`)},{signal:o.signal}),r.canvas.addEventListener(`pointercancel`,D,{signal:o.signal}),e.dataset.ready=`1`}).catch(n=>{console.error(n),Be(),t===U&&(e.querySelector(`.dm-still`).src=R+`final.webp`,e.classList.remove(`is-live`,`is-waiting`),e.classList.add(`is-landed`,`is-title`))})}async function vt(e){if(Xe)return yt();let t=document.querySelector(`.a-hero`);if(!t)return;Xe=!0;let n=++U;$e(),rt(),Ye?.remove();let r=Ye=it(t),i=B(),a=r.querySelector(`.dm-video`),o=r.querySelector(`.dm-still`),{x:s,y:c,R:l}=dt(e,r);r.style.setProperty(`--ox`,`${s}px`),r.style.setProperty(`--oy`,`${c}px`),r.style.setProperty(`--or`,`${l}px`),ht(r,null,tt()),document.documentElement.dataset.dubai=`on`,e.setAttribute(`aria-expanded`,`true`);let u=()=>document.documentElement.style.setProperty(`--dm-bar`,String(Math.min(scrollY/90,1)));if(Ze(),u(),window.addEventListener(`scroll`,u,{passive:!0}),Ze=()=>{window.removeEventListener(`scroll`,u),delete document.documentElement.dataset.dubaiBar,pt(!1)},K(i?0:480,()=>{document.documentElement.dataset.dubaiBar=`on`}),window.dispatchEvent(new CustomEvent(`hero:dubai`,{detail:!0})),ut(t,!0),r.classList.add(`is-on`),r.setAttribute(`aria-hidden`,`false`),i)a.remove(),o.src=R+`final.webp`,r.animate([{opacity:0},{opacity:1}],{duration:250}),r.classList.add(`is-landed`,`is-title`);else if(tt()){a.remove(),v(y()).dark||(o.src=R+`first.webp`),r.animate([{clipPath:`circle(0px at ${s}px ${c}px)`},{clipPath:`circle(${l}px at ${s}px ${c}px)`}],{duration:1250,delay:90,easing:Ke,fill:`backwards`}),r.querySelector(`.dm-ring`).animate([{width:`0px`,height:`0px`,opacity:1},{width:`${l*2}px`,height:`${l*2}px`,opacity:1,offset:.9},{width:`${l*2}px`,height:`${l*2}px`,opacity:0}],{duration:1250,delay:90,easing:Ke,fill:`both`}),_t(r,n),r.querySelector(`.dm-close`)?.focus({preventScroll:!0});return}else{o.src=R+`final.webp`,a.poster=R+`first.webp`,a.preload=`auto`,a.src=R+`fly.mp4`,r.animate([{clipPath:`circle(0px at ${s}px ${c}px)`},{clipPath:`circle(${l}px at ${s}px ${c}px)`}],{duration:1250,delay:90,easing:Ke,fill:`backwards`}),r.querySelector(`.dm-ring`).animate([{width:`0px`,height:`0px`,opacity:1},{width:`${l*2}px`,height:`${l*2}px`,opacity:1,offset:.9},{width:`${l*2}px`,height:`${l*2}px`,opacity:0}],{duration:1250,delay:90,easing:Ke,fill:`both`});let e=()=>{n===U&&(r.classList.add(`is-landed`),a.classList.add(`is-done`),K(600,()=>a.remove()))};a.addEventListener(`ended`,e,{once:!0}),a.addEventListener(`error`,e,{once:!0}),a.currentTime=0,K(120,()=>a.play().catch(e)),K(2600,()=>{(a.paused||a.currentTime===0)&&e()}),K(780,()=>r.classList.add(`is-title`))}if(await et(),n!==U)return;ot(r);let d=()=>ot(r);window.addEventListener(`resize`,d),K(i?0:3750,()=>{r.classList.add(`is-pins`),st(r),i||(W=lt(r))});let f=W;W=()=>{f(),window.removeEventListener(`resize`,d)},r.querySelector(`.dm-close`)?.focus({preventScroll:!0}),r.dataset.ready=`1`}function yt(){if(!Xe||!Ye)return;if(G)return G();Xe=!1;let e=++U;$e(),W(),W=()=>{};let t=Ye,n=document.querySelector(`.a-hero`),r=n.querySelector(`.a-dubai`),i=B();t.classList.add(`is-leaving`),t.classList.remove(`is-title`),ct(t),K(300,()=>t.classList.remove(`is-pins`)),delete document.documentElement.dataset.dubai,K(i?0:560,Ze),r?.setAttribute(`aria-expanded`,`false`);let a=t.classList.contains(`is-live`)?gt:null,o=()=>{e===U&&(a?.stop(),t.remove(),Ye===t&&(Ye=null))};if(K(i?0:340,()=>{ut(n,!1),window.dispatchEvent(new CustomEvent(`hero:dubai`,{detail:!1}))}),i)return o();a?.play(-Pe/1.45);let s=r?dt(r,t):{x:t.clientWidth/2,y:t.clientHeight/2,R:t.clientWidth};t.animate([{clipPath:`circle(${s.R}px at ${s.x}px ${s.y}px)`},{clipPath:`circle(0px at ${s.x}px ${s.y}px)`}],{duration:a?1e3:900,delay:a?620:130,easing:Ke,fill:`both`}).onfinish=o,r?.focus({preventScroll:!0})}document.addEventListener(`keydown`,e=>{e.key===`Escape`&&Xe&&!document.querySelector(`dialog[open]`)&&yt()});export{yt as closeDubai,vt as openDubai,rt as warm};