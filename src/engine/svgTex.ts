/**
 * SVG → texture rasterization. Vector art (inline markup, or an Inkscape /
 * Illustrator file imported with Vite's `?raw`) is decoded by the browser and
 * drawn ONCE into a canvas texture; Phaser then treats it like any other
 * procedural texture. Rasterizing up front matters: drawing a live SVG image
 * every frame would re-run its filters (grain, blur) on every frame.
 *
 * Decoding is asynchronous, so callers prepare textures ahead of use (rooms
 * rasterize their `svg` layers under the transition fade; BootScene awaits
 * its character frames before the title screen).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Wrap inner SVG markup in a w×h `<svg>` root (user units = pixels).
 *  Markup that already is a complete `<svg>` document passes through and is
 *  later scaled to w×h when drawn. */
export function svgDocument(markup: string, w: number, h: number): string {
  const trimmed = markup.trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(trimmed)) return markup;
  return `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${markup}</svg>`;
}

/** Decode an SVG document into an image element ready for drawImage(). A
 *  same-origin blob URL keeps the canvas it is drawn into untainted, so
 *  WebGL uploads via getImageData (see renderCompat.ts) keep working. */
export async function decodeSvg(svg: string, label = 'svg'): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      // decode() rejects without detail; reparse to name the real problem.
      const err = new DOMParser()
        .parseFromString(svg, 'image/svg+xml')
        .querySelector('parsererror')?.textContent;
      throw new Error(`Could not decode SVG "${label}"${err ? `: ${err.trim()}` : ''}`);
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rasterize SVG markup into a (new or replaced) w×h canvas texture. */
export async function makeSvgTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  markup: string
): Promise<void> {
  const img = await decodeSvg(svgDocument(markup, w, h), key);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create canvas texture ${key}`);
  const g = tex.getContext();
  g.clearRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  tex.refresh();
}
