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
  type Pt,
} from '../../game/art/toon';
import type { SvgImageAsset } from '../../engine/types';
import { NEON, crowdStrip, glowShroom, stringFan } from './goa';

/**
 * The Goa's entrance, deep in the forest at night: a clearing under the full
 * moon, UV-bright fabric banners and a mandala over a gate of bamboo poles,
 * strings of lights, lasers fanning up from behind it — and the bouncer in
 * front of it. Behind the gate, the party (to be continued). On the left the
 * wormhole the player came out of keeps swirling.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

export const GE = {
  ground: 318,
  gate: { x0: 430, x1: 690, top: 96 },
};

const UV = ['#ff5ab4', '#5ad8ff', '#8aff5a', '#ffd34a', '#b06aff', '#ff7a2a'];

function fir(x: number, base: number, h: number, w: number): string {
  return poly([[x, base - h], [x + w * 0.3, base - h * 0.62], [x + w * 0.18, base - h * 0.62], [x + w * 0.5, base - h * 0.25], [x + w * 0.3, base - h * 0.25], [x + w * 0.6, base], [x - w * 0.6, base], [x - w * 0.3, base - h * 0.25], [x - w * 0.5, base - h * 0.25], [x - w * 0.18, base - h * 0.62], [x - w * 0.3, base - h * 0.62]]);
}

function sky(): string {
  const s: string[] = [rect(0, 0, 960, 330, { fill: 'url(#geSky)' })];
  const r = rng(9);
  for (let i = 0; i < 70; i++) s.push(circle(r() * 960, r() * 220, 0.6 + r() * 1, { fill: '#fff6e0', opacity: 0.4 + r() * 0.5 }));
  s.push(glow('geMoonGlow', 820, 70, 90, '#fff0c0', 0.35));
  s.push(circle(820, 70, 30, { fill: '#f4ecd0' }));
  s.push(circle(810, 62, 5, { fill: '#e0d4b0' }) + circle(830, 80, 4, { fill: '#e0d4b0' }));
  return s.join('');
}

function forest(): string {
  const s: string[] = [];
  let d = '';
  const r = rng(13);
  for (let x = -20; x < 990; x += 40 + r() * 20) d += fir(x, 322, 150 + r() * 80, 70 + r() * 30);
  s.push(path(d, { fill: '#141834' }));
  let d2 = '';
  for (let x = 0; x < 990; x += 70 + r() * 30) d2 += fir(x, 330, 200 + r() * 70, 96 + r() * 30);
  s.push(path(d2, { stroke: '#06060e', sw: 5 }) + path(d2, { fill: '#0e1022' }));
  return s.join('');
}

/** Lasers fanning up from behind the gate. */
function lasers(): string {
  const { x0, x1 } = GE.gate;
  const cx = (x0 + x1) / 2;
  return [-64, -38, -14, 10, 34, 58]
    .map((a, i) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return path(`M${cx} ${GE.ground - 40}L${cx + Math.cos(rad) * 420} ${GE.ground - 40 + Math.sin(rad) * 420}`, { stroke: UV[i], sw: 2.4, opacity: 0.6 });
    })
    .join('');
}

/** The gate: bamboo poles, a crossbeam, a mandala, banners, lights. */
function gate(): string {
  const { x0, x1, top } = GE.gate;
  const s: string[] = [];
  const cx = (x0 + x1) / 2;
  // The party's glow behind it.
  s.push(glow('geParty', cx, GE.ground - 60, 220, '#b06aff', 0.55, 110));
  for (const x of [x0, x1]) {
    s.push(inked(`M${x - 7} ${GE.ground + 4}L${x - 5} ${top}h10L${x + 7} ${GE.ground + 4}Z`, '#c8a060', 2.4));
    for (let y = top + 30; y < GE.ground; y += 34) s.push(line([x - 6, y], [x + 6, y], '#8a6a3a', 2));
  }
  s.push(inked(`M${x0 - 20} ${top + 6}Q${cx} ${top - 20} ${x1 + 20} ${top + 6}L${x1 + 20} ${top + 18}Q${cx} ${top - 8} ${x0 - 20} ${top + 18}Z`, '#c8a060', 2.4));
  // Hanging fabric banners in UV colours.
  const banners = 6;
  for (let i = 0; i < banners; i++) {
    const bx = x0 + 22 + i * ((x1 - x0 - 44) / (banners - 1));
    const c = UV[i % UV.length];
    s.push(inked(`M${bx - 14} ${top + 18}L${bx + 14} ${top + 18}L${bx + 10} ${top + 120}L${bx} ${top + 108}L${bx - 10} ${top + 120}Z`, c, 2));
    s.push(path(`M${bx} ${top + 30}l6 10l-6 10l-6 -10z`, { fill: '#1e1424', opacity: 0.5 }));
    s.push(circle(bx, top + 70, 5, { stroke: '#1e1424', sw: 1.6, opacity: 0.6 }));
  }
  // The mandala over the gate.
  const my = top - 24;
  s.push(glow('geMandala', cx, my, 70, '#ff5ab4', 0.5));
  s.push(circle(cx, my, 34, { fill: '#1e1424', stroke: INK, sw: 2.4 }));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    s.push(path(`M${cx} ${my}L${cx + Math.cos(a) * 30} ${my + Math.sin(a) * 30}`, { stroke: UV[k % 6], sw: 2 }));
    s.push(circle(cx + Math.cos(a) * 22, my + Math.sin(a) * 22, 3.6, { fill: UV[(k + 3) % 6] }));
  }
  s.push(circle(cx, my, 9, { fill: '#ffd34a', stroke: INK, sw: 1.6 }));
  s.push(circle(cx, my, 4, { fill: '#ff5ab4' }));
  // A painted sign: the name of the party.
  s.push(inked(`M${cx - 70} ${top + 128}h140v24h-140z`, '#1e1424', 2));
  s.push(text(cx, top + 145, 'FOLGE DEM BASS', { size: 13, fill: '#8aff5a', stroke: '#1e1424', sw: 2, spacing: 1 }));
  return s.join('');
}

/** Strings of fairy lights from the gate into the trees. */
function lights(): string {
  const s: string[] = [];
  const { x0, x1, top } = GE.gate;
  for (const [ax, bx] of [[x0 - 20, 200], [x1 + 20, 900]] as Pt[]) {
    const pts: Pt[] = [];
    for (let t = 0; t <= 1.0001; t += 0.1) pts.push([ax + (bx - ax) * t, top + 10 + Math.sin(t * Math.PI) * 50 + t * 40]);
    s.push(path(curve(pts), { stroke: '#2a2a3a', sw: 1.4 }));
    pts.forEach(([x, y], i) => s.push(circle(x, y + 4, 7, { fill: UV[i % 6], opacity: 0.25 }) + circle(x, y + 4, 2.6, { fill: UV[i % 6] })));
  }
  return s.join('');
}

function ground(): string {
  const s: string[] = [];
  s.push(inked(`M-10 ${GE.ground}Q240 ${GE.ground - 6} 480 ${GE.ground}Q720 ${GE.ground + 6} 970 ${GE.ground - 4}L970 460L-10 460Z`, 'url(#geGround)', 3));
  // UV-lit footprints and confetti, bottles (for Flaschenfloh).
  const r = rng(17);
  for (let i = 0; i < 60; i++) s.push(circle(r() * 960, GE.ground + 10 + r() * 130, 1 + r() * 1.4, { fill: UV[Math.floor(r() * 6)], opacity: 0.8 }));
  for (const [x, y, c] of [[760, 400, '#3a8a4a'], [790, 410, '#8a5a2a'], [300, 420, '#3a8a4a']] as Array<[number, number, string]>) {
    s.push(inked(`M${x} ${y}l14 -4l1 4l-14 4z`, c, 1.2));
  }
  s.push(glow('geFloor', 560, 380, 300, '#b06aff', 0.18, 50));
  return s.join('');
}

/** UV threads fanned from two painted trunks to the gate's posts, and glowing
 *  mushrooms either side of the path: a first taste of what's behind the gate. */
function uvDeco(): string {
  const { x0, x1, top } = GE.gate;
  const s: string[] = [];
  for (const [tx, c] of [[262, NEON[1]], [858, NEON[2]]] as Array<[number, string]>) {
    s.push(inked(poly([[tx - 11, GE.ground + 4], [tx - 8, -10], [tx + 8, -10], [tx + 11, GE.ground + 4]]), '#0a0c1c', 2.4));
    for (let y = 30; y < GE.ground - 10; y += 28) s.push(path(`M${tx - 9} ${y + 12}Q${tx} ${y} ${tx + 9} ${y + 12}`, { stroke: c, sw: 2, opacity: 0.85 }));
  }
  s.push(stringFan([262, 24], [262, 290], [x0 - 7, GE.ground - 10], [x0 - 7, top + 4], 20, NEON[0]));
  s.push(stringFan([858, 24], [858, 290], [x1 + 7, GE.ground - 10], [x1 + 7, top + 4], 20, NEON[4]));
  s.push(stringFan([262, 24], [(x0 + x1) / 2, top - 60], [858, 24], [(x0 + x1) / 2, top - 60], 12, NEON[3]));
  s.push(glowShroom('geSh1', 330, GE.ground + 8, 96, NEON[0], -5));
  s.push(glowShroom('geSh2', 384, GE.ground + 6, 52, NEON[1], 7));
  s.push(glowShroom('geSh3', 742, GE.ground + 8, 110, NEON[2], 4));
  s.push(glowShroom('geSh4', 900, GE.ground + 10, 74, NEON[5], -8));
  s.push(glowShroom('geSh5', 218, GE.ground + 8, 44, NEON[3], 6));
  // A hand-painted signpost.
  s.push(inked(`M704 ${GE.ground + 6}v-58h5v58z`, '#6a4a2a', 1.6));
  s.push(inked('M724 262h-52l-8 8l8 8h52z', '#160a2a', 1.8) + text(698, 274, 'MAINFLOOR', { size: 7.4, fill: NEON[2], weight: 900 }));
  s.push(inked('M690 282h52l8 8l-8 8h-52z', '#160a2a', 1.8) + text(716, 294, 'CHAI · CHILL', { size: 7, fill: NEON[3], weight: 900 }));
  return s.join('');
}

/** The dancers you can see through the gate: a 4-frame strip. */
export const GATE_CROWD = { x: GE.gate.x0 + 12, y: GE.ground - 64, w: GE.gate.x1 - GE.gate.x0 - 24, h: 66 };
export const GATE_CROWD_FRAMES: SvgImageAsset[] = [0, 1, 2, 3].map((f) => ({
  key: `goa-gatecrowd-${f}`,
  width: GATE_CROWD.w,
  height: GATE_CROWD.h,
  svg: crowdStrip(GATE_CROWD.w, GATE_CROWD.h, 16, 77, f, 0.3, 0.42),
}));

export function goaEingangBg(): string {
  return [
    defs(
      grainDefs(91),
      linear('geSky', 0, 0, 0, 330, [
        [0, '#05061a'],
        [0.6, '#141a3e'],
        [1, '#2a1e4a'],
      ]),
      linear('geGround', 0, GE.ground, 0, 450, [
        [0, '#1e2a2a'],
        [1, '#0c1214'],
      ])
    ),
    sky(),
    lasers(),
    forest(),
    gate(),
    lights(),
    uvDeco(),
    ground(),
    vignette('geVig', 960, 450, 0.5, '#04020c'),
    grainOverlay(960, 450, 0.32, 0.25),
  ].join('');
}

/** One end of the wormhole pair, drawn into a 2rx × 2ry box (its own layer:
 *  the forest edge stands it upright, the dance floor lays it flat). */
export function portalArt(rx: number, ry: number, id = 'gePortal'): string {
  const [x, y] = [rx, ry];
  const s: string[] = [];
  s.push(`<defs>${radial(id, x, y, rx, [[0, '#000000', 1], [0.55, '#2a0a4a', 1], [0.8, '#b06aff', 0.6], [1, '#4ae8ff', 0]], ry)}</defs>`);
  s.push(ellipse(x, y, rx, ry, { fill: `url(#${id})` }));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    s.push(path(`M${x + Math.cos(a) * rx * 0.2} ${y + Math.sin(a) * ry * 0.2}Q${x + Math.cos(a + 1) * rx * 0.7} ${y + Math.sin(a + 1) * ry * 0.7} ${x + Math.cos(a + 2) * rx * 0.95} ${y + Math.sin(a + 2) * ry * 0.95}`, { stroke: k % 2 ? '#4ae8ff' : '#ff5ab4', sw: 2, opacity: 0.8 }));
  }
  return group(s);
}
