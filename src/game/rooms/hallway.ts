import { Layer, type RoomDef } from '../../engine/types';
import type { GameState } from '../../engine/GameState';
import {
  INK,
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

function plantX(state: GameState): number {
  return state.getFlag('plantMoved') ? 790 : 700;
}

// ---- art -------------------------------------------------------------------------
// The Hall of Science: striped mauve wallpaper over dark-wood wainscot, a
// green-grey checkered floor in perspective with a long red runner, and a
// window spilling daylight across the tiles. The backdrop is static; the
// ficus (an occluder that moves with the plantMoved flag) and the key it was
// hiding are their own layers.

/** Checkered tiles in perspective: columns converge on a vanishing point,
 *  rows grow taller towards the viewer. */
function checkerFloor(y0: number, y1: number, vp: Pt, a: string, b: string): string {
  const s: string[] = [];
  const at = (xb: number, y: number) => vp[0] + ((xb - vp[0]) * (y - vp[1])) / (y1 - vp[1]);
  // Row boundaries: geometric growth, normalised to span y0..y1.
  const growth = 1.2;
  const rows = 6;
  let total = 0;
  for (let j = 0; j < rows; j++) total += growth ** j;
  const ys = [y0];
  for (let j = 0; j < rows; j++) ys.push(ys[j] + ((y1 - y0) * growth ** j) / total);
  const step = 92;
  for (let i = -10; i < 22; i++) {
    const xa = -440 + i * step;
    const xb = xa + step;
    for (let j = 0; j < rows; j++) {
      const ya = ys[j];
      const yb = ys[j + 1];
      const quad: Pt[] = [
        [at(xa, ya), ya],
        [at(xb, ya), ya],
        [at(xb, yb), yb],
        [at(xa, yb), yb],
      ];
      s.push(path(poly(quad), { fill: (i + j) % 2 ? a : b }));
    }
  }
  // Grout lines
  for (let i = -10; i < 23; i++) {
    const xa = -440 + i * step;
    s.push(line([at(xa, y0), y0], [xa, y1], 'rgba(20,30,24,0.45)', 1.4));
  }
  for (const y of ys.slice(1, -1)) s.push(line([0, y], [960, y], 'rgba(20,30,24,0.45)', 1.4));
  return s.join('');
}

/** A panelled wooden door in a crooked frame. `knobX` picks the hinge side. */
function door(
  x: number,
  y: number,
  w: number,
  h: number,
  knobX: number,
  wood: string,
  woodShade: string,
  seed: number,
  lean: number
): string {
  const s: string[] = [];
  s.push(inked(wobble(crookedRect(x - 4, y, w + 8, h, lean, 2), { seed, wobble: 1.5 }), '#3a2018', 3));
  const leaf: Pt[] = crookedRect(x + 6, y + 9, w - 12, h - 9, lean * 0.8, 1.5);
  s.push(inked(wobble(leaf, { seed: seed + 1, wobble: 1.2 }), wood, 2.5));
  // Shaded half (light comes from the window on the left)
  const mid = x + w * 0.55;
  s.push(path(poly([[mid + lean * 0.8, y + 10], [x + w - 6 + lean * 0.8, y + 8], [x + w - 6, y + h], [mid, y + h]]), { fill: woodShade, opacity: 0.55 }));
  const pw = w - 34;
  s.push(path(wobble(crookedRect(x + 17, y + 22, pw, h * 0.38, lean * 0.6, 1), { seed: seed + 2, wobble: 1 }), { fill: woodShade, stroke: '#3a2018', sw: 2 }));
  s.push(path(wobble(crookedRect(x + 17, y + 30 + h * 0.4, pw, h * 0.42, lean * 0.3, 1), { seed: seed + 3, wobble: 1 }), { fill: woodShade, stroke: '#3a2018', sw: 2 }));
  s.push(path(`M${x + 19 + lean * 0.6} ${y + 20 + h * 0.38}V${y + 24}H${x + 15 + pw}`, { stroke: '#d0905c', sw: 1.5, opacity: 0.7 }));
  s.push(circle(knobX, y + h * 0.55, 5, { fill: '#e8c23a', stroke: INK, sw: 2 }));
  s.push(circle(knobX - 1.5, y + h * 0.55 - 1.5, 1.5, { fill: '#fff4b0' }));
  s.push(rect(knobX - 2.5, y + h * 0.55 + 7, 5, 8, { fill: '#c99a2a', stroke: INK, sw: 1.4 }, 1.5));
  return s.join('');
}

function hallBg(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(23),
      linear('hallWall', 0, 0, 0, 300, [
        [0, '#3a2244'],
        [0.45, '#5f3a6c'],
        [1, '#6c4478'],
      ]),
      linear('hallWains', 0, 232, 0, 300, [
        [0, '#5a3428'],
        [1, '#3c2219'],
      ]),
      linear('hallFloorShade', 0, 300, 0, 450, [
        [0, '#0e1a12', 0.6],
        [0.4, '#0e1a12', 0.12],
        [1, '#0e1a12', 0],
      ]),
      linear('hallSky', 0, 96, 0, 176, [
        [0, '#4f9ad8'],
        [1, '#bfe2f4'],
      ]),
      linear('hallShaft', 0, 180, 0, 380, [
        [0, '#ffe8b0', 0.1],
        [1, '#ffe8b0', 0.02],
      ])
    )
  );

  // Wallpaper: two-tone stripes with a little gold fleur in every other one.
  s.push(rect(0, 0, 960, 304, { fill: 'url(#hallWall)' }));
  for (let x = 0; x < 960; x += 40) s.push(rect(x, 0, 20, 300, { fill: '#2a1030', opacity: 0.16 }));
  for (let y = 46; y < 226; y += 38) {
    for (let x = 30 + ((y / 38) % 2 ? 0 : 0); x < 960; x += 40) {
      const yy = y + ((x / 40) % 2 ? 19 : 0);
      s.push(path(`M${x} ${yy - 5}Q${x + 4} ${yy} ${x} ${yy + 5}Q${x - 4} ${yy} ${x} ${yy - 5}Z`, { fill: '#e8b04a', opacity: 0.22 }));
    }
  }
  // Ceiling shadow + crown moulding
  s.push(rect(0, 0, 960, 120, { fill: '#1a0c20', opacity: 0.25 }));
  s.push(inked(wobble([[-10, -10], [970, -10], [970, 14], [-10, 18]], { seed: 4, wobble: 2 }), '#2a1830', 3));
  s.push(path('M-10 22Q480 26 970 21', { stroke: INK, sw: 7 }));
  s.push(path('M-10 22Q480 26 970 21', { stroke: '#8a6a90', sw: 3 }));

  // Wainscot: dark wood with raised panels
  s.push(rect(0, 232, 960, 66, { fill: 'url(#hallWains)' }));
  s.push(rect(0, 226, 960, 9, { fill: '#2e1a14' }));
  s.push(path('M0 226H960', { stroke: '#a0705a', sw: 1.5, opacity: 0.7 }));
  s.push(path('M0 235H960', { stroke: INK, sw: 2.5 }));
  for (let x = 8; x < 960; x += 96) {
    s.push(path(wobble(rectPts(x, 245, 78, 40), { seed: x + 7, wobble: 1 }), { fill: '#4e2c21', stroke: '#2a160f', sw: 2 }));
    s.push(path(`M${x + 2} 283H${x + 78}V247`, { stroke: '#8a5a44', sw: 1.4, opacity: 0.7 }));
  }

  // Floor: green-grey checker, a long runner, baseboard
  s.push(checkerFloor(300, 450, [480, 80], '#5f7d64', '#46604f'));
  s.push(rect(0, 300, 960, 150, { fill: 'url(#hallFloorShade)' }));
  // Window light: a soft shaft and a sunny patch on the floor
  s.push(path(poly([[186, 178], [294, 178], [420, 372], [258, 372]]), { fill: 'url(#hallShaft)' }));
  s.push(path(wobble([[236, 330], [372, 330], [428, 378], [262, 378]], { seed: 13, wobble: 3 }), { fill: '#ffe8a8', opacity: 0.18 }));
  // Runner rug along the hall
  s.push(path(wobble([[-10, 338], [970, 336], [970, 394], [-10, 396]], { seed: 14, wobble: 2 }), { fill: '#8e2a3a', stroke: INK, sw: 2.5 }));
  s.push(path(wobble([[-10, 345], [970, 343], [970, 387], [-10, 389]], { seed: 15, wobble: 1.5 }), { stroke: '#e8b04a', sw: 2.5 }));
  for (let x = 20; x < 960; x += 60) {
    s.push(path(poly([[x, 366], [x + 14, 359], [x + 28, 366], [x + 14, 373]]), { fill: '#e8b04a', opacity: 0.65 }));
    s.push(circle(x + 44, 366, 2.5, { fill: '#5a1424' }));
  }
  s.push(path('M-10 394Q480 398 970 392', { stroke: '#4a1018', sw: 3, opacity: 0.6 }));
  s.push(inked('M-5 290Q480 294 965 290L965 304Q480 308 -5 304Z', '#2a1612', 2.5));

  // Left door, back to the lab
  s.push(door(34, 124, 96, 184, 114, '#9a6038', '#7a4626', 31, -3));

  // Window with curtains, daylight beyond
  s.push(glow('hallWinGlow', 240, 136, 150, '#fff0c8', 0.28, 110));
  s.push(inked(wobble(crookedRect(176, 86, 128, 98, 2, 1.5), { seed: 41, wobble: 1.4 }), '#3a2a3c', 3));
  s.push(path(wobble(crookedRect(184, 94, 112, 82, 2, 1), { seed: 42, wobble: 0.8 }), { fill: 'url(#hallSky)' }));
  s.push(path(puff(226, 118, 22, 9, 5, 3), { fill: '#ffffff', opacity: 0.95 }));
  s.push(path(puff(272, 104, 13, 6, 4, 5), { fill: '#ffffff', opacity: 0.8 }));
  s.push(path('M184 168Q214 150 244 160Q270 150 298 162L298 176L184 176Z', { fill: '#6fae5a' }));
  s.push(path('M184 172Q230 162 298 170L298 176L184 176Z', { fill: '#4f8a44' }));
  s.push(path('M242 95V177M185 136H297', { stroke: '#3a2a3c', sw: 5 }));
  s.push(path('M192 100L206 100M192 140L200 140', { stroke: '#ffffff', sw: 2, opacity: 0.6 }));
  s.push(inked(wobble([[172, 180], [308, 179], [312, 190], [168, 191]], { seed: 43, wobble: 0.8 }), '#5a3a5e', 2.5));
  // Curtains, tied back
  s.push(inked('M162 80Q170 78 182 82Q186 120 176 150Q184 176 172 200Q164 200 160 196Q166 150 162 80Z', '#2f7a6a', 2.5));
  s.push(inked('M318 80Q310 78 298 82Q294 120 304 150Q296 176 308 200Q316 200 320 196Q314 150 318 80Z', '#2f7a6a', 2.5));
  s.push(path('M168 90Q172 130 168 180M312 90Q308 130 312 180', { stroke: '#1f5a4c', sw: 2 }));
  s.push(path('M166 150L182 148M314 150L298 148', { stroke: '#e8b04a', sw: 3 }));
  s.push(inked(wobble([[154, 74], [326, 72], [326, 82], [154, 84]], { seed: 44, wobble: 0.6 }), '#6b4326', 2.5));

  // Radiator under the window
  s.push(ellipse(240, 300, 54, 5, { fill: '#000000', opacity: 0.3 }));
  s.push(inked(wobble(rectPts(194, 246, 92, 52), { seed: 45, wobble: 0.8 }), '#b8b8c4', 2.5));
  for (let x = 202; x < 284; x += 10) {
    s.push(path(`M${x} 250V294`, { stroke: '#7a7a8c', sw: 3 }));
    s.push(path(`M${x + 2} 252V292`, { stroke: '#e0e0ea', sw: 1, opacity: 0.8 }));
  }
  s.push(path('M286 290Q300 290 300 302', { stroke: INK, sw: 6 }));
  s.push(path('M286 290Q300 290 300 302', { stroke: '#9a9aa8', sw: 3 }));
  s.push(circle(203, 251, 3, { fill: '#d94a3a', stroke: INK, sw: 1.2 }));

  // Portrait of the founder (wild hair, goggles, regrets nothing)
  s.push(
    group(
      [
        rect(338, 76, 70, 88, { fill: '#000000', opacity: 0.3 }),
        inked(wobble(rectPts(334, 72, 70, 88), { seed: 51, wobble: 1 }), '#d0a040', 3),
        rect(342, 80, 54, 72, { fill: '#2e3a52', stroke: INK, sw: 1.5 }),
        inked('M348 152Q350 128 369 126Q388 128 390 152Z', '#f4f4ee', 2),
        path('M369 128L366 152M369 128L372 152', { stroke: '#c8c8c0', sw: 1.4 }),
        path(puff(369, 100, 20, 13, 7, 6, 0.35), { fill: '#f0f0f8', stroke: INK, sw: 1.8 }),
        ellipse(369, 110, 9, 12, { fill: '#f0c49c', stroke: INK, sw: 1.8 }),
        path(puff(369, 92, 13, 6, 6, 7, 0.4), { fill: '#f0f0f8', stroke: INK, sw: 1.4 }),
        rect(359, 98, 20, 6, { fill: '#3a3040', stroke: INK, sw: 1.2 }, 3),
        circle(364, 101, 2.6, { fill: '#7fd0e8', stroke: INK, sw: 1 }),
        circle(374, 101, 2.6, { fill: '#7fd0e8', stroke: INK, sw: 1 }),
        ellipse(369, 112, 2.6, 3, { fill: '#e0a07c', stroke: INK, sw: 1.2 }),
        path('M364 118Q369 121 375 117', { stroke: INK, sw: 1.4 }),
        path('M340 78L398 78M396 80L396 156', { stroke: '#f8e090', sw: 1.4, opacity: 0.7 }),
      ],
      'rotate(2 369 116)'
    )
  );

  // HALL OF SCIENCE: a wooden board hung slightly askew
  s.push(path('M450 96L470 70L490 96M570 96L590 70L610 96', { stroke: INK, sw: 2 }));
  s.push(circle(470, 70, 3.5, { fill: '#c9a24a', stroke: INK, sw: 1.5 }));
  s.push(circle(590, 70, 3.5, { fill: '#c9a24a', stroke: INK, sw: 1.5 }));
  s.push(
    group(
      [
        rect(434, 102, 200, 52, { fill: '#000000', opacity: 0.3 }, 6),
        inked(wobble(rectPts(430, 96, 200, 52), { seed: 61, wobble: 1.2 }), '#7a4e2c', 3),
        path(wobble(rectPts(437, 102, 186, 40), { seed: 62, wobble: 0.8 }), { fill: '#efe2bf', stroke: '#4a2e1e', sw: 2 }),
        path('M440 136H620', { stroke: '#d8c8a0', sw: 5 }),
        text(530, 129, 'HALL OF SCIENCE', { size: 19, fill: '#5a1a3a', spacing: 0.5 }),
        circle(436, 122, 2.2, { fill: '#c9a24a', stroke: INK, sw: 1 }),
        circle(624, 122, 2.2, { fill: '#c9a24a', stroke: INK, sw: 1 }),
      ],
      'rotate(-2 530 122)'
    )
  );

  // Wall sconce
  s.push(glow('hallSconceGlow', 662, 146, 70, '#ffd890', 0.4, 60));
  s.push(inked('M656 172Q662 160 668 172Z', '#c9a24a', 2));
  s.push(path('M662 166V150', { stroke: INK, sw: 4 }));
  s.push(path('M662 166V150', { stroke: '#c9a24a', sw: 2 }));
  s.push(inked('M652 152Q662 120 672 152Z', '#f6e0a8', 2));
  s.push(ellipse(662, 142, 3, 6, { fill: '#fff8d8' }));

  // Employee of the month (it's always Ned)
  s.push(
    group(
      [
        rect(704, 88, 76, 86, { fill: '#000000', opacity: 0.3 }),
        inked(wobble(rectPts(700, 84, 76, 86), { seed: 71, wobble: 1 }), '#2e2e3a', 3),
        rect(707, 91, 62, 58, { fill: '#e8d070', stroke: INK, sw: 1.5 }),
        path(puff(738, 147, 34, 8, 6, 8), { fill: '#d4b450' }),
        inked('M726 148Q722 120 732 106Q738 98 746 102Q752 108 748 122Q746 136 752 148Z', '#5cbf4a', 2),
        ellipse(736, 112, 3.4, 3.8, { fill: '#ffffff', stroke: INK, sw: 1.1 }),
        ellipse(744, 112, 3.4, 3.8, { fill: '#ffffff', stroke: INK, sw: 1.1 }),
        circle(737, 113, 1.4, { fill: INK }),
        circle(745, 113, 1.4, { fill: INK }),
        ellipse(740, 126, 4, 2.4, { fill: '#86d46c', stroke: INK, sw: 1.1 }),
        rect(710, 152, 56, 14, { fill: '#c9a24a', stroke: INK, sw: 1.2 }, 2),
        text(738, 162, 'EMPLOYEE', { size: 7, fill: '#3a2410' }),
        path('M709 93L767 93', { stroke: '#ffffff', sw: 1.2, opacity: 0.5 }),
      ],
      'rotate(-3 738 127)'
    )
  );

  // Right door to the gallery, with its brass plate
  s.push(door(824, 120, 100, 188, 840, '#8a3a2e', '#6a2820', 81, 2));
  s.push(inked(wobble(rectPts(844, 104, 60, 15), { seed: 85, wobble: 0.6 }), '#d4b04a', 2));
  s.push(text(874, 115.5, 'GALLERY', { size: 9, fill: '#3a2410' }));
  s.push(circle(848, 111.5, 1.4, { fill: INK }));
  s.push(circle(900, 111.5, 1.4, { fill: INK }));

  // Cracks, a mouse hole (every hallway needs one)
  s.push(path('M420 30l10 14l-6 10l12 9M430 44l8-4', { stroke: '#2a1030', sw: 1.6 }));
  s.push(path('M560 268Q560 254 572 254Q584 254 584 268Z', { fill: '#140a10', stroke: INK, sw: 2 }));

  // Vignette, grain
  s.push(vignette('hallVig', 960, 450, 0.42));
  s.push(grainOverlay(960, 450));
  return s.join('');
}

const HALL_BG = hallBg();

/** The ficus at local x=0 (pot bottom on the 108 line), drawn once and
 *  translated by the plant layer below. */
function ficus(): string {
  const r = rng(91);
  const s: string[] = [];
  s.push(ellipse(2, 109, 36, 6, { fill: '#000000', opacity: 0.35 }));
  // Trunk and branches
  s.push(path('M0 72Q-4 62 2 54Q6 46 0 36M1 58Q14 52 20 40M-1 50Q-14 46 -20 36', { stroke: INK, sw: 6 }));
  s.push(path('M0 72Q-4 62 2 54Q6 46 0 36M1 58Q14 52 20 40M-1 50Q-14 46 -20 36', { stroke: '#7a5232', sw: 3 }));
  // Canopy: dark inked clusters, then lit leaves
  // (The layer's top edge is local y=0: puffs reach ~1.25×ry above their
  // centres, so every cluster stays clear of it.)
  const clusters: Array<[number, number, number, number]> = [
    [0, 40, 40, 25],
    [-30, 52, 22, 15],
    [30, 50, 22, 15],
    [-17, 25, 22, 14],
    [17, 23, 22, 14],
    [0, 16, 18, 9],
  ];
  for (const [cx, cy, rx, ry] of clusters) {
    s.push(path(puff(cx, cy, rx, ry, 11, cx * 7 + cy, 0.17), { fill: '#2f6b34', stroke: INK, sw: 2.5 }));
  }
  for (const [cx, cy, rx, ry] of clusters) {
    s.push(path(puff(cx - 2, cy - 2, rx * 0.8, ry * 0.75, 9, cx + cy * 3, 0.16), { fill: '#3f8a3e' }));
  }
  // Individual leaves for texture: lit on the upper left, darker lower right.
  for (let i = 0; i < 80; i++) {
    const a = r() * Math.PI * 2;
    const k = Math.sqrt(r());
    const x = Math.cos(a) * 44 * k;
    const y = 38 + Math.sin(a) * 26 * k;
    const lit = x + (y - 10) * 0.6 < 18;
    const col = lit ? (r() < 0.5 ? '#6cbb52' : '#58a548') : '#357a38';
    const rot = (r() * 360).toFixed(0);
    s.push(group(path('M-5 0Q0 -3.4 5 0Q0 3.4 -5 0Z', { fill: col }), `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})`));
  }
  for (let i = 0; i < 10; i++) {
    const x = -26 + r() * 34;
    const y = 16 + r() * 30;
    s.push(group(path('M-5 0Q0 -3.4 5 0Q0 3.4 -5 0Z', { fill: '#9ad870' }), `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r() * 360).toFixed(0)})`));
  }
  // Terracotta pot
  const pot: Pt[] = [
    [-24, 76],
    [24, 76],
    [18, 108],
    [-18, 108],
  ];
  s.push(`<defs><clipPath id="pot"><path d="${poly(pot)}"/></clipPath></defs>`);
  s.push(path(poly(pot), { fill: '#c8643a' }));
  s.push(group(path('M6 70L30 70L22 112L2 112Z', { fill: '#9c4626' }), undefined, 'clip-path="url(#pot)"'));
  s.push(path('M-16 84Q-14 96 -12 104', { stroke: '#e88a5a', sw: 2.5, opacity: 0.8 }));
  s.push(path(poly(pot), { stroke: INK, sw: 2.5 }));
  s.push(path(curve([[-21, 92], [0, 95], [21, 92]]), { stroke: '#9c4626', sw: 2 }));
  s.push(inked(wobble(rectPts(-28, 68, 56, 10), { seed: 92, wobble: 0.6 }), '#d27248', 2.5));
  s.push(path('M8 69L27 69L27 77L10 77Z', { fill: '#a85030' }));
  s.push(path('M-25 70H6', { stroke: '#f0a070', sw: 1.6, opacity: 0.8 }));
  s.push(ellipse(0, 69, 23, 3, { fill: '#3a2414' }));
  return s.join('');
}

const FICUS = ficus();

/** The movable ficus, in local coords of its 260×120 layer canvas. */
function hallPlant(state: GameState): string {
  return group(FICUS, `translate(${plantX(state) - 620} 0)`);
}

/** The key the ficus was hiding (48×28 layer at 664,396). */
const HALL_KEY = [
  ellipse(26, 18, 16, 3, { fill: '#000000', opacity: 0.3 }),
  group(
    [
      path('M8 -2.5H22V4H19V1H16V4H13V2.5H8Z', { fill: '#e9c45a', stroke: INK, sw: 1.6 }),
      circle(0, 0, 5.5, { fill: '#e9c45a', stroke: INK, sw: 1.8 }),
      circle(0, 0, 2.2, { fill: '#5b4426', stroke: INK, sw: 1.2 }),
      path('M-3.5 -3A4.5 4.5 0 0 1 2 -4', { stroke: '#fff3c4', sw: 1.4 }),
    ],
    'translate(18 14) rotate(-8)'
  ),
  path('M34 4L34 10M31 7L37 7', { stroke: '#fff8d0', sw: 1.6 }),
].join('');

export const hallwayRoom: RoomDef = {
  id: 'hallway',
  name: 'Hall of Science',
  features: [
    'room-to-room doors with fade transitions',
    'smart-click default verbs (just click a door)',
    'named entry points between rooms',
  ],

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: HALL_BG },
    // The key behind the ficus, revealed once the plant has been pushed aside.
    {
      id: 'key',
      depth: Layer.BEHIND,
      x: 664,
      y: 396,
      w: 48,
      h: 28,
      svg: HALL_KEY,
      visible: (state) => !!state.getFlag('plantMoved') && !state.getFlag('keyTaken'),
    },
    // Occluder: actors above y=424 pass behind the plant. Its markup reads
    // the plantMoved flag, so pushing it aside is just setFlag + repaint().
    { id: 'plant', depth: 424, x: 620, y: 316, w: 260, h: 120, svg: hallPlant },
  ],

  walkArea: [
    { x: 60, y: 312 },
    { x: 900, y: 312 },
    { x: 930, y: 445 },
    { x: 30, y: 445 },
  ],
  holes: (state) => {
    const x = plantX(state);
    return [
      [
        { x: x - 26, y: 404 },
        { x: x + 26, y: 404 },
        { x: x + 26, y: 428 },
        { x: x - 26, y: 428 },
      ],
    ];
  },
  scaling: { yTop: 312, scaleTop: 0.72, yBottom: 445, scaleBottom: 1.05 },

  music: 'hall-theme',

  entries: {
    fromLab: { x: 110, y: 345, facing: 'down' },
    fromGallery: { x: 866, y: 345, facing: 'down' },
  },

  hotspots: [
    {
      id: 'labdoor',
      name: 'lab door',
      rect: { x: 34, y: 124, w: 96, h: 184 },
      walkTo: { x: 90, y: 334 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'The door back to the lab.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('lab', 'fromHallway');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('lab', 'fromHallway');
        },
      },
    },
    {
      id: 'gallerydoor',
      name: 'gallery door',
      rect: { x: 824, y: 120, w: 100, h: 188 },
      walkTo: { x: 872, y: 334 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'A door marked GALLERY. Culture awaits.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('gallery', 'fromHallway');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('gallery', 'fromHallway');
        },
      },
    },
    {
      id: 'window',
      name: 'window',
      rect: { x: 180, y: 90, w: 120, h: 90 },
      walkTo: { x: 240, y: 334 },
      facing: 'up',
      on: {
        lookat: 'Outside: weather. Inconclusive.',
        open: "It's painted shut. Science demands a controlled climate.",
      },
    },
    {
      id: 'sign',
      name: 'sign',
      rect: { x: 430, y: 96, w: 200, h: 52 },
      walkTo: { x: 530, y: 334 },
      facing: 'up',
      on: {
        lookat: "'HALL OF SCIENCE.' The sign seems trustworthy.",
        pull: "It's screwed into the wall, and I respect that about it.",
      },
    },
    {
      id: 'plant-moved',
      name: 'potted plant',
      rect: { x: 742, y: 330, w: 96, h: 100 },
      walkTo: { x: 730, y: 428 },
      facing: 'right',
      visible: (state) => !!state.getFlag('plantMoved'),
      on: {
        lookat: 'A ficus. Possibly plastic. Definitely judging me.',
        push: "It's fine where it is now.",
        pull: "No. We've both moved on.",
      },
    },
    {
      id: 'plant',
      name: 'potted plant',
      rect: { x: 652, y: 330, w: 96, h: 100 },
      walkTo: { x: 640, y: 428 },
      facing: 'right',
      visible: (state) => !state.getFlag('plantMoved'),
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('A ficus. Possibly plastic. Definitely judging me.');
          await ctx.playerSay('Is something glinting behind it?');
        },
        push: async (ctx) => {
          await ctx.playerSay('Hnnngh...!');
          ctx.setFlag('plantMoved');
          ctx.repaint();
          ctx.sfx('step');
          await ctx.playerSay('There. And hey — something shiny was hiding back there!');
        },
        pull: "Pushing feels more dignified. Let me push it.",
        pickup: "It's heavier than my ambitions.",
      },
    },
    {
      id: 'key',
      name: 'small key',
      rect: { x: 664, y: 396, w: 48, h: 28 },
      walkTo: { x: 636, y: 420 },
      facing: 'right',
      defaultVerb: 'pickup',
      visible: (state) => !!state.getFlag('plantMoved') && !state.getFlag('keyTaken'),
      on: {
        lookat: 'A small brass key, dusty from its life behind a ficus.',
        pickup: async (ctx) => {
          ctx.setFlag('keyTaken');
          ctx.addItem('key');
          ctx.repaint();
        },
      },
    },
  ],
};
