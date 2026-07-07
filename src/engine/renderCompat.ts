import Phaser from 'phaser';

/**
 * Workarounds for GPU/driver bugs that destroy the alpha channel of
 * canvas-backed WebGL textures.
 *
 * Phaser uploads canvas textures by handing the HTMLCanvasElement straight to
 * `gl.texImage2D`. On some GPUs/drivers that canvas→texture copy takes an
 * accelerated path that loses transparency, so every procedural sprite and
 * Text object renders as an opaque black box. (The `premultipliedAlpha`
 * context attribute does NOT help — it only affects how the finished frame is
 * composited with the page, never texture uploads.)
 *
 * Defense in depth, since the whole demo is canvas-backed textures:
 *  1. `installCanvasTextureUploadFix()` reroutes canvas uploads through
 *     ImageData (`getImageData` → `texImage2D`), the spec-defined CPU
 *     conversion path that behaves the same on all drivers.
 *  2. `chooseRendererType()` probes WebGL before the game boots: it uploads a
 *     tiny part-transparent ImageData, reads the texels back, and picks the
 *     Canvas renderer if the alpha didn't survive even that path.
 *  3. `?renderer=canvas` / `?renderer=webgl` in the URL overrides everything,
 *     as a user-reachable escape hatch on hardware we haven't seen.
 */

type TextureWrapperProto = {
  pixels: unknown;
  _processTexture: (...args: unknown[]) => unknown;
  __canvasUploadFix?: boolean;
};

/**
 * Patch Phaser's WebGLTextureWrapper so HTMLCanvasElement sources are
 * converted to ImageData just for the GPU upload. `_processTexture` is the
 * single choke point: initial creation, `CanvasTexture.refresh()`, Text
 * updates, and context-restore all go through it. The live canvas reference
 * is restored afterwards so later refreshes re-read current canvas content.
 */
export function installCanvasTextureUploadFix(): void {
  const wrapper = (
    Phaser.Renderer.WebGL as unknown as {
      Wrappers?: { WebGLTextureWrapper?: { prototype: TextureWrapperProto } };
    }
  ).Wrappers?.WebGLTextureWrapper;
  const proto = wrapper?.prototype;
  if (!proto || proto.__canvasUploadFix) return;
  proto.__canvasUploadFix = true;

  const original = proto._processTexture;
  proto._processTexture = function (this: TextureWrapperProto, ...args: unknown[]): unknown {
    const source = this.pixels;
    if (source instanceof HTMLCanvasElement && source.width > 0 && source.height > 0) {
      const ctx = source.getContext('2d');
      if (ctx) {
        this.pixels = ctx.getImageData(0, 0, source.width, source.height);
        try {
          return original.apply(this, args);
        } finally {
          this.pixels = source;
        }
      }
    }
    return original.apply(this, args);
  };
}

/**
 * Upload a 2×2 ImageData (one opaque pixel, three transparent) to a WebGL
 * texture exactly the way Phaser does (UNPACK_PREMULTIPLY_ALPHA_WEBGL on) and
 * read the texels back. Returns false only when the driver demonstrably
 * corrupts the alpha channel; true on success or when the probe can't run
 * (no WebGL, incomplete framebuffer, exceptions) — Phaser.AUTO handles those.
 */
function webglPreservesCanvasAlpha(): boolean {
  try {
    const src = document.createElement('canvas');
    src.width = 2;
    src.height = 2;
    const c2d = src.getContext('2d');
    if (!c2d) return true;
    c2d.fillStyle = 'rgba(255,0,0,1)';
    c2d.fillRect(0, 0, 1, 1);
    const data = c2d.getImageData(0, 0, 2, 2);

    const glCanvas = document.createElement('canvas');
    glCanvas.width = 2;
    glCanvas.height = 2;
    const gl = (glCanvas.getContext('webgl2') ??
      glCanvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return true;

    const out = new Uint8Array(2 * 2 * 4);
    gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, out);
    const alphas = [out[3], out[7], out[11], out[15]];
    // Exactly one pixel is opaque; the other three must come back transparent.
    return alphas.filter((a) => a < 16).length === 3 && alphas.some((a) => a > 240);
  } catch {
    return true;
  }
}

/** Pick the Phaser renderer: URL override first, else probe, else AUTO. */
export function chooseRendererType(): number {
  let override: string | null = null;
  try {
    override = new URLSearchParams(window.location.search).get('renderer');
  } catch {
    /* no window/location (headless) — fall through to the probe */
  }
  if (override === 'canvas') return Phaser.CANVAS;
  if (override === 'webgl') return Phaser.WEBGL;

  if (!webglPreservesCanvasAlpha()) {
    console.warn(
      'click-o-mat: this WebGL driver corrupts canvas-texture transparency; ' +
        'falling back to the Canvas renderer. Force WebGL with ?renderer=webgl.'
    );
    return Phaser.CANVAS;
  }
  return Phaser.AUTO;
}
