import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial,
  type Vector3,
} from 'three'

/** Brand palette as raw sRGB triples (the shader writes them without conversion). */
const hex = (value: number): [number, number, number] => [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255]
export const SPARK_PINK = hex(0xfa2a6f)
export const SPARK_ICE = hex(0xbadfe6)
export const SPARK_CREAM = hex(0xfff0dc)
export const SPARK_ROSE = hex(0xff8fb4)

/**
 * A fixed pool of additive sparkles in world space: one Points draw call, no
 * allocation after construction. Dead particles have zero size.
 */
export class Sparks {
  readonly points: Points
  readonly material: ShaderMaterial
  private readonly geometry = new BufferGeometry()
  private readonly position: Float32Array
  private readonly color: Float32Array
  private readonly shape: Float32Array // size, alpha
  private readonly velocity: Float32Array
  private readonly life: Float32Array // age, lifetime, base size, spin
  private cursor = 0
  alive = 0

  constructor(private readonly capacity = 160) {
    this.position = new Float32Array(capacity * 3)
    this.color = new Float32Array(capacity * 3)
    this.shape = new Float32Array(capacity * 2)
    this.velocity = new Float32Array(capacity * 3)
    this.life = new Float32Array(capacity * 4)
    this.geometry.setAttribute('position', new BufferAttribute(this.position, 3))
    this.geometry.setAttribute('color', new BufferAttribute(this.color, 3))
    this.geometry.setAttribute('shape', new BufferAttribute(this.shape, 2))
    this.material = new ShaderMaterial({
      name: 'Sparks',
      uniforms: { uScale: { value: 400 }, uHeight: { value: 400 } },
      vertexShader: /* glsl */ `
attribute vec3 color;
attribute vec2 shape;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  vAlpha = shape.y;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = shape.x * uScale / max( -mv.z, 0.01 );
  gl_Position = projectionMatrix * mv;
}`,
      fragmentShader: /* glsl */ `
uniform float uHeight;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length( p );
  // A soft core with a four-point glint, the way light catches on glitter.
  float core = exp( -r * r * 14.0 );
  float rays = exp( -abs( p.x * p.y ) * 60.0 ) * max( 0.0, 1.0 - r );
  float a = ( core + rays * 0.55 ) * vAlpha;
  // Fade near the top edge of the canvas so nothing is ever cut by it.
  a *= 1.0 - smoothstep( uHeight * 0.88, uHeight, gl_FragCoord.y );
  if ( a < 0.004 ) discard;
  gl_FragColor = vec4( mix( vColor, vec3( 1.0 ), core * 0.5 ) * a, 0.0 );
}`,
      transparent: true, depthWrite: false, depthTest: true, blending: AdditiveBlending, premultipliedAlpha: true, toneMapped: false,
    })
    this.points = new Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = 3
  }

  /** Emits one particle at `origin` with `velocity` (world units/s). */
  emit(origin: Vector3, vx: number, vy: number, vz: number, color: [number, number, number], size: number, lifetime: number) {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % this.capacity
    this.position[i * 3] = origin.x; this.position[i * 3 + 1] = origin.y; this.position[i * 3 + 2] = origin.z
    this.velocity[i * 3] = vx; this.velocity[i * 3 + 1] = vy; this.velocity[i * 3 + 2] = vz
    this.color[i * 3] = color[0]; this.color[i * 3 + 1] = color[1]; this.color[i * 3 + 2] = color[2]
    this.life[i * 4] = 0; this.life[i * 4 + 1] = lifetime; this.life[i * 4 + 2] = size; this.life[i * 4 + 3] = Math.random() * 6.28
    this.alive = Math.max(this.alive, 1)
  }

  /** Integrates the pool; returns true while anything is still visible. */
  update(dt: number) {
    if (!this.alive) return false
    let alive = 0
    const drag = Math.exp(-dt * 1.6)
    for (let i = 0; i < this.capacity; i++) {
      const lifetime = this.life[i * 4 + 1]
      if (lifetime <= 0) continue
      const age = this.life[i * 4] + dt
      if (age >= lifetime) {
        this.life[i * 4 + 1] = 0
        this.shape[i * 2] = 0; this.shape[i * 2 + 1] = 0
        continue
      }
      alive++
      this.life[i * 4] = age
      this.velocity[i * 3] *= drag
      this.velocity[i * 3 + 1] = this.velocity[i * 3 + 1] * drag - 2.6 * dt
      this.velocity[i * 3 + 2] *= drag
      this.position[i * 3] += this.velocity[i * 3] * dt
      this.position[i * 3 + 1] += this.velocity[i * 3 + 1] * dt
      this.position[i * 3 + 2] += this.velocity[i * 3 + 2] * dt
      const t = age / lifetime
      const twinkle = .75 + .25 * Math.sin(age * 22 + this.life[i * 4 + 3])
      this.shape[i * 2] = this.life[i * 4 + 2] * (t < .12 ? t / .12 : 1 - (t - .12) / .88 * .6)
      this.shape[i * 2 + 1] = (t < .1 ? t / .1 : (1 - t) * (1 - t) / .81) * twinkle
    }
    this.alive = alive
    ;(this.geometry.attributes.position as BufferAttribute).needsUpdate = true
    ;(this.geometry.attributes.shape as BufferAttribute).needsUpdate = true
    ;(this.geometry.attributes.color as BufferAttribute).needsUpdate = true
    return alive > 0
  }

  clear() {
    this.life.fill(0); this.shape.fill(0); this.alive = 0
    ;(this.geometry.attributes.shape as BufferAttribute).needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
