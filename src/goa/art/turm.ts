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
  puff,
  radial,
  rect,
  rng,
  text,
  vignette,
  wobble,
  type Pt,
} from '../../game/art/toon';

/**
 * The Hölderlinturm as a doll's house: seen from the Neckar, its front wall
 * cut away. On the left the round tower under its pointed slate cone, on
 * the right the house under a hipped roof; three floors stacked up — the
 * Turmstube with Hölderlin's writing desk and his bed at the top, the
 * parlour with Otto R.'s Rössler attractor in the middle (the door from the
 * promenade opens onto it), the vaulted cellar at the bottom. Stairs join
 * them. Around it the Altstadt in the sunset, a willow, the water, punts.
 *
 * Otto R.'s attractor throws the whole picture between three time layers:
 *
 *   0  toon   — the house style (hand-inked, cel-shaded, paper grain)
 *   1  pixel  — a 1987 EGA adventure: 5 px blocks, sixteen colours
 *   2  modern — a cartoon collage: thick black outlines, photo textures
 *
 * One shared plan (TM, FLOORS) — all three renderers draw the same house,
 * so hotspots, walk area and actors fit every layer. Everything is drawn in
 * room coordinates (ROOM) and returned as SVG markup.
 */

export type Era = 0 | 1 | 2;

/** The room scrolls vertically: three floors don't fit one screen. */
export const ROOM = { w: 960, h: 620 };

/** Floors, top to bottom: ceiling (underside of the slab above), the back
 *  edge of the floor (where the furniture stands) and its front edge (the
 *  cut). Everyone walks in the band between back and front. */
export const FLOORS = [
  { ceil: 152, back: 254, front: 274 },
  { ceil: 284, back: 390, front: 414 },
  { ceil: 424, back: 528, front: 550 },
] as const;
const SLAB = 10;
const WATER = 576;

/** The house's inner span, the wall between tower and house, the facades. */
export const HOUSE = { x0: 150, x1: 850, split: 485, eave: 140, facadeL: 98, facadeR: 902 };

export const TM = {
  /** The door from the promenade, in the tower's side wall (middle floor). */
  door: { x: 106, w: 34, top: 322, foot: 414 },
  pedestal: { x: 236, top: 352, foot: 394, w: 32 },
  spiral: { cx: 236, cy: 318, w: 100, h: 58 },
  rug: { cx: 610, cy: 403, rx: 82, ry: 8 },
  hole: { cx: 620, cy: 404, rx: 30, ry: 5 },
  desk: { x: 196, w: 96, top: 218, foot: 256 },
  shelf: { x: 316, y: 170, w: 64, h: 86 },
  bed: { x: 528, w: 136, foot: 258 },
  sofa: { x: 530, w: 150, foot: 392 },
  barrels: { x: 166, w: 134, foot: 530 },
  graffiti: { x: 548, y: 432, w: 210, h: 42 },
  arch: { x: 642, w: 58, top: 460, foot: 530 },
  sacks: { x: 790, w: 52, foot: 532 },
  /** Stairs: up from the parlour (its back edge) to the Turmstube (its front
   *  edge), and down from the parlour's front edge into the cellar. */
  stairUp: { bottom: [800, 830] as Pt, top: [680, 710] as Pt },
  stairDown: { top: [440, 466] as Pt, bottom: [320, 346] as Pt },
  windows: [
    { x: 420, y: 174, w: 40, h: 50 },
    { x: 772, y: 174, w: 40, h: 50 },
    { x: 340, y: 304, w: 40, h: 48 },
    { x: 586, y: 298, w: 46, h: 40 },
    { x: 790, y: 446, w: 34, h: 26 },
  ],
};

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

// ---- the pixel layer: a 192×124 grid of 5 px blocks, EGA palette ------------------------

export const EGA = {
  k: '#000000', b: '#0000aa', g: '#00aa00', c: '#00aaaa', r: '#aa0000', m: '#aa00aa', n: '#aa5500', l: '#aaaaaa',
  d: '#555555', B: '#5555ff', G: '#55ff55', C: '#55ffff', R: '#ff5555', M: '#ff55ff', Y: '#ffff55', w: '#ffffff',
} as const;
type Ega = keyof typeof EGA;

const CELL = 5;

/** A tiny pixel canvas: draw in room coordinates, get crisp blocks out. */
class PixGrid {
  readonly cols = 192;
  readonly rows = Math.ceil(ROOM.h / CELL);
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

const { x0: HX0, x1: HX1, split: SPLIT, eave: EAVE, facadeL: FL, facadeR: FR } = HOUSE;

/** Altstadt houses behind the tower: x, width, eave y, roof height, wall, roof. */
const TOWN: Array<[number, number, number, number, string, string, Ega, Ega]> = [
  [-40, 130, 150, 70, '#e8b8a8', '#c8603a', 'R', 'r'],
  [70, 120, 104, 62, '#d8a8c8', '#b8503a', 'M', 'r'],
  [170, 110, 66, 56, '#f0d8b8', '#c86a40', 'w', 'n'],
  [400, 110, 50, 58, '#e8c8a0', '#b85a3a', 'Y', 'r'],
  [520, 120, 34, 70, '#f4f0e8', '#8a5a7a', 'w', 'm'],
  [650, 130, 52, 60, '#d8b0c0', '#c8603a', 'M', 'r'],
  [780, 120, 40, 66, '#f0c8a8', '#b8503a', 'R', 'r'],
  [880, 120, 70, 62, '#e8d0b0', '#c86a40', 'Y', 'n'],
];

// ---- the pixel layer ---------------------------------------------------------------------

function pixelRoom(): string {
  const g = new PixGrid();
  // Sky in bands, a couple of blocky clouds.
  const sky: Ega[] = ['b', 'b', 'B', 'm', 'M', 'R'];
  sky.forEach((c, i) => g.rect(0, i * 60, ROOM.w, 60, c));
  for (const [x, y, w] of [[600, 30, 90], [80, 70, 70], [760, 110, 60]] as Pt[] | number[][]) {
    g.rect(x, y, w, 10, 'w');
    g.rect(x + 15, y - 10, w - 40, 10, 'w');
  }
  // The town behind.
  for (const [x, w, eave, rh, , , wall, roof] of TOWN) {
    g.rect(x, eave, w, 420 - eave, wall);
    for (let k = 0; k < rh; k += CELL) g.rect(x + (k * w) / (2 * rh), eave - k, w - (k * w) / rh, CELL, roof);
    for (let wy = eave + 16; wy < 400; wy += 34) for (let wx = x + 14; wx < x + w - 20; wx += 30) g.rect(wx, wy, 10, 14, wy % 3 ? 'Y' : 'b');
  }
  // The big tree and the willow.
  g.ellipse(80, 40, 160, 70, 'g', 'G');
  g.ellipse(230, 16, 100, 40, 'g');
  g.rect(40, 150, 20, 410, 'n');
  for (let x = -20; x < 110; x += 10) g.rect(x, 170 + ((x * 7) % 30), 6, 340 - ((x * 13) % 60), x % 20 ? 'G' : 'g');
  // The promenade and its railing on the left.
  g.rect(0, 414, FL, 160, 'd');
  for (let x = 0; x < FL; x += 15) g.rect(x, 384, 5, 30, 'k');
  g.rect(0, 380, FL, 5, 'k');
  // The house next door on the right.
  g.rect(FR, 40, 80, 540, 'G');
  for (let y = 80; y < 540; y += 90) g.rect(FR + 20, y, 24, 36, 'w');
  // Inside: walls (yellow-brown), cellar stone, floors, slabs.
  FLOORS.forEach((f, i) => {
    g.rect(HX0, f.ceil, HX1 - HX0, f.back - f.ceil, i === 2 ? 'd' : 'n');
    if (i < 2) g.dither(HX0, f.ceil, HX1 - HX0, f.back - f.ceil, 'n', 'Y');
    for (let x = HX0; x < HX1; x += 40) g.rect(x, f.ceil, 10, 8, 'k');
    g.rect(HX0, f.back, HX1 - HX0, f.front - f.back, i === 2 ? 'l' : 'n');
    for (let x = HX0; x < HX1; x += 30) g.set(Math.floor(x / CELL), Math.floor((f.back + 10) / CELL), 'k');
    g.rect(HX0 - 10, f.front, HX1 - HX0 + 20, SLAB, 'k');
    // The wall between tower and house, with its doorway.
    g.rect(SPLIT - 7, f.ceil, 14, f.back - f.ceil, 'l');
    g.rect(SPLIT - 5, f.back - 88, 10, 88, 'k');
  });
  // The cellar vault on the left.
  g.poly([[160, 528], [160, 470], [220, 440], [315, 430], [410, 440], [470, 470], [470, 528]], 'k');
  for (const w of TM.windows) {
    g.rect(w.x - 4, w.y - 4, w.w + 8, w.h + 8, 'w');
    g.rect(w.x, w.y, w.w, w.h, 'c');
    g.rect(w.x + w.w / 2 - 2, w.y, 5, w.h, 'n');
  }
  // Furniture: desk, books, bed, sofa, barrels, sacks.
  const d = TM.desk;
  g.rect(d.x, d.top, d.w, 10, 'n');
  g.rect(d.x + 4, d.top, 8, d.foot - d.top, 'n');
  g.rect(d.x + d.w - 12, d.top, 8, d.foot - d.top, 'n');
  g.rect(d.x + 30, d.top - 6, 30, 6, 'w');
  g.rect(d.x + 74, d.top - 18, 5, 18, 'w');
  g.rect(d.x + 74, d.top - 24, 5, 6, 'Y');
  const sh = TM.shelf;
  g.rect(sh.x, sh.y, sh.w, sh.h, 'n');
  for (let y = sh.y + 6; y < sh.y + sh.h - 10; y += 22) for (let x = sh.x + 5; x < sh.x + sh.w - 6; x += 8) g.rect(x, y, 6, 16, (['r', 'b', 'g', 'Y'] as Ega[])[(x + y) % 4]);
  const b = TM.bed;
  g.rect(b.x, b.foot - 50, 10, 50, 'n');
  g.rect(b.x + b.w - 10, b.foot - 34, 10, 34, 'n');
  g.rect(b.x + 10, b.foot - 26, b.w - 20, 12, 'w');
  g.rect(b.x + 40, b.foot - 26, b.w - 50, 12, 'B');
  const so = TM.sofa;
  g.rect(so.x, so.foot - 40, so.w, 24, 'm');
  g.rect(so.x - 8, so.foot - 30, so.w + 16, 26, 'M');
  const ba = TM.barrels;
  for (let k = 0; k < 3; k++) {
    g.ellipse(ba.x + 22 + k * 44, ba.foot - 24, 20, 24, 'n');
    g.rect(ba.x + 6 + k * 44, ba.foot - 34, 32, 4, 'k');
    g.rect(ba.x + 6 + k * 44, ba.foot - 16, 32, 4, 'k');
  }
  for (let k = 0; k < 2; k++) g.ellipse(TM.sacks.x + 12 + k * 26, TM.sacks.foot - 16, 13, 17, 'Y');
  // Stairs.
  stairPix(g, TM.stairUp.bottom, FLOORS[1].back, TM.stairUp.top, FLOORS[0].front);
  stairPix(g, TM.stairDown.top, FLOORS[1].front, TM.stairDown.bottom, FLOORS[2].back);
  // The graffiti, as a text parser prompt.
  g.text(TM.graffiti.x + 10, TM.graffiti.y + 4, '>PUT PUT_', 'M', 1);
  const a = TM.arch;
  g.line([a.x + a.w / 2, TM.graffiti.y + 34], [a.x + a.w / 2, a.top - 4], 'G');
  for (let x = a.x; x <= a.x + a.w; x += 10) g.set(Math.floor(x / CELL), Math.floor(a.top / CELL), 'G');
  for (let y = a.top; y < a.foot; y += 10) {
    g.set(Math.floor(a.x / CELL), Math.floor(y / CELL), 'G');
    g.set(Math.floor((a.x + a.w) / CELL), Math.floor(y / CELL), 'G');
  }
  // The pedestal, and the attractor plotted point by point.
  const p = TM.pedestal;
  g.rect(p.x - p.w / 2, p.top, p.w, p.foot - p.top, 'd');
  g.rect(p.x - p.w / 2 - 5, p.top - 5, p.w + 10, 6, 'Y');
  g.rect(p.x - 2, TM.spiral.cy + 16, 5, p.top - TM.spiral.cy - 16, 'Y');
  g.rect(p.x - 5, p.top + 14, 10, 8, 'R');
  pixelSpiral(g, 'Y');
  // Facades, door, roofs.
  g.poly([[FL, 150], [HX0, EAVE], [HX0, 552], [FL, 558]], 'Y');
  g.poly([[HX1, EAVE], [FR, 150], [FR, 558], [HX1, 552]], 'Y');
  g.rect(TM.door.x, TM.door.top, TM.door.w, TM.door.foot - TM.door.top, 'r');
  g.rect(TM.door.x + TM.door.w - 10, 370, 5, 5, 'Y');
  for (const y of [190, 460]) g.rect(FL + 12, y, 24, 34, 'c');
  for (const y of [190, 320, 460]) g.rect(HX1 + 14, y, 24, 34, 'c');
  g.poly([[460, 148], [920, 152], [870, 62], [520, 58]], 'd');
  for (let y = 66; y < 150; y += 12) g.line([480, y], [910, y], 'k');
  g.rect(716, 26, 24, 40, 'r');
  g.poly([[84, 150], [520, 150], [300, 4]], 'd');
  for (let y = 30; y < 150; y += 14) g.line([300 - (y - 4) * 1.48, y], [300 + (y - 4) * 1.5, y], 'k');
  g.rect(298, 0, 5, 8, 'Y');
  g.rect(FL - 6, EAVE - 4, FR - FL + 12, 12, 'n');
  // Foundation, water, punts.
  g.rect(FL - 6, 550, FR - FL + 12, WATER - 550, 'l');
  for (let x = FL; x < FR; x += 30) g.rect(x, 560, 2, 10, 'd');
  g.rect(0, WATER, ROOM.w, ROOM.h - WATER, 'b');
  g.dither(0, WATER, ROOM.w, 10, 'b', 'c');
  for (let x = 20; x < ROOM.w; x += 70) g.rect(x, WATER + 20 + (x % 3) * 6, 30, 5, 'c');
  for (const [x, y] of [[560, 590], [700, 604]]) {
    g.rect(x, y, 300, 10, 'n');
    g.rect(x + 10, y + 10, 280, 5, 'k');
  }
  return g.svg();
}

function stairPix(g: PixGrid, a: Pt, ay: number, b: Pt, by: number): void {
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x0 = a[0] + (b[0] - a[0]) * t;
    const y = ay + (by - ay) * t;
    g.rect(x0 - 4, y - 4, a[1] - a[0] + 8, 6, i % 2 ? 'n' : 'Y');
  }
}

// ---- the vector layers: house style and cartoon collage share the drawing ------------------

interface Look {
  modern: boolean;
  ink: string;
  sw: number;
}

const TOON: Look = { modern: false, ink: INK, sw: 2.4 };
const MODERN: Look = { modern: true, ink: '#000000', sw: 4.2 };

/** Fill + outline in the given look (wobbly in toon, clean in modern). */
function shape(L: Look, pts: Pt[], fill: string, seed: number, sw = L.sw): string {
  const d = L.modern ? poly(pts) : wobble(pts, { seed, wobble: 1.2 });
  return path(d, { fill, stroke: L.ink, sw });
}
const box = (L: Look, x: number, y: number, w: number, h: number, fill: string, seed: number, sw = L.sw) =>
  shape(L, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, seed, sw);

/** Colours, or photo textures in the modern layer. */
function pal(L: Look) {
  return L.modern
    ? { plaster: 'url(#mdPlaster)', inner: 'url(#mdInner)', wood: 'url(#mdWood)', dark: '#3a1e10', stone: 'url(#mdStone)', slate: 'url(#mdSlate)', water: 'url(#mdWater)', sky: 'url(#mdSky)', leaf: '#1e7a3a', willow: '#a8e030' }
    : { plaster: '#f2c450', inner: 'url(#tmInner)', wood: '#8a5432', dark: '#5a3220', stone: '#a8988a', slate: '#5e5a80', water: 'url(#tmWater)', sky: 'url(#tmSky)', leaf: '#2a6a4a', willow: '#a8c84a' };
}

function skyAndTown(L: Look): string {
  const c = pal(L);
  const s: string[] = [rect(0, 0, ROOM.w, ROOM.h, { fill: c.sky })];
  if (L.modern) s.push(rect(0, 0, ROOM.w, 300, { fill: 'url(#mdClouds)' }));
  else for (const [x, y, rx, ry, seed] of [[640, 40, 70, 20, 1], [120, 80, 60, 16, 2], [820, 120, 54, 14, 3], [400, 20, 40, 12, 4]]) s.push(path(puff(x, y, rx, ry, 6, seed, 0.25), { fill: '#f8c8e0', stroke: INK, sw: 1.4, opacity: 0.9 }));
  TOWN.forEach(([x, w, eave, rh, wall, roof], i) => {
    s.push(box(L, x, eave, w, 430 - eave, wall, 80 + i));
    s.push(shape(L, [[x - 8, eave + 2], [x + w / 2, eave - rh], [x + w + 8, eave + 2]], L.modern ? 'url(#mdTiles)' : roof, 90 + i));
    const r = rng(100 + i);
    for (let wy = eave + 14; wy < 410; wy += 36)
      for (let wx = x + 14; wx < x + w - 22; wx += 32) {
        const lit = r() > 0.55;
        s.push(rect(wx, wy, 12, 17, { fill: lit ? '#ffd870' : '#4a3e6a', stroke: L.ink, sw: L.sw * 0.6 }));
        s.push(rect(wx - 6, wy, 5, 17, { fill: i % 2 ? '#3a6a5a' : '#8a3a3a', stroke: L.ink, sw: L.sw * 0.4 }) + rect(wx + 13, wy, 5, 17, { fill: i % 2 ? '#3a6a5a' : '#8a3a3a', stroke: L.ink, sw: L.sw * 0.4 }));
      }
    s.push(box(L, x + w * 0.62, eave - rh * 0.5, 12, 22, '#a85a3a', 110 + i, L.sw * 0.7));
  });
  return s.join('');
}

function trees(L: Look): string {
  const c = pal(L);
  const s: string[] = [];
  // The big tree on the left, its crown over the houses.
  s.push(path('M-30 330Q20 230 30 150Q40 90 110 50L130 70Q70 110 62 170Q54 260 20 340Z', { fill: L.modern ? 'url(#mdBark)' : '#6a4228', stroke: L.ink, sw: L.sw }));
  const crown: Array<[number, number, number, number, string]> = [
    [40, 30, 150, 64, c.leaf], [230, 10, 100, 40, L.modern ? '#2a8a4a' : '#347a50'], [-20, 110, 80, 56, c.leaf], [150, 70, 70, 34, L.modern ? '#36a058' : '#3e8a5a'],
  ];
  crown.forEach(([x, y, rx, ry, col], i) => s.push(path(puff(x, y, rx, ry, 8, 40 + i, 0.18), { fill: col, stroke: L.ink, sw: L.sw })));
  return s.join('');
}

/** The willow, in front of the promenade, its fronds hanging down to the water. */
function willow(L: Look): string {
  const c = pal(L);
  const s: string[] = [];
  s.push(path('M40 570Q56 400 50 260Q48 210 70 180', { stroke: L.ink, sw: 14 }) + path('M40 570Q56 400 50 260Q48 210 70 180', { stroke: L.modern ? '#5a3a20' : '#7a5a3a', sw: 9 }));
  const r = rng(61);
  const frond = (x: number, top: number, len: number, w: number, sway: number, fill: string) => {
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push([x + t * t * sway - w * (0.35 + 0.65 * Math.sin(t * Math.PI)) + (k % 2) * 2, top + len * t]);
    }
    for (let k = 8; k >= 0; k--) {
      const t = k / 8;
      pts.push([x + t * t * sway + w * (0.35 + 0.65 * Math.sin(t * Math.PI)) - (k % 2) * 2, top + len * t]);
    }
    return path(wobble(pts, { seed: Math.round(x * 7 + top), wobble: 1.4 }), { fill, stroke: L.ink, sw: L.sw * 0.8 });
  };
  const back = L.modern ? '#5aa018' : '#6a8a30';
  const front = c.willow;
  for (let i = 0; i < 9; i++) {
    const x = -40 + i * 18 + r() * 8;
    s.push(frond(x, 190 + r() * 20, 260 + r() * 110, 8 + r() * 3, (x - 36) * 0.35, back));
  }
  s.push(path(puff(36, 180, 96, 44, 10, 62, 0.22), { fill: front, stroke: L.ink, sw: L.sw }));
  s.push(path(puff(20, 166, 50, 22, 6, 63, 0.2), { fill: L.modern ? '#c0f040' : '#c0d860', stroke: L.ink, sw: L.sw * 0.8 }));
  for (let i = 0; i < 8; i++) {
    const x = -30 + i * 19 + r() * 8;
    s.push(frond(x, 200 + r() * 16, 200 + r() * 120, 7 + r() * 3, (x - 36) * 0.4, i % 2 ? front : L.modern ? '#c0f040' : '#c0d860'));
  }
  return s.join('');
  return s.join('');
}

/** The promenade on the quay wall, leading to the door; the neighbour on the right. */
function surroundings(L: Look): string {
  const c = pal(L);
  const s: string[] = [];
  s.push(box(L, -6, 414, FL + 6, WATER - 414, c.stone, 120));
  for (let y = 430; y < WATER; y += 22) s.push(line([0, y], [FL, y], L.modern ? '#3a3a3a' : '#7a6a5e', 1.4));
  s.push(path(`M0 384H${FL}`, { stroke: L.ink, sw: 5 }) + path(`M0 384H${FL}`, { stroke: '#4a4a5a', sw: 2.4 }));
  for (let x = 6; x < FL; x += 14) s.push(line([x, 386], [x, 414], L.ink, 2));
  // The neighbour: green plaster, shutters.
  s.push(box(L, FR, 40, 80, WATER - 40, L.modern ? 'url(#mdGreen)' : '#9ac8a0', 121));
  for (let y = 80; y < 540; y += 92) {
    s.push(rect(FR + 22, y, 24, 36, { fill: '#f4f0e8', stroke: L.ink, sw: L.sw * 0.7 }));
    s.push(rect(FR + 12, y, 9, 36, { fill: '#2a5a4a', stroke: L.ink, sw: L.sw * 0.6 }) + rect(FR + 47, y, 9, 36, { fill: '#2a5a4a', stroke: L.ink, sw: L.sw * 0.6 }));
  }
  // Bushes at the water's edge, left and right.
  for (const [x, y, rx, ry, col] of [[30, 560, 60, 22, '#3a7a3a'], [930, 556, 50, 26, '#3a7a3a'], [90, 568, 40, 14, '#4a8a3a']] as Array<[number, number, number, number, string]>)
    s.push(path(puff(x, y, rx, ry, 7, x, 0.2), { fill: L.modern ? '#2a9a3a' : col, stroke: L.ink, sw: L.sw }));
  return s.join('');
}

function windowArt(L: Look, w: (typeof TM.windows)[number], i: number): string {
  const s: string[] = [];
  s.push(box(L, w.x - 6, w.y - 6, w.w + 12, w.h + 12, L.modern ? '#f4ead8' : '#f4e2b8', 30 + i, L.sw * 0.8));
  s.push(rect(w.x, w.y, w.w, w.h, { fill: L.modern ? 'url(#mdView)' : 'url(#tmView)' }));
  s.push(path(`M${w.x + w.w / 2} ${w.y}V${w.y + w.h}M${w.x} ${w.y + w.h * 0.45}H${w.x + w.w}`, { stroke: L.modern ? '#ffffff' : '#7a5a3a', sw: L.modern ? 3 : 2.4 }));
  s.push(rect(w.x, w.y, w.w, w.h, { stroke: L.ink, sw: L.sw * 0.9 }));
  return s.join('');
}

/** The cut-open floors: back walls, ceiling joists, floorboards, slab edges. */
function floorsArt(L: Look): string {
  const c = pal(L);
  const s: string[] = [];
  FLOORS.forEach((f, i) => {
    const cellar = i === 2;
    s.push(rect(HX0, f.ceil, HX1 - HX0, f.back - f.ceil, { fill: cellar ? c.stone : c.inner }));
    if (cellar) {
      const r = rng(9);
      for (let y = f.ceil + 12; y < f.back; y += 18) {
        s.push(line([HX0, y], [HX1, y], L.modern ? '#2a2a2a' : '#6a5a50', 1.2, 0.8));
        for (let x = HX0 + ((y / 18) % 2) * 20 + r() * 8; x < HX1; x += 40) s.push(line([x, y], [x, y + 18], L.modern ? '#2a2a2a' : '#6a5a50', 1.2, 0.8));
      }
      // The vault in the tower's cellar: a dark recess for the barrels.
      s.push(path(`M160 ${f.back}V470Q315 404 470 470V${f.back}Z`, { fill: L.modern ? '#2a1a1a' : '#4a3438', stroke: L.ink, sw: L.sw }));
      s.push(path('M160 470Q315 404 470 470', { stroke: L.modern ? '#c8b8a0' : '#c8b49a', sw: 6 }) + path('M160 470Q315 404 470 470', { stroke: L.ink, sw: 1.4 }));
    } else {
      // The tower is round: shade its back wall towards the sides.
      s.push(rect(HX0, f.ceil, SPLIT - HX0, f.back - f.ceil, { fill: 'url(#roundShade)' }));
      s.push(rect(SPLIT, f.ceil, HX1 - SPLIT, f.back - f.ceil, { fill: 'url(#flatShade)' }));
    }
    // Ceiling joists, seen end-on.
    s.push(rect(HX0, f.ceil, HX1 - HX0, 6, { fill: c.dark }));
    for (let x = HX0 + 10; x < HX1; x += 46) s.push(box(L, x, f.ceil, 14, 12, c.wood, 200 + x + i, L.sw * 0.6));
    // The floor.
    s.push(rect(HX0, f.back, HX1 - HX0, f.front - f.back, { fill: cellar ? (L.modern ? 'url(#mdStone)' : '#8a7a70') : c.wood }));
    const r = rng(20 + i);
    for (let y = f.back + 7; y < f.front; y += 7) {
      s.push(line([HX0, y], [HX1, y], cellar ? '#5a4a44' : L.modern ? '#2a1408' : '#5a321e', 1, 0.7));
      for (let x = HX0 + r() * 40; x < HX1; x += 50 + r() * 40) s.push(line([x, y - 7], [x, y], cellar ? '#5a4a44' : '#5a321e', 1, 0.6));
    }
    s.push(line([HX0, f.back], [HX1, f.back], L.ink, L.sw * 0.7));
    // The cut: the slab's front edge (the cellar sits on the foundation instead).
    if (!cellar) {
      s.push(box(L, HX0 - 8, f.front, HX1 - HX0 + 16, SLAB, c.dark, 210 + i));
      for (let x = HX0 + 17; x < HX1; x += 46) s.push(rect(x, f.front + 2, 10, SLAB - 4, { fill: c.wood, stroke: L.ink, sw: 0.8 }));
    }
    // The wall between tower and house, with a doorway.
    s.push(box(L, SPLIT - 8, f.ceil, 16, f.back - f.ceil, cellar ? c.stone : L.modern ? '#f0dcb8' : '#e8c890', 230 + i));
    s.push(box(L, SPLIT - 6, f.back - 90, 12, 90, L.modern ? '#1a0a00' : '#3a2018', 240 + i, L.sw * 0.6));
  });
  TM.windows.forEach((w, i) => s.push(windowArt(L, w, i)));
  return s.join('');
}

function stairArt(L: Look, a: Pt, ay: number, b: Pt, by: number, seed: number): string {
  const c = pal(L);
  const s: string[] = [];
  const steps = 9;
  s.push(shape(L, [[a[0], ay], [a[1], ay], [b[1], by], [b[0], by]], c.wood, seed));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    s.push(line([a[0] + (b[0] - a[0]) * t, ay + (by - ay) * t], [a[1] + (b[1] - a[1]) * t, ay + (by - ay) * t], L.modern ? '#1a0a00' : '#4a2a1a', 1.6));
  }
  // A banister along the high side.
  const hi = ay < by ? [a, ay] : [b, by];
  const lo = ay < by ? [b, by] : [a, ay];
  const [hx, hy] = [(hi[0] as Pt)[1], hi[1] as number];
  const [lx, ly] = [(lo[0] as Pt)[1], lo[1] as number];
  s.push(path(`M${hx} ${hy - 40}L${lx} ${ly - 40}`, { stroke: L.ink, sw: 5 }) + path(`M${hx} ${hy - 40}L${lx} ${ly - 40}`, { stroke: c.wood === '#8a5432' ? '#a86a3a' : '#8a5a3a', sw: 2.4 }));
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const x = hx + (lx - hx) * t;
    const y = hy + (ly - hy) * t;
    s.push(line([x, y - 40], [x, y], L.ink, 2));
  }
  return s.join('');
}

function furniture(L: Look): string {
  const c = pal(L);
  const s: string[] = [];
  // Turmstube: the writing desk, quill and candle, a chair, books.
  const d = TM.desk;
  s.push(box(L, d.x + 6, d.top + 8, 8, d.foot - d.top - 8, c.wood, 51) + box(L, d.x + d.w - 14, d.top + 8, 8, d.foot - d.top - 8, c.wood, 52));
  s.push(shape(L, [[d.x - 4, d.top + 4], [d.x + d.w + 4, d.top - 4], [d.x + d.w + 4, d.top + 8], [d.x - 4, d.top + 12]], c.wood, 53));
  s.push(shape(L, [[d.x + 22, d.top + 1], [d.x + 58, d.top - 4], [d.x + 60, d.top + 4], [d.x + 24, d.top + 8]], '#f8f0dc', 54, L.sw * 0.6));
  s.push(path(`M${d.x + 66} ${d.top - 4}q4 -20 18 -28q-6 14 -12 28z`, { fill: '#f8f0e0', stroke: L.ink, sw: L.sw * 0.5 }));
  s.push(ellipse(d.x + 68, d.top - 3, 5, 3.4, { fill: '#1a1a2a', stroke: L.ink, sw: L.sw * 0.5 }));
  s.push(box(L, d.x + 82, d.top - 22, 5, 16, '#f4ead0', 55, L.sw * 0.5));
  s.push(path(`M${d.x + 84.5} ${d.top - 24}q-3 -5 0 -10q3 5 0 10z`, { fill: '#ffcf4a', stroke: '#d86a2a', sw: 0.8 }));
  if (!L.modern) s.push(glow('gCandle1', d.x + 85, d.top - 30, 34, '#ffd07a', 0.5));
  s.push(box(L, d.x + d.w + 8, d.foot - 50, 6, 50, c.wood, 56) + box(L, d.x + d.w + 8, d.foot - 26, 22, 5, c.wood, 57) + box(L, d.x + d.w + 26, d.foot - 26, 4, 26, c.wood, 58));
  const sh = TM.shelf;
  s.push(box(L, sh.x, sh.y, sh.w, sh.h, c.dark, 60));
  const r = rng(12);
  for (let y = sh.y + 6; y < sh.y + sh.h - 6; y += 26) {
    s.push(line([sh.x + 3, y + 20], [sh.x + sh.w - 3, y + 20], c.wood, 3));
    for (let x = sh.x + 5; x < sh.x + sh.w - 7; x += 7 + r() * 3) s.push(rect(x, y + 4 - r() * 4, 6, 16 + r() * 4, { fill: ['#a8323a', '#2a4a8a', '#3a7a4a', '#c8963a'][Math.floor(r() * 4)], stroke: L.ink, sw: 0.8 }));
  }
  // ... and the bed, a side table, a picture.
  const b = TM.bed;
  s.push(box(L, b.x, b.foot - 54, 12, 54, c.wood, 61));
  s.push(box(L, b.x + b.w - 12, b.foot - 36, 12, 36, c.wood, 62));
  s.push(box(L, b.x + 10, b.foot - 28, b.w - 20, 16, '#f4f0e8', 63));
  s.push(shape(L, [[b.x + 44, b.foot - 30], [b.x + b.w - 14, b.foot - 30], [b.x + b.w - 14, b.foot - 10], [b.x + 50, b.foot - 10]], L.modern ? 'url(#mdQuilt)' : '#4a5a9a', 64));
  s.push(ellipse(b.x + 26, b.foot - 32, 14, 7, { fill: '#ffffff', stroke: L.ink, sw: L.sw * 0.7 }));
  s.push(box(L, b.x - 34, b.foot - 34, 26, 34, c.wood, 65) + box(L, b.x - 26, b.foot - 50, 5, 14, '#f4ead0', 66, 1));
  s.push(box(L, 560, 180, 60, 34, '#c8963a', 67) + rect(566, 186, 48, 22, { fill: L.modern ? 'url(#mdView)' : '#d8a07a' }));
  // Parlour: an armchair by the door, a table with flowers, the sofa.
  s.push(box(L, 300, 362, 54, 6, c.wood, 70) + box(L, 306, 368, 5, 24, c.wood, 71) + box(L, 344, 368, 5, 24, c.wood, 72));
  s.push(ellipse(327, 352, 8, 10, { fill: '#5a6a9a', stroke: L.ink, sw: L.sw * 0.6 }));
  for (const [fx, fy, col] of [[320, 336, '#ffd34a'], [330, 330, '#ff8a3a'], [336, 340, '#ffd34a'], [324, 344, '#ffffff']] as Array<[number, number, string]>) s.push(circle(fx, fy, 4, { fill: col, stroke: L.ink, sw: 0.8 }));
  const so = TM.sofa;
  s.push(shape(L, [[so.x, so.foot - 46], [so.x + so.w, so.foot - 46], [so.x + so.w, so.foot - 20], [so.x, so.foot - 20]], L.modern ? 'url(#mdStripes)' : '#c8a8a0', 73));
  s.push(box(L, so.x - 10, so.foot - 30, 20, 26, c.wood, 74) + box(L, so.x + so.w - 10, so.foot - 30, 20, 26, c.wood, 75));
  s.push(box(L, so.x + 8, so.foot - 24, so.w - 16, 18, L.modern ? 'url(#mdStripes)' : '#e8d0c0', 76));
  for (let k = 1; k < 4; k++) s.push(line([so.x + (so.w * k) / 4, so.foot - 44], [so.x + (so.w * k) / 4, so.foot - 22], '#8a6a60', 1.6));
  // Cellar: barrels in the vault, jugs on a shelf, sacks.
  const ba = TM.barrels;
  for (let k = 0; k < 3; k++) {
    const x = ba.x + 22 + k * 44;
    s.push(path(`M${x - 18} ${ba.foot}Q${x - 24} ${ba.foot - 25} ${x - 18} ${ba.foot - 50}H${x + 18}Q${x + 24} ${ba.foot - 25} ${x + 18} ${ba.foot}Z`, { fill: c.wood, stroke: L.ink, sw: L.sw }));
    for (const y of [ba.foot - 40, ba.foot - 12]) s.push(path(`M${x - 20} ${y}H${x + 20}`, { stroke: '#3a3a4a', sw: 3 }));
  }
  s.push(box(L, 192, 452, 130, 6, c.wood, 80));
  for (let k = 0; k < 3; k++) {
    const x = 214 + k * 40;
    s.push(path(`M${x - 9} 452Q${x - 13} 440 ${x - 5} 432V426H${x + 5}V432Q${x + 13} 440 ${x + 9} 452Z`, { fill: k % 2 ? '#a8643a' : '#c88a4a', stroke: L.ink, sw: L.sw * 0.7 }));
  }
  for (let k = 0; k < 2; k++) {
    const x = TM.sacks.x + 12 + k * 26;
    s.push(path(`M${x - 13} ${TM.sacks.foot}Q${x - 16} ${TM.sacks.foot - 24} ${x - 6} ${TM.sacks.foot - 34}L${x} ${TM.sacks.foot - 40}L${x + 6} ${TM.sacks.foot - 34}Q${x + 16} ${TM.sacks.foot - 24} ${x + 13} ${TM.sacks.foot}Z`, { fill: L.modern ? 'url(#mdBurlap)' : '#d8b878', stroke: L.ink, sw: L.sw }));
  }
  return s.join('');
}

function graffitiArt(L: Look): string {
  const { x, y, w } = TM.graffiti;
  const a = TM.arch;
  const s: string[] = [];
  const pink = L.modern ? '#ff1a8c' : '#ff4a8a';
  const cyan = L.modern ? '#00e0ff' : '#4ae8ff';
  if (L.modern) s.push(group(text(x + w / 2, y + 30, 'PUT PUT', { size: 36, fill: pink, rotate: -3 }), undefined, 'filter="url(#mdSpray)" opacity="0.6"'));
  s.push(text(x + w / 2, y + 28, 'PUT PUT', { size: 34, fill: pink, stroke: L.modern ? '#000000' : cyan, sw: L.modern ? 3.4 : 2.4, rotate: -3 }));
  for (const [dx, len] of [[34, 12], [78, 8], [130, 14], [172, 9]] as Pt[]) s.push(path(`M${x + dx} ${y + 30}v${len}`, { stroke: pink, sw: 2.4 }) + circle(x + dx, y + 30 + len, 1.8, { fill: pink }));
  s.push(path(`M${a.x + a.w / 2} ${y + 40}V${a.top - 6}m-6 -7l6 7l6 -7`, { stroke: cyan, sw: 3 }));
  s.push(path(`M${a.x} ${a.foot}V${a.top + 22}Q${a.x + a.w / 2} ${a.top - 10} ${a.x + a.w} ${a.top + 22}V${a.foot}`, { stroke: cyan, sw: 2.8, extra: 'stroke-dasharray="8 6"' }));
  return s.join('');
}

function pedestalArt(L: Look): string {
  const { x, top, foot, w } = TM.pedestal;
  const s: string[] = [];
  const brass = L.modern ? 'url(#mdChrome)' : '#c8964a';
  s.push(ellipse(x, foot + 2, w * 0.9, 4, { fill: '#000000', opacity: 0.25 }));
  s.push(box(L, x - w / 2 - 6, foot - 8, w + 12, 8, brass, 71));
  s.push(box(L, x - w / 2 + 2, top + 6, w - 4, foot - top - 14, L.modern ? 'url(#mdWood)' : '#6a4a5a', 72));
  s.push(box(L, x - w / 2 - 6, top, w + 12, 7, brass, 73));
  s.push(circle(x, top + 18, 6, { fill: '#f4ecd8', stroke: L.ink, sw: L.sw * 0.6 }));
  s.push(line([x, top + 18], [x + 3, top + 14], '#d83a2a', 1.6));
  s.push(rect(x - 11, top + 28, 22, 7, { fill: '#e8c87a', stroke: L.ink, sw: 1 }));
  s.push(text(x, top + 33.6, 'O. R.', { size: 5.4, fill: INK, weight: 700 }));
  s.push(line([x, top], [x, TM.spiral.cy + 18], L.ink, 4) + line([x, top], [x, TM.spiral.cy + 18], '#e8c87a', 1.6));
  return s.join('');
}

function spiralArt(L: Look): string {
  const d = spiralPath();
  if (L.modern) {
    return [
      path(d, { stroke: '#00e0ff', sw: 6, opacity: 0.55, extra: 'filter="url(#mdNeon)"' }),
      path(d, { stroke: '#ff3ad8', sw: 2.4, opacity: 0.85 }),
      path(d, { stroke: '#ffffff', sw: 1 }),
    ].join('');
  }
  return [path(d, { stroke: INK, sw: 3 }), path(d, { stroke: '#f2c24a', sw: 1.4 }), path(d, { stroke: '#fff4c0', sw: 0.5, opacity: 0.8 })].join('');
}

/** The tower's and the house's side walls, the door, the roofs, the foundation. */
function shellArt(L: Look): string {
  const c = pal(L);
  const s: string[] = [];
  // Side facades: the tower's bulges, the house's is straight.
  s.push(path(`M${HX0} ${EAVE}L${FL} 152Q${FL - 16} 350 ${FL} 558L${HX0} 552Z`, { fill: c.plaster, stroke: L.ink, sw: L.sw }));
  s.push(path(`M${HX1} ${EAVE}L${FR} 152L${FR} 558L${HX1} 552Z`, { fill: c.plaster, stroke: L.ink, sw: L.sw }));
  if (!L.modern) {
    s.push(path(`M${FL + 10} 156Q${FL - 4} 350 ${FL + 10} 556L${FL + 22} 556Q${FL + 8} 350 ${FL + 22} 156Z`, { fill: '#c8902a', opacity: 0.4 }));
    s.push(path(`M${FR - 14} 154V556H${FR}V154Z`, { fill: '#c8902a', opacity: 0.4 }));
  }
  // The cut edge of the walls.
  s.push(rect(HX0 - 6, EAVE, 8, 412, { fill: L.modern ? '#fff6e0' : '#f8dc90', stroke: L.ink, sw: L.sw * 0.6 }));
  s.push(rect(HX1 - 2, EAVE, 8, 412, { fill: L.modern ? '#fff6e0' : '#f8dc90', stroke: L.ink, sw: L.sw * 0.6 }));
  // Windows with shutters on the side walls.
  const sideWin = (x: number, y: number, k: number) =>
    rect(x, y, 22, 32, { fill: '#ffd870', stroke: L.ink, sw: L.sw * 0.7 }) +
    path(`M${x + 11} ${y}V${y + 32}M${x} ${y + 15}H${x + 22}`, { stroke: '#8a5a2a', sw: 1.4 }) +
    rect(x - 9, y - 1, 8, 34, { fill: k % 2 ? '#5a6a9a' : '#4a6a8a', stroke: L.ink, sw: L.sw * 0.6 }) +
    rect(x + 23, y - 1, 8, 34, { fill: k % 2 ? '#5a6a9a' : '#4a6a8a', stroke: L.ink, sw: L.sw * 0.6 });
  s.push(sideWin(FL + 14, 194, 0) + sideWin(FL + 14, 466, 1));
  s.push(sideWin(HX1 + 15, 194, 2) + sideWin(HX1 + 15, 324, 3) + sideWin(HX1 + 15, 466, 4));
  // The door from the promenade.
  const dr = TM.door;
  s.push(path(`M${dr.x} ${dr.foot}V${dr.top + 12}Q${dr.x + dr.w / 2} ${dr.top - 6} ${dr.x + dr.w} ${dr.top + 12}V${dr.foot}Z`, { fill: L.modern ? 'url(#mdWood)' : '#7a3a2a', stroke: L.ink, sw: L.sw }));
  s.push(path(`M${dr.x + dr.w / 2} ${dr.top + 4}V${dr.foot}`, { stroke: L.modern ? '#000000' : '#4a2018', sw: 1.6 }));
  s.push(circle(dr.x + dr.w - 7, 372, 2.6, { fill: '#ffd34a', stroke: L.ink, sw: 1.2 }));
  // Roofs: the house's hipped roof, then the tower's cone in front of it.
  s.push(shape(L, [[466, 150], [924, 154], [872, 62], [520, 58]], c.slate, 300));
  for (let y = 70; y < 150; y += 11) s.push(line([520 - (y - 58) * 0.6, y], [872 + (y - 62) * 0.56, y], L.modern ? '#1a1a2a' : '#3e3a5e', 1.2));
  s.push(box(L, 716, 22, 24, 44, '#b85a3a', 301) + box(L, 712, 18, 32, 7, '#8a4a3a', 302));
  s.push(path(`M84 152Q300 176 516 152L300 4Z`, { fill: c.slate, stroke: L.ink, sw: L.sw }));
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    const y = 4 + (152 - 4) * t;
    s.push(path(`M${300 - 216 * t} ${y}Q300 ${y + 24 * t} ${300 + 216 * t} ${y}`, { stroke: L.modern ? '#1a1a2a' : '#3e3a5e', sw: 1.2 }));
  }
  s.push(path('M300 4L250 150', { stroke: L.modern ? '#ffffff' : '#9a96c0', sw: 2, opacity: 0.6 }));
  s.push(line([300, 4], [300, -6], L.ink, 2.4) + circle(300, -4, 4, { fill: '#ffd34a', stroke: L.ink, sw: 1.4 }));
  // The eaves: rafter ends under the roofs, all round.
  s.push(box(L, FL - 8, EAVE - 2, FR - FL + 16, 14, c.dark, 303));
  for (let x = FL; x < FR; x += 22) s.push(rect(x, EAVE + 2, 8, 6, { fill: c.wood, stroke: L.ink, sw: 0.8 }));
  // The foundation on the riverbank, flowers.
  s.push(box(L, FL - 10, 550, FR - FL + 20, WATER - 548, c.stone, 304));
  for (let x = FL + 10; x < FR; x += 34) s.push(line([x, 552], [x + 4, WATER - 2], L.modern ? '#2a2a2a' : '#6a5a50', 1.2) + line([x - 17, 563], [x + 17, 563], L.modern ? '#2a2a2a' : '#6a5a50', 1.2));
  for (const fx of [250, 460, 700]) {
    s.push(box(L, fx - 22, 556, 44, 12, c.wood, 305 + fx));
    for (let k = 0; k < 6; k++) s.push(circle(fx - 16 + k * 6.4, 553 - (k % 2) * 3, 3.4, { fill: ['#ff4a8a', '#ffd34a', '#ff7a2a'][k % 3], stroke: L.ink, sw: 0.7 }));
  }
  return s.join('');
}

function waterArt(L: Look): string {
  const c = pal(L);
  const s: string[] = [rect(0, WATER, ROOM.w, ROOM.h - WATER, { fill: c.water })];
  const r = rng(33);
  for (let i = 0; i < 26; i++) {
    const x = r() * ROOM.w;
    const y = WATER + 6 + r() * (ROOM.h - WATER - 8);
    s.push(path(`M${x} ${y}h${12 + r() * 26}`, { stroke: ['#ffd870', '#ff9a6a', '#c8f0ff'][i % 3], sw: 2, opacity: 0.7 }));
  }
  // Two punts moored at the bank.
  for (const [x, y] of [[560, 590], [690, 604]] as Pt[]) {
    s.push(shape(L, [[x, y], [x + 320, y - 4], [x + 300, y + 16], [x + 14, y + 18]], L.modern ? 'url(#mdWood)' : '#7a4a2a', 310 + x));
    for (let k = 1; k < 7; k++) s.push(line([x + k * 44, y - 1], [x + k * 44 - 2, y + 14], L.ink, 1.6));
  }
  return s.join('');
}

function vectorRoom(L: Look): string {
  return [
    skyAndTown(L),
    trees(L),
    surroundings(L),
    willow(L),
    floorsArt(L),
    furniture(L),
    graffitiArt(L),
    pedestalArt(L),
    spiralArt(L),
    stairArt(L, TM.stairUp.bottom, FLOORS[1].back, TM.stairUp.top, FLOORS[0].front, 320),
    stairArt(L, TM.stairDown.top, FLOORS[1].front, TM.stairDown.bottom, FLOORS[2].back, 321),
    shellArt(L),
    waterArt(L),
  ].join('');
}

const SHADES = () =>
  linear('roundShade', HX0, 0, SPLIT, 0, [
    [0, '#3a1a20', 0.45],
    [0.3, '#3a1a20', 0],
    [0.75, '#3a1a20', 0],
    [1, '#3a1a20', 0.3],
  ]) +
  linear('flatShade', SPLIT, 0, HX1, 0, [
    [0, '#3a1a20', 0.2],
    [0.2, '#3a1a20', 0],
    [1, '#3a1a20', 0.15],
  ]);

function toonDefs(): string {
  return defs(
    grainDefs(71),
    SHADES(),
    linear('tmSky', 0, 0, 0, 440, [
      [0, '#3a3a8a'],
      [0.35, '#7a4aa0'],
      [0.65, '#e2607a'],
      [0.85, '#ff9a52'],
      [1, '#ffd08a'],
    ]),
    linear('tmInner', 0, 150, 0, 400, [
      [0, '#f0c070'],
      [1, '#d89a5a'],
    ]),
    linear('tmView', 0, 0, 0, 1, [
      [0, '#6a4aa0'],
      [0.6, '#ff8a6a'],
      [1, '#ffd08a'],
    ]).replace('gradientUnits="userSpaceOnUse"', 'gradientUnits="objectBoundingBox"'),
    linear('tmWater', 0, WATER, 0, ROOM.h, [
      [0, '#2a7a8a'],
      [1, '#1a3a5a'],
    ])
  );
}

/** Photo textures: plaster, wood grain, stone, slate, water, clouds — all
 *  procedural (feTurbulence + lighting), then outlined like a cartoon. */
function modernDefs(): string {
  const tex = (id: string, w: number, h: number, base: string, freq: string, seed: number, op = 0.6, light = '#fff4e0') =>
    `<filter id="${id}F" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="4" seed="${seed}"/>` +
    `<feDiffuseLighting surfaceScale="2.4" lighting-color="${light}"><feDistantLight azimuth="235" elevation="50"/></feDiffuseLighting></filter>` +
    `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="${base}"/>` +
    `<rect width="${w}" height="${h}" filter="url(#${id}F)" opacity="${op}" style="mix-blend-mode:multiply"/></pattern>`;
  return defs(
    SHADES(),
    tex('mdPlaster', 300, 300, '#ffd040', '0.04', 3),
    tex('mdInner', 400, 300, '#ffc878', '0.03', 5, 0.5),
    tex('mdStone', 200, 120, '#b8a898', '0.06 0.1', 7, 0.8),
    tex('mdSlate', 200, 100, '#6a6890', '0.02 0.2', 8, 0.7),
    tex('mdGreen', 200, 300, '#8ad098', '0.05', 4, 0.6),
    tex('mdBurlap', 60, 60, '#e0c080', '0.4', 6, 0.7),
    tex('mdTiles', 120, 60, '#e0603a', '0.05 0.3', 9, 0.6),
    tex('mdBark', 80, 200, '#6a4228', '0.06 0.01', 10, 0.8),
    `<filter id="mdWoodF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.12" numOctaves="3" seed="9"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0.62 0.2  0 0 0 0.34 0.09  0 0 0 0.12 0.02  0 0 0 0 1"/></filter>`,
    `<pattern id="mdWood" width="400" height="200" patternUnits="userSpaceOnUse"><rect width="400" height="200" filter="url(#mdWoodF)"/></pattern>`,
    `<filter id="mdWaterF" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.01 0.2" numOctaves="2" seed="5"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0.3 0.05  0 0 0 0.5 0.35  0 0 0 0.5 0.45  0 0 0 0 1"/></filter>`,
    `<pattern id="mdWater" width="400" height="60" patternUnits="userSpaceOnUse"><rect width="400" height="60" filter="url(#mdWaterF)"/></pattern>`,
    `<filter id="mdCloudF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="4" seed="11"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.9  0 0 0 2.4 -1.2"/></filter>`,
    `<pattern id="mdClouds" width="960" height="300" patternUnits="userSpaceOnUse"><rect width="960" height="300" filter="url(#mdCloudF)" opacity="0.7"/></pattern>`,
    `<filter id="mdSpray" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>`,
    `<filter id="mdNeon" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>`,
    `<pattern id="mdStripes" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#f0e0d0"/><rect width="5" height="12" fill="#5a7ac8"/></pattern>`,
    `<pattern id="mdQuilt" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#3a4ac8"/><rect width="7" height="7" fill="#5a6ae8"/><rect x="7" y="7" width="7" height="7" fill="#5a6ae8"/></pattern>`,
    linear('mdSky', 0, 0, 0, 440, [
      [0, '#2a2aa0'],
      [0.4, '#8a3ad0'],
      [0.7, '#ff4a8a'],
      [1, '#ffb04a'],
    ]),
    linear('mdView', 0, 0, 0, 1, [
      [0, '#3a3ac8'],
      [0.6, '#ff5a8a'],
      [1, '#ffd04a'],
    ]).replace('gradientUnits="userSpaceOnUse"', 'gradientUnits="objectBoundingBox"'),
    linear('mdChrome', 0, 350, 0, 395, [
      [0, '#ffffff'],
      [0.3, '#b8c0d0'],
      [0.55, '#5a6070'],
      [0.75, '#e8ecf4'],
      [1, '#7a8090'],
    ])
  );
}

/** The whole doll's house in one of the three time layers (static per layer). */
export function turmBg(era: Era): string {
  if (era === 1) return pixelRoom();
  if (era === 2) return [modernDefs(), vectorRoom(MODERN), vignette('mdVig', ROOM.w, ROOM.h, 0.3, '#1a0a2a')].join('');
  return [toonDefs(), vectorRoom(TOON), vignette('tmVig', ROOM.w, ROOM.h, 0.38), grainOverlay(ROOM.w, ROOM.h, 0.3, 0.26)].join('');
}

// ---- state overlays: the rug, the black hole, the hole in the wall --------------------------

const RUG = ['#a8323a', '#e8b84a', '#2a4a8a'];

/** The rug in front of the sofa, flat (covering the hole) or folded back. */
export function rugArt(era: Era, folded: boolean): string {
  const { cx, cy, rx, ry } = TM.rug;
  if (era === 1) {
    const g = new PixGrid();
    if (!folded) {
      g.ellipse(cx, cy, rx, ry, 'r', 'Y');
      g.rect(cx - rx * 0.5, cy - 2, rx, 4, 'b');
    } else {
      g.rect(cx - rx, cy - 7, 70, 12, 'r');
      g.rect(cx - rx + 66, cy - 7, 5, 12, 'Y');
    }
    return g.svg();
  }
  const L = era === 2 ? MODERN : TOON;
  const s: string[] = [];
  if (!folded) {
    s.push(ellipse(cx, cy + 2, rx + 3, ry + 2, { fill: '#000000', opacity: 0.25 }));
    s.push(ellipse(cx, cy, rx, ry, { fill: RUG[0], stroke: L.ink, sw: L.sw * 0.8 }));
    s.push(ellipse(cx, cy, rx - 10, ry - 3, { stroke: RUG[1], sw: 2 }));
    s.push(ellipse(cx, cy, rx * 0.46, ry * 0.45, { fill: RUG[2], stroke: RUG[1], sw: 1.6 }));
    // A suspicious little lump.
    s.push(path(`M${TM.hole.cx - 18} ${TM.hole.cy}q18 -6 36 0`, { stroke: '#5a1a2a', sw: 1.8, opacity: 0.8 }));
  } else {
    // Rolled up and shoved to the left end.
    const x0 = cx - rx;
    const x1 = cx - rx + 70;
    s.push(ellipse((x0 + x1) / 2, cy + 5, 40, 3, { fill: '#000000', opacity: 0.25 }));
    s.push(path(`M${x0} ${cy - 7}H${x1}V${cy + 5}H${x0}Z`, { fill: RUG[0], stroke: L.ink, sw: L.sw * 0.8 }));
    s.push(path(`M${x0 + 10} ${cy - 7}V${cy + 5}M${x0 + 30} ${cy - 7}V${cy + 5}M${x0 + 50} ${cy - 7}V${cy + 5}`, { stroke: RUG[1], sw: 1.8 }));
    s.push(ellipse(x1, cy - 1, 4, 6, { fill: '#d8c4a0', stroke: L.ink, sw: L.sw * 0.7 }));
    s.push(path(`M${x1} ${cy - 1}m-1 0a2 3 0 1 1 2 2`, { stroke: RUG[0], sw: 1.2 }));
  }
  return s.join('');
}

/** The black hole under the rug. In the modern layer it is a cartoon
 *  portable hole — flat as a pancake, one edge curling up. */
export function blackHoleArt(era: Era): string {
  const { cx, cy, rx, ry } = TM.hole;
  if (era === 1) {
    const g = new PixGrid();
    g.ellipse(cx, cy, rx + 6, ry + 3, 'm');
    g.ellipse(cx, cy, rx, ry, 'k');
    return g.svg();
  }
  if (era === 2) {
    return [
      defs(
        `<filter id="mdDiskF" x="-30%" y="-80%" width="160%" height="260%"><feTurbulence type="turbulence" baseFrequency="0.08 0.4" numOctaves="3" seed="21"/>` +
          `<feDisplacementMap in="SourceGraphic" scale="6"/><feGaussianBlur stdDeviation="0.6"/></filter>`,
        radial('mdDisk', cx, cy, rx + 16, [
          [0.55, '#ffffff', 1],
          [0.7, '#ffcf6a', 0.95],
          [0.85, '#ff5a1a', 0.7],
          [1, '#5a0a3a', 0],
        ], ry + 5)
      ),
      ellipse(cx, cy, rx + 16, ry + 5, { fill: 'url(#mdDisk)', extra: 'filter="url(#mdDiskF)"' }),
      ellipse(cx, cy, rx, ry, { fill: '#000000', stroke: '#000000', sw: 3 }),
      path(`M${cx + rx - 14} ${cy - ry + 2}q14 -10 20 2q-8 3 -20 -2z`, { fill: '#2a2a3a', stroke: '#000000', sw: 2.4 }),
    ].join('');
  }
  const r = rng(77);
  const stars: string[] = [];
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    stars.push(circle(cx + Math.cos(a) * rx * 1.1, cy + Math.sin(a) * ry * 1.3, 0.8 + r(), { fill: '#fff0ff', opacity: 0.85 }));
  }
  return [
    defs(radial('tmHole', cx, cy, rx + 12, [
      [0.5, '#000000', 1],
      [0.75, '#5a1a8a', 0.8],
      [1, '#a04ad8', 0],
    ], ry + 5)),
    ellipse(cx, cy, rx + 12, ry + 5, { fill: 'url(#tmHole)' }),
    ellipse(cx, cy, rx * 0.8, ry * 0.8, { fill: '#000000', stroke: INK, sw: 1.6 }),
    ...stars,
  ].join('');
}

/** The hole in the cellar wall, put where PUT PUT said: another sky beyond. */
export function wallHoleArt(era: Era): string {
  const { x, w, top, foot } = TM.arch;
  const arch = `M${x} ${foot}V${top + 22}Q${x + w / 2} ${top - 10} ${x + w} ${top + 22}V${foot}Z`;
  if (era === 1) {
    const g = new PixGrid();
    const pts: Pt[] = [[x, foot], [x, top + 22], [x + w * 0.25, top + 4], [x + w / 2, top], [x + w * 0.75, top + 4], [x + w, top + 22], [x + w, foot]];
    g.poly(pts, (_cx, cy) => (cy * CELL < top + 30 ? 'b' : cy * CELL < top + 50 ? 'm' : 'k'));
    g.rect(x + 16, top + 20, 4, 4, 'w');
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
    circle(x + 18, top + 22, 1.2, { fill: '#ffffff' }),
    circle(x + 40, top + 36, 1, { fill: '#ffffff' }),
    path(arch, { stroke: L.ink, sw: L.sw + 1 }),
    path(`M${x} ${top + 46}l-8 -5M${x + w} ${top + 38}l10 -6l5 3M${x + w / 2} ${top - 4}l-3 -10`, { stroke: L.ink, sw: 1.8 }),
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
  return glow('spGlow', cx, cy, 80, era === 2 ? '#7af0ff' : '#fff0a0', 0.5, 56);
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
