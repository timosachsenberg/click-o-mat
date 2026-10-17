import { Layer, type RoomDef } from '../../engine/types';
import type { GameState } from '../../engine/GameState';
import {
  INK,
  circle,
  crookedRect,
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

// ---- art -------------------------------------------------------------------------
// Dr. Fred's lab annex: teal wallpaper over plum wainscot, warm plank floor
// in perspective, a hanging bulb, and the Zap-O-Matic. Static art lives in
// the 'bg' layer; everything that changes with state is a small overlay
// layer (visible-toggled or a function of state), so repaints stay cheap.

/** Perspective floor planks converging on a vanishing point above the room. */
function planks(y0: number, y1: number, vp: Pt, colors: string[], seed: number): string {
  const r = rng(seed);
  const s: string[] = [];
  const at = (xb: number, y: number) => vp[0] + ((xb - vp[0]) * (y - vp[1])) / (y1 - vp[1]);
  const step = 74;
  for (let i = -8, k = 0; i < 22; i++, k++) {
    const a = -300 + i * step;
    const b = a + step;
    const quad: Pt[] = [
      [at(a, y0), y0],
      [at(b, y0), y0],
      [b, y1],
      [a, y1],
    ];
    s.push(path(poly(quad), { fill: colors[k % colors.length] }));
    // Staggered butt joints
    for (let j = 0; j < 2; j++) {
      const y = y0 + 12 + r() * (y1 - y0 - 20);
      s.push(line([at(a, y), y], [at(b, y), y], 'rgba(40,18,10,0.45)', 1.5));
    }
    s.push(line([at(a, y0), y0], [a, y1], 'rgba(40,18,10,0.55)', 1.6));
  }
  return s.join('');
}

function labBg(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(11),
      linear('labWall', 0, 0, 0, 300, [
        [0, '#244b4c'],
        [0.5, '#36706a'],
        [1, '#3f7b6f'],
      ]),
      linear('labFloorShade', 0, 300, 0, 450, [
        [0, '#2a1208', 0.55],
        [0.35, '#2a1208', 0.1],
        [1, '#2a1208', 0],
      ]),
      linear('labWains', 0, 232, 0, 300, [
        [0, '#6a4470'],
        [1, '#4a2d50'],
      ])
    )
  );
  // Wall, with a faint diamond wallpaper pattern
  s.push(rect(0, 0, 960, 304, { fill: 'url(#labWall)' }));
  for (let y = 40; y < 230; y += 34) {
    for (let x = (y / 34) % 2 ? 0 : 23; x < 960; x += 46) {
      s.push(path(poly([[x, y - 6], [x + 5, y], [x, y + 6], [x - 5, y]]), { fill: '#7fc0a8', opacity: 0.12 }));
    }
  }
  // Ceiling beam + pipes
  s.push(inked(wobble([[-10, -10], [970, -10], [970, 16], [-10, 20]], { seed: 3, wobble: 2 }), '#2a1d2e', 3));
  s.push(path('M-10 30H960', { stroke: INK, sw: 11 }));
  s.push(path('M-10 30H960', { stroke: '#b57a4a', sw: 6 }));
  s.push(path('M-10 28H960', { stroke: '#e0a870', sw: 1.5, opacity: 0.6 }));
  for (const x of [140, 420, 700]) s.push(rect(x - 6, 22, 12, 16, { fill: '#8e5a34', stroke: INK, sw: 2 }, 2));
  // Pipe dropping down the wall to the machine
  s.push(path('M232 30V120Q232 140 212 140H196', { stroke: INK, sw: 10 }));
  s.push(path('M232 30V120Q232 140 212 140H196', { stroke: '#b57a4a', sw: 5 }));
  s.push(circle(232, 82, 7, { fill: '#c9c2a8', stroke: INK, sw: 2 }));
  s.push(path('M232 82L235 78', { stroke: INK, sw: 1.5 }));

  // Wainscot with panel mouldings
  s.push(rect(0, 232, 960, 66, { fill: 'url(#labWains)' }));
  s.push(path('M0 232H960', { stroke: INK, sw: 3 }));
  s.push(rect(0, 226, 960, 8, { fill: '#2e1f33' }));
  s.push(path('M0 226H960', { stroke: '#8a6a90', sw: 1.5, opacity: 0.7 }));
  for (let x = 12; x < 960; x += 108) {
    s.push(path(wobble(rectPts(x, 244, 88, 42), { seed: x, wobble: 1 }), { fill: '#4e3054', stroke: '#2e1a34', sw: 2 }));
    s.push(path(`M${x + 2} 284H${x + 88}V246`, { stroke: '#7c5a84', sw: 1.4, opacity: 0.7 }));
  }
  // Wall cracks
  s.push(path('M600 120l12 10l-4 9l10 12M612 130l9-3', { stroke: '#1d3a3a', sw: 1.6 }));
  s.push(path('M40 60l8 14l-6 8l9 10', { stroke: '#1d3a3a', sw: 1.6 }));

  // Floor
  s.push(planks(300, 450, [480, 60], ['#a3653a', '#9a5d35', '#ad6f41', '#965a33'], 5));
  s.push(rect(0, 300, 960, 150, { fill: 'url(#labFloorShade)' }));
  // Threadbare rug
  s.push(ellipse(470, 398, 205, 40, { fill: '#2a1208', opacity: 0.25 }));
  s.push(path(wobble([[290, 366], [650, 366], [690, 432], [250, 432]], { seed: 8, wobble: 2.5 }), { fill: '#7d3550', stroke: INK, sw: 2.5 }));
  s.push(path(wobble([[305, 374], [636, 374], [670, 424], [268, 424]], { seed: 9, wobble: 2 }), { stroke: '#e8b04a', sw: 2.5 }));
  for (let i = 0; i < 7; i++) {
    const x = 330 + i * 50;
    s.push(path(poly([[x, 392], [x + 12, 399], [x, 406], [x - 12, 399]]), { fill: '#e8b04a', opacity: 0.7 }));
  }
  for (let x = 254; x < 690; x += 9) s.push(line([x, 432], [x - 1, 438], '#e8d3a8', 1.6));
  // Baseboard (slightly bowed)
  s.push(inked('M-5 290Q480 294 965 290L965 304Q480 308 -5 304Z', '#2e1f33', 2.5));

  // Poster: OBEY THE TENTACLE (taped up crooked)
  s.push(
    group(
      [
        rect(103, 55, 80, 100, { fill: '#1e1424', opacity: 0.3 }),
        inked(wobble(rectPts(100, 52, 80, 100), { seed: 21, wobble: 1.2 }), '#efe2bf', 2.5),
        rect(106, 58, 68, 64, { fill: '#5b2a6a' }),
        path(puff(140, 128, 46, 6, 7, 2), { fill: '#efe2bf' }),
        // the tentacle silhouette, saluting
        inked('M128 118Q126 96 134 82Q138 72 146 74Q154 78 150 90Q146 102 150 118Z', '#5cbf4a', 2),
        circle(141, 82, 3, { fill: '#ffffff', stroke: INK, sw: 1.2 }),
        circle(148, 82, 3, { fill: '#ffffff', stroke: INK, sw: 1.2 }),
        circle(142, 82.5, 1.2, { fill: INK }),
        circle(149, 82.5, 1.2, { fill: INK }),
        path('M117 70l6 3M163 70l-6 3M114 84h7M166 84h-7', { stroke: '#f2c94c', sw: 2 }),
        text(140, 134, 'OBEY THE', { size: 11, fill: '#8a1f2a' }),
        text(140, 147, 'TENTACLE', { size: 12, fill: '#8a1f2a', spacing: 0.5 }),
        rect(95, 48, 16, 7, { fill: '#e8e0b0', opacity: 0.85 }),
        rect(170, 146, 16, 7, { fill: '#e8e0b0', opacity: 0.85 }),
      ],
      'rotate(-3 140 102)'
    )
  );

  // Chalkboard of very important science
  s.push(inked(wobble(crookedRect(372, 64, 196, 108, 3, 2), { seed: 31, wobble: 1.5 }), '#7a4e2c', 3));
  s.push(path(wobble(crookedRect(382, 72, 176, 92, 3, 2), { seed: 32, wobble: 1 }), { fill: '#24352e', stroke: '#1a2621', sw: 2 }));
  s.push(text(430, 100, 'E = mc²', { size: 15, fill: '#e8efe8', family: "'Comic Sans MS', 'Trebuchet MS', sans-serif", weight: 700, rotate: -3 }));
  s.push(path('M400 118q8-10 18 0t18 0M450 132l18-6l-4 10l18-6', { stroke: '#e8efe8', sw: 1.6, opacity: 0.8 }));
  s.push(ellipse(512, 104, 13, 8, { stroke: '#f0c0d0', sw: 1.6 }));
  s.push(path('M502 98l-3-5M520 98l3-5M505 108h2M517 108h2', { stroke: '#f0c0d0', sw: 1.4 }));
  s.push(text(512, 132, '+ ZAP = ?!', { size: 12, fill: '#f6f0a0', family: "'Comic Sans MS', 'Trebuchet MS', sans-serif", weight: 700 }));
  s.push(path('M492 145q25 8 52-2', { stroke: '#e8efe8', sw: 1.4, opacity: 0.6 }));
  s.push(rect(386, 164, 168, 6, { fill: '#6a4426', stroke: INK, sw: 1.5 }));
  s.push(rect(410, 160, 14, 4, { fill: '#f4f0e6' }, 1));

  // Clock (stopped at quarter to never)
  s.push(circle(786, 92, 25, { fill: '#7a4e2c', stroke: INK, sw: 3 }));
  s.push(circle(786, 92, 19, { fill: '#efe6c8', stroke: INK, sw: 2 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s.push(line([786 + Math.cos(a) * 15, 92 + Math.sin(a) * 15], [786 + Math.cos(a) * 17, 92 + Math.sin(a) * 17], INK, 1.5));
  }
  s.push(path('M786 92L776 88M786 92L789 78', { stroke: INK, sw: 2.2 }));
  s.push(path('M770 82a18 18 0 0 1 10-8', { stroke: '#ffffff', sw: 2, opacity: 0.6 }));

  // Hanging bulb + its light on the wall
  s.push(glow('labWallGlow', 470, 70, 330, '#ffe6a8', 0.32, 220));
  s.push(path('M470 30V58', { stroke: INK, sw: 2 }));
  s.push(inked('M456 70L484 70L478 58L462 58Z', '#3a4a48', 2));
  s.push(glow('labBulb', 470, 76, 26, '#fff4c0', 0.9));
  s.push(ellipse(470, 76, 6, 7, { fill: '#fff8d8', stroke: INK, sw: 1.5 }));

  // Zap-O-Matic 3000 (powered-off look; the 'zap' overlay lights it up)
  s.push(ellipse(130, 312, 84, 12, { fill: '#1a0c08', opacity: 0.4 }));
  s.push(line([75, 160], [72, 132], INK, 5));
  s.push(line([75, 160], [72, 132], '#a8b0b8', 2.5));
  s.push(circle(72, 128, 6, { fill: '#c08050', stroke: INK, sw: 2 }));
  s.push(line([186, 160], [190, 128], INK, 5));
  s.push(line([186, 160], [190, 128], '#a8b0b8', 2.5));
  s.push(circle(190, 124, 6, { fill: '#c08050', stroke: INK, sw: 2 }));
  s.push(inked(wobble([[62, 164], [198, 160], [202, 308], [58, 308]], { seed: 41, wobble: 1.4 }), '#6f8597', 3));
  s.push(path('M160 166L200 162L203 306L170 306Z', { fill: '#4e6273' }));
  s.push(path('M66 170Q66 165 72 165', { stroke: '#b8cad6', sw: 2.5 }));
  s.push(inked(wobble(rectPts(70, 166, 120, 17), { seed: 42, wobble: 0.8 }), '#c9b26a', 2));
  s.push(text(130, 179, 'ZAP-O-MATIC', { size: 11, fill: '#3a2410' }));
  // Chamber window
  s.push(inked(wobble(rectPts(78, 188, 104, 66), { seed: 43, wobble: 1 }), '#3c4a56', 3));
  s.push(rect(86, 195, 88, 52, { fill: '#141c22', stroke: INK, sw: 2 }, 8));
  s.push(path('M94 240L120 200M104 242L126 210', { stroke: '#8fb0c0', sw: 2.5, opacity: 0.35 }));
  for (const [x, y] of [[82, 192], [178, 192], [82, 250], [178, 250]]) s.push(circle(x, y, 2, { fill: '#a8b8c4', stroke: INK, sw: 1 }));
  // Control panel: lamp, lever, dial
  s.push(inked(wobble(rectPts(70, 262, 120, 38), { seed: 44, wobble: 0.8 }), '#55697a', 2));
  s.push(circle(90, 281, 8, { fill: '#2a2430', stroke: INK, sw: 2 }));
  s.push(circle(90, 281, 5.5, { fill: '#c43a3a' }));
  s.push(circle(88, 279, 1.6, { fill: '#ffb0a0' }));
  s.push(rect(116, 272, 14, 20, { fill: '#2a2430', stroke: INK, sw: 1.5 }, 2));
  s.push(line([123, 282], [129, 270], INK, 4));
  s.push(circle(129, 269, 3.5, { fill: '#d94a3a', stroke: INK, sw: 1.5 }));
  s.push(circle(162, 281, 11, { fill: '#efe6c8', stroke: INK, sw: 2 }));
  s.push(path('M152 281A10 10 0 0 1 172 281', { stroke: '#c43a3a', sw: 2, opacity: 0.6 }));
  s.push(line([162, 281], [168, 274], INK, 2));
  // Stubby feet, power cable to the wall socket
  s.push(inked('M66 306h18v8h-18z', '#3c4a56', 2));
  s.push(inked('M176 306h18v8h-18z', '#3c4a56', 2));
  s.push(path('M202 292Q236 296 230 312Q226 326 252 318', { stroke: INK, sw: 5 }));
  s.push(path('M202 292Q236 296 230 312Q226 326 252 318', { stroke: '#3a3440', sw: 2.5 }));

  // Workbench (battery goes on top via its own layer)
  s.push(ellipse(475, 306, 108, 10, { fill: '#1a0c08', opacity: 0.4 }));
  s.push(inked('M392 254L404 254L398 306L386 306Z', '#6b4326', 2.5));
  s.push(inked('M546 254L558 254L564 306L552 306Z', '#6b4326', 2.5));
  s.push(path('M396 282L560 282', { stroke: INK, sw: 6 }));
  s.push(path('M396 282L560 282', { stroke: '#7d5232', sw: 3 }));
  s.push(inked(wobble([[378, 238], [572, 236], [574, 254], [376, 256]], { seed: 51, wobble: 1 }), '#b07a46', 3));
  s.push(path('M382 240L568 238', { stroke: '#d8a46a', sw: 1.5 }));
  s.push(path('M378 250L574 248', { stroke: '#7d5232', sw: 2 }));
  // Flask of something purple, test tubes
  s.push(inked('M404 238L404 222L398 222L398 214L414 214L414 222L408 222L408 226Q424 236 418 238Z', '#e8f0f4', 2));
  s.push(path('M399 238Q404 228 417 230L418 238Z', { fill: '#a04ad0' }));
  s.push(circle(410, 210, 2.5, { fill: '#c890e0', opacity: 0.8 }));
  s.push(circle(414, 202, 1.8, { fill: '#c890e0', opacity: 0.6 }));
  s.push(inked('M512 238V226h44v12z', '#7d5232', 2));
  for (const [x, c] of [[520, '#5cbf4a'], [532, '#e85a5a'], [544, '#f2c94c']] as Array<[number, string]>) {
    s.push(inked(`M${x - 3} 230V212h6v18a3 3 0 0 1 -6 0z`, '#e8f0f4', 1.5));
    s.push(path(`M${x - 2} 224v6a2 2 0 0 0 4 0v-6z`, { fill: c }));
  }

  // Wall cabinet shadow (the cabinet itself is the 'cabinet' layer)
  s.push(rect(626, 186, 100, 110, { fill: '#10201e', opacity: 0.35 }, 4));

  // Door to the hallway: crooked, panelled, with a little plate above
  s.push(inked(wobble([[830, 124], [934, 120], [932, 310], [832, 310]], { seed: 61, wobble: 1.5 }), '#4a2e1e', 3));
  s.push(inked(wobble([[842, 134], [922, 131], [922, 308], [842, 308]], { seed: 62, wobble: 1.2 }), '#9a6038', 2.5));
  s.push(path('M890 133L922 131L922 308L896 308Z', { fill: '#7e4c2c' }));
  s.push(path(wobble(rectPts(854, 146, 56, 68), { seed: 63, wobble: 1 }), { fill: '#87522f', stroke: '#4a2e1e', sw: 2 }));
  s.push(path(wobble(rectPts(854, 226, 56, 70), { seed: 64, wobble: 1 }), { fill: '#87522f', stroke: '#4a2e1e', sw: 2 }));
  s.push(path('M856 212V148H908', { stroke: '#c48a5a', sw: 1.5, opacity: 0.7 }));
  s.push(circle(850, 226, 5, { fill: '#e8c23a', stroke: INK, sw: 2 }));
  s.push(circle(848.5, 224.5, 1.5, { fill: '#fff4b0' }));
  s.push(inked(wobble(rectPts(856, 102, 52, 14), { seed: 65, wobble: 0.6 }), '#c9b26a', 2));
  s.push(text(882, 113, 'HALL →', { size: 9, fill: '#3a2410' }));

  // Light pool on the floor, vignette, paper grain
  s.push(glow('labFloorGlow', 480, 372, 330, '#ffd890', 0.2, 72));
  s.push(vignette('labVig', 960, 450, 0.4));
  s.push(grainOverlay(960, 450));
  return s.join('');
}

const LAB_BG = labBg();

/** The Zap-O-Matic powered up (overlay on the 'bg' machine, local to a
 *  200×230 layer at 40,100): green chamber glow, green lamp, coil sparks. */
const LAB_ZAP = [
  glow('zapSpill', 90, 120, 120, '#7aff8a', 0.35, 100),
  path('M46 145L52 136L60 142L66 132', { stroke: '#d8ffd0', sw: 2.5 }),
  path('M46 145L52 136L60 142L66 132', { stroke: '#5cff6a', sw: 1, opacity: 0.9 }),
  path('M150 24L156 14L146 10L152 2', { stroke: '#d8ffd0', sw: 2.5, opacity: 0.9 }),
  path('M32 28L26 18L36 14L30 4', { stroke: '#d8ffd0', sw: 2.5, opacity: 0.9 }),
  rect(46, 95, 88, 52, { fill: '#2aa84a', stroke: INK, sw: 2 }, 8),
  glow('zapCore', 90, 121, 40, '#e8ffd0', 0.9, 24),
  path('M54 140L80 100M64 142L86 110', { stroke: '#e8ffe0', sw: 2.5, opacity: 0.5 }),
  circle(50, 181, 5.5, { fill: '#5cff6a' }),
  glow('zapLamp', 50, 181, 14, '#9cff9a', 0.8),
  circle(48, 179, 1.6, { fill: '#f0fff0' }),
].join('');

/** The 9-volt on the workbench (52×30 layer at 440,214). */
const LAB_BATTERY = group(
  [
    ellipse(2, 12, 18, 3.5, { fill: '#1a0c08', opacity: 0.35 }),
    rect(-15, -7, 28, 14, { fill: '#e8c23a', stroke: INK, sw: 2 }, 2),
    rect(-15, -7, 9, 14, { fill: '#2b2a36', stroke: INK, sw: 2 }, 2),
    rect(13, -3.5, 4, 7, { fill: '#b8bcc8', stroke: INK, sw: 1.5 }, 1),
    path('M-2 -4.5H10', { stroke: '#fff6c8', sw: 1.4, opacity: 0.8 }),
  ],
  'translate(24 15) rotate(-6)'
);

/** The wall cabinet (130×140 layer at 606,166): locked, open, or open and
 *  hamster-less. */
function labCabinet(state: GameState): string {
  const ox = -606;
  const oy = -166;
  const s: string[] = [];
  const t = `translate(${ox} ${oy})`;
  if (state.getFlag('cabinetOpen')) {
    s.push(inked(wobble([[618, 180], [722, 178], [722, 292], [620, 292]], { seed: 71, wobble: 1 }), '#3a2618', 3));
    s.push(rect(626, 186, 90, 100, { fill: '#24160e' }));
    s.push(path('M626 186H716V196H626Z', { fill: '#1a0f08' }));
    s.push(inked('M624 240H718V247H624Z', '#7d5232', 2));
    // Jars on the shelves
    s.push(inked('M636 286V266h14v20z', '#c8e0e8', 1.5));
    s.push(path('M637 285V274h12v11z', { fill: '#d0a040', opacity: 0.8 }));
    s.push(inked('M694 286V262h16v24z', '#c8e0e8', 1.5));
    s.push(circle(702, 276, 5, { fill: '#e8e0c8', stroke: INK, sw: 1 }));
    s.push(inked('M700 240V222h12v18z', '#c8e0e8', 1.5));
    if (!state.getFlag('hamsterTaken')) {
      // The hamster: round, unimpressed.
      s.push(ellipse(668, 240, 16, 3, { fill: '#000000', opacity: 0.35 }));
      s.push(inked('M652 238Q650 220 666 218Q684 218 684 236Q676 242 660 241Z', '#c98a4a', 2));
      s.push(circle(658, 220, 3.6, { fill: '#c98a4a', stroke: INK, sw: 1.6 }));
      s.push(circle(668, 217, 3.6, { fill: '#c98a4a', stroke: INK, sw: 1.6 }));
      s.push(ellipse(668, 234, 8, 4.5, { fill: '#f1d9b4' }));
      s.push(circle(658, 228, 2.4, { fill: '#ffffff', stroke: INK, sw: 1 }));
      s.push(circle(657.6, 228.6, 1.2, { fill: INK }));
      s.push(path('M655 226L661 225', { stroke: INK, sw: 1.4 }));
      s.push(circle(652.5, 231, 1.2, { fill: '#e07a8a' }));
    }
    // Door leaf swung open
    s.push(inked(wobble([[722, 178], [740, 186], [740, 286], [722, 292]], { seed: 72, wobble: 0.8 }), '#a06a3e', 2.5));
    s.push(path('M727 190V284', { stroke: '#6b4326', sw: 1.5 }));
  } else {
    s.push(inked(wobble([[618, 180], [722, 178], [722, 292], [620, 292]], { seed: 71, wobble: 1 }), '#a06a3e', 3));
    s.push(path('M680 181L721 179L721 291L684 291Z', { fill: '#86552f' }));
    s.push(path('M670 180Q671 236 670 292', { stroke: INK, sw: 2.5 }));
    s.push(path(wobble(rectPts(628, 190, 34, 92), { seed: 73, wobble: 0.8 }), { stroke: '#6b4326', sw: 2 }));
    s.push(path(wobble(rectPts(678, 190, 34, 92), { seed: 74, wobble: 0.8 }), { stroke: '#5a3820', sw: 2 }));
    s.push(path('M630 196V276', { stroke: '#d0965e', sw: 1.4, opacity: 0.7 }));
    // A sturdy little padlock
    s.push(path('M660 230a5 5 0 0 1 10 0v6', { stroke: INK, sw: 2.6 }));
    s.push(path('M660 230a5 5 0 0 1 10 0v6', { stroke: '#b8bcc8', sw: 1.2 }));
    s.push(rect(657, 235, 16, 13, { fill: '#e8c23a', stroke: INK, sw: 2 }, 2));
    s.push(circle(665, 240, 1.6, { fill: INK }));
    s.push(path('M665 241v4', { stroke: INK, sw: 1.4 }));
  }
  // Crown moulding
  s.push(inked(wobble([[612, 172], [728, 170], [726, 182], [614, 184]], { seed: 75, wobble: 0.6 }), '#6b4326', 2.5));
  return group(s, t);
}

/** The floor lamp, in local coords of its 70×225 layer canvas (occluder).
 *  Its left margin stays transparent — the renderer test samples it. */
const LAB_LAMP = [
  ellipse(33, 214, 26, 7, { fill: '#1a0c08', opacity: 0.4 }),
  inked('M14 212Q14 202 33 200Q52 202 52 212Q52 218 33 218Q14 218 14 212Z', '#3a3448', 2.5),
  path('M20 208Q33 203 46 208', { stroke: '#6a6080', sw: 1.6 }),
  path('M33 202Q30 120 34 40', { stroke: INK, sw: 7 }),
  path('M33 202Q30 120 34 40', { stroke: '#7a6a50', sw: 3.5 }),
  circle(32, 120, 4, { fill: '#c9a24a', stroke: INK, sw: 1.8 }),
  inked(wobble([[14, 42], [56, 40], [46, 6], [22, 8]], { seed: 81, wobble: 1 }), '#e0b85a', 2.5),
  path('M38 9L47 9L55 40L44 41Z', { fill: '#b88a38' }),
  path('M24 12L18 38', { stroke: '#f8dc90', sw: 2 }),
  ...Array.from({ length: 8 }, (_, i) => line([16 + i * 5.3, 42], [16 + i * 5.3, 48], INK, 1.6)),
].join('');

export const labRoom: RoomDef = {
  id: 'lab',
  name: "Dr. Fred's Lab Annex",
  features: [
    'the nine-verb interface & inventory',
    'walk-area pathfinding around obstacles',
    'depth-sorted occluders (the lamp & plant)',
    'an actor-bound NPC hotspot (Ned)',
    'item pickup, use, and combine',
  ],

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: LAB_BG },
    // State overlays on the backdrop (same depth: stacked in array order).
    {
      id: 'zap',
      depth: Layer.BEHIND,
      x: 40,
      y: 100,
      w: 200,
      h: 230,
      svg: LAB_ZAP,
      visible: (state) => !!state.getFlag('machinePowered'),
    },
    {
      id: 'battery',
      depth: Layer.BEHIND,
      x: 440,
      y: 214,
      w: 52,
      h: 30,
      svg: LAB_BATTERY,
      visible: (state) => !state.getFlag('batteryTaken'),
    },
    // The cabinet's look is a function of state: one cached texture per variant.
    { id: 'cabinet', depth: Layer.BEHIND, x: 606, y: 166, w: 140, h: 140, svg: labCabinet },
    // Occluder: actors whose feet are above y=342 render behind the lamp.
    { id: 'lamp', depth: 342, x: 270, y: 128, w: 70, h: 225, svg: LAB_LAMP },
  ],

  walkArea: [
    { x: 70, y: 312 },
    { x: 920, y: 312 },
    { x: 940, y: 445 },
    { x: 25, y: 445 },
  ],
  holes: [
    // Floor lamp base (a walk-behind prop)
    [
      { x: 285, y: 322 },
      { x: 318, y: 322 },
      { x: 318, y: 348 },
      { x: 285, y: 348 },
    ],
    // Ned the tentacle
    [
      { x: 722, y: 395 },
      { x: 768, y: 395 },
      { x: 768, y: 418 },
      { x: 722, y: 418 },
    ],
  ],
  scaling: { yTop: 312, scaleTop: 0.72, yBottom: 445, scaleBottom: 1.05 },

  music: 'lab-theme',

  entries: {
    start: { x: 480, y: 410, facing: 'down' },
    fromHallway: { x: 866, y: 345, facing: 'down' },
  },

  actors: [{ id: 'tent', x: 745, y: 405, facing: 'down' }],

  async onEnter(ctx) {
    if (ctx.flag('introDone')) return;
    ctx.setFlag('introDone');
    await ctx.wait(400);
    await ctx.playerSay('Okay. Weird lab, weird smell, giant talking tentacle.');
    await ctx.playerSay('Tuesday, then.');
  },

  hotspots: [
    {
      id: 'poster',
      name: 'poster',
      rect: { x: 100, y: 52, w: 80, h: 100 },
      walkTo: { x: 140, y: 325 },
      facing: 'up',
      on: {
        lookat: "'OBEY THE TENTACLE.' Bold marketing strategy.",
        pull: "It's glued on. Aggressively.",
        push: "It's a poster. It has no moving parts.",
      },
    },
    {
      id: 'machine',
      name: 'Zap-O-Matic',
      rect: { x: 60, y: 160, w: 140, h: 150 },
      walkTo: { x: 150, y: 332 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          if (ctx.flag('machinePowered')) {
            await ctx.playerSay('The Zap-O-Matic is humming. The power light is green.');
          } else {
            await ctx.playerSay('A ZAP-O-MATIC 3000. The power light is dark.');
            await ctx.playerSay('Looks like it takes a battery. A suspiciously ordinary battery.');
          }
        },
        open: 'Better not. The warranty voids if you even look at the screws.',
        use: "I'm not sticking my hand in there.",
        pull: "It's bolted down, like everything fun in this lab.",
      },
      onItem: {
        use: {
          battery: async (ctx) => {
            ctx.removeItem('battery');
            ctx.setFlag('machinePowered');
            ctx.repaint();
            ctx.sfx('zap');
            ctx.flash(0xaaffaa, 250);
            await ctx.playerSay('The battery slots right in. The machine shudders awake.');
            await ctx.playerSay("That's either progress or a war crime.");
          },
          hamster: async (ctx) => {
            if (!ctx.flag('machinePowered')) {
              await ctx.playerSay('The machine has no power. The hamster looks relieved.');
              return;
            }
            await ctx.playerSay('In you go, little guy. For science.');
            ctx.sfx('zap');
            ctx.shake(400, 0.012);
            ctx.flash(0xaaffaa, 400);
            await ctx.wait(500);
            ctx.removeItem('hamster');
            ctx.addItem('glowhamster');
            await ctx.playerSay('He... glows now. And he seems fine? Great, even?');
          },
          glowhamster: 'Once was enough. He is still vibrating.',
        },
      },
    },
    {
      id: 'lamp',
      name: 'floor lamp',
      rect: { x: 278, y: 134, w: 52, h: 212 },
      walkTo: { x: 260, y: 350 },
      facing: 'right',
      on: {
        lookat: 'A floor lamp. It has seen things.',
        use: "There's no switch. Spooky.",
        push: "It's bolted to the floor.",
        pull: "It's bolted to the floor. Symmetrically.",
      },
    },
    {
      id: 'table',
      name: 'table',
      rect: { x: 380, y: 238, w: 190, h: 66 },
      walkTo: { x: 470, y: 332 },
      facing: 'up',
      on: {
        lookat: 'A sturdy lab table. Scorch marks included at no extra cost.',
      },
    },
    {
      id: 'battery',
      name: 'battery',
      rect: { x: 446, y: 220, w: 40, h: 24 },
      walkTo: { x: 466, y: 332 },
      facing: 'up',
      defaultVerb: 'pickup',
      visible: (state) => !state.getFlag('batteryTaken'),
      on: {
        lookat: 'A 9-volt battery, just lying on the table like bait.',
        pickup: async (ctx) => {
          ctx.setFlag('batteryTaken');
          ctx.addItem('battery');
          ctx.repaint();
        },
      },
    },
    {
      id: 'cabinet',
      name: 'wall cabinet',
      rect: { x: 620, y: 180, w: 100, h: 110 },
      walkTo: { x: 665, y: 332 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: async (ctx) => {
          if (!ctx.flag('cabinetOpen')) {
            await ctx.playerSay('A wall cabinet with a sturdy little lock.');
          } else if (!ctx.flag('hamsterTaken')) {
            await ctx.playerSay('Dusty shelves. Current occupancy: one (1) hamster.');
          } else {
            await ctx.playerSay('Empty now. The hamster left no forwarding address.');
          }
        },
        open: async (ctx) => {
          if (ctx.flag('cabinetOpen')) await ctx.playerSay("It's already open.");
          else {
            ctx.sfx('deny');
            await ctx.playerSay('Locked. Naturally.');
          }
        },
        close: async (ctx) => {
          if (ctx.flag('cabinetOpen')) await ctx.playerSay('I might still need it open.');
          else await ctx.playerSay("It's as closed as it gets.");
        },
      },
      onItem: {
        use: {
          key: async (ctx) => {
            if (ctx.flag('cabinetOpen')) {
              await ctx.playerSay("It's already open.");
              return;
            }
            ctx.setFlag('cabinetOpen');
            ctx.repaint();
            ctx.sfx('open');
            await ctx.playerSay('The key fits! And there is... a hamster?');
          },
        },
      },
    },
    {
      id: 'hamster',
      name: 'hamster',
      rect: { x: 645, y: 215, w: 50, h: 40 },
      walkTo: { x: 665, y: 332 },
      facing: 'up',
      defaultVerb: 'pickup',
      visible: (state) => !!state.getFlag('cabinetOpen') && !state.getFlag('hamsterTaken'),
      on: {
        lookat: 'A fat, judgmental hamster living in a locked cabinet. Sure.',
        pickup: async (ctx) => {
          ctx.setFlag('hamsterTaken');
          ctx.addItem('hamster');
          ctx.repaint();
          await ctx.playerSay("Come here, fuzzball. You have a destiny.");
        },
        talkto: 'He stares back. Volumes are spoken. None aloud.',
      },
    },
    {
      id: 'door',
      name: 'hallway door',
      rect: { x: 834, y: 124, w: 96, h: 184 },
      walkTo: { x: 876, y: 334 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'A door leading to the hallway.',
        open: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('hallway', 'fromLab');
        },
        use: async (ctx) => {
          ctx.sfx('open');
          await ctx.goToRoom('hallway', 'fromLab');
        },
        close: "It's already closed. Doors are binary like that.",
      },
    },
    {
      id: 'tent',
      name: 'Ned the Tentacle',
      // Live-bound hotspot (he doesn't move, but this stays correct if he
      // ever does — and he turns to face whoever addresses him).
      actor: 'tent',
      defaultVerb: 'talkto',
      on: {
        lookat: 'A green tentacle. Friendly, in a boneless sort of way.',
        talkto: async (ctx) => {
          await ctx.dialog('tent-chat');
        },
        push: 'He would jiggle, and we would both be embarrassed.',
        pickup: "He's a tentacle, not a souvenir.",
      },
      onItem: {
        use: {
          battery: "He's not battery operated. I asked.",
          hamster: "He's not a tool. He's a tentacle.",
        },
        give: {
          battery: async (ctx) => {
            await ctx.say('tent', "No hands. Also: not fuzzy. ZERO of my criteria met.");
          },
          hamster: async (ctx) => {
            await ctx.say('tent', 'Cute! Warm! Fuzzy! But not radioactive. I have STANDARDS.');
            await ctx.playerSay('Everyone’s a critic.');
          },
          glowhamster: async (ctx) => {
            ctx.removeItem('glowhamster');
            await ctx.say('tent', 'A glowing hamster! Warm! Fuzzy! RADIOACTIVE!');
            ctx.sfx('win');
            ctx.flash(0xffffaa, 500);
            await ctx.say('tent', 'You are my hero. My squishy, opposable-thumbed hero.');
            await ctx.playerSay("All in a day's work.");
            ctx.setFlag('gameWon');
            ctx.showTitle('THE END\n(of the demo)');
          },
        },
      },
    },
  ],
};
