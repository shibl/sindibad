var e=class{url;count;keep;signal;concurrency;blobs;bitmaps=new Map;decoding=new Set;order=[];fetching=0;next=0;center=0;dir=1;dead=!1;bytes=0;loaded=0;onReady;constructor(e,t,n,r,i=4){this.url=e,this.count=t,this.keep=n,this.signal=r,this.concurrency=i,this.blobs=Array(t).fill(null);let a=new Set,o=e=>{e>=0&&e<t&&!a.has(e)&&(a.add(e),this.order.push(e))};for(let e=0;e<4;e++)o(e);for(let e of[16,8,4,2,1])for(let n=0;n<t;n+=e)o(n);o(t-1),this.pump(),r.addEventListener(`abort`,()=>this.dispose())}pump(){for(;!this.dead&&this.fetching<this.concurrency&&this.next<this.order.length;){let e=this.order[this.next++];this.fetching++,fetch(this.url(e),{signal:this.signal}).then(t=>{if(!t.ok)throw Error(`frame ${e}: ${t.status}`);return t.blob()}).then(t=>{this.blobs[e]=t,this.bytes+=t.size,this.loaded++,this.tick()}).catch(()=>{}).finally(()=>{this.fetching--,this.pump()})}}seek(e,t){this.center=e,t&&(this.dir=t>0?1:-1),this.tick()}tick(){if(this.dead)return;let e=Math.round(this.center),t=[e];for(let n=1;n<=this.keep;n++)t.push(e+n*this.dir),n<=this.keep/2&&t.push(e-n*this.dir);let n=this.decoding.size;for(let e of t){if(n>=3)break;if(e<0||e>=this.count||this.bitmaps.has(e)||this.decoding.has(e))continue;let t=this.blobs[e];t&&(n++,this.decoding.add(e),createImageBitmap(t,{premultiplyAlpha:`premultiply`,colorSpaceConversion:`none`}).then(t=>{this.decoding.delete(e),this.dead?t.close():(this.bitmaps.set(e,t),this.evict(),this.onReady?.(),this.tick())}).catch(()=>this.decoding.delete(e)))}}evict(){if(this.bitmaps.size<=this.keep+2)return;let e=-1,t=-1;for(let n of this.bitmaps.keys()){let r=Math.abs(n-this.center);r>t&&(t=r,e=n)}e>=0&&t>2&&(this.bitmaps.get(e).close(),this.bitmaps.delete(e))}get(e){return this.bitmaps.get(e)??null}nearest(e){let t=-1,n=1e9;for(let r of this.bitmaps.keys()){let i=Math.abs(r-e);i<n&&(n=i,t=r)}return t}get done(){return this.loaded>=this.count}dispose(){this.dead=!0;for(let e of this.bitmaps.values())e.close();this.bitmaps.clear(),this.blobs.length=0}},t=`#version 300 es
precision highp float;
precision highp int;
`;function n(e,t,n,r=`program`){let i=(t,n)=>{let i=e.createShader(t);if(e.shaderSource(i,n),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)&&!e.isContextLost())throw Error(`[phone] ${r}: ${e.getShaderInfoLog(i)}`);return i},a=e.createProgram(),o=i(e.VERTEX_SHADER,t),s=i(e.FRAGMENT_SHADER,n);if(e.attachShader(a,o),e.attachShader(a,s),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS)&&!e.isContextLost())throw Error(`[phone] ${r}: ${e.getProgramInfoLog(a)}`);e.deleteShader(o),e.deleteShader(s);let c=new Map;return{p:a,u:t=>(c.has(t)||c.set(t,e.getUniformLocation(a,t)),c.get(t))}}function r(e,t,n,r={}){let i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,r.internal??e.RGBA8,t,n,0,r.format??e.RGBA,r.type??e.UNSIGNED_BYTE,null);let a=r.filter??e.LINEAR;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r.mips?e.LINEAR_MIPMAP_LINEAR:a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,r.wrap??e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,r.wrap??e.CLAMP_TO_EDGE);let o=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,o),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.bindFramebuffer(e.FRAMEBUFFER,null),{fb:o,tex:i,w:t,h:n}}function i(e,t){t&&(e.deleteFramebuffer(t.fb),e.deleteTexture(t.tex))}function a(e,t,n={}){let r=e.createTexture();return e.bindTexture(e.TEXTURE_2D,r),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,+!!n.premultiply),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,e.RGBA,e.UNSIGNED_BYTE,t),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,n.mips?e.LINEAR_MIPMAP_LINEAR:e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,n.wrap??e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,n.wrap??e.CLAMP_TO_EDGE),n.mips&&e.generateMipmap(e.TEXTURE_2D),r}var o=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],s=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],c=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],l=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]};function u(e,t,n=[0,0,1]){let r=l(o(e,t)),i=l(c(n,r)),a=c(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-s(i,e),-s(a,e),-s(r,e),1])}function d(e,t,n,r,i,a){let o=2*e/36,s=(t>=1?o:o/t)*n,c=(t>=1?o*t:o)*r,l=(a+i)/(i-a),u=2*a*i/(i-a);return new Float32Array([s,0,0,0,0,c,0,0,0,0,l,-1,0,0,u,0])}function f(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++){let a=0;for(let n=0;n<4;n++)a+=e[n*4+i]*t[r*4+n];n[r*4+i]=a}return n}function p(e){let t=new Float32Array(16),n=e,r=n[0]*n[5]-n[1]*n[4],i=n[0]*n[6]-n[2]*n[4],a=n[0]*n[7]-n[3]*n[4],o=n[1]*n[6]-n[2]*n[5],s=n[1]*n[7]-n[3]*n[5],c=n[2]*n[7]-n[3]*n[6],l=n[8]*n[13]-n[9]*n[12],u=n[8]*n[14]-n[10]*n[12],d=n[8]*n[15]-n[11]*n[12],f=n[9]*n[14]-n[10]*n[13],p=n[9]*n[15]-n[11]*n[13],m=n[10]*n[15]-n[11]*n[14],h=r*m-i*p+a*f+o*d-s*u+c*l;return h&&(h=1/h,t[0]=(n[5]*m-n[6]*p+n[7]*f)*h,t[1]=(n[2]*p-n[1]*m-n[3]*f)*h,t[2]=(n[13]*c-n[14]*s+n[15]*o)*h,t[3]=(n[10]*s-n[9]*c-n[11]*o)*h,t[4]=(n[6]*d-n[4]*m-n[7]*u)*h,t[5]=(n[0]*m-n[2]*d+n[3]*u)*h,t[6]=(n[14]*a-n[12]*c-n[15]*i)*h,t[7]=(n[8]*c-n[10]*a+n[11]*i)*h,t[8]=(n[4]*p-n[5]*d+n[7]*l)*h,t[9]=(n[1]*d-n[0]*p-n[3]*l)*h,t[10]=(n[12]*s-n[13]*a+n[15]*r)*h,t[11]=(n[9]*a-n[8]*s-n[11]*r)*h,t[12]=(n[5]*u-n[4]*f-n[6]*l)*h,t[13]=(n[0]*f-n[1]*u+n[2]*l)*h,t[14]=(n[13]*i-n[12]*o-n[14]*r)*h,t[15]=(n[8]*o-n[9]*i+n[10]*r)*h),t}var m=e=>Math.min(1,Math.max(0,e)),h=(e,t,n)=>{let r=m((n-e)/(t-e));return r*r*(3-2*r)},g=(e,t,n)=>e+(t-e)*n,_=`${t}
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  v_uv = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`,v=`${t}
in vec2 v_uv; out vec4 o; uniform sampler2D u_t; uniform vec2 u_d;
void main() {
  vec4 s = vec4(0.0); float w = 0.0;
  for (int i = -12; i <= 12; i++) { float g = exp(-float(i * i) / 72.0); s += texture(u_t, v_uv + u_d * float(i)) * g; w += g; }
  o = s / w;
}`,y=[[.44,.11],[.5,.2],[.34,.28],[.46,.36],[.62,.46],[.52,.55],[.4,.66],[.55,.75],[.43,.84],[.58,.93]],b=`${t}
in vec2 v_uv; out vec4 o;
uniform sampler2D u_world; uniform sampler2D u_shore; uniform sampler2D u_hud;
uniform float u_t; uniform vec3 u_boat; uniform float u_dynamic; uniform vec2 u_route[${y.length}]; uniform float u_routeOn;
const float TAU = 6.28318530718;
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c, v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float lines(vec2 p, float t) {
  // Bright moving threads of light on the water, by warping crossed sine sheets.
  float v = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = rot(p, fi * 2.1 + 0.7);
    float w = sin(q.y * 1.7 + t * 0.7 + fi) * 0.55 + sin(q.y * 0.73 - t * 0.41 + fi * 3.0) * 0.7;
    float s = abs(sin(q.x * 2.2 + w * 2.4 + t * 0.3));
    v += pow(1.0 - s, 5.0);
  }
  return v / 3.0;
}
void main() {
  vec2 uv = v_uv;
  vec2 asp = vec2(1.0, 2.0);
  float t = u_t;
  vec4 w = texture(u_world, vec2(uv.x, 1.0 - uv.y));
  float shore = texture(u_shore, uv).r;
  float near = smoothstep(0.02, 0.62, shore);
  // The depth of the sea: dark blue-teal, lifting to turquoise near the islands.
  vec3 deep = vec3(0.020, 0.420, 0.610);
  vec3 mid = vec3(0.035, 0.620, 0.735);
  vec3 shal = vec3(0.330, 0.860, 0.810);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.3, shore + (uv.y - 0.5) * 0.1));
  col = mix(col, shal, near * near);
  // Large soft swells of tone so the sea isn't flat.
  float sw = sin(uv.x * 7.0 + uv.y * 4.0 + sin(uv.y * 9.0 + t * 0.2) + t * 0.15) * 0.5 + sin(uv.y * 13.0 - uv.x * 3.0 - t * 0.21) * 0.5;
  col *= 1.0 + 0.055 * sw;
  float l = lines(uv * asp * 7.0, t);
  col += vec3(0.62, 0.95, 0.92) * l * (0.42 + 0.58 * near) * 0.4;
  // Scalloped white ripples drifting, the mark of the game's map.
  vec2 g = uv * asp * vec2(7.5, 7.5);
  g.x += floor(g.y) * 0.5;
  g.y += t * 0.03;
  vec2 cell = fract(g) - 0.5;
  vec2 id = floor(g);
  float rnd = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
  float ph = fract(rnd * 7.0 + t * 0.08);
  float life = smoothstep(0.0, 0.2, ph) * smoothstep(1.0, 0.7, ph) * step(0.52, rnd);
  vec2 c2 = cell * vec2(1.0, 1.0) + vec2(0.0, 0.12);
  float arc = abs(length(c2 - vec2(-0.1, 0.0)) - 0.2);
  arc = min(arc, abs(length(c2 - vec2(0.27, 0.0)) - 0.2));
  float arcm = smoothstep(0.035, 0.012, arc) * step(c2.y, 0.0) * step(abs(c2.x), 0.42);
  col = mix(col, vec3(0.92, 1.0, 0.98), arcm * life * 0.6 * (1.0 - near * 0.9));
  // Foam rings breathing around the shores.
  float r1 = smoothstep(0.022, 0.0, abs(shore - (0.68 + 0.04 * sin(t * 0.9))));
  float r2 = smoothstep(0.018, 0.0, abs(shore - (0.82 + 0.025 * sin(t * 0.7 + 2.0))));
  col = mix(col, vec3(0.97, 1.0, 0.98), max(r1 * 0.62, r2 * 0.75));
  // The soft shadow of each island on the water.
  float shade = texture(u_shore, uv + vec2(-0.006, 0.006)).g;
  col *= 1.0 - 0.3 * smoothstep(0.34, 0.92, shade) * (1.0 - w.a);
  // The dotted route.
  if (u_routeOn > 0.5) {
    float best = 1e3;
    for (int i = 0; i < ${y.length-1}; i++) {
      vec2 a = u_route[i], b = u_route[i + 1];
      vec2 m = (a + b) * 0.5;
      float d = min(min(length((uv - a) * asp), length((uv - m) * asp)), length((uv - (a * 0.75 + b * 0.25)) * asp));
      d = min(d, length((uv - (a * 0.25 + b * 0.75)) * asp));
      best = min(best, d);
    }
    col = mix(col, vec3(1.0, 0.97, 0.87), smoothstep(0.0125, 0.0085, best) * 0.92);
  }
  // Islands.
  col = col * (1.0 - w.a) + w.rgb;
  // The dhow, only in the live picture: the still reference under the delta has none, so it can move freely.
  if (u_dynamic > 0.5) {
    // The little dhow, seen from above and slightly behind. Local x is to starboard, y is ahead.
    vec2 bp = rot((uv - u_boat.xy) * asp, -u_boat.z);
    // Its wake: two fading lines opening behind it.
    float wakeL = smoothstep(0.009, 0.0, abs(abs(bp.x) - (-bp.y - 0.02) * 0.34)) * smoothstep(-0.13, -0.03, bp.y) * step(bp.y, -0.018);
    col = mix(col, vec3(1.0), wakeL * 0.7);
    // A soft shadow on the water.
    float shdw = length((bp - vec2(0.006, -0.006)) * vec2(1.0, 0.45)) - 0.015;
    col = mix(col, col * 0.6, smoothstep(0.006, -0.002, shdw) * 0.8);
    // Hull: an almond.
    float hull = length(vec2(bp.x + bp.y * bp.y * 0.0, bp.y) * vec2(1.0, 0.42)) - 0.0145;
    col = mix(col, vec3(0.25, 0.12, 0.05), smoothstep(0.0028, 0.0005, hull));
    col = mix(col, vec3(0.64, 0.38, 0.17), smoothstep(0.0005, -0.0015, hull));
    // Sail: a pale curved triangle leaning to one side.
    vec2 a0 = vec2(-0.002, 0.03), b0 = vec2(-0.002, -0.022), c0 = vec2(0.03, -0.011);
    float sail = sdTri(bp, a0, b0, c0) - 0.0012;
    float sailS = sdTri(bp - vec2(0.003, -0.003), a0, b0, c0);
    col = mix(col, col * 0.72, smoothstep(0.002, 0.0, sailS) * 0.7);
    col = mix(col, vec3(1.0, 0.965, 0.87), smoothstep(0.0012, -0.0006, sail));
    col = mix(col, vec3(0.3, 0.17, 0.08), smoothstep(0.0016, 0.0, abs(bp.x + 0.002)) * step(abs(bp.y - 0.004), 0.026));
    // A pink pennant, the only pink at sea.
    float pen = sdTri(bp, vec2(-0.002, 0.035), vec2(-0.002, 0.027), vec2(-0.016, 0.032));
    col = mix(col, vec3(0.98, 0.17, 0.44), smoothstep(0.001, -0.0005, pen));
  }
  // Toy buttons and the status bar.
  vec4 h = texture(u_hud, vec2(uv.x, 1.0 - uv.y));
  col = col * (1.0 - h.a) + h.rgb;
  // A cheap panel: slight vignette, faint gamma lift at the edges.
  vec2 e = uv - 0.5;
  col *= 1.0 - dot(e, e) * 0.18;
  o = vec4(col, 1.0);
}`,x=(e,t,n,r,i,a)=>{e.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,o=i%2?r*.46:r;e.lineTo(t+Math.cos(a)*o,n+Math.sin(a)*o)}e.closePath(),e.lineJoin=`round`,e.fillStyle=i?`#ffc53a`:`#e9dcc0`,e.fill(),e.lineWidth=r*.22,e.strokeStyle=i?a:`#b9a988`,e.stroke()},S=(e,t,n,r,i,a,o)=>{let s=n=>{e.beginPath(),e.roundRect(t,n,r,i,a)};s(n+4*o),e.fillStyle=`#3a2413`,e.fill(),s(n),e.fillStyle=`#fff5dc`,e.fill(),e.lineWidth=2.6*o,e.strokeStyle=`#3a2413`,e.stroke()};function C(e,t,n,r,i){let a=t/360;e.clearRect(0,0,t,n),e.save();let o=`#3a2413`,s=25*a;e.fillStyle=`rgba(2,28,38,0.45)`,e.fillRect(0,0,t,s);let c=t-118*a,l=19*a;for(let t=0;t<4;t++){let n=Math.max(0,Math.min(1,r*4-(3-t))),i=(4+t*3.2)*a,o=(1-n)*i*.6;e.fillStyle=n>.5?`#ffffff`:`rgba(255,255,255,0.28)`,e.fillRect(c+t*7*a,l-i+o,5*a,i-o)}e.lineCap=`round`;for(let n=0;n<3;n++){let r=Math.max(0,Math.min(1,i*3-(2-n)));e.beginPath(),e.arc(t-72*a,l,(3.5+n*4)*a,-Math.PI*.75,-Math.PI*.25),e.lineWidth=2.1*a,e.strokeStyle=`rgba(255,255,255,${.18+r*.82})`,e.stroke()}e.strokeStyle=`#fff`,e.lineWidth=1.5*a,e.beginPath(),e.roundRect(t-48*a,8*a,26*a,12*a,2.5*a),e.stroke(),e.fillStyle=`#fff`,e.fillRect(t-21*a,11*a,2.5*a,6*a),e.fillRect(t-46*a,10*a,10*a,8*a),S(e,14*a,36*a,52*a,52*a,26*a,a);let u=40*a,d=62*a;e.fillStyle=`#d8355f`,e.beginPath(),e.moveTo(u,d-17*a),e.lineTo(u+6*a,d),e.lineTo(u-6*a,d),e.closePath(),e.fill(),e.fillStyle=`#35797a`,e.beginPath(),e.moveTo(u,d+17*a),e.lineTo(u+6*a,d),e.lineTo(u-6*a,d),e.closePath(),e.fill(),S(e,90*a,40*a,148*a,42*a,21*a,a),x(e,121*a,61*a,13*a,!0,o),x(e,164*a,61*a,13*a,!0,o),x(e,207*a,61*a,13*a,!1,o),S(e,294*a,36*a,52*a,52*a,26*a,a);let f=320*a,p=64*a;e.fillStyle=`#ffb56b`,e.strokeStyle=o,e.lineWidth=2*a,e.beginPath(),e.moveTo(f,p+12*a),e.bezierCurveTo(f-21*a,p-3*a,f-12*a,p-20*a,f,p-16*a),e.bezierCurveTo(f+12*a,p-20*a,f+21*a,p-3*a,f,p+12*a),e.fill(),e.stroke();for(let t of[-.5,0,.5])e.beginPath(),e.moveTo(f,p+10*a),e.lineTo(f+Math.sin(t)*14*a,p-Math.cos(t)*13*a),e.stroke();let m=.64*t,h=.33*n;e.fillStyle=o,e.beginPath(),e.roundRect(m-22*a,h-18*a+4*a,44*a,36*a,11*a),e.fill(),e.fillStyle=`#fa2a6f`,e.beginPath(),e.roundRect(m-22*a,h-18*a,44*a,36*a,11*a),e.fill(),e.strokeStyle=o,e.lineWidth=2.6*a,e.stroke(),e.fillStyle=`#fa2a6f`,e.beginPath(),e.moveTo(m-8*a,h+17*a),e.lineTo(m,h+28*a),e.lineTo(m+8*a,h+17*a),e.closePath(),e.fill(),e.stroke(),x(e,m,h,11*a,!0,`#7a1439`),e.restore()}var ee=class{gl;live;ref;shore;prog;hudTex;world;hud;hudC;lastHud=``;constructor(e,t,i,o){this.gl=e,this.live=r(e,i,o),this.ref=r(e,i,o),this.prog=n(e,_,b,`screen`),this.world=a(e,t,{mips:!0}),this.shore=this.bakeShore(),this.hud=document.createElement(`canvas`),this.hud.width=i,this.hud.height=o,this.hudC=this.hud.getContext(`2d`),C(this.hudC,i,o,1,1),this.hudTex=a(e,this.hud,{premultiply:!0}),this.draw(this.ref,0,!1)}bakeShore(){let e=this.gl,a=n(e,_,v,`shore-blur`),o=r(e,180,362,{}),s=r(e,180,362,{}),c=r(e,180,362,{}),l=n(e,_,`${t}in vec2 v_uv; out vec4 o; uniform sampler2D u_t; void main(){ o = vec4(texture(u_t, vec2(v_uv.x, 1.0 - v_uv.y)).a); }`,`shore-alpha`);e.disable(e.BLEND),e.bindFramebuffer(e.FRAMEBUFFER,o.fb),e.viewport(0,0,180,362),e.useProgram(l.p),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.world),e.uniform1i(l.u(`u_t`),0),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(a.p),e.uniform1i(a.u(`u_t`),0);let u=(t,n,r,i)=>{e.bindFramebuffer(e.FRAMEBUFFER,n.fb),e.bindTexture(e.TEXTURE_2D,t.tex),e.uniform2f(a.u(`u_d`),r,i),e.drawArrays(e.TRIANGLES,0,3)};u(o,s,1/180,0),u(s,c,0,1/362);let d=c,f=r(e,180,362,{});u(d,s,3/180,0),u(s,f,0,3/362);let p=r(e,180,362,{}),m=n(e,_,`${t}in vec2 v_uv; out vec4 o; uniform sampler2D u_a; uniform sampler2D u_b; void main(){ float aw = texture(u_a, v_uv).r; float at = texture(u_b, v_uv).r; o = vec4(pow(clamp(aw * 1.7, 0., 1.), 0.6), at, 0., 1.); }`,`shore-merge`);return e.bindFramebuffer(e.FRAMEBUFFER,p.fb),e.useProgram(m.p),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,f.tex),e.uniform1i(m.u(`u_a`),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,d.tex),e.uniform1i(m.u(`u_b`),1),e.drawArrays(e.TRIANGLES,0,3),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),i(e,o),i(e,s),i(e,c),i(e,f),e.deleteProgram(a.p),e.deleteProgram(l.p),e.deleteProgram(m.p),p}draw(e,t,n){let r=this.gl,i=this.prog;r.bindFramebuffer(r.FRAMEBUFFER,e.fb),r.viewport(0,0,e.w,e.h),r.disable(r.BLEND),r.useProgram(i.p),r.uniform1f(i.u(`u_t`),t),r.uniform1f(i.u(`u_dynamic`),+!!n),r.uniform1f(i.u(`u_routeOn`),1);let a=new Float32Array(y.length*2);y.forEach((e,t)=>{a[t*2]=e[0],a[t*2+1]=e[1]}),r.uniform2fv(i.u(`u_route`),a);let o=y.length-1,s=t*.018%2,c=(s<1?s:2-s)*o,l=Math.min(o-1,Math.floor(c)),u=c-l,d=y[l],f=y[l+1],p=d[0]+(f[0]-d[0])*u,m=d[1]+(f[1]-d[1])*u,h=Math.atan2((f[0]-d[0])*(s<1?1:-1),(f[1]-d[1])*2*(s<1?1:-1));r.uniform3f(i.u(`u_boat`),p,m,-h),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,this.world),r.uniform1i(i.u(`u_world`),0),r.activeTexture(r.TEXTURE1),r.bindTexture(r.TEXTURE_2D,this.shore.tex),r.uniform1i(i.u(`u_shore`),1),r.activeTexture(r.TEXTURE2),r.bindTexture(r.TEXTURE_2D,this.hudTex),r.uniform1i(i.u(`u_hud`),2),r.drawArrays(r.TRIANGLES,0,3),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null)}setSignal(e,t){let n=`${e.toFixed(2)}:${t.toFixed(2)}`;if(n===this.lastHud)return;this.lastHud=n,C(this.hudC,this.hud.width,this.hud.height,e,t);let r=this.gl;r.bindTexture(r.TEXTURE_2D,this.hudTex),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1),r.texSubImage2D(r.TEXTURE_2D,0,0,0,r.RGBA,r.UNSIGNED_BYTE,this.hud),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0)}render(e){this.draw(this.live,e,!0)}dispose(){let e=this.gl;i(e,this.live),i(e,this.ref),i(e,this.shore),e.deleteProgram(this.prog.p),e.deleteTexture(this.hudTex),e.deleteTexture(this.world)}},w=l([.2,1,.135]),T=[[186,74,.62,.34],[168,47,.42,.42],[205,29,.25,.5],[150,19,.15,.55],[222,12.3,.085,.55],[176,8.1,.05,.55],[136,5.3,.03,.5],[198,3.7,.018,.45]],E=9.8,D=T.map(([e,t,n,r])=>{let i=2*Math.PI/t,a=e*Math.PI/180;return{dx:Math.sin(a),dy:Math.cos(a),k:i,w:Math.sqrt(E*i),amp:n,q:r}});function te(e,t,n){let r=0,i=0,a=0;for(let o of D){let s=o.k*(o.dx*e+o.dy*t)-o.w*n;r+=o.amp*Math.sin(s);let c=o.amp*o.k*Math.cos(s);i+=c*o.dx,a+=c*o.dy}return{h:r,sx:i,sy:a}}var O=e=>`vec3(${e.map(e=>e.toFixed(5)).join(`,`)})`,k=`
const int NW = ${D.length};
const vec4 WA[NW] = vec4[NW](${D.map(e=>`vec4(${e.dx.toFixed(5)},${e.dy.toFixed(5)},${e.k.toFixed(5)},${e.w.toFixed(5)})`).join(`,`)});
const vec2 WB[NW] = vec2[NW](${D.map(e=>`vec2(${e.amp.toFixed(5)},${e.q.toFixed(5)})`).join(`,`)});
`,A=`
const vec3 SUN = ${O(w)};
// The sky, display-referred, chosen so ink text stays above AA everywhere it can sit.
const vec3 ZENITH = vec3(0.565, 0.800, 0.860);
const vec3 MID = vec3(0.800, 0.910, 0.920);
const vec3 LOW = vec3(0.985, 0.915, 0.800);
const vec3 HORIZON = vec3(1.000, 0.835, 0.640);
uniform sampler2D u_clouds;
uniform float u_time;
vec3 skyBase(vec3 d) {
  float e = max(d.z, 0.0);
  vec3 c = mix(HORIZON, LOW, smoothstep(0.0, 0.055, e));
  c = mix(c, MID, smoothstep(0.03, 0.26, e));
  c = mix(c, ZENITH, smoothstep(0.2, 0.75, e));
  float s = max(dot(normalize(d), SUN), 0.0);
  // The air around a low sun, wide and warm.
  c = mix(c, vec3(1.0, 0.925, 0.76), pow(s, 12.0) * 0.55);
  c = mix(c, vec3(1.0, 0.86, 0.62), pow(s, 90.0) * 0.5);
  return c;
}
vec4 cloudAt(vec3 d) {
  // Clouds live on a strip of azimuth against elevation, drifting very slowly.
  float az = atan(d.x, d.y) / 2.2 + 0.5 + u_time * 0.0009;
  float el = pow(max(d.z, 0.0), 0.72) * 1.45;
  return texture(u_clouds, vec2(az, el));
}
vec3 skyColor(vec3 d) {
  vec3 c = skyBase(d);
  vec4 cl = cloudAt(d);
  c = c * (1.0 - cl.a) + cl.rgb;
  float s = max(dot(normalize(d), SUN), 0.0);
  // The disc itself is hot enough to burn through a thin cloud.
  c += vec3(1.0, 0.9, 0.7) * smoothstep(0.99982, 0.99992, s) * 0.85;
  c += vec3(1.0, 0.86, 0.6) * pow(s, 1400.0) * 0.5;
  return c;
}
`,j=`${t}
uniform mat4 u_ivp; uniform vec3 u_cam; out vec3 v_d;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  vec4 w = u_ivp * vec4(p, 1., 1.);
  v_d = w.xyz / w.w - u_cam;
  gl_Position = vec4(p, 1., 1.);
}`,M=`${t}${A}
in vec3 v_d; out vec4 o;
float dither() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5; }
void main() {
  vec3 d = normalize(v_d);
  vec3 c = skyColor(d);
  o = vec4(c + dither() / 255.0, 1.0);
}`,N=`${t}
in vec2 v_uv; out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p, float per) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6. - 15.) + 10.);
  vec2 q = vec2(per, 1000.);
  float a = hash(mod(i, q)), b = hash(mod(i + vec2(1, 0), q)), c = hash(mod(i + vec2(0, 1), q)), d = hash(mod(i + vec2(1, 1), q));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p, float per, int n) {
  float s = 0., a = .5;
  for (int i = 0; i < n; i++) { s += a * noise(p, per); p *= 2.03; p.y += 3.1; per *= 2.03; a *= .52; }
  return s;
}
float density(vec2 p) {
  // Billowing lower clouds: flat-bottomed, heaped upward, bigger and sparser high in the sky.
  float per = 14.0;
  vec2 q = vec2(p.x * per, p.y * 9.0);
  vec2 warp = vec2(fbm(q * 0.7 + 7.0, floor(per * 0.7), 4), fbm(q * 0.7 + 21.0, floor(per * 0.7), 4));
  float d = fbm(q + warp * 1.6, per, 6);
  return d;
}
void main() {
  vec2 uv = v_uv;
  float band = smoothstep(0.015, 0.09, uv.y) * smoothstep(0.62, 0.2, uv.y);
  float gate = 0.53 + 0.1 * smoothstep(0.1, 0.5, uv.y);
  float d = density(uv);
  float a = smoothstep(gate, gate + 0.17, d) * band;
  // Light from the low sun: sample toward it for soft self-shadow.
  vec2 toSun = normalize(vec2((0.5 + 0.09 - uv.x) * 3.0, -0.6));
  float dl = density(uv + toSun * 0.018);
  float dl2 = density(uv + toSun * 0.05);
  float shade = clamp(0.5 + (d - dl) * 3.2 + (d - dl2) * 1.6, 0.0, 1.0);
  vec3 lit = vec3(1.0, 0.975, 0.93);
  vec3 dark = vec3(0.885, 0.815, 0.795);
  vec3 under = vec3(0.985, 0.76, 0.60);
  vec3 c = mix(dark, lit, shade);
  // Warm undersides close to the horizon.
  c = mix(under, c, smoothstep(0.02, 0.2, uv.y));
  // Thin high streaks.
  float st = fbm(vec2(uv.x * 10.0, uv.y * 62.0) + 5.0, 10.0, 5);
  float sa = smoothstep(0.54, 0.86, st) * smoothstep(0.22, 0.38, uv.y) * smoothstep(0.98, 0.5, uv.y) * 0.42;
  vec3 out_c = c * a;
  float out_a = a;
  out_c = out_c + vec3(1.0, 0.985, 0.96) * sa * (1.0 - out_a);
  out_a = out_a + sa * (1.0 - out_a);
  o = vec4(out_c, out_a);
}`,P=`${t}
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  v_uv = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`,ne=`${t}
in vec2 v_uv; out vec4 o;
const float TAU = 6.283185307;
void main() {
  vec2 s = vec2(0.0);
  float h = 0.0, wsum = 0.0;
  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    float seed = fract(sin(fi * 12.9898) * 43758.5453);
    float seed2 = fract(sin(fi * 78.233) * 12543.123);
    float seed3 = fract(sin(fi * 39.425) * 95413.771);
    // Integer frequencies, so it tiles.
    float m = floor(2.0 + pow(seed, 1.8) * 26.0);
    float ang = seed2 * TAU;
    vec2 f = floor(vec2(cos(ang), sin(ang)) * m + 0.5);
    float l = length(f);
    if (l < 0.5) continue;
    float a = 1.0 / pow(l, 1.15);
    float ph = TAU * dot(f, v_uv) + seed3 * TAU;
    // A sharper crest than a sine.
    float wave = sin(ph);
    float c = cos(ph);
    float sharp = exp(wave * 1.2 - 1.2);
    h += a * sharp;
    s += a * sharp * 1.2 * c * f * TAU * 0.02;
    wsum += a;
  }
  s /= wsum * 0.14;
  o = vec4(s * 0.5 + 0.5, clamp(h / wsum, 0.0, 1.0), 1.0);
}`,F=`${t}
in vec2 v_uv; out vec4 o;
uniform sampler2D u_prev; uniform vec2 u_texel;
uniform vec4 u_drops[12]; uniform int u_ndrops;
void main() {
  vec4 c = texture(u_prev, v_uv);
  float n = texture(u_prev, v_uv + vec2(0., u_texel.y)).r;
  float s = texture(u_prev, v_uv - vec2(0., u_texel.y)).r;
  float e = texture(u_prev, v_uv + vec2(u_texel.x, 0.)).r;
  float w = texture(u_prev, v_uv - vec2(u_texel.x, 0.)).r;
  float lap = n + s + e + w - 4.0 * c.r;
  float nxt = 2.0 * c.r - c.g + lap * 0.45;
  nxt *= 0.992;
  // Fade toward the edges so nothing rebounds off them.
  vec2 ed = min(v_uv, 1.0 - v_uv);
  nxt *= smoothstep(0.0, 0.06, min(ed.x, ed.y));
  float foam = c.b * 0.988;
  foam += smoothstep(0.1, 0.7, abs(nxt - c.r)) * 0.2;
  for (int i = 0; i < u_ndrops; i++) {
    vec4 d = u_drops[i];
    vec2 r = (v_uv - d.xy) / d.z;
    float g = exp(-dot(r, r));
    nxt += d.w * g;
    foam += abs(d.w) * g * 0.12;
  }
  o = vec4(nxt, c.r, min(foam, 1.0), 1.0);
}`,re=`${t}${k}
in vec2 a_p;
uniform mat4 u_vp; uniform mat4 u_ivp; uniform vec3 u_cam; uniform float u_time; uniform float u_swell;
out vec3 v_w; out vec3 v_n; out float v_crest; out vec3 v_flat;
void main() {
  vec4 fw = u_ivp * vec4(a_p, 1., 1.);
  vec3 d = normalize(fw.xyz / fw.w - u_cam);
  d.z = min(d.z, -0.0012);
  float s = (0.0 - u_cam.z) / d.z;
  s = min(s, 5200.0);
  vec3 p = u_cam + d * s;
  vec3 flat_p = p;
  float fade = 1.0 / (1.0 + s * s * 0.0000012);
  vec3 off = vec3(0.0);
  vec2 sl = vec2(0.0);
  float crest = 0.0;
  for (int i = 0; i < NW; i++) {
    vec4 a = WA[i]; vec2 b = WB[i];
    float ph = a.z * dot(a.xy, flat_p.xy) - a.w * u_time;
    float sn = sin(ph), cs = cos(ph);
    float amp = b.x * u_swell;
    float q = b.y / (a.z * max(b.x, 1e-3) * float(NW));
    off.xy += q * amp * a.xy * cs;
    off.z += amp * sn;
    sl += amp * a.z * a.xy * cs;
    crest += q * amp * a.z * sn;
  }
  off *= fade;
  sl *= fade;
  p += off;
  v_w = p;
  v_flat = flat_p;
  v_n = vec3(-sl, 1.0);
  v_crest = crest;
  gl_Position = u_vp * vec4(p, 1.0);
}`,I=`${t}${A}
in vec3 v_w; in vec3 v_n; in float v_crest; in vec3 v_flat; out vec4 o;
uniform vec3 u_cam; uniform sampler2D u_detail; uniform sampler2D u_ripple; uniform sampler2D u_refl; uniform vec4 u_rect; uniform vec2 u_res; uniform float u_foamAmt;
uniform float u_ripOn; uniform float u_time2;
float dither() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5; }
void main() {
  vec3 toCam = u_cam - v_w;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  // Small waves over the swell, three sizes crossing each other.
  float nearF = 1.0 / (1.0 + dist * 0.0035);
  float tt = u_time2;
  vec3 d1 = texture(u_detail, v_flat.xy * 0.0174 + tt * vec2(0.0035, -0.0105)).xyz;
  vec3 d2 = texture(u_detail, v_flat.yx * 0.0473 + tt * vec2(-0.0150, -0.0096)).xyz;
  vec3 d3 = texture(u_detail, v_flat.xy * 0.1310 + tt * vec2(0.0210, -0.0300)).xyz;
  float farCalm = 0.42 + 0.58 * smoothstep(0.08, 0.5, nearF);
  vec2 fine = ((d1.xy - 0.5) * 0.30 + (d2.xy - 0.5) * 0.22 * (0.45 + 0.55 * nearF) + (d3.xy - 0.5) * 0.16 * nearF) * farCalm;
  // The ripple field.
  vec2 ruv = (v_flat.xy - u_rect.xy) / u_rect.zw;
  vec2 ripSlope = vec2(0.0);
  float ripFoam = 0.0;
  if (u_ripOn > 0.5 && all(greaterThan(ruv, vec2(0.0))) && all(lessThan(ruv, vec2(1.0)))) {
    vec2 tx = 1.0 / vec2(textureSize(u_ripple, 0));
    float e = texture(u_ripple, ruv + vec2(tx.x, 0.)).r, w = texture(u_ripple, ruv - vec2(tx.x, 0.)).r;
    float n = texture(u_ripple, ruv + vec2(0., tx.y)).r, s = texture(u_ripple, ruv - vec2(0., tx.y)).r;
    ripSlope = vec2(e - w, n - s) * 0.5 * 0.9;
    ripFoam = texture(u_ripple, ruv).b;
  }
  vec2 slope = v_n.xy * 1.0 + fine * vec2(1.0, 1.0) - ripSlope;
  vec3 N = normalize(vec3(slope, 1.0));
  // The body of the water: dark teal looking down, lit turquoise through the backs of waves in front of the sun.
  float facing = max(dot(N, V), 0.0);
  vec3 deep = vec3(0.012, 0.215, 0.285);
  vec3 mid = vec3(0.020, 0.420, 0.475);
  vec3 lit = vec3(0.120, 0.720, 0.690);
  float h = v_w.z;
  vec3 body = mix(deep, mid, smoothstep(0.1, 0.62, 1.0 - facing));
  vec2 sunXY = normalize(SUN.xy);
  float back = pow(max(dot(-V, vec3(SUN.xy, 0.25)), 0.0), 3.0);
  float thru = clamp(h * 0.55 + 0.25 + dot(slope, sunXY) * -1.2, 0.0, 1.0);
  body = mix(body, lit, thru * thru * back * 0.85);
  // Reflection.
  vec3 R = reflect(-V, N);
  R.z = abs(R.z) + 0.004;
  float F = 0.021 + 0.979 * pow(1.0 - facing, 5.0);
  F = min(F, 0.82);
  vec3 refl = skyColor(R);
  // Reflections of floating things, slightly smeared by the surface.
  vec2 suv = gl_FragCoord.xy / u_res;
  vec2 rd = slope * vec2(0.09, 0.22);
  vec2 tp = 1.5 / u_res;
  vec4 ro = (texture(u_refl, suv + rd) + texture(u_refl, suv + rd * 1.5 + vec2(tp.x * 2.0, tp.y * 5.0)) + texture(u_refl, suv + rd * 0.6 - vec2(tp.x * 2.0, tp.y * 3.0)) + texture(u_refl, suv + rd * 2.0 + vec2(0.0, -tp.y * 8.0))) * 0.25;
  refl = refl * (1.0 - ro.a) + ro.rgb;
  float fo = F + (1.0 - F) * ro.a * 0.42;
  vec3 col = mix(body, refl, fo);
  // The sun on the water: a tall glittering road, sharper close by.
  vec3 H = normalize(V + SUN);
  float nh = max(dot(N, H), 0.0);
  float rough = mix(0.012, 0.0009, clamp(nearF * 1.1, 0.0, 1.0));
  float glint = exp(-(1.0 - nh) / rough);
  // Broad sheen of the road far away, sparkle near.
  vec3 Hf = normalize(V + SUN);
  vec3 Nf = normalize(vec3(slope * 0.62, 1.0));
  float sheen = pow(max(dot(Nf, Hf), 0.0), 260.0);
  col += vec3(1.0, 0.84, 0.58) * (glint * 2.6 + sheen * 0.75);
  // Foam: thin lace on the crests, plus whatever the flood is still shedding and the ripple field has churned.
  float lace = texture(u_detail, v_flat.xy * 0.041 + vec2(0.0, tt * 0.004)).z;
  float lace2 = texture(u_detail, v_flat.xy * 0.113 - vec2(tt * 0.006, 0.0)).z;
  float cover = smoothstep(0.34, 0.56, lace * 0.65 + lace2 * 0.45);
  float crestF = smoothstep(0.26, 0.5, v_crest + (lace2 - 0.3) * 0.25) * cover * (0.35 + 0.65 * nearF);
  float flood = smoothstep(0.75 - u_foamAmt * 0.75, 1.0 - u_foamAmt * 0.6, lace * 0.75 + lace2 * 0.42 + 0.06);
  float foam = clamp(crestF + flood * u_foamAmt * 1.15 + ripFoam * (0.6 + lace2 * 0.8), 0.0, 1.0);
  vec3 foamC = mix(vec3(0.89, 0.94, 0.93), vec3(1.0, 0.965, 0.885), max(dot(N, SUN) * 0.5 + 0.5, 0.0));
  col = mix(col, foamC, foam * (0.86));
  // Aerial haze into the horizon colour.
  vec3 dir = normalize(vec3(-V.x, -V.y, 0.0));
  vec3 air = skyBase(dir + vec3(0.0, 0.0, 0.002));
  float hz = 1.0 - exp(-pow(dist * 0.00062, 1.35));
  col = mix(col, air, hz);
  o = vec4(col + dither() / 255.0, 1.0);
}`,L=`${t}
in vec2 a_p;
uniform mat4 u_vp; uniform vec3 u_o; uniform vec3 u_ax; uniform vec3 u_ay; uniform float u_mirror; out vec2 v_uv; out vec3 v_w;
void main() {
  v_uv = vec2(a_p.x, 1.0 - a_p.y);
  vec3 p = u_o + u_ax * (a_p.x - 0.5) + u_ay * a_p.y;
  if (u_mirror > 0.5) p.z = -p.z;
  v_w = p;
  gl_Position = u_vp * vec4(p, 1.0);
}`,R=`${t}
in vec2 v_uv; in vec3 v_w; out vec4 o;
uniform sampler2D u_tex; uniform vec4 u_tint; uniform float u_water; uniform float u_time; uniform float u_mirror; uniform vec2 u_sway; uniform vec4 u_flag;
uniform float u_alpha; uniform float u_waterScale; uniform float u_skirt;
void main() {
  vec2 uv = v_uv;
  // Sail-belly sway: only the upper part of the card, more toward the top.
  if (u_sway.x > 0.0) {
    float k = smoothstep(u_sway.y, 0.0, uv.y);
    uv.x += sin(u_time * 1.3 + uv.y * 7.0 + uv.x * 3.0) * u_sway.x * k;
  }
  vec4 c = texture(u_tex, uv);
  // Foam where the thing meets the water: just under the bottom edge of its alpha, wobbling.
  if (u_skirt > 0.0 && u_mirror < 0.5) {
    float wob = 0.5 + 0.5 * sin(v_w.x * 1.6 + u_time * 1.7) * sin(v_w.x * 0.57 - u_time * 0.9);
    float reach = u_skirt * (0.35 + 0.9 * wob);
    float above = texture(u_tex, uv - vec2(0.0, reach)).a;
    float above2 = texture(u_tex, uv - vec2(reach * 0.35, reach * 0.55)).a;
    float edge = max(above, above2) * (1.0 - c.a);
    // In patches that come and go, never an even outline.
    float lace = smoothstep(-0.25, 0.75, sin(v_w.x * 0.83 + u_time * 0.9 + sin(v_w.x * 0.37 - u_time * 0.6) * 2.4) * 0.6 + sin(v_w.x * 2.9 - u_time * 1.4) * 0.4);
    vec3 fc = vec3(0.97, 0.985, 0.95);
    float a = smoothstep(0.0, 1.0, edge) * lace * 0.62;
    c = vec4(c.rgb + fc * a * (1.0 - c.a), c.a + a * (1.0 - c.a));
  }
  // premultiplied
  if (u_alpha < 0.999) c *= u_alpha;
  // Atmosphere: mix toward the air colour for distant things.
  c.rgb = mix(c.rgb, u_tint.rgb * c.a, u_tint.a);
  if (u_mirror < 0.5 && u_waterScale > 0.0) {
    // The waterline wobbles on small waves.
    float wob = sin(v_w.x * 0.9 + u_time * 1.4) * 0.22 + sin(v_w.x * 2.3 - u_time * 1.9) * 0.1 + sin(v_w.x * 0.31 + u_time * 0.7) * 0.34;
    float line = u_water + wob * u_waterScale;
    float dz = v_w.z - line;
    float a = smoothstep(-0.04, 0.05, dz / max(u_waterScale, 0.15));
    float rim = smoothstep(0.9, 0.0, dz / max(u_waterScale * 0.9, 0.1)) * a * c.a;
    c.rgb = mix(c.rgb, vec3(1.0, 0.97, 0.9) * c.a, rim * 0.72);
    c *= a;
  }
  o = c;
}`,z=`${t}
in vec3 a_p; uniform mat4 u_vp;
void main() { gl_Position = u_vp * vec4(a_p, 1.0); }`,B=`${t}
out vec4 o; uniform vec4 u_c;
void main() { o = u_c; }`,ie=class{gl;opts;sky;sea;card;ripple;vao;grid;ibo;cardVao;cardBuf;indices=0;bird;birdVao;birdBuf;birdData=new Float32Array(162);clouds;detail;rip=null;refl=null;drops=[];ripAcc=0;vp=new Float32Array(16);ivp=new Float32Array(16);eye=[0,0,1];rect=[-260,-180,520,620];constructor(e,t){this.gl=e,this.opts=t,this.sky=n(e,j,M,`sky`),this.sea=n(e,re,I,`sea`),this.card=n(e,L,R,`card`),this.ripple=n(e,P,F,`ripple`),this.bird=n(e,z,B,`bird`),this.birdVao=e.createVertexArray(),e.bindVertexArray(this.birdVao),this.birdBuf=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.birdBuf),e.bufferData(e.ARRAY_BUFFER,this.birdData.byteLength,e.DYNAMIC_DRAW);let r=e.getAttribLocation(this.bird.p,`a_p`);e.enableVertexAttribArray(r),e.vertexAttribPointer(r,3,e.FLOAT,!1,0,0),e.bindVertexArray(null);let i=t.low?110:240,a=t.low?130:200,o=new Float32Array((i+1)*(a+1)*2),s=0;for(let e=0;e<=a;e++)for(let t=0;t<=i;t++)o[s++]=t/i*2.5-1.25,o[s++]=e/a*2.5-1.25;let c=new Uint32Array(i*a*6);s=0;for(let e=0;e<a;e++)for(let t=0;t<i;t++){let n=e*(i+1)+t,r=n+1,a=n+i+1,o=a+1;c[s++]=n,c[s++]=r,c[s++]=o,c[s++]=n,c[s++]=o,c[s++]=a}this.indices=c.length,this.vao=e.createVertexArray(),e.bindVertexArray(this.vao),this.grid=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.grid),e.bufferData(e.ARRAY_BUFFER,o,e.STATIC_DRAW);let l=e.getAttribLocation(this.sea.p,`a_p`);e.enableVertexAttribArray(l),e.vertexAttribPointer(l,2,e.FLOAT,!1,0,0),this.ibo=e.createBuffer(),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,this.ibo),e.bufferData(e.ELEMENT_ARRAY_BUFFER,c,e.STATIC_DRAW),this.cardVao=e.createVertexArray(),e.bindVertexArray(this.cardVao),this.cardBuf=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.cardBuf),e.bufferData(e.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),e.STATIC_DRAW);let u=e.getAttribLocation(this.card.p,`a_p`);e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),this.clouds=this.bakeClouds(),this.detail=this.bakeDetail(),e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),e.getExtension(`OES_texture_float_linear`),this.initRipple()}bakeClouds(){let e=this.gl,t=this.opts.low?1024:2048,i=this.opts.low?512:1024,a=r(e,t,i,{wrap:e.REPEAT,mips:!0}),o=n(e,P,N,`clouds`);return e.bindFramebuffer(e.FRAMEBUFFER,a.fb),e.viewport(0,0,t,i),e.disable(e.BLEND),e.useProgram(o.p),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,a.tex),e.generateMipmap(e.TEXTURE_2D),e.deleteProgram(o.p),e.deleteFramebuffer(a.fb),a.tex}bakeDetail(){let e=this.gl,t=this.opts.low?512:1024,i=r(e,t,t,{wrap:e.REPEAT,mips:!0}),a=n(e,P,ne,`detail`);e.bindFramebuffer(e.FRAMEBUFFER,i.fb),e.viewport(0,0,t,t),e.disable(e.BLEND),e.useProgram(a.p),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,i.tex),e.generateMipmap(e.TEXTURE_2D);let o=e.getExtension(`EXT_texture_filter_anisotropic`);return o&&e.texParameterf(e.TEXTURE_2D,o.TEXTURE_MAX_ANISOTROPY_EXT,8),e.deleteProgram(a.p),e.deleteFramebuffer(i.fb),i.tex}initRipple(){let e=this.gl,t=this.opts.low?192:320,n=()=>r(e,t,t,{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,filter:e.LINEAR}),a=n(),o=n();e.bindFramebuffer(e.FRAMEBUFFER,a.fb);let s=e.checkFramebufferStatus(e.FRAMEBUFFER)===e.FRAMEBUFFER_COMPLETE;if(e.bindFramebuffer(e.FRAMEBUFFER,null),!s)i(e,a),i(e,o);else{for(let t of[a,o])e.bindFramebuffer(e.FRAMEBUFFER,t.fb),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);e.bindFramebuffer(e.FRAMEBUFFER,null),this.rip=[a,o]}}drop(e,t,n,r){if(!this.rip||this.drops.length>=48)return;let i=this.rect;this.drops.push((e-i[0])/i[2],(t-i[1])/i[3],n/i[2],r)}pick(e,t){let n=this.ivp,r=n[3]*e+n[7]*t+n[11]+n[15],i=(n[0]*e+n[4]*t+n[8]+n[12])/r,a=(n[1]*e+n[5]*t+n[9]+n[13])/r,o=(n[2]*e+n[6]*t+n[10]+n[14])/r,s=i-this.eye[0],c=a-this.eye[1],l=o-this.eye[2];if(l>=-1e-4)return null;let u=-this.eye[2]/l;return[this.eye[0]+s*u,this.eye[1]+c*u]}stepRipple(e){if(!this.rip)return;let t=this.gl;this.ripAcc=Math.min(this.ripAcc+e,1/20);let n=1/60,r=!0;for(t.disable(t.BLEND),t.useProgram(this.ripple.p);this.ripAcc>=n;){this.ripAcc-=n;let[e,i]=this.rip;t.bindFramebuffer(t.FRAMEBUFFER,i.fb),t.viewport(0,0,i.w,i.h),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.tex),t.uniform1i(this.ripple.u(`u_prev`),0),t.uniform2f(this.ripple.u(`u_texel`),1/e.w,1/e.h);let a=r?Math.min(12,this.drops.length/4):0;t.uniform1i(this.ripple.u(`u_ndrops`),a),a&&t.uniform4fv(this.ripple.u(`u_drops`),new Float32Array(this.drops.slice(0,a*4))),r&&this.drops.splice(0,a*4),r=!1,t.drawArrays(t.TRIANGLES,0,3),this.rip=[i,e]}t.bindFramebuffer(t.FRAMEBUFFER,null)}ensureRefl(e,t){let n=this.gl,a=Math.max(2,Math.round(e/3)),o=Math.max(2,Math.round(t/3));this.refl&&this.refl.w===a&&this.refl.h===o||(i(n,this.refl),this.refl=r(n,a,o,{}))}drawCard(e,t,n){let r=this.gl,i=this.card,a=e.roll??0,o=Math.cos(a),s=Math.sin(a);r.uniform3f(i.u(`u_o`),e.x,e.y,e.z),r.uniform3f(i.u(`u_ax`),e.w*o,0,e.w*s),r.uniform3f(i.u(`u_ay`),-e.h*s,0,e.h*o),r.uniform1f(i.u(`u_mirror`),+!!t),r.uniform1f(i.u(`u_water`),e.water),r.uniform1f(i.u(`u_waterScale`),e.waterScale??1),r.uniform1f(i.u(`u_skirt`),e.skirt??0),r.uniform1f(i.u(`u_alpha`),e.alpha??1),r.uniform1f(i.u(`u_time`),n),r.uniform2f(i.u(`u_sway`),e.sway?.[0]??0,e.sway?.[1]??0),r.uniform4f(i.u(`u_tint`),1,.86,.7,e.haze),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,e.tex),r.uniform1i(i.u(`u_tex`),0),r.drawArrays(r.TRIANGLE_STRIP,0,4)}render(e,t,n,r=null){let i=this.gl,a=u(e.eye,e.at),o=d(e.lens,e.frameAspect,e.sx,e.sy,1,12e3);this.vp=f(o,a),this.ivp=p(this.vp),this.eye=e.eye,this.ensureRefl(t,n),i.bindFramebuffer(i.FRAMEBUFFER,this.refl.fb),i.viewport(0,0,this.refl.w,this.refl.h),i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),i.disable(i.DEPTH_TEST),i.useProgram(this.card.p),i.uniformMatrix4fv(this.card.u(`u_vp`),!1,this.vp),i.bindVertexArray(this.cardVao);for(let t of e.cards)t.mirror!==!1&&this.drawCard(t,!0,e.time);i.bindFramebuffer(i.FRAMEBUFFER,r),i.viewport(0,0,t,n),i.disable(i.BLEND),i.useProgram(this.sky.p),i.uniformMatrix4fv(this.sky.u(`u_ivp`),!1,this.ivp),i.uniform3fv(this.sky.u(`u_cam`),e.eye),i.uniform1f(this.sky.u(`u_time`),e.time),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,this.clouds),i.uniform1i(this.sky.u(`u_clouds`),0),i.bindVertexArray(null),i.drawArrays(i.TRIANGLES,0,3);let s=this.sea;i.useProgram(s.p),i.uniformMatrix4fv(s.u(`u_vp`),!1,this.vp),i.uniformMatrix4fv(s.u(`u_ivp`),!1,this.ivp),i.uniform3fv(s.u(`u_cam`),e.eye),i.uniform1f(s.u(`u_time`),e.time),i.uniform1f(s.u(`u_time2`),e.time),i.uniform1f(s.u(`u_swell`),e.swell),i.uniform1f(s.u(`u_foamAmt`),e.foam),i.uniform2f(s.u(`u_res`),t,n),i.uniform4fv(s.u(`u_rect`),this.rect),i.uniform1f(s.u(`u_ripOn`),+!!this.rip),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,this.clouds),i.uniform1i(s.u(`u_clouds`),0),i.activeTexture(i.TEXTURE1),i.bindTexture(i.TEXTURE_2D,this.detail),i.uniform1i(s.u(`u_detail`),1),i.activeTexture(i.TEXTURE2),i.bindTexture(i.TEXTURE_2D,this.rip?this.rip[0].tex:this.detail),i.uniform1i(s.u(`u_ripple`),2),i.activeTexture(i.TEXTURE3),i.bindTexture(i.TEXTURE_2D,this.refl.tex),i.uniform1i(s.u(`u_refl`),3),i.bindVertexArray(this.vao),i.drawElements(i.TRIANGLES,this.indices,i.UNSIGNED_INT,0),i.bindVertexArray(null),i.activeTexture(i.TEXTURE0),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),i.useProgram(this.card.p),i.uniformMatrix4fv(this.card.u(`u_vp`),!1,this.vp),i.bindVertexArray(this.cardVao);for(let t of e.cards)this.drawCard(t,!1,e.time);i.bindVertexArray(null),e.birds>0&&this.drawBirds(e.time,e.birds,e.eye),i.disable(i.BLEND)}drawBirds(e,t,n){let r=this.gl,i=this.birdData,a=0;for(let t=0;t<9;t++){let r=t*2.399,o=(e*(7+t%3*2.2)*.6+t*137)%760,s=o+90+n[0]+Math.sin(e*.13+r)*12,c=900+t%4*90+Math.sin(r)*60,l=138+t%5*26+Math.sin(e*.2+r)*9,u=Math.sin(e*(2.5+t%3*.5)+r)*(.5+.5*Math.sin(e*.33+r*2)),d=(7.5+t%3)*Math.min(1,o/70,(760-o)/70),f=d*(.2+.5*u),p=d,m=.75,h=(e,t,n)=>{i[a++]=e,i[a++]=t,i[a++]=n};for(let e of[-1,1])h(s,c,l),h(s+e*p*.45,c,l+f*.75+m),h(s+e*p,c,l+f),h(s,c,l),h(s+e*p*.45,c,l+f*.75-m*.6),h(s+e*p,c,l+f)}r.useProgram(this.bird.p),r.uniformMatrix4fv(this.bird.u(`u_vp`),!1,this.vp);let o=t*.62;r.uniform4f(this.bird.u(`u_c`),.13*o,.22*o,.27*o,o),r.bindVertexArray(this.birdVao),r.bindBuffer(r.ARRAY_BUFFER,this.birdBuf),r.bufferSubData(r.ARRAY_BUFFER,0,i.subarray(0,a)),r.drawArrays(r.TRIANGLES,0,a/3),r.bindVertexArray(null)}project(e,t,n,r,i){let a=this.vp,o=a[3]*e+a[7]*t+a[11]*n+a[15],s=(a[0]*e+a[4]*t+a[8]*n+a[12])/o,c=(a[1]*e+a[5]*t+a[9]*n+a[13])/o;return[(s*.5+.5)*r,(.5-c*.5)*i]}dispose(){let e=this.gl;for(let t of[this.sky,this.sea,this.card,this.ripple,this.bird])e.deleteProgram(t.p);e.deleteVertexArray(this.birdVao),e.deleteBuffer(this.birdBuf),e.deleteVertexArray(this.vao),e.deleteVertexArray(this.cardVao),e.deleteBuffer(this.grid),e.deleteBuffer(this.ibo),e.deleteBuffer(this.cardBuf),e.deleteTexture(this.clouds),e.deleteTexture(this.detail),this.rip&&(i(e,this.rip[0]),i(e,this.rip[1])),i(e,this.refl)}},ae={en:{toggle:`Airplane mode`,still:`Still playing.`,facts:[`~4.4 MB`,`Fully offline`,`Low-powered Android`],art:`A battered low-cost phone on a wooden raft, adrift on a wide sea, its screen still showing a little island world.`},ar:{toggle:`وضع الطيران`,still:`ما زلنا نلعب.`,facts:[`نحو 4.4 ميغابايت`,`دون إنترنت بالكامل`,`هواتف أندرويد البسيطة`],art:`هاتف بسيط مستهلك على طوف خشبي في بحر واسع، وشاشته ما زالت تعرض عالماً صغيراً من الجزر.`}},oe=.015,se=.372,ce=.352,le=.4,ue=.41,de=.66,fe=.68,pe=`${t}
uniform vec2 u_scale; uniform float u_flip; out vec2 v_uv;
void main() {
  vec2 p = vec2((gl_VertexID & 1) == 0 ? -1. : 1., (gl_VertexID & 2) == 0 ? -1. : 1.);
  v_uv = vec2(p.x * .5 + .5, .5 - p.y * .5);
  gl_Position = vec4(p.x * u_scale.x * u_flip, p.y * u_scale.y, 0., 1.);
}`,me=`${t}
in vec2 v_uv; out vec4 o;
uniform sampler2D u_a; uniform sampler2D u_b; uniform float u_mix; uniform float u_alpha; uniform vec2 u_px; uniform float u_sharp;
void main() {
  vec4 c = mix(texture(u_a, v_uv), texture(u_b, v_uv), u_mix);
  if (u_sharp > 0.0) {
    vec4 n = texture(u_a, v_uv + vec2(u_px.x, 0.)) + texture(u_a, v_uv - vec2(u_px.x, 0.)) + texture(u_a, v_uv + vec2(0., u_px.y)) + texture(u_a, v_uv - vec2(0., u_px.y));
    vec4 m = texture(u_b, v_uv + vec2(u_px.x, 0.)) + texture(u_b, v_uv - vec2(u_px.x, 0.)) + texture(u_b, v_uv + vec2(0., u_px.y)) + texture(u_b, v_uv - vec2(0., u_px.y));
    vec4 blur = mix(n, m, u_mix) * 0.25;
    c = c + (c - blur) * u_sharp;
  }
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
  o = clamp(c + dither / 255.0, 0.0, 1.0) * u_alpha;
}`,he=`${t}
uniform vec2 u_q[4]; uniform mat3 u_inv; out vec3 v_h;
void main() {
  int idx = gl_VertexID == 0 ? 0 : gl_VertexID == 1 ? 1 : gl_VertexID == 2 ? 3 : 2;
  vec2 p = u_q[idx];
  v_h = u_inv * vec3(p, 1.0);
  gl_Position = vec4(p, 0., 1.);
}`,ge=`${t}
in vec3 v_h; out vec4 o;
uniform sampler2D u_live; uniform sampler2D u_ref; uniform float u_k;
void main() {
  vec2 uv = v_h.xy / v_h.z;
  vec3 d = texture(u_live, uv).rgb - texture(u_ref, uv).rgb;
  // Positive and negative parts are drawn in two passes, by blend mode, so the frame beneath needn't be sampled again.
  o = vec4(max(d, vec3(0.0)) * u_k, 1.0);
}`,_e=ge.replace(`max(d, vec3(0.0))`,`max(-d, vec3(0.0))`);function ve(e){let[t,n,r,i,a,o,s,c]=[e[6],e[7],e[4],e[5],e[2],e[3],e[0],e[1]],l=r-a,u=s-a,d=t-r+a-s,f=i-o,p=c-o,m=n-i+o-c,h=l*p-u*f||1e-9,g=(d*p-u*m)/h,_=(l*m-d*f)/h,v=r-t+g*r,y=s-t+_*s,b=t,x=i-n+g*i,S=c-n+_*c,C=n,ee=S-C*_,w=b*_-y,T=y*C-b*S,E=C*g-x,D=v-b*g,te=b*x-v*C,O=x*_-S*g,k=y*g-v*_,A=v*S-y*x;return new Float32Array([ee,E,O,w,D,k,T,te,A])}async function ye(e,t,n=!0){let r=await fetch(e,{signal:t});if(!r.ok)throw Error(`${e}: ${r.status}`);let i=await r.blob();return createImageBitmap(i,{premultiplyAlpha:n?`premultiply`:`none`,colorSpaceConversion:`none`})}function V(t){let{stage:r,copy:i,section:o,lang:s,rtl:c,reduce:l,touch:u,signal:d,base:f}=t,p=e=>`${f}about/phone/${e}`,_=ae[s];r.classList.add(`ph-stage`);let v=innerHeight>innerWidth*1.05?`port`:`land`,y=document.createElement(`canvas`);y.className=`ph-canvas`,y.setAttribute(`aria-hidden`,`true`);let b=document.createElement(`div`);b.className=`ph-poster`,b.style.backgroundImage=`url(${p(`poster-${v}.webp`)})`,c&&(b.style.transform=`scaleX(-1)`),b.setAttribute(`aria-hidden`,`true`);let x=document.createElement(`div`);x.className=`ph-copy`,x.dir=c?`rtl`:`ltr`,x.append(i),r.append(b,y,x);let S=document.createElement(`div`);S.className=`ph-panel`,S.dir=c?`rtl`:`ltr`;let C=document.createElement(`div`);C.className=`ph-row`;let w=document.createElement(`div`);w.className=`ph-status`,w.setAttribute(`aria-hidden`,`true`);let T=document.createElement(`div`);T.className=`ph-bars`;for(let e=0;e<4;e++){let t=document.createElement(`i`);t.style.setProperty(`--i`,String(e)),T.append(t)}let E=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);E.setAttribute(`viewBox`,`0 0 24 18`),E.setAttribute(`class`,`ph-wifi`),E.innerHTML=`<path d="M2 7c5.6-5 14.4-5 20 0"/><path d="M5.6 10.6c3.6-3.1 9.2-3.1 12.8 0"/><path d="M9.2 14c1.7-1.4 3.9-1.4 5.6 0"/><circle cx="12" cy="16.2" r="1.3"/>`,w.append(T,E);let D=document.createElement(`button`);D.type=`button`,D.className=`ph-switch`,D.setAttribute(`role`,`switch`),D.setAttribute(`aria-checked`,`false`);let O=document.createElement(`span`);O.className=`ph-label`,O.textContent=_.toggle;let k=document.createElement(`span`);k.className=`ph-track`,k.setAttribute(`aria-hidden`,`true`),k.innerHTML=`<span class="ph-thumb"><svg viewBox="0 0 24 24"><path d="M21 15.5v-2l-8-5V3.6c0-.9-.5-1.6-1-1.6s-1 .7-1 1.6v4.9l-8 5v2l8-2.6V18l-2.2 1.6V21l3.2-1 3.2 1v-1.4L13 18v-5.1l8 2.6Z"/></svg></span>`,D.append(O,k),C.append(w,D);let A=document.createElement(`div`);A.className=`ph-reply`,A.setAttribute(`aria-live`,`polite`);let j=document.createElement(`p`);j.className=`ph-still`,j.textContent=_.still;let M=document.createElement(`p`);M.className=`ph-facts`,_.facts.forEach(e=>{let t=document.createElement(`span`);t.textContent=e,M.append(t)});let N=document.createElement(`div`);N.className=`ph-reply-in`,N.append(j,M),A.append(N),S.append(C,A),r.append(S);let P=!1,ne=-1e9,F=0;D.addEventListener(`click`,()=>{P=!P,ne=F,D.setAttribute(`aria-checked`,String(P)),S.classList.toggle(`is-offline`,P),A.classList.toggle(`is-on`,P)},{signal:d});let re=l?null:y.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`high-performance`,preserveDrawingBuffer:!1});if(l||!re){r.classList.add(`is-static`),y.remove(),b.style.backgroundImage=`url(${p(`still-${v}.webp`)})`,b.setAttribute(`role`,`img`),b.setAttribute(`aria-label`,_.art),b.removeAttribute(`aria-hidden`),t.mark.set(1),S.classList.add(`is-in`),x.classList.add(`is-in`);let e=o.previousElementSibling;return o.style.marginTop=`${Math.min(0,46-(e&&parseFloat(getComputedStyle(e).marginBottom)||0))}px`,()=>{x.remove(),S.remove()}}let I=re;t.pin(3.2);let L=!0,R=null,z=null,B=null,V=null,H={},U=null,W=null,G=n(I,pe,me,`frame`),be=n(I,he,ge,`live`),xe=n(I,he,_e,`live-`),Se=I.createVertexArray(),K=new Map,Ce=u?6:10,we=0,q=1,J=1,Te=e=>{let t=z?.get(e);if(!t)return null;let n=K.get(e);if(n)return n.last=we,n.tex;if(K.size>=Ce){let t=-1,r=1/0;for(let[n,i]of K)i.last<r&&n!==e&&(r=i.last,t=n);t>=0&&(n=K.get(t),K.delete(t))}let r=n?.tex??I.createTexture();return I.bindTexture(I.TEXTURE_2D,r),n?I.texSubImage2D(I.TEXTURE_2D,0,0,0,I.RGBA,I.UNSIGNED_BYTE,t):(I.texStorage2D(I.TEXTURE_2D,1,I.RGBA8,t.width,t.height),I.texSubImage2D(I.TEXTURE_2D,0,0,0,I.RGBA,I.UNSIGNED_BYTE,t),I.texParameteri(I.TEXTURE_2D,I.TEXTURE_MIN_FILTER,I.LINEAR),I.texParameteri(I.TEXTURE_2D,I.TEXTURE_MAG_FILTER,I.LINEAR),I.texParameteri(I.TEXTURE_2D,I.TEXTURE_WRAP_S,I.CLAMP_TO_EDGE),I.texParameteri(I.TEXTURE_2D,I.TEXTURE_WRAP_T,I.CLAMP_TO_EDGE)),K.set(e,{tex:r,last:we}),r},Ee=!1,De=async()=>{if(!Ee){Ee=!0;try{if(R=await(await fetch(p(`${v}/manifest.json`),{signal:d})).json(),!L||!R)return;q=R.w,J=R.h,z=new e(e=>p(`${v}/f${String(e).padStart(3,`0`)}.webp`),R.frames.length,u?10:18,d,u?3:5);let[t,n]=await Promise.all([fetch(p(`cards.json`),{signal:d}).then(e=>e.json()),fetch(p(`raft-${v}.json`),{signal:d}).then(e=>e.json())]);ye(p(`poster-${v}.webp`),d).then(e=>{if(!L)return e.close();W=a(I,e),e.close()}).catch(()=>{});let[r,i,...o]=await Promise.all([ye(p(`world.webp`),d),ye(p(`raft-${v}.webp`),d),...[`volcano`,`fort`,`light`,`palms`,`dhow`].map(e=>ye(p(`${e}.webp`),d))]);if(!L)return;B=new ie(I,{low:u}),V=new ee(I,r,u?300:420,u?604:846),[`volcano`,`fort`,`light`,`palms`,`dhow`].forEach((e,n)=>{H[e]={tex:a(I,o[n],{mips:!0}),meta:t[e]}}),U={tex:a(I,i,{mips:!0}),info:n},r.close(),i.close(),o.forEach(e=>e.close())}catch(e){d.aborted||console.warn(`[phone] assets`,e)}}},Oe=new IntersectionObserver(([e])=>e.isIntersecting&&void De(),{rootMargin:`150% 0px`});Oe.observe(o);let Y=1,X=1,ke=()=>{let e=o.previousElementSibling,t=e&&parseFloat(getComputedStyle(e).marginBottom)||0;o.style.marginTop=`${Math.min(0,46-t)}px`},Ae=()=>{ke();let e=Math.min(devicePixelRatio||1,u?1.5:2),t=Math.round(r.clientWidth*e),n=Math.round(r.clientHeight*e);(t!==Y||n!==X)&&(Y=y.width=t,X=y.height=n)},je=new ResizeObserver(Ae);je.observe(r),Ae();let Z=null,Me=e=>{let t=r.getBoundingClientRect();Z={x:(e.clientX-t.left)/t.width*2-1,y:1-(e.clientY-t.top)/t.height*2,moved:!0}};r.addEventListener(`pointermove`,Me,{passive:!0,signal:d}),r.addEventListener(`pointerdown`,Me,{passive:!0,signal:d});let Ne=0,Pe=0,Q=0,Fe=!1,$=40,Ie=0,Le=0,Re=!1,ze=!1,Be=-1,Ve=c?-1:1,He=e=>{let t=R.frames,n=Math.min(t.length-1,Math.floor(e)),r=Math.min(t.length-1,n+1),i=e-n,a=t[n],o=t[r],s=(e,t)=>[g(e[0],t[0],i),g(e[1],t[1],i),g(e[2],t[2],i)];return{eye:s(a.eye,o.eye),at:s(a.at,o.at),lens:g(a.lens,o.lens,i),a,b:o,t:i}},Ue=(e,n)=>{if(!L)return;F+=n,we++,Ne+=(e-Ne)*(1-Math.exp(-n*16)),Math.abs(e-Ne)<5e-5&&(Ne=e);let r=Ne;t.stage.style.setProperty(`--ph-radius`,`${Math.round((1-h(-.002,.004,e))*32)}px`),t.stage.style.setProperty(`--ph-radius-b`,`${Math.round(h(.985,1,e)*32)}px`);let i=r>.364;i!==Re&&(Re=i,x.classList.toggle(`is-in`,i)),t.mark.set(h(.367,.44199999999999995,r));let a=r>fe;a!==ze&&(ze=a,S.classList.toggle(`is-in`,a));let o=r>ce&&!(B&&U);if(o&&!Fe&&(Fe=!0,b.style.backgroundImage=`url(${p(`still-${v}.webp`)})`),!R||!z)return;let s=R.frames.length,c=R.frames[s-1].f,l=m((r-oe)/.357)*c,d=0;{let e=R.frames,t=0;for(;t<s-2&&e[t+1].f<=l;)t++;d=t+m((l-e[t].f)/Math.max(1,e[t+1].f-e[t].f))}let f=Math.sign(d-Pe),_=Math.abs(d-Pe)>.002;Pe=d,Q+=((_?d:Math.round(d))-Q)*(1-Math.exp(-n*(_?40:7))),z.seek(d,f);let C=h(ce,le,r),ee=!!B&&!!U&&r>.348,w=1-C,T=F-ne,E=1,D=0;P&&T<2.2&&(E=T<.62?g(1,.06,h(0,.34,T)):g(.06,1,h(.62,1.9,T)),D=T<.62?h(0,.36,T):1-h(.62,1.5,T)),r<ce?Ie=0:Ie+=n*E,$=40+(l-c)/24+Ie;let O=P?1-h(.05,.75,T):h(0,.5,T),k=q/J,A=Y/X,j=A>k?1:k/A,M=A>k?A/k:1;V&&(V.setSignal(O,O),V.render(F+3)),I.bindFramebuffer(I.FRAMEBUFFER,null),I.viewport(0,0,Y,X),I.disable(I.BLEND),I.disable(I.DEPTH_TEST);let N=He(Q);if(ee&&B&&U){let e=R.sea,t=[N.eye[0],N.eye[1],N.eye[2]-e],i=[N.at[0],N.at[1],N.at[2]-e],a=m((r-se)/.628),o=a*a*(3-2*a);t[1]-=o*(J>q?30:62),t[2]+=o*2.2,i[2]+=o*2.2;let s=[],c=(e,t,n,i,a,o,c)=>{let l=H[e];if(!l)return;let u=h(a,o,r);if(u<=.001)return;let d=1+.02*Math.sin(F*.5+t),f=l.meta.h*i,p=l.meta.w*i,m=u<1?1-(1-u)**3*(1+1.2*u):1,g=-f*(1-m)*1.05+l.meta.z0*i,_=te(t*.02,n*.02,$*.3).h*.5;s.push({tex:l.tex,x:t,y:n,z:g+_*0,w:p*d*1,h:f,haze:c,water:0,waterScale:1.4,mirror:!0})},l=J>q;l?(c(`volcano`,-130,1500,12,ue,.55,.42),c(`fort`,150,1250,9,.45999999999999996,.61,.36),c(`light`,330,2100,10,.51,.6699999999999999,.5)):(c(`palms`,-470,1500,8.5,.53,de,.46),c(`volcano`,420,1900,16,ue,.57,.5),c(`light`,880,1500,11,.47,.63,.44),c(`fort`,60,1250,7.5,.5,.6499999999999999,.38));{let e=H.dhow;if(e){let t=m((r-.43)/.5700000000000001),n=t*(2-t),i=l?[250,30]:[470,128],a=N.eye[0]+g(i[0],i[1],n)-F*0+Math.sin(F*.1)*1.5,o=l?3.1:3.5,c=te(a,330,$),u=Math.atan(c.sx)*.9+Math.sin($*.5)*.015,d=e.meta.w*o,f=e.meta.h*o;s.push({tex:e.tex,x:a,y:330,z:e.meta.z0*o+c.h*.9,w:-d,h:f,haze:.13,water:c.h*.9+.1,waterScale:.9,roll:u,sway:[.004,.75],mirror:!0,alpha:h(0,.02,t)})}}{let t=U.info,n=h(ce,.45,r),i=(t.card.x0+t.card.x1)/2,a=t.card.y,o=te(i,a,$),c=o.h*.85*n,l=Math.atan(o.sx)*.8*n;C>.001&&s.push({tex:U.tex,x:i,y:a,z:t.card.z0-e+c,w:t.card.x1-t.card.x0,h:t.card.z1-t.card.z0,haze:0,water:0,waterScale:0,roll:l,mirror:!0,alpha:1,skirt:.02})}if(C>.2){if(Z?.moved){Z.moved=!1;let e=B.pick(Z.x,Z.y);if(e){let n=Math.hypot(e[0]-t[0],e[1]-t[1]),r=Math.min(16,3.4+n*.012);Be>=-1e8&&B.drop(e[0],e[1],r,(u?.9:.65)*(Be<0?.2:1)),Be=e[0],e[1]}}if(Le+=n*E,!P&&Le>1.9){Le=0;let e=U.info.card;B.drop((e.x0+e.x1)/2,e.y,5,-.42)}if(P&&T>1.15&&T<1.15+n*1.2){let e=U.info.card;B.drop((e.x0+e.x1)/2,e.y,8,.9)}let e=s.find(e=>e.tex===H.dhow?.tex);e&&Math.round(F*30)%3==0&&B.drop(e.x-16,e.y,4.5,.16)}if(B.stepRipple(n),B.render({eye:t,at:i,lens:N.lens,frameAspect:k,sx:j*Ve,sy:M,time:$,foam:Math.max(0,.34*(1-h(le,.54,r))),swell:1,cards:s,birds:h(le,.48000000000000004,r)},Y,X),V&&C>0){let e=U.info.corners;Ke(e,1,j*Ve,M,.95*C,B,U.info,t,i)}}if(w>.001){let e=Math.floor(Q),t=Math.min(s-1,e+1),n=h(.12,.88,Q-e),r=Te(e),i=t===e?r:Te(t);if(!r||!i){let e=z.nearest(Q);e>=0&&(r=Te(e),i=r)}if(r&&i){I.useProgram(G.p),I.bindVertexArray(Se),I.uniform2f(G.u(`u_scale`),j,M),I.uniform1f(G.u(`u_flip`),Ve),I.uniform1f(G.u(`u_mix`),r===i?0:n),I.uniform1f(G.u(`u_alpha`),w),I.uniform2f(G.u(`u_px`),1/q,1/J),I.uniform1f(G.u(`u_sharp`),.4),I.activeTexture(I.TEXTURE0),I.bindTexture(I.TEXTURE_2D,r),I.uniform1i(G.u(`u_a`),0),I.activeTexture(I.TEXTURE1),I.bindTexture(I.TEXTURE_2D,i),I.uniform1i(G.u(`u_b`),1),I.enable(I.BLEND),I.blendFunc(I.ONE,I.ONE_MINUS_SRC_ALPHA),I.drawArrays(I.TRIANGLE_STRIP,0,4);let e=1-h(.05,.9,Q);W&&e>.001&&(I.bindTexture(I.TEXTURE_2D,W),I.activeTexture(I.TEXTURE0),I.bindTexture(I.TEXTURE_2D,W),I.uniform1f(G.u(`u_mix`),0),I.uniform1f(G.u(`u_alpha`),e),I.uniform1f(G.u(`u_sharp`),0),I.drawArrays(I.TRIANGLE_STRIP,0,4)),I.disable(I.BLEND),I.activeTexture(I.TEXTURE0),o||(b.classList.add(`is-hidden`),y.classList.add(`is-on`));let t=(1-h(10,26,l))*.9;V&&t>.001&&Ge(N.a.corners.map((e,t)=>g(e,N.b.corners[t],N.t)),j*Ve,M,t)}}else ee&&(y.classList.add(`is-on`),b.classList.add(`is-hidden`));y.style.filter=D>.003?`saturate(${(1-D*.55).toFixed(3)}) brightness(${(1-D*.1).toFixed(3)})`:``};function We(e,t){let n=ve(Array.from(e));I.enable(I.BLEND),I.bindVertexArray(Se);for(let[r,i]of[[be,I.FUNC_ADD],[xe,I.FUNC_REVERSE_SUBTRACT]])I.useProgram(r.p),I.blendEquation(i),I.blendFunc(I.ONE,I.ONE),I.uniform2fv(r.u(`u_q`),e),I.uniformMatrix3fv(r.u(`u_inv`),!1,n),I.uniform1f(r.u(`u_k`),t),I.activeTexture(I.TEXTURE0),I.bindTexture(I.TEXTURE_2D,V.live.tex),I.uniform1i(r.u(`u_live`),0),I.activeTexture(I.TEXTURE1),I.bindTexture(I.TEXTURE_2D,V.ref.tex),I.uniform1i(r.u(`u_ref`),1),I.drawArrays(I.TRIANGLE_STRIP,0,4);I.blendEquation(I.FUNC_ADD),I.disable(I.BLEND),I.activeTexture(I.TEXTURE0)}function Ge(e,t,n,r){let i=new Float32Array(8);for(let r=0;r<4;r++)i[r*2]=(e[r*2]*2-1)*t,i[r*2+1]=(1-e[r*2+1]*2)*n;We(i,r)}function Ke(e,t,n,r,i,a,o,s,c){let l=new Float32Array(8),u=o.card,d=u.x1-u.x0,f=u.z1-u.z0;for(let t=0;t<4;t++){let n=(e[t*2]-o.crop[0])/o.crop[2],r=(e[t*2+1]-o.crop[1])/o.crop[3],[i,s]=a.project(u.x0+n*d,u.y,u.z1-(R?.sea??0)-r*f,Y,X);l[t*2]=i/Y*2-1,l[t*2+1]=1-s/X*2}We(l,i)}return t.frame(Ue),y.addEventListener(`webglcontextlost`,()=>{L=!1,r.classList.add(`is-lost`),b.style.backgroundImage=`url(${p(`still-${v}.webp`)})`,b.classList.remove(`is-hidden`),y.classList.remove(`is-on`),x.classList.add(`is-in`),S.classList.add(`is-in`),t.mark.set(1)},{signal:d}),()=>{L=!1,Oe.disconnect(),je.disconnect(),z?.dispose(),B?.dispose(),V?.dispose();for(let e of K.values())I.deleteTexture(e.tex);for(let e of Object.values(H))I.deleteTexture(e.tex);U&&I.deleteTexture(U.tex),W&&I.deleteTexture(W),I.deleteProgram(G.p),I.deleteProgram(be.p),I.deleteProgram(xe.p),I.deleteVertexArray(Se),I.getExtension(`WEBGL_lose_context`)?.loseContext(),x.remove(),S.remove(),y.remove(),b.remove()}}var H=e=>V(e);export{H as default};