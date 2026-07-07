import Phaser from 'phaser';

/**
 * Workarounds for GPU/driver bugs that destroy the alpha channel of
 * canvas-backed WebGL textures.
 *
 * Phaser uploads canvas textures by handing the HTMLCanvasElement straight to
 * `gl.texImage2D`. On some GPUs/drivers the WebGL path corrupts transparency,
 * so every procedural sprite and Text object renders as an opaque black box.
 * (The `premultipliedAlpha` context attribute does NOT help — it only affects
 * how the finished frame is composited with the page, never texture uploads.)
 *
 * We first shipped WebGL-with-defenses: canvas uploads rerouted through
 * ImageData plus a boot-time probe that uploaded a part-transparent test
 * texture, read the texels back, and fell back to the Canvas renderer on
 * corruption. Real hardware then surfaced drivers that PASS that probe (the
 * readback is clean) and still corrupt alpha when the texture is drawn — the
 * bug can live in the sampling/blending path, which no upload-side check can
 * see. So:
 *
 *  1. `chooseRendererType()` now defaults to the Canvas renderer, which is
 *     immune to the whole bug class and easily fast enough for a 960×600
 *     point-and-click. `?renderer=webgl` (or `?renderer=auto`) opts back into
 *     WebGL on hardware known to be good.
 *  2. `installCanvasTextureUploadFix()` still hardens the opt-in WebGL path:
 *     canvas uploads go through ImageData (`getImageData` → `texImage2D`),
 *     the spec-defined CPU conversion path that behaves the same on all
 *     drivers.
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
 * A no-op unless the game runs with `?renderer=webgl` / `?renderer=auto`.
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
 * Pick the Phaser renderer: Canvas by default (see module comment),
 * `?renderer=webgl` forces WebGL, `?renderer=auto` restores Phaser's own
 * WebGL-first detection.
 */
export function chooseRendererType(): number {
  let override: string | null = null;
  try {
    override = new URLSearchParams(window.location.search).get('renderer');
  } catch {
    /* no window/location (headless) — use the default */
  }
  if (override === 'webgl') return Phaser.WEBGL;
  if (override === 'auto') return Phaser.AUTO;
  return Phaser.CANVAS;
}
