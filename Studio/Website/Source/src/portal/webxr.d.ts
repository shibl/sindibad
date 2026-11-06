// Just the parts of WebXR the portal uses, since TypeScript's own DOM types leave it out.
interface XRRigidTransform {
  readonly position: DOMPointReadOnly
  readonly matrix: Float32Array
  readonly inverse: XRRigidTransform
}
interface XRView {
  readonly transform: XRRigidTransform
  readonly projectionMatrix: Float32Array
}
interface XRViewerPose {
  readonly transform: XRRigidTransform
  readonly views: readonly XRView[]
}
interface XRPose {
  readonly transform: XRRigidTransform
}
interface XRHitTestResult {
  getPose(space: XRSpace): XRPose | undefined
}
type XRHitTestSource = object
type XRSpace = object
interface XRFrame {
  getViewerPose(space: XRSpace): XRViewerPose | undefined
  getHitTestResults(source: XRHitTestSource): XRHitTestResult[]
}
interface XRSessionInit {
  requiredFeatures?: string[]
  optionalFeatures?: string[]
  domOverlay?: { root: Element }
}
interface XRSession extends EventTarget {
  updateRenderState(state: { baseLayer?: XRWebGLLayer; depthNear?: number; depthFar?: number }): void
  requestReferenceSpace(type: string): Promise<XRSpace>
  requestHitTestSource?(options: { space: XRSpace }): Promise<XRHitTestSource>
  requestAnimationFrame(callback: (time: number, frame: XRFrame) => void): number
  end(): Promise<void>
}
interface XRSystem {
  isSessionSupported(mode: string): Promise<boolean>
  requestSession(mode: string, init?: XRSessionInit): Promise<XRSession>
}
declare class XRWebGLLayer {
  constructor(session: XRSession, gl: WebGL2RenderingContext, init?: { alpha?: boolean; antialias?: boolean; depth?: boolean; stencil?: boolean })
  readonly framebuffer: WebGLFramebuffer | null
  getViewport(view: XRView): { x: number; y: number; width: number; height: number } | undefined
}
interface Navigator {
  readonly xr?: XRSystem
}
interface WebGL2RenderingContext {
  makeXRCompatible(): Promise<void>
}
