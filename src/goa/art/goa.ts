import type { SvgImageAsset } from '../../engine/types';
import {
  INK,
  circle,
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
  rect,
  rng,
  vignette,
  type Pt,
} from '../../game/art/toon';

/**
 * The Goa itself: a clearing deep in the forest under the full moon, lit by
 * blacklight. A bamboo stage with a huge mandala and the DJ, speaker stacks,
 * a canopy of UV string art fanning out between the trees, giant glowing
 * mushrooms, lasers — and a crowd of colourful dancers, everywhere.
 *
 * The dancers are animation frames (a far strip, and single dancers in two
 * sizes who stand among the player); string fans and mushrooms are exported
 * for the entrance scene too. Room coordinates (960×450), SVG markup.
 */

export const GO = {
  ground: 318,
  stage: { x0: 330, x1: 630, top: 120 },
  floor: { cx: 480, cy: 394, rx: 150, ry: 34 },
};

export const NEON = ['#ff3ab4', '#3ae8ff', '#8aff3a', '#ffe23a', '#b05aff', '#ff7a2a'];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---- blacklight string art ----------------------------------------------------------

/** A fan of glowing threads between two rails (a0→a1 and b0→b1): thread i
 *  runs from the i-th point of one rail to the i-th of the other, so their
 *  envelope bends into a curve — classic UV string art. */
export function stringFan(a0: Pt, a1: Pt, b0: Pt, b1: Pt, n: number, color: string): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const p = lerp(a0, a1, i / n);
    const q = lerp(b0, b1, i / n);
    d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  }
  return path(d, { stroke: color, sw: 3.2, opacity: 0.16 }) + path(d, { stroke: color, sw: 0.9, opacity: 0.95 });
}

// ---- glowing mushrooms ---------------------------------------------------------------

/** A giant glowing mushroom standing on `base`: a neon cap with pale spots,
 *  bright gills, a softly lit stem, and a halo. `id` must be unique per image. */
export function glowShroom(id: string, x: number, base: number, h: number, cap: string, lean = 0): string {
  const w = h * 0.78;
  const cy = base - h * 0.62;
  const sw = h * 0.085;
  const s: string[] = [];
  s.push(glow(id, x, cy, h * 0.95, cap, 0.5));
  // Stem: a little bulge at the foot, a skirt under the cap.
  s.push(inked(`M${x - sw * 1.5} ${base}Q${x - sw * 0.7} ${base - h * 0.3} ${x - sw * 0.8} ${cy}L${x + sw * 0.8} ${cy}Q${x + sw * 0.7} ${base - h * 0.3} ${x + sw * 1.5} ${base}Z`, '#eafff4', Math.max(1.4, h / 40)));
  s.push(path(`M${x + sw * 0.2} ${cy}Q${x + sw * 0.3} ${base - h * 0.3} ${x + sw * 1.2} ${base}L${x + sw * 0.5} ${base}Z`, { fill: cap, opacity: 0.3 }));
  s.push(path(`M${x - sw * 1.2} ${cy + h * 0.1}Q${x} ${cy + h * 0.2} ${x + sw * 1.2} ${cy + h * 0.1}`, { stroke: '#bfeedd', sw: Math.max(1.2, h / 36) }));
  // Gills glowing from below, then the cap.
  s.push(ellipse(x, cy, w * 0.46, h * 0.07, { fill: '#fff6c0', stroke: INK, sw: Math.max(1.2, h / 48) }));
  for (let k = -4; k <= 4; k++) s.push(line([x + k * w * 0.02, cy - h * 0.02], [x + k * w * 0.1, cy + h * 0.05], '#e8c860', Math.max(0.8, h / 80), 0.8));
  const dome = `M${x - w / 2} ${cy}Q${x - w * 0.52} ${cy - h * 0.42} ${x} ${cy - h * 0.4}Q${x + w * 0.52} ${cy - h * 0.42} ${x + w / 2} ${cy}Q${x} ${cy - h * 0.09} ${x - w / 2} ${cy}Z`;
  s.push(inked(dome, cap, Math.max(1.6, h / 34)));
  s.push(path(`M${x + w * 0.1} ${cy - h * 0.39}Q${x + w * 0.48} ${cy - h * 0.36} ${x + w / 2} ${cy}Q${x + w * 0.3} ${cy - h * 0.06} ${x + w * 0.2} ${cy - h * 0.07}Z`, { fill: '#1e1038', opacity: 0.25 }));
  for (const [dx, dy, r] of [[-0.26, -0.2, 0.06], [0.02, -0.29, 0.07], [0.26, -0.17, 0.05], [-0.1, -0.12, 0.04], [0.14, -0.1, 0.035], [-0.36, -0.07, 0.03]] as Array<[number, number, number]>) {
    s.push(ellipse(x + dx * w, cy + dy * h, r * w, r * w * 0.8, { fill: '#ffffff', opacity: 0.92 }));
  }
  s.push(path(`M${x - w * 0.36} ${cy - h * 0.2}Q${x - w * 0.2} ${cy - h * 0.37} ${x - w * 0.02} ${cy - h * 0.37}`, { stroke: '#ffffff', sw: Math.max(1.2, h / 44), opacity: 0.6 }));
  return lean ? group(s, `rotate(${lean} ${x} ${base})`) : s.join('');
}

// ---- the dancers ---------------------------------------------------------------------

interface Look {
  skin: string;
  top: string;
  legs: string;
  hair: string;
  head: 'dreads' | 'bun' | 'hat' | 'bald' | 'long' | 'mohawk';
  arms: 'up' | 'side' | 'pump' | 'wave';
  skirt?: boolean;
}

export const LOOKS: Look[] = [
  { skin: '#e8b890', top: NEON[0], legs: NEON[1], hair: '#ffe23a', head: 'dreads', arms: 'up' },
  { skin: '#8a5a3a', top: NEON[2], legs: NEON[4], hair: '#1e1424', head: 'bun', arms: 'side', skirt: true },
  { skin: '#f2c8a4', top: NEON[3], legs: NEON[0], hair: '#ff7a2a', head: 'long', arms: 'wave' },
  { skin: '#c88a5e', top: NEON[1], legs: NEON[5], hair: '#8aff3a', head: 'mohawk', arms: 'pump' },
  { skin: '#f0d0b0', top: NEON[4], legs: NEON[2], hair: '#3ae8ff', head: 'hat', arms: 'up', skirt: true },
  { skin: '#6a4028', top: NEON[5], legs: NEON[3], hair: '#ffffff', head: 'bald', arms: 'wave' },
  { skin: '#e0a878', top: '#ffffff', legs: NEON[0], hair: '#b05aff', head: 'long', arms: 'side' },
  { skin: '#d89a70', top: NEON[2], legs: NEON[1], hair: '#ff3ab4', head: 'dreads', arms: 'pump', skirt: true },
];

/** Dancer frame box at scale 1; feet at the bottom centre. */
export const DW = 56;
export const DH = 100;

/** One dancer, one of four frames of the stomp: sway, bounce, arms. */
export function dancer(L: Look, f: number): string {
  const s: string[] = [];
  const fx = DW / 2;
  const sway = [-3, 0, 3, 0][f % 4];
  const bounce = [0, -4, 0, -4][f % 4];
  const hip: Pt = [fx + sway, 62 + bounce];
  const sh: Pt = [fx + sway * 1.7, 38 + bounce];
  const head: Pt = [fx + sway * 2.2, 25 + bounce];
  const limb = (pts: Pt[], color: string, w: number) => {
    const d = poly(pts, false);
    return path(d, { stroke: INK, sw: w + 2.6 }) + path(d, { stroke: color, sw: w });
  };
  // A pool of their own colour on the ground.
  s.push(ellipse(fx, DH - 4, 17, 4, { fill: L.top, opacity: 0.3 }));
  // Legs: stomping alternately.
  const lift = f % 4 === 1 ? [7, 0] : f % 4 === 3 ? [0, 7] : [0, 0];
  [-1, 1].forEach((side, i) => {
    const foot: Pt = [fx + side * 8, DH - 6 - lift[i]];
    const knee: Pt = [hip[0] + side * (6 + lift[i] * 0.5), (hip[1] + foot[1]) / 2 - lift[i] * 0.4];
    s.push(limb([[hip[0] + side * 4, hip[1]], knee, foot], L.legs, 5));
    s.push(ellipse(foot[0] + side * 2, foot[1] + 1.5, 5, 2.6, { fill: '#f4efe4', stroke: INK, sw: 1.2 }));
  });
  // Torso (and a twirling skirt).
  s.push(inked(poly([[sh[0] - 9, sh[1]], [sh[0] + 9, sh[1]], [hip[0] + 7, hip[1] + 2], [hip[0] - 7, hip[1] + 2]]), L.top, 1.8));
  if (L.skirt) s.push(inked(poly([[hip[0] - 7, hip[1] - 2], [hip[0] + 7, hip[1] - 2], [hip[0] + 13 + sway, hip[1] + 13], [hip[0] - 13 + sway, hip[1] + 13]]), L.legs, 1.6));
  // UV body paint: a spiral on the chest.
  s.push(circle((sh[0] + hip[0]) / 2, (sh[1] + hip[1]) / 2, 3.4, { stroke: '#ffffff', sw: 1.2, opacity: 0.9 }));
  // Arms.
  const a = f % 2;
  const hands: [Pt, Pt] =
    L.arms === 'up'
      ? [[sh[0] - 13 - sway, sh[1] - 22 + a * 5], [sh[0] + 13 - sway, sh[1] - 24 + (1 - a) * 5]]
      : L.arms === 'side'
        ? [[sh[0] - 22, sh[1] + (a ? -8 : 6)], [sh[0] + 22, sh[1] + (a ? 6 : -8)]]
        : L.arms === 'pump'
          ? [[sh[0] - 12, sh[1] + 16], [sh[0] + 10 + a * 2, sh[1] - 22 + a * 9]]
          : [[sh[0] - 18 + a * 6, sh[1] - 18], [sh[0] + 18 - a * 6, sh[1] - 16]];
  [-1, 1].forEach((side, i) => {
    const shoulder: Pt = [sh[0] + side * 9, sh[1] + 2];
    const elbow: Pt = [(shoulder[0] + hands[i][0]) / 2 + side * 4, (shoulder[1] + hands[i][1]) / 2 + 2];
    s.push(limb([shoulder, elbow, hands[i]], L.skin, 4));
    // A glow bracelet.
    s.push(circle(hands[i][0], hands[i][1], 3.2, { fill: L.skin, stroke: NEON[(i * 3 + LOOKS.indexOf(L)) % 6], sw: 1.8 }));
  });
  // Head, hair, a blissful face.
  const [hx, hy] = head;
  if (L.head === 'long') s.push(inked(`M${hx - 9} ${hy - 4}Q${hx - 13 - sway} ${hy + 14} ${hx - 9} ${hy + 20}L${hx + 9} ${hy + 20}Q${hx + 13 - sway} ${hy + 14} ${hx + 9} ${hy - 4}Z`, L.hair, 1.6));
  s.push(circle(hx, hy, 8.5, { fill: L.skin, stroke: INK, sw: 1.8 }));
  s.push(path(`M${hx - 5} ${hy - 1}q2 -2.4 4 0M${hx + 1} ${hy - 1}q2 -2.4 4 0`, { stroke: INK, sw: 1.3 }));
  s.push(path(`M${hx - 3.4} ${hy + 3}Q${hx} ${hy + 6.6} ${hx + 3.4} ${hy + 3}`, { stroke: INK, sw: 1.3 }));
  s.push(circle(hx - 5.4, hy + 2.6, 1.3, { fill: NEON[LOOKS.indexOf(L) % 6] }) + circle(hx + 5.4, hy + 2.6, 1.3, { fill: NEON[(LOOKS.indexOf(L) + 2) % 6] }));
  switch (L.head) {
    case 'dreads':
      for (let k = -3; k <= 3; k++) s.push(path(`M${hx + k * 2.6} ${hy - 7}Q${hx + k * 4.4 - sway} ${hy + 2} ${hx + k * 4 - sway * 1.5} ${hy + 12 + (k % 2) * 3}`, { stroke: INK, sw: 4 }) + path(`M${hx + k * 2.6} ${hy - 7}Q${hx + k * 4.4 - sway} ${hy + 2} ${hx + k * 4 - sway * 1.5} ${hy + 12 + (k % 2) * 3}`, { stroke: L.hair, sw: 2.2 }));
      break;
    case 'bun':
      s.push(circle(hx, hy - 11, 5, { fill: L.hair, stroke: INK, sw: 1.5 }) + path(`M${hx - 8.5} ${hy - 2}Q${hx} ${hy - 12} ${hx + 8.5} ${hy - 2}`, { fill: L.hair, stroke: INK, sw: 1.5 }));
      break;
    case 'hat':
      s.push(inked(`M${hx - 10} ${hy - 5}L${hx} ${hy - 24}L${hx + 10} ${hy - 5}Z`, L.hair, 1.6) + circle(hx, hy - 24, 2.4, { fill: '#ffffff', stroke: INK, sw: 1 }));
      break;
    case 'mohawk':
      s.push(inked(`M${hx - 3} ${hy - 7}L${hx - 5} ${hy - 19}L${hx - 1} ${hy - 12}L${hx} ${hy - 22}L${hx + 2} ${hy - 12}L${hx + 5} ${hy - 19}L${hx + 3} ${hy - 7}Z`, L.hair, 1.4));
      break;
    case 'long':
      s.push(path(`M${hx - 8.5} ${hy - 2}Q${hx} ${hy - 13} ${hx + 8.5} ${hy - 2}Q${hx} ${hy - 7} ${hx - 8.5} ${hy - 2}Z`, { fill: L.hair, stroke: INK, sw: 1.4 }));
      break;
    default:
      s.push(path(`M${hx - 5} ${hy - 6}q5 -3 10 0`, { stroke: '#ffffff', sw: 1.4, opacity: 0.7 }));
  }
  return s.join('');
}

/** Frame sets for single dancers, in two sizes ('m' further back, 'l' close). */
export const DANCER_SIZES = { m: 0.82, l: 1.06 } as const;
export type DancerSize = keyof typeof DANCER_SIZES;
export const dancerKey = (v: number, size: DancerSize, f: number) => `goa-dancer-${v}${size}-${f}`;
export const dancerAnim = (v: number, size: DancerSize) => `goa-dance-${v}${size}`;

export const DANCER_FRAMES: SvgImageAsset[] = LOOKS.flatMap((L, v) =>
  (Object.keys(DANCER_SIZES) as DancerSize[]).flatMap((size) =>
    [0, 1, 2, 3].map((f) => ({
      key: dancerKey(v, size, f),
      width: Math.ceil(DW * DANCER_SIZES[size]),
      height: Math.ceil(DH * DANCER_SIZES[size]),
      svg: group(dancer(L, f), `scale(${DANCER_SIZES[size]})`),
    }))
  )
);

/** A strip of small dancers (w×h), frame f: the crowd further back. */
export function crowdStrip(w: number, h: number, count: number, seed: number, f: number, k0 = 0.4, k1 = 0.56): string {
  const r = rng(seed);
  const people: Array<{ x: number; y: number; k: number; v: number; ph: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = r();
    people.push({ x: 14 + r() * (w - 28), y: h - 2 - (1 - t) * (h - DH * k1 - 4) * 0.9, k: k0 + (k1 - k0) * t, v: Math.floor(r() * LOOKS.length), ph: Math.floor(r() * 4) });
  }
  people.sort((a, b) => a.y - b.y);
  return people.map((p) => group(dancer(LOOKS[p.v], (f + p.ph) % 4), `translate(${(p.x - (DW / 2) * p.k).toFixed(1)} ${(p.y - DH * p.k).toFixed(1)}) scale(${p.k.toFixed(2)})`)).join('');
}

/** The far crowd in front of the stage: a 4-frame strip. */
export const FAR = { x: 150, y: 232, w: 660, h: 104 };
export const FAR_FRAMES: SvgImageAsset[] = [0, 1, 2, 3].map((f) => ({ key: `goa-far-${f}`, width: FAR.w, height: FAR.h, svg: crowdStrip(FAR.w, FAR.h, 38, 41, f) }));

// ---- the backdrop --------------------------------------------------------------------

function fir(x: number, base: number, h: number, w: number): string {
  return poly([[x, base - h], [x + w * 0.3, base - h * 0.62], [x + w * 0.18, base - h * 0.62], [x + w * 0.5, base - h * 0.25], [x + w * 0.3, base - h * 0.25], [x + w * 0.6, base], [x - w * 0.6, base], [x - w * 0.3, base - h * 0.25], [x - w * 0.5, base - h * 0.25], [x - w * 0.18, base - h * 0.62], [x - w * 0.3, base - h * 0.62]]);
}

function sky(): string {
  const s: string[] = [rect(0, 0, 960, 330, { fill: 'url(#goSky)' })];
  const r = rng(5);
  for (let i = 0; i < 110; i++) s.push(circle(r() * 960, r() * 230, 0.5 + r() * 1.1, { fill: '#fff6e0', opacity: 0.35 + r() * 0.6 }));
  // The Milky Way as a soft diagonal band, the full moon with a wide halo.
  s.push(path('M-20 150Q300 20 980 60L980 110Q320 80 -20 210Z', { fill: '#b06aff', opacity: 0.1 }));
  s.push(glow('goMoonHalo', 150, 64, 130, '#fff0c0', 0.4));
  s.push(circle(150, 64, 34, { fill: '#f8f0d4' }));
  s.push(circle(138, 54, 6, { fill: '#e2d6b2' }) + circle(160, 76, 5, { fill: '#e2d6b2' }) + circle(164, 52, 3, { fill: '#e2d6b2' }));
  return s.join('');
}

function forest(): string {
  const s: string[] = [];
  const r = rng(13);
  let d = '';
  for (let x = -20; x < 990; x += 38 + r() * 20) d += fir(x, 322, 160 + r() * 90, 72 + r() * 30);
  s.push(path(d, { fill: '#161a3c' }));
  // Big trunks either side, painted with UV spirals.
  for (const [x, w, c] of [[40, 34, NEON[1]], [118, 22, NEON[0]], [862, 26, NEON[2]], [930, 36, NEON[4]]] as Array<[number, number, string]>) {
    s.push(inked(poly([[x - w / 2, 330], [x - w * 0.36, -10], [x + w * 0.36, -10], [x + w / 2, 330]]), '#0c0e1e', 2.4));
    for (let y = 40; y < 320; y += 30) s.push(path(`M${x - w * 0.4} ${y + 14}Q${x} ${y} ${x + w * 0.4} ${y + 14}`, { stroke: c, sw: 2.2, opacity: 0.85 }));
  }
  return s.join('');
}

/** The UV string canopy: fans of thread from the trees to the stage's mast. */
function canopy(): string {
  const mast: Pt = [480, 30];
  const s: string[] = [];
  s.push(stringFan([40, 20], [40, 250], mast, [300, 110], 22, NEON[1]));
  s.push(stringFan([118, 30], [118, 230], [300, 110], [330, 200], 16, NEON[0]));
  s.push(stringFan([930, 20], [930, 250], mast, [660, 110], 22, NEON[2]));
  s.push(stringFan([862, 30], [862, 230], [660, 110], [630, 200], 16, NEON[4]));
  s.push(stringFan([40, 20], [300, 14], [930, 20], [660, 14], 14, NEON[3]));
  s.push(stringFan(mast, [330, 118], mast, [630, 118], 18, NEON[5]));
  // Hanging jellyfish lanterns on the long threads.
  for (const [x, y, c] of [[210, 96, NEON[0]], [300, 62, NEON[3]], [690, 70, NEON[1]], [770, 104, NEON[2]]] as Array<[number, number, string]>) {
    s.push(line([x, y - 26], [x, y - 8], '#2a2a4a', 1.2));
    s.push(circle(x, y, 16, { fill: c, opacity: 0.2 }));
    s.push(inked(`M${x - 10} ${y}Q${x - 10} ${y - 12} ${x} ${y - 12}Q${x + 10} ${y - 12} ${x + 10} ${y}Z`, c, 1.4));
    for (let k = -2; k <= 2; k++) s.push(path(`M${x + k * 4} ${y}q${k % 2 ? 3 : -3} 8 0 16`, { stroke: c, sw: 1.4, opacity: 0.9 }));
  }
  return s.join('');
}

/** The stage: bamboo frame, the great mandala, the DJ behind the decks, speaker stacks. */
function stage(): string {
  const { x0, x1, top } = GO.stage;
  const cx = (x0 + x1) / 2;
  const s: string[] = [];
  s.push(glow('goStageGlow', cx, 220, 300, '#b05aff', 0.6, 170));
  // Speaker stacks.
  for (const sx of [x0 - 62, x1 + 8]) {
    s.push(inked(`M${sx} ${GO.ground}V${top + 60}h54V${GO.ground}Z`, '#141424', 2.6));
    [0, 1, 2].forEach((k) => {
      const cy = top + 90 + k * 50;
      s.push(circle(sx + 27, cy, 19, { fill: '#0a0a14', stroke: NEON[(k + (sx < cx ? 0 : 3)) % 6], sw: 2.4 }));
      s.push(circle(sx + 27, cy, 9, { stroke: '#3a3a5a', sw: 2 }) + circle(sx + 27, cy, 3, { fill: '#3a3a5a' }));
    });
  }
  // The pyramid frame and the mandala.
  s.push(path(`M${x0} ${GO.ground}L${cx} ${top - 90}L${x1} ${GO.ground}`, { stroke: INK, sw: 9 }) + path(`M${x0} ${GO.ground}L${cx} ${top - 90}L${x1} ${GO.ground}`, { stroke: '#c8a060', sw: 5 }));
  const my = top + 44;
  s.push(glow('goMandalaGlow', cx, my, 120, '#ff3ab4', 0.55));
  s.push(circle(cx, my, 84, { fill: '#160a2a', stroke: INK, sw: 3 }));
  for (let ring = 0; ring < 4; ring++) {
    const rr = 78 - ring * 19;
    const n = 16 - ring * 2;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ring * 0.2;
      const b = a + Math.PI / n;
      const p: Pt = [cx + Math.cos(a) * rr, my + Math.sin(a) * rr];
      const q: Pt = [cx + Math.cos(b) * (rr - 17), my + Math.sin(b) * (rr - 17)];
      const p2: Pt = [cx + Math.cos(a + (Math.PI * 2) / n) * rr, my + Math.sin(a + (Math.PI * 2) / n) * rr];
      s.push(path(poly([p, q, p2]), { fill: NEON[(k + ring * 2) % 6], stroke: INK, sw: 1, opacity: 0.95 }));
    }
    s.push(circle(cx, my, rr, { stroke: NEON[(ring + 1) % 6], sw: 1.6 }));
  }
  s.push(circle(cx, my, 13, { fill: NEON[3], stroke: INK, sw: 2 }));
  s.push(path(`M${cx - 8} ${my}Q${cx} ${my - 9} ${cx + 8} ${my}Q${cx} ${my + 9} ${cx - 8} ${my}Z`, { fill: '#ffffff', stroke: INK, sw: 1.2 }) + circle(cx, my, 3.4, { fill: '#160a2a' }));
  // The booth: decks under a cloth with a fractal, the DJ with headphones.
  const by = GO.ground - 62;
  s.push(circle(cx, by - 22, 12, { fill: '#c88a5e', stroke: INK, sw: 2 }));
  s.push(path(`M${cx - 13} ${by - 24}Q${cx} ${by - 42} ${cx + 13} ${by - 24}`, { stroke: INK, sw: 4 }) + path(`M${cx - 13} ${by - 24}Q${cx} ${by - 42} ${cx + 13} ${by - 24}`, { stroke: NEON[1], sw: 2 }));
  s.push(circle(cx - 13, by - 22, 4.4, { fill: NEON[1], stroke: INK, sw: 1.4 }) + circle(cx + 13, by - 22, 4.4, { fill: NEON[1], stroke: INK, sw: 1.4 }));
  s.push(inked(`M${cx - 18} ${by}Q${cx} ${by - 16} ${cx + 18} ${by}Z`, NEON[4], 1.8));
  s.push(path(`M${cx + 14} ${by - 6}L${cx + 34} ${by - 40}`, { stroke: INK, sw: 6 }) + path(`M${cx + 14} ${by - 6}L${cx + 34} ${by - 40}`, { stroke: '#c88a5e', sw: 3.4 }));
  s.push(inked(poly([[x0 + 60, by], [x1 - 60, by], [x1 - 50, GO.ground + 2], [x0 + 50, GO.ground + 2]]), '#2a1650', 2.6));
  for (let k = 0; k < 7; k++) s.push(path(`M${x0 + 76 + k * 26} ${by + 12}l10 18l-20 0z`, { fill: NEON[k % 6], opacity: 0.9 }));
  for (const dx of [-44, 44]) s.push(ellipse(cx + dx, by - 2, 16, 5, { fill: '#0a0a14', stroke: INK, sw: 1.6 }) + ellipse(cx + dx, by - 2, 5, 1.6, { fill: NEON[3] }));
  return s.join('');
}

function ground(): string {
  const s: string[] = [];
  s.push(inked(`M-10 ${GO.ground}Q240 ${GO.ground - 6} 480 ${GO.ground}Q720 ${GO.ground + 6} 970 ${GO.ground - 4}L970 460L-10 460Z`, 'url(#goGround)', 3));
  // The dance floor: a great UV spiral painted on the trampled grass.
  const { cx, cy, rx, ry } = GO.floor;
  s.push(glow('goFloorGlow', cx, cy, rx * 1.6, '#b05aff', 0.35, ry * 2.4));
  for (let ring = 0; ring < 5; ring++) s.push(ellipse(cx, cy, rx * (1 - ring * 0.19), ry * (1 - ring * 0.19), { stroke: NEON[ring % 6], sw: 2.4, opacity: 0.75 }));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    s.push(line([cx + Math.cos(a) * rx * 0.2, cy + Math.sin(a) * ry * 0.2], [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry], NEON[(k + 2) % 6], 1.4, 0.6));
  }
  // Glitter, glow sticks, little mushrooms in the grass.
  const r = rng(17);
  for (let i = 0; i < 120; i++) s.push(circle(r() * 960, GO.ground + 8 + r() * 130, 0.8 + r() * 1.5, { fill: NEON[Math.floor(r() * 6)], opacity: 0.85 }));
  for (let i = 0; i < 9; i++) {
    const x = 30 + r() * 900;
    const y = GO.ground + 16 + r() * 110;
    s.push(path(`M${x} ${y}l${10 + r() * 8} ${-3 + r() * 6}`, { stroke: NEON[i % 6], sw: 3 }));
  }
  return s.join('');
}

/** Lasers fanning out from the stage's mast (their own layer: they pulse). */
export function lasers(): string {
  const o: Pt = [480, 34];
  // Sideways and up only: none of them rakes across the dance floor.
  return [-158, -138, -118, -100, -84, -68, 68, 84, 100, 118, 138, 158]
    .map((a, i) => {
      const rad = ((a + 90) * Math.PI) / 180;
      const e: Pt = [o[0] + Math.cos(rad) * 620, o[1] + Math.sin(rad) * 620];
      return line(o, e, NEON[i % 6], 5, 0.12) + line(o, e, NEON[i % 6], 1.6, 0.7);
    })
    .join('');
}

/** Mushrooms that stand among the dancers (in the backdrop: behind everyone). */
function shrooms(): string {
  return [
    glowShroom('goSh1', 232, 330, 150, NEON[0], -4),
    glowShroom('goSh2', 284, 326, 84, NEON[1], 6),
    glowShroom('goSh3', 726, 330, 170, NEON[2], 3),
    glowShroom('goSh4', 672, 326, 70, NEON[3], -8),
    glowShroom('goSh5', 800, 328, 96, NEON[4], 5),
    glowShroom('goSh6', 176, 328, 60, NEON[5], -6),
  ].join('');
}

export function goaBg(): string {
  return [
    defs(
      grainDefs(97),
      linear('goSky', 0, 0, 0, 330, [
        [0, '#04051a'],
        [0.55, '#151a44'],
        [1, '#3a1e5e'],
      ]),
      linear('goGround', 0, GO.ground, 0, 450, [
        [0, '#1c2a34'],
        [1, '#0a1016'],
      ])
    ),
    sky(),
    forest(),
    stage(),
    canopy(),
    shrooms(),
    ground(),
    vignette('goVig', 960, 450, 0.42, '#04020c'),
    grainOverlay(960, 450, 0.28, 0.22),
  ].join('');
}

/** Two big mushrooms in the very foreground (a FRONT layer: you dance behind them). */
export function foregroundShrooms(): string {
  return glowShroom('goShF1', 16, 474, 170, NEON[4], 10) + glowShroom('goShF2', 950, 478, 150, NEON[0], -12) + glowShroom('goShF3', 96, 462, 56, NEON[3], -6);
}
