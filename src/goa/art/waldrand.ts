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
  radial,
  rect,
  rng,
  text,
  vignette,
  wobble,
  type Pt,
} from '../../game/art/toon';

/**
 * The edge of the forest at dusk, after the demo's Whispering Wood: layered
 * tree silhouettes against the last light, a path leading into the woods —
 * and right where it enters them, a barrier: Baumfällarbeiten, Durchgang
 * verboten. Felled trunks lie stacked beside it. Somewhere behind the trees
 * the Goa's lights pulse in time with a bass you can just about hear.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

export const WR = {
  /** Where the path disappears into the woods (and the barrier stands). */
  mouth: { x: 430, y: 330 },
  barrier: { x: 360, base: 362 },
  logs: { x: 160, y: 300, w: 190, h: 56 },
  sign: { x: 520, y: 254 },
  glow: { x: 330, y: 236 },
  /** The foreground tree's trunk (an occluder layer). */
  tree: { x: 0, y: 0, w: 220, h: 450, base: 436 },
};

/** A scalloped outline — round bumps joined by arcs around an ellipse. */
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
    const rr = (Math.hypot(b[0] - a[0], b[1] - a[1]) * puffiness * (0.9 + r() * 0.25)).toFixed(1);
    d += `A${rr} ${rr} 0 0 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

/** A stylized fir silhouette: stacked, slightly drooping tiers. */
function fir(x: number, base: number, h: number, w: number, seed: number): string {
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

function roundTree(x: number, base: number, h: number, w: number, seed: number): string {
  const trunk = poly([[x - w * 0.07, base], [x - w * 0.04, base - h * 0.55], [x + w * 0.04, base - h * 0.55], [x + w * 0.07, base]]);
  return trunk + scallop(x, base - h * 0.64, w / 2, h * 0.34, 8, seed);
}

function fern(x: number, y: number, size: number, seed: number, color = '#2a4a3a'): string {
  const r = rng(seed);
  const s: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.92 + (i / 5) * Math.PI * 0.84 + (r() - 0.5) * 0.15;
    const len = size * (0.75 + r() * 0.35);
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len * 0.7;
    const mx = x + Math.cos(a) * len * 0.55;
    const my = y + Math.sin(a) * len * 0.385 - size * 0.18;
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

/** The barrier across the path: a striped trestle, the forestry office's
 *  sign, a flashing lamp, a traffic cone. Drawn around (x, base). */
function barrier(x: number, base: number): string {
  const s: string[] = [];
  const board = (y: number, h: number) => {
    const b: string[] = [inked(poly([[x, y], [x + 120, y], [x + 120, y + h], [x, y + h]]), '#f4efe4', 1.8)];
    for (let k = 0; k < 10; k++) {
      const x0 = x + k * 12;
      b.push(path(poly([[Math.min(x + 120, x0 + 6), y], [Math.min(x + 120, x0 + 12), y], [Math.min(x + 120, x0 + 6), y + h], [x0, y + h]]), { fill: '#d8322a' }));
    }
    b.push(path(poly([[x, y], [x + 120, y], [x + 120, y + h], [x, y + h]]), { stroke: INK, sw: 1.8 }));
    return b.join('');
  };
  for (const lx of [x + 10, x + 110]) s.push(path(`M${lx - 7} ${base}L${lx} ${base - 46}L${lx + 7} ${base}`, { stroke: INK, sw: 4 }) + path(`M${lx - 7} ${base}L${lx} ${base - 46}L${lx + 7} ${base}`, { stroke: '#e8e2d8', sw: 2 }));
  s.push(board(base - 44, 10));
  s.push(board(base - 24, 9));
  // Chains to the trees either side.
  s.push(path(`M${x} ${base - 38}Q${x - 30} ${base - 30} ${x - 52} ${base - 44}M${x + 120} ${base - 38}Q${x + 150} ${base - 30} ${x + 176} ${base - 46}`, { stroke: '#8a8a9a', sw: 2, extra: 'stroke-dasharray="3 2"' }));
  // Flashing lamp.
  s.push(inked(`M${x + 104} ${base - 44}v-10h12v10z`, '#ffb020', 1.6));
  s.push(glow('wrBlinkStatic', x + 110, base - 50, 18, '#ffb020', 0.5));
  // Traffic cones.
  for (const cx of [x - 22, x + 140]) {
    s.push(inked(`M${cx - 9} ${base}L${cx - 3} ${base - 26}h6l6 26z`, '#f06a2a', 1.8));
    s.push(path(`M${cx - 6} ${base - 12}h12`, { stroke: '#f4efe4', sw: 3 }));
    s.push(inked(`M${cx - 13} ${base}h26v3h-26z`, '#3a3a3a', 1.2));
  }
  return s.join('');
}

/** The forestry office's sign, on two posts by the barrier. */
function sign(x: number, y: number): string {
  const s: string[] = [];
  for (const px of [x + 10, x + 120]) s.push(inked(`M${px - 3} ${y + 60}V${WR.barrier.base}h6V${y + 60}z`, '#5a4a3a', 1.8));
  s.push(inked(wobble([[x, y], [x + 130, y - 2], [x + 132, y + 64], [x + 2, y + 66]], { seed: 9, wobble: 1 }), '#f6f0e0', 2.4));
  s.push(rect(x + 6, y + 5, 120, 16, { fill: '#d8322a' }));
  s.push(text(x + 66, y + 17, 'BAUMFÄLLARBEITEN', { size: 10.5, fill: '#ffffff', weight: 900 }));
  s.push(text(x + 66, y + 34, 'Durchgang verboten!', { size: 10, fill: INK, weight: 800 }));
  s.push(text(x + 66, y + 47, 'Lebensgefahr', { size: 9, fill: '#c4241a', weight: 800 }));
  s.push(text(x + 66, y + 59, 'Forstamt Tübingen', { size: 7, fill: '#4a4a4a', weight: 700 }));
  // A warning triangle with a falling tree.
  s.push(inked(`M${x + 120} ${y - 30}l14 24h-28z`, '#f2c230', 1.8));
  s.push(path(`M${x + 116} ${y - 12}l10 -8M${x + 121} ${y - 16}l3 3`, { stroke: INK, sw: 1.8 }));
  return s.join('');
}

/** The felled trunks, stacked beside the path: cut ends with year rings. */
function logs(): string {
  const { x, y, w, h } = WR.logs;
  const s: string[] = [];
  s.push(ellipse(x + w / 2, y + h + 2, w / 2 + 10, 6, { fill: '#000000', opacity: 0.35 }));
  const rows: Array<[number, number, number]> = [];
  for (let k = 0; k < 4; k++) rows.push([x + 10 + k * 40, y + h - 16, 17]);
  for (let k = 0; k < 3; k++) rows.push([x + 30 + k * 40, y + h - 44, 16]);
  rows.push([x + 70, y + h - 70, 15]);
  // The trunks' long sides, receding to the left.
  for (const [cx, cy, r] of rows) s.push(inked(`M${cx} ${cy - r}L${cx - 70} ${cy - r - 6}L${cx - 70} ${cy + r - 6}L${cx} ${cy + r}Z`, '#5a3e2a', 2));
  for (const [cx, cy, r] of rows) {
    s.push(circle(cx, cy, r, { fill: '#e8c890', stroke: INK, sw: 2.2 }));
    s.push(circle(cx, cy, r * 0.7, { stroke: '#c8a060', sw: 1.2 }));
    s.push(circle(cx, cy, r * 0.42, { stroke: '#c8a060', sw: 1.2 }));
    s.push(circle(cx, cy, r * 0.15, { fill: '#a87a40' }));
  }
  // Spray-painted numbers, forestry style.
  s.push(text(x + 50, y + h - 12, '17', { size: 9, fill: '#e83a8a', weight: 900 }));
  s.push(text(x + 110, y + h - 40, 'X', { size: 11, fill: '#e83a8a', weight: 900 }));
  return s.join('');
}

export function waldrandBg(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(71),
      linear('wrSky', 0, 0, 0, 320, [
        [0, '#14143a'],
        [0.45, '#3a2a6a'],
        [0.8, '#a04a7a'],
        [1, '#f08a5a'],
      ]),
      linear('wrFog', 0, 200, 0, 330, [
        [0, '#8a6aa8', 0],
        [0.7, '#8a6aa8', 0.3],
        [1, '#8a6aa8', 0.05],
      ]),
      linear('wrFloor', 0, 300, 0, 450, [
        [0, '#3a3a4a'],
        [0.4, '#2a3030'],
        [1, '#161c1c'],
      ]),
      linear('wrPath', 0, 320, 0, 450, [
        [0, '#7a6a6a'],
        [1, '#4a3a34'],
      ])
    )
  );
  s.push(rect(0, 0, 960, 330, { fill: 'url(#wrSky)' }));
  // The first stars, the moon coming up.
  const r = rng(5);
  for (let i = 0; i < 30; i++) s.push(circle(r() * 960, r() * 150, 0.8 + r() * 0.8, { fill: '#fff6e0', opacity: 0.5 + r() * 0.4 }));
  s.push(circle(800, 70, 22, { fill: '#f4ecd0' }));
  s.push(glow('wrMoon', 800, 70, 70, '#fff0c0', 0.3));
  s.push(path(scallop(250, 60, 140, 18, 8, 3), { fill: '#5a3a7a', opacity: 0.8 }));
  s.push(path(scallop(640, 104, 120, 14, 7, 5), { fill: '#7a4a7a', opacity: 0.7 }));
  // Far treeline, pale in the dusk haze.
  {
    const rr = rng(31);
    let d = '';
    for (let x = -20; x < 990; x += 34 + rr() * 18) d += rr() < 0.7 ? fir(x, 316, 110 + rr() * 70, 46 + rr() * 20, Math.floor(rr() * 1000)) : roundTree(x, 316, 120 + rr() * 50, 80 + rr() * 30, Math.floor(rr() * 1000));
    s.push(path(d, { fill: '#4a3a6a' }));
  }
  s.push(rect(0, 180, 960, 140, { fill: 'url(#wrFog)' }));
  // Mid treeline: darker, ink-edged.
  {
    const rr = rng(47);
    let d = '';
    for (let x = 10; x < 980; x += 66 + rr() * 40) d += rr() < 0.65 ? fir(x, 324, 170 + rr() * 60, 66 + rr() * 22, Math.floor(rr() * 1000)) : roundTree(x, 324, 170 + rr() * 40, 96 + rr() * 24, Math.floor(rr() * 1000));
    s.push(path(d, { stroke: '#0e0e1e', sw: 5 }));
    s.push(path(d, { fill: '#22223a' }));
  }
  // Near trunks, rim-lit by the last of the sun on the right.
  for (const [x, w, lean] of [[296, 26, -8], [366, 18, 6], [520, 22, -4], [610, 30, 10], [700, 18, -6]] as Array<[number, number, number]>) {
    s.push(inked(wobble([[x - w / 2, 322], [x - w * 0.36 + lean, -10], [x + w * 0.36 + lean, -10], [x + w / 2, 322]], { seed: x, wobble: 2 }), '#1c1a2a', 2.5));
    s.push(path(`M${x + w * 0.3} 310L${x + w * 0.25 + lean} 30`, { stroke: '#a05a7a', sw: 2, opacity: 0.6 }));
  }
  s.push(rect(0, 270, 960, 60, { fill: 'url(#wrFog)', opacity: 0.5 }));
  // The forest floor and the path, from the bridge (right) into the woods.
  s.push(inked('M-10 318Q240 312 480 318Q720 324 970 316L970 460L-10 460Z', 'url(#wrFloor)', 3));
  s.push(inked(wobble([[402, 326], [470, 326], [560, 352], [700, 384], [970, 392], [970, 446], [640, 446], [520, 404], [440, 368], [380, 346]], { seed: 61, wobble: 3 }), 'url(#wrPath)', 3));
  s.push(path('M430 334Q470 360 560 392M480 334Q560 360 690 400', { stroke: '#3a2a24', sw: 2.6, opacity: 0.7 }));
  // Tyre tracks of the forestry machines, deep in the mud.
  s.push(path('M600 372Q760 396 960 402M610 388Q770 412 960 418', { stroke: '#2a201a', sw: 5, opacity: 0.6, extra: 'stroke-dasharray="6 3"' }));
  // Stumps, fresh sawdust.
  for (const [x, y, k] of [[640, 336, 1], [720, 344, 0.8], [130, 360, 1.1]] as Array<[number, number, number]>) {
    s.push(inked(`M${x - 14 * k} ${y}V${y - 12 * k}h${28 * k}V${y}Z`, '#5a3e2a', 2));
    s.push(ellipse(x, y - 12 * k, 14 * k, 4.5 * k, { fill: '#e8c890', stroke: INK, sw: 1.8 }));
    s.push(ellipse(x, y - 12 * k, 8 * k, 2.4 * k, { stroke: '#c8a060', sw: 1 }));
    s.push(ellipse(x + 18 * k, y + 2, 14 * k, 3, { fill: '#e8c890', opacity: 0.5 }));
  }
  s.push(logs());
  s.push(sign(WR.sign.x, WR.sign.y));
  s.push(barrier(WR.barrier.x, WR.barrier.base));
  // Undergrowth.
  s.push(fern(250, 372, 34, 81));
  s.push(fern(880, 360, 40, 82, '#2a4434'));
  s.push(fern(560, 446, 48, 83));
  {
    const rr = rng(91);
    for (let i = 0; i < 34; i++) {
      const x = rr() * 960;
      const y = 326 + rr() * 120;
      if (x > 380 && x < 980 && y > 340 + (x - 400) * 0.08 && y < 446) continue;
      s.push(tuft(x, y, 7 + rr() * 9, i, rr() < 0.5 ? '#3a5a3e' : '#2a4a3a'));
    }
  }
  // The way back, signposted.
  s.push(inked('M912 330L918 330L920 392L910 392Z', '#5a4030', 2.2));
  s.push(inked(wobble([[870, 334], [936, 330], [946, 342], [936, 354], [872, 356]], { seed: 71, wobble: 1 }), '#8a6440', 2.2));
  s.push(text(906, 348, 'NECKAR →', { size: 8, fill: '#2a1a10', rotate: -2 }));
  s.push(vignette('wrVig', 960, 450, 0.5, '#0a0618'));
  s.push(grainOverlay(960, 450, 0.38, 0.3));
  return s.join('');
}

/** The Goa's lights behind the trees: a pulsing coloured haze (its own layer,
 *  so an ambient can make it throb with the bass). */
export function goaGlow(): string {
  const { x, y } = WR.glow;
  return (
    `<defs>${radial('wrGoa', x, y, 150, [[0, '#ff5ab4', 0.75], [0.35, '#b06aff', 0.4], [0.7, '#4ae8ff', 0.15], [1, '#4ae8ff', 0]], 90)}</defs>` +
    ellipse(x, y, 150, 90, { fill: 'url(#wrGoa)' }) +
    // Laser beams fanning up out of the woods.
    [[-70, '#4ae8ff'], [-30, '#8aff5a'], [10, '#ff5ab4'], [50, '#ffd34a']].map(([a, c]) => {
      const rad = ((Number(a) - 90) * Math.PI) / 180;
      return path(`M${x} ${y + 30}L${x + Math.cos(rad) * 260} ${y + 30 + Math.sin(rad) * 260}`, { stroke: String(c), sw: 2, opacity: 0.5 });
    }).join('')
  );
}

/** A big foreground fir on the left, as an occluder (layer coordinates, WR.tree). */
export function foregroundTree(): string {
  const s: string[] = [];
  const b = WR.tree.base;
  s.push(inked(wobble([[54, b], [70, b - 40], [76, -10], [104, -10], [110, b - 40], [128, b], [96, b - 4], [86, b + 2]], { seed: 13, wobble: 2 }), '#2a2030', 3));
  s.push(path(`M98 ${b - 20}L96 0`, { stroke: '#a05a7a', sw: 2.4, opacity: 0.6 }));
  s.push(path(`M84 ${b - 60}Q88 ${b - 160} 84 ${b - 260}M92 ${b - 30}Q96 ${b - 140} 92 ${b - 300}`, { stroke: '#16101c', sw: 2 }));
  // Drooping fir branches from above.
  for (const [y, w] of [[-20, 200], [40, 180], [100, 150], [160, 110]] as Array<[number, number]>) {
    s.push(inked(`M${90 - w / 2} ${y + 40}Q90 ${y - 10} ${90 + w / 2} ${y + 40}Q90 ${y + 26} ${90 - w / 2} ${y + 40}Z`, '#1a2a24', 2.4));
    s.push(path(`M${90 - w / 2 + 10} ${y + 36}Q90 ${y + 2} ${90 + w / 2 - 10} ${y + 36}`, { stroke: '#2e4a3a', sw: 2 }));
  }
  s.push(ellipse(90, b + 2, 56, 5, { fill: '#000000', opacity: 0.35 }));
  return group(s);
}
