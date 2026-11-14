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
  text,
  type Pt,
} from '../../game/art/toon';

/**
 * The Neckarfront in Tübingen at sunset, seen from the Neckarbrücke: the
 * Altstadt's gabled houses run along the quay wall from the big corner
 * house close by on the right into the distance on the left, where the
 * river comes round the bend — right there the sun is about to go down. Behind the roofs the
 * Stiftskirche and, on the hill, the Schloss; on the far left the dark
 * trees of the Neckarinsel. In the foreground the bridge's sandstone
 * balustrade. Halfway along, the Hölderlinturm stands in the water in
 * front of the wall; a promenade runs along the top of the wall to it,
 * with stairs down to a jetty at its foot.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

/** Shared geometry: the room and its art must agree on these. */
export const NK = {
  /** Where the river vanishes round the bend (the horizon). */
  far: 244,
  /** The setting sun, over the bend. */
  sun: [120, 226] as Pt,
  /** Left water edge (the Neckarinsel), far → near. */
  bankL: [[150, 244], [0, 304]] as [Pt, Pt],
  /** Foot of the quay wall (the waterline), far → near. */
  quayFoot: [[246, 250], [960, 404]] as [Pt, Pt],
  /** Top of the quay wall, far → near. */
  quayTop: [[250, 236], [960, 300]] as [Pt, Pt],
  /** The balustrade: coping top, baseline (occluder), and the gap with the steps. */
  parapetTop: 372,
  parapetBase: 408,
  /** The promenade on top of the quay wall runs from the corner house (x1)
   *  to the Hölderlinturm (x0); the houses stand back from the edge by promGap(x). */
  prom: { x0: 480, x1: 742 },
  /** The Hölderlinturm, standing in the water in front of the wall: centre x, waterline y. */
  turm: { x: 440, base: 298 },
  /** The jetty next to it, along the foot of the wall (back edge first), and
   *  the stairs down the wall to it: x of their top / bottom ends. */
  jetty: [[466, 298], [546, 316], [541, 328], [460, 308]] as Pt[],
  stairs: { top: [512, 526], bottom: [486, 500] } as { top: Pt; bottom: Pt },
  /** The corner house at the bridge, as its own occluder layer. */
  eckhaus: { x: 736, y: 0, w: 224, h: 410 },
};

/** y of the quay wall's top edge / its waterline at x, and how far the
 *  houses stand back from the edge there (the promenade's width). */
export const quayTopY = (x: number) => yAt(NK.quayTop, x);
export const quayFootY = (x: number) => yAt(NK.quayFoot, x);
export const promGap = (x: number) => 5 + Math.max(0, x - 250) * 0.032;

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** y of a straight edge at x. */
const yAt = (e: [Pt, Pt], x: number) => e[0][1] + ((x - e[0][0]) / (e[1][0] - e[0][0])) * (e[1][1] - e[0][1]);
/** x of a straight edge at y. */
const xAt = (e: [Pt, Pt], y: number) => e[0][0] + ((y - e[0][1]) / (e[1][1] - e[0][1])) * (e[1][0] - e[0][0]);

// ---- sky: Abendrot -------------------------------------------------------------------

/** A long cloud band, purple above, glowing where the low sun hits it from below. */
export function band(x0: number, x1: number, y: number, th: number, seed: number): string {
  const r = rng(seed);
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = x0 + (x1 - x0) * t;
    const k = Math.sin(t * Math.PI);
    top.push([x, y - th * k * (0.6 + r() * 0.5)]);
    bot.push([x, y + th * 0.45 * k * (0.5 + r() * 0.6)]);
  }
  const under = curve(bot);
  return (
    path(curve(top) + poly([...bot].reverse(), false).replace('M', 'L') + 'Z', { fill: '#6a4a8a', opacity: 0.9 }) +
    path(under, { stroke: '#ff8a5a', sw: Math.max(2, th * 0.22), opacity: 0.9 }) +
    path(curve(bot.map(([x, yy]) => [x, yy - th * 0.22] as Pt)), { stroke: '#e85a7a', sw: Math.max(2, th * 0.2), opacity: 0.55 })
  );
}

function sky(): string {
  const [sx, sy] = NK.sun;
  return [
    rect(0, 0, 960, 300, { fill: 'url(#nkSky)' }),
    ...([[70, 22], [210, 40], [330, 16], [520, 30]] as Pt[]).map(([x, y]) => circle(x, y, 1.2, { fill: '#fff6d8', opacity: 0.8 })),
    glow('nkSunGlow', sx, sy, 330, '#ffd27a', 0.75, 200),
    band(360, 990, 44, 26, 3),
    band(20, 540, 82, 22, 5),
    band(220, 760, 132, 15, 7),
    band(-40, 330, 168, 11, 9),
    band(130, 470, 198, 7, 11),
    circle(sx, sy, 25, { fill: '#fff3c0' }),
    circle(sx, sy, 25, { stroke: '#ffb04a', sw: 2.4, opacity: 0.8 }),
    // Swallows on their last round.
    ...([[300, 104, 5], [322, 96, 4], [348, 108, 4], [596, 20, 5]] as Array<[number, number, number]>).map(([x, y, k]) =>
      path(`M${x - k} ${y - k * 0.5}Q${x - k * 0.4} ${y - k * 0.8} ${x} ${y}Q${x + k * 0.4} ${y - k * 0.8} ${x + k} ${y - k * 0.5}`, { stroke: '#2a1e40', sw: 1.6 })
    ),
  ].join('');
}

// ---- the Altstadt --------------------------------------------------------------------

const WALLS = ['#e8b060', '#dccac4', '#cf8f88', '#e39a58', '#b9b89c', '#d9a79c', '#a8705a', '#c4b8c8'];
const SHUTTERS = ['#2f6a4a', '#8a2f2a', '#2f6a4a', '#34507a'];
const LIT = '#ffd870';
const DARK_PANE = '#3a3258';

/** One gabled town house standing on `foot` at x, `w` wide, in evening
 *  light: warm on its left edge, some windows already lit. */
function house(x: number, foot: number, w: number, seed: number, lean = 0): string {
  const r = rng(seed);
  const wall = WALLS[Math.floor(r() * WALLS.length)];
  const shut = SHUTTERS[Math.floor(r() * SHUTTERS.length)];
  const h = w * (1.2 + r() * 0.5);
  const roofH = w * (0.55 + r() * 0.25);
  const top = foot - h;
  const s: string[] = [];
  const sw = Math.max(1.2, w / 40);
  s.push(inked(wobble([[x + lean, top], [x + w + lean, top], [x + w, foot], [x, foot]], { seed, wobble: w / 60 }), wall, sw));
  // Evening light: the low sun warms the left edge, the right falls into violet shade.
  s.push(path(poly([[x + lean, top], [x + w * 0.16 + lean, top], [x + w * 0.16, foot], [x, foot]]), { fill: '#ffb45a', opacity: 0.3 }));
  s.push(path(poly([[x + w * 0.62 + lean, top], [x + w + lean, top], [x + w, foot], [x + w * 0.62, foot]]), { fill: '#3a2058', opacity: 0.22 }));
  if (r() < 0.4) {
    const beam = '#5a3028';
    for (let k = 1; k < 3; k++) s.push(line([x + lean * (1 - k / 3), top + (h * k) / 3], [x + w + lean * (1 - k / 3), top + (h * k) / 3], beam, sw * 1.1));
    s.push(line([x + lean, top], [x + w * 0.5, top + h / 3], beam, sw * 0.9));
    s.push(line([x + w + lean, top], [x + w * 0.5, top + h / 3], beam, sw * 0.9));
  }
  // The gable itself (wall colour), under a dusky roof seen edge-on.
  const apex: Pt = [x + w * 0.5 + lean, top - roofH];
  s.push(inked(poly([[x - w * 0.06 + lean, top + 1], apex, [x + w * 1.06 + lean, top + 1]]), r() < 0.5 ? '#5e3a54' : '#6e3c44', sw));
  s.push(path(poly([apex, [x + w * 1.06 + lean, top + 1], [x + w * 0.56 + lean, top + 1]]), { fill: '#1e1038', opacity: 0.3 }));
  s.push(line([x - w * 0.06 + lean, top + 1], apex, '#ff9a5a', sw * 0.9, 0.7));
  // Windows with shutters; some are lit.
  const cols = w > 60 ? 4 : w > 36 ? 3 : 2;
  const rows = Math.max(2, Math.round(h / (w * 0.42)));
  const ww = (w / cols) * 0.42;
  const wh = Math.min(ww * 1.5, (h / rows) * 0.55);
  if (w > 30) {
    const lit = r() < 0.5;
    s.push(rect(apex[0] - ww * 0.45, top - roofH * 0.42, ww * 0.9, wh * 0.8, { fill: lit ? LIT : DARK_PANE, stroke: INK, sw: sw * 0.6 }));
  }
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const t = 1 - (row + 0.5) / rows;
      const cx = x + lean * t + (w * (c + 0.5)) / cols;
      const cy = foot - (h * (row + 0.55)) / rows;
      const lit = r() < 0.3;
      if (row === 0 && r() < 0.3) continue;
      s.push(rect(cx - ww * 0.95, cy - wh / 2, ww * 0.42, wh, { fill: shut }));
      s.push(rect(cx + ww * 0.53, cy - wh / 2, ww * 0.42, wh, { fill: shut }));
      if (lit) s.push(rect(cx - ww * 0.8, cy - wh * 0.75, ww * 1.6, wh * 1.5, { fill: LIT, opacity: 0.22 }, ww * 0.4));
      s.push(rect(cx - ww / 2, cy - wh / 2, ww, wh, { fill: lit ? LIT : DARK_PANE, stroke: INK, sw: sw * 0.6 }));
      if (lit) s.push(path(`M${cx} ${cy - wh / 2}V${cy + wh / 2}M${cx - ww / 2} ${cy}H${cx + ww / 2}`, { stroke: '#a8742a', sw: sw * 0.5 }));
      else s.push(rect(cx - ww / 2 + ww * 0.15, cy - wh / 2 + wh * 0.1, ww * 0.25, wh * 0.35, { fill: '#ff9a6a', opacity: 0.55 }));
    }
  }
  return s.join('');
}

/** The Stiftskirche's tower (drawn around its base at 0,0), a silhouette against the glow. */
function stiftskirche(): string {
  const s: string[] = [];
  s.push(inked(poly([[-16, 0], [-15, -150], [15, -150], [16, 0]]), '#b89a94', 2.4));
  s.push(path(poly([[-15, -150], [-9, -150], [-10, 0], [-16, 0]]), { fill: '#ffb45a', opacity: 0.45 }));
  s.push(path(poly([[4, -150], [15, -150], [16, 0], [4, 0]]), { fill: '#2a1848', opacity: 0.3 }));
  s.push(circle(0, -120, 6.5, { fill: '#2a2a5a', stroke: INK, sw: 1.6 }));
  s.push(path('M0 -120V-124.5M0 -120L3 -119', { stroke: '#ffd34a', sw: 1.4 }));
  for (const dx of [-8, 3]) s.push(inked(`M${dx} -138h5v10h-5z`, '#2a2238', 1.2));
  s.push(inked(poly([[-19, -150], [19, -150], [17, -156], [-17, -156]]), '#a08a80', 2));
  s.push(inked(poly([[-13, -156], [13, -156], [7, -176], [-7, -176]]), '#3a3048', 2));
  s.push(inked('M-5 -176h10v-10h-10z', '#4a3e58', 1.6));
  s.push(inked(poly([[-6, -186], [6, -186], [0, -232]]), '#2a2238', 2));
  s.push(line([0, -232], [0, -242], INK, 1.6));
  s.push(circle(0, -236, 1.8, { fill: '#ffd34a', stroke: INK, sw: 0.8 }));
  return s.join('');
}

const houseFoot = (x: number) => quayTopY(x) - promGap(x);

/** The row of gabled houses along the quay: small at the bend, bigger and
 *  bigger towards us on the right. */
function altstadt(): string {
  const s: string[] = [];
  const row: string[] = [];
  let x = 304;
  let seed = 100;
  while (x < 742) {
    const w = 24 + (x - 304) * 0.2;
    const lean = (rng(seed)() - 0.5) * w * 0.08;
    row.push(house(x, houseFoot(x + w / 2) + w * 0.04, w, seed, lean));
    x += w * 0.93;
    seed += 7;
  }
  s.push(group(stiftskirche(), 'translate(478 232) scale(0.74)'));
  // Far ones first, so each nearer house overlaps its neighbour.
  s.push(row.join(''));
  return s.join('');
}

/** The big corner house at the bridge, close to us on the right: pale
 *  walls, a round bay tower under a pointed roof, windows already lit. */
function eckhaus(): string {
  const s: string[] = [];
  const wall = '#c9a9b2';
  const win = (x: number, y: number, w: number, h: number, lit: boolean) =>
    (lit ? rect(x - 8, y - 8, w + 16, h + 16, { fill: LIT, opacity: 0.2 }, 8) : '') +
    rect(x, y, w, h, { fill: lit ? LIT : DARK_PANE, stroke: INK, sw: 2 }) +
    path(`M${x + w / 2} ${y}V${y + h}M${x} ${y + h * 0.42}H${x + w}`, { stroke: lit ? '#a8742a' : '#5a5078', sw: 1.6 });
  // Main block, running off the top of the picture.
  s.push(inked(poly([[742, 414], [748, -10], [970, -10], [970, 414]]), wall, 3));
  s.push(path(poly([[748, -10], [776, -10], [772, 384], [742, 384]]), { fill: '#ffb45a', opacity: 0.35 }));
  s.push(win(756, 58, 30, 46, true) + win(756, 150, 30, 46, true) + win(756, 240, 30, 44, false));
  // The plinth with its dark arch, down at the water.
  s.push(inked(poly([[742, 414], [743, 318], [970, 318], [970, 414]]), '#a58a9c', 2.6));
  s.push(inked('M754 384V350Q770 328 786 350V384Z', '#2a1e3a', 2));
  // The bay tower and its pointed roof.
  s.push(inked('M804 318V112H946V318Z', '#d6b6ba', 3));
  s.push(path('M804 112H826V318H804Z', { fill: '#ffc27a', opacity: 0.4 }));
  s.push(path('M900 112H946V318H900Z', { fill: '#3a2058', opacity: 0.22 }));
  for (const y of [176, 250]) s.push(path(`M804 ${y}H946`, { stroke: '#a88a98', sw: 2 }));
  s.push(inked(poly([[792, 114], [874, -4], [958, 114]]), '#6a4a60', 3));
  s.push(path(poly([[874, -4], [958, 114], [884, 114]]), { fill: '#1e1038', opacity: 0.3 }));
  for (let k = 1; k < 5; k++) s.push(line([874 - k * 16.4, -4 + k * 23.6], [874 + k * 16.8, -4 + k * 23.6], '#3a2a44', 1.4, 0.7));
  s.push(line([792, 114], [874, -4], '#ff9a5a', 2.4, 0.8));
  s.push(win(822, 128, 30, 38, false) + win(884, 128, 34, 38, true));
  s.push(win(822, 194, 30, 42, true) + win(884, 194, 34, 42, false));
  s.push(win(822, 266, 30, 42, false) + win(884, 266, 34, 42, false));
  s.push(rect(878, 262, 6, 50, { fill: '#8a2f2a', stroke: INK, sw: 1.2 }) + rect(918, 262, 6, 50, { fill: '#8a2f2a', stroke: INK, sw: 1.2 }));
  // The balcony's iron railing.
  s.push(path('M742 300Q800 322 960 314', { stroke: INK, sw: 3 }));
  s.push(path('M742 318Q800 340 960 332', { stroke: INK, sw: 4 }));
  for (let x = 750; x < 960; x += 13) s.push(line([x, 303 + Math.min(18, (x - 742) * 0.25) * 0.8], [x, 321 + Math.min(18, (x - 742) * 0.25) * 0.8], INK, 1.6));
  return s.join('');
}

// ---- the bend: the hill with the Schloss, the Hölderlinturm, the willows ----------------------

function willow(x: number, y: number, k: number, seed: number): string {
  const s: string[] = [];
  s.push(path(puff(x, y - 14 * k, 17 * k, 13 * k, 6, seed, 0.14), { fill: '#55783a', stroke: INK, sw: 1.4 }));
  for (let i = 0; i < 8; i++) {
    const sx = x - 15 * k + i * 4.3 * k;
    s.push(path(`M${sx} ${y - 16 * k + (i % 3) * 2}Q${sx - 1.5} ${y} ${sx + 1} ${y + 18 * k - (i % 2) * 4}`, { stroke: i % 3 ? '#4e7034' : '#d0b050', sw: 2.2 * k }));
  }
  return s.join('');
}

function bend(): string {
  const s: string[] = [];
  // The hill behind the town, in the evening haze, the Schloss on top.
  s.push(path(curve([[120, 244], [190, 196], [262, 170], [340, 160], [470, 150], [640, 120], [760, 110]]) + 'L760 260L120 260Z', { fill: '#7a5282' }));
  s.push(inked('M250 170V154H334V168Z', '#9a6a86', 1.4));
  s.push(inked('M246 155L258 144H326L338 155Z', '#5a3a5e', 1.4));
  s.push(inked('M330 168V146h12v22z', '#9a6a86', 1.4) + inked('M328 147l8 -12l8 12z', '#5a3a5e', 1.4));
  for (const x of [262, 280, 300, 316]) s.push(rect(x, 159, 3, 4, { fill: LIT, opacity: 0.9 }));
  // Roofs up the slope.
  const r = rng(33);
  for (let i = 0; i < 16; i++) {
    const x = 200 + r() * 330;
    const y = 190 + r() * 34 - (x - 200) * 0.06;
    const w = 12 + r() * 12;
    s.push(path(poly([[x, y], [x + w / 2, y - w * 0.6], [x + w, y], [x + w, y + w * 0.7], [x, y + w * 0.7]]), { fill: r() < 0.5 ? '#8a5a80' : '#6a4674' }));
    if (r() < 0.5) s.push(rect(x + w * 0.35, y + w * 0.2, 2.4, 3, { fill: LIT, opacity: 0.85 }));
  }
  // Trees where the river comes round the bend.
  s.push(path(puff(190, 236, 30, 13, 6, 71, 0.16), { fill: '#3e3a5a', stroke: INK, sw: 1.2 }));
  s.push(path(puff(236, 226, 26, 16, 6, 73, 0.16), { fill: '#4a5a44', stroke: INK, sw: 1.2 }));
  s.push(willow(238, 234, 0.9, 81));
  s.push(willow(296, 238, 1.05, 83));
  return s.join('');
}

// ---- the quay wall with its lamps and trees ------------------------------------------------

/** Lamp posts on the wall, far → near. */
const LAMPS = [352, 430, 520, 628];

function quay(): string {
  const s: string[] = [];
  const [t0, t1] = NK.quayTop;
  const [f0, f1] = NK.quayFoot;
  s.push(inked(poly([t0, t1, f1, f0]), '#9c8a94', 2.4));
  // Stone courses, foreshortened.
  for (let k = 1; k < 6; k++) s.push(line(lerp(t0, f0, k / 6), lerp(t1, f1, k / 6), '#6a5a70', 1.2, 0.8));
  const r = rng(91);
  for (let i = 0; i < 80; i++) {
    const t = r() * r();
    const k = Math.floor(r() * 6);
    s.push(line(lerp(lerp(t0, f0, k / 6), lerp(t1, f1, k / 6), t), lerp(lerp(t0, f0, (k + 1) / 6), lerp(t1, f1, (k + 1) / 6), t), '#6a5a70', 1, 0.7));
  }
  s.push(path(poly([lerp(t0, f0, 0.82), lerp(t1, f1, 0.82), f1, f0]), { fill: '#3a4a40', opacity: 0.5 }));
  // The promenade along the top, between the wall's edge and the houses.
  const back: Pt[] = [];
  for (let x = 250; x <= 742; x += 41) back.push([x, quayTopY(x) - promGap(x)]);
  s.push(inked(poly([t0, [742, quayTopY(742)], ...back.reverse()]), '#b99c92', 1.6));
  for (let x = 262; x < 742; x += 10 + (x - 250) * 0.06) s.push(line([x, quayTopY(x) - 1], [x + promGap(x) * 0.5, quayTopY(x) - promGap(x) + 1], '#8a7078', 1, 0.6));
  // The lamps are on already: pools of light down the wall.
  for (const x of LAMPS) {
    const yt = yAt(NK.quayTop, x);
    const yf = yAt(NK.quayFoot, x);
    const k = (x - 250) / 500 + 0.25;
    s.push(path(poly([[x, yt], [x + 26 * k, yf], [x - 22 * k, yf - 6 * k]]), { fill: LIT, opacity: 0.33 }));
    s.push(line([x, yt + 1], [x, yt - 20 * k], INK, 1.4 + k));
    s.push(circle(x, yt - 21 * k, 2.6 * k + 0.8, { fill: '#fff6c8', stroke: INK, sw: 1 }));
    s.push(circle(x, yt - 21 * k, 9 * k, { fill: LIT, opacity: 0.3 }));
  }
  // A low railing along the top, and round trees in front of the houses.
  s.push(line([t0[0], t0[1] - 3], [742, yAt(NK.quayTop, 742) - 9], INK, 1.6));
  for (let x = 262; x < 742; x += 8 + (x - 250) * 0.03) s.push(line([x, yAt(NK.quayTop, x)], [x, yAt(NK.quayTop, x) - 3 - (x - 250) * 0.012], INK, 1.2));
  for (const [x, sz, seed] of [[330, 9, 3], [398, 13, 5], [476, 17, 7], [574, 23, 9], [690, 30, 13]] as Array<[number, number, number]>) {
    const base = quayTopY(x) - promGap(x) * 0.85;
    const y = base - sz * 1.3;
    s.push(line([x, y + sz * 0.6], [x, base], '#3a2a2a', Math.max(1.6, sz / 5)));
    s.push(path(puff(x, y, sz * 1.25, sz, 6, seed, 0.14), { fill: '#2e5a3c', stroke: INK, sw: 1.8 }));
    s.push(ellipse(x - sz * 0.25, y - sz * 0.2, sz * 0.75, sz * 0.58, { fill: '#4e7e40' }));
    s.push(ellipse(x - sz * 0.5, y - sz * 0.38, sz * 0.34, sz * 0.24, { fill: '#d0a850', opacity: 0.85 }));
  }
  return s.join('');
}

// ---- the river -----------------------------------------------------------------------

function river(): string {
  const s: string[] = [];
  const [l0, l1] = NK.bankL;
  const [f0, f1] = NK.quayFoot;
  s.push(path(poly([l0, f0, f1, [962, 452], [-2, 452], [-2, l1[1]]]), { fill: 'url(#nkWater)' }));
  const r = rng(61);
  // The houses, the lamps and the lit windows, smeared into the water.
  for (let x = 300; x < 800; x += 13) {
    const y = yAt(NK.quayFoot, x);
    const len = 14 + (x - 300) * 0.12;
    s.push(path(`M${x} ${y + 1}h${9 + r() * 5}l-3 ${len}h-${6 + r() * 5}z`, { fill: r() < 0.25 ? LIT : WALLS[Math.floor(r() * WALLS.length)], opacity: 0.26 }));
  }
  for (const x of LAMPS) {
    const y = yAt(NK.quayFoot, x);
    const k = (x - 250) / 500 + 0.25;
    for (let i = 0; i < 5; i++) s.push(path(`M${x - (5 - i) * k - 6 * k} ${y + 5 * k + i * 7 * k}h${(14 - i * 1.6) * k}`, { stroke: LIT, sw: 2.2 * k, opacity: 0.6 - i * 0.08 }));
  }
  // The sun's glitter path, straight towards us.
  for (let i = 0; i < 16; i++) {
    const y = 258 + i * 6.5 + i * i * 0.12;
    const half = 5 + i * 3.2;
    s.push(path(`M${NK.sun[0] + 6 - half + r() * 6} ${y}h${half * 2 - r() * 8}`, { stroke: '#fff0b0', sw: 1.2 + i * 0.16, opacity: 0.8 - i * 0.03 }));
  }
  // Ripples: longer and further apart as they come close.
  for (let i = 0; i < 110; i++) {
    const t = r();
    const y = NK.far + 6 + t * t * 124;
    const span = 0.2 + t * 0.8;
    const xl = Math.max(0, xAt(NK.bankL, y));
    const x = xl + r() * Math.max(0, Math.min(960, xAt(NK.quayFoot, y)) - xl);
    const len = 4 + span * 24;
    s.push(path(`M${x} ${y}q${len / 2} ${-1.2 - span} ${len} 0`, { stroke: r() < 0.55 ? '#ffd8a0' : '#3a2a62', sw: 0.8 + span * 1.4, opacity: 0.5 }));
  }
  return s.join('');
}

// ---- the left bank: the Neckarinsel, dark against the sun ------------------------------------

function leftBank(): string {
  const s: string[] = [];
  const [l0, l1] = NK.bankL;
  s.push(inked(poly([[-4, 236], [l0[0], 240], l0, l1, [-4, l1[1]]]), '#34304e', 2));
  s.push(line(l0, l1, '#ff9a5a', 1.6, 0.6));
  // The Platanenallee, receding towards the sun, then the big dark tree close by.
  for (const [x, rx, ry] of [[84, 14, 12], [58, 20, 18]] as Array<[number, number, number]>) {
    s.push(path(puff(x, 240 - ry, rx, ry, 6, x, 0.15), { fill: '#3a3458', stroke: INK, sw: 1.4 }));
  }
  s.push(inked('M24 304Q30 240 22 150L44 150Q40 240 50 300Z', '#1e1a30', 2));
  const blobs: Array<[number, number, number, number, string]> = [
    [-6, 70, 84, 80, '#1c1830'], [26, 168, 74, 86, '#1c1830'], [44, 232, 40, 34, '#221e38'],
    [-12, 150, 60, 70, '#262240'], [18, 96, 50, 44, '#262240'],
  ];
  blobs.forEach(([cx, cy, rx, ry, c], i) => s.push(path(puff(cx, cy, rx, ry, 7 + (i % 3), 200 + i, 0.13), { fill: c, stroke: i < 3 ? INK : 'none', sw: 2.4 })));
  // Rim light where the sun catches the leaves.
  s.push(path('M72 96Q92 130 86 170M96 196Q104 220 92 250', { stroke: '#e8805a', sw: 2.4, opacity: 0.7 }));
  // Reeds.
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 13;
    const y = yAt(NK.bankL, x) + 2;
    s.push(path(`M${x} ${y}q-2 -10 ${i % 2 ? 3 : -3} -18`, { stroke: '#4a5a44', sw: 2 }));
  }
  return s.join('');
}

// ---- the jetty, the steps, the bridge deck ---------------------------------------------------

/** The Hölderlinturm: a round yellow tower under a pointed roof, standing
 *  in the water in front of the quay wall, a big willow beside it. */
function hoelderlinturm(): string {
  const { x, base } = NK.turm;
  const lit = (wx: number, wy: number, on: boolean) =>
    rect(wx - 2, wy - 3.2, 4, 6.4, { fill: on ? LIT : DARK_PANE, stroke: INK, sw: 0.7 }) + path(`M${wx} ${wy - 3.2}v6.4`, { stroke: on ? '#a8742a' : '#5a5078', sw: 0.5 });
  const tower = [
    inked('M-12 0V-38Q0 -42 12 -38V0Z', '#e8bc68', 1.1),
    path('M-12 -38Q-9 -40 -6 -40V0H-12Z', { fill: '#fff0b0', opacity: 0.55 }),
    path('M3 -40V0H12V-38Q8 -40 3 -40Z', { fill: '#3a2058', opacity: 0.25 }),
    path('M-12 -20H12M-12 -6H12', { stroke: '#b88a48', sw: 0.6 }),
    inked(poly([[-15, -37], [15, -37], [0, -69]]), '#5a4a6e', 1.1),
    path(poly([[0, -69], [15, -37], [3, -37]]), { fill: '#1e1038', opacity: 0.3 }),
    line([-15, -37], [0, -69], '#ff9a5a', 0.9, 0.85),
    line([0, -69], [0, -76], INK, 0.8),
    circle(0, -77, 1, { fill: '#ffd34a', stroke: INK, sw: 0.5 }),
    lit(-6, -29, true) + lit(0, -30, true) + lit(6, -29, false),
    lit(-6, -13, false) + lit(1, -13, true),
    // Damp at the waterline.
    path('M-12 -4Q0 -2 12 -4V0H-12Z', { fill: '#3a4a40', opacity: 0.5 }),
  ];
  return [
    // Its reflection, and the willow's.
    path(`M${x - 24} ${base + 2}h48l-6 44h-34z`, { fill: '#ffd070', opacity: 0.28 }),
    willow(x - 56, base - 36, 2.2, 85),
    group(tower, `translate(${x} ${base}) scale(2.2)`),
  ].join('');
}

/** The jetty at the Hölderlinturm, and the stairs down the wall to it. */
function jetty(): string {
  const s: string[] = [];
  const [a, b, c, d] = NK.jetty;
  const { top, bottom } = NK.stairs;
  // Stairs: treads between the promenade's edge and the jetty.
  const tl: Pt = [top[0], quayTopY(top[0])];
  const tr: Pt = [top[1], quayTopY(top[1])];
  const bl: Pt = [bottom[0], 300];
  const br: Pt = [bottom[1], 303];
  s.push(inked(poly([tl, tr, br, bl]), '#8a747c', 1.6));
  for (let k = 1; k < 8; k++) s.push(line(lerp(tl, bl, k / 8), lerp(tr, br, k / 8), '#4a3a4a', 1.2));
  s.push(line(tl, bl, '#ffb070', 1.2, 0.7));
  // The jetty itself, on its posts.
  for (const t of [0.1, 0.5, 0.9]) {
    const [px, py] = lerp(d, c, t);
    s.push(inked(`M${px - 2} ${py - 2}v12h4v-12z`, '#4a2e22', 1.2));
  }
  s.push(inked(poly([a, b, c, d]), '#b07a42', 2));
  for (let k = 1; k < 4; k++) s.push(line(lerp(a, d, k / 4), lerp(b, c, k / 4), '#6a4422', 1));
  s.push(inked(poly([d, c, [c[0], c[1] + 4], [d[0], d[1] + 4]]), '#7a5028', 1.4));
  // A mooring post with a rope.
  s.push(inked(`M${b[0] - 8} ${b[1] - 14}v16h5v-16z`, '#6a4422', 1.4));
  s.push(path(`M${b[0] - 8} ${b[1] - 9}q-9 6 -5 11`, { stroke: '#e8d8a8', sw: 1.6 }));
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
      linear('nkSky', 0, 0, 0, 250, [
        [0, '#34347c'],
        [0.3, '#7c4a94'],
        [0.58, '#e2607a'],
        [0.8, '#ff9a52'],
        [1, '#ffe08a'],
      ]),
      linear('nkWater', 0, NK.far, 0, 400, [
        [0, '#ffc070'],
        [0.22, '#f08a6a'],
        [0.55, '#a8588a'],
        [1, '#4a3a80'],
      ]),
      linear('nkDusk', 0, 250, 0, 450, [
        [0, '#2a1a50', 0],
        [1, '#2a1a50', 0.3],
      ])
    ),
    sky(),
    bend(),
    altstadt(),
    quay(),
    eckhaus(),
    river(),
    leftBank(),
    hoelderlinturm(),
    jetty(),
    deck(),
    // Dusk: everything warms towards the sun and sinks into violet near us.
    rect(0, 0, 960, 450, { fill: '#ff7a3a', opacity: 0.07 }),
    rect(0, 250, 960, 200, { fill: 'url(#nkDusk)' }),
    vignette('nkVig', 960, 450, 0.4, '#241040'),
    grainOverlay(960, 450, 0.3, 0.22),
  ].join('');
}

/** The corner house once more, as an occluder layer (in layer coordinates,
 *  NK.eckhaus): whoever walks from the bridge onto the promenade goes round
 *  the back of it. Carries the backdrop's dusk and grain so it sits flush. */
export function eckhausLayer(): string {
  const { x, y } = NK.eckhaus;
  return group(
    [
      defs(
        grainDefs(53),
        linear('nkDusk', 0, 250, 0, 450, [
          [0, '#2a1a50', 0],
          [1, '#2a1a50', 0.3],
        ]),
        `<clipPath id="nkEck"><path d="${poly([[741, 414], [747, -10], [970, -10], [970, 414]])}"/></clipPath>`
      ),
      eckhaus(),
      group(
        [
          rect(0, 0, 960, 450, { fill: '#ff7a3a', opacity: 0.07 }),
          rect(0, 250, 960, 200, { fill: 'url(#nkDusk)' }),
          vignette('nkVig', 960, 450, 0.4, '#241040'),
          grainOverlay(960, 450, 0.3, 0.22),
        ],
        undefined,
        'clip-path="url(#nkEck)"'
      ),
    ],
    `translate(${-x} ${-y})`
  );
}

/** The barrier across the bridge's left end: forestry work, the way to the
 *  forest is closed. A striped trestle, a sign, a traffic cone, a flashing
 *  lamp. Drawn in room coordinates (x 0…72, standing on the deck). */
export function forestBarrier(): string {
  const s: string[] = [];
  const stripes = (x0: number, x1: number, y: number, h: number) => {
    const parts: string[] = [inked(poly([[x0, y], [x1, y], [x1, y + h], [x0, y + h]]), '#f4efe4', 1.8)];
    for (let x = x0 - h; x < x1; x += 12) {
      parts.push(path(poly([[Math.max(x0, x), y + h], [Math.max(x0, x + h * 0), y + h], [Math.min(x1, x + h), y], [Math.min(x1, x + h + 6), y], [Math.min(x1, x + 6), y + h]].map(([px, py]) => [Math.max(x0, Math.min(x1, px)), py] as Pt)), { fill: '#d8322a' }));
    }
    parts.push(path(poly([[x0, y], [x1, y], [x1, y + h], [x0, y + h]]), { stroke: INK, sw: 1.8 }));
    return parts.join('');
  };
  // Trestle legs, then the striped boards.
  for (const x of [8, 62]) s.push(path(`M${x - 6} 446L${x} 402L${x + 6} 446`, { stroke: INK, sw: 4 }) + path(`M${x - 6} 446L${x} 402L${x + 6} 446`, { stroke: '#e8e2d8', sw: 2 }));
  s.push(stripes(0, 70, 404, 10));
  s.push(stripes(0, 70, 424, 9));
  // The sign on top.
  s.push(inked(poly([[2, 352], [70, 352], [70, 396], [2, 396]]), '#f2c230', 2.2));
  s.push(path('M36 396V404', { stroke: INK, sw: 3 }));
  s.push(text(36, 366, 'WALD-', { size: 9, fill: INK, weight: 900 }));
  s.push(text(36, 377, 'ARBEITEN', { size: 9, fill: INK, weight: 900 }));
  s.push(text(36, 390, 'GESPERRT', { size: 8.4, fill: '#c4241a', weight: 900 }));
  // A flashing lamp and a traffic cone.
  s.push(glow('nkBlink', 64, 346, 16, '#ffb020', 0.8));
  s.push(inked('M58 352v-8h12v8z', '#ffb020', 1.6));
  s.push(inked('M82 446L90 418h6l8 28z', '#f06a2a', 1.8));
  s.push(path('M86 432h14', { stroke: '#f4efe4', sw: 3 }));
  s.push(inked('M78 446h30v4h-30z', '#3a3a3a', 1.2));
  return s.join('');
}

/** The sandstone balustrade (an occluder) and an old street lamp. Drawn in room coordinates. */
export function balustrade(): string {
  const top = NK.parapetTop;
  const s: string[] = [];
  const stone = '#b98274';
  const stoneDark = '#7a4e5c';
  const run = (a: number, b: number) => {
    // Coping, balusters, plinth.
    s.push(inked(poly([[a, top + 26], [b, top + 26], [b, NK.parapetBase], [a, NK.parapetBase]]), stoneDark, 2.4));
    for (let x = a + 12; x < b - 6; x += 18) {
      s.push(inked(`M${x - 4} ${top + 13}Q${x - 8} ${top + 20} ${x - 3} ${top + 27}h6Q${x + 8} ${top + 20} ${x + 4} ${top + 13}Z`, stone, 1.6));
    }
    s.push(inked(poly([[a - 2, top], [b + 2, top], [b + 2, top + 13], [a - 2, top + 13]]), '#d89c80', 2.4));
    s.push(path(`M${a} ${top + 3}H${b}`, { stroke: '#ffc890', sw: 2, opacity: 0.9 }));
  };
  run(-6, 966);
  // A pillar every so often.
  for (const px of [150, 470, 790]) {
    s.push(inked(poly([[px, top - 10], [px + 18, top - 10], [px + 18, NK.parapetBase], [px, NK.parapetBase]]), stone, 2.4));
    s.push(inked(poly([[px - 3, top - 16], [px + 21, top - 16], [px + 21, top - 9], [px - 3, top - 9]]), '#d89c80', 2));
  }
  // The street lamp on the right.
  const lx = 862;
  s.push(inked(`M${lx - 7} ${top + 2}h14l-3 -14h-8z`, '#2a3a3a', 2));
  s.push(inked(`M${lx - 3} ${top - 12}L${lx - 2} ${top - 170}h4L${lx + 3} ${top - 12}Z`, '#2a3a3a', 2));
  s.push(inked(`M${lx} ${top - 170}q0 -14 18 -14`, 'none', 3));
  s.push(path(`M${lx} ${top - 170}q0 -14 18 -14`, { stroke: '#3a4a4a', sw: 1.6 }));
  s.push(inked(`M${lx + 10} ${top - 184}h16l-3 -14h-10z`, '#3a4a4a', 1.8));
  s.push(inked(`M${lx + 12} ${top - 184}l2 10h8l2 -10z`, '#fff4c0', 1.4));
  s.push(glow('nkLamp', lx + 18, top - 176, 46, '#ffe08a', 0.55));
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

/** While sinking, the boat is cut off at the waterline `level` (y in
 *  frame px) — no painted-over water, so it sits in any light. */
function sunk(boat: string, sink: number, level: number, f: number): string {
  const pts: Pt[] = [];
  for (let x = 2; x <= PUNT_W - 2; x += 11) pts.push([x, level + Math.sin(x * 0.18 + f * 1.7) * 1.6]);
  return (
    `<defs><clipPath id="puntClip"><rect x="-10" y="-30" width="${PUNT_W + 20}" height="${level + 30}"/></clipPath></defs>` +
    group(group(boat, `translate(0 ${sink})`), undefined, 'clip-path="url(#puntClip)"') +
    path(curve(pts), { stroke: '#fff0d0', sw: 2, opacity: 0.9 })
  );
}

/** The hull's shadow on the water, the bow wave and a little wake. */
function wake(f: number): string {
  return (
    ellipse(110, WL + 3, 112, 5, { fill: '#241040', opacity: 0.35 }) +
    path(`M${8 - f} ${WL + 2}q-10 2 -6 5M214 ${WL}q8 2 4 6`, { stroke: '#fff0d0', sw: 1.6, opacity: 0.8 }) +
    path(`M30 ${WL + 5}h${30 + f * 3}M120 ${WL + 6}h${24 - f * 2}`, { stroke: '#fff0d0', sw: 1.2, opacity: 0.6 })
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
  s.push(sink ? sunk(boat.join(''), sink, WL - 6, f) : group(boat));
  return s.join('');
}

/** After it went down: rings and bubbles where the punt was. */
function goneFrame(f: number): string {
  const s: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = 20 + ((f * 10 + i * 26) % 70);
    s.push(ellipse(110, WL - 4, r, r * 0.16, { stroke: '#fff0d0', sw: 1.6, opacity: Math.max(0, 0.9 - r / 90) }));
  }
  for (const [x, y, rr] of [[96, WL - 8 - f * 3, 3], [120, WL - 14 + f * 2, 2.2], [108, WL - 20 - f, 1.6]] as Array<[number, number, number]>) {
    s.push(circle(x, y, rr, { stroke: '#fff0d0', sw: 1.2 }));
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

/** The cap that floats to the jetty (32×20 box). */
export function floatingCap(): string {
  return group(ellipse(20, 18, 17, 4, { fill: '#fff0d0', opacity: 0.5 }) + couleurCap(20, 18, 1.6, -14), 'scale(0.8)');
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
