/**
 * A tiny SVG toolkit for the demo's cartoon look — crooked, hand-inked
 * shapes (Day of the Tentacle) with flat cel shading, soft light pools and a
 * paper-grain finish (Return to Monkey Island). Everything returns SVG markup
 * strings for `svg` room layers and the procedural character/icon art.
 *
 * Shapes wobble deterministically: the same seed always draws the same
 * "hand-drawn" line, so a layer's markup is stable across repaints (and the
 * engine's per-markup texture cache keeps hitting).
 */

export type Pt = [number, number];

/** Outline ink: a warm near-black, never pure #000. */
export const INK = '#1e1424';

/** Round to 0.1 px — keeps markup compact and stable. */
const n = (v: number): string => String(Math.round(v * 10) / 10);

/** mulberry32 — small seeded PRNG for repeatable wobble. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- paths -------------------------------------------------------------------

export interface WobbleOpts {
  seed?: number;
  /** Max bow of an edge (px), scaled down on short edges. Default 1.6. */
  wobble?: number;
  /** Max corner displacement (px). Default wobble / 2. */
  jitter?: number;
  closed?: boolean;
}

/** Path data through the points with every edge gently bowed, like an
 *  inked line drawn by hand. */
export function wobble(pts: Pt[], o: WobbleOpts = {}): string {
  const r = rng(o.seed ?? 1);
  const w = o.wobble ?? 1.6;
  const j = o.jitter ?? w / 2;
  const closed = o.closed ?? true;
  const p = pts.map(([x, y]) => [x + (r() - 0.5) * 2 * j, y + (r() - 0.5) * 2 * j] as Pt);
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  const count = closed ? p.length : p.length - 1;
  for (let i = 0; i < count; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const bow = (r() - 0.5) * 2 * w * Math.min(1, len / 80);
    const cx = (a[0] + b[0]) / 2 - (dy / len) * bow * 2;
    const cy = (a[1] + b[1]) / 2 + (dx / len) * bow * 2;
    d += `Q${n(cx)} ${n(cy)} ${n(b[0])} ${n(b[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/** Straight-edged polygon path data (no wobble). */
export function poly(pts: Pt[], closed = true): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join('') + (closed ? 'Z' : '');
}

/** Corners of an axis-aligned rectangle. */
export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** A crooked quad: a rect whose top edge is shifted by `lean` px and whose
 *  corners sag/rise a little — DOTT architecture never stands quite plumb. */
export function crookedRect(x: number, y: number, w: number, h: number, lean = 0, sag = 0): Pt[] {
  return [
    [x + lean, y + sag],
    [x + w + lean, y - sag],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** Path data for a smooth closed blob through the points (Catmull-Rom). */
export function blob(pts: Pt[]): string {
  const m = pts.length;
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % m];
    const p3 = pts[(i + 2) % m];
    d +=
      `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + 'Z';
}

/** Path data for an open smooth curve through the points (Catmull-Rom). */
export function curve(pts: Pt[]): string {
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d +=
      `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}

/** A puffy cloud/foliage outline: `count` bumps around an ellipse. */
export function puff(cx: number, cy: number, rx: number, ry: number, count: number, seed = 1, bump = 0.22): string {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < count * 2; i++) {
    const a = (i / (count * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 + bump * (0.6 + r() * 0.8) : 1 - bump * 0.35;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return blob(pts);
}

// ---- elements ------------------------------------------------------------------

export interface Style {
  fill?: string;
  stroke?: string;
  /** stroke-width (default 3 when a stroke is set). */
  sw?: number;
  opacity?: number;
  /** Extra raw attributes. */
  extra?: string;
}

function attrs(s: Style): string {
  let a = ` fill="${s.fill ?? 'none'}"`;
  if (s.stroke) {
    a += ` stroke="${s.stroke}" stroke-width="${s.sw ?? 3}" stroke-linejoin="round" stroke-linecap="round"`;
  }
  if (s.opacity !== undefined) a += ` opacity="${s.opacity}"`;
  if (s.extra) a += ` ${s.extra}`;
  return a;
}

export function path(d: string, s: Style): string {
  return `<path d="${d}"${attrs(s)}/>`;
}

/** The workhorse: a filled shape with an ink outline. */
export function inked(d: string, fill: string, sw = 3, extra?: string): string {
  return path(d, { fill, stroke: INK, sw, extra });
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, s: Style): string {
  return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"${attrs(s)}/>`;
}

export function circle(cx: number, cy: number, r: number, s: Style): string {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${attrs(s)}/>`;
}

export function rect(x: number, y: number, w: number, h: number, s: Style, rx = 0): string {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${rx}"` : ''}${attrs(s)}/>`;
}

export function line(a: Pt, b: Pt, stroke: string, sw = 2, opacity?: number): string {
  return path(`M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`, { stroke, sw, opacity });
}

export function group(children: string | string[], transform?: string, extra?: string): string {
  const body = Array.isArray(children) ? children.join('') : children;
  return `<g${transform ? ` transform="${transform}"` : ''}${extra ? ` ${extra}` : ''}>${body}</g>`;
}

export interface TextOpts {
  size: number;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number | string;
  rotate?: number;
  family?: string;
  stroke?: string;
  sw?: number;
  spacing?: number;
}

/** Cartoon lettering. SVG drawn as an image can't reach web fonts, so this
 *  sticks to heavy system faces with generic fallbacks. */
export function text(x: number, y: number, str: string, o: TextOpts): string {
  const fam = o.family ?? "'Arial Black', 'Trebuchet MS', Verdana, sans-serif";
  const rot = o.rotate ? ` transform="rotate(${o.rotate} ${n(x)} ${n(y)})"` : '';
  const st = o.stroke
    ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 3}" stroke-linejoin="round" paint-order="stroke"`
    : '';
  const sp = o.spacing ? ` letter-spacing="${o.spacing}"` : '';
  const esc = str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<text x="${n(x)}" y="${n(y)}" font-family="${fam}" font-size="${o.size}" font-weight="${o.weight ?? 900}" fill="${o.fill}" text-anchor="${o.anchor ?? 'middle'}"${sp}${st}${rot}>${esc}</text>`;
}

// ---- paint servers & filters -----------------------------------------------------

export type Stop = [offset: number, color: string, opacity?: number];

function stops(list: Stop[]): string {
  return list
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`)
    .join('');
}

/** Linear gradient in user space (absolute px). */
export function linear(id: string, x1: number, y1: number, x2: number, y2: number, list: Stop[]): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${stops(list)}</linearGradient>`;
}

/** Radial gradient in user space; ry ≠ r squashes it into an ellipse. */
export function radial(id: string, cx: number, cy: number, r: number, list: Stop[], ry = r): string {
  const t = ry !== r ? ` gradientTransform="translate(${n(cx)} ${n(cy)}) scale(1 ${n(ry / r)}) translate(${n(-cx)} ${n(-cy)})"` : '';
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${t}>${stops(list)}</radialGradient>`;
}

/**
 * Paper grain + painted mottle, as tiling patterns (`url(#grain)`,
 * `url(#mottle)`). The noise is rendered once per tile, not per pixel of the
 * layer, so even a 2000 px backdrop rasterizes quickly.
 */
export function grainDefs(seed = 7): string {
  return (
    `<filter id="grainF" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}" stitchTiles="stitch"/>` +
    // Alpha from noise: dark specks where R is high, light specks where G is low.
    `<feColorMatrix type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0 0.12  2.4 0 0 0 -1.25"/>` +
    `</filter>` +
    `<filter id="mottleF" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="${seed + 1}" stitchTiles="stitch"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.14  1.6 0 0 0 -0.72"/>` +
    `</filter>` +
    `<pattern id="grain" width="256" height="256" patternUnits="userSpaceOnUse">` +
    `<rect width="256" height="256" filter="url(#grainF)"/></pattern>` +
    `<pattern id="mottle" width="512" height="512" patternUnits="userSpaceOnUse">` +
    `<rect width="512" height="512" filter="url(#mottleF)"/></pattern>`
  );
}

/** Full-layer grain + mottle overlay (needs grainDefs() in <defs>). Clip it
 *  with `clip` (a clipPath id) to keep transparent cut-outs transparent. */
export function grainOverlay(w: number, h: number, grain = 0.38, mottle = 0.3, clip?: string): string {
  const c = clip ? ` clip-path="url(#${clip})"` : '';
  return (
    `<g${c} style="pointer-events:none">` +
    rect(0, 0, w, h, { fill: 'url(#mottle)', opacity: mottle }) +
    rect(0, 0, w, h, { fill: 'url(#grain)', opacity: grain }) +
    `</g>`
  );
}

/** Soft dark vignette around the layer edges (needs its own gradient id). */
export function vignette(id: string, w: number, h: number, strength = 0.45, color = '#140a1c'): string {
  return (
    `<defs>${radial(id, w / 2, h * 0.45, Math.max(w, h) * 0.62, [
      [0.55, color, 0],
      [1, color, strength],
    ], Math.max(w, h) * 0.62 * (h / w) * 1.5)}</defs>` + rect(0, 0, w, h, { fill: `url(#${id})` })
  );
}

/** A pool of light (warm by default) — an additive-looking soft glow. */
export function glow(id: string, cx: number, cy: number, r: number, color = '#ffe2a0', strength = 0.45, ry = r): string {
  return (
    `<defs>${radial(id, cx, cy, r, [
      [0, color, strength],
      [0.45, color, strength * 0.45],
      [1, color, 0],
    ], ry)}</defs>` + ellipse(cx, cy, r, ry, { fill: `url(#${id})` })
  );
}

/** Wrap markup in <defs>. */
export function defs(...items: string[]): string {
  return `<defs>${items.join('')}</defs>`;
}
