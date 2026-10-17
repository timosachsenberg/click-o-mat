import { Layer, type RoomDef } from '../../engine/types';
import { FOREST_ASSETS } from '../assets';
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
  text,
  vignette,
  wobble,
  type Pt,
} from '../art/toon';

/**
 * A stormy forest clearing (single screen). Shows off the weather side of the
 * ambient system: a looping rain overlay plus randomized lightning (a screen
 * flash and thunder that lags behind it) and gusts of wind — all non-blocking,
 * so the player keeps control through the storm.
 */

// ---- art -------------------------------------------------------------------------
// Moody night-storm palette: layered silhouettes that pale into the rain-fog
// with distance, a muddy clearing whose puddles catch the sky, and two gnarly
// foreground trees as occluder layers. Light (such as it is) comes from the
// storm-lit sky, upper left.

/** A scalloped outline — round bumps joined by arcs around an ellipse: the
 *  classic cartoon foliage clump / cloud edge. */
function scallop(cx: number, cy: number, rx: number, ry: number, n: number, seed: number, puffiness = 0.7): string {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + (r() - 0.5) * 0.5) / n) * Math.PI * 2;
    const k = 0.9 + r() * 0.15;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const rr = (chord * puffiness * (0.9 + r() * 0.25)).toFixed(1);
    d += `A${rr} ${rr} 0 0 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

/** A stylized pine silhouette: stacked, slightly drooping tiers. */
function pine(x: number, base: number, h: number, w: number, seed: number): string {
  const r = rng(seed);
  const tiers = 4;
  const pts: Pt[] = [[x + (r() - 0.5) * 3, base - h]];
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers;
    const y = base - h + h * t * 0.92;
    const hw = (w / 2) * (0.35 + 0.65 * t);
    pts.push([x + hw + r() * 3, y + 3]);
    if (i < tiers) pts.push([x + hw * 0.45, y - h * 0.06]);
  }
  pts.push([x + 3, base], [x - 3, base]);
  for (let i = tiers; i >= 1; i--) {
    const t = i / tiers;
    const y = base - h + h * t * 0.92;
    const hw = (w / 2) * (0.35 + 0.65 * t);
    if (i < tiers) pts.push([x - hw * 0.45, y - h * 0.06]);
    pts.push([x - hw - r() * 3, y + 3]);
  }
  return poly(pts);
}

/** A round-crowned broadleaf silhouette (trunk + puffy crown). */
function roundTree(x: number, base: number, h: number, w: number, seed: number): string {
  const trunk = poly([
    [x - w * 0.07, base],
    [x - w * 0.04, base - h * 0.55],
    [x + w * 0.04, base - h * 0.55],
    [x + w * 0.07, base],
  ]);
  return trunk + scallop(x, base - h * 0.64, w / 2, h * 0.34, 8, seed);
}

/** Stylized storm cloud bank: a dark body with a pale storm-lit rim on top. */
function stormCloud(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const n = Math.round(rx / 22);
  return (
    path(scallop(cx - 5, cy - 6, rx, ry, n, seed), { fill: '#6c7aa6', opacity: 0.6 }) +
    path(scallop(cx, cy, rx, ry, n, seed), { fill: '#2b3352' }) +
    path(scallop(cx + 8, cy + ry * 0.4, rx * 0.8, ry * 0.5, n - 2, seed + 3), { fill: '#1d2440' })
  );
}

/** A fern: a fan of curved fronds with little leaf ticks. */
function fern(x: number, y: number, size: number, seed: number, color = '#2f5a3a'): string {
  const r = rng(seed);
  const s: string[] = [];
  const fronds = 6;
  for (let i = 0; i < fronds; i++) {
    const a = -Math.PI * 0.92 + (i / (fronds - 1)) * Math.PI * 0.84 + (r() - 0.5) * 0.15;
    const len = size * (0.75 + r() * 0.35);
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len * 0.7;
    const mx = x + Math.cos(a) * len * 0.55;
    const my = y + Math.sin(a) * len * 0.7 * 0.55 - size * 0.18;
    s.push(path(curve([[x, y], [mx, my], [ex, ey]]), { stroke: INK, sw: 4.6 }));
    s.push(path(curve([[x, y], [mx, my], [ex, ey]]), { stroke: color, sw: 2.6 }));
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const px = x + (ex - x) * t;
      const py = y + (ey - y) * t - Math.sin(t * Math.PI) * size * 0.12;
      s.push(line([px, py], [px + Math.cos(a - 0.9) * size * 0.16, py + Math.sin(a - 0.9) * size * 0.16], color, 2));
      s.push(line([px, py], [px + Math.cos(a + 0.9) * size * 0.16, py + Math.sin(a + 0.9) * size * 0.16], color, 2));
    }
  }
  return s.join('');
}

/** A cartoon toadstool, cap leaning a little. */
function mushroom(x: number, y: number, size: number, lean: number): string {
  const k = size;
  return group(
    [
      ellipse(0, 0, 7 * k, 1.8 * k, { fill: '#000000', opacity: 0.35 }),
      inked(`M${-2.2 * k} 0Q${-2.6 * k} ${-5 * k} ${-1.6 * k} ${-8 * k}L${1.6 * k} ${-8 * k}Q${2.6 * k} ${-5 * k} ${2.2 * k} 0Z`, '#e8dcc0', 1.8),
      inked(`M${-7 * k} ${-7 * k}Q${-6 * k} ${-14 * k} 0 ${-14.5 * k}Q${6 * k} ${-14 * k} ${7 * k} ${-7 * k}Q0 ${-5.5 * k} ${-7 * k} ${-7 * k}Z`, '#b8382c', 2),
      path(`M${-1 * k} ${-6.3 * k}Q${5 * k} ${-7 * k} ${6.6 * k} ${-7.3 * k}Q${5.5 * k} ${-11 * k} ${2 * k} ${-13.5 * k}Q${4 * k} ${-9 * k} ${-1 * k} ${-6.3 * k}Z`, { fill: '#7e2018', opacity: 0.6 }),
      circle(-3 * k, -10 * k, 1.3 * k, { fill: '#f4ead0' }),
      circle(1.5 * k, -12 * k, 1 * k, { fill: '#f4ead0' }),
      circle(3.5 * k, -9 * k, 0.9 * k, { fill: '#f4ead0' }),
      path(`M${-5 * k} ${-10 * k}Q${-3 * k} ${-13 * k} 0 ${-13.4 * k}`, { stroke: '#f08070', sw: 1.4 }),
    ],
    `translate(${x} ${y}) rotate(${lean})`
  );
}

/** A tuft of rain-flattened grass blades. */
function tuft(x: number, y: number, h: number, seed: number, color: string): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 3 + (r() - 0.5) * 2;
    const tx = bx + (r() - 0.6) * h * 0.8;
    d += `M${bx.toFixed(1)} ${y}Q${((bx + tx) / 2).toFixed(1)} ${(y - h * 0.6).toFixed(1)} ${tx.toFixed(1)} ${(y - h * (0.6 + r() * 0.4)).toFixed(1)}`;
  }
  return path(d, { stroke: INK, sw: 3.2 }) + path(d, { stroke: color, sw: 1.6 });
}

function forestBg(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(23),
      linear('fSky', 0, 0, 0, 310, [
        [0, '#10152a'],
        [0.55, '#232c48'],
        [1, '#3c4a68'],
      ]),
      linear('fFog', 0, 200, 0, 330, [
        [0, '#8a9cc0', 0],
        [0.7, '#8a9cc0', 0.32],
        [1, '#8a9cc0', 0.05],
      ]),
      linear('fFloor', 0, 296, 0, 450, [
        [0, '#2c3c30'],
        [0.4, '#253425'],
        [1, '#18221a'],
      ]),
      linear('fMud', 0, 300, 0, 450, [
        [0, '#5a4a3c'],
        [1, '#3e3024'],
      ])
    )
  );

  // Sky + storm clouds
  s.push(rect(0, 0, 960, 320, { fill: 'url(#fSky)' }));
  s.push(glow('fSkyLit', 420, 70, 340, '#7f90c8', 0.28, 110));
  s.push(stormCloud(120, 40, 170, 48, 3));
  s.push(stormCloud(520, 28, 220, 46, 7));
  s.push(stormCloud(880, 56, 170, 50, 11));
  s.push(stormCloud(330, 118, 150, 30, 15));
  s.push(stormCloud(720, 130, 140, 28, 19));
  // A distant bolt frozen mid-crackle behind the clouds
  s.push(path('M600 92L590 120L604 122L588 160', { stroke: '#cfe0ff', sw: 3.5, opacity: 0.5 }));
  s.push(path('M600 92L590 120L604 122L588 160', { stroke: '#ffffff', sw: 1.2, opacity: 0.8 }));

  // Far treeline: pale, bluish, half-dissolved in rain
  {
    const r = rng(31);
    let d = '';
    for (let x = -20; x < 990; x += 34 + r() * 18) {
      d += r() < 0.65 ? pine(x, 312, 110 + r() * 70, 46 + r() * 20, Math.floor(r() * 1000)) : roundTree(x, 312, 120 + r() * 50, 80 + r() * 30, Math.floor(r() * 1000));
    }
    s.push(path(d, { fill: '#4a5c7a' }));
  }
  s.push(rect(0, 180, 960, 140, { fill: 'url(#fFog)' }));
  // Mid treeline: darker, crisper, ink-outlined
  {
    const r = rng(47);
    let d = '';
    for (let x = 10; x < 980; x += 70 + r() * 40) {
      d += r() < 0.6 ? pine(x, 318, 160 + r() * 60, 64 + r() * 22, Math.floor(r() * 1000)) : roundTree(x, 318, 170 + r() * 40, 96 + r() * 24, Math.floor(r() * 1000));
    }
    // Stroke under fill: only the merged silhouette gets an ink edge.
    s.push(path(d, { stroke: '#121a22', sw: 5 }));
    s.push(path(d, { fill: '#26363e' }));
  }
  s.push(rect(0, 250, 960, 80, { fill: 'url(#fFog)', opacity: 0.7 }));
  // Near background trunks: tall, rising out of frame, rim-lit on the left
  for (const [x, w, lean] of [[292, 32, -10], [366, 20, 6], [604, 24, -6], [660, 36, 12], [522, 14, 4]] as Array<[number, number, number]>) {
    s.push(inked(wobble([[x - w / 2, 312], [x - w * 0.36 + lean, -10], [x + w * 0.36 + lean, -10], [x + w / 2, 312]], { seed: x, wobble: 2 }), '#1c2628', 2.5));
    s.push(path(`M${x - w * 0.3} 300L${x - w * 0.25 + lean} 20`, { stroke: '#4a5a72', sw: 2, opacity: 0.7 }));
    s.push(path(`M${x + w * 0.12} 290Q${x + w * 0.2 + lean * 0.4} 200 ${x + w * 0.1 + lean * 0.8} 60`, { stroke: '#121a1c', sw: 1.6 }));
    s.push(ellipse(x, 312, w * 0.9, 3, { fill: '#000000', opacity: 0.35 }));
  }
  s.push(rect(0, 270, 960, 50, { fill: 'url(#fFog)', opacity: 0.5 }));

  // Forest floor
  s.push(inked('M-10 300Q240 292 480 298Q720 304 970 296L970 460L-10 460Z', 'url(#fFloor)', 3));
  {
    const r = rng(53);
    for (let i = 0; i < 70; i++) {
      const x = r() * 960;
      const y = 306 + r() * 140;
      s.push(ellipse(x, y, 6 + r() * 14, 1.5 + r() * 2, { fill: r() < 0.5 ? '#334830' : '#1a2618', opacity: 0.7 }));
    }
  }
  // Muddy path down the middle, with a branch out to the left (the way back)
  s.push(inked(wobble([[402, 303], [556, 303], [610, 350], [704, 446], [256, 446], [330, 380], [372, 340]], { seed: 61, wobble: 3 }), 'url(#fMud)', 3));
  s.push(inked(wobble([[340, 372], [300, 368], [150, 386], [40, 384], [-10, 380], [-10, 432], [60, 436], [190, 428], [290, 420]], { seed: 62, wobble: 2.5 }), 'url(#fMud)', 3));
  // Ruts and wet sheen
  s.push(path('M455 312Q430 360 380 440M512 312Q540 360 590 440', { stroke: '#2e2218', sw: 3, opacity: 0.7 }));
  s.push(path('M470 330Q462 350 448 372M522 340Q534 362 546 384', { stroke: '#8a7a68', sw: 1.6, opacity: 0.5 }));
  // Puddles catching the storm light
  for (const [x, y, rx, ry, seed] of [[488, 360, 34, 7, 1], [430, 412, 46, 9, 2], [590, 420, 30, 7, 3], [150, 404, 32, 6, 4]] as Array<[number, number, number, number, number]>) {
    s.push(path(wobble([[x - rx, y], [x - rx * 0.6, y - ry], [x + rx * 0.5, y - ry * 1.1], [x + rx, y], [x + rx * 0.6, y + ry], [x - rx * 0.5, y + ry]], { seed, wobble: 1.2 }), { fill: '#3a4766', stroke: '#241c18', sw: 2 }));
    s.push(path(`M${x - rx * 0.55} ${y - ry * 0.15}L${x + rx * 0.1} ${y - ry * 0.15}`, { stroke: '#a8bce0', sw: 2, opacity: 0.8 }));
    s.push(path(`M${x - rx * 0.2} ${y + ry * 0.3}L${x + rx * 0.45} ${y + ry * 0.3}`, { stroke: '#7f92bc', sw: 1.5, opacity: 0.7 }));
    s.push(ellipse(x + rx * 0.3, y, rx * 0.18, ry * 0.25, { stroke: '#a8bce0', sw: 1, opacity: 0.6 }));
  }

  // Signpost by the way out
  s.push(inked('M26 300L33 300L35 362L24 362Z', '#5a4030', 2.5));
  s.push(inked(wobble([[6, 304], [58, 300], [66, 312], [58, 322], [8, 324]], { seed: 71, wobble: 1 }), '#8a6440', 2.5));
  s.push(text(34, 317, '← MOUNTAIN', { size: 7.5, fill: '#2a1a10', rotate: -3 }));
  s.push(ellipse(30, 363, 14, 3, { fill: '#000000', opacity: 0.35 }));

  // Rocks, roots, ferns, toadstools, grass
  for (const [x, y, w, h, seed] of [[640, 330, 26, 16, 1], [260, 330, 20, 12, 2], [880, 394, 34, 20, 3], [330, 444, 40, 18, 4]] as Array<[number, number, number, number, number]>) {
    s.push(ellipse(x, y + 2, w * 0.6, h * 0.2, { fill: '#000000', opacity: 0.35 }));
    s.push(inked(puff(x, y - h * 0.35, w * 0.5, h * 0.45, 5, seed, 0.12), '#4d5560', 2.2));
    s.push(path(`M${x - w * 0.3} ${y - h * 0.55}Q${x - w * 0.1} ${y - h * 0.75} ${x + w * 0.1} ${y - h * 0.7}`, { stroke: '#8a94a8', sw: 1.6, opacity: 0.8 }));
  }
  s.push(fern(240, 344, 36, 81));
  s.push(fern(690, 340, 32, 82, '#2a5034'));
  s.push(fern(920, 446, 54, 83));
  s.push(fern(40, 452, 48, 84, '#2a5034'));
  s.push(mushroom(266, 352, 1.1, -6));
  s.push(mushroom(282, 356, 0.75, 8));
  s.push(mushroom(668, 352, 0.9, 5));
  s.push(mushroom(560, 446, 1.3, -4));
  s.push(mushroom(584, 448, 0.8, 10));
  {
    const r = rng(91);
    for (let i = 0; i < 34; i++) {
      const x = r() * 960;
      const y = 312 + r() * 135;
      const onPath = Math.abs(x - 480) < 60 + (y - 300) * 1.4;
      if (onPath && y > 330) continue;
      s.push(tuft(x, y, 7 + r() * 9, i, r() < 0.5 ? '#4a6a3e' : '#38563a'));
    }
  }

  // Storm-light from upper left, vignette, grain
  s.push(glow('fFloorLit', 470, 380, 300, '#9fb4e0', 0.12, 70));
  s.push(vignette('fVig', 960, 450, 0.55, '#05070f'));
  s.push(grainOverlay(960, 450, 0.42, 0.34));
  return s.join('');
}

const FOREST_BG = forestBg();

/** A gnarly foreground tree, local to a 200×360 layer canvas. The trunk
 *  base sits near the canvas bottom (local ~350), so the layer depth (its
 *  baseline) and the walk hole match the trunk's footprint. */
function forestTree(seed: number, mirror: boolean): string {
  const r = rng(seed);
  const s: string[] = [];
  // Light comes from the upper left of the screen; when the tree is drawn
  // mirrored, its lighting is authored mirrored too so it lands correctly.
  const lx = mirror ? -1 : 1;
  const fx = (x: number) => (mirror ? 200 - x : x);
  // Trunk: wide flared base with roots, a kink, narrowing into the crown.
  const trunk: Pt[] = [
    [56, 352],
    [78, 340],
    [88, 300],
    [84, 240],
    [92, 190],
    [86, 150],
    [100, 120],
    [116, 150],
    [114, 196],
    [120, 246],
    [116, 302],
    [126, 340],
    [150, 354],
    [118, 350],
    [104, 344],
    [94, 352],
  ];
  const trunkD = wobble(trunk, { seed, wobble: 1.8 });
  // Crown clumps: back (dark) then front (lit from the upper left).
  const back: Array<[number, number, number, number]> = [
    [100, 82, 92, 58],
    [52, 120, 52, 40],
    [150, 118, 50, 40],
  ];
  const front: Array<[number, number, number, number]> = [
    [70, 60, 50, 40],
    [128, 52, 54, 42],
    [100, 26, 46, 26],
    [44, 104, 38, 30],
    [158, 96, 38, 32],
    [100, 118, 48, 30],
  ];
  const clumpD = [...back, ...front].map(([cx, cy, rx, ry], i) => scallop(cx, cy, rx, ry, Math.max(6, Math.round((rx + ry) / 9)), seed * 10 + i));
  s.push(`<defs>${grainDefs(seed)}<clipPath id="treeClip"><path d="${trunkD}"/>${clumpD.map((d) => `<path d="${d}"/>`).join('')}</clipPath></defs>`);

  s.push(inked(trunkD, '#45322a', 3));
  // Cel-shaded right flank
  const shade: Pt[] = [[104, 110], [170, 110], [170, 360], [118, 360], [124, 330], [112, 300], [118, 246], [110, 196], [114, 150]];
  s.push(group(path(poly(shade.map(([x, y]) => [fx(x), y] as Pt)), { fill: '#2a1c16' }), undefined, `clip-path="url(#treeClip)"`));
  // Bark grooves and knot
  s.push(path('M92 330Q96 280 90 236M100 300Q104 250 98 196M108 340Q112 300 108 260', { stroke: '#22160f', sw: 2 }));
  s.push(path(mirror ? 'M114 318Q112 270 116 226' : 'M86 318Q90 270 86 226', { stroke: '#6e5440', sw: 1.6, opacity: 0.8 }));
  s.push(ellipse(98, 236, 6, 9, { fill: '#2a1c16', stroke: INK, sw: 2 }));
  s.push(ellipse(98, 237, 2.5, 4.5, { fill: '#120c08' }));
  // Roots flaring into the ground
  s.push(inked('M60 350Q40 352 26 358L60 358Z', '#45322a', 2.5));
  s.push(inked('M140 352Q166 352 182 360L140 360Z', '#2a1c16', 2.5));
  s.push(ellipse(100, 356, 66, 5, { fill: '#000000', opacity: 0.3 }));
  // Branches reaching into the crown
  s.push(path('M96 160Q70 140 52 116M108 150Q132 128 150 110M100 128Q98 96 104 70', { stroke: INK, sw: 9 }));
  s.push(path('M96 160Q70 140 52 116M108 150Q132 128 150 110M100 128Q98 96 104 70', { stroke: '#45322a', sw: 5 }));

  back.forEach(([cx, cy, rx, ry], i) => {
    s.push(inked(clumpD[i], '#142820', 2.5));
    s.push(path(scallop(cx - rx * 0.15 * lx, cy - ry * 0.2, rx * 0.7, ry * 0.55, 6, seed * 10 + i + 50), { fill: '#1d3628' }));
  });
  front.forEach(([cx, cy, rx, ry], i) => {
    s.push(inked(clumpD[back.length + i], '#22422e', 2.5));
    // Lit top-left lobe and a dark underside, cel style
    s.push(path(scallop(cx + rx * 0.12 * lx, cy + ry * 0.3, rx * 0.78, ry * 0.5, 6, seed * 10 + i + 70), { fill: '#183024' }));
    s.push(path(scallop(cx - rx * 0.22 * lx, cy - ry * 0.25, rx * 0.52, ry * 0.4, 5, seed * 10 + i + 90), { fill: '#33603f' }));
    s.push(path(`M${cx - rx * 0.7 * lx} ${cy - ry * 0.25}Q${cx - rx * 0.5 * lx} ${cy - ry * 0.85} ${cx - rx * 0.05 * lx} ${cy - ry * 0.9}`, { stroke: '#5f8f62', sw: 2, opacity: 0.8 }));
  });
  // Rain drips on the leaves
  for (let i = 0; i < 9; i++) {
    const x = 30 + r() * 140;
    const y = 20 + r() * 110;
    s.push(circle(x, y, 1.3, { fill: '#b8d0f0', opacity: 0.75 }));
  }
  s.push(grainOverlay(200, 360, 0.4, 0.3, 'treeClip'));
  const body = s.join('');
  return mirror ? group(body, 'translate(200 0) scale(-1 1)') : body;
}

const FOREST_TREE_L = forestTree(7, false);
const FOREST_TREE_R = forestTree(13, true);

export const forestRoom: RoomDef = {
  id: 'forest',
  name: 'Whispering Wood',
  features: [
    'scrolling tiled-texture rain in two depth layers',
    'lightning and thunder as non-blocking weather ambients',
    'walk-behind occluder trees',
    'a procedural music theme',
  ],

  assets: FOREST_ASSETS, // the rain tile, loaded on first entry
  music: 'forest-theme',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: FOREST_BG },
    // Occluder trees: actors above the trunk base render behind them.
    { id: 'tree-l', depth: 402, x: 60, y: 60, w: 200, h: 360, svg: FOREST_TREE_L },
    { id: 'tree-r', depth: 428, x: 700, y: 80, w: 200, h: 360, svg: FOREST_TREE_R },
    // Rain: two scrolling TileSprite layers for depth — a faint, small,
    // slower far layer and a brighter, larger, faster near layer. scrollX
    // gives the drops a wind-driven slant of travel.
    {
      id: 'rain-far',
      depth: Layer.FRONT,
      image: 'rain',
      alpha: 0.4,
      tile: { scrollY: 620, scrollX: -70, scale: 0.8 },
    },
    {
      id: 'rain-near',
      depth: Layer.FRONT,
      image: 'rain',
      alpha: 0.55,
      tile: { scrollY: 1080, scrollX: -150, scale: 1.5 },
    },
  ],

  // Clearing between the trees; trunk footprints are carved out.
  walkArea: [
    { x: 60, y: 318 },
    { x: 900, y: 318 },
    { x: 930, y: 445 },
    { x: 30, y: 445 },
  ],
  holes: [
    // tree-l trunk (world ~148-174, base ~402)
    [
      { x: 142, y: 392 },
      { x: 178, y: 392 },
      { x: 178, y: 414 },
      { x: 142, y: 414 },
    ],
    // tree-r trunk (world ~788-814, base ~428)
    [
      { x: 782, y: 418 },
      { x: 820, y: 418 },
      { x: 820, y: 440 },
      { x: 782, y: 440 },
    ],
  ],
  scaling: { yTop: 318, scaleTop: 0.74, yBottom: 445, scaleBottom: 1.05 },

  entries: {
    fromMountain: { x: 480, y: 410, facing: 'down' },
  },

  // Weather: non-blocking, so the storm never takes control from the player.
  ambients: [
    {
      // Lightning — a double-flicker, with thunder lagging behind the light.
      every: [7000, 16000],
      run: async (ctx) => {
        ctx.flash(0xdfe8ff, 110);
        await ctx.wait(70);
        ctx.flash(0xffffff, 90);
        await ctx.wait(500 + Math.random() * 1400); // sound is slower than light
        ctx.sfx('thunder');
      },
    },
    {
      // A gust nudges the trees sideways and back (subtle position sway).
      every: [4000, 9000],
      run: async (ctx) => {
        const l = ctx.layerObj('tree-l');
        const r = ctx.layerObj('tree-r');
        const lx = l.x;
        const rx = r.x;
        await ctx.tween(l, { x: lx - 4, ease: 'Sine.easeInOut' }, 900);
        await ctx.tween(r, { x: rx + 3, ease: 'Sine.easeInOut' }, 700);
        await ctx.tween(l, { x: lx, ease: 'Sine.easeInOut' }, 1100);
        await ctx.tween(r, { x: rx, ease: 'Sine.easeInOut' }, 900);
      },
    },
  ],

  async onEnter(ctx) {
    await ctx.once('forest-intro', async () => {
      await ctx.wait(500);
      await ctx.playerSay('A forest. In a thunderstorm. This is fine.');
      await ctx.wait(200);
      ctx.sfx('thunder');
      await ctx.playerSay('Totally fine.');
    });
  },

  hotspots: [
    {
      id: 'mountain-path',
      name: 'path out',
      rect: { x: 0, y: 316, w: 60, h: 130 },
      walkTo: { x: 70, y: 420 },
      facing: 'left',
      defaultVerb: 'open',
      on: {
        lookat: 'The path back to the mountainside.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromForest');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('mountain', 'fromForest');
        },
      },
    },
    {
      id: 'tree-l',
      name: 'old tree',
      rect: { x: 120, y: 120, w: 120, h: 240 },
      walkTo: { x: 210, y: 420 },
      facing: 'up',
      on: {
        lookat: 'A gnarled old tree. It creaks like it disapproves of me.',
        push: "It's a tree. It wins that contest.",
        pull: 'I am not strong enough to worry a tree.',
      },
    },
    {
      id: 'sky',
      name: 'storm',
      rect: { x: 240, y: 0, w: 480, h: 120 },
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('The sky is auditioning for a horror movie.');
          await ctx.wait(300);
          ctx.flash(0xdfe8ff, 120);
          await ctx.wait(600);
          ctx.sfx('thunder');
        },
      },
    },
  ],
};
