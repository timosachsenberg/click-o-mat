import type { ActorVariant, SvgActorAsset } from '../../engine/types';
import {
  INK,
  circle,
  curve,
  defs,
  ellipse,
  glow,
  grainDefs,
  grainOverlay,
  group,
  inked,
  line,
  linear,
  path,
  poly,
  puff,
  rect,
  rng,
  vignette,
  wobble,
  type Pt,
} from '../../game/art/toon';

/**
 * The Neckar, seen from the Neckarbrücke in Tübingen (after a summer photo):
 * the Platanenallee on the left bank, the Hölderlinturm and a weeping willow
 * where the river bends away, the Altstadt's coloured gabled houses above
 * the quay wall on the right, the Stiftskirche tower, a café with a red
 * awning — and in the foreground the bridge's sandstone balustrade, with a
 * gap and steps down to a little jetty on the left.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

/** Shared geometry: the room and its art must agree on these. */
export const NK = {
  /** Where the river vanishes round the bend. */
  far: 262,
  /** Left water edge, far → near. */
  bankL: [[392, 262], [0, 362]] as [Pt, Pt],
  /** Foot of the quay wall on the right (the waterline), far → near. */
  quayFoot: [[534, 264], [960, 356]] as [Pt, Pt],
  /** Top of the quay wall, far → near. */
  quayTop: [[530, 254], [960, 306]] as [Pt, Pt],
  /** The balustrade: coping top, baseline (occluder), and the gap with the steps. */
  parapetTop: 372,
  parapetBase: 408,
  gap: { x0: 44, x1: 126 },
  /** The jetty at the foot of the steps. */
  jetty: [[0, 348], [176, 348], [196, 368], [0, 372]] as Pt[],
};

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** y of a straight edge at x. */
const yAt = (e: [Pt, Pt], x: number) => e[0][1] + ((x - e[0][0]) / (e[1][0] - e[0][0])) * (e[1][1] - e[0][1]);
/** x of a straight edge at y. */
const xAt = (e: [Pt, Pt], y: number) => e[0][0] + ((y - e[0][1]) / (e[1][1] - e[0][1])) * (e[1][0] - e[0][0]);

export const RIVER = {
  sky0: '#3f8fe0',
  sky1: '#bfe3ff',
  far: '#9fd0e4',
  near: '#3f8f86',
  /** The water colour around the punt's sinking spot (its frames paint over the hull). */
  around: '#4b968c',
};

// ---- sky ---------------------------------------------------------------------------

function cloud(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  return (
    path(puff(cx, cy + ry * 0.25, rx * 0.98, ry * 0.7, 7, seed + 7, 0.12), { fill: '#b8c8e4' }) +
    path(puff(cx, cy, rx, ry, 8, seed, 0.16), { fill: '#ffffff', stroke: '#9fb4d8', sw: 2 }) +
    path(puff(cx + rx * 0.08, cy + ry * 0.35, rx * 0.8, ry * 0.42, 9, seed + 3, 0.2), { fill: '#dfe8f6' }) +
    path(puff(cx - rx * 0.25, cy - ry * 0.25, rx * 0.4, ry * 0.35, 7, seed + 5, 0.2), { fill: '#ffffff' })
  );
}

function sky(): string {
  return [
    rect(0, 0, 960, 300, { fill: 'url(#nkSky)' }),
    glow('nkSun', 300, 40, 260, '#fff6d0', 0.35, 160),
    cloud(560, 92, 150, 70, 11),
    cloud(760, 44, 120, 52, 23),
    cloud(410, 168, 80, 34, 37),
    cloud(900, 160, 90, 40, 41),
    cloud(640, 196, 70, 24, 53),
  ].join('');
}

// ---- the Altstadt --------------------------------------------------------------------

const WALLS = ['#f2c84a', '#f4efe4', '#e8a0a8', '#f0a050', '#f8e6b0', '#e8d08a', '#f6d2c0', '#fff4dc'];
const SHUTTERS = ['#3a9a4a', '#c43a2a', '#3a9a4a', '#2a6a9a'];

/** One gabled town house standing on `foot` at x, `w` wide; returns markup. */
function house(x: number, foot: number, w: number, seed: number, lean = 0): string {
  const r = rng(seed);
  const wall = WALLS[Math.floor(r() * WALLS.length)];
  const shut = SHUTTERS[Math.floor(r() * SHUTTERS.length)];
  const h = w * (1.15 + r() * 0.5);
  const roofH = w * (0.55 + r() * 0.25);
  const top = foot - h;
  const s: string[] = [];
  const sw = Math.max(1.2, w / 40);
  // Facade, a little crooked.
  s.push(inked(wobble([[x + lean, top], [x + w + lean, top], [x + w, foot], [x, foot]], { seed, wobble: w / 60 }), wall, sw));
  // A shaded strip on the left edge (light comes from the left/top).
  s.push(path(poly([[x + w - w * 0.12 + lean, top], [x + w + lean, top], [x + w, foot], [x + w - w * 0.12, foot]]), { fill: '#000000', opacity: 0.12 }));
  // Half-timbering on some.
  if (r() < 0.4) {
    const beam = '#6a3a22';
    for (let k = 1; k < 3; k++) s.push(line([x + lean * (1 - k / 3), top + (h * k) / 3], [x + w + lean * (1 - k / 3), top + (h * k) / 3], beam, sw * 1.1));
    s.push(line([x + lean, top], [x + w * 0.5, top + h / 3], beam, sw * 0.9));
    s.push(line([x + w + lean, top], [x + w * 0.5, top + h / 3], beam, sw * 0.9));
  }
  // Roof: a steep gable, red-brown tiles.
  const roof = r() < 0.5 ? '#b8442a' : '#a8502e';
  s.push(inked(poly([[x - w * 0.06 + lean, top + 1], [x + w * 0.5 + lean, top - roofH], [x + w * 1.06 + lean, top + 1]]), roof, sw));
  s.push(path(poly([[x + w * 0.5 + lean, top - roofH], [x + w * 1.06 + lean, top + 1], [x + w * 0.62 + lean, top + 1]]), { fill: '#000000', opacity: 0.18 }));
  for (let k = 1; k < 4; k++) {
    const y = top - roofH + (roofH * k) / 4;
    const half = (w * 0.56 * k) / 4;
    s.push(line([x + w * 0.5 - half + lean, y], [x + w * 0.5 + half + lean, y], '#7a2a18', sw * 0.6, 0.6));
  }
  // A roof window now and then.
  if (w > 40 && r() < 0.6) {
    const dx = x + w * 0.5 + lean - w * 0.09;
    s.push(inked(poly([[dx, top - roofH * 0.25], [dx + w * 0.18, top - roofH * 0.25], [dx + w * 0.18, top - roofH * 0.05], [dx, top - roofH * 0.05]]), '#f4efe4', sw * 0.7));
  }
  // Windows with shutters.
  const cols = w > 60 ? 4 : w > 36 ? 3 : 2;
  const rows = Math.max(2, Math.round(h / (w * 0.42)));
  const ww = (w / cols) * 0.42;
  const wh = Math.min(ww * 1.5, (h / rows) * 0.55);
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const t = 1 - (row + 0.5) / rows;
      const cx = x + lean * t + (w * (c + 0.5)) / cols;
      const cy = foot - (h * (row + 0.55)) / rows;
      if (row === 0 && r() < 0.35) continue;
      s.push(rect(cx - ww * 0.95, cy - wh / 2, ww * 0.42, wh, { fill: shut }));
      s.push(rect(cx + ww * 0.53, cy - wh / 2, ww * 0.42, wh, { fill: shut }));
      s.push(rect(cx - ww / 2, cy - wh / 2, ww, wh, { fill: '#2a3a5a', stroke: INK, sw: sw * 0.6 }));
      s.push(rect(cx - ww / 2 + ww * 0.15, cy - wh / 2 + wh * 0.1, ww * 0.25, wh * 0.35, { fill: '#a8d4f0', opacity: 0.7 }));
    }
  }
  return s.join('');
}

/** The Stiftskirche's tower, rising over the roofs. */
function stiftskirche(x: number, base: number): string {
  const s: string[] = [];
  s.push(inked(poly([[x - 16, base], [x - 15, base - 150], [x + 15, base - 150], [x + 16, base]]), '#e8dcc0', 2.4));
  s.push(path(poly([[x + 6, base - 150], [x + 15, base - 150], [x + 16, base], [x + 6, base]]), { fill: '#000000', opacity: 0.14 }));
  // Clock and belfry openings.
  s.push(circle(x, base - 120, 6.5, { fill: '#2a3a6a', stroke: INK, sw: 1.6 }));
  s.push(path(`M${x} ${base - 120}V${base - 124.5}M${x} ${base - 120}L${x + 3} ${base - 119}`, { stroke: '#ffd34a', sw: 1.4 }));
  for (const dx of [-8, 3]) s.push(inked(`M${x + dx} ${base - 138}h5v10h-5z`, '#2a2238', 1.2));
  // Gallery, then the dark slender spire with a little lantern.
  s.push(inked(poly([[x - 19, base - 150], [x + 19, base - 150], [x + 17, base - 156], [x - 17, base - 156]]), '#c8b890', 2));
  s.push(inked(poly([[x - 13, base - 156], [x + 13, base - 156], [x + 7, base - 176], [x - 7, base - 176]]), '#3a3a4a', 2));
  s.push(inked(`M${x - 5} ${base - 176}h10v-10h-10z`, '#4a4a5a', 1.6));
  s.push(inked(poly([[x - 6, base - 186], [x + 6, base - 186], [x, base - 228]]), '#2e2e3e', 2));
  s.push(line([x, base - 228], [x, base - 238], INK, 1.6));
  s.push(circle(x, base - 232, 1.8, { fill: '#ffd34a', stroke: INK, sw: 0.8 }));
  return s.join('');
}

function altstadt(): string {
  const s: string[] = [];
  // Far houses at the bend, small, then the long row above the quay, each
  // nearer one bigger and lower on screen.
  const foot = (x: number) => yAt(NK.quayTop, x) - 4;
  s.push(stiftskirche(712, foot(712) - 40));
  let x = 448;
  let seed = 100;
  while (x < 980) {
    const w = 22 + (x - 448) * 0.17;
    const lean = (rng(seed)() - 0.5) * w * 0.08;
    // The far ones sit behind the bend, on the horizon.
    const f = x < 534 ? 258 : foot(x);
    s.push(house(x, f, w, seed, lean));
    x += w * 0.92;
    seed += 7;
  }
  return s.join('');
}

// ---- the bend: hills, the Hölderlinturm, the willow ---------------------------------

function bend(): string {
  const s: string[] = [];
  s.push(inked(curve([[330, 268], [380, 236], [440, 226], [500, 232], [560, 244], [600, 262]]) + 'Z', '#6aa858', 1.6));
  s.push(path(puff(400, 240, 44, 18, 8, 71, 0.25), { fill: '#4e8a46', stroke: INK, sw: 1.4 }));
  s.push(path(puff(470, 238, 36, 14, 7, 73, 0.25), { fill: '#5e9a4e', stroke: INK, sw: 1.4 }));
  // The Hölderlinturm: a round yellow tower with a pointed grey-blue roof.
  const tx = 372;
  s.push(inked(`M${tx - 12} 266V232Q${tx} 228 ${tx + 12} 232V266Z`, '#f2d27a', 1.8));
  s.push(path(`M${tx + 4} 230V266H${tx + 12}V232Q${tx + 8} 230 ${tx + 4} 230Z`, { fill: '#000000', opacity: 0.15 }));
  s.push(inked(poly([[tx - 15, 233], [tx + 15, 233], [tx, 200]]), '#6a7a9a', 1.8));
  s.push(path(poly([[tx, 200], [tx + 15, 233], [tx + 4, 233]]), { fill: '#000000', opacity: 0.2 }));
  s.push(line([tx, 200], [tx, 193], INK, 1.2));
  for (const [wx, wy] of [[tx - 5, 242], [tx + 4, 242], [tx - 1, 254]] as Pt[]) s.push(rect(wx - 2, wy - 3, 4, 6, { fill: '#2a3a5a', stroke: INK, sw: 0.8 }));
  // Its little garden house next to it.
  s.push(inked(poly([[tx + 14, 266], [tx + 14, 250], [tx + 36, 250], [tx + 36, 266]]), '#f4efe4', 1.4));
  s.push(inked(poly([[tx + 11, 251], [tx + 25, 240], [tx + 39, 251]]), '#b8442a', 1.4));
  // The weeping willow, hanging into the water.
  s.push(inked(`M430 268L428 236`, '#6a5a3a', 3));
  s.push(path(puff(432, 230, 30, 26, 9, 81, 0.22), { fill: '#8ac85a', stroke: INK, sw: 1.6 }));
  for (let i = 0; i < 9; i++) {
    const x = 408 + i * 6;
    s.push(path(`M${x} ${226 + (i % 3) * 3}Q${x - 2} ${248} ${x + 1} ${266 - (i % 2) * 4}`, { stroke: i % 2 ? '#6aa848' : '#a8dc6a', sw: 2.4 }));
  }
  return s.join('');
}

// ---- the quay wall, the hedge, the café ------------------------------------------------

function quay(): string {
  const s: string[] = [];
  const [t0, t1] = NK.quayTop;
  const [f0, f1] = NK.quayFoot;
  s.push(inked(poly([t0, t1, [962, f1[1]], f0]), '#cfc4ae', 2.4));
  // Stone courses, foreshortened.
  for (let k = 1; k < 6; k++) {
    const a = lerp(t0, f0, k / 6);
    const b = lerp(t1, [962, f1[1]], k / 6);
    s.push(line(a, b, '#9a8e78', 1.2, 0.8));
  }
  const r = rng(91);
  for (let i = 0; i < 70; i++) {
    const t = r();
    const k = Math.floor(r() * 6);
    const a = lerp(lerp(t0, f0, k / 6), lerp(t1, [962, f1[1]], k / 6), t);
    const b = lerp(lerp(t0, f0, (k + 1) / 6), lerp(t1, [962, f1[1]], (k + 1) / 6), t);
    s.push(line(a, b, '#9a8e78', 1, 0.7));
  }
  // Damp, mossy band at the waterline.
  s.push(path(poly([lerp(t0, f0, 0.8), lerp(t1, [962, f1[1]], 0.8), [962, f1[1]], f0]), { fill: '#5a7a4a', opacity: 0.45 }));
  // Bushes along the top, the hedge, and the café's terrace.
  const hedge: Pt[] = [];
  for (let x = 540; x <= 970; x += 12) {
    const y = yAt(NK.quayTop, x);
    hedge.push([x, y - 4 - ((x - 540) / 430) * 16 - (Math.sin(x * 0.7) + 1) * 2]);
  }
  s.push(inked(curve(hedge) + `L970 ${yAt(NK.quayTop, 970) + 2}L540 ${yAt(NK.quayTop, 540) + 2}Z`, '#3a8a3a', 2));
  s.push(path(curve(hedge.map(([x, y]) => [x, y + 4] as Pt)), { stroke: '#7ac85a', sw: 3, opacity: 0.8 }));
  for (const [bx, sz, seed] of [[600, 14, 3], [680, 18, 5], [880, 26, 9]] as Array<[number, number, number]>) {
    s.push(path(puff(bx, yAt(NK.quayTop, bx) - sz, sz * 1.2, sz, 5, seed, 0.14), { fill: '#4e9a3e', stroke: INK, sw: 1.6 }));
  }
  // Café: stairs, a red awning, little tables with guests.
  const cx = 776;
  const cy = yAt(NK.quayTop, cx);
  s.push(inked(poly([[cx - 40, cy - 6], [cx + 38, cy - 2], [cx + 38, cy - 30], [cx - 40, cy - 34]]), '#f6efe0', 1.6));
  s.push(inked(wobble([[cx - 52, cy - 44], [cx + 48, cy - 40], [cx + 44, cy - 28], [cx - 48, cy - 32]], { seed: 5, wobble: 1 }), '#d83a2a', 2));
  for (let i = 0; i < 8; i++) {
    const x = cx - 48 + i * 12;
    s.push(path(`M${x} ${cy - 32 + i * 0.5}q6 6 12 0`, { fill: i % 2 ? '#d83a2a' : '#f6efe0', stroke: INK, sw: 1.2 }));
  }
  for (const [px, col] of [[cx - 26, '#2a6aaa'], [cx - 6, '#f0a030'], [cx + 18, '#9a3aa8']] as Array<[number, string]>) {
    s.push(circle(px, cy - 22, 3, { fill: '#f2c39c', stroke: INK, sw: 0.9 }));
    s.push(inked(`M${px - 3} ${cy - 19}h6v7h-6z`, col, 0.9));
  }
  s.push(inked(`M${cx + 40} ${cy}L${cx + 60} ${cy + 26}`, '#9a9aa8', 2));
  return s.join('');
}

// ---- the river -----------------------------------------------------------------------

function river(): string {
  const s: string[] = [];
  const [l0, l1] = NK.bankL;
  const [f0, f1] = NK.quayFoot;
  const water = [l0, f0, [962, f1[1]], [962, 452], [-2, 452], [-2, l1[1]]] as Pt[];
  s.push(path(poly(water), { fill: 'url(#nkWater)' }));
  // Reflections: the coloured houses as soft vertical smears under the quay,
  // the willow's green, the clouds.
  const r = rng(61);
  for (let x = 560; x < 960; x += 16) {
    const y = yAt(NK.quayFoot, x);
    const col = WALLS[Math.floor(r() * WALLS.length)];
    s.push(path(`M${x} ${y + 2}h${10 + r() * 6}l-2 ${20 + (x - 560) * 0.1}h-${8 + r() * 6}z`, { fill: col, opacity: 0.32 }));
  }
  s.push(path(puff(430, 276, 26, 9, 7, 83, 0.2), { fill: '#7ab84a', opacity: 0.4 }));
  s.push(ellipse(560, 300, 90, 14, { fill: '#ffffff', opacity: 0.22 }));
  s.push(ellipse(700, 340, 120, 12, { fill: '#ffffff', opacity: 0.16 }));
  // Ripples: short light strokes, longer and further apart as they come close.
  for (let i = 0; i < 90; i++) {
    const t = r();
    const y = NK.far + 4 + t * t * 110;
    const span = 0.2 + t * 0.8;
    const xl = Math.max(0, xAt(NK.bankL, y));
    const xr = xAt(NK.quayFoot, y);
    const x = xl + r() * Math.max(0, Math.min(960, xr) - xl);
    const len = 4 + span * 22;
    s.push(path(`M${x} ${y}q${len / 2} ${-1.2 - span} ${len} 0`, { stroke: r() < 0.7 ? '#e6f6ff' : '#2a6a6a', sw: 0.8 + span * 1.4, opacity: 0.55 }));
  }
  return s.join('');
}

// ---- the left bank: the Platanenallee -----------------------------------------------------

function plane(x: number, base: number, h: number, w: number): string {
  // A plane tree's trunk: mottled grey, olive and cream patches.
  const s: string[] = [];
  s.push(inked(`M${x - w} ${base}Q${x - w * 0.7} ${base - h * 0.5} ${x - w * 0.5} ${base - h}L${x + w * 0.5} ${base - h}Q${x + w * 0.7} ${base - h * 0.5} ${x + w} ${base}Z`, '#b8b098', Math.max(1.2, w / 6)));
  const r = rng(Math.round(x * 3 + base));
  for (let i = 0; i < 6; i++) {
    const py = base - r() * h * 0.9;
    s.push(ellipse(x + (r() - 0.5) * w, py, w * 0.3, w * 0.5, { fill: r() < 0.5 ? '#7a7a5a' : '#e8e2c8', opacity: 0.8 }));
  }
  return s.join('');
}

function leftBank(): string {
  const s: string[] = [];
  const [l0, l1] = NK.bankL;
  // The grassy bank down to the water, the gravel path above it.
  s.push(inked(poly([[-4, 300], [350, 254], [l0[0] + 4, l0[1]], [l1[0] - 4, l1[1] + 2]]), '#5aa84a', 2));
  s.push(path(poly([[-4, 330], [l1[0], l1[1]], [l0[0], l0[1]], [320, 262]]), { fill: '#3e8a3a', opacity: 0.55 }));
  s.push(inked(poly([[-4, 300], [340, 254], [352, 258], [-4, 318]]), '#e2d2a8', 1.6));
  // Walkers on the path, small and far.
  const r = rng(17);
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 34 + r() * 10;
    const y = 312 - (x / 340) * 52;
    const k = 0.4 + (1 - x / 340) * 0.7;
    const col = ['#2a5aaa', '#d83a5a', '#f0f0f0', '#3a3a4a', '#f0a030'][i % 5];
    s.push(inked(`M${x - 3 * k} ${y}l1 ${-12 * k}h${4 * k}l1 ${12 * k}z`, '#3a3a4a', 0.8));
    s.push(inked(`M${x - 4 * k} ${y - 11 * k}h${8 * k}l-1 ${-11 * k}h${-6 * k}z`, col, 0.8));
    s.push(circle(x, y - 25 * k, 3.4 * k, { fill: '#f2c39c', stroke: INK, sw: 0.8 }));
  }
  // The avenue: trunks along the path, nearest biggest.
  for (const [x, h, w] of [[330, 70, 4], [292, 86, 5], [246, 104, 6], [188, 132, 8], [118, 170, 11], [30, 230, 15]] as Array<[number, number, number]>) {
    s.push(plane(x, 300 - (x / 340) * 46 + 4, h, w));
  }
  // The canopy: huge, layered green puffs filling the top left.
  const greens = ['#2e6a2e', '#3e8a3a', '#5aa848', '#7ac85a'];
  const blobs: Array<[number, number, number, number, number]> = [
    [120, 40, 200, 120, 0], [300, 90, 110, 90, 0], [40, 180, 120, 110, 0], [250, 180, 110, 70, 1],
    [140, 120, 150, 110, 1], [330, 170, 70, 50, 1], [70, 60, 120, 70, 2], [230, 70, 90, 60, 2],
    [130, 210, 90, 50, 2], [180, 30, 80, 40, 3], [60, 140, 60, 40, 3], [300, 130, 50, 30, 3],
  ];
  blobs.forEach(([cx, cy, rx, ry, g], i) => {
    s.push(path(puff(cx, cy, rx, ry, 7 + (i % 3), 200 + i, 0.13), { fill: greens[g], stroke: g < 2 ? INK : 'none', sw: 2.4 }));
  });
  // A big fern-like bush at the water.
  for (let i = 0; i < 9; i++) {
    const a = -2.6 + i * 0.3;
    s.push(path(`M150 330Q${150 + Math.cos(a) * 30} ${330 + Math.sin(a) * 40} ${150 + Math.cos(a) * 52} ${330 + Math.sin(a) * 56}`, { stroke: i % 2 ? '#3a7a5a' : '#6aa87a', sw: 7 }));
  }
  s.push(path(puff(232, 300, 26, 14, 5, 31, 0.15), { fill: '#4e9a3e', stroke: INK, sw: 1.6 }));
  // Reeds at the water's edge.
  for (let i = 0; i < 14; i++) {
    const x = 196 + i * 12;
    const y = yAt(NK.bankL, x) + 2;
    s.push(path(`M${x} ${y}q-2 -10 ${i % 2 ? 3 : -3} -18`, { stroke: '#7aa84a', sw: 2 }));
  }
  return s.join('');
}

// ---- the jetty, the steps, the bridge deck ---------------------------------------------------

function jetty(): string {
  const s: string[] = [];
  const [a, b, c, d] = NK.jetty;
  for (const x of [20, 70, 120, 168]) s.push(inked(`M${x - 3} 360v16h6v-16z`, '#5a3a22', 1.4));
  s.push(inked(poly([a, b, c, d]), '#b07a42', 2.4));
  for (let k = 1; k < 4; k++) s.push(line(lerp(a, d, k / 4), lerp(b, c, k / 4), '#6a4422', 1.2));
  s.push(inked(poly([d, c, [196, 373], [0, 377]]), '#7a5028', 2));
  // A mooring post with a rope.
  s.push(inked('M176 330v22h7v-22z', '#6a4422', 1.6));
  s.push(path('M176 336q-14 10 -8 16', { stroke: '#e8d8a8', sw: 2 }));
  return s.join('');
}

function steps(): string {
  const { x0, x1 } = NK.gap;
  const s: string[] = [];
  // Treads going down away from us, onto the jetty.
  s.push(rect(x0, 366, x1 - x0, 50, { fill: '#9a7a62' }));
  for (let k = 0; k < 6; k++) {
    const y = 368 + k * 8;
    s.push(rect(x0 + 2, y, x1 - x0 - 4, 5, { fill: k % 2 ? '#c8a888' : '#d8b898', stroke: INK, sw: 1.2 }));
  }
  return s.join('');
}

function deck(): string {
  const s: string[] = [];
  s.push(inked(poly([[-4, 408], [964, 408], [964, 454], [-4, 454]]), '#a8a098', 2.4));
  s.push(rect(-4, 408, 968, 8, { fill: '#c8beb0', stroke: INK, sw: 1.6 }));
  // Paving slabs.
  const r = rng(29);
  for (let y = 424; y < 450; y += 14) {
    s.push(line([0, y], [960, y], '#7a7268', 1.2, 0.8));
    for (let x = (y / 14) % 2 ? 0 : 30; x < 960; x += 60 + r() * 20) s.push(line([x, y], [x - 4, y + 14], '#7a7268', 1.2, 0.8));
  }
  return s.join('');
}

/** Static backdrop: everything behind the balustrade, plus the deck. */
export function neckarBg(): string {
  return [
    defs(
      grainDefs(53),
      linear('nkSky', 0, 0, 0, 280, [
        [0, RIVER.sky0],
        [1, RIVER.sky1],
      ]),
      linear('nkWater', 0, NK.far, 0, 380, [
        [0, RIVER.far],
        [0.45, '#5aa8a8'],
        [1, RIVER.near],
      ])
    ),
    sky(),
    bend(),
    altstadt(),
    quay(),
    river(),
    leftBank(),
    jetty(),
    steps(),
    deck(),
    vignette('nkVig', 960, 450, 0.22, '#1e2a40'),
    grainOverlay(960, 450, 0.3, 0.22),
  ].join('');
}

/** The sandstone balustrade (an occluder) with the gap for the steps, and
 *  an old street lamp. Drawn in room coordinates. */
export function balustrade(): string {
  const { x0, x1 } = NK.gap;
  const top = NK.parapetTop;
  const s: string[] = [];
  const stone = '#c89a78';
  const stoneDark = '#9a6a52';
  const run = (a: number, b: number) => {
    // Coping, balusters, plinth.
    s.push(inked(poly([[a, top + 26], [b, top + 26], [b, NK.parapetBase], [a, NK.parapetBase]]), stoneDark, 2.4));
    for (let x = a + 12; x < b - 6; x += 18) {
      s.push(inked(`M${x - 4} ${top + 13}Q${x - 8} ${top + 20} ${x - 3} ${top + 27}h6Q${x + 8} ${top + 20} ${x + 4} ${top + 13}Z`, stone, 1.6));
    }
    s.push(inked(poly([[a - 2, top], [b + 2, top], [b + 2, top + 13], [a - 2, top + 13]]), '#dcb08c', 2.4));
    s.push(path(`M${a} ${top + 3}H${b}`, { stroke: '#f2d2b0', sw: 2, opacity: 0.8 }));
  };
  run(-6, x0);
  run(x1, 966);
  // Pillars either side of the gap.
  for (const px of [x0 - 6, x1 - 6]) {
    s.push(inked(poly([[px, top - 10], [px + 18, top - 10], [px + 18, NK.parapetBase], [px, NK.parapetBase]]), stone, 2.4));
    s.push(inked(poly([[px - 3, top - 16], [px + 21, top - 16], [px + 21, top - 9], [px - 3, top - 9]]), '#dcb08c', 2));
  }
  // The street lamp on the right.
  const lx = 862;
  s.push(inked(`M${lx - 7} ${top + 2}h14l-3 -14h-8z`, '#2a3a3a', 2));
  s.push(inked(`M${lx - 3} ${top - 12}L${lx - 2} ${top - 170}h4L${lx + 3} ${top - 12}Z`, '#2a3a3a', 2));
  s.push(inked(`M${lx} ${top - 170}q0 -14 18 -14`, 'none', 3));
  s.push(path(`M${lx} ${top - 170}q0 -14 18 -14`, { stroke: '#3a4a4a', sw: 1.6 }));
  s.push(inked(`M${lx + 10} ${top - 184}h16l-3 -14h-10z`, '#3a4a4a', 1.8));
  s.push(inked(`M${lx + 12} ${top - 184}l2 10h8l2 -10z`, '#fff4c0', 1.4));
  return s.join('');
}

// ---- the punt and its Burschenschaftler ----------------------------------------------------

/** Frame of the punt actor: 220×120, waterline at y=104, bow to the right. */
export const PUNT_W = 220;
export const PUNT_H = 120;
const WL = 104;

const SKIN = '#f2c39c';
const CAP = '#2f7a3a';
const SASH = ['#2f7a3a', '#ffffff', '#c43a2a'];

/** The corps cap: a small flat green cylinder with the colours round its
 *  band and a tiny black peak. */
function couleurCap(x: number, y: number, k = 1, tilt = -8): string {
  return group(
    [
      inked(`M${-8 * k} 0L${-7 * k} ${-6 * k}H${7 * k}L${8 * k} 0Z`, CAP, 1.4),
      path(`M${-8 * k} ${-1.5 * k}H${8 * k}`, { stroke: SASH[1], sw: 1.2 * k }),
      path(`M${-8 * k} ${-3 * k}H${8 * k}`, { stroke: SASH[2], sw: 1.2 * k }),
      ellipse(0, -6 * k, 7 * k, 1.8 * k, { fill: '#3e9a4a', stroke: INK, sw: 1.2 }),
      inked(`M${2 * k} 0q${6 * k} 0 ${8 * k} ${2.5 * k}h${-8 * k}z`, '#1a1a1a', 1),
    ],
    `translate(${x} ${y}) rotate(${tilt})`
  );
}

type Arms = 'pole' | 'mug' | 'mugUp' | 'rest' | 'up' | 'wave';
type Mouth = 'smile' | 'open' | 'o';

/** A Bursche: navy blazer, white shirt, the sash across the chest, a corps
 *  cap. (hx, hy) is the hip; seated ones put their legs forward. */
function bursche(hx: number, hy: number, o: { seated: boolean; arms: Arms; mouth: Mouth; f: number; pole?: [Pt, Pt]; dir?: 1 | -1 }): string {
  const s: string[] = [];
  const dir = o.dir ?? 1;
  const sh: Pt = [hx, hy - 22];
  // Legs.
  if (o.seated) {
    s.push(path(`M${hx - 2} ${hy}h${12 * dir}v12`, { stroke: INK, sw: 6.5 }));
    s.push(path(`M${hx - 2} ${hy}h${12 * dir}v12`, { stroke: '#d8d0b8', sw: 4 }));
  } else {
    for (const dx of [-3, 3]) {
      s.push(path(`M${hx + dx} ${hy}L${hx + dx * 1.6} ${hy + 22}`, { stroke: INK, sw: 6.5 }));
      s.push(path(`M${hx + dx} ${hy}L${hx + dx * 1.6} ${hy + 22}`, { stroke: '#d8d0b8', sw: 4 }));
      s.push(ellipse(hx + dx * 1.6 + 1.5, hy + 23, 3.6, 2, { fill: '#3a2418', stroke: INK, sw: 1 }));
    }
  }
  // Torso: blazer over a white shirt, the sash.
  s.push(inked(`M${hx - 8} ${hy + 1}L${hx - 9} ${hy - 18}Q${hx} ${hy - 25} ${hx + 9} ${hy - 18}L${hx + 8} ${hy + 1}Z`, '#24305a', 1.8));
  s.push(path(`M${hx - 3} ${hy - 21}L${hx} ${hy - 12}L${hx + 3} ${hy - 21}Z`, { fill: '#ffffff' }));
  SASH.forEach((c, i) => s.push(path(`M${hx - 8} ${hy - 19 + i * 1.6}L${hx + 7} ${hy - 4 + i * 1.6}`, { stroke: c, sw: 1.7 })));
  // Arms.
  const hands: Pt[] = [];
  const shL: Pt = [sh[0] - 7, sh[1] + 2];
  const shR: Pt = [sh[0] + 7, sh[1] + 2];
  const lift = Math.sin((o.f / 4) * Math.PI * 2) * 2;
  switch (o.arms) {
    case 'pole': {
      const [b, t] = o.pole!;
      const at = (y: number): Pt => [b[0] + ((y - b[1]) / (t[1] - b[1])) * (t[0] - b[0]), y];
      hands.push(at(sh[1] - 4), at(sh[1] + 12));
      break;
    }
    case 'mug':
      hands.push([shL[0] - 2, hy - 4], [shR[0] + 8 * dir, sh[1] + 4 + lift]);
      break;
    case 'mugUp':
      hands.push([shL[0] - 2, hy - 4], [shR[0] + 4 * dir, sh[1] - 14]);
      break;
    case 'rest':
      hands.push([shL[0] - 1, hy - 2], [shR[0] + 1, hy - 2]);
      break;
    case 'up':
      hands.push([shL[0] - 6, sh[1] - 18 + lift], [shR[0] + 6, sh[1] - 18 - lift]);
      break;
    case 'wave':
      hands.push([shL[0] - 8, sh[1] - 16 - lift * 2], [shR[0] + 9, sh[1] - 15 + lift * 2]);
      break;
  }
  [shL, shR].forEach((p, i) => {
    s.push(path(`M${p[0]} ${p[1]}L${hands[i][0]} ${hands[i][1]}`, { stroke: INK, sw: 5.6 }));
    s.push(path(`M${p[0]} ${p[1]}L${hands[i][0]} ${hands[i][1]}`, { stroke: '#24305a', sw: 3.4 }));
    s.push(circle(hands[i][0], hands[i][1], 2.4, { fill: SKIN, stroke: INK, sw: 1 }));
  });
  if (o.arms === 'mug' || o.arms === 'mugUp') {
    const [mx, my] = hands[1];
    s.push(inked(`M${mx - 3} ${my - 7}h7v9h-7z`, '#f6c23a', 1.2));
    s.push(rect(mx - 3, my - 9, 7, 3, { fill: '#ffffff', stroke: INK, sw: 1 }));
  }
  // Head: round, pink-cheeked, with the cap.
  const [cx, cy] = [hx + dir, hy - 32];
  s.push(circle(cx, cy, 8.5, { fill: SKIN, stroke: INK, sw: 1.6 }));
  s.push(circle(cx - 4.5, cy + 3, 2, { fill: '#ff8a8a', opacity: 0.6 }));
  s.push(circle(cx + 4.5, cy + 3, 2, { fill: '#ff8a8a', opacity: 0.6 }));
  if (o.mouth === 'o') {
    s.push(ellipse(cx - 3, cy - 1, 1.8, 2.4, { fill: '#ffffff', stroke: INK, sw: 0.8 }));
    s.push(ellipse(cx + 3, cy - 1, 1.8, 2.4, { fill: '#ffffff', stroke: INK, sw: 0.8 }));
    s.push(ellipse(cx, cy + 4.5, 2, 2.6, { fill: '#5a1a1a', stroke: INK, sw: 0.8 }));
  } else {
    s.push(circle(cx - 3, cy - 1, 1.1, { fill: INK }));
    s.push(circle(cx + 3, cy - 1, 1.1, { fill: INK }));
    s.push(
      o.mouth === 'open'
        ? path(`M${cx - 3} ${cy + 3}Q${cx} ${cy + 8} ${cx + 3} ${cy + 3}Z`, { fill: '#5a1a1a', stroke: INK, sw: 0.9 })
        : path(`M${cx - 3} ${cy + 3.5}Q${cx} ${cy + 6} ${cx + 3} ${cy + 3.5}`, { stroke: INK, sw: 1.1 })
    );
  }
  s.push(couleurCap(cx + 0.5, cy - 6.5, 1, -10 * dir));
  return s.join('');
}

function hull(holes: boolean): string {
  const s: string[] = [];
  // Flat-bottomed punt: the deck at the stern, the long well, square ends.
  s.push(inked(poly([[6, 90], [214, 88], [208, WL + 2], [14, WL + 2]]), '#8a5a2a', 2.4));
  s.push(path(poly([[10, 90], [212, 88], [211, 93], [11, 95]]), { fill: '#c08a4a' }));
  for (const y of [97, 101]) s.push(line([12, y], [210, y - 1], '#5a3a1a', 1));
  // Inside: cushions and the beer crate.
  s.push(inked('M66 89h56v-5h-56z', '#c43a2a', 1.2));
  s.push(inked('M174 88v-14h22v14z', '#c43a2a', 1.4));
  for (const x of [178, 184, 190]) s.push(inked(`M${x} 74v-8h3v8z`, '#4a2a10', 0.8));
  // The pennant at the bow.
  s.push(line([206, 88], [206, 48], '#5a3a1a', 2));
  s.push(path('M206 48l18 5l-18 5z', { fill: SASH[0], stroke: INK, sw: 1 }));
  s.push(path('M206 51.5l12 3.4', { stroke: SASH[1], sw: 1.4 }));
  s.push(path('M206 54.6l8 2.2', { stroke: SASH[2], sw: 1.2 }));
  if (holes) {
    const r = rng(7);
    for (let i = 0; i < 14; i++) {
      const x = 16 + r() * 190;
      const y = 92 + r() * 12;
      s.push(circle(x, y, 1.4 + r() * 1.2, { fill: '#2a140a' }));
    }
    // Hungry worms poking out, and sawdust.
    for (const [x, y] of [[48, 93], [118, 96], [160, 92], [196, 97]] as Pt[]) {
      s.push(path(`M${x} ${y}q3 -5 6 -2q2 2 4 -1`, { stroke: '#f0a0b8', sw: 2.4 }));
      s.push(circle(x + 10, y - 1, 1.2, { fill: INK }));
    }
    for (let i = 0; i < 10; i++) s.push(circle(20 + r() * 180, 86 - r() * 10, 1, { fill: '#e8c890' }));
  }
  return s.join('');
}

/** Water painted over the frame's bottom, up to `level` (y in frame px). */
function waterOver(level: number, f: number): string {
  const pts: Pt[] = [];
  for (let x = -4; x <= PUNT_W + 4; x += 11) pts.push([x, level + Math.sin(x * 0.18 + f * 1.7) * 1.6]);
  return (
    path(curve(pts) + `L${PUNT_W + 4} ${PUNT_H + 2}L-4 ${PUNT_H + 2}Z`, { fill: RIVER.around }) +
    path(curve(pts), { stroke: '#d8f2f4', sw: 1.6, opacity: 0.85 })
  );
}

/** The bow wave and a little wake around the waterline. */
function wake(f: number): string {
  return (
    ellipse(110, WL + 3, 112, 5, { fill: RIVER.around }) +
    path(`M${8 - f} ${WL + 2}q-10 2 -6 5M214 ${WL}q8 2 4 6`, { stroke: '#e6f6ff', sw: 1.6, opacity: 0.8 }) +
    path(`M30 ${WL + 5}h${30 + f * 3}M120 ${WL + 6}h${24 - f * 2}`, { stroke: '#e6f6ff', sw: 1.2, opacity: 0.6 })
  );
}

interface PuntPose {
  arms: [Arms, Arms, Arms];
  mouths: [Mouth, Mouth, Mouth];
  holes?: boolean;
  sink?: number;
}

function puntFrame(f: number, p: PuntPose): string {
  const sink = p.sink ?? 0;
  const s: string[] = [];
  // The pole: pushed into the riverbed behind the stern, swinging with the stroke.
  const swing = [0, 6, 10, 4][f % 4];
  const pole: [Pt, Pt] = p.arms[0] === 'pole' ? [[4 - swing, WL + 30], [44 + swing * 0.4, 2]] : [[30, WL + 30], [30, -10]];
  const boat: string[] = [];
  boat.push(line(pole[0], pole[1], '#c8a060', 3.4));
  boat.push(line(pole[0], pole[1], INK, 0.8, 0.6));
  boat.push(hull(!!p.holes));
  boat.push(bursche(30, 66, { seated: false, arms: p.arms[0], mouth: p.mouths[0], f, pole, dir: 1 }));
  boat.push(bursche(92, 86, { seated: true, arms: p.arms[1], mouth: p.mouths[1], f, dir: 1 }));
  boat.push(bursche(152, 86, { seated: true, arms: p.arms[2], mouth: p.mouths[2], f: f + 2, dir: -1 }));
  if (sink === 0) s.push(wake(f % 4));
  s.push(group(boat, sink ? `translate(0 ${sink})` : undefined));
  if (sink) s.push(waterOver(WL - 6, f));
  return s.join('');
}

/** After it went down: rings and bubbles where the punt was. */
function goneFrame(f: number): string {
  const s: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = 20 + ((f * 10 + i * 26) % 70);
    s.push(ellipse(110, WL - 4, r, r * 0.16, { stroke: '#e6f6ff', sw: 1.6, opacity: Math.max(0, 0.9 - r / 90) }));
  }
  for (const [x, y, rr] of [[96, WL - 8 - f * 3, 3], [120, WL - 14 + f * 2, 2.2], [108, WL - 20 - f, 1.6]] as Array<[number, number, number]>) {
    s.push(circle(x, y, rr, { stroke: '#e6f6ff', sw: 1.2 }));
  }
  return s.join('');
}

function puntDraw(_variant: ActorVariant, pose: string, f: number): string {
  switch (pose) {
    case 'talk':
      return puntFrame(f, { arms: ['pole', f % 2 ? 'wave' : 'mug', 'mug'], mouths: ['smile', f % 2 ? 'open' : 'smile', f % 2 ? 'smile' : 'open'] });
    case 'panic':
      return puntFrame(f, { arms: ['up', 'up', 'up'], mouths: ['o', 'o', 'o'], holes: true });
    case 'sink1':
      return puntFrame(f, { arms: ['up', 'up', 'wave'], mouths: ['o', 'o', 'o'], holes: true, sink: 14 });
    case 'sink2':
      return puntFrame(f, { arms: ['wave', 'up', 'up'], mouths: ['o', 'open', 'o'], holes: true, sink: 36 });
    case 'sink3':
      return puntFrame(f, { arms: ['up', 'up', 'up'], mouths: ['o', 'o', 'o'], holes: true, sink: 62 });
    case 'gone':
      return goneFrame(f);
    default:
      // idle / walk: poling along, the others toasting.
      return puntFrame(f, { arms: ['pole', f === 2 ? 'mugUp' : 'mug', f === 0 ? 'mugUp' : 'mug'], mouths: ['smile', f === 2 ? 'open' : 'smile', 'smile'] });
  }
}

export const PUNT_ACTOR: SvgActorAsset = {
  key: 'punt',
  width: PUNT_W,
  height: PUNT_H,
  poses: {
    idle: { frames: 4, frameRate: 2.5 },
    walk: { frames: 4, frameRate: 2.5 },
    talk: { frames: 2, frameRate: 4 },
    panic: { frames: 2, frameRate: 6 },
    sink1: { frames: 2, frameRate: 5 },
    sink2: { frames: 2, frameRate: 5 },
    sink3: { frames: 2, frameRate: 5 },
    gone: { frames: 4, frameRate: 4 },
  },
  draw: puntDraw,
};

// ---- loose props -------------------------------------------------------------------

/** The cap that floats ashore (drawn around its own centre, 40×24 box). */
export function floatingCap(): string {
  return ellipse(20, 18, 17, 4, { fill: '#e6f6ff', opacity: 0.5 }) + couleurCap(20, 18, 1.6, -14);
}

/** The worm-eaten chair leg, in flight (36×14, centred). */
export function flyingLeg(): string {
  return group(
    [
      inked('M2 7Q2 3 6 4L30 5Q34 5 34 7Q34 9 30 9L6 10Q2 11 2 7Z', '#b07a3a', 1.6),
      ...[9, 15, 21, 27].map((x) => circle(x, 7, 0.9, { fill: '#2a140a' })),
    ].join('')
  );
}
