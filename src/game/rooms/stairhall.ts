import { Layer, type LayerDef, type RoomDef } from '../../engine/types';
import {
  INK,
  blob,
  circle,
  crookedRect,
  curve,
  defs,
  ellipse,
  glow,
  grainDefs,
  grainOverlay,
  group,
  inked,
  linear,
  line,
  path,
  poly,
  puff,
  rect,
  rectPts,
  rng,
  text,
  vignette,
  wobble,
  type Pt,
} from '../art/toon';

/**
 * The scrolling showcase: a 1400×800 side-view two-story room (the camera
 * follows the player both horizontally and vertically), with:
 *  - a parallax night-sky layer visible through window cutouts,
 *  - a staircase whose banister is sliced into three occluder layers, each
 *    with its own baseline (the engine's answer to diagonal occlusion),
 *  - uniform actor scale (no `scaling`) — correct for side-view rooms.
 * No `music` key: the gallery's theme keeps playing across the archway.
 */

// Stair geometry shared by art, walk area, and railing slices.
// Top edge of the walkable stair band:    (600,442) -> (1080,690)
// Bottom edge of the walkable stair band: (600,470) -> (1010,690)
// railY tracks the bottom edge — the banister sits along it.
const railY = (x: number) => 470 + ((x - 600) * 220) / 410;

// ---- art -------------------------------------------------------------------------
// A grand, faintly sinister mansion hall: plum damask wallpaper over crooked
// mahogany panelling, a runner-carpeted staircase, a wonky candle chandelier,
// and moonlight falling through three windows that are real holes in the
// 'room' layer — the parallax 'sky' layer shows through them.

const W = 1400;
const H = 800;
const WINDOWS: Array<[number, number, number, number]> = [
  [250, 120, 140, 190],
  [1150, 120, 150, 190],
  [1230, 430, 140, 160],
];

const f1 = (v: number): string => (Math.round(v * 10) / 10).toString();
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const WOOD = '#6e3d2a';
const WOOD_DARK = '#4a2619';
const WOOD_LIGHT = '#a0613e';
const GOLD = '#d9a93c';
const GOLD_DARK = '#9c6f1c';
const GOLD_LIGHT = '#ffe590';
const RUNNER = '#9b2232';
const MOON = '#bcd2ff';
const CANDLE = '#ffd27a';

// -- the night sky (parallax layer, 1400×800) ---------------------------------------

function nightCloud(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const d = puff(cx, cy, rx, ry, 6, seed, 0.28);
  return (
    path(d, { fill: '#33406a', stroke: '#141a34', sw: 2.5 }) +
    // moonlit rim along the top
    group(path(puff(cx - rx * 0.08, cy - ry * 0.3, rx * 0.86, ry * 0.7, 6, seed + 1, 0.26), { fill: '#5a6a9c' }), undefined, `opacity="0.85"`) +
    path(puff(cx + rx * 0.05, cy + ry * 0.12, rx * 0.8, ry * 0.62, 6, seed + 2, 0.24), { fill: '#33406a' })
  );
}

function bat(x: number, y: number, s: number): string {
  return path(
    `M${f1(x)} ${f1(y)}q${f1(-4 * s)} ${f1(-5 * s)} ${f1(-10 * s)} ${f1(-3 * s)}q${f1(2 * s)} ${f1(3 * s)} ${f1(-1 * s)} ${f1(5 * s)}` +
      `q${f1(5 * s)} ${f1(-2 * s)} ${f1(11 * s)} ${f1(-2 * s)}q${f1(6 * s)} 0 ${f1(11 * s)} ${f1(2 * s)}` +
      `q${f1(-3 * s)} ${f1(-2 * s)} ${f1(-1 * s)} ${f1(-5 * s)}q${f1(-6 * s)} ${f1(-2 * s)} ${f1(-10 * s)} ${f1(3 * s)}z`,
    { fill: '#0a0c18' }
  );
}

function skyArt(): string {
  const s: string[] = [];
  s.push(
    defs(
      linear('shNight', 0, 0, 0, H, [
        [0, '#0a0f27'],
        [0.55, '#1a2850'],
        [1, '#2f4170'],
      ])
    )
  );
  s.push(rect(0, 0, W, H, { fill: 'url(#shNight)' }));
  // Stars: specks plus a few four-point twinkles.
  const r = rng(17);
  for (let i = 0; i < 190; i++) {
    const x = r() * W;
    const y = r() * 600;
    const big = r() < 0.12;
    if (big) {
      const k = 2.5 + r() * 2.5;
      s.push(path(`M${f1(x)} ${f1(y - k)}Q${f1(x)} ${f1(y)} ${f1(x + k)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + k)}Q${f1(x)} ${f1(y)} ${f1(x - k)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - k)}Z`, { fill: '#f4f0d0' }));
    } else {
      s.push(circle(x, y, 0.5 + r() * 0.9, { fill: '#dfe6ff', opacity: 0.45 + r() * 0.5 }));
    }
  }
  // The moon — framed by the ground-floor window ("clouds drifting past it").
  s.push(glow('shMoonHalo', 1205, 425, 130, MOON, 0.34));
  s.push(`<defs><clipPath id="shMoonClip"><circle cx="1205" cy="425" r="27"/></clipPath></defs>`);
  s.push(circle(1205, 425, 27, { fill: '#f4eed0' }));
  s.push(group([circle(1216, 433, 27, { fill: '#d9cfa6' }), circle(1196, 416, 6, { fill: '#e6dcb4' }), circle(1212, 409, 3.5, { fill: '#e6dcb4' }), circle(1190, 436, 4, { fill: '#cfc49a' })], undefined, 'clip-path="url(#shMoonClip)"'));
  s.push(circle(1205, 425, 27, { stroke: '#1a1f3a', sw: 2.5 }));
  s.push(path('M1186 410A22 22 0 0 1 1200 401', { stroke: '#ffffff', sw: 2.2, opacity: 0.8 }));
  // Clouds, including one sliding across the moon's chin.
  s.push(nightCloud(1218, 452, 46, 13, 5));
  s.push(nightCloud(1272, 498, 36, 10, 9));
  s.push(nightCloud(318, 262, 52, 14, 13));
  s.push(nightCloud(1236, 214, 48, 13, 21));
  s.push(nightCloud(700, 150, 70, 16, 25));
  s.push(nightCloud(520, 470, 60, 14, 29));
  s.push(nightCloud(930, 330, 55, 13, 33));
  s.push(nightCloud(120, 120, 50, 12, 37));
  // Bats, naturally.
  s.push(bat(285, 205, 1.1));
  s.push(bat(352, 228, 0.8));
  s.push(bat(1190, 170, 0.9));
  // Distant hills and a dead tree along the bottom.
  s.push(path(`M0 560Q200 520 420 548T840 540T1150 528T1400 520V${H}H0Z`, { fill: '#121833' }));
  s.push(path('M1288 532L1290 506M1290 512L1281 500M1290 508L1298 498M1289 518L1300 512', { stroke: '#0a0c18', sw: 2.2 }));
  return s.join('');
}

// -- the hall (room layer, 1400×800, windows cut out) ---------------------------------

/** Clip region: the whole layer minus the window openings (evenodd). */
function wallClipDef(id: string): string {
  const holes = WINDOWS.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}Z`).join('');
  return `<clipPath id="${id}"><path clip-rule="evenodd" d="M0 0H${W}V${H}H0Z${holes}"/></clipPath>`;
}

function damaskPattern(): string {
  return (
    `<pattern id="shDamask" width="64" height="76" patternUnits="userSpaceOnUse">` +
    rect(0, 0, 2, 76, { fill: '#1a0812', opacity: 0.25 }) +
    path('M32 20C38 30 42 34 32 52C22 34 26 30 32 20Z', { fill: '#9a4f6c', opacity: 0.26 }) +
    path('M32 36C40 32 46 38 42 44M32 36C24 32 18 38 22 44', { stroke: '#9a4f6c', sw: 2, opacity: 0.26 }) +
    circle(32, 58, 2.5, { fill: '#9a4f6c', opacity: 0.26 }) +
    path('M0 0l5 6l-5 6l-5-6zM64 0l5 6l-5 6l-5-6zM0 76l5-6l5 6zM64 76l5-6l5 6z', { fill: '#9a4f6c', opacity: 0.18 }) +
    `</pattern>`
  );
}

/** Mahogany wainscot band with a rail on top and framed panels. */
function wainscot(x0: number, x1: number, y0: number, y1: number, seed: number, dark = false): string {
  const s: string[] = [];
  s.push(rect(x0, y0, x1 - x0, y1 - y0, { fill: dark ? '#3a1d14' : WOOD }));
  s.push(rect(x0, y0 + (y1 - y0) * 0.62, x1 - x0, (y1 - y0) * 0.38, { fill: '#000000', opacity: 0.12 }));
  const pw = 96;
  for (let x = x0 + 10; x + pw <= x1 - 4; x += pw + 12) {
    s.push(path(wobble(rectPts(x, y0 + 12, pw, y1 - y0 - 22), { seed: seed + x, wobble: 1 }), { fill: dark ? '#331910' : '#5f331f', stroke: dark ? '#1e0e08' : WOOD_DARK, sw: 2 }));
    s.push(path(`M${x + 3} ${y1 - 12}H${x + pw}V${y0 + 15}`, { stroke: dark ? '#5a3020' : WOOD_LIGHT, sw: 1.4, opacity: 0.7 }));
  }
  // rail
  s.push(inked(`M${x0 - 4} ${y0 - 4}H${x1 + 4}V${y0 + 6}H${x0 - 4}Z`, dark ? '#4a2619' : '#7d4630', 2.5));
  s.push(line([x0, y0 - 2], [x1, y0 - 2], WOOD_LIGHT, 1.5, 0.8));
  return s.join('');
}

function cobweb(x: number, y: number, sx: number, sy: number, size: number): string {
  const s: string[] = [];
  const spokes = 5;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    s.push(line([x, y], [x + Math.cos(a) * size * sx, y + Math.sin(a) * size * sy], '#d8d0e0', 1, 0.45));
  }
  for (const k of [0.35, 0.6, 0.85]) {
    let d = '';
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * (Math.PI / 2);
      const px = x + Math.cos(a) * size * k * sx;
      const py = y + Math.sin(a) * size * k * sy;
      d += i === 0 ? `M${f1(px)} ${f1(py)}` : `Q${f1(x + Math.cos(a - 0.15) * size * k * 0.82 * sx)} ${f1(y + Math.sin(a - 0.15) * size * k * 0.82 * sy)} ${f1(px)} ${f1(py)}`;
    }
    s.push(path(d, { stroke: '#d8d0e0', sw: 1, opacity: 0.45 }));
  }
  return s.join('');
}

function windowFrame([x, y, w, h]: [number, number, number, number], seed: number, curtains: boolean): string {
  const s: string[] = [];
  const b = 13;
  // Frame as an inked ring around the opening (evenodd keeps the hole open).
  const outer = wobble(crookedRect(x - b, y - b, w + 2 * b, h + 2 * b, 2, 1), { seed, wobble: 1.4 });
  s.push(path(`${outer}M${x} ${y}h${w}v${h}h${-w}Z`, { fill: WOOD, stroke: INK, sw: 3, extra: 'fill-rule="evenodd"' }));
  s.push(path(`M${x - b + 3} ${y + h + b - 3}V${y - b + 4}H${x + w + b - 4}`, { stroke: WOOD_LIGHT, sw: 1.6, opacity: 0.8 }));
  s.push(rect(x, y, w, h, { stroke: INK, sw: 2.5 }));
  // Mullions
  s.push(path(`M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}`, { stroke: INK, sw: 8 }));
  s.push(path(`M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}`, { stroke: WOOD_DARK, sw: 4 }));
  // Sill
  s.push(inked(wobble([[x - b - 8, y + h + b - 2], [x + w + b + 8, y + h + b - 3], [x + w + b + 4, y + h + b + 8], [x - b - 4, y + h + b + 9]], { seed: seed + 1, wobble: 0.8 }), '#7d4630', 2.5));
  if (curtains) {
    // Heavy velvet drapes on a brass rod, tied back.
    const rodY = y - b - 14;
    s.push(line([x - b - 18, rodY], [x + w + b + 18, rodY], INK, 7));
    s.push(line([x - b - 18, rodY], [x + w + b + 18, rodY], GOLD, 3.5));
    s.push(circle(x - b - 20, rodY, 5, { fill: GOLD, stroke: INK, sw: 2 }));
    s.push(circle(x + w + b + 20, rodY, 5, { fill: GOLD, stroke: INK, sw: 2 }));
    const drape = (side: -1 | 1) => {
      const xo = side < 0 ? x - b - 14 : x + w + b + 14; // outer edge
      const xi = side < 0 ? x + 14 : x + w - 14; // inner edge at the top
      const tieY = y + h * 0.62;
      const tieX = side < 0 ? x - b + 2 : x + w + b - 2;
      const pts: Pt[] = [
        [xo, rodY + 2],
        [xi, rodY + 2],
        [tieX + side * -4, tieY - 6],
        [tieX + side * 2, tieY + 6],
        [xi + side * -2, y + h + b + 30],
        [xo - side * 4, y + h + b + 34],
      ];
      s.push(inked(blob(pts), '#5b1630', 2.6));
      const fold = (t: number) => path(curve([lerp([xo, rodY + 4], [xi, rodY + 4], t), lerp([xo, tieY], [tieX, tieY], t), lerp([xo - side * 4, y + h + b + 30], [xi + side * -2, y + h + b + 28], t)]), { stroke: '#3a0c1e', sw: 2, opacity: 0.8 });
      s.push(fold(0.35), fold(0.7));
      s.push(path(curve([lerp([xo, rodY + 4], [xi, rodY + 4], 0.18), lerp([xo, tieY], [tieX, tieY], 0.2), lerp([xo, y + h + b + 30], [xi, y + h + b + 28], 0.15)]), { stroke: '#8a2a4c', sw: 2.4, opacity: 0.8 }));
      s.push(ellipse(tieX, tieY, 6, 4, { fill: GOLD, stroke: INK, sw: 2 }));
      s.push(path(`M${tieX} ${tieY + 3}l-2 12M${tieX} ${tieY + 3}l3 12`, { stroke: GOLD, sw: 2 }));
    };
    drape(-1);
    drape(1);
    // Valance
    s.push(inked(`M${x - b - 16} ${rodY - 4}H${x + w + b + 16}V${rodY + 12}Q${x + w * 0.75} ${rodY + 22} ${x + w / 2} ${rodY + 12}Q${x + w * 0.25} ${rodY + 22} ${x - b - 16} ${rodY + 12}Z`, '#6e1c3a', 2.6));
    s.push(path(`M${x - b - 14} ${rodY + 10}Q${x + w * 0.25} ${rodY + 20} ${x + w / 2} ${rodY + 10}Q${x + w * 0.75} ${rodY + 20} ${x + w + b + 14} ${rodY + 10}`, { stroke: GOLD, sw: 2 }));
  } else {
    s.push(inked(`M${x - b - 12} ${y - b - 16}H${x + w + b + 12}V${y - b - 2}Q${x + w / 2} ${y - b + 8} ${x - b - 12} ${y - b - 2}Z`, '#6e1c3a', 2.6));
    s.push(path(`M${x - b - 10} ${y - b - 4}Q${x + w / 2} ${y - b + 6} ${x + w + b + 10} ${y - b - 4}`, { stroke: GOLD, sw: 2 }));
  }
  return s.join('');
}

function portrait(): string {
  const s: string[] = [];
  // Gilded frame 442..548 × 212..348, hung a touch crooked.
  const outer = wobble(rectPts(442, 212, 106, 136), { seed: 401, wobble: 1 });
  s.push(rect(447, 218, 106, 136, { fill: '#12060c', opacity: 0.35 }));
  s.push(inked(outer, GOLD, 3));
  s.push(path('M446 344V216H544', { stroke: GOLD_LIGHT, sw: 2, opacity: 0.8 }));
  s.push(path('M546 216V346H446', { stroke: GOLD_DARK, sw: 2.5 }));
  for (const [x, y] of [[442, 212], [548, 212], [442, 348], [548, 348]]) {
    s.push(circle(x, y, 7, { fill: GOLD, stroke: INK, sw: 2 }));
    s.push(circle(x - 1.5, y - 1.5, 2, { fill: GOLD_LIGHT }));
  }
  s.push(`<defs><clipPath id="shCanvas"><rect x="455" y="225" width="80" height="110"/></clipPath>${linear('shOil', 0, 225, 0, 335, [[0, '#2c3a26'], [1, '#141a10']])}</defs>`);
  const a: string[] = [];
  a.push(rect(455, 225, 80, 110, { fill: 'url(#shOil)' }));
  a.push(glow('shOilGlow', 488, 262, 40, '#c8a060', 0.25));
  // The ancestor: coat, high collar, medal
  a.push(inked('M452 340Q456 306 474 300L516 300Q534 306 538 340Z', '#1c1426', 2.2));
  a.push(inked('M480 296L495 316L510 296L506 290L484 290Z', '#efe6d0', 2));
  a.push(path('M495 300L489 314M495 300L501 314', { stroke: '#8a1f2a', sw: 3 }));
  a.push(circle(514, 322, 4, { fill: GOLD, stroke: INK, sw: 1.4 }));
  // Head
  a.push(inked('M476 256Q474 234 495 232Q516 234 514 256Q514 284 495 292Q476 284 476 256Z', '#d8b08a', 2.2));
  a.push(path('M505 240Q514 252 510 276Q504 286 495 290', { stroke: '#b08060', sw: 3, opacity: 0.6 }));
  // Severe hair, centre-parted, and mutton chops
  a.push(inked('M474 254Q472 230 495 228Q518 230 516 254Q512 240 495 240Q478 240 474 254Z', '#1a1416', 2));
  a.push(path('M495 229V240', { stroke: '#d8b08a', sw: 1.4 }));
  a.push(inked('M476 258Q474 276 482 284L484 266Z', '#3a2c24', 1.6));
  a.push(inked('M514 258Q516 276 508 284L506 266Z', '#3a2c24', 1.6));
  // Brows (deeply disappointed), eyes, monocle
  a.push(path('M481 251L491 255M509 251L499 255', { stroke: '#1a1416', sw: 3 }));
  a.push(circle(487, 259, 1.8, { fill: '#1a1416' }));
  a.push(circle(503, 259, 1.8, { fill: '#1a1416' }));
  a.push(circle(503, 259, 5.5, { stroke: GOLD, sw: 1.6 }));
  a.push(path('M508 262Q512 280 509 296', { stroke: GOLD, sw: 1 }));
  // The nose. Generations of nose.
  a.push(inked('M495 256Q491 268 489 274Q495 278 501 274Q499 268 495 256Z', '#e0b896', 1.8));
  // Handlebar moustache, grim mouth
  a.push(inked('M495 278Q486 276 480 282Q478 276 484 274Q490 272 495 275Q500 272 506 274Q512 276 510 282Q504 276 495 278Z', '#3a2c24', 1.6));
  a.push(path('M490 285Q495 283 500 285', { stroke: '#5a2020', sw: 1.6 }));
  // Varnish sheen
  a.push(path('M460 236L478 228M458 250L470 244', { stroke: '#ffffff', sw: 3, opacity: 0.12 }));
  s.push(group(a, undefined, 'clip-path="url(#shCanvas)"'));
  s.push(rect(455, 225, 80, 110, { stroke: INK, sw: 2 }));
  // Name plaque
  s.push(rect(478, 338, 34, 8, { fill: GOLD_DARK, stroke: INK, sw: 1.4 }, 1.5));
  s.push(line([482, 342], [508, 342], GOLD_LIGHT, 1, 0.8));
  return s.join('');
}

/** A brass wall sconce whose candle sits 10 px to the right of its wall
 *  plate at x (`mirror` puts it on the left). */
function sconce(x: number, y: number, mirror = false): string {
  const parts = [
    path(`M${x} ${y + 26}Q${x - 2} ${y + 14} ${x + 10} ${y + 8}`, { stroke: INK, sw: 6 }),
    path(`M${x} ${y + 26}Q${x - 2} ${y + 14} ${x + 10} ${y + 8}`, { stroke: GOLD, sw: 3 }),
    ellipse(x, y + 28, 6, 4, { fill: GOLD, stroke: INK, sw: 2 }),
    inked(`M${x + 3} ${y + 8}h14l-3 5h-8z`, GOLD, 2),
    inked(`M${x + 6} ${y + 8}V${y - 8}h8V${y + 8}z`, '#f2ead6', 2),
    path(`M${x + 7.5} ${y - 6}V${y + 4}`, { stroke: '#ffffff', sw: 1.4, opacity: 0.8 }),
    path(`M${x + 10} ${y - 8}V${y - 12}`, { stroke: INK, sw: 1.4 }),
  ];
  return mirror ? group(parts, `translate(${2 * x} 0) scale(-1 1)`) : parts.join('');
}

function flame(x: number, y: number, k = 1): string {
  return (
    path(`M${f1(x)} ${f1(y - 12 * k)}Q${f1(x + 5 * k)} ${f1(y - 4 * k)} ${f1(x + 3 * k)} ${f1(y)}Q${f1(x)} ${f1(y + 3 * k)} ${f1(x - 3 * k)} ${f1(y)}Q${f1(x - 5 * k)} ${f1(y - 4 * k)} ${f1(x)} ${f1(y - 12 * k)}Z`, { fill: '#ffb83a', stroke: '#8a3a10', sw: 1.2 }) +
    path(`M${f1(x)} ${f1(y - 7 * k)}Q${f1(x + 2.5 * k)} ${f1(y - 2 * k)} ${f1(x)} ${f1(y)}Q${f1(x - 2.5 * k)} ${f1(y - 2 * k)} ${f1(x)} ${f1(y - 7 * k)}Z`, { fill: '#fff6c0' })
  );
}

/** The chandelier (without flames — those go on top of the light overlays). */
const CHANDELIER_CANDLES: Pt[] = [
  [771, 109],
  [802, 117],
  [835, 106],
  [868, 117],
  [899, 109],
];
const CHANDELIER_TILT = 'rotate(-4 835 34)';

function chandelier(): string {
  const s: string[] = [];
  // Ceiling rose + chain
  s.push(inked('M815 34Q835 46 855 34Z', GOLD, 2.2));
  for (let y = 40; y < 66; y += 7) s.push(ellipse(835, y + 3, 2.6, 4, { stroke: INK, sw: 3.2 }), ellipse(835, y + 3, 2.6, 4, { stroke: GOLD_DARK, sw: 1.4 }));
  // Arms (S-curves from the hub to each cup)
  for (const [cx, cy] of CHANDELIER_CANDLES) {
    const d = curve([[835, 94], [835 + (cx - 835) * 0.45, 108 + (cy - 106) * 0.2], [cx + (cx - 835) * 0.08, cy + 14], [cx, cy + 4]]);
    s.push(path(d, { stroke: INK, sw: 7 }), path(d, { stroke: GOLD, sw: 3.5 }));
  }
  // Crystal drops
  for (const [x, y] of [[786, 132], [820, 136], [850, 136], [884, 132], [835, 146]] as Pt[]) {
    s.push(line([x, y - 12], [x, y - 4], GOLD_DARK, 1));
    s.push(path(`M${x} ${y - 5}Q${x + 4} ${y + 2} ${x} ${y + 6}Q${x - 4} ${y + 2} ${x} ${y - 5}Z`, { fill: '#cfe8ff', stroke: INK, sw: 1.2 }));
  }
  // Hub
  s.push(inked(blob([[835, 64], [846, 72], [848, 86], [842, 100], [835, 104], [828, 100], [822, 86], [824, 72]]), GOLD, 2.5));
  s.push(path('M829 74Q826 86 830 96', { stroke: GOLD_LIGHT, sw: 2 }));
  s.push(path('M842 74Q846 86 840 98', { stroke: GOLD_DARK, sw: 2 }));
  s.push(inked('M829 104L841 104L835 122Z', GOLD, 2));
  // Cups and candles (one sags drunkenly)
  CHANDELIER_CANDLES.forEach(([x, y], i) => {
    s.push(inked(`M${x - 9} ${y + 2}Q${x} ${y + 10} ${x + 9} ${y + 2}Z`, GOLD, 2));
    const lean = i === 3 ? 'rotate(10 ' + x + ' ' + (y + 2) + ')' : '';
    s.push(group([inked(`M${x - 3.5} ${y + 2}V${y - 14}h7V${y + 2}Z`, '#f2ead6', 2), path(`M${x - 2} ${y - 12}V${y}`, { stroke: '#ffffff', sw: 1.2, opacity: 0.8 }), path(`M${x + 2} ${y - 14}q1 5 0 8`, { stroke: '#e0d6b8', sw: 1.6 })], lean || undefined));
  });
  return group(s, CHANDELIER_TILT);
}

function chandelierFlames(): string {
  return group(
    CHANDELIER_CANDLES.map(([x, y], i) => {
      const fx = i === 3 ? x + 3 : x;
      return flame(fx, y - 15, 0.9);
    }),
    CHANDELIER_TILT
  );
}

/** Stair band point: t along the flight (0 = landing, 1 = floor), u across
 *  the band (0 = far/top edge, 1 = near/bottom edge). */
function stairPt(t: number, u: number): Pt {
  const top: Pt = [600 + 480 * t, 442 + 248 * t];
  const bot: Pt = [600 + 410 * t, 470 + 220 * t];
  return lerp(top, bot, u);
}

function stairs(): string {
  const s: string[] = [];
  const N = 15;
  // Under-stair panelling (the triangle below the stringer)
  s.push(path(poly([[600, 494], [966, 690], [600, 690]]), { fill: '#3a1d14' }));
  s.push(path(poly([[616, 520], [700, 566], [700, 676], [616, 676]]), { fill: '#331910', stroke: '#1e0e08', sw: 2 }));
  s.push(path(poly([[716, 574], [820, 630], [820, 676], [716, 676]]), { fill: '#331910', stroke: '#1e0e08', sw: 2 }));
  s.push(path(poly([[836, 638], [912, 678], [836, 678]]), { fill: '#331910', stroke: '#1e0e08', sw: 2 }));
  // Treads, each a sliver of the band
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    const q = [stairPt(t0, 0), stairPt(t1, 0), stairPt(t1, 1), stairPt(t0, 1)];
    s.push(path(poly(q), { fill: i % 2 ? '#8a5034' : '#93583a' }));
    // nosing: a dark riser shadow line and a highlight just below it
    s.push(line(stairPt(t0, 0), stairPt(t0, 1), '#3a1a10', 2.4, 0.8));
    s.push(line(stairPt(t0 + 0.012, 0), stairPt(t0 + 0.012, 1), '#c88a5a', 1.2, 0.6));
  }
  // The runner: red with gold borders, brass stair rods at each step.
  const u0 = 0.22;
  const u1 = 0.74;
  s.push(path(poly([stairPt(0, u0), stairPt(1, u0), stairPt(1, u1), stairPt(0, u1)]), { fill: RUNNER }));
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    s.push(path(poly([stairPt(t0, u0), stairPt(t1, u0), stairPt(t1, u0 + 0.12), stairPt(t0, u0 + 0.12)]), { fill: '#000000', opacity: 0.15 }));
  }
  s.push(line(stairPt(0, u0 + 0.05), stairPt(1, u0 + 0.05), GOLD, 1.6, 0.9));
  s.push(line(stairPt(0, u1 - 0.05), stairPt(1, u1 - 0.05), GOLD, 1.6, 0.9));
  s.push(line(stairPt(0, u0), stairPt(1, u0), INK, 1.6));
  s.push(line(stairPt(0, u1), stairPt(1, u1), INK, 1.6));
  for (let i = 1; i < N; i++) {
    const t = i / N;
    s.push(line(stairPt(t, u0 - 0.05), stairPt(t, u1 + 0.05), INK, 3.6));
    s.push(line(stairPt(t, u0 - 0.05), stairPt(t, u1 + 0.05), GOLD, 1.8));
  }
  // Band outline along the far edge
  s.push(line([600, 442], [1080, 690], INK, 2.5));
  // Stringer, with a scroll at its foot
  s.push(inked(poly([[600, 470], [1010, 690], [1012, 714], [600, 494]]), '#5a2c1c', 2.8));
  s.push(line([604, 476], [1006, 692], WOOD_LIGHT, 1.6, 0.8));
  s.push(line([604, 488], [1008, 704], '#3a1a10', 1.6, 0.8));
  // Newel base block where the banister meets the floor
  s.push(inked(wobble(rectPts(995, 688, 18, 28), { seed: 77, wobble: 0.6 }), '#5a2c1c', 2.5));
  s.push(line([998, 692], [998, 712], WOOD_LIGHT, 1.4, 0.8));
  return s.join('');
}

function landing(): string {
  const s: string[] = [];
  // Alcove under the landing: deep shadow, panelling continues inside.
  s.push(rect(100, 486, 512, 204, { fill: '#24100e' }));
  s.push(wainscot(120, 586, 622, 684, 300, true));
  s.push(`<defs>${linear('shAlcove', 0, 486, 0, 600, [[0, '#000000', 0.6], [1, '#000000', 0]])}</defs>`);
  s.push(rect(100, 486, 512, 120, { fill: 'url(#shAlcove)' }));
  s.push(cobweb(122, 488, 1, 1, 44));
  s.push(cobweb(584, 488, -1, 1, 36));
  // Top surface (feet stand on 442..470): planks + runner
  s.push(path(poly([[100, 440], [612, 440], [612, 470], [100, 470]]), { fill: '#8a5034' }));
  for (let x = 120; x < 612; x += 46) s.push(line([x, 440], [x - 6, 470], '#4a2216', 1.4, 0.7));
  s.push(rect(130, 446, 482, 18, { fill: RUNNER, stroke: INK, sw: 1.6 }));
  s.push(line([130, 449], [612, 449], GOLD, 1.4, 0.9));
  s.push(line([130, 461], [612, 461], GOLD, 1.4, 0.9));
  s.push(line([100, 440], [612, 440], INK, 2.5));
  // Front edge slab with dentil moulding
  s.push(inked(poly([[96, 469], [616, 469], [616, 488], [96, 488]]), '#6a3624', 2.6));
  for (let x = 102; x < 612; x += 12) s.push(rect(x, 478, 7, 8, { fill: '#4a2216' }));
  s.push(line([98, 472], [614, 472], WOOD_LIGHT, 1.5, 0.8));
  // Support column (turned)
  s.push(inked('M586 488H612V500Q606 504 606 512V664Q612 670 612 678V690H586V678Q590 670 590 664V512Q590 504 586 500Z', '#6e3d2a', 2.5));
  s.push(path('M594 512V664', { stroke: WOOD_LIGHT, sw: 2, opacity: 0.8 }));
  s.push(path('M604 512V664', { stroke: WOOD_DARK, sw: 2 }));
  for (const y of [520, 580, 652]) s.push(ellipse(598, y, 9, 3, { fill: '#7d4630', stroke: INK, sw: 1.6 }));
  return s.join('');
}

function doors(): string {
  const s: string[] = [];
  // Gallery door (ground floor left, in the alcove): 110..220 × 508..686
  s.push(inked(wobble([[108, 510], [222, 506], [222, 688], [110, 688]], { seed: 501, wobble: 1.2 }), WOOD_DARK, 3));
  s.push(inked(wobble([[120, 518], [212, 516], [212, 686], [120, 686]], { seed: 502, wobble: 1 }), '#8a4a2c', 2.5));
  s.push(path('M168 517L212 516L212 686L172 686Z', { fill: '#6e3a22' }));
  s.push(path(wobble(rectPts(130, 530, 72, 66), { seed: 503, wobble: 0.8 }), { fill: '#7a4026', stroke: WOOD_DARK, sw: 2 }));
  s.push(path(wobble(rectPts(130, 606, 72, 68), { seed: 504, wobble: 0.8 }), { fill: '#7a4026', stroke: WOOD_DARK, sw: 2 }));
  s.push(path('M132 594V532H200', { stroke: '#c07a4a', sw: 1.4, opacity: 0.7 }));
  s.push(circle(206, 606, 5, { fill: GOLD, stroke: INK, sw: 2 }));
  s.push(circle(204.5, 604.5, 1.5, { fill: GOLD_LIGHT }));

  // Front door (ground floor right): 1090..1186 × 500..686, "OUT" plate above
  s.push(inked(wobble([[1084, 502], [1192, 498], [1192, 688], [1086, 688]], { seed: 511, wobble: 1.2 }), WOOD_DARK, 3));
  s.push(path('M1088 506H1188', { stroke: WOOD_LIGHT, sw: 1.5, opacity: 0.8 }));
  s.push(inked(wobble([[1098, 510], [1178, 508], [1178, 686], [1098, 686]], { seed: 512, wobble: 1 }), '#2f5a48', 2.5));
  s.push(path('M1144 509L1178 508L1178 686L1150 686Z', { fill: '#24473a' }));
  // Stained-glass fanlight
  s.push(inked('M1104 546V538Q1104 514 1138 514Q1172 514 1172 538V546Z', '#e8a43a', 2));
  for (const [a, c] of [[-60, '#8a3aa8'], [-20, '#d94a3a'], [20, '#3a8ad0'], [60, '#5cbf4a']] as Array<[number, string]>) {
    const r0 = (a * Math.PI) / 180;
    s.push(path(`M1138 546L${f1(1138 + Math.sin(r0 - 0.35) * 40)} ${f1(546 - Math.cos(r0 - 0.35) * 40)}L${f1(1138 + Math.sin(r0 + 0.35) * 40)} ${f1(546 - Math.cos(r0 + 0.35) * 40)}Z`, { fill: c, opacity: 0.85, extra: 'clip-path="url(#shFan)"' }));
  }
  s.push(`<defs><clipPath id="shFan"><path d="M1104 546V538Q1104 514 1138 514Q1172 514 1172 538V546Z"/></clipPath></defs>`);
  s.push(path('M1104 546V538Q1104 514 1138 514Q1172 514 1172 538V546Z', { stroke: INK, sw: 2.2 }));
  s.push(path('M1138 546V516M1104 546H1172', { stroke: INK, sw: 1.8 }));
  s.push(path(wobble(rectPts(1108, 556, 60, 50), { seed: 513, wobble: 0.8 }), { fill: '#2a5242', stroke: '#173026', sw: 2 }));
  s.push(path(wobble(rectPts(1108, 616, 60, 60), { seed: 514, wobble: 0.8 }), { fill: '#2a5242', stroke: '#173026', sw: 2 }));
  for (const [x, y] of [[1112, 560], [1164, 560], [1112, 672], [1164, 672]]) s.push(circle(x, y, 1.8, { fill: '#a8b0b8', stroke: INK, sw: 0.8 }));
  // Iron knocker, keyhole, knob
  s.push(circle(1138, 584, 8, { stroke: INK, sw: 4.6 }));
  s.push(circle(1138, 584, 8, { stroke: '#7a7a86', sw: 2 }));
  s.push(circle(1138, 575, 3, { fill: '#5a5a66', stroke: INK, sw: 1.4 }));
  s.push(circle(1106, 600, 5, { fill: GOLD, stroke: INK, sw: 2 }));
  s.push(circle(1104.5, 598.5, 1.5, { fill: GOLD_LIGHT }));
  s.push(path('M1106 610v6', { stroke: INK, sw: 2 }));
  // "OUT" plate
  s.push(inked(wobble(rectPts(1116, 486, 44, 12), { seed: 515, wobble: 0.5 }), GOLD, 1.8));
  s.push(text(1138, 495.5, 'OUT', { size: 9, fill: '#3a2410' }));
  return s.join('');
}

function floor(): string {
  const s: string[] = [];
  const r = rng(91);
  const vp: Pt = [700, 380];
  const at = (xb: number, y: number) => vp[0] + ((xb - vp[0]) * (y - vp[1])) / (800 - vp[1]);
  const colors = ['#7a4228', '#713c24', '#83482c', '#6c3820'];
  for (let i = -6, k = 0; i < 26; i++, k++) {
    const a = -260 + i * 80;
    const b = a + 80;
    s.push(path(poly([[at(a, 690), 690], [at(b, 690), 690], [b, 800], [a, 800]]), { fill: colors[k % colors.length] }));
    s.push(line([at(a, 690), 690], [a, 800], 'rgba(30,10,6,0.55)', 1.6));
    const y = 700 + r() * 90;
    s.push(line([at(a, y), y], [at(b, y), y], 'rgba(30,10,6,0.45)', 1.4));
  }
  s.push(`<defs>${linear('shFloorShade', 0, 690, 0, 800, [[0, '#120404', 0.55], [0.4, '#120404', 0.1], [1, '#120404', 0]])}</defs>`);
  s.push(rect(0, 690, W, 110, { fill: 'url(#shFloorShade)' }));
  // Long Persian runner rug
  s.push(ellipse(600, 752, 380, 34, { fill: '#000000', opacity: 0.22 }));
  s.push(inked(wobble([[262, 712], [930, 712], [968, 782], [226, 782]], { seed: 93, wobble: 2.2 }), '#6e1c34', 2.6));
  s.push(path(wobble([[276, 718], [918, 718], [950, 776], [242, 776]], { seed: 94, wobble: 1.6 }), { stroke: GOLD, sw: 2.4 }));
  s.push(path(wobble([[296, 726], [898, 726], [924, 768], [266, 768]], { seed: 95, wobble: 1.2 }), { stroke: '#2a6a7a', sw: 2 }));
  for (let i = 0; i < 9; i++) {
    const x = 330 + i * 68;
    s.push(path(poly([[x, 734], [x + 16, 747], [x, 760], [x - 16, 747]]), { fill: GOLD, opacity: 0.75 }));
    s.push(circle(x, 747, 3, { fill: '#2a6a7a' }));
  }
  for (let x = 232; x < 966; x += 9) s.push(line([x, 782], [x - 1, 789], '#e8d3a8', 1.5));
  // Baseboard
  s.push(inked('M-5 682H1405V692H-5Z', '#3a1d14', 2.5));
  return s.join('');
}

function roomArt(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(23),
      wallClipDef('shWallClip'),
      damaskPattern(),
      linear('shWall', 0, 0, 0, 690, [
        [0, '#2e1222'],
        [0.4, '#4a1e34'],
        [1, '#56243a'],
      ])
    )
  );
  const wall: string[] = [];
  wall.push(rect(0, 0, W, 690, { fill: 'url(#shWall)' }));
  wall.push(rect(0, 0, W, 690, { fill: 'url(#shDamask)' }));
  // Ceiling beam + crown moulding
  wall.push(inked(wobble([[-10, -10], [W + 10, -10], [W + 10, 30], [-10, 34]], { seed: 3, wobble: 2 }), '#21101a', 3));
  wall.push(inked('M-10 32Q700 38 1410 30V42Q700 50 -10 44Z', '#5a2c1c', 2.5));
  for (let x = 6; x < W; x += 16) wall.push(rect(x, 44, 9, 7, { fill: '#3a1a10' }));
  // Chair rail along the upper floor, wainscot behind the landing
  wall.push(wainscot(0, 612, 380, 440, 200));
  wall.push(inked(`M612 376H${W + 4}V386H612Z`, '#7d4630', 2.5));
  // Ground-floor wainscot
  wall.push(wainscot(0, W, 622, 684, 600));
  // Moonlight shafts falling from the windows
  wall.push(path(poly([[250, 310], [390, 310], [352, 440], [196, 440]]), { fill: MOON, opacity: 0.07 }));
  wall.push(path(poly([[1150, 310], [1300, 310], [1240, 520], [1072, 520]]), { fill: MOON, opacity: 0.06 }));
  wall.push(path(poly([[1230, 590], [1370, 590], [1288, 790], [1080, 790]]), { fill: MOON, opacity: 0.07 }));
  // A small crooked seascape (a three-headed monkey is just out of frame)
  wall.push(
    group(
      [
        inked(wobble(rectPts(968, 246, 82, 60), { seed: 701, wobble: 0.8 }), GOLD, 2.5),
        rect(976, 254, 66, 44, { fill: '#2a4a6a' }),
        path('M976 284Q992 278 1008 284T1042 284V298H976Z', { fill: '#1a3050' }),
        inked('M998 280L1024 280L1020 288L1002 288Z', '#5a3020', 1.4),
        path('M1011 280V262', { stroke: INK, sw: 1.4 }),
        path('M1012 263L1022 274L1012 274Z', { fill: '#efe6d0', stroke: INK, sw: 1 }),
        circle(1030, 262, 4, { fill: '#f4eed0' }),
      ],
      'rotate(4 1009 276)'
    )
  );
  wall.push(portrait());
  wall.push(sconce(434, 290, true), sconce(566, 290), sconce(1196, 540));
  wall.push(landing());
  wall.push(stairs());
  wall.push(floor());
  wall.push(doors());
  wall.push(cobweb(0, 50, 1, 1, 60));
  wall.push(cobweb(W, 50, -1, 1, 70));
  s.push(group(wall, undefined, 'clip-path="url(#shWallClip)"'));

  // Window frames and drapes sit over the cut edges (the holes stay open).
  s.push(windowFrame(WINDOWS[0], 801, true));
  s.push(windowFrame(WINDOWS[1], 811, true));
  s.push(windowFrame(WINDOWS[2], 821, false));
  s.push(chandelier());

  // Light, shade, grain — clipped so nothing paints over the open windows.
  const lights: string[] = [
    glow('shChandGlow', 835, 120, 300, CANDLE, 0.3, 240),
    glow('shSconceA', 424, 282, 90, CANDLE, 0.4),
    glow('shSconceB', 576, 282, 90, CANDLE, 0.4),
    glow('shSconceC', 1206, 532, 90, CANDLE, 0.38),
    glow('shMoonFloor', 1190, 740, 150, MOON, 0.16, 40),
    glow('shMoonLanding', 280, 452, 120, MOON, 0.14, 26),
    vignette('shVig', W, H, 0.55),
  ];
  s.push(group(lights, undefined, 'clip-path="url(#shWallClip)"'));
  s.push(grainOverlay(W, H, 0.38, 0.3, 'shWallClip'));
  // Flames last, so they stay bright.
  s.push(chandelierFlames());
  s.push(flame(424, 280), flame(576, 280), flame(1206, 530));
  return s.join('');
}

const STAIR_SKY = skyArt();
const STAIR_ROOM = roomArt();

// -- banisters (occluder slices) -----------------------------------------------------------

/** A turned baluster standing on y = base, `h` tall. */
function baluster(x: number, base: number, h: number): string {
  const prof: Array<[number, number]> = [
    [0, 3.6],
    [4, 3.6],
    [6, 2],
    [h * 0.3, 4.2],
    [h * 0.46, 1.8],
    [h * 0.7, 1.7],
    [h * 0.76, 3],
    [h * 0.82, 1.7],
    [h - 4, 2.2],
    [h - 3, 3.2],
    [h, 3.2],
  ];
  const right = prof.map(([dy, hw]) => [x + hw, base - dy] as Pt);
  const left = prof.map(([dy, hw]) => [x - hw, base - dy] as Pt).reverse();
  return (
    path(poly([...right, ...left]), { fill: '#6a321e', stroke: INK, sw: 1.8 }) +
    line([x - 1, base - 7], [x - 1, base - h + 5], '#b06a42', 1.2, 0.8)
  );
}

/** A thick moulded rail between two points (butt ends, so slices join up). */
function handrail(a: Pt, b: Pt, w: number): string {
  const d = `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`;
  return (
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 4}" stroke-linecap="butt"/>` +
    `<path d="${d}" fill="none" stroke="#6e341e" stroke-width="${w}" stroke-linecap="butt"/>` +
    `<path d="M${f1(a[0])} ${f1(a[1] - w * 0.22)}L${f1(b[0])} ${f1(b[1] - w * 0.22)}" fill="none" stroke="#b8744a" stroke-width="${f1(w * 0.28)}" stroke-linecap="butt"/>`
  );
}

function newel(x: number, base: number, top: number): string {
  const s: string[] = [];
  s.push(inked(`M${x - 8} ${base}V${top + 18}H${x + 8}V${base}Z`, '#6a321e', 2.4));
  s.push(inked(`M${x - 10} ${top + 18}H${x + 10}V${top + 10}H${x - 10}Z`, '#7d4630', 2.2));
  s.push(circle(x, top + 3, 7.5, { fill: '#7d4630', stroke: INK, sw: 2.2 }));
  s.push(circle(x - 2.5, top + 0.5, 2.2, { fill: '#c8865a' }));
  s.push(line([x - 4, base - 4], [x - 4, top + 22], '#b06a42', 1.6, 0.8));
  s.push(inked(`M${x - 10} ${base - 10}H${x + 10}V${base - 16}H${x - 10}Z`, '#7d4630', 2));
  return s.join('');
}

/** A banister segment covering world x0..x1, anchored to its own canvas. */
function railSlice(x0: number, x1: number): string {
  const top = railY(x0) - 56;
  const s: string[] = [];
  for (let x = x0; x <= x1; x += 34) s.push(baluster(x + 2.5, railY(x) - 3, 41));
  s.push(handrail([x0, railY(x0) - 4], [x1 + 5, railY(x1 + 5) - 4], 5));
  s.push(handrail([x0, railY(x0) - 46], [x1 + 5, railY(x1 + 5) - 46], 9));
  if (x1 >= 1010) s.push(newel(1004, railY(1004) + 6, railY(1004) - 62));
  return group(s, `translate(${f1(-x0)} ${f1(-top)})`);
}

function railSliceLayer(id: string, x0: number, x1: number): LayerDef {
  const mid = (x0 + x1) / 2;
  return {
    id,
    depth: Math.round(railY(mid)), // baseline: actors on the stairs are behind it
    x: x0,
    y: railY(x0) - 56,
    w: x1 - x0 + 8,
    h: railY(x1) - (railY(x0) - 56) + 8,
    svg: railSlice(x0, x1),
  };
}

/** The landing banister, local to its 478×72 canvas at (146,404). */
function landingRail(): string {
  const s: string[] = [];
  for (let x = 0; x <= 442; x += 34) s.push(baluster(x + 6.5, 66, 42));
  s.push(handrail([0, 64], [464, 64], 5));
  s.push(handrail([0, 22], [464, 22], 9));
  s.push(newel(466, 72, 8));
  return s.join('');
}

export const stairhallRoom: RoomDef = {
  id: 'stairhall',
  name: 'The Grand Staircase',
  features: [
    'a room that scrolls both vertically and horizontally',
    'a parallax layer drifting behind the action',
    'a diagonal occluder sliced into baseline strips (the banister)',
  ],

  size: { w: 1400, h: 800 },

  layers: [
    // Night sky drifts slower than the camera — visible through the windows.
    { id: 'sky', depth: Layer.BEHIND, parallax: 0.85, svg: STAIR_SKY },
    { id: 'room', depth: Layer.BEHIND, svg: STAIR_ROOM },
    // The banister, sliced into three occluders along the diagonal so an
    // actor climbing the stairs passes believably behind it.
    railSliceLayer('rail-low', 880, 1010),
    railSliceLayer('rail-mid', 750, 880),
    railSliceLayer('rail-high', 620, 750),
    // Landing banister: actors on the upper floor walk behind it.
    { id: 'rail-landing', depth: 471, x: 146, y: 404, w: 478, h: 72, svg: landingRail() },
  ],

  // Ground floor + diagonal stair band + upper landing, one concave polygon.
  walkArea: [
    { x: 150, y: 442 },
    { x: 600, y: 442 },
    { x: 1080, y: 690 },
    { x: 1330, y: 690 },
    { x: 1330, y: 780 },
    { x: 70, y: 780 },
    { x: 70, y: 690 },
    { x: 1010, y: 690 },
    { x: 600, y: 470 },
    { x: 150, y: 470 },
  ],
  // No `scaling`: side-view room, actors keep uniform size on both floors.

  entries: {
    fromGallery: { x: 250, y: 720, facing: 'right' },
    fromOutside: { x: 1138, y: 718, facing: 'down' },
  },

  async onEnter(ctx) {
    if (ctx.flag('stairhallSeen')) return;
    ctx.setFlag('stairhallSeen');
    await ctx.wait(400);
    await ctx.playerSay('A grand staircase. Every sinister mansion contract requires one.');
  },

  hotspots: [
    {
      id: 'stair-door',
      name: 'gallery door',
      rect: { x: 110, y: 508, w: 110, h: 178 },
      walkTo: { x: 220, y: 718 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The door back to the gallery.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('gallery', 'fromStairs');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('gallery', 'fromStairs');
        },
      },
    },
    {
      id: 'front-door',
      name: 'front door',
      rect: { x: 1090, y: 486, w: 96, h: 200 },
      walkTo: { x: 1138, y: 715 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The front door. Outside: nature, allegedly.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromDoor');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromDoor');
        },
      },
    },
    {
      id: 'banister',
      name: 'banister',
      polygon: [
        { x: 620, y: 478 },
        { x: 1010, y: 698 },
        { x: 1010, y: 734 },
        { x: 620, y: 508 },
      ],
      walkTo: { x: 800, y: 555 },
      facing: 'down',
      on: {
        lookat: 'A mahogany banister, polished by a century of dramatic exits.',
        push: "It's load-bearing. Probably. Let's not find out.",
        use: 'Sliding down it is for the epilogue.',
      },
    },
    {
      id: 'portrait',
      name: 'ancestor portrait',
      rect: { x: 442, y: 212, w: 106, h: 136 },
      walkTo: { x: 495, y: 456 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('An oil portrait of somebody important and deeply disappointed.');
          await ctx.playerSay('His eyes follow me. His eyebrows judge me.');
        },
        talkto: "'...' — we understand each other.",
      },
    },
    {
      id: 'chandelier',
      name: 'chandelier',
      rect: { x: 765, y: 40, w: 145, h: 115 },
      on: {
        lookat: "It's held up by hope and one very old chain.",
        use: "It's forty feet up. My ambitions are lower.",
        pull: 'In this genre? That NEVER goes wrong.',
      },
    },
    {
      id: 'upper-window',
      name: 'window',
      rect: { x: 250, y: 120, w: 140, h: 190 },
      walkTo: { x: 320, y: 456 },
      facing: 'up',
      on: {
        lookat: 'From up here you can see... more night. The moon is doing its best.',
        open: "It's painted shut, in keeping with tradition.",
      },
    },
    {
      id: 'ground-window',
      name: 'window',
      rect: { x: 1230, y: 430, w: 140, h: 160 },
      walkTo: { x: 1300, y: 715 },
      facing: 'up',
      on: {
        lookat: 'Clouds drifting past the moon. Very atmospheric. Very rent-inflating.',
      },
    },
  ],
};
