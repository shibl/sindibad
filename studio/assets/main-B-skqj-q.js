import"./fonts-BfBZtaJv.js";import{r as e,t}from"./qr-DjGqIHLV.js";var n=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);function r(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[r*4+i]=e[i]*t[r*4]+e[i+4]*t[r*4+1]+e[i+8]*t[r*4+2]+e[i+12]*t[r*4+3];return n}function i(e){let t=new Float32Array(16),[n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_]=Array.from(e),v=n*s-r*o,y=n*c-i*o,b=n*l-a*o,x=r*c-i*s,S=r*l-a*s,C=i*l-a*c,w=u*h-d*m,T=u*g-f*m,E=u*_-p*m,D=d*g-f*h,O=d*_-p*h,k=f*_-p*g,A=1/(v*k-y*O+b*D+x*E-S*T+C*w);return t[0]=(s*k-c*O+l*D)*A,t[1]=(i*O-r*k-a*D)*A,t[2]=(h*C-g*S+_*x)*A,t[3]=(f*S-d*C-p*x)*A,t[4]=(c*E-o*k-l*T)*A,t[5]=(n*k-i*E+a*T)*A,t[6]=(g*b-m*C-_*y)*A,t[7]=(u*C-f*b+p*y)*A,t[8]=(o*O-s*E+l*w)*A,t[9]=(r*E-n*O-a*w)*A,t[10]=(m*S-h*b+_*v)*A,t[11]=(d*b-u*S-p*v)*A,t[12]=(s*T-o*D-c*w)*A,t[13]=(n*D-r*T+i*w)*A,t[14]=(h*y-m*x-g*v)*A,t[15]=(u*x-d*y+f*v)*A,t}function a(e,t,n,r){let i=1/Math.tan(e/2),a=new Float32Array(16);return a[0]=i/t,a[5]=i,a[10]=(r+n)/(n-r),a[11]=-1,a[14]=2*r*n/(n-r),a}function o(e,t,r){let i=n();return i[12]=e,i[13]=t,i[14]=r,i}function s(e){let t=Math.cos(e),r=Math.sin(e),i=n();return i[0]=t,i[2]=-r,i[8]=r,i[10]=t,i}function c(e){let t=Math.cos(e),r=Math.sin(e),i=n();return i[5]=t,i[6]=r,i[9]=-r,i[10]=t,i}function l(e){let t=Math.cos(e),r=Math.sin(e),i=n();return i[0]=t,i[1]=r,i[4]=-r,i[5]=t,i}function u(e){let t=n();return t[0]=t[5]=t[10]=e,t}function d(e){let[t,r,i,a]=[e[0],e[1],e[2],e[3]],o=n();return o[0]=1-2*(r*r+i*i),o[1]=2*(t*r+i*a),o[2]=2*(t*i-r*a),o[4]=2*(t*r-i*a),o[5]=1-2*(t*t+i*i),o[6]=2*(r*i+t*a),o[8]=2*(t*i+r*a),o[9]=2*(r*i-t*a),o[10]=1-2*(t*t+r*r),o}var f=(e,t)=>[e[3]*t[0]+e[0]*t[3]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]-e[0]*t[2]+e[1]*t[3]+e[2]*t[0],e[3]*t[2]+e[0]*t[1]-e[1]*t[0]+e[2]*t[3],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]];function p(e,t,n){let r=e[0]*t[0]+e[1]*t[1]+e[2]*t[2]+e[3]*t[3],i=r<0?-1:1;r=Math.abs(r);let a=e.map((e,r)=>e+(t[r]*i-e)*n),o=Math.hypot(a[0],a[1],a[2],a[3])||1;return a.map(e=>e/o)}function m(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}var h=.9,g={hw:.55*h,y0:.14*h,arc:1.54*h,top:2.09*h,plane:-.18},_=.035,v=m([-.9,.17,-.4]),y=.03,b=4e3,x=e=>[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255],S=e=>`vec3(${x(e).map(e=>e.toFixed(3)).join(`,`)})`,C=e=>Math.min(1,Math.max(0,e)),w=(e,t,n)=>{let r=C((n-e)/(t-e));return r*r*(3-2*r)};function T(e){return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}var E=`#version 300 es
precision highp float;
precision highp int;
`,D=`
const vec3 SUN = vec3(${v.map(e=>e.toFixed(4)).join(`,`)});
const float PLANE = ${g.plane.toFixed(3)};
`,O=`${E}
uniform mat4 u_ivp; uniform vec3 u_cam; out vec3 v_d;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  vec4 w = u_ivp * vec4(p, 1., 1.);
  v_d = w.xyz / w.w - u_cam;
  gl_Position = vec4(p, 1., 1.);
}`,k=`${E}${D}
in vec3 v_d; out vec4 o;
vec3 ramp(float f) {
  vec3 c = mix(${S(`#ffc79a`)}, ${S(`#ffb08e`)}, smoothstep(0., .155, f));
  c = mix(c, ${S(`#ff98a6`)}, smoothstep(.155, .2, f));
  c = mix(c, ${S(`#e46fb0`)}, smoothstep(.2, .3, f));
  c = mix(c, ${S(`#9a58c4`)}, smoothstep(.3, .48, f));
  c = mix(c, ${S(`#4b3591`)}, smoothstep(.48, .7, f));
  return mix(c, ${S(`#1d1650`)}, smoothstep(.7, 1., f));
}
void main() {
  vec3 d = normalize(v_d);
  vec3 c = ramp(clamp((d.y + .06) / .38, 0., 1.));
  float s = max(dot(d, SUN), 0.);
  c = mix(c, ${S(`#ffd9a8`)}, pow(smoothstep(.55, 1., s), 3.) * .6);
  c += ${S(`#fff0d8`)} * pow(s, 900.) * 1.2;
  // Overhead, slow drifts of colour among the stars.
  float high = smoothstep(.22, .75, d.y);
  float neb = sin(d.x * 5.1 + sin(d.z * 4.3) * 1.4) * sin(d.z * 4.7 + d.y * 3.1 + sin(d.x * 3.7) * 1.2);
  c += mix(${S(`#3a2a9a`)}, ${S(`#8a2f8f`)}, .5 + .5 * sin(d.x * 3. + d.z * 2.)) * smoothstep(.05, .9, neb) * high * .55;
  // Long thin veils of cloud catch the low sun.
  float band = sin(d.y * 26. + sin(d.x * 3.1 + d.z * 2.3) * 1.6) * .5 + .5;
  c += ${S(`#ff9fc0`)} * band * band * smoothstep(.02, .14, d.y) * smoothstep(.42, .16, d.y) * .1;
  o = vec4(c, 1.);
}`,A=`${E}
in vec3 a_d; in vec2 a_s; uniform mat4 u_vp; uniform vec3 u_cam; uniform float u_t, u_dpr; out float v_a;
void main() {
  gl_Position = (u_vp * vec4(u_cam + a_d * 3000., 1.)).xyww;
  float tw = .6 + .4 * sin(u_t * (1. + a_s.y * 2.) + a_s.y * 40.);
  v_a = (.35 + a_s.x * .9) * tw * smoothstep(.07, .24, a_d.y);
  gl_PointSize = (1.5 + a_s.x * 2.2) * u_dpr;
}`,j=`${E}
in float v_a; out vec4 o;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float a = v_a * smoothstep(1., .1, d);
  o = vec4(${S(`#fff6ec`)} * a, 0.);
}`,ee=`${E}
in vec2 a_c; uniform mat4 u_vp; uniform vec3 u_center, u_right, u_up; uniform float u_size; out vec2 v_c;
void main() {
  v_c = a_c;
  gl_Position = u_vp * vec4(u_center + (u_right * a_c.x + u_up * a_c.y) * u_size, 1.);
}`,te=`${E}
in vec2 v_c; uniform vec3 u_col; uniform float u_pow; out vec4 o;
void main() {
  float a = pow(max(1. - length(v_c), 0.), u_pow);
  o = vec4(u_col * a, 0.);
}`,ne=`${E}
in vec3 a_p; uniform mat4 u_vp, u_model; out vec3 v_o; out vec3 v_n;
void main() {
  v_o = a_p;
  v_n = mat3(u_model) * a_p;
  gl_Position = u_vp * u_model * vec4(a_p, 1.);
}`,re=`${E}${D}
in vec3 v_o; in vec3 v_n; uniform vec3 u_view; out vec4 o;
void main() {
  vec3 n = normalize(v_n), p = v_o;
  float w = p.y * 7. + .5 * sin(p.x * 3.1 + p.z * 2.7 + 1.) + .28 * sin(p.x * 7.3 - p.z * 5.1 + p.y * 6.) + .12 * sin(p.x * 17. + p.z * 13. + p.y * 25.);
  float f = .5 + .5 * sin(w * 2.1);
  vec3 c = mix(${S(`#fff1e4`)}, ${S(`#ffd3b8`)}, smoothstep(0., .3, f));
  c = mix(c, ${S(`#f7b6c8`)}, smoothstep(.3, .5, f));
  c = mix(c, ${S(`#dcc6f4`)}, smoothstep(.5, .68, f));
  c = mix(c, ${S(`#ffe6d2`)}, smoothstep(.68, .85, f));
  float l = smoothstep(-.25, .55, dot(n, SUN));
  c *= mix(vec3(.62, .46, .72), vec3(1.04), l);
  float rim = pow(1. - max(dot(n, u_view), 0.), 3.);
  c += ${S(`#ffb3d6`)} * rim * .55;
  o = vec4(c, 1.);
}`,ie=`${E}${D}
in vec3 v_o; in vec3 v_n; uniform vec3 u_center; uniform float u_pr; uniform mat4 u_model; out vec4 o;
void main() {
  float r = length(v_o.xz);
  float f = (r - 1.35) / 1.;
  float s = .62 + .2 * sin(f * 31.) + .14 * sin(f * 73. + 1.) + .1 * sin(f * 149. + 2.);
  float edge = smoothstep(0., .06, f) * smoothstep(1., .9, f);
  vec3 c = mix(${S(`#ffe6cf`)}, ${S(`#ffd1c0`)}, smoothstep(0., .35, f));
  c = mix(c, ${S(`#f0c9ef`)}, smoothstep(.35, .6, f));
  c = mix(c, ${S(`#ffe9d6`)}, smoothstep(.6, 1., f));
  // The planet's shadow falls across the rings on the side away from the sun.
  vec3 w = mat3(u_model) * v_o;
  float along = dot(w, SUN);
  float off = length(w - SUN * along) / u_pr;
  float shade = along < 0. ? smoothstep(.92, 1.08, off) : 1.;
  c *= mix(.42, 1., shade);
  float a = clamp(s * edge, 0., 1.) * .92;
  o = vec4(c * a, a);
}`,ae=`${E}
in vec3 a_p; in vec4 a_n; uniform mat4 u_vp; out vec3 v_p; out vec3 v_n; out float v_s;
void main() {
  v_p = a_p;
  v_n = a_n.xyz;
  v_s = a_n.w;
  gl_Position = u_vp * vec4(a_p, 1.);
}`,oe=`${E}${D}
in vec3 v_p; in vec3 v_n; in float v_s; uniform vec3 u_cam; out vec4 o;
void main() {
  vec3 to = v_p - u_cam;
  float d = length(to);
  // Wind ripples: bands across the wind, fading out with distance.
  float near = exp(-d / 13.);
  float wa = v_p.x * .62 - v_p.z * .78;
  float warp = sin(v_p.x * .9 + v_p.z * .6) * 1.5 + sin(v_p.x * .31 - v_p.z * .47) * 2.4;
  // Ripples too fine for the pixels they land on would shimmer, so they fade out first.
  float fine = 1. - smoothstep(.25, 1.1, fwidth(wa) * 19.);
  float rip = (cos(wa * 19. + warp) + .5 * cos(wa * 41. + warp * 1.7) * fine) * near * fine;
  vec3 n = normalize(normalize(v_n) + vec3(.62, 0., -.78) * rip * .11);
  float ndl = dot(n, SUN);
  float lit = smoothstep(.0, .5, ndl) * v_s;
  vec3 c = mix(${S(`#6f4780`)}, ${S(`#a8677f`)}, smoothstep(.2, .9, n.y));
  c = mix(c, ${S(`#e8968f`)}, lit);
  c += ${S(`#ffd2b4`)} * pow(max(ndl, 0.), 2.5) * v_s * .42;
  // A fine grain near the viewer, so the sand doesn't look like plastic.
  float g = fract(sin(dot(floor(v_p.xz * 46.), vec2(12.9898, 78.233))) * 43758.5453);
  c *= 1. + (g - .5) * .09 * near;
  float haze = 1. - exp(-d / 300.);
  c = mix(c, ${S(`#ffa992`)}, haze * .92);
  o = vec4(c, 1.);
}`,se=`${E}
in vec3 a_p; in vec3 a_n; in int a_k; in float a_ao; uniform mat4 u_vp; uniform float u_pop;
out vec3 v_p; out vec3 v_n; flat out int v_k; out float v_ao;
void main() {
  v_p = a_p / 8192.;
  v_n = a_n;
  v_k = a_k;
  v_ao = a_ao;
  vec3 w = v_p * vec3(u_pop, u_pop, u_pop);
  gl_Position = u_vp * vec4(w, 1.);
}`,ce=`${E}${D}
in vec3 v_p; in vec3 v_n; flat in int v_k; in float v_ao; uniform vec3 u_cam; uniform float u_dusk, u_open, u_t; out vec4 o;
vec3 studio(vec3 r) {
  vec3 c = mix(vec3(.36, .44, .46), vec3(.9, .96, 1.), smoothstep(-.3, .9, r.y));
  c += vec3(1.5, 1.45, 1.35) * smoothstep(.72, .93, dot(r, normalize(vec3(-.62, .55, .56))));
  c += vec3(.9, .95, 1.) * smoothstep(.09, .01, abs(r.x - .74)) * smoothstep(-.3, .25, r.y);
  return c;
}
vec3 duskEnv(vec3 r) {
  float f = clamp((r.y + .06) / .38, 0., 1.);
  vec3 c = mix(${S(`#ffb08e`)}, ${S(`#e46fb0`)}, smoothstep(.05, .3, f));
  c = mix(c, ${S(`#3d2c80`)}, smoothstep(.3, .85, f));
  c = mix(${S(`#b5707f`)}, c, smoothstep(-.1, .02, r.y));
  c += vec3(1.4, 1.05, .8) * pow(max(dot(r, SUN), 0.), 18.);
  return c;
}
void main() {
  vec3 n = normalize(v_n), v = normalize(u_cam - v_p), r = reflect(-v, n);
  float ndv = clamp(dot(n, v), 0., 1.);
  vec3 env = mix(studio(r), duskEnv(r), u_dusk);
  float ao = mix(.42, 1., pow(v_ao, .75));
  vec3 amb = mix(mix(vec3(.62, .66, .66), vec3(1.02), n.y * .5 + .5), mix(vec3(.46, .3, .44), vec3(.74, .56, .74), n.y * .5 + .5), u_dusk);
  vec3 keyD = mix(normalize(vec3(-.58, .6, .56)), SUN, u_dusk);
  vec3 keyC = mix(vec3(.58, .56, .52), vec3(1.05, .76, .58), u_dusk);
  vec3 lit = (amb + keyC * max(dot(n, keyD), 0.)) * ao;
  vec3 to = vec3(0., .95, PLANE - .2) - v_p;
  float l = length(to);
  to /= l;
  vec3 sc = mix(${S(`#ffa58f`)}, ${S(`#b98cff`)}, smoothstep(.5, 1.9, v_p.y));
  vec3 spill = sc * max(dot(n, to), 0.) / (.45 + l * l * 1.15) * u_open * mix(1., .4, u_dusk);
  vec3 c;
  if (v_k == 0) {
    float pool = .5 + .5 * sin(v_p.x * 4.1 + v_p.y * 3.3 + sin(v_p.y * 7.1) * .6);
    vec3 base = mix(${S(`#0c6a65`)}, ${S(`#127f78`)}, pool);
    float F = .05 + .95 * pow(1. - ndv, 5.);
    c = base * lit * 1.02 + base * spill * .8;
    c = mix(c, env, F * .85) + env * .045 * ao;
  } else if (v_k == 1) {
    c = vec3(.98, .93, .89) * lit * .66 + spill * 1.05;
  } else if (v_k == 2) {
    float sp = fract(sin(dot(floor(v_p.xy * 160.), vec2(12.9898, 78.233))) * 43758.5453);
    vec3 gold = ${S(`#ffd685`)} * (.92 + sp * .16);
    c = gold * (env * .95 + .3) * mix(.6, 1., ao) + spill * .4;
  } else {
    float gr = .5 + .5 * sin(v_p.x * 21. + sin(v_p.z * 17.) * 2.);
    c = mix(${S(`#f0d3c2`)}, ${S(`#f9e2d3`)}, gr) * lit * .66 + spill * .6;
    c += env * (.03 + .1 * pow(1. - ndv, 5.));
  }
  o = vec4(c, 1.);
}`,le=`${E}
in vec3 a_p; uniform mat4 u_vp; uniform float u_open; out float v_e;
void main() {
  v_e = a_p.z;
  vec2 q = vec2(a_p.x, a_p.y - .9) * u_open + vec2(0., .9);
  gl_Position = u_vp * vec4(q, ${g.plane.toFixed(3)}, 1.);
}`,ue=`${E}
out vec4 o;
void main() { o = vec4(0.); }`,de=`${E}${D}
in vec3 v_d; uniform vec3 u_cam; uniform float u_open; out vec4 o;
void main() {
  if (abs(v_d.z) < 1e-5) discard;
  float t = (PLANE - u_cam.z) / v_d.z;
  if (t <= 0.) discard;
  vec2 h = (u_cam + v_d * t).xy;
  h = vec2(h.x, h.y - .9) / max(u_open, 1e-3) + vec2(0., .9);
  float hw = ${(g.hw+_).toFixed(3)}, arc = ${g.arc.toFixed(3)}, y0 = ${(g.y0-_).toFixed(3)};
  if (h.y < y0 || abs(h.x) > hw) discard;
  if (h.y > arc && length(h - vec2(0., arc)) > hw) discard;
  o = vec4(0.);
}`,fe=`${E}
in float v_e; uniform float u_t, u_a; out vec4 o;
void main() {
  float e = pow(v_e, 11.);
  float s = .8 + .2 * sin(v_e * 22. - u_t * 2.2);
  vec3 c = mix(${S(`#ff8fd0`)}, ${S(`#ffe2a0`)}, e) * e * s;
  o = vec4(c * u_a * .3, 0.);
}`,pe=`${E}
in vec2 a_c; uniform mat4 u_vp, u_model; out vec2 v_c; out vec3 v_p;
void main() {
  v_c = a_c;
  vec4 w = u_model * vec4(a_c.x, 0., a_c.y, 1.);
  v_p = w.xyz;
  gl_Position = u_vp * w;
}`,me=`${E}${D}
in vec2 v_c; in vec3 v_p; uniform int u_mode; uniform float u_a, u_t; out vec4 o;
void main() {
  vec3 col = vec3(0.);
  float a = 0.;
  if (u_mode == 0) {
    // The plinth's contact shadow.
    float d = length(max(abs(v_c) - vec2(.7), 0.)) / .3;
    a = (1. - smoothstep(0., 1., d)) * .42;
    col = vec3(0., .05, .07) * a;
  } else if (u_mode == 1) {
    // The long soft shadow the hero's key light throws to the right.
    vec2 q = (v_c - vec2(-.68, 0.)) * vec2(.72, 1.7);
    a = exp(-dot(q, q) * 1.9) * .26 * smoothstep(1., .75, length(v_c));
    col = vec3(0., .06, .09) * a;
  } else if (u_mode == 2) {
    // The other world's light falling on the real floor in front of the opening.
    float g = exp(-dot(v_c, v_c) * 3.2) * smoothstep(1., .55, length(v_c));
    a = g * .22;
    col = vec3(1., .44, .66) * g * .3;
  } else {
    // The aiming ring.
    float r = length(v_c);
    float beat = .5 + .5 * sin(u_t * 3.);
    float ring = smoothstep(.09, .03, abs(r - .62 - beat * .05));
    float spin = atan(v_c.y, v_c.x) + u_t * .8;
    float dash = smoothstep(.15, .45, sin(spin * 6.) * .5 + .5);
    float inner = smoothstep(.05, .02, abs(r - .2));
    float glow = exp(-r * r * 4.) * .22;
    a = max(ring * dash, inner) ;
    col = mix(${S(`#ffd65c`)}, ${S(`#ffffff`)}, inner) * a + ${S(`#fa2a6f`)} * glow;
    a = a * .9;
  }
  o = vec4(col, a) * u_a;
}`,M=`
uniform mat4 u_vp, u_model; uniform float u_t, u_ph; uniform vec3 u_cam;
float pulse() { float k = .5 + .5 * sin(u_t * 1.55 + u_ph); return k * k; }
`,he=`${E}${M}
in vec3 a_p; in vec2 a_s; out vec3 v_p; out vec3 v_n; out vec2 v_s;
void main() {
  float k = pulse();
  vec3 p = a_p;
  p.xz *= 1. - .17 * k * a_s.x;
  p.y *= 1. + .09 * k;
  vec4 w = u_model * vec4(p, 1.);
  v_p = w.xyz;
  v_n = mat3(u_model) * (a_p * vec3(1., 1.3, 1.));
  v_s = a_s;
  gl_Position = u_vp * w;
}`,ge=`${E}${D}
in vec3 v_p; in vec3 v_n; in vec2 v_s; uniform vec3 u_cam, u_bell, u_rim, u_core; uniform float u_clip, u_a; out vec4 o;
void main() {
  if (u_clip * (v_p.z - PLANE) < 0.) discard;
  vec3 n = normalize(v_n), v = normalize(u_cam - v_p);
  float f = pow(1. - abs(dot(n, v)), 1.5);
  float canal = pow(.5 + .5 * cos(v_s.y * 16.), 8.) * smoothstep(.15, .7, v_s.x);
  float skirt = smoothstep(.82, 1., v_s.x);
  vec3 c = u_bell * (.3 + 1.05 * f + .3 * canal) + u_rim * skirt * .4;
  c = mix(c, u_core, pow(1. - v_s.x, 4.) * .3);
  float a = clamp(.1 + .62 * f + .12 * canal + skirt * .22, 0., 1.);
  o = vec4(c * a, a * .82) * u_a;
}`,_e=`${E}${M}
in vec3 a_b; in vec4 a_i; uniform vec2 u_drift; uniform float u_px; out vec2 v_u; out vec3 v_p; out float v_kind;
vec3 at(float s) {
  float ph = a_i.z, len = a_i.w, t = u_t * 1.05 + ph;
  vec3 p = a_b;
  float kind = a_i.y;
  if (kind > .5) {
    // An oral arm: a slow frilly spiral under the bell.
    float a = ph + s * 4.4 + sin(u_t * .6 + ph) * .3;
    float rad = (.1 + .16 * s) * (1. + .35 * sin(s * 19. + ph));
    p = vec3(cos(a) * rad, -.1 - s * 1.5, sin(a) * rad);
  } else {
    p.xz *= 1. - .25 * s - .12 * pulse() * (1. - s);
    p.y -= s * len;
    p.x += sin(t + s * 6.4) * .24 * s;
    p.z += cos(t * .83 + s * 5.2) * .24 * s;
  }
  p.xz -= u_drift * s * s * (kind > .5 ? 1.2 : len * .55);
  return (u_model * vec4(p, 1.)).xyz;
}
void main() {
  float s = a_i.x;
  vec3 c = at(s), d = at(s + .03) - c;
  vec3 v = u_cam - c;
  vec3 side = normalize(cross(d, v));
  float dist = length(v);
  float r = length(u_model[0].xyz);
  float kind = a_i.y;
  float w = (kind > .5 ? .036 : .011) * r * (1. - s * .72) * (1. + sin(s * 40. + a_i.z) * .12);
  w = max(w, dist * u_px);
  vec3 q = c + side * w * (gl_VertexID % 2 == 0 ? -1. : 1.);
  v_u = vec2(gl_VertexID % 2 == 0 ? -1. : 1., s);
  v_p = q;
  v_kind = kind;
  gl_Position = u_vp * vec4(q, 1.);
}`,ve=`${E}${D}
in vec2 v_u; in vec3 v_p; in float v_kind; uniform vec3 u_ten, u_core; uniform float u_clip, u_a; out vec4 o;
void main() {
  if (u_clip * (v_p.z - PLANE) < 0.) discard;
  float e = 1. - abs(v_u.x);
  float a = smoothstep(0., .7, e) * (1. - v_u.y * v_u.y * .92) * (v_kind > .5 ? .72 : .8);
  vec3 c = mix(u_ten, u_core, v_kind);
  o = vec4(c * a * .9, a * .55) * u_a;
}`,ye=`${E}${M}
in vec3 a_b; in vec4 a_i; uniform vec3 u_right, u_up, u_bell, u_core, u_rim; out vec2 v_c; out vec3 v_col; out vec3 v_p; out float v_pow; out float v_al;
void main() {
  float k = pulse();
  vec3 b = a_b;
  float kind = a_i.w;
  if (kind > 1.5) { b.xz *= 1. - .17 * k; }
  vec4 w = u_model * vec4(b, 1.);
  float r = length(u_model[0].xyz);
  v_c = a_i.xy;
  v_p = w.xyz;
  float size = a_i.z * r;
  if (kind < .5) {
    v_col = u_bell * (.2 + .1 * k);
    v_pow = 2.6;
    v_al = .22;
  } else if (kind < 1.5) {
    v_col = u_core * (.62 + .3 * k);
    v_pow = 1.6;
    v_al = .7;
  } else {
    v_col = u_rim * .95;
    v_pow = 1.4;
    v_al = .8;
  }
  gl_Position = u_vp * vec4(w.xyz + (u_right * a_i.x + u_up * a_i.y) * size, 1.);
}`,be=`${E}${D}
in vec2 v_c; in vec3 v_col; in vec3 v_p; in float v_pow; in float v_al; uniform float u_clip, u_a; out vec4 o;
void main() {
  if (u_clip * (v_p.z - PLANE) < 0.) discard;
  float a = pow(max(1. - length(v_c), 0.), v_pow);
  // Part glow and part paint, so it keeps its colour over a bright room as well as a dark sky.
  o = vec4(v_col * a, a * v_al) * u_a;
}`,xe=`${E}
in vec3 a_a; in vec4 a_i; uniform mat4 u_vp; uniform float u_t, u_h, u_mode; out float v_a; out float v_k;
void main() {
  vec3 p;
  float seed = a_i.w;
  float a;
  if (u_mode < .5) {
    float life = fract(u_t * a_i.z + seed);
    p = a_a + vec3(a_i.x, a_i.y, .5 + seed * .8) * life;
    p.x += sin(u_t * .7 + seed * 40.) * .05;
    a = sin(life * 3.14159);
  } else if (u_mode < 1.5) {
    p = a_a + vec3(sin(u_t * .19 + seed * 30.), sin(u_t * .23 + seed * 50.) * .5, cos(u_t * .17 + seed * 70.)) * .9;
    a = .55 + .45 * sin(u_t * 1.3 + seed * 90.);
  } else {
    // The burst, driven by u_t from 0 to 1.
    float t = u_t;
    p = a_a * vec3(.3 + t * 2.4 * a_i.z, 0., .3 + t * 2.4 * a_i.z);
    p.y = a_i.y * t * 2.8 - t * t * 1.3 + .1;
    a = (1. - t) * (1. - t);
  }
  v_a = a;
  v_k = seed;
  vec4 c = u_vp * vec4(p, 1.);
  gl_Position = c;
  gl_PointSize = clamp(u_h * (.018 + seed * .018) / c.w, 1.2, 26.);
}`,Se=`${E}
in float v_a; in float v_k; out vec4 o;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float g = pow(max(1. - d, 0.), 1.8);
  vec3 c = mix(${S(`#e8fdff`)}, ${S(`#ffe6a6`)}, step(.6, v_k));
  o = vec4(c * g * v_a * 1.2, 0.);
}`;function N(e,t,n){let r=(t,n)=>{let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(`Shader: ${e.getShaderInfoLog(r)}`);return r},i=e.createProgram();if(e.attachShader(i,r(e.VERTEX_SHADER,t)),e.attachShader(i,r(e.FRAGMENT_SHADER,n)),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))throw Error(`Link: ${e.getProgramInfoLog(i)}`);let a={},o=e.getProgramParameter(i,e.ACTIVE_UNIFORMS);for(let t=0;t<o;t++){let n=e.getActiveUniform(i,t).name;a[n]=e.getUniformLocation(i,n)}return{p:i,u:a}}function Ce(){let e=(e,t,n)=>{let r=T(n),i=[0,1,2].map(()=>[.4+r()*.6,t*(.7+r()),t*(.9+r()*1.3),r()*6.28]),a=e=>{let t=e-Math.floor(e);return t<.7?(t/.7)**1.6:((1-t)/.3)**.9};return(n,r)=>{let o=0;for(let e of i)o+=e[0]*Math.sin(n/e[1]+r/e[2]+e[3]);let s=(n*.62+r*.78)/t+.3*o,c=(n*-.42+r*.91)/(t*.43)+.22*o+1.3,l=.65+.35*Math.sin(n/(t*1.9)+1.3)*Math.sin(r/(t*2.6)+.4);return e*(a(s)*l+.28*a(c))}},t=e(1.9,9,3),n=e(17,80,8),r=(e,r)=>{let i=Math.hypot(e,r),a=C((i-4.5)/15)**1.5,o=.14*h-.03+t(e,r)*a-1.1*a,s=w(34,120,i);if(s<=0)return o;let c=-7+n(e,r)*C((i-40)/120);return o*(1-s)+c*s},i=new Float32Array(67235),a=Math.hypot(v[0],v[2]),o=v[0]/a,s=v[2]/a,c=v[1]/a,l=0;for(let e=0;e<=84;e++){let t=1100*(e/84)**2.7;for(let e=0;e<=112;e++){let n=e/112*Math.PI*2,a=t*Math.cos(n),u=t*Math.sin(n),d=r(a,u),f=Math.max(.2,t*.012),p=r(a-f,u)-r(a+f,u),m=r(a,u+f)-r(a,u-f),h=Math.hypot(p,2*f,m),_=1;if(t<700)for(let e=.8,t=0;t<12;t++,e*=1.6){let t=r(a+o*e,u-s*e)-(d+c*e);if(t>0&&(_=Math.min(_,1-C(t/(.12+e*.05)))),_<=0)break}i[l++]=a,i[l++]=d,i[l++]=g.plane-u,i[l++]=p/h,i[l++]=2*f/h,i[l++]=m/h,i[l++]=_}}let u=[],d=(e,t)=>{for(let n=0;n<84;n++)for(let r=e;r<t;r++){let e=n*113+r,t=e+1,i=e+113,a=i+1;u.push(e,i,t,t,i,a)}};d(0,56);let f=u.length;return d(56,112),{data:i,index:new Uint16Array(u),backCount:f}}function we(){let e=[],t=[];for(let t=0;t<=12;t++){let n=t/12,r=n*Math.PI*.59,i=.78*Math.cos(r),a=C((.25-Math.cos(r))/.43);for(let t=0;t<=26;t++){let o=t/26*Math.PI*2,s=Math.sin(r)*(1+.06*a+.06*a*Math.sin(o*16));e.push(s*Math.cos(o),i-.05*a*(.5+.5*Math.cos(o*16)),s*Math.sin(o),n,o)}}for(let e=0;e<12;e++)for(let n=0;n<26;n++){let r=e*27+n,i=r+1,a=r+26+1,o=a+1;t.push(r,a,i,i,a,o)}return{data:new Float32Array(e),index:new Uint16Array(t)}}function Te(){let e=T(9),t=[],n=[],r=0,i=(e,i,a,o,s,c)=>{for(let l=0;l<=16;l++){let u=l/16;for(let n=0;n<2;n++)t.push(e,i,a,u,o,s,c);if(l<16){let e=r+l*2;n.push(e,e+1,e+2,e+2,e+1,e+3)}}r+=34};for(let t=0;t<13;t++){let n=t/13*Math.PI*2+(e()-.5)*.2;i(Math.cos(n)*1.02,-.18,Math.sin(n)*1.02,0,e()*6.28,1.8+e()*2.4)}for(let e=0;e<4;e++)i(0,0,0,1,e*Math.PI/2+.2,1.9);return{data:new Float32Array(t),index:new Uint16Array(n)}}function Ee(){let e=[],t=[],n=0,r=(r,i,a,o,s)=>{for(let[t,n]of[[-1,-1],[1,-1],[1,1],[-1,1]])e.push(r,i,a,t,n,o,s);t.push(n,n+1,n+2,n,n+2,n+3),n+=4};r(0,.1,0,3,0);for(let e=0;e<4;e++){let t=e*Math.PI/2+.4;r(Math.cos(t)*.22,.2,Math.sin(t)*.22,.34,1)}for(let e=0;e<26;e++){let t=e/26*Math.PI*2;r(Math.cos(t)*1.08,-.2,Math.sin(t)*1.08,.075,2)}return{data:new Float32Array(e),index:new Uint16Array(t)}}var P=(e,t,n,r,i,a,o,s,c)=>({p:e,r:t,bell:x(n),core:x(r),rim:x(i),ten:x(c??i),tilt:a,drift:o,ph:s}),F=g.plane,De=[P([-.95,1.1,F-4.4],.34,`#a7b4ff`,`#ffd27a`,`#eef0ff`,[-.14,.2],[-.2,0],.6),P([.1,2.15,F-10],.62,`#ff8fe0`,`#ffe27a`,`#ffd3f3`,[.2,-.17],[.3,.1],2.2),P([3.1,3.3,F-21],1.45,`#7af0ff`,`#ff8ad8`,`#d7fdff`,[.1,-.1],[.2,0],4.1),P([-3.1,2.2,F+4.6],.6,`#ff8fe0`,`#ffe27a`,`#ffd3f3`,[.14,.2],[.25,0],1.1),P([3.9,3,F+8.4],1.05,`#7af0ff`,`#ff8ad8`,`#d7fdff`,[-.2,.1],[-.3,0],3.3),P([-7,3.5,F-3.6],1.3,`#a7b4ff`,`#ffd27a`,`#eef0ff`,[.1,.25],[.2,.2],5.2),P([5.6,1.9,F-3.2],.7,`#ff8fe0`,`#ffe27a`,`#ffd3f3`,[-.15,-.2],[-.2,.1],.2),P([-1.6,5.2,F+1.8],1.7,`#7af0ff`,`#ff8ad8`,`#d7fdff`,[.08,.12],[.1,0],2.9)],I=[[.1,1.15,F-1.7],[-.2,1.42,F],[-.55,1.75,.28],[-.88,2.1,.56]];function Oe(e){let t=C(e/12),n=t*t*(3-2*t)*(I.length-1),r=Math.min(I.length-2,Math.floor(n)),i=n-r,a=I[Math.max(0,r-1)],o=I[r],s=I[r+1],c=I[Math.min(I.length-1,r+2)],l=e=>.5*(2*o[e]+(s[e]-a[e])*i+(2*a[e]-5*o[e]+4*s[e]-c[e])*i*i+(3*o[e]-a[e]-3*s[e]+c[e])*i*i*i),u=w(9,12,e);return[l(0)+Math.sin(e*.37)*.14*u,l(1)+Math.sin(e*.61)*.1*u,l(2)+Math.cos(e*.29)*.1*u]}function ke(e,t,n){let a={sky:N(e,O,k),star:N(e,A,j),sprite:N(e,ee,te),planet:N(e,ne,re),ring:N(e,ne,ie),dune:N(e,ae,oe),arch:N(e,se,ce),stencil:N(e,le,ue),stencilRay:N(e,O,de),veil:N(e,le,fe),fx:N(e,pe,me),bell:N(e,he,ge),ribbon:N(e,_e,ve),jsprite:N(e,ye,be),mote:N(e,xe,Se)},s=e.createVertexArray(),d=(t,n,r,i,a,o=0)=>{let s=e.createVertexArray();e.bindVertexArray(s),e.bindBuffer(e.ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ARRAY_BUFFER,n,e.STATIC_DRAW);for(let[n,a,o,s,c,l]of r){let r=e.getAttribLocation(t.p,n);r<0||(e.enableVertexAttribArray(r),l?e.vertexAttribIPointer(r,a,o,i,s):e.vertexAttribPointer(r,a,o,!!c,i,s))}return a&&(e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW)),e.bindVertexArray(null),{vao:s,count:a?a.length:o,index:!!a}},f=new Uint32Array(t,0,2),p=f[0],h=f[1],y=8+p*6,b=y+p*3,x=b+p,S=x+p,E=S+((S-8)%2?1:0),D=e.createVertexArray();e.bindVertexArray(D);let M=(t,n,r,i,o,s=!1)=>{let c=e.getAttribLocation(a.arch.p,t);e.bindBuffer(e.ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ARRAY_BUFFER,n,e.STATIC_DRAW),e.enableVertexAttribArray(c),s?e.vertexAttribIPointer(c,r,i,0,0):e.vertexAttribPointer(c,r,i,o,0,0)};M(`a_p`,new Int16Array(t,8,p*3),3,e.SHORT,!1),M(`a_n`,new Int8Array(t,y,p*3),3,e.BYTE,!0),M(`a_k`,new Int8Array(t,b,p),1,e.BYTE,!1,!0),M(`a_ao`,new Uint8Array(t,x,p),1,e.UNSIGNED_BYTE,!0),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ELEMENT_ARRAY_BUFFER,new Uint16Array(t.slice(E,E+h*2)),e.STATIC_DRAW),e.bindVertexArray(null);let I=[0,(g.y0+g.arc)/2+.1,0],ke=g.hw+_,Ae=g.y0-_;I.push(ke,Ae,1);for(let e=0;e<=48;e++){let t=e/48*Math.PI;I.push(Math.cos(t)*ke,g.arc+Math.sin(t)*ke,1)}I.push(-ke,Ae,1,ke,Ae,1);let L=d(a.stencil,new Float32Array(I),[[`a_p`,3,e.FLOAT,0]],0,void 0,I.length/3),R=new Float32Array([-1,-1,1,-1,-1,1,1,1]),z=d(a.fx,R,[[`a_c`,2,e.FLOAT,0]],0,void 0,4),je=d(a.sprite,R,[[`a_c`,2,e.FLOAT,0]],0,void 0,4),Me=Ce(),Ne=d(a.dune,Me.data,[[`a_p`,3,e.FLOAT,0],[`a_n`,4,e.FLOAT,12]],28,Me.index),Pe=Me.backCount,Fe=Me.index.length,Ie=T(21),Le=[];for(let e=0;e<1100;e++){let e=Ie()*.95+.05,t=Ie()*Math.PI*2,n=Math.sqrt(1-e*e);Le.push(Math.cos(t)*n,e,Math.sin(t)*n,Ie()**2.2,Ie())}let Re=d(a.star,new Float32Array(Le),[[`a_d`,3,e.FLOAT,0],[`a_s`,2,e.FLOAT,12]],20,void 0,1100),ze=[],Be=[];for(let e=0;e<=28;e++){let t=e/28*Math.PI;for(let e=0;e<=44;e++){let n=e/44*Math.PI*2;ze.push(Math.sin(t)*Math.cos(n),Math.cos(t),Math.sin(t)*Math.sin(n))}}for(let e=0;e<28;e++)for(let t=0;t<44;t++){let n=e*45+t,r=n+1,i=n+44+1,a=i+1;Be.push(n,r,i,r,a,i)}let Ve=d(a.planet,new Float32Array(ze),[[`a_p`,3,e.FLOAT,0]],0,new Uint16Array(Be)),He=[];for(let e=0;e<=96;e++){let t=e/96*Math.PI*2;He.push(Math.cos(t)*1.35,0,Math.sin(t)*1.35,Math.cos(t)*2.35,0,Math.sin(t)*2.35)}let Ue=d(a.ring,new Float32Array(He),[[`a_p`,3,e.FLOAT,0]],0,void 0,He.length/3),B=1700,We=B*Math.tan(7.4*Math.PI/180),Ge=m([Math.sin(.035),Math.sin(.085),-Math.cos(.085)]),V=[Ge[0]*B,Ge[1]*B+1.4,Ge[2]*B+F],Ke=r(l(-.28),c(.3)),qe=r(r(o(V[0],V[1],V[2]),Ke),u(We)),Je=[v[0]*3e3,v[1]*3e3,v[2]*3e3],H=we(),U=d(a.bell,H.data,[[`a_p`,3,e.FLOAT,0],[`a_s`,2,e.FLOAT,12]],20,H.index),W=Te(),Ye=d(a.ribbon,W.data,[[`a_b`,3,e.FLOAT,0],[`a_i`,4,e.FLOAT,12]],28,W.index),Xe=Ee(),G=d(a.jsprite,Xe.data,[[`a_b`,3,e.FLOAT,0],[`a_i`,4,e.FLOAT,12]],28,Xe.index),Ze=P([0,0,0],.26,`#5cecff`,`#ff6fd8`,`#d4fdff`,[-.24,-.34],[-.5,-.15],1.7,`#8ff1ff`),K=T(5),Qe=[];for(let e=0;e<46;e++){let e=(K()-.5)*.8,t=.35+K()*1.25;Qe.push(e,t,F+.02,-.5-K()*.7,.5+K()*.9,.05+K()*.05,K())}let $e=d(a.mote,new Float32Array(Qe),[[`a_a`,3,e.FLOAT,0],[`a_i`,4,e.FLOAT,12]],28,void 0,46),q=[];for(let e=0;e<240;e++)q.push((K()-.5)*34,.2+K()*5,F+(K()-.5)*34,0,0,0,K());let et=d(a.mote,new Float32Array(q),[[`a_a`,3,e.FLOAT,0],[`a_i`,4,e.FLOAT,12]],28,void 0,240),tt=[];for(let e=0;e<70;e++){let e=K()*Math.PI*2;tt.push(Math.cos(e),0,Math.sin(e),0,.6+K()*1.2,.5+K()*.7,K())}let nt=d(a.mote,new Float32Array(tt),[[`a_a`,3,e.FLOAT,0],[`a_i`,4,e.FLOAT,12]],28,void 0,70),J=(t,n=e.TRIANGLES)=>{e.bindVertexArray(t.vao),t.index?e.drawElements(n,t.count,e.UNSIGNED_SHORT,0):e.drawArrays(n,0,t.count)};function rt(t,d,f,p){e.clearColor(0,0,0,0),e.clearDepth(1),e.clearStencil(0),e.depthMask(!0),e.colorMask(!0,!0,!0,!0),e.stencilMask(255),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT|e.STENCIL_BUFFER_BIT),e.enable(e.DEPTH_TEST),e.depthFunc(e.LEQUAL),e.disable(e.STENCIL_TEST),e.disable(e.BLEND),e.enable(e.CULL_FACE),e.cullFace(e.BACK);let g=p.t,_=()=>{e.enable(e.BLEND),e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA),e.depthMask(!1)},v=()=>{e.disable(e.BLEND),e.depthMask(!0)},y=()=>{if(!p.reticle)return;let n=r(d,t);_(),e.disable(e.CULL_FACE),e.useProgram(a.fx.p),e.uniformMatrix4fv(a.fx.u.u_vp,!1,n),e.uniformMatrix4fv(a.fx.u.u_model,!1,r(p.reticle,new Float32Array([.75,0,0,0,0,1,0,0,0,0,.75,0,0,.004,0,1]))),e.uniform1i(a.fx.u.u_mode,3),e.uniform1f(a.fx.u.u_a,1),e.uniform1f(a.fx.u.u_t,g),J(z,e.TRIANGLE_STRIP),e.enable(e.CULL_FACE),v()};if(!p.place){y();return}let b=r(t,p.place),x=i(b),S=[x[12],x[13],x[14]],T=r(d,b),E=i(T),O=[b[0],b[4],b[8]],k=[b[1],b[5],b[9]],A=S[2]-F,j=C(p.open),ee=(t,n,r,i,o,s)=>{let c=a.fx;e.uniformMatrix4fv(c.u.u_model,!1,new Float32Array([i,0,0,0,0,1,0,0,0,0,o,0,n,.003,r,1])),e.uniform1i(c.u.u_mode,t),e.uniform1f(c.u.u_a,s),e.uniform1f(c.u.u_t,g),J(z,e.TRIANGLE_STRIP)},te=()=>{let t=a.arch;e.useProgram(t.p),e.uniformMatrix4fv(t.u.u_vp,!1,T),e.uniform3fv(t.u.u_cam,S),e.uniform1f(t.u.u_pop,p.pop),e.uniform1f(t.u.u_dusk,p.dusk),e.uniform1f(t.u.u_open,j),e.uniform1f(t.u.u_t,g),e.bindVertexArray(D),e.drawElements(e.TRIANGLES,h,e.UNSIGNED_SHORT,0)},ne=()=>{if(e.enable(e.STENCIL_TEST),e.stencilFunc(e.ALWAYS,1,255),e.stencilOp(e.KEEP,e.KEEP,e.REPLACE),e.colorMask(!1,!1,!1,!1),e.depthMask(!1),e.disable(e.CULL_FACE),Math.abs(A)<.5){let t=a.stencilRay;e.useProgram(t.p),e.uniformMatrix4fv(t.u.u_ivp,!1,E),e.uniform3fv(t.u.u_cam,S),e.uniform1f(t.u.u_open,j),e.bindVertexArray(s),e.drawArrays(e.TRIANGLES,0,3)}else{let t=a.stencil;e.useProgram(t.p),e.uniformMatrix4fv(t.u.u_vp,!1,T),e.uniform1f(t.u.u_open,j),J(L,e.TRIANGLE_FAN)}e.colorMask(!0,!0,!0,!0),e.depthMask(!0),e.stencilOp(e.KEEP,e.KEEP,e.KEEP)},re=(t,n,i,s=1)=>{let p=Math.sin(g*.42+t.ph)*.1*t.r*2,m=r(r(r(o(n[0],n[1]+p,n[2]),l(t.tilt[1])),c(t.tilt[0])),u(t.r));e.disable(e.CULL_FACE);let h=n=>{e.useProgram(n.p),e.uniformMatrix4fv(n.u.u_vp,!1,T),e.uniformMatrix4fv(n.u.u_model,!1,m),e.uniform1f(n.u.u_t,g),e.uniform1f(n.u.u_ph,t.ph),e.uniform1f(n.u.u_clip,i),e.uniform1f(n.u.u_a,s),n.u.u_cam&&e.uniform3fv(n.u.u_cam,S)};h(a.jsprite),e.uniform3fv(a.jsprite.u.u_right,O),e.uniform3fv(a.jsprite.u.u_up,k),e.uniform3fv(a.jsprite.u.u_bell,t.bell),e.uniform3fv(a.jsprite.u.u_core,t.core),e.uniform3fv(a.jsprite.u.u_rim,t.rim),J(G),h(a.ribbon),e.uniform2f(a.ribbon.u.u_drift,t.drift[0],t.drift[1]),e.uniform1f(a.ribbon.u.u_px,.9/(d[5]*f*.5)),e.uniform3fv(a.ribbon.u.u_ten,t.ten),e.uniform3fv(a.ribbon.u.u_core,t.core),J(Ye),h(a.bell),e.uniform3fv(a.bell.u.u_bell,t.bell),e.uniform3fv(a.bell.u.u_rim,t.rim),e.uniform3fv(a.bell.u.u_core,t.core),J(U)},ie=(t,n,r)=>{let i=a.mote;e.useProgram(i.p),e.uniformMatrix4fv(i.u.u_vp,!1,T),e.uniform1f(i.u.u_t,r),e.uniform1f(i.u.u_h,f),e.uniform1f(i.u.u_mode,n),J(t,e.POINTS)},ae=t=>{e.disable(e.CULL_FACE),e.depthMask(!1);let r=a.sky;e.useProgram(r.p),e.uniformMatrix4fv(r.u.u_ivp,!1,E),e.uniform3fv(r.u.u_cam,S),e.bindVertexArray(s),e.drawArrays(e.TRIANGLES,0,3),_(),e.useProgram(a.star.p),e.uniformMatrix4fv(a.star.u.u_vp,!1,T),e.uniform3fv(a.star.u.u_cam,S),e.uniform1f(a.star.u.u_t,g),e.uniform1f(a.star.u.u_dpr,n),J(Re,e.POINTS);let i=a.sprite;e.useProgram(i.p),e.uniformMatrix4fv(i.u.u_vp,!1,T),e.uniform3fv(i.u.u_right,O),e.uniform3fv(i.u.u_up,k);let o=(t,n,r,a)=>{e.uniform3fv(i.u.u_center,t),e.uniform1f(i.u.u_size,n),e.uniform3fv(i.u.u_col,r),e.uniform1f(i.u.u_pow,a),J(je,e.TRIANGLE_STRIP)};o(Je,620,[.5,.36,.22],2.4),o(V,We*2.5,[.34,.15,.25],2.2),v(),e.useProgram(a.planet.p),e.uniformMatrix4fv(a.planet.u.u_vp,!1,T),e.uniformMatrix4fv(a.planet.u.u_model,!1,qe),e.uniform3fv(a.planet.u.u_view,m([S[0]-V[0],S[1]-V[1],S[2]-V[2]])),J(Ve),_(),e.useProgram(a.ring.p),e.uniformMatrix4fv(a.ring.u.u_vp,!1,T),e.uniformMatrix4fv(a.ring.u.u_model,!1,qe),e.uniform1f(a.ring.u.u_pr,We),J(Ue,e.TRIANGLE_STRIP),v();let c=a.dune;e.useProgram(c.p),e.uniformMatrix4fv(c.u.u_vp,!1,T),e.uniform3fv(c.u.u_cam,S),e.bindVertexArray(Ne.vao),t?e.drawElements(e.TRIANGLES,Fe,e.UNSIGNED_SHORT,0):A>=0?e.drawElements(e.TRIANGLES,Pe,e.UNSIGNED_SHORT,0):e.drawElements(e.TRIANGLES,Fe-Pe,e.UNSIGNED_SHORT,Pe*2),_(),ie(et,1,g);for(let e of De)(t||(A>=0?e.p[2]<F+e.r:e.p[2]>F-e.r))&&re(e,e.p,t?0:A>=0?-1:1);j>.05&&re(Ze,Oe(p.sinceOpen),t||A>=0?-1:0),v()},oe=()=>{_(),e.disable(e.CULL_FACE),e.useProgram(a.fx.p),e.uniformMatrix4fv(a.fx.u.u_vp,!1,T);let t=Math.min(1,p.pop);ee(1,1.5,.08,2.2*t,.95*t,1),ee(0,0,.17,1.2*t,.56*t,1),j>0&&(e.useProgram(a.fx.p),ee(2,0,1.1,1.3,1.3,j),ie($e,0,g*.9),re(Ze,Oe(p.sinceOpen),1)),p.burst>=0&&ie(nt,2,p.burst),e.enable(e.CULL_FACE),v()};e.enable(e.CULL_FACE),te(),j>0&&ne(),p.inside?(e.enable(e.STENCIL_TEST),e.stencilFunc(e.NOTEQUAL,1,255),ae(!0),e.stencilFunc(e.EQUAL,1,255),oe(),e.disable(e.STENCIL_TEST)):(j>0&&(e.stencilFunc(e.EQUAL,1,255),ae(!1),e.disable(e.STENCIL_TEST)),oe()),(()=>{if(j<=0)return;_(),e.disable(e.CULL_FACE);let t=a.veil;e.useProgram(t.p),e.uniformMatrix4fv(t.u.u_vp,!1,T),e.uniform1f(t.u.u_open,j),e.uniform1f(t.u.u_t,g),e.uniform1f(t.u.u_a,w(.15,.9,Math.abs(A))),J(L,e.TRIANGLE_FAN),e.enable(e.CULL_FACE),v()})(),y(),e.bindVertexArray(null)}return{draw:rt}}function Ae(e,t){let n=i(r(e,t));return[n[12],n[13],n[14]]}var L=null,R=null,z=null,je=!1;function Me(){try{L??=new AudioContext,L.resume(),R||(R=L.createGain(),R.gain.value=je?0:.8,R.connect(L.destination))}catch{L=null}}function Ne(e){je=e,R&&L&&R.gain.setTargetAtTime(e?0:.8,L.currentTime,.05)}function Pe(e,t,n,r,i=`sine`){if(!L||!R)return;let a=L.currentTime+t,o=L.createOscillator(),s=L.createGain();o.type=i,o.frequency.value=e,s.gain.setValueAtTime(0,a),s.gain.linearRampToValueAtTime(r,a+.012),s.gain.exponentialRampToValueAtTime(8e-4,a+n),o.connect(s).connect(R),o.start(a),o.stop(a+n+.05)}function Fe(e,t,n,r){if(!L||!R)return;let i=Math.floor(L.sampleRate*e),a=L.createBuffer(1,i,L.sampleRate),o=a.getChannelData(0);for(let e=0;e<i;e++)o[e]=Math.random()*2-1;let s=L.createBufferSource();s.buffer=a;let c=L.createBiquadFilter();c.type=`bandpass`,c.Q.value=1.4;let l=L.currentTime;c.frequency.setValueAtTime(t,l),c.frequency.exponentialRampToValueAtTime(n,l+e);let u=L.createGain();u.gain.setValueAtTime(0,l),u.gain.linearRampToValueAtTime(r,l+e*.45),u.gain.linearRampToValueAtTime(0,l+e),s.connect(c).connect(u).connect(R),s.start(l)}function Ie(){Pe(70,0,.5,.5),Fe(1.1,300,4200,.16),[523.25,659.25,783.99,1046.5,1318.5].forEach((e,t)=>Pe(e,.45+t*.09,.8,.09,`triangle`))}function Le(){Fe(.9,500,5200,.28),[659.25,880,1108.73,1318.5,1760].forEach((e,t)=>Pe(e,.12+t*.075,.9,.11,`triangle`))}function Re(e){if(!L||!R)return;let t=L;if(e&&!z){let e=t.createGain();e.gain.value=0,e.gain.linearRampToValueAtTime(.1,t.currentTime+2.5),e.connect(R);let n=[110,164.81,220.6,329.63].map(n=>{let r=t.createOscillator();r.frequency.value=n;let i=t.createGain();i.gain.value=.32;let a=t.createOscillator(),o=t.createGain();return a.frequency.value=.06+Math.random()*.1,o.gain.value=.2,a.connect(o).connect(i.gain),r.connect(i).connect(e),r.start(),a.start(),[r,a]});z={gain:e,stop:()=>n.flat().forEach(e=>e.stop())}}else if(!e&&z){let e=z;z=null,e.gain.gain.setTargetAtTime(0,t.currentTime,.4),setTimeout(e.stop,1800)}}var ze=(e,t)=>r(o(e[0],e[1],e[2]),s(Math.atan2(t[0]-e[0],t[2]-e[2]))),Be=e=>{let t=Math.hypot(e[0],e[2])||1;return[e[0]/t,0,e[2]/t]},Ve=class{offset=[0,0,0];path=null;from=0;ms=1;moveAlong(e,t){this.path=e,this.from=performance.now(),this.ms=t}step(){if(!this.path)return;let e=Math.min(1,(performance.now()-this.from)/this.ms),t=e*e*e*(e*(e*6-15)+10),n=this.path.length-1,r=t*n,i=Math.min(n-1,Math.floor(r)),a=r-i,o=this.path[i],s=this.path[i+1];this.offset=[o[0]+(s[0]-o[0])*a,o[1]+(s[1]-o[1])*a,o[2]+(s[2]-o[2])*a],e>=1&&(this.path=null)}},He=class{gl;overlay;onEnd;kind=`webxr`;walks=!0;session=null;constructor(e,t,n){this.gl=e,this.overlay=t,this.onEnd=n}static async available(){try{return!!navigator.xr&&await navigator.xr.isSessionSupported(`immersive-ar`)}catch{return!1}}async start(e,t){let n=await navigator.xr.requestSession(`immersive-ar`,{requiredFeatures:[`hit-test`],optionalFeatures:[`dom-overlay`],domOverlay:{root:this.overlay}});this.session=n;let r=this.gl;await r.makeXRCompatible();let i=new XRWebGLLayer(n,r,{alpha:!0,antialias:!0,depth:!0,stencil:!0});n.updateRenderState({baseLayer:i,depthNear:y,depthFar:b});let a=await n.requestReferenceSpace(`local`),o=await n.requestReferenceSpace(`viewer`),s=await n.requestHitTestSource({space:o});n.addEventListener(`select`,t),n.addEventListener(`end`,()=>{this.session=null,this.onEnd()}),this.overlay.addEventListener(`beforexrselect`,e=>{e.target.closest(`button, a`)&&e.preventDefault()});let c=(t,r)=>{n.requestAnimationFrame(c);let o=r.getViewerPose(a);if(!o)return;let l=o.transform.position,u=[l.x,l.y,l.z],d=null;for(let e of r.getHitTestResults(s)){let t=e.getPose(a)?.transform;if(!(!t||t.matrix[5]<.85||t.position.y>u[1]-.5)){d=ze([t.position.x,t.position.y,t.position.z],u);break}}let f=o.transform.inverse.matrix;e({views:o.views.map(e=>{let t=i.getViewport(e);return{view:e.transform.inverse.matrix,proj:e.projectionMatrix,x:t.x,y:t.y,w:t.width,h:t.height}}),framebuffer:i.framebuffer,aim:d,camera:u,ahead:Be([-f[2],-f[6],-f[10]])})};n.requestAnimationFrame(c)}stop(){this.session?.end().catch(()=>{}),this.session=null}},Ue=-1.4,B=.22,We=65*Math.PI/180;function Ge(){let e=DeviceOrientationEvent.requestPermission;return e?e.call(DeviceOrientationEvent).then(e=>e===`granted`,()=>!1):Promise.resolve(!0)}var V=class{gl;video;surface;kind=`camera`;walks=!1;stream=null;raf=0;q=[0,0,0,1];target=null;glide=new Ve;yaw=0;pitch=0;off=[];constructor(e,t,n){this.gl=e,this.video=t,this.surface=n}get sensing(){return!!this.target}async open(){this.stream=await navigator.mediaDevices.getUserMedia({audio:!1,video:{facingMode:{ideal:`environment`},width:{ideal:1280},height:{ideal:720}}}),this.video.setAttribute(`playsinline`,``),this.video.setAttribute(`muted`,``),this.video.muted=!0,this.video.srcObject=this.stream,await this.video.play().catch(()=>{}),this.video.hidden=!1}moveAlong(e,t){this.glide.moveAlong(e,t)}base(){return this.glide.offset}fov(e,t){let n=this.video.videoWidth||1280,r=this.video.videoHeight||720,i=Math.max(e/n,t/r),a=Math.max(n,r)/2/Math.tan(We/2);return 2*Math.atan(t/i/2/a)}async start(e,t){let n=this.gl,l=(e,t,n,r)=>{e.addEventListener(t,n,r),this.off.push(()=>e.removeEventListener(t,n))},u=Math.SQRT1_2;l(window,`deviceorientation`,e=>{let t=e;if(t.alpha==null||t.beta==null||t.gamma==null)return;let n=Math.PI/180,r=t.beta*n,i=t.alpha*n,a=-t.gamma*n,o=Math.cos(r/2),s=Math.cos(i/2),c=Math.cos(a/2),l=Math.sin(r/2),d=Math.sin(i/2),p=Math.sin(a/2),m=[l*s*c+o*d*p,o*d*c-l*s*p,o*s*p-l*d*c,o*s*c+l*d*p],h=-((screen.orientation?.angle??window.orientation??0)*Math.PI/180)/2;this.target=f(f(m,[-u,0,0,u]),[0,0,Math.sin(h),Math.cos(h)])});let m=null,h=0;l(this.surface,`pointerdown`,e=>{let t=e;m=[t.clientX,t.clientY],h=0}),l(window,`pointermove`,e=>{let t=e;if(!m)return;let n=t.clientX-m[0],r=t.clientY-m[1];h+=Math.abs(n)+Math.abs(r),m=[t.clientX,t.clientY],this.target||(this.yaw+=n*.005,this.pitch=Math.max(-1.3,Math.min(1.3,this.pitch+r*.005)))}),l(window,`pointerup`,e=>{let n=e.target?.closest?.(`button, a`);m&&h<14&&!n&&t(),m=null});let g=()=>{this.raf=requestAnimationFrame(g),this.target&&(this.q=p(this.q,this.target,.42)),this.glide.step();let t=this.target?d(this.q):r(s(this.yaw),c(this.pitch)),l=[-t[8],-t[9],-t[10]],u=this.glide.offset,f=[u[0]+l[0]*B,u[1]+l[1]*B,u[2]+l[2]*B],m=r(o(f[0],f[1],f[2]),t),h=n.drawingBufferWidth,_=n.drawingBufferHeight,v=Math.hypot(l[0],l[2])||1,x=3.2;l[1]<-.05&&(x=Math.max(1.7,Math.min(4.2,(Ue-f[1])/l[1]*v)));let S=[f[0]+l[0]/v*x,Ue,f[2]+l[2]/v*x];e({views:[{view:i(m),proj:a(this.fov(h,_),h/_,y,b),x:0,y:0,w:h,h:_}],framebuffer:null,aim:ze(S,f),camera:f,ahead:Be(l)})};this.raf=requestAnimationFrame(g)}stop(){cancelAnimationFrame(this.raf);for(let e of this.off)e();this.off=[];for(let e of this.stream?.getTracks()??[])e.stop();this.stream=null,this.video.srcObject=null,this.video.hidden=!0}},Ke=1.45,qe=class{gl;surface;look;kind=`still`;walks=!1;raf=0;glide=new Ve;off=[];yaw=0;pitch=-.1;keys=new Set;touched=!1;last=0;constructor(e,t,n,r=[.5,Ke,3.1]){this.gl=e,this.surface=t,this.look=n,this.glide.offset=r}moveAlong(e,t){this.glide.moveAlong(e,t)}base(){return this.glide.offset}async start(e){let t=this.gl,n=(e,t,n)=>{e.addEventListener(t,n),this.off.push(()=>e.removeEventListener(t,n))},l=null;n(this.surface,`pointerdown`,e=>{let t=e;t.target.closest(`button, a`)||(l=[t.clientX,t.clientY])}),n(window,`pointermove`,e=>{let t=e;l&&=(this.touched=!0,this.yaw+=(t.clientX-l[0])*.004,this.pitch=Math.max(-1.2,Math.min(1.2,this.pitch+(t.clientY-l[1])*.004)),[t.clientX,t.clientY])}),n(window,`pointerup`,()=>l=null),n(window,`keydown`,e=>this.keys.add(e.key)),n(window,`keyup`,e=>this.keys.delete(e.key));let u=n=>{this.raf=requestAnimationFrame(u);let l=Math.min(.05,(n-this.last)/1e3||0);this.last=n,this.glide.step();let d=this.keys,f=(d.has(`ArrowUp`)||d.has(`w`)?1:0)-(d.has(`ArrowDown`)||d.has(`s`)?1:0),p=(d.has(`ArrowRight`)||d.has(`d`)?1:0)-(d.has(`ArrowLeft`)||d.has(`a`)?1:0);if(f||p){this.touched=!0;let e=Math.cos(this.yaw),t=Math.sin(this.yaw),n=l*1.5;this.glide.offset=[this.glide.offset[0]+(t*f+e*p)*n,this.glide.offset[1],this.glide.offset[2]+(-e*f+t*p)*n]}let m=this.glide.offset,h=m,g=this.yaw,_=this.pitch;this.look&&!this.touched&&(h=[m[0]+Math.sin(n*31e-5)*.7,m[1],m[2]],g=Math.atan2(this.look[0]-h[0],h[2]-this.look[2])*-1,_=Math.atan2(this.look[1]-h[1],Math.hypot(this.look[0]-h[0],this.look[2]-h[2])),this.yaw=g,this.pitch=_);let v=r(s(g),c(_)),x=r(o(h[0],h[1],h[2]),v),S=t.drawingBufferWidth,C=t.drawingBufferHeight;e({views:[{view:i(x),proj:a(S>C?.82:1.12,S/C,y,b),x:0,y:0,w:S,h:C}],framebuffer:null,aim:null,camera:h,ahead:Be([-v[8],-v[9],-v[10]])})};this.raf=requestAnimationFrame(u)}stop(){cancelAnimationFrame(this.raf);for(let e of this.off)e();this.off=[]}},Je=document.documentElement.lang.startsWith(`ar`),H=(e,t)=>Je?t:e,U={mark:H(`Sindibad
Studios`,`سندباد
استوديو`),title:H(`Step into another world`,`ادخل إلى عالم آخر`),sub:H(`Your phone's camera puts a portal right in the room you're in. Nothing to install.`,`تضع كاميرا هاتفك بوابة في الغرفة التي أنت فيها. من دون تثبيت أي شيء.`),open:H(`Open the portal`,`افتح البوابة`),why:H(`It needs your camera and motion sensors. Nothing is recorded or sent anywhere.`,`تحتاج البوابة إلى الكاميرا ومستشعرات الحركة. لا يُسجَّل شيء ولا يُرسَل إلى أي مكان.`),starting:H(`Opening…`,`لحظة…`),find:H(`Move your phone slowly so it can find the floor`,`حرّك هاتفك ببطء ليجد الأرض`),tap:H(`Aim at the floor, then tap`,`وجّه الهاتف إلى الأرض ثم اضغط`),anyway:H(`Can't see the floor? Tap anyway`,`لا تظهر الأرض؟ اضغط على أي حال`),walk:H(`Now walk through it!`,`الآن امشِ عبرها!`),walkBack:H(`Walk back through the arch to go home`,`امشِ عبر القوس لتعود`),step:H(`Step through`,`ادخل البوابة`),back:H(`Step back`,`ارجع`),made:H(`You made it!`,`وصلت!`),madeSub:H(`Look behind you: your room is still there.`,`انظر خلفك: غرفتك ما زالت هناك.`),home:H(`Welcome home`,`أهلاً بعودتك`),homeSub:H(`The portal stays open.`,`البوابة تبقى مفتوحة.`),noCam:H(`See it without the camera`,`شاهدها بلا كاميرا`),again:H(`Try again`,`حاول مجدداً`),blockedT:H(`The camera is blocked`,`الكاميرا محجوبة`),blocked:H(`Allow the camera for this site in your browser settings, then try again.`,`اسمح للكاميرا لهذا الموقع من إعدادات المتصفح، ثم حاول مجدداً.`),noneT:H(`We couldn't find a camera`,`لم نجد كاميرا`),none:H(`The portal needs a camera to appear in your room. You can still walk through it here.`,`تحتاج البوابة إلى كاميرا لتظهر في غرفتك، لكن يمكنك عبورها هنا.`),insecureT:H(`The camera needs a secure page`,`الكاميرا تعمل على الصفحات الآمنة فقط`),insecure:H(`Browsers only open the camera on https. You can still walk through it here.`,`لا تفتح المتصفحات الكاميرا إلا عبر https، لكن يمكنك عبور البوابة هنا.`),deskT:H(`Step into another world`,`ادخل إلى عالم آخر`),deskSub:H(`Open it on your phone, and this portal stands in your room.`,`افتحها على هاتفك لتقف هذه البوابة في غرفتك.`),scan:H(`Scan to explore in augmented reality!`,`امسح لتستكشف بالواقع المعزّز!`),point:H(`Point your phone here`,`وجّه كاميرا هاتفك هنا`),keys:H(`Drag to look. Arrow keys to walk.`,`اسحب لتنظر حولك، واستخدم الأسهم للمشي.`),noMotion:H(`Drag to look around, then tap`,`اسحب لتنظر حولك ثم اضغط`),here:H(`Try it here first`,`جرّبها هنا أولاً`),noGl:H(`This browser can't draw the portal. Try an up-to-date Chrome or Safari.`,`لا يستطيع هذا المتصفح رسم البوابة. جرّب إصداراً حديثاً من كروم أو سفاري.`),close:H(`Close`,`إغلاق`),sound:H(`Sound`,`الصوت`),qrAlt:H(`QR code for this page`,`رمز QR لهذه الصفحة`)},W=(e,t,n=``,r=``)=>{let i=t.appendChild(document.createElement(e));return n&&(i.className=n),r&&(i.textContent=r),i};W(`div`,document.body,`pt-back`);var Ye=W(`video`,document.body,`pt-video`);Ye.hidden=!0;var Xe=W(`canvas`,document.body,`pt-gl`),G=W(`div`,document.body,`pt-ui`),Ze=Math.min(window.devicePixelRatio||1,2),K=Xe.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!0,stencil:!0,powerPreference:`high-performance`}),Qe=matchMedia(`(hover: none) and (pointer: coarse)`).matches,$e=matchMedia(`(prefers-reduced-motion: reduce)`).matches,q={close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,on:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11"/></svg>`,off:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" fill="currentColor"/><path d="M16.500 9.500l5 5M21.500 9.500l-5 5"/></svg>`},et=!1;function tt(e){G.textContent=``,document.body.classList.toggle(`is-live`,e);let t=W(`div`,G,`pt-row`),n=W(`a`,t,`pt-mark`,U.mark);n.href=`/sindibad/studio/${Je?`ar/`:``}`;let r=W(`div`,t,`pt-round-row`);if(e){let e=W(`button`,r,`pt-round`);e.type=`button`,e.setAttribute(`aria-label`,U.sound),e.innerHTML=et?q.off:q.on,e.addEventListener(`click`,()=>{et=!et,Ne(et),e.innerHTML=et?q.off:q.on});let t=W(`button`,r,`pt-round`);t.type=`button`,t.setAttribute(`aria-label`,U.close),t.innerHTML=q.close,t.addEventListener(`click`,()=>Ct())}}function nt(e,t,n){let r=W(`button`,e,`pt-go`);return r.type=`button`,W(`span`,r,``,t),r.addEventListener(`click`,()=>n(r)),r}function J(e,t){let n=W(`div`,G,`pt-intro`);return W(`h1`,n,``,e),W(`p`,n,``,t),n}function rt(){for(let e=0;e<14;e++){let t=W(`i`,G,`pt-star`),n=e/14*Math.PI*2+Math.random(),r=160+Math.random()*220;t.style.setProperty(`--x`,`${Math.cos(n)*r}px`),t.style.setProperty(`--y`,`${Math.sin(n)*r}px`),t.style.animationDelay=`${Math.random()*.12}s`,t.addEventListener(`animationend`,()=>t.remove())}}function it(e){if(!$e){let e=W(`div`,G,`pt-flash`);e.addEventListener(`animationend`,()=>e.remove()),rt()}document.querySelector(`.pt-badge`)?.remove();let t=W(`div`,G,`pt-badge`);W(`b`,t,``,e?U.made:U.home),W(`small`,t,``,e?U.madeSub:U.homeSub),t.addEventListener(`animationend`,()=>t.remove()),navigator.vibrate?.(e?[30,40,60]:30),Le(),Re(e)}var Y={place:null,pop:0,open:0,inside:!1,dusk:0,reticle:null,t:0,sinceOpen:0,burst:-1},at=null,X=null,ot=0,st=!1,Z=null,Q=null,$=null,ct=0,lt=null,ut=[0,0,0],dt=[0,0,-1],ft=!1;function pt(){let e=Math.round(innerWidth*Ze),t=Math.round(innerHeight*Ze);(Xe.width!==e||Xe.height!==t)&&(Xe.width=e,Xe.height=t)}addEventListener(`resize`,pt);function mt(e){Q&&(Q.hidden=!e,e&&Q.textContent!==e&&(Q.textContent=e))}function ht(e){Y.place=e,Y.pop=0,Y.open=0,Y.reticle=null,Y.inside=!1,Y.dusk=0,Y.burst=-1,ot=performance.now(),st=!1,Z=null,mt(null)}function gt(e){if(!K||!at)return;let t=performance.now();if(Y.t=t/1e3,ut=e.camera,dt=e.ahead,lt=e.aim,!Y.place)Y.reticle=e.aim,X?.kind===`webxr`?mt(e.aim?U.tap:t-ct>9e3?U.anyway:U.find):X instanceof V&&t-ct>1500&&mt(X.sensing?U.tap:U.noMotion);else{let n=(t-ot)/1e3;if(ft||$e)Y.pop=1,Y.open=1,Y.sinceOpen=14+n;else{Y.pop=1-Math.exp(-6.5*n)*Math.cos(8.5*n);let e=(n-.55)/1,t=Math.max(0,Math.min(1,e));Y.open=t*t*(3-2*t),Y.sinceOpen=Math.max(0,n-.55),Y.burst=n>.45&&n<1.65?(n-.45)/1.2:-1,!st&&n>.05&&(st=!0,Ie(),navigator.vibrate?.(30))}Y.dusk+=(+!!Y.inside-Y.dusk)*.08;let r=Ae(e.views[0].view,Y.place);if(Z){let e=Z[2]-g.plane,t=r[2]-g.plane;if(e*t<0){let n=e/(e-t),i=Z[0]+(r[0]-Z[0])*n,a=Z[1]+(r[1]-Z[1])*n;Math.abs(i)<g.hw+.03&&a>-.3&&a<g.top+.45&&Y.open>.5&&(Y.inside=!Y.inside,ft||it(Y.inside),vt())}}Z=r,ft||_t(n)}K.bindFramebuffer(K.FRAMEBUFFER,e.framebuffer);for(let t of e.views)K.viewport(t.x,t.y,t.w,t.h),at.draw(t.view,t.proj,t.h,Y)}function _t(e){X?.walks?e>1.6&&mt(Y.inside?U.walkBack:U.walk):(e>1.5&&$&&($.hidden=!1,$.querySelector(`span`).textContent=Y.inside?U.back:U.step),e>1.5&&mt(X?.kind===`still`?U.keys:null))}function vt(){$&&($.querySelector(`span`).textContent=Y.inside?U.back:U.step)}function yt(){if(!X?.moveAlong||!X.base||!Y.place)return;let e=Y.place,t=X.base(),n=r(i(e),o(t[0],t[1],t[2])),a=Math.min(n[13],g.top-.3),s=n[14]>g.plane,c=t=>{let n=r(e,o(0,a,g.plane+t));return[n[12],n[13],n[14]]};X.moveAlong([t,c(s?.9:-.9),c(s?-2.7:2.6)],3e3)}function bt(){X?.stop(),X=null,Re(!1),Y.inside=!1,Y.dusk=0}async function xt(){!at&&K&&(at=ke(K,await(await fetch(`/sindibad/studio/concepts/portal/arch.dat`)).arrayBuffer(),Ze))}function St(){bt(),ft=!0;let e=innerWidth>innerHeight,t=e?Je?-1:1:0;ht(o(t*1.25,0,0));let n=new qe(K,G,[t*.1,e?1.3:1.85,0],e?[t*.1-.5,.82,4.9]:[-.3,.72,5.4]);X=n,n.start(gt)}function Ct(){if(Ye.hidden=!0,tt(!1),!K){J(U.title,U.noGl);return}if(Qe&&(!window.isSecureContext||!navigator.mediaDevices))return Tt(U.insecureT,U.insecure,!1);if(St(),!Qe)return wt();J(U.title,U.sub),W(`div`,G,`pt-space`);let e=W(`div`,G,`pt-foot`);nt(e,U.open,e=>void kt(e)),W(`p`,e,`pt-note`,U.why)}function wt(){J(U.deskT,U.deskSub);let n=W(`a`,G,`pt-card`);n.href=t(Je),n.target=`_blank`,n.rel=`noopener`;let r=W(`span`,W(`span`,n,`pt-card-frame`),`pt-card-in`),i=W(`img`,r);i.src=e(t(Je)),i.alt=U.qrAlt,W(`small`,r,``,U.point),W(`span`,n,`pt-ribbon`,U.scan),W(`div`,G,`pt-space`),nt(W(`div`,G,`pt-foot`),U.here,()=>{Me(),Et()})}function Tt(e,t,n){bt(),tt(!1),Ye.hidden=!0,St(),J(e,t),W(`div`,G,`pt-space`);let r=W(`div`,G,`pt-foot`);n&&nt(r,U.again,e=>void kt(e));let i=W(`button`,r,n?`pt-quiet`:`pt-go pt-go-long`);i.type=`button`,n?i.textContent=U.noCam:W(`span`,i,``,U.noCam),i.addEventListener(`click`,()=>{Me(),Et()})}function Et(){bt(),ft=!1,tt(!0),W(`div`,G,`pt-space`);let e=W(`div`,G,`pt-foot`);Q=W(`div`,e,`pt-coach`),Q.hidden=!0,$=nt(e,U.step,()=>yt()),$.hidden=!0,ht(o(0,0,0));let t=new qe(K,G,null);X=t,t.start(gt)}function Dt(e){ft=!1,tt(!0),W(`div`,G,`pt-space`);let t=W(`div`,G,`pt-foot`);Q=W(`div`,t,`pt-coach`),mt(e?U.find:U.tap),$=nt(t,U.step,()=>yt()),$.hidden=!0,Y.place=null,Y.reticle=null,ct=performance.now()}function Ot(){if(Y.place)return;if(lt)return ht(lt);if(performance.now()-ct<9e3)return;let e=ut,t=dt,n=2.5;ht(r(o(e[0]+t[0]*n,e[1]-1.4,e[2]+t[2]*n),s(Math.atan2(-t[0],-t[2]))))}async function kt(e){e.disabled=!0;let t=e.querySelector(`span`);t&&(t.textContent=U.starting),Me();let n=Ge();if(bt(),await He.available())try{let e=new He(K,G,()=>{X===e&&Ct()});X=e,Dt(!0),await e.start(gt,Ot);return}catch(e){console.warn(`WebXR did not start, so using the camera path.`,e),X=null}await n;let r=new V(K,Ye,G);try{await r.open()}catch(e){let t=e.name;return t===`NotAllowedError`||t===`SecurityError`?Tt(U.blockedT,U.blocked,!0):Tt(U.noneT,U.none,!1)}X=r,Dt(!1),await r.start(gt,Ot)}async function At(){if(pt(),!K)return Ct();try{await xt()}catch(e){console.error(e)}Ct()}At();