import { Layer, type RoomDef } from '../../engine/types';
import { MOUNTAIN_ASSETS } from '../assets';
import {
  INK,
  blob,
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
  radial,
  rect,
  rng,
  text,
  wobble,
  type Pt,
} from '../art/toon';

/**
 * The outdoor showcase (leave the mansion through the stair hall's front
 * door). A 1920×900 mountainside demonstrating all three "living scene"
 * mechanisms at once:
 *  - a **scale map** — `scaling` is a function, so the player shrinks
 *    non-linearly while climbing the switchback trail,
 *  - **ambients** — a bird crosses the sky and a cloud shadow drifts over
 *    the meadow on randomized timers, without ever locking input,
 *  - **camera zoom** — the entry cutscene pulls back to reveal the mountain,
 *    and looking at "the view" from the summit zooms out to the full room.
 */

// Switchback trail, matching the walk-area polygon below:
//   meadow (y 790..870)
//   leg 1 up-right  -> ledge 1 (x 1430..1640, y 610..650)
//   leg 2 up-left   -> ledge 2 (x 560..860,  y 430..466)
//   leg 3 up-right  -> summit  (x 1080..1400, y 280..316)

// ---- art -------------------------------------------------------------------------
// Flat colour planes with atmospheric perspective: pale blue far ridges in
// the parallax sky, a sun-lit rock face (warm left, violet shade right), a
// sandy switchback trail inked as one shape, the mansion's corner on the
// left and the dark edge of the woods on the right.

/** A stylized cloud: puffy top, flat bottom, a lilac underside. */
function cloud(id: string, cx: number, cy: number, k: number, seed: number): string {
  const r = rng(seed);
  const bumps: Array<[number, number, number]> = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const rad = (26 + 18 * (1 - Math.abs(t) * 1.6) + r() * 8) * k;
    bumps.push([cx + t * 170 * k, cy - rad * 0.35 - (1 - Math.abs(t) * 2) * 8 * k, rad]);
  }
  const bottom = cy + 14 * k;
  const left = cx - 112 * k;
  const right = cx + 112 * k;
  const shapes = bumps.map(([x, y, rr]) => circle(x, y, rr, { fill: '#ffffff' })).join('');
  const clip = `<clipPath id="${id}"><rect x="${left - 60 * k}" y="${cy - 120 * k}" width="${right - left + 120 * k}" height="${bottom - cy + 120 * k}"/></clipPath>`;
  const outline = bumps.map(([x, y, rr]) => circle(x, y, rr, { stroke: '#8fa6c8', sw: 5 })).join('');
  return (
    defs(clip) +
    group(
      [
        outline,
        shapes,
        rect(left, cy - 6 * k, right - left, 20 * k, { fill: '#ffffff' }),
        // lilac underside band
        group(
          bumps.map(([x, y, rr]) => circle(x, y + 12 * k, rr, { fill: '#d9dcf0' })).join(''),
          undefined,
          `opacity="0.9"`
        ),
        rect(left, cy + 2 * k, right - left, 12 * k, { fill: '#d9dcf0', opacity: 0.9 }),
      ],
      undefined,
      `clip-path="url(#${id})"`
    ) +
    line([left + 6 * k, bottom], [right - 6 * k, bottom], '#8fa6c8', 2.5)
  );
}

/** A jagged ridge silhouette from x0 to x1, filled down to `floor`. */
function ridge(x0: number, x1: number, base: number, amp: number, step: number, floor: number, seed: number): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [[x0, floor]];
  for (let x = x0; x <= x1; x += step) {
    pts.push([x, base - r() * amp]);
    pts.push([x + step / 2, base - amp * 0.25 - r() * amp * 0.35]);
  }
  pts.push([x1, floor]);
  return pts;
}

function mountainSky(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(23),
      linear('mSky', 0, 0, 0, 1200, [
        [0, '#3c7cc4'],
        [0.4, '#78b2e2'],
        [0.68, '#c6e0ee'],
        [0.85, '#efe8d8'],
        [1, '#f4e6cc'],
      ])
    )
  );
  s.push(rect(0, 0, 2320, 1200, { fill: 'url(#mSky)' }));
  const w: string[] = [];
  // Sun: a flat disc, a halo ring, a wide soft glow.
  w.push(glow('mSunGlow', 350, 150, 260, '#fff2c0', 0.55));
  w.push(circle(350, 150, 70, { stroke: '#fff6d8', sw: 4, opacity: 0.45 }));
  w.push(circle(350, 150, 46, { fill: '#fff4cc', stroke: '#f4d888', sw: 4 }));
  w.push(path('M326 136A26 26 0 0 1 350 122', { stroke: '#ffffff', sw: 4, opacity: 0.8 }));
  // Clouds (some beyond the room edges: the sky drifts with parallax).
  const clouds: Array<[number, number, number]> = [
    [-60, 280, 0.9],
    [600, 200, 1.2],
    [1150, 110, 1],
    [1660, 230, 1.35],
    [920, 330, 0.75],
    [1990, 120, 1],
    [140, 420, 0.6],
  ];
  clouds.forEach(([x, y, k], i) => w.push(cloud(`mCloud${i}`, x, y, k, 40 + i)));
  // Far ridges, palest first (atmospheric perspective).
  const farA = ridge(-220, 2140, 560, 110, 150, 1060, 3);
  w.push(path(poly(farA), { fill: '#c4d4e6' }));
  // Snow on the far peaks: little caps at each high point.
  for (let i = 1; i < farA.length - 1; i += 2) {
    const [x, y] = farA[i];
    if (y < 490) w.push(path(poly([[x - 22, y + 20], [x, y], [x + 24, y + 22], [x + 8, y + 16], [x - 6, y + 24]]), { fill: '#eef3fa' }));
  }
  const farB = ridge(-200, 2120, 650, 90, 110, 1060, 9);
  w.push(path(poly(farB), { fill: '#a3b9d2' }));
  w.push(path(poly(farB), { stroke: '#8ea6c4', sw: 2 }));
  // Low hazy forested hills just behind the meadow.
  const hills: Pt[] = [[-200, 1060]];
  for (let x = -200; x <= 2120; x += 60) hills.push([x, 735 - Math.sin(x * 0.006) * 22 - Math.sin(x * 0.017) * 9]);
  hills.push([2120, 1060]);
  w.push(path(blob(hills.slice(1, -1).concat([[2120, 1060], [-200, 1060]]) as Pt[]), { fill: '#86a6a8' }));
  for (let x = -180; x < 2120; x += 34) {
    const y = 735 - Math.sin(x * 0.006) * 22 - Math.sin(x * 0.017) * 9;
    w.push(path(poly([[x - 9, y + 14], [x, y - 12], [x + 9, y + 14]]), { fill: '#769a9c' }));
  }
  s.push(group(w, 'translate(200 150)'));
  s.push(grainOverlay(2320, 1200, 0.22, 0.08));
  return s.join('');
}

// Mountain silhouette (room coords): a broad massif whose left shoulder
// carries ledge 2 and whose peak (1255,198) towers over the summit slab
// (1080..1400, 274..318) — every bit of trail sits on rock, not on sky.
const MOUNTAIN: Pt[] = [
  [150, 880],
  [330, 760],
  [418, 640],
  [470, 520],
  [520, 418],
  [582, 372],
  [620, 350],
  [664, 358],
  [712, 336],
  [760, 348],
  [810, 330],
  [852, 338],
  [900, 318],
  [950, 316],
  [1060, 272],
  [1150, 240],
  [1205, 220],
  [1255, 198],
  [1305, 228],
  [1360, 262],
  [1425, 304],
  [1500, 384],
  [1612, 520],
  [1700, 640],
  [1800, 760],
  [1910, 880],
];

/** A small stylized pine; (x, y) is the base of the trunk. */
function pine(x: number, y: number, k: number, seed: number): string {
  const r = rng(seed);
  const h = (64 + r() * 18) * k;
  const w = 22 * k;
  const tiers = 3;
  const s: string[] = [ellipse(x + 6 * k, y + 1, w * 0.9, 4 * k, { fill: '#3a2a30', opacity: 0.25 })];
  s.push(inked(poly([[x - 3 * k, y], [x - 3 * k, y - 10 * k], [x + 3 * k, y - 10 * k], [x + 3 * k, y]]), '#5a3a26', 1.8));
  for (let i = 0; i < tiers; i++) {
    const top = y - h + i * h * 0.24;
    const bot = y - 8 * k - (tiers - 1 - i) * h * 0.2;
    const ww = w * (0.55 + i * 0.25);
    s.push(inked(wobble([[x, top], [x + ww, bot], [x - ww, bot]], { seed: seed * 7 + i, wobble: 0.8 }), '#2f5a3e', 2));
    s.push(path(poly([[x, top + 3 * k], [x + ww * 0.85, bot - 1], [x + 2 * k, bot - 1]]), { fill: '#24473a' }));
  }
  return s.join('');
}

/** A cel-shaded boulder centred at (x, y). */
function boulder(x: number, y: number, rr: number, seed: number): string {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const k = 0.85 + r() * 0.3;
    pts.push([x + Math.cos(a) * rr * k, y + Math.sin(a) * rr * 0.75 * k]);
  }
  pts.push([x + rr, y + rr * 0.15], [x - rr, y + rr * 0.15]);
  const d = wobble(pts, { seed, wobble: 1 });
  return (
    ellipse(x + rr * 0.2, y + rr * 0.18, rr * 1.15, rr * 0.22, { fill: '#2a1e28', opacity: 0.3 }) +
    inked(d, '#9a8a80', 2.2) +
    path(poly([[x + rr * 0.1, y - rr * 0.6], [x + rr * 0.9, y - rr * 0.1], [x + rr, y + rr * 0.12], [x + rr * 0.15, y + rr * 0.12]]), { fill: '#6e5c6c', opacity: 0.8 }) +
    path(`M${x - rr * 0.6} ${y - rr * 0.35}Q${x - rr * 0.3} ${y - rr * 0.65} ${x} ${y - rr * 0.65}`, { stroke: '#d4c8b8', sw: 1.8 })
  );
}

// Trail pieces: each walkable band's surface (far edge padded up a little so
// feet on it look grounded) and the cut "lip" face below its near edge.
const TRAIL_SURFACES: Pt[][] = [
  // leg 1: (1180,790)-(1430,610) far edge, (1250,790)-(1500,650) near edge
  [[1168, 794], [1420, 602], [1504, 644], [1256, 796]],
  // leg 2: (860,466)-(1630,610) far edge, (700,466)-(1470,610) near edge
  [[858, 456], [1638, 602], [1470, 616], [694, 472]],
  // leg 3: (600,430)-(1120,316) far edge, (710,430)-(1230,316) near edge
  [[594, 422], [1114, 306], [1236, 316], [714, 434]],
  // ledge 1, ledge 2, summit slab
  [[1420, 600], [1646, 600], [1648, 654], [1418, 654]],
  [[550, 420], [866, 420], [868, 470], [548, 470]],
  [[1072, 270], [1408, 270], [1410, 320], [1070, 320]],
];
const TRAIL_LIPS: Pt[][] = [
  [[1256, 796], [1504, 644], [1504, 658], [1262, 808]],
  [[694, 472], [1470, 616], [1470, 630], [694, 486]],
  [[714, 434], [1236, 316], [1236, 330], [714, 448]],
  [[1418, 654], [1648, 654], [1646, 668], [1420, 668]],
  [[548, 470], [868, 470], [866, 484], [550, 484]],
  [[1070, 320], [1410, 320], [1408, 334], [1072, 334]],
];

function trail(): string {
  const s: string[] = [];
  const r = rng(77);
  // Cut rock faces under each near edge, with a few vertical cracks.
  for (const [i, lip] of TRAIL_LIPS.entries()) {
    s.push(inked(wobble(lip, { seed: 300 + i, wobble: 1.2 }), '#866a52', 2));
    const [a, b] = [lip[0], lip[1]];
    for (let k = 1; k < 6; k++) {
      const t = k / 6 + (r() - 0.5) * 0.08;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      s.push(line([x, y + 2], [x + 1, y + 10], '#5e4a3e', 1.4, 0.8));
    }
  }
  // Packed-earth surfaces, outlined as one shape: ink pass, then fill pass.
  const surf = TRAIL_SURFACES.map((p, i) => wobble(p, { seed: 200 + i, wobble: 2, jitter: 1.2 }));
  for (const d of surf) s.push(path(d, { fill: '#3a2a26', stroke: '#3a2a26', sw: 4 }));
  for (const d of surf) s.push(path(d, { fill: '#e4c992' }));
  // Wear down the middle, pebbles.
  const mids: Array<[Pt, Pt]> = [
    [[1215, 790], [1462, 628]],
    [[1550, 610], [780, 464]],
    [[655, 430], [1175, 314]],
  ];
  for (const [a, b] of mids) s.push(path(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, { stroke: '#f2deb0', sw: 12, opacity: 0.7 }));
  s.push(path('M1440 626H1630M570 444H850M1090 294H1390', { stroke: '#f2deb0', sw: 12, opacity: 0.6 }));
  for (const p of TRAIL_SURFACES) {
    for (let i = 0; i < 10; i++) {
      const u = r();
      const v = r();
      const x = p[0][0] + (p[1][0] - p[0][0]) * u + (p[3][0] - p[0][0]) * v;
      const y = p[0][1] + (p[1][1] - p[0][1]) * u + (p[3][1] - p[0][1]) * v;
      s.push(ellipse(x, y, 1.6 + r() * 2, 1 + r(), { fill: '#a88a62' }));
    }
  }
  // Stones along the far (uphill) edges break up the straight lines.
  for (const p of TRAIL_SURFACES) {
    const [a, b] = [p[0], p[1]];
    for (let k = 0; k < 4; k++) {
      const t = 0.1 + r() * 0.8;
      s.push(boulder(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 2, 5 + r() * 4, 400 + k + Math.floor(a[0])));
    }
  }
  return s.join('');
}

function mansion(): string {
  const s: string[] = [];
  // Chimney with a lazy curl of smoke
  s.push(inked(wobble([[38, 444], [40, 388], [78, 386], [80, 444]], { seed: 501, wobble: 0.8 }), '#94503e', 2.5));
  s.push(inked(wobble([[32, 392], [86, 390], [86, 380], [32, 382]], { seed: 502, wobble: 0.5 }), '#6a3a30', 2.2));
  for (let y = 398; y < 440; y += 10) s.push(line([42, y], [76, y - 1], '#6a3a30', 1.4, 0.8));
  for (const [x, y, rr, o] of [[64, 362, 12, 0.7], [80, 336, 16, 0.55], [102, 304, 20, 0.4], [130, 268, 24, 0.25]] as Array<[number, number, number, number]>) {
    s.push(circle(x, y, rr, { fill: '#f2eee8', opacity: o }));
  }
  // Wall: lilac stone blocks, a little out of plumb
  const wall: Pt[] = [[-10, 514], [228, 518], [238, 880], [-10, 880]];
  s.push(inked(wobble(wall, { seed: 503, wobble: 1.2 }), '#71697e', 3));
  s.push(`<defs><clipPath id="mWall"><path d="${poly(wall)}"/></clipPath></defs>`);
  const r = rng(504);
  const blocks: string[] = [];
  for (let y = 528, row = 0; y < 880; y += 26, row++) {
    let x = -10 - (row % 2) * 24;
    while (x < 240) {
      const bw = 38 + r() * 26;
      blocks.push(path(wobble([[x + 2, y + 2], [x + bw - 2, y + 2], [x + bw - 2, y + 24], [x + 2, y + 24]], { seed: Math.floor(x * 13 + y), wobble: 0.6 }), { fill: r() < 0.3 ? '#7a7288' : '#6a6278', stroke: '#4e4660', sw: 1.4 }));
      x += bw;
    }
  }
  blocks.push(rect(-10, 518, 260, 40, { fill: '#2e2638', opacity: 0.35 })); // roof shadow
  blocks.push(rect(196, 518, 50, 370, { fill: '#3e3450', opacity: 0.35 })); // corner shade
  s.push(group(blocks, undefined, 'clip-path="url(#mWall)"'));
  // Ivy
  for (const [x, y, rr] of [[8, 860, 18], [24, 820, 14], [10, 786, 15], [30, 752, 11], [16, 720, 12], [40, 700, 9], [26, 676, 8]] as Array<[number, number, number]>) {
    s.push(path(puff(x, y, rr, rr * 0.8, 5, x + y, 0.3), { fill: '#3f7a3a', stroke: INK, sw: 1.6 }));
    s.push(path(puff(x - rr * 0.2, y - rr * 0.2, rr * 0.5, rr * 0.4, 4, x * y, 0.3), { fill: '#5c9a4a' }));
  }
  // Roof: dark slate with scalloped shingle rows
  const roof: Pt[] = [[-14, 524], [246, 528], [158, 434], [-14, 434]];
  s.push(inked(wobble(roof, { seed: 505, wobble: 1 }), '#443c58', 3));
  s.push(`<defs><clipPath id="mRoof"><path d="${poly(roof)}"/></clipPath></defs>`);
  const shingles: string[] = [];
  for (let y = 448, row = 0; y < 530; y += 14, row++) {
    let d = '';
    for (let x = -20 + (row % 2) * 9; x < 250; x += 18) d += `M${x} ${y}q9 9 18 0`;
    shingles.push(path(d, { stroke: '#2c2640', sw: 1.6 }));
  }
  shingles.push(path('M-14 440L156 440', { stroke: '#6a6086', sw: 2, opacity: 0.6 }));
  s.push(group(shingles, undefined, 'clip-path="url(#mRoof)"'));
  s.push(inked(wobble([[-14, 520], [248, 524], [250, 534], [-14, 530]], { seed: 506, wobble: 0.5 }), '#2c2640', 2.5));
  // Lit window
  s.push(glow('mWin', 46, 590, 60, '#ffd88a', 0.35));
  s.push(inked('M22 616V578Q44 552 68 578V616Z', '#4a3a2a', 3));
  s.push(path('M28 612V580Q44 562 62 580V612Z', { fill: '#ffd47a' }));
  s.push(path('M45 566V612M28 592H62', { stroke: '#4a3a2a', sw: 3 }));
  s.push(path('M32 584Q38 572 44 570', { stroke: '#fff4c8', sw: 2 }));
  s.push(inked('M16 616H74V624H16Z', '#8a8298', 2));
  // Front door in a stone arch, with steps
  s.push(inked(wobble([[60, 800], [204, 800], [212, 812], [52, 812]], { seed: 507, wobble: 0.6 }), '#8e869c', 2.5));
  s.push(inked('M74 800V656Q130 598 190 656V800Z', '#8e869c', 3));
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    s.push(line([132 + Math.cos(a) * 46, 656 + Math.sin(a) * 40], [132 + Math.cos(a) * 58, 656 + Math.sin(a) * 52], '#5e566e', 1.6));
  }
  s.push(inked('M86 796V660Q132 612 178 660V796Z', '#8e5a34', 3));
  s.push(path('M132 640V796M110 650V796M154 650V796', { stroke: '#6a4024', sw: 2 }));
  s.push(path('M86 690H178M86 760H178', { stroke: '#3a3440', sw: 4 }));
  s.push(path('M150 660V796L178 796V660Q170 650 150 642Z', { fill: '#5a3820', opacity: 0.45 }));
  s.push(circle(158, 722, 5, { fill: '#e8c23a', stroke: INK, sw: 2 }));
  s.push(circle(156.5, 720.5, 1.5, { fill: '#fff4b0' }));
  return s.join('');
}

// Forest edge canopy puffs (also clip the grain overlay).
const FOREST_PUFFS: Array<[number, number, number, number]> = [
  [1760, 640, 50, 1],
  [1820, 600, 58, 2],
  [1890, 620, 64, 3],
  [1940, 560, 60, 4],
  [1790, 700, 46, 5],
  [1870, 690, 52, 6],
];

function forestEdge(): string {
  const s: string[] = [];
  // Deep shadow mass behind the trees, and the path disappearing into it
  s.push(inked(wobble([[1726, 800], [1740, 640], [1800, 580], [1930, 540], [1930, 900], [1840, 900]], { seed: 601, wobble: 2 }), '#16261c', 2.5));
  for (const [x, y, rr, sd] of FOREST_PUFFS) {
    s.push(path(puff(x, y, rr, rr * 0.9, 7, sd, 0.18), { fill: '#1f3d28', stroke: INK, sw: 2.5 }));
    s.push(path(puff(x - rr * 0.3, y - rr * 0.3, rr * 0.45, rr * 0.38, 5, sd + 9, 0.2), { fill: '#2d5a38' }));
  }
  // Trunks (bases kept behind the walkable meadow, except past its right end)
  for (const [x, top, bot, w] of [[1770, 680, 792, 12], [1832, 640, 790, 15], [1896, 650, 900, 18]] as Array<[number, number, number, number]>) {
    s.push(inked(wobble([[x - w / 2, bot], [x - w / 2 + 2, top], [x + w / 2 - 2, top], [x + w / 2, bot]], { seed: x, wobble: 0.8 }), '#3e2a1e', 2.2));
    s.push(path(`M${x + w * 0.1} ${top + 6}V${bot - 4}`, { stroke: '#2a1c14', sw: w * 0.35 }));
  }
  // The path in: a dirt tongue fading into the dark
  // The dark mouth of the woods where the path disappears
  s.push(ellipse(1846, 786, 34, 30, { fill: '#0a120c' }));
  s.push(`<defs>${linear('mPath', 0, 872, 0, 792, [[0, '#b89c6a'], [0.55, '#6a5236'], [1, '#141a14']])}</defs>`);
  s.push(path('M1708 874Q1770 846 1826 800L1862 800Q1872 840 1906 874Z', { fill: 'url(#mPath)' }));
  s.push(path('M1708 874Q1770 846 1826 800M1862 800Q1872 840 1906 874', { stroke: '#2a2018', sw: 2, opacity: 0.6 }));
  // Undergrowth on either side of the path
  for (const [x, y, rr, sd] of [[1748, 800, 22, 11], [1716, 818, 16, 12], [1890, 846, 26, 13], [1904, 800, 20, 14]] as Array<[number, number, number, number]>) {
    s.push(path(puff(x, y, rr, rr * 0.7, 6, sd, 0.25), { fill: '#24442c', stroke: INK, sw: 2 }));
    s.push(path(puff(x - rr * 0.3, y - rr * 0.25, rr * 0.4, rr * 0.3, 5, sd + 3, 0.2), { fill: '#3a6a40' }));
  }
  // Signpost
  s.push(ellipse(1712, 794, 10, 3, { fill: '#1e1424', opacity: 0.3 }));
  s.push(inked('M1708 794V742h7V794Z', '#7a5232', 2));
  s.push(inked(wobble([[1688, 742], [1744, 738], [1756, 750], [1744, 762], [1688, 762]], { seed: 603, wobble: 0.6 }), '#b08050', 2.2));
  s.push(text(1718, 756, 'WOODS', { size: 10, fill: '#3a2410' }));
  return s.join('');
}

function meadow(): string {
  const s: string[] = [];
  s.push(
    `<defs>${linear('mGrass', 0, 760, 0, 900, [
      [0, '#8cbc5a'],
      [0.5, '#6fa648'],
      [1, '#4f8436'],
    ])}</defs>`
  );
  const top: Pt[] = [[-10, 900]];
  for (let x = -10; x <= 1930; x += 80) top.push([x, 772 + Math.sin(x * 0.011) * 5]);
  top.push([1930, 900]);
  s.push(path(poly(top), { fill: 'url(#mGrass)' }));
  s.push(path(curve(top.slice(1, -1)), { stroke: '#4a7a34', sw: 2.5 }));
  // Worn footpaths: door → trailhead → woods
  s.push(path('M150 806Q500 820 820 806T1216 792Q1500 806 1740 820', { stroke: '#b89c6a', sw: 22, opacity: 0.55 }));
  s.push(path('M150 806Q500 820 820 806T1216 792Q1500 806 1740 820', { stroke: '#cdb282', sw: 10, opacity: 0.5 }));
  // Grass tufts and flowers, sparser towards the back
  const r = rng(91);
  for (let i = 0; i < 170; i++) {
    const x = r() * 1920;
    const y = 784 + r() ** 0.7 * 112;
    const k = 0.6 + ((y - 784) / 112) * 0.8;
    s.push(path(`M${x - 4 * k} ${y}l${2 * k} ${-7 * k}M${x} ${y}l${0} ${-9 * k}M${x + 4 * k} ${y}l${-2 * k} ${-7 * k}`, { stroke: '#3f7030', sw: 1.6 }));
  }
  for (let i = 0; i < 60; i++) {
    const x = 240 + r() * 1460;
    const y = 790 + r() * 100;
    const c = ['#ffffff', '#f6d84a', '#f08aa8', '#c8b0f0'][i % 4];
    s.push(circle(x, y, 2 + r() * 1.2, { fill: c, stroke: '#3f7030', sw: 0.8 }));
  }
  // Foreground: darker band + tall blades framing the bottom edge
  s.push(`<defs>${linear('mFore', 0, 846, 0, 900, [[0, '#1e2a14', 0], [1, '#1e2a14', 0.45]])}</defs>`);
  s.push(rect(0, 846, 1920, 54, { fill: 'url(#mFore)' }));
  for (let i = 0; i < 70; i++) {
    const x = r() * 1920;
    const h = 16 + r() * 22;
    s.push(path(`M${x} 902Q${x + 3} ${902 - h * 0.6} ${x + (r() - 0.5) * 14} ${902 - h}`, { stroke: '#2e5a26', sw: 3 }));
  }
  return s.join('');
}

function mountainTerrain(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(29),
      linear('mRock', 0, 200, 0, 880, [
        [0, '#bea482'],
        [1, '#98806a'],
      ]),
      radial('mSunWash', 300, 300, 1200, [
        [0, '#ffe4a8', 0.3],
        [1, '#ffe4a8', 0],
      ])
    )
  );
  // Mountain body: lit face, facets, violet shade face, strata
  s.push(path(poly(MOUNTAIN.concat([[170, 900]]) as Pt[]), { fill: 'url(#mRock)', stroke: INK, sw: 3 }));
  s.push(`<defs><clipPath id="mBody"><path d="${poly(MOUNTAIN.concat([[1910, 900], [170, 900]]) as Pt[])}"/></clipPath></defs>`);
  const facets: string[] = [];
  // Left shoulder: a darker, steeper face under ledge 2
  facets.push(path(poly([[470, 520], [520, 418], [582, 372], [640, 430], [600, 620], [520, 760], [418, 640]]), { fill: '#a48868' }));
  facets.push(path(poly([[582, 372], [620, 350], [712, 336], [760, 348], [700, 470], [640, 430]]), { fill: '#bca37f' }));
  facets.push(path(poly([[852, 338], [900, 318], [950, 316], [1060, 272], [1010, 420], [900, 470]]), { fill: '#b89e7c' }));
  facets.push(path(poly([[700, 520], [900, 520], [860, 680], [640, 760], [600, 700]]), { fill: '#ad9270' }));
  facets.push(path(poly([[1060, 420], [1200, 380], [1260, 560], [1120, 640], [1010, 600]]), { fill: '#b09474' }));
  // Shade face right of the main ridge line
  facets.push(path(poly([[1255, 198], [1305, 228], [1425, 304], [1612, 520], [1800, 760], [1920, 900], [1480, 900], [1430, 660], [1330, 470], [1286, 320]]), { fill: '#7e6878' }));
  facets.push(path(poly([[1425, 304], [1500, 384], [1612, 520], [1700, 640], [1560, 600], [1470, 430]]), { fill: '#6c5868' }));
  for (const d of [
    'M480 760Q600 700 700 700',
    'M760 640Q860 600 930 610',
    'M1010 560Q1080 530 1130 540',
    'M620 690Q700 650 820 660',
    'M1350 520Q1430 560 1500 560',
    'M1460 720Q1560 730 1640 700',
    'M520 540Q560 520 600 530',
    'M480 600L500 640L490 680',
    'M900 380Q950 370 990 380',
    'M1180 420L1196 450L1188 480',
  ]) {
    facets.push(path(d, { stroke: '#7a6450', sw: 2, opacity: 0.6 }));
  }
  // Gullies running down from the crags: a shadow crease with a lit lip
  for (const g of [
    [[620, 352], [600, 450], [560, 560], [540, 700]],
    [[712, 338], [700, 470], [680, 600], [690, 740]],
    [[900, 320], [880, 420], [900, 560], [880, 700]],
    [[1060, 274], [1040, 400], [1080, 520], [1050, 680]],
    [[1180, 232], [1190, 360], [1170, 500], [1200, 650]],
    [[470, 520], [450, 620], [420, 720]],
  ] as Pt[][]) {
    facets.push(path(curve(g), { stroke: '#86684e', sw: 3, opacity: 0.75 }));
    facets.push(path(curve(g.map(([x, y]) => [x - 4, y] as Pt)), { stroke: '#d8c29a', sw: 1.6, opacity: 0.7 }));
  }
  const gr = rng(55);
  for (const [cx, cy, rx, ry] of [
    [380, 750, 90, 22], [560, 726, 120, 26], [800, 742, 150, 24], [1060, 730, 120, 26],
    [1560, 748, 110, 22], [1680, 700, 50, 16], [700, 410, 60, 14], [910, 396, 50, 12],
    [480, 680, 50, 14], [960, 660, 60, 16], [1150, 690, 50, 14],
  ] as Array<[number, number, number, number]>) {
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const k = 0.75 + gr() * 0.4;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    facets.push(path(blob(pts), { fill: '#88a858', opacity: 0.9 }));
    facets.push(path(blob(pts.map(([x, y]) => [x, y + ry * 0.35] as Pt)), { fill: '#6e8e48', opacity: 0.5 }));
    for (let i = 0; i < 6; i++) {
      const x = cx - rx * 0.7 + (i / 5) * rx * 1.4;
      const y = cy - ry * 0.55 + Math.abs(i - 2.5) * ry * 0.12;
      facets.push(path(`M${x - 3} ${y + 2}l3 -6l3 6`, { stroke: '#5f8240', sw: 1.4 }));
    }
  }
  // Sunlit rim along the left skyline
  facets.push(path(poly(MOUNTAIN.slice(1, 15), false), { stroke: '#e8d4a8', sw: 6, opacity: 0.7 }));
  facets.push(path('M1255 198L1286 320L1330 470L1430 660L1480 900', { stroke: '#5a4656', sw: 2.5, opacity: 0.8 }));
  facets.push(rect(0, 0, 1920, 900, { fill: 'url(#mSunWash)' }));
  s.push(group(facets, undefined, 'clip-path="url(#mBody)"'));
  s.push(path(poly(MOUNTAIN), { stroke: INK, sw: 3 }));
  // Snow cap with drips, shaded on the right
  const snow: Pt[] = [
    [1120, 252], [1160, 236], [1206, 218], [1255, 196], [1302, 226], [1352, 262], [1404, 300],
    [1384, 312], [1364, 298], [1338, 318], [1310, 300], [1278, 312], [1246, 290], [1212, 300],
    [1186, 280], [1150, 268],
  ];
  s.push(inked(wobble(snow, { seed: 701, wobble: 0.8, jitter: 0.3 }), '#f6f8fc', 2.5));
  s.push(path(poly([[1255, 200], [1302, 228], [1352, 263], [1400, 300], [1384, 312], [1364, 300], [1338, 324], [1310, 304], [1286, 318]]), { fill: '#c6d2ea' }));
  s.push(path('M1170 244Q1215 226 1250 206', { stroke: '#ffffff', sw: 3 }));
  // Pines on the open slopes (clear of the trail)
  const pines: Array<[number, number, number]> = [
    [330, 770, 1], [392, 748, 0.9], [462, 712, 0.8], [520, 700, 0.75], [600, 742, 0.85],
    [880, 700, 0.8], [940, 664, 0.72], [1010, 712, 0.85], [1088, 650, 0.7], [1660, 768, 0.9],
    [760, 620, 0.62], [1150, 560, 0.55],
  ];
  pines.forEach(([x, y, k], i) => s.push(pine(x, y, k, 800 + i)));
  for (const [x, y, rr, sd] of [[820, 640, 16, 1], [1540, 716, 22, 2], [1000, 594, 12, 3], [700, 716, 14, 4], [1610, 500, 10, 5]] as Array<[number, number, number, number]>) {
    s.push(boulder(x, y, rr, 900 + sd));
  }
  s.push(meadow());
  s.push(trail());
  // Summit cairn + flag ("FIRST", says the flag. Smugly.)
  s.push(boulder(1330, 304, 10, 950));
  s.push(boulder(1318, 300, 7, 951));
  s.push(line([1330, 300], [1330, 222], INK, 5));
  s.push(line([1330, 300], [1330, 222], '#8a6a4a', 2.5));
  s.push(inked('M1331 226Q1352 228 1376 238Q1356 244 1331 252Z', '#d8433a', 2.2));
  s.push(path('M1333 246Q1354 242 1372 238', { stroke: '#a82e28', sw: 2 }));
  s.push(text(1349, 241, 'FIRST', { size: 6, fill: '#fff4d8', weight: 700 }));
  s.push(circle(1330, 220, 3, { fill: '#e8c23a', stroke: INK, sw: 1.5 }));
  s.push(mansion());
  s.push(forestEdge());
  // Grain only where there's ground — the sky layer shows through the rest.
  const clip =
    `<defs><clipPath id="mGround">` +
    `<path d="${poly(MOUNTAIN)}"/>` +
    `<rect x="0" y="764" width="1920" height="136"/>` +
    `<path d="${poly([[-14, 434], [158, 434], [250, 528], [250, 900], [-14, 900]])}"/>` +
    `<rect x="30" y="380" width="58" height="66"/>` +
    `<path d="${poly([[1726, 800], [1740, 640], [1800, 580], [1930, 540], [1930, 900], [1840, 900]])}"/>` +
    FOREST_PUFFS.map(([x, y, rr, sd]) => `<path d="${puff(x, y, rr, rr * 0.9, 7, sd, 0.18)}"/>`).join('') +
    `</clipPath></defs>`;
  s.push(clip);
  s.push(grainOverlay(1920, 900, 0.36, 0.3, 'mGround'));
  return s.join('');
}

const MOUNTAIN_SKY = mountainSky();
const MOUNTAIN_TERRAIN = mountainTerrain();

/** A soft cloud shadow (360×140 layer, tweened across the meadow). */
const CLOUD_SHADOW =
  defs(radial('mShadow', 180, 70, 172, [[0, '#14281a', 0.24], [0.6, '#14281a', 0.18], [1, '#14281a', 0]], 54)) +
  ellipse(180, 70, 172, 54, { fill: 'url(#mShadow)' });

/** The canteen lying in the grass (54×44 layer at 466,800). */
const CANTEEN = group(
  [
    ellipse(2, 15, 16, 3.5, { fill: '#1e2a14', opacity: 0.4 }),
    path('M-6 -10Q-14 -16 -10 -20', { stroke: '#7a5a34', sw: 2.4 }),
    ellipse(0, 2, 12, 13, { fill: '#5f8a4a', stroke: INK, sw: 2.2 }),
    path('M-6 10A11 11 0 0 0 10 6A12 12 0 0 1 -6 12Z', { fill: '#456a35' }),
    rect(-8, -1, 16, 5, { fill: '#ece2c0', stroke: INK, sw: 1.4 }, 1),
    rect(-3.5, -15, 7, 5.5, { fill: '#3e3a40', stroke: INK, sw: 1.8 }, 1),
    path('M-8 -5A9 9 0 0 1 -2 -9', { stroke: '#a8d090', sw: 1.8, opacity: 0.8 }),
  ],
  'translate(26 22) rotate(17)'
);

export const mountainRoom: RoomDef = {
  id: 'mountain',
  name: 'The Mountain',
  features: [
    'a large scrolling outdoor room with a parallax sky',
    'a non-linear scale map (you shrink climbing the trail)',
    'a camera zoom-out (look at the view from the summit)',
    'an optional second playable character (Pia)',
    'ambient wildlife (a bird crossing the sky)',
  ],

  assets: MOUNTAIN_ASSETS, // the bird spritesheet, loaded on first entry

  size: { w: 1920, h: 900 },
  music: 'mountain-theme',

  layers: [
    // The sky canvas is oversized (2320×1200, placed at -200,-150): a parallax
    // layer drifts against the world by scroll*(1-parallax), and camera
    // zoom-outs raise the minimum scroll, so an exactly-room-sized layer would
    // expose its edges. Content is drawn in room coords via a translate.
    { id: 'sky', depth: Layer.BEHIND, parallax: 0.8, x: -200, y: -150, w: 2320, h: 1200, svg: MOUNTAIN_SKY },
    { id: 'terrain', depth: Layer.BEHIND, svg: MOUNTAIN_TERRAIN },
    // A canteen lying in the grass, until someone picks it up.
    {
      id: 'canteen',
      depth: Layer.BEHIND,
      x: 466,
      y: 800,
      w: 54,
      h: 44,
      svg: CANTEEN,
      visible: (state) => !state.getFlag('canteenTaken'),
    },
    // Drifts across the meadow via an ambient tween; above terrain, below actors.
    { id: 'cloud-shadow', depth: Layer.BEHIND, x: -400, y: 700, w: 360, h: 140, svg: CLOUD_SHADOW },
    // Crosses the sky via an ambient tween; in front so it passes "close by".
    { id: 'bird', depth: Layer.FRONT, anim: 'bird-flap', x: -100, y: 180 },
  ],

  // Scale map: the higher (and further "into" the scene) you climb, the
  // smaller you get — non-linear, so the summit shrink is more dramatic.
  scaling: (_x, y) => {
    const t = Math.max(0, Math.min(1, (y - 270) / 600));
    return 0.26 + 0.84 * t * t * (3 - 2 * t); // smoothstep
  },

  // Meadow + three switchback legs + two ledges + summit, one polygon.
  walkArea: [
    { x: 80, y: 790 },
    { x: 1180, y: 790 },
    { x: 1430, y: 610 },
    { x: 1470, y: 610 },
    { x: 700, y: 466 },
    { x: 560, y: 466 },
    { x: 560, y: 430 },
    { x: 600, y: 430 },
    { x: 1120, y: 316 },
    { x: 1080, y: 316 },
    { x: 1080, y: 280 },
    { x: 1400, y: 280 },
    { x: 1400, y: 316 },
    { x: 1230, y: 316 },
    { x: 710, y: 430 },
    { x: 860, y: 430 },
    { x: 860, y: 466 },
    { x: 1630, y: 610 },
    { x: 1640, y: 610 },
    { x: 1640, y: 650 },
    { x: 1500, y: 650 },
    { x: 1250, y: 790 },
    { x: 1820, y: 790 },
    { x: 1850, y: 870 },
    { x: 80, y: 870 },
  ],

  entries: {
    fromDoor: { x: 170, y: 812, facing: 'right' },
    fromForest: { x: 1780, y: 800, facing: 'left' },
  },

  // Pia is a fellow climber at the summit — talk to her and she joins the
  // party. Once she's a party member she's spawned from her saved position,
  // not this placement (the engine skips party members here).
  actors: [{ id: 'pia', x: 1180, y: 300, facing: 'right' }],

  ambients: [
    {
      every: [8000, 15000],
      run: async (ctx) => {
        const bird = ctx.layerObj('bird');
        const y = 120 + Math.random() * 260;
        bird.setPosition(-60, y);
        await ctx.tween(bird, { x: 2000, y: y + 30 + Math.random() * 60 }, 5500 + Math.random() * 2000);
        bird.setPosition(-100, 180);
      },
    },
    {
      every: [12000, 22000],
      run: async (ctx) => {
        const shadow = ctx.layerObj('cloud-shadow');
        shadow.setPosition(-380, 660 + Math.random() * 120);
        await ctx.tween(shadow, { x: 2000 }, 15000);
        shadow.setPosition(-400, 700);
      },
    },
  ],

  // First-visit reveal cutscene (skippable with Esc, like all cutscenes).
  async onEnter(ctx) {
    await ctx.once('mountain-intro', async () => {
      await ctx.wait(400);
      await ctx.playerSay('Fresh air. Judgmental altitude.');
      await ctx.zoomCamera(0.55, 1600);
      await ctx.wait(900);
      await ctx.zoomCamera(1, 1200);
      await ctx.playerSay("And I'm going to climb that. For no reason whatsoever.");
    });
  },

  regions: [
    // Walk-on trigger at the foot of the trail: fires the first time the
    // player steps onto leg 1, never from the meadow below it.
    {
      id: 'trailhead',
      rect: { x: 1190, y: 744, w: 120, h: 44 },
      once: true,
      onEnter: async (ctx) => {
        ctx.setFlag('trailClimbed');
        await ctx.playerSay('Here we go. Cardio.');
      },
    },
  ],

  hotspots: [
    // A canteen in the meadow (picked up by whoever is active).
    // A path into the woods at the far edge of the meadow.
    {
      id: 'forest-path',
      name: 'edge of the woods',
      rect: { x: 1760, y: 700, w: 160, h: 170 },
      walkTo: { x: 1790, y: 800 },
      facing: 'right',
      defaultVerb: 'open',
      on: {
        lookat: 'A dark treeline. A path disappears into the woods. Ominous!',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('forest', 'fromMountain');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('forest', 'fromMountain');
        },
      },
    },
    {
      id: 'canteen',
      name: 'canteen',
      rect: { x: 470, y: 806, w: 44, h: 34 },
      walkTo: { x: 492, y: 828 },
      facing: 'down',
      defaultVerb: 'pickup',
      visible: (state) => !state.getFlag('canteenTaken'),
      on: {
        lookat: 'A canteen someone left in the grass. Finders keepers.',
        pickup: async (ctx) => {
          ctx.setFlag('canteenTaken');
          ctx.addItem('canteen');
          ctx.repaint();
        },
      },
    },
    // Pia — talk to recruit her; give her the canteen for a reward. Once she
    // joins, a plain click switches to her and she can carry her own items.
    {
      id: 'pia',
      name: 'Pia',
      actor: 'pia',
      defaultVerb: 'talkto',
      on: {
        lookat: 'A fellow climber, admiring the view and guarding the summit.',
        talkto: async (ctx) => {
          if (!ctx.flag('piaJoined')) {
            await ctx.say('pia', 'Made it! Took you long enough.');
            await ctx.playerSay('Who are you?');
            await ctx.say('pia', "Pia. I climb things. Want a partner? Two explorers, twice the reach.");
            await ctx.playerSay('Sure — welcome aboard.');
            ctx.setFlag('piaJoined');
            ctx.addToParty('pia');
            await ctx.say('pia', 'Click my portrait (or press 2) to take over. Oh — and I am parched.');
          } else if (!ctx.flag('piaThanked')) {
            await ctx.say('pia', 'Still parched. Got anything to drink up here?');
          } else {
            await ctx.say('pia', 'Best climb all week. Onward, partner.');
          }
        },
      },
      onItem: {
        give: {
          canteen: async (ctx) => {
            ctx.removeItem('canteen');
            ctx.sfx('pickup');
            await ctx.say('pia', 'Water! You beautiful genius.');
            await ctx.wait(300);
            ctx.setFlag('piaThanked');
            ctx.addItem('medal'); // she rewards whoever handed it over
            await ctx.say('pia', "Here — the summit medal. You earned half of it.");
            await ctx.playerSay('...Which half?');
            await ctx.say('pia', 'The heavy half.');
          },
        },
      },
    },
    {
      id: 'mansion-door',
      name: 'front door',
      rect: { x: 84, y: 634, w: 96, h: 160 },
      walkTo: { x: 140, y: 805 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The door back inside, where the oxygen lives.',
        // The parting line belongs to this door only (not the forest path),
        // and only once the calves have actually earned it on the trail.
        open: async (ctx) => {
          ctx.sfx('open');
          if (ctx.flag('trailClimbed')) {
            await ctx.once('mountain-outro', () =>
              ctx.playerSay('Back inside. My calves will remember this.')
            );
          }
          await ctx.goToRoom('stairhall', 'fromOutside');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          if (ctx.flag('trailClimbed')) {
            await ctx.once('mountain-outro', () =>
              ctx.playerSay('Back inside. My calves will remember this.')
            );
          }
          await ctx.goToRoom('stairhall', 'fromOutside');
        },
      },
    },
    {
      id: 'flag',
      name: 'summit flag',
      rect: { x: 1300, y: 215, w: 90, h: 95 },
      walkTo: { x: 1320, y: 300 },
      facing: 'up',
      on: {
        lookat: "Someone beat me up here. The flag just says 'FIRST'. Smug.",
        pickup: "It's wedged between two rocks and a century of spite.",
        pull: 'It flies for all of us now. Mostly for whoever planted it.',
      },
    },
    {
      id: 'vista',
      name: 'the view',
      rect: { x: 900, y: 60, w: 500, h: 145 },
      walkTo: { x: 1150, y: 300 },
      facing: 'left',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('Behold: geography.');
          await ctx.zoomCamera(0.5, 1400);
          await ctx.wait(1300);
          await ctx.zoomCamera(1, 1000);
          await ctx.playerSay('Worth every switchback.');
        },
      },
    },
    {
      id: 'trail',
      name: 'trail',
      polygon: [
        { x: 1180, y: 790 },
        { x: 1430, y: 620 },
        { x: 1500, y: 655 },
        { x: 1250, y: 790 },
      ],
      on: {
        lookat: 'A switchback trail. Designed by a sadist with a protractor.',
      },
    },
  ],
};
