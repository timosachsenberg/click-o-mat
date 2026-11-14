import type { ActorVariant, SvgActorAsset } from '../../engine/types';
import {
  INK,
  circle,
  defs,
  ellipse,
  glow,
  grainDefs,
  grainOverlay,
  group,
  line,
  linear,
  path,
  poly,
  radial,
  rect,
  rng,
  text,
  vignette,
  wobble,
  type Pt,
} from '../../game/art/toon';

/**
 * Inside the Hölderlinturm: Hölderlin's round room, three deep windows onto
 * the Neckar in the sunset, his writing desk, a rug — and in front of the
 * middle window Otto R.'s Rössler attractor, a wire spiral on a pedestal
 * that throws the room between three "time layers":
 *
 *   0  toon   — the house style (hand-inked, cel-shaded, paper grain)
 *   1  pixel  — a 1987 EGA adventure: 5 px blocks, sixteen colours
 *   2  modern — a cartoon collage: thick black outlines, photo textures
 *
 * One shared floor plan (TM) — all three renderers draw the same room, so
 * hotspots, walk area and actors fit every layer. Everything is drawn in
 * room coordinates (960×450) and returned as SVG markup.
 */

export type Era = 0 | 1 | 2;

export const TM = {
  /** The attractor's pedestal (centre x, top, foot) and the spiral's box. */
  pedestal: { x: 480, top: 252, foot: 334, w: 46 },
  spiral: { cx: 480, cy: 192, w: 136, h: 104 },
  windows: [
    { cx: 296, w: 54, top: 96, bottom: 226 },
    { cx: 480, w: 70, top: 84, bottom: 232 },
    { cx: 664, w: 54, top: 96, bottom: 226 },
  ],
  desk: { x: 150, w: 112, top: 248, foot: 352 },
  door: [[18, 146], [86, 166], [86, 372], [18, 394]] as Pt[],
  /** "PUT PUT", and the arch it points at — where the hole goes. */
  graffiti: { x: 724, y: 132, w: 200, h: 84 },
  arch: { x: 780, w: 72, top: 234, foot: 352 },
  rug: { cx: 470, cy: 396, rx: 150, ry: 32 },
  hole: { cx: 500, cy: 398, rx: 46, ry: 14 },
};

/** Where the back wall meets the floor (a round room: lowest at the sides). */
export const wallBase = (x: number) => 318 + 70 * ((x - 480) / 500) ** 2;
const ceilY = (x: number) => 44 - 30 * ((x - 480) / 500) ** 2;

// ---- the Rössler attractor ------------------------------------------------------------

/** The attractor itself (a = b = 0.2, c = 5.7), integrated once with RK4 and
 *  projected obliquely: the spiral disc seen from above the front, the
 *  folds shooting up. Fitted into TM.spiral. */
const ROESSLER: Pt[] = (() => {
  const f = ([x, y, z]: number[]) => [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)];
  let s = [1, 1, 0];
  const dt = 0.02;
  const raw: Pt[] = [];
  for (let i = 0; i < 9000; i++) {
    const k1 = f(s);
    const k2 = f(s.map((v, j) => v + (dt / 2) * k1[j]));
    const k3 = f(s.map((v, j) => v + (dt / 2) * k2[j]));
    const k4 = f(s.map((v, j) => v + dt * k3[j]));
    s = s.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (i > 2000 && i % 5 === 0) raw.push([s[0] + 0.25 * s[1], 0.42 * s[1] - s[2] * 0.62]);
  }
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const { cx, cy, w, h } = TM.spiral;
  return raw.map(([x, y]) => [cx - w / 2 + ((x - x0) / (x1 - x0)) * w, cy - h / 2 + ((y - y0) / (y1 - y0)) * h] as Pt);
})();

const spiralPath = (pts: Pt[] = ROESSLER) => poly(pts, false);

// ---- the pixel layer: a 192×90 grid of 5 px blocks, EGA palette ------------------------

export const EGA = {
  k: '#000000', b: '#0000aa', g: '#00aa00', c: '#00aaaa', r: '#aa0000', m: '#aa00aa', n: '#aa5500', l: '#aaaaaa',
  d: '#555555', B: '#5555ff', G: '#55ff55', C: '#55ffff', R: '#ff5555', M: '#ff55ff', Y: '#ffff55', w: '#ffffff',
} as const;
type Ega = keyof typeof EGA;

const CELL = 5;

/** A tiny pixel canvas: draw in room coordinates, get crisp blocks out. */
class PixGrid {
  readonly cols = 192;
  readonly rows = 90;
  private px: (string | null)[] = new Array(this.cols * this.rows).fill(null);

  set(cx: number, cy: number, c: Ega | null): void {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    this.px[cy * this.cols + cx] = c === null ? null : EGA[c];
  }
  /** Fill the cells covering a room-space rect. */
  rect(x: number, y: number, w: number, h: number, c: Ega): void {
    for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + h) / CELL); cy++)
      for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) this.set(cx, cy, c);
  }
  /** Checkerboard dither of two colours. */
  dither(x: number, y: number, w: number, h: number, a: Ega, b: Ega): void {
    for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + h) / CELL); cy++)
      for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) this.set(cx, cy, (cx + cy) % 2 ? a : b);
  }
  ellipse(x: number, y: number, rx: number, ry: number, c: Ega, rim?: Ega): void {
    for (let cy = Math.floor((y - ry) / CELL); cy <= Math.ceil((y + ry) / CELL); cy++)
      for (let cx = Math.floor((x - rx) / CELL); cx <= Math.ceil((x + rx) / CELL); cx++) {
        const d = ((cx + 0.5) * CELL - x) ** 2 / rx ** 2 + ((cy + 0.5) * CELL - y) ** 2 / ry ** 2;
        if (d <= 1) this.set(cx, cy, rim && d > 0.62 ? rim : c);
      }
  }
  /** Fill a polygon (scanline, cell centres). */
  poly(pts: Pt[], c: Ega | ((cx: number, cy: number) => Ega)): void {
    for (let cy = 0; cy < this.rows; cy++) {
      const yy = (cy + 0.5) * CELL;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let cx = Math.ceil(xs[i] / CELL - 0.5); cx <= Math.floor(xs[i + 1] / CELL - 0.5); cx++)
          this.set(cx, cy, typeof c === 'function' ? c(cx, cy) : c);
    }
  }
  line(a: Pt, b: Pt, c: Ega): void {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL * 0.6)));
    for (let i = 0; i <= n; i++) this.set(Math.floor((a[0] + ((b[0] - a[0]) * i) / n) / CELL), Math.floor((a[1] + ((b[1] - a[1]) * i) / n) / CELL), c);
  }
  /** Pixel-font lettering, `scale` cells per font pixel. */
  text(x: number, y: number, str: string, c: Ega, scale = 1): void {
    let cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (const ch of str) {
      const g = FONT[ch] ?? FONT[' '];
      g.forEach((row, ry) =>
        [...row].forEach((bit, rx) => {
          if (bit === '1') for (let i = 0; i < scale; i++) for (let j = 0; j < scale; j++) this.set(cx + rx * scale + i, cy + ry * scale + j, c);
        })
      );
      cx += 4 * scale;
    }
  }
  /** Run-length encode each row into rects. */
  svg(): string {
    const out: string[] = [];
    for (let cy = 0; cy < this.rows; cy++) {
      let cx = 0;
      while (cx < this.cols) {
        const c = this.px[cy * this.cols + cx];
        let e = cx + 1;
        while (e < this.cols && this.px[cy * this.cols + e] === c) e++;
        if (c) out.push(`<rect x="${cx * CELL}" y="${cy * CELL}" width="${(e - cx) * CELL}" height="${CELL}" fill="${c}"/>`);
        cx = e;
      }
    }
    return `<g shape-rendering="crispEdges">${out.join('')}</g>`;
  }
}

const FONT: Record<string, string[]> = {
  P: ['111', '101', '111', '100', '100'],
  U: ['101', '101', '101', '101', '111'],
  T: ['111', '010', '010', '010', '010'],
  O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  '>': ['100', '010', '001', '010', '100'],
  _: ['000', '000', '000', '000', '111'],
  '.': ['000', '000', '000', '000', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};

/** A few loops of the attractor, line by line: all of it would be a blob at this resolution. */
function pixelSpiral(g: PixGrid, c: Ega): void {
  const pts = ROESSLER.slice(0, 190);
  for (let i = 0; i + 2 < pts.length; i += 2) g.line(pts[i], pts[i + 2], c);
}

function pixelRoom(): string {
  const g = new PixGrid();
  // Wall: light grey plaster with a dithered curve towards the sides.
  g.rect(0, 0, 960, 450, 'l');
  for (let cx = 0; cx < g.cols; cx++) {
    const x = (cx + 0.5) * CELL;
    const edge = Math.abs(x - 480) / 480;
    for (let cy = 0; cy < g.rows; cy++) if (edge > 0.72 && (cx + cy) % 2 === 0) g.set(cx, cy, 'd');
    // Ceiling beams and the floor.
    for (let cy = 0; cy * CELL < ceilY(x); cy++) g.set(cx, cy, cx % 6 === 0 ? 'k' : 'n');
    for (let cy = Math.floor(wallBase(x) / CELL); cy < g.rows; cy++) g.set(cx, cy, cy % 3 === 0 ? 'k' : (cx + Math.floor(cy / 3) * 7) % 23 === 0 ? 'k' : 'n');
    g.set(cx, Math.floor(wallBase(x) / CELL) - 1, 'd');
  }
  // Windows: blue reveal, sunset in bands (no gradients in 1987), the Neckar.
  for (const w of TM.windows) {
    g.rect(w.cx - w.w / 2 - 8, w.top - 8, w.w + 16, w.bottom - w.top + 14, 'w');
    const x0 = w.cx - w.w / 2;
    const h = w.bottom - w.top;
    const bands: Ega[] = ['b', 'm', 'M', 'R', 'Y'];
    bands.forEach((c, i) => g.rect(x0, w.top + (h * 0.62 * i) / bands.length, w.w, (h * 0.62) / bands.length + 1, c));
    g.rect(x0, w.top + h * 0.62, w.w, h * 0.12, 'k');
    g.rect(x0, w.top + h * 0.74, w.w, h * 0.26, 'c');
    g.dither(x0, w.top + h * 0.8, w.w, 5, 'c', 'C');
    g.rect(w.cx - 2, w.top, 5, h, 'n');
    g.rect(x0, w.top + h * 0.45, w.w, 5, 'n');
  }
  // The desk.
  const d = TM.desk;
  g.rect(d.x, d.top, d.w, 14, 'n');
  g.rect(d.x + 4, d.top + 14, 10, d.foot - d.top - 14, 'n');
  g.rect(d.x + d.w - 14, d.top + 14, 10, d.foot - d.top - 14, 'n');
  g.rect(d.x + 30, d.top - 6, 34, 8, 'w');
  g.rect(d.x + 76, d.top - 16, 5, 16, 'w');
  g.rect(d.x + 76, d.top - 22, 5, 6, 'Y');
  // The door, a block of brown.
  g.poly(TM.door, 'n');
  g.poly([[30, 160], [74, 172], [74, 362], [30, 378]], 'r');
  g.rect(64, 268, 6, 6, 'Y');
  // The graffiti, as a text parser prompt.
  g.text(TM.graffiti.x + 10, TM.graffiti.y + 34, '>PUT PUT_', 'M', 1);
  const a = TM.arch;
  g.line([a.x + a.w / 2, TM.graffiti.y + 84], [a.x + a.w / 2, a.top - 6], 'g');
  for (let x = a.x; x <= a.x + a.w; x += 10) g.set(Math.floor(x / CELL), Math.floor(a.top / CELL), 'g');
  for (let y = a.top; y < a.foot; y += 10) {
    g.set(Math.floor(a.x / CELL), Math.floor(y / CELL), 'g');
    g.set(Math.floor((a.x + a.w) / CELL), Math.floor(y / CELL), 'g');
  }
  // The pedestal, and the attractor plotted point by point.
  const p = TM.pedestal;
  g.rect(p.x - p.w / 2, p.top, p.w, p.foot - p.top, 'd');
  g.rect(p.x - p.w / 2 - 6, p.top - 6, p.w + 12, 8, 'Y');
  g.rect(p.x - 2, TM.spiral.cy + 20, 5, p.top - TM.spiral.cy - 20, 'Y');
  g.rect(p.x - p.w / 2 - 6, p.foot - 8, p.w + 12, 8, 'k');
  g.rect(p.x - 6, p.top + 26, 12, 10, 'R');
  pixelSpiral(g, 'Y');
  return g.svg();
}

// ---- the vector layers: house style and cartoon collage share the drawing ------------------

interface Look {
  modern: boolean;
  ink: string;
  sw: number;
  wall: string;
  floor: string;
  ceil: string;
}

const TOON: Look = { modern: false, ink: INK, sw: 2.6, wall: 'url(#tmWall)', floor: 'url(#tmFloor)', ceil: '#5a3a3a' };
const MODERN: Look = { modern: true, ink: '#000000', sw: 5, wall: 'url(#mdWall)', floor: 'url(#mdFloor)', ceil: 'url(#mdWood)' };

/** Fill + outline in the given look (wobbly in toon, clean in modern). */
function shape(L: Look, pts: Pt[], fill: string, seed: number, sw = L.sw): string {
  const d = L.modern ? poly(pts) : wobble(pts, { seed, wobble: 1.4 });
  return path(d, { fill, stroke: L.ink, sw });
}

function sunsetDefs(id: string, top: number, bottom: number): string {
  return linear(id, 0, top, 0, bottom, [
    [0, '#3a2c7a'],
    [0.35, '#a24a8e'],
    [0.6, '#ff7a5a'],
    [0.75, '#ffc46a'],
    [1, '#ffe8a0'],
  ]);
}

function windowArt(L: Look, w: (typeof TM.windows)[number], i: number): string {
  const s: string[] = [];
  const x0 = w.cx - w.w / 2;
  const x1 = w.cx + w.w / 2;
  const h = w.bottom - w.top;
  const horizon = w.top + h * 0.66;
  // The deep reveal of a tower wall, splayed.
  s.push(shape(L, [[x0 - 14, w.top - 4], [x1 + 14, w.top - 4], [x1 + 14, w.bottom + 10], [x0 - 14, w.bottom + 10]], L.modern ? '#f4ead8' : '#f2e2c4', 30 + i));
  // The view: sky, the trees of the Neckarinsel across, the water.
  s.push(rect(x0, w.top, w.w, horizon - w.top, { fill: L.modern ? 'url(#mdSky)' : 'url(#tmSky)' }));
  if (L.modern) s.push(rect(x0, w.top, w.w, horizon - w.top, { fill: 'url(#mdClouds)' }));
  s.push(path(`M${x0} ${horizon}Q${x0 + w.w * 0.3} ${horizon - 14} ${w.cx} ${horizon - 6}T${x1} ${horizon - 10}V${horizon + 4}H${x0}Z`, { fill: L.modern ? '#1a2a1a' : '#3a3058' }));
  s.push(rect(x0, horizon + 4, w.w, w.bottom - horizon - 4, { fill: L.modern ? 'url(#mdWater)' : '#e8806a' }));
  s.push(path(`M${x0 + 6} ${horizon + 14}h${w.w * 0.4}M${x0 + w.w * 0.4} ${horizon + 24}h${w.w * 0.5}`, { stroke: '#fff0b0', sw: 1.6, opacity: 0.8 }));
  if (i === 1) s.push(circle(w.cx - 10, horizon - 10, 9, { fill: L.modern ? 'url(#mdSun)' : '#ffe08a', opacity: 0.95 }));
  // Mullions and the frame.
  s.push(path(`M${w.cx} ${w.top}V${w.bottom}M${x0} ${w.top + h * 0.44}H${x1}`, { stroke: L.modern ? '#ffffff' : '#7a5a4a', sw: L.modern ? 4 : 3 }));
  s.push(rect(x0, w.top, w.w, h, { stroke: L.ink, sw: L.sw }));
  // A sill.
  s.push(shape(L, [[x0 - 18, w.bottom + 6], [x1 + 18, w.bottom + 6], [x1 + 22, w.bottom + 16], [x0 - 22, w.bottom + 16]], L.modern ? '#d8c8b0' : '#c8a87a', 40 + i, L.sw * 0.8));
  return s.join('');
}

/** Warm light falling through a window onto the floor. */
function lightShaft(L: Look, w: (typeof TM.windows)[number]): string {
  const x0 = w.cx - w.w / 2;
  const x1 = w.cx + w.w / 2;
  const fx = (x: number) => 480 + (x - 480) * 1.6;
  return path(poly([[x0, w.bottom], [x1, w.bottom], [fx(x1) + 30, 440], [fx(x0) - 30, 440]]), {
    fill: L.modern ? '#ffd27a' : '#ffcf7a',
    opacity: L.modern ? 0.22 : 0.16,
  });
}

function floorArt(L: Look): string {
  const s: string[] = [];
  const edge: Pt[] = [];
  for (let x = -10; x <= 970; x += 20) edge.push([x, wallBase(x)]);
  s.push(path(poly([...edge, [970, 460], [-10, 460]]), { fill: L.floor }));
  // Floorboards converging on a point far behind the back wall.
  for (let k = -14; k <= 14; k++) {
    const x = 480 + k * 34;
    const a: Pt = [480 + (x - 480) * 0.85, wallBase(x)];
    s.push(line(a, [480 + (x - 480) * 2.4, 452], L.modern ? '#2a1408' : '#6a3a2a', L.modern ? 2.4 : 1.6, L.modern ? 0.7 : 0.8));
  }
  // The skirting board along the curve.
  s.push(path(poly(edge, false), { stroke: L.ink, sw: L.sw + 1 }));
  s.push(path(poly(edge.map(([x, y]) => [x, y - 6] as Pt), false), { stroke: L.modern ? '#ffffff' : '#c89a6a', sw: 3, opacity: 0.8 }));
  return s.join('');
}

function ceilingArt(L: Look): string {
  const s: string[] = [];
  const edge: Pt[] = [];
  for (let x = -10; x <= 970; x += 20) edge.push([x, ceilY(x)]);
  s.push(path(poly([[-10, -10], [970, -10], ...edge.reverse()]), { fill: L.ceil, stroke: L.ink, sw: L.sw }));
  for (let k = -6; k <= 6; k++) {
    const x = 480 + k * 80;
    s.push(line([480 + k * 30, -4], [x, ceilY(x)], L.modern ? '#000000' : '#3a2228', L.modern ? 4 : 3));
  }
  return s.join('');
}

function deskArt(L: Look): string {
  const { x, w, top, foot } = TM.desk;
  const s: string[] = [];
  const wood = L.modern ? 'url(#mdWood)' : '#8a5a3a';
  // Legs, the sloping writing top, a stack of manuscripts, quill and inkpot, a candle.
  s.push(shape(L, [[x + 8, top + 18], [x + 18, top + 18], [x + 16, foot], [x + 8, foot]], wood, 51));
  s.push(shape(L, [[x + w - 18, top + 18], [x + w - 8, top + 18], [x + w - 8, foot], [x + w - 16, foot]], wood, 52));
  s.push(shape(L, [[x + 4, foot - 26], [x + w - 4, foot - 26], [x + w - 4, foot - 20], [x + 4, foot - 20]], wood, 53, L.sw * 0.8));
  s.push(shape(L, [[x - 6, top + 4], [x + w + 6, top - 8], [x + w + 8, top + 18], [x - 4, top + 22]], wood, 54));
  s.push(shape(L, [[x + 18, top + 2], [x + 62, top - 6], [x + 64, top + 8], [x + 20, top + 14]], L.modern ? '#ffffff' : '#f4ecd8', 55, L.sw * 0.6));
  for (let k = 0; k < 3; k++) s.push(line([x + 24, top + 3 + k * 3.4], [x + 56, top - 3 + k * 3.4], '#6a6a8a', 0.9));
  s.push(path(`M${x + 72} ${top - 6}q6 -26 22 -36q-8 18 -16 36z`, { fill: L.modern ? '#ffffff' : '#f8f0e0', stroke: L.ink, sw: L.sw * 0.6 }));
  s.push(ellipse(x + 76, top - 4, 7, 5, { fill: '#1a1a2a', stroke: L.ink, sw: L.sw * 0.6 }));
  s.push(shape(L, [[x + 94, top - 30], [x + 100, top - 30], [x + 100, top - 10], [x + 94, top - 10]], '#f4ead0', 56, L.sw * 0.6));
  s.push(path(`M${x + 97} ${top - 32}q-4 -6 0 -12q4 6 0 12z`, { fill: '#ffcf4a', stroke: L.modern ? '#ff6a00' : '#d86a2a', sw: 1 }));
  if (!L.modern) s.push(glow('tmCandle', x + 97, top - 38, 40, '#ffd07a', 0.45));
  return s.join('');
}

function doorArt(L: Look): string {
  const [a, b, c, d] = TM.door;
  const s: string[] = [];
  s.push(shape(L, [[a[0] - 8, a[1] - 10], [b[0] + 8, b[1] - 6], [c[0] + 8, c[1] + 4], [d[0] - 8, d[1] + 6]], L.modern ? '#e8e0d0' : '#d8c4a4', 61));
  s.push(shape(L, TM.door, L.modern ? 'url(#mdWood)' : '#7a4a30', 62));
  for (const t of [0.25, 0.5, 0.75]) s.push(line([a[0] + 4, a[1] + (d[1] - a[1]) * t + 4], [b[0] - 4, b[1] + (c[1] - b[1]) * t - 4], L.modern ? '#000000' : '#4a2a1a', 2));
  s.push(circle(76, 276, 4, { fill: '#ffd34a', stroke: L.ink, sw: 1.6 }));
  return s.join('');
}

function graffitiArt(L: Look): string {
  const { x, y, w } = TM.graffiti;
  const a = TM.arch;
  const s: string[] = [];
  const pink = L.modern ? '#ff1a8c' : '#ff4a8a';
  const cyan = L.modern ? '#00e0ff' : '#4ae8ff';
  if (L.modern) {
    s.push(group(text(x + w / 2, y + 62, 'PUT PUT', { size: 54, fill: pink, rotate: -4 }), undefined, 'filter="url(#mdSpray)" opacity="0.6"'));
  }
  s.push(text(x + w / 2, y + 60, 'PUT PUT', { size: 50, fill: pink, stroke: L.modern ? '#000000' : cyan, sw: L.modern ? 4 : 3, rotate: -4 }));
  // Drips.
  for (const [dx, len] of [[28, 18], [70, 12], [118, 22], [168, 14]] as Pt[]) s.push(path(`M${x + dx} ${y + 62}v${len}`, { stroke: pink, sw: 3 }) + circle(x + dx, y + 62 + len, 2.2, { fill: pink }));
  // An arrow down to a dashed arch: put it here.
  s.push(path(`M${a.x + a.w / 2} ${y + 86}V${a.top - 10}m-9 -10l9 10l9 -10`, { stroke: cyan, sw: 4 }));
  s.push(path(`M${a.x} ${a.foot}V${a.top + 30}Q${a.x + a.w / 2} ${a.top - 14} ${a.x + a.w} ${a.top + 30}V${a.foot}`, { stroke: cyan, sw: 3.4, extra: 'stroke-dasharray="9 7"' }));
  return s.join('');
}

function pedestalArt(L: Look): string {
  const { x, top, foot, w } = TM.pedestal;
  const s: string[] = [];
  const brass = L.modern ? 'url(#mdChrome)' : '#c8964a';
  s.push(ellipse(x, foot + 2, w * 0.9, 7, { fill: '#000000', opacity: 0.25 }));
  s.push(shape(L, [[x - w / 2 - 8, foot - 12], [x + w / 2 + 8, foot - 12], [x + w / 2 + 10, foot], [x - w / 2 - 10, foot]], brass, 71));
  s.push(shape(L, [[x - w / 2, top + 6], [x + w / 2, top + 6], [x + w / 2 - 4, foot - 12], [x - w / 2 + 4, foot - 12]], L.modern ? 'url(#mdWood)' : '#6a4a5a', 72));
  s.push(shape(L, [[x - w / 2 - 10, top - 2], [x + w / 2 + 10, top - 2], [x + w / 2 + 6, top + 8], [x - w / 2 - 6, top + 8]], brass, 73));
  // A dial with three settings, and a little brass plate.
  s.push(circle(x, top + 34, 9, { fill: '#f4ecd8', stroke: L.ink, sw: L.sw * 0.7 }));
  s.push(line([x, top + 34], [x + 5, top + 28], '#d83a2a', 2));
  s.push(rect(x - 16, top + 52, 32, 10, { fill: '#e8c87a', stroke: L.ink, sw: 1.2 }));
  s.push(text(x, top + 60, 'O. R.', { size: 7, fill: INK, weight: 700 }));
  // The wire stand holding the spiral.
  s.push(line([x, top - 2], [x, TM.spiral.cy + 26], L.ink, 4) + line([x, top - 2], [x, TM.spiral.cy + 26], '#e8c87a', 1.6));
  return s.join('');
}

function spiralArt(L: Look): string {
  const d = spiralPath();
  if (L.modern) {
    return [
      path(d, { stroke: '#00e0ff', sw: 7, opacity: 0.55, extra: 'filter="url(#mdNeon)"' }),
      path(d, { stroke: '#ff3ad8', sw: 3, opacity: 0.8 }),
      path(d, { stroke: '#ffffff', sw: 1.2 }),
    ].join('');
  }
  return [
    glow('tmSpiral', TM.spiral.cx, TM.spiral.cy, 90, '#ffe08a', 0.4, 66),
    path(d, { stroke: INK, sw: 3.6 }),
    path(d, { stroke: '#f2c24a', sw: 1.6 }),
    path(d, { stroke: '#fff4c0', sw: 0.6, opacity: 0.8 }),
  ].join('');
}

function vectorRoom(L: Look): string {
  const s: string[] = [];
  s.push(rect(0, 0, 960, 450, { fill: L.wall }));
  // The collage: a photo of plaster pasted over the painted wall.
  if (L.modern) s.push(rect(0, 0, 960, 450, { fill: 'url(#mdPlaster)', opacity: 0.85 }));
  // The wall curves away: shade towards the sides.
  s.push(rect(0, 0, 960, 450, { fill: L.modern ? 'url(#mdCurve)' : 'url(#tmCurve)' }));
  s.push(ceilingArt(L));
  TM.windows.forEach((w, i) => s.push(windowArt(L, w, i)));
  s.push(floorArt(L));
  TM.windows.forEach((w) => s.push(lightShaft(L, w)));
  s.push(doorArt(L));
  s.push(graffitiArt(L));
  s.push(deskArt(L));
  s.push(pedestalArt(L));
  s.push(spiralArt(L));
  return s.join('');
}

function toonDefs(): string {
  return defs(
    grainDefs(71),
    linear('tmWall', 0, 40, 0, 360, [
      [0, '#f2d6a8'],
      [0.6, '#f0c49a'],
      [1, '#d89a86'],
    ]),
    linear('tmCurve', 0, 0, 960, 0, [
      [0, '#3a1a40', 0.5],
      [0.22, '#3a1a40', 0],
      [0.78, '#3a1a40', 0],
      [1, '#3a1a40', 0.5],
    ]),
    linear('tmFloor', 0, 318, 0, 450, [
      [0, '#9a5a3a'],
      [1, '#5a2e2a'],
    ]),
    sunsetDefs('tmSky', 84, 190)
  );
}

/** Photo textures: plaster, wood grain, water, clouds — all procedural
 *  (feTurbulence + lighting), then outlined like a cartoon. */
function modernDefs(): string {
  return defs(
    `<filter id="mdPlasterF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="3"/>` +
      `<feDiffuseLighting surfaceScale="2.2" lighting-color="#fff4e0"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting></filter>`,
    `<filter id="mdWoodF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.12" numOctaves="3" seed="9"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0.62 0.18  0 0 0 0.34 0.08  0 0 0 0.12 0.02  0 0 0 0 1"/></filter>`,
    `<filter id="mdWaterF" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.02 0.3" numOctaves="2" seed="5"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0.6 0.55  0 0 0 0.4 0.3  0 0 0 0.3 0.35  0 0 0 0 1"/></filter>`,
    `<filter id="mdCloudF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.08" numOctaves="4" seed="11"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.8  0 0 0 2.2 -1.1"/></filter>`,
    `<filter id="mdSpray" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>`,
    `<filter id="mdNeon" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter>`,
    `<pattern id="mdPlaster" width="480" height="450" patternUnits="userSpaceOnUse"><rect width="480" height="450" fill="#f8e4c0"/><rect width="480" height="450" filter="url(#mdPlasterF)" opacity="0.55" style="mix-blend-mode:multiply"/></pattern>`,
    `<pattern id="mdWood" width="400" height="200" patternUnits="userSpaceOnUse"><rect width="400" height="200" filter="url(#mdWoodF)"/></pattern>`,
    `<pattern id="mdWaterP" width="300" height="120" patternUnits="userSpaceOnUse"><rect width="300" height="120" filter="url(#mdWaterF)"/></pattern>`,
    `<pattern id="mdClouds" width="300" height="160" patternUnits="userSpaceOnUse"><rect width="300" height="160" filter="url(#mdCloudF)" opacity="0.55"/></pattern>`,
    linear('mdWall', 0, 0, 0, 450, [
      [0, '#fff0d8'],
      [1, '#f4c8a0'],
    ]),
    linear('mdCurve', 0, 0, 960, 0, [
      [0, '#2a0a3a', 0.55],
      [0.2, '#2a0a3a', 0],
      [0.8, '#2a0a3a', 0],
      [1, '#2a0a3a', 0.55],
    ]),
    `<pattern id="mdFloor" width="400" height="200" patternUnits="userSpaceOnUse"><rect width="400" height="200" filter="url(#mdWoodF)"/><rect width="400" height="200" fill="#ff8a3a" opacity="0.12"/></pattern>`,
    sunsetDefs('mdSky', 84, 190),
    `<pattern id="mdWater" width="300" height="120" patternUnits="userSpaceOnUse"><rect width="300" height="120" fill="#ff8a6a"/><rect width="300" height="120" fill="url(#mdWaterP)" opacity="0.6" style="mix-blend-mode:screen"/></pattern>`,
    radial('mdSun', 470, 150, 10, [
      [0, '#ffffff'],
      [0.5, '#fff0a0'],
      [1, '#ff9a3a'],
    ]),
    linear('mdChrome', 0, 250, 0, 340, [
      [0, '#ffffff'],
      [0.3, '#b8c0d0'],
      [0.55, '#5a6070'],
      [0.75, '#e8ecf4'],
      [1, '#7a8090'],
    ])
  );
}

/** The whole room in one of the three time layers (static per layer). */
export function turmBg(era: Era): string {
  if (era === 1) return pixelRoom();
  if (era === 2) return [modernDefs(), vectorRoom(MODERN), vignette('mdVig', 960, 450, 0.35, '#1a0a2a')].join('');
  return [toonDefs(), vectorRoom(TOON), vignette('tmVig', 960, 450, 0.42), grainOverlay(960, 450, 0.3, 0.26)].join('');
}

// ---- state overlays: the rug, the black hole, the hole in the wall --------------------------

const RUG = ['#a8323a', '#e8b84a', '#2a4a8a'];

/** The rug, flat (covering the hole) or rolled back. Full-room layer. */
export function rugArt(era: Era, rolled: boolean): string {
  const { cx, cy, rx, ry } = TM.rug;
  if (era === 1) {
    const g = new PixGrid();
    if (!rolled) {
      g.ellipse(cx, cy, rx, ry, 'r', 'Y');
      g.ellipse(cx, cy, rx * 0.55, ry * 0.5, 'b', 'Y');
    } else {
      g.ellipse(cx - 100, cy, rx * 0.34, ry * 0.95, 'r', 'Y');
      g.rect(cx - 60, cy - ry + 4, 22, ry * 2 - 8, 'r');
      g.rect(cx - 60, cy - ry + 4, 6, ry * 2 - 8, 'Y');
    }
    return g.svg();
  }
  const L = era === 2 ? MODERN : TOON;
  const s: string[] = [];
  if (!rolled) {
    s.push(ellipse(cx, cy + 4, rx + 4, ry + 3, { fill: '#000000', opacity: 0.25 }));
    s.push(ellipse(cx, cy, rx, ry, { fill: RUG[0], stroke: L.ink, sw: L.sw }));
    s.push(ellipse(cx, cy, rx - 14, ry - 6, { stroke: RUG[1], sw: 4 }));
    s.push(ellipse(cx, cy, rx * 0.5, ry * 0.46, { fill: RUG[2], stroke: RUG[1], sw: 3 }));
    // A suspicious little lump in the middle.
    s.push(path(`M${TM.hole.cx - 24} ${TM.hole.cy + 2}q24 -9 48 0`, { stroke: '#5a1a2a', sw: 2.4, opacity: 0.7 }));
    if (L.modern) s.push(ellipse(cx, cy, rx, ry, { fill: 'url(#mdRugT)', opacity: 0.5 }));
  } else {
    // Folded back over itself to the left: the flap shows the rug's underside.
    const f = cx - 30;
    const k = Math.sqrt(1 - ((f - cx) / rx) ** 2) * ry;
    s.push(ellipse(cx, cy, rx, ry, { fill: RUG[0], stroke: L.ink, sw: L.sw, extra: `clip-path="url(#rugCut)"` }));
    s.push(path(`M${f + 4} ${cy - k}A${rx * 0.9} ${k} 0 0 0 ${f + 4} ${cy + k}Z`, { fill: '#000000', opacity: 0.22 }));
    s.push(path(`M${f} ${cy - k}A${rx * 0.9} ${k + 2} 0 0 0 ${f} ${cy + k}Z`, { fill: L.modern ? '#e8d8b0' : '#d8c4a0', stroke: L.ink, sw: L.sw }));
    for (let i = 1; i < 6; i++) s.push(path(`M${f - i * 22} ${cy - k * Math.sqrt(1 - (i / 6.2) ** 2) + 2}V${cy + k * Math.sqrt(1 - (i / 6.2) ** 2) - 2}`, { stroke: '#a8906a', sw: 1.2, opacity: 0.8 }));
    s.push(path(`M${f} ${cy - k}V${cy + k}`, { stroke: RUG[1], sw: 3 }));
  }
  const clip = defs(`<clipPath id="rugCut"><rect x="0" y="0" width="${cx - 30}" height="450"/></clipPath>`);
  const d = clip + (L.modern
    ? defs(`<filter id="mdRugF"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>`, `<pattern id="mdRugT" width="200" height="80" patternUnits="userSpaceOnUse"><rect width="200" height="80" filter="url(#mdRugF)"/></pattern>`)
    : '');
  return d + s.join('');
}

/** The black hole under the rug. In the modern layer it is a cartoon
 *  portable hole — flat as a pancake, one edge curling up. */
export function blackHoleArt(era: Era): string {
  const { cx, cy, rx, ry } = TM.hole;
  if (era === 1) {
    const g = new PixGrid();
    g.ellipse(cx, cy, rx + 8, ry + 4, 'm');
    g.dither(cx - rx - 8, cy - 2, 10, 5, 'm', 'M');
    g.ellipse(cx, cy, rx, ry, 'k');
    return g.svg();
  }
  if (era === 2) {
    return [
      defs(
        `<filter id="mdDiskF" x="-30%" y="-60%" width="160%" height="220%"><feTurbulence type="turbulence" baseFrequency="0.06 0.3" numOctaves="3" seed="21"/>` +
          `<feDisplacementMap in="SourceGraphic" scale="9"/><feGaussianBlur stdDeviation="0.8"/></filter>`,
        radial('mdDisk', cx, cy, rx + 22, [
          [0.55, '#ffffff', 1],
          [0.7, '#ffcf6a', 0.95],
          [0.85, '#ff5a1a', 0.7],
          [1, '#5a0a3a', 0]
        ], ry + 9)
      ),
      ellipse(cx, cy, rx + 22, ry + 9, { fill: 'url(#mdDisk)', extra: 'filter="url(#mdDiskF)"' }),
      ellipse(cx, cy, rx, ry, { fill: '#000000', stroke: '#000000', sw: 5 }),
      // The lifted edge: it's a sheet, you can pick it up.
      path(`M${cx + rx - 18} ${cy - ry + 4}q20 -14 26 4q-12 4 -26 -4z`, { fill: '#2a2a3a', stroke: '#000000', sw: 3 }),
      path(`M${cx + rx - 12} ${cy - ry - 2}q8 -4 14 0`, { stroke: '#ffffff', sw: 1.6, opacity: 0.8 }),
    ].join('');
  }
  const stars: string[] = [];
  const r = rng(77);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const k = 0.7 + r() * 0.6;
    stars.push(circle(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, 0.8 + r() * 1.2, { fill: '#fff0ff', opacity: 0.85 }));
  }
  return [
    defs(radial('tmHole', cx, cy, rx + 16, [
      [0.5, '#000000', 1],
      [0.75, '#5a1a8a', 0.8],
      [1, '#a04ad8', 0],
    ], ry + 7)),
    ellipse(cx, cy, rx + 16, ry + 7, { fill: 'url(#tmHole)' }),
    path(`M${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx * 0.3} ${cy + ry}`, { stroke: '#c88aff', sw: 1.6, opacity: 0.7 }),
    ellipse(cx, cy, rx * 0.8, ry * 0.78, { fill: '#000000', stroke: INK, sw: 2 }),
    ...stars,
  ].join('');
}

/** The hole in the wall, put where PUT PUT said: evening sky beyond. */
export function wallHoleArt(era: Era): string {
  const { x, w, top, foot } = TM.arch;
  const arch = `M${x} ${foot}V${top + 30}Q${x + w / 2} ${top - 14} ${x + w} ${top + 30}V${foot}Z`;
  if (era === 1) {
    const g = new PixGrid();
    const pts: Pt[] = [[x, foot], [x, top + 30], [x + w * 0.2, top + 6], [x + w / 2, top], [x + w * 0.8, top + 6], [x + w, top + 30], [x + w, foot]];
    g.poly(pts, (cx, cy) => (cy * CELL < top + 50 ? 'b' : cy * CELL < top + 80 ? 'm' : 'k'));
    g.rect(x + 20, top + 30, 4, 4, 'w');
    return g.svg();
  }
  const L = era === 2 ? MODERN : TOON;
  return [
    defs(linear('whSky', 0, top, 0, foot, [
      [0, '#2a2060'],
      [0.5, '#c25a8a'],
      [1, '#1a1030'],
    ])),
    path(arch, { fill: 'url(#whSky)' }),
    circle(x + 22, top + 28, 1.4, { fill: '#ffffff' }),
    circle(x + 50, top + 46, 1, { fill: '#ffffff' }),
    path(arch, { fill: 'none', stroke: L.ink, sw: L.sw + 2 }),
    // Cracks round the edge.
    path(`M${x} ${top + 60}l-10 -6M${x + w} ${top + 50}l12 -8l6 4M${x + w / 2} ${top - 6}l-4 -12`, { stroke: L.ink, sw: 2 }),
  ].join('');
}

/** The attractor's pulsing glow (an ambient tweens its alpha). */
export function spiralGlow(era: Era): string {
  const { cx, cy } = TM.spiral;
  if (era === 1) {
    const g = new PixGrid();
    ROESSLER.slice(0, 190).forEach(([x, y], i) => i % 9 === 0 && g.set(Math.floor(x / CELL), Math.floor(y / CELL), 'w'));
    return g.svg();
  }
  return glow('spGlow', cx, cy, 96, era === 2 ? '#7af0ff' : '#fff0a0', 0.5, 72);
}

// ---- Otto R., stuck in 1987 -----------------------------------------------------------

/** 16×30 sprite on 4 px blocks. Rows of the upper body; the legs are drawn per frame. */
const OTTO_PAL: Record<string, string> = {
  W: '#ffffff', S: '#ffaa88', K: '#000000', C: '#ffffff', G: '#aaaaaa', R: '#aa0000', M: '#aa0000', B: '#0000aa', N: '#aa5500', E: '#555555',
};

const OTTO_FRONT = [
  '....W.WWW.W.....',
  '...WWWWWWWWW....',
  '..WWW.....WWW...',
  '..WW.SSSSS.WW...',
  '....SKKSKKS.....',
  '....SKKSKKS.....',
  '....SSSSSSS.....',
  '....SWWWWWS.....',
  '.....S{M}S......',
  '......SSS.......',
  '....CCCRCCC.....',
  '...CCCCRCCCC....',
  '..CCCCCRCCCCC...',
  '..CCGCCRCCGCC...',
  '..CC.CCCCC.CC...',
  '..CC.CCCCC.CC...',
  '..SS.CCCCC.SS...',
  '.....CCGCC......',
  '.....CCGCC......',
  '.....CCGCC......',
];
const OTTO_BACK = [
  '....W.WWW.W.....',
  '...WWWWWWWWW....',
  '..WWWWWWWWWWW...',
  '..WWWWWWWWWWW...',
  '...WWWWWWWWW....',
  '....WWWWWWW.....',
  '....SWWWWWS.....',
  '.....WWWWW......',
  '.....SSSSS......',
  '......SSS.......',
  '....CCCCCCC.....',
  '...CCCCCCCCC....',
  '..CCCCCCCCCCC...',
  '..CCCCCCCCCCC...',
  '..CC.CCGCC.CC...',
  '..CC.CCGCC.CC...',
  '..SS.CCGCC.SS...',
  '.....CCGCC......',
  '.....CCGCC......',
  '.....CCCCC......',
];
const OTTO_SIDE = [
  '.....WW.WW......',
  '...WWWWWWW......',
  '..WWWWW.........',
  '..WWWSSSSS......',
  '...WWSKKSKK.....',
  '...WWSKKSKKS....',
  '....SSSSSSSS....',
  '....SSSWWWW.....',
  '.....SS{M}......',
  '......SSS.......',
  '.....CCCRR......',
  '....CCCCCRC.....',
  '....CCCCCCC.....',
  '....CCGCCCC.....',
  '....CCGCCCC.....',
  '....CCGSSCC.....',
  '....CCGCCCC.....',
  '....CCGCCCC.....',
  '....CCGCCCC.....',
  '....CCCCCCC.....',
];

function ottoFrame(variant: ActorVariant, pose: string, f: number): string {
  if (pose === 'gone') return rect(0, 0, 1, 1, { fill: '#000000', opacity: 0 });
  const rows = (variant === 'back' ? OTTO_BACK : variant === 'side' ? OTTO_SIDE : OTTO_FRONT).map((r) =>
    r.replace('{M}', pose === 'talk' && f % 2 ? 'MM' : 'S')
  );
  const out: string[] = [];
  const put = (cx: number, cy: number, c: string) => out.push(`<rect x="${cx * 4}" y="${cy * 4}" width="4" height="4" fill="${c}"/>`);
  rows.forEach((row, y) => [...row].forEach((ch, x) => OTTO_PAL[ch] && put(x, y, OTTO_PAL[ch])));
  // Legs: 10 rows, trousers then shoes; walking swings them apart.
  const step = pose === 'walk' ? [0, 1, 0, -1][f % 4] : 0;
  for (let y = 20; y < 30; y++) {
    const shoe = y >= 28;
    const c = shoe ? OTTO_PAL.N : OTTO_PAL.B;
    const k = (y - 20) / 9;
    if (variant === 'side') {
      put(6 + Math.round(step * 2 * k), y, c);
      put(7 + Math.round(step * 2 * k), y, c);
      put(7 - Math.round(step * 2 * k), y, c);
      put(8 - Math.round(step * 2 * k), y, c);
      if (shoe) put(9 - Math.round(step * 2 * k), y, c);
    } else {
      const lift = (side: number) => (step === side && y >= 27 ? 0 : 1);
      if (lift(1)) { put(5, y, c); put(6, y, c); }
      if (lift(-1)) { put(9, y, c); put(10, y, c); }
    }
  }
  return `<g shape-rendering="crispEdges">${out.join('')}</g>`;
}

export const OTTO_ACTOR: SvgActorAsset = {
  key: 'otto',
  width: 64,
  height: 120,
  poses: {
    idle: { frames: 1, frameRate: 1 },
    walk: { frames: 4, frameRate: 8 },
    talk: { frames: 2, frameRate: 6 },
    gone: { frames: 1, frameRate: 1 },
  },
  draw: ottoFrame,
};

/** The spiral as tiny markup for the pocket attractor's icon (64×48 box). */
export function miniSpiral(): string {
  const { cx, cy, w, h } = TM.spiral;
  const pts = ROESSLER.filter((_, i) => i % 3 === 0).map(([x, y]) => [32 + ((x - cx) / w) * 40, 20 + ((y - cy) / h) * 30] as Pt);
  return path(poly(pts, false), { stroke: INK, sw: 2.2 }) + path(poly(pts, false), { stroke: '#f2c24a', sw: 1 });
}
