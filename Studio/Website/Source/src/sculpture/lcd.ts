import {
  AdditiveBlending, Color, MeshStandardMaterial, NormalBlending, ShaderMaterial,
  type Texture,
} from 'three'

/**
 * The display: dark glass with real environment reflections (so the sheen slides
 * across it as the console turns), lit by the cartridge framebuffer as emission.
 * It is not tone mapped, so the game's colours are shown as drawn instead of being
 * washed out, and a pixel grid and edge falloff make it read as a backlit LCD.
 */
export function createScreenMaterial(map: Texture, width: number, height: number) {
  const uniforms = {
    lcdSize: { value: [width, height] },
    lcdPower: { value: 0 },
  }
  const material = new MeshStandardMaterial({
    name: 'LiveScreen', color: '#020606', roughness: .06, metalness: 0,
    emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 1, envMapIntensity: 1.25,
  })
  material.toneMapped = false
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 lcdSize;\nuniform float lcdPower;')
      .replace('#include <emissivemap_fragment>', /* glsl */ `
#ifdef USE_EMISSIVEMAP
  vec2 lcdUv = vEmissiveMapUv;
  vec3 lcd = texture2D( emissiveMap, lcdUv ).rgb;
  vec2 cell = lcdUv * lcdSize;
  vec2 cellWidth = fwidth( cell );
  float cellPx = 1.0 / max( max( cellWidth.x, cellWidth.y ), 1e-4 );
  vec2 inCell = abs( fract( cell ) - 0.5 );
  // Thin dark gaps between pixels, faded out where a pixel covers too few device pixels to show them cleanly.
  float gap = smoothstep( 0.5 - 1.2 / cellPx, 0.5, max( inCell.x, inCell.y ) );
  lcd *= 1.0 - 0.32 * gap * smoothstep( 2.2, 5.0, cellPx );
  vec2 q = lcdUv * 2.0 - 1.0;
  float edge = max( abs( q.x ), abs( q.y ) );
  float falloff = ( 1.0 - 0.5 * pow( edge, 6.0 ) ) * ( 1.0 - 0.12 * dot( q, q ) );
  // A faint backlight that makes even black pixels glow a little, like a real panel.
  vec3 backlight = vec3( 0.006, 0.016, 0.015 ) * lcdPower;
  totalEmissiveRadiance *= ( lcd + backlight ) * falloff;
  // A soft diagonal sheen on the cover glass that slides as the console turns.
  vec3 lcdReflect = reflect( normalize( vViewPosition ), normalize( normal ) );
  float lcdBand = lcdUv.x * 0.6 - lcdUv.y * 0.85 + ( lcdReflect.x - lcdReflect.y ) * 1.6;
  float lcdSheen = exp( -pow( ( lcdBand + 0.2 ) * 3.2, 2.0 ) ) * 0.05 + exp( -pow( ( lcdBand - 0.18 ) * 14.0, 2.0 ) ) * 0.025;
  totalEmissiveRadiance += vec3( 0.85, 0.95, 1.0 ) * lcdSheen * ( 1.0 - 0.35 * edge );
#endif`)
  }
  material.customProgramCacheKey = () => 'sindibad-lcd'
  return { material, uniforms }
}

const roundRect = /* glsl */ `
float roundRect( vec2 p, vec2 halfSize, float radius ) {
  vec2 d = abs( p ) - halfSize + radius;
  return length( max( d, 0.0 ) ) + min( max( d.x, d.y ), 0.0 ) - radius;
}`

const planeVertex = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`

/** Additive light that bleeds off the display onto the bezel, like a lit panel under glass. */
export function createHaloMaterial(center: [number, number], halfSize: [number, number]) {
  return new ShaderMaterial({
    name: 'ScreenHalo',
    uniforms: {
      uColor: { value: new Color(0, 0, 0) },
      uStrength: { value: 0 },
      uCenter: { value: center },
      uHalf: { value: halfSize },
    },
    vertexShader: planeVertex,
    fragmentShader: /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform vec2 uCenter;
uniform vec2 uHalf;
varying vec2 vPos;
${roundRect}
void main() {
  float d = roundRect( vPos - uCenter, uHalf, 0.1 );
  // Nothing over the panel itself (it already emits); a tight bloom on the bezel and a wide,
  // faint spill, windowed to zero well before the edge of this quad.
  float glow = d < 0.0 ? 0.0 : 0.2 * exp( -d * 11.0 ) + 0.06 * exp( -d * 3.6 );
  glow *= smoothstep( -0.02, 0.01, d ) * ( 1.0 - smoothstep( 0.32, 0.56, d ) );
  gl_FragColor = vec4( uColor * glow * uStrength, 0.0 ); // pure light: adds colour, never coverage
}`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true, toneMapped: false,
  })
}

/** A tiny additive bloom for the status LED. */
export function createDotMaterial(radius: number) {
  return new ShaderMaterial({
    name: 'LedGlow',
    uniforms: { uColor: { value: new Color(0, 0, 0) }, uRadius: { value: radius } },
    vertexShader: planeVertex,
    fragmentShader: /* glsl */ `
uniform vec3 uColor;
uniform float uRadius;
varying vec2 vPos;
void main() {
  float r = length( vPos ) / uRadius;
  float a = exp( -r * r * 9.0 ) * 0.9 + exp( -r * 4.0 ) * 0.25;
  gl_FragColor = vec4( uColor * a * ( 1.0 - smoothstep( 0.7, 1.0, r ) ), 0.0 );
}`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true, toneMapped: false,
  })
}

/** The soft contact shadow and faint screen-coloured pool beneath the floating console. */
export function createShadowMaterial() {
  return new ShaderMaterial({
    name: 'ContactShadow',
    uniforms: {
      uOpacity: { value: .5 },
      uGlow: { value: new Color(0, 0, 0) },
    },
    vertexShader: planeVertex,
    fragmentShader: /* glsl */ `
uniform float uOpacity;
uniform vec3 uGlow;
varying vec2 vPos;
void main() {
  vec2 p = vPos * 2.0;
  float r = dot( p, p );
  float core = exp( -r * 5.5 );
  float wide = exp( -r * 1.6 );
  float alpha = uOpacity * ( core * 0.75 + wide * 0.35 );
  vec3 color = uGlow * wide * 0.12;
  gl_FragColor = vec4( color, alpha );
}`,
    transparent: true, depthWrite: false, blending: NormalBlending, toneMapped: false,
  })
}
