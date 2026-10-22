import { Layer, type RoomDef } from '../../engine/types';
import type { ScriptContext } from '../../engine/ScriptContext';
import {
  INK,
  circle,
  crookedRect,
  defs,
  ellipse,
  glow,
  grainDefs,
  grainOverlay,
  inked,
  line,
  linear,
  path,
  rect,
  rectPts,
  rng,
  text,
  vignette,
  wobble,
} from '../../game/art/toon';

// ---- art -------------------------------------------------------------------------
// Ali's Eck, a corner pub at night: nicotine-yellow striped wallpaper over a
// dark wainscot, the door and a rainy window on the left, the back bar
// (drinks board, bottle shelf, a fridge full of exactly one kind of energy
// drink) behind a long wooden counter. The counter and the bar stools are
// occluder layers, so Ali stands behind his counter and the player can walk
// behind the stools.

const CHALK = "'Comic Sans MS', 'Trebuchet MS', sans-serif";

function kneipeBg(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(23),
      linear('knWall', 0, 0, 0, 300, [
        [0, '#4a3020'],
        [0.45, '#8a6436'],
        [1, '#7a5530'],
      ]),
      linear('knFloor', 0, 300, 0, 450, [
        [0, '#2a160c'],
        [1, '#5a3420'],
      ]),
      linear('knNight', 0, 90, 0, 215, [
        [0, '#0e1430'],
        [1, '#2a2450'],
      ])
    )
  );
  // Wall: striped wallpaper, decades of smoke near the ceiling.
  s.push(rect(0, 0, 960, 304, { fill: 'url(#knWall)' }));
  for (let x = 0; x < 960; x += 24) s.push(rect(x, 0, 9, 222, { fill: '#a87c44', opacity: 0.18 }));
  for (let x = 12; x < 960; x += 48) {
    for (let y = 30; y < 210; y += 36) s.push(circle(x, y, 2.2, { fill: '#c99a58', opacity: 0.22 }));
  }
  s.push(rect(0, 0, 960, 40, { fill: '#2a1a10', opacity: 0.45 }));
  // Ceiling beam
  s.push(inked(wobble([[-10, -10], [970, -10], [970, 14], [-10, 18]], { seed: 4, wobble: 2 }), '#3a2414', 3));

  // Wainscot
  s.push(rect(0, 222, 960, 80, { fill: '#4a2c1a' }));
  s.push(path('M0 222H960', { stroke: INK, sw: 3 }));
  s.push(rect(0, 216, 960, 8, { fill: '#2e1a10' }));
  for (let x = 6; x < 960; x += 64) {
    s.push(path(wobble(rectPts(x, 232, 52, 58), { seed: x + 3, wobble: 0.8 }), { fill: '#55331e', stroke: '#2a160c', sw: 2 }));
  }

  // Floor: old planks, running across the room, darker towards the back.
  s.push(rect(0, 300, 960, 150, { fill: 'url(#knFloor)' }));
  const r = rng(77);
  let y = 304;
  for (let i = 0; y < 452; i++) {
    const h = 8 + i * 2.2;
    s.push(line([0, y], [960, y + (r() - 0.5) * 2], 'rgba(20,8,4,0.6)', 1.6));
    for (let k = 0; k < 4; k++) {
      const x = r() * 960;
      s.push(line([x, y], [x, y + h], 'rgba(20,8,4,0.45)', 1.4));
    }
    y += h;
  }
  s.push(inked('M-5 296Q480 300 965 296L965 306Q480 310 -5 306Z', '#2e1a10', 2.5));

  // Door to the street (left): glass pane with the night behind it.
  s.push(inked(wobble([[36, 104], [134, 100], [134, 302], [38, 302]], { seed: 11, wobble: 1.4 }), '#3a2414', 3));
  s.push(inked(wobble([[46, 112], [124, 109], [124, 300], [47, 300]], { seed: 12, wobble: 1.2 }), '#7a4a26', 2.5));
  s.push(path(wobble(rectPts(56, 120, 58, 92), { seed: 13, wobble: 0.8 }), { fill: 'url(#knNight)', stroke: INK, sw: 2.5 }));
  s.push(glow('knDoorLamp', 96, 140, 30, '#ffcf70', 0.5));
  s.push(path('M62 200L76 130M72 206L88 136', { stroke: '#b8c8ff', sw: 1.5, opacity: 0.25 }));
  s.push(path(wobble(rectPts(58, 228, 54, 60), { seed: 14, wobble: 0.8 }), { fill: '#6a3e20', stroke: '#3a2414', sw: 2 }));
  s.push(circle(116, 222, 5, { fill: '#e8c23a', stroke: INK, sw: 2 }));
  s.push(path('M86 86V100', { stroke: INK, sw: 2 }));
  s.push(path('M78 86Q86 74 94 86Z', { fill: '#e8c23a', stroke: INK, sw: 2 }));
  s.push(text(85, 98, 'AUSGANG', { size: 8, fill: '#9adf8a', stroke: INK, sw: 2 }));

  // Window: drizzle, a street lamp, and the red BIER neon.
  s.push(inked(wobble(crookedRect(160, 84, 142, 134, 1, 1), { seed: 21, wobble: 1.2 }), '#3a2414', 3));
  s.push(path(wobble(rectPts(170, 92, 122, 116), { seed: 22, wobble: 0.6 }), { fill: 'url(#knNight)', stroke: INK, sw: 2 }));
  s.push(path('M170 186L210 176L240 182L292 170V208H170Z', { fill: '#141024' }));
  s.push(path('M262 208V126', { stroke: '#2a2440', sw: 4 }));
  s.push(path('M262 128Q262 118 252 118', { stroke: '#2a2440', sw: 3 }));
  s.push(glow('knStreet', 250, 124, 26, '#ffd890', 0.7));
  const rr = rng(5);
  for (let i = 0; i < 22; i++) {
    const x = 174 + rr() * 114;
    const yy = 96 + rr() * 100;
    s.push(line([x, yy], [x - 2, yy + 8], '#9ab0ff', 1, 0.35));
  }
  s.push(path('M231 92V208M170 150H292', { stroke: '#3a2414', sw: 5 }));
  s.push(glow('knNeon', 230, 196, 48, '#ff4a5a', 0.4, 20));
  s.push(text(230, 205, 'Bier', { size: 22, fill: 'none', stroke: '#ff6a78', sw: 2.4, family: CHALK, weight: 700 }));
  s.push(text(230, 205, 'Bier', { size: 22, fill: 'none', stroke: '#ffe0e4', sw: 0.8, family: CHALK, weight: 700 }));
  s.push(rect(158, 216, 146, 8, { fill: '#5a3a22', stroke: INK, sw: 2 }));

  // Dartboard (the darts are long gone).
  s.push(circle(348, 106, 22, { fill: '#1e1a18', stroke: INK, sw: 2.5 }));
  for (let i = 0; i < 20; i++) {
    const a0 = (i / 20) * Math.PI * 2;
    const a1 = ((i + 1) / 20) * Math.PI * 2;
    const pt = (rad: number, a: number) => `${(348 + Math.cos(a) * rad).toFixed(1)} ${(106 + Math.sin(a) * rad).toFixed(1)}`;
    s.push(path(`M348 106L${pt(18, a0)}A18 18 0 0 1 ${pt(18, a1)}Z`, { fill: i % 2 ? '#e8dcb4' : '#2a2420' }));
  }
  s.push(circle(348, 106, 18, { stroke: '#c43a3a', sw: 2.2 }));
  s.push(circle(348, 106, 10, { stroke: '#3a8a4a', sw: 2 }));
  s.push(circle(348, 106, 3, { fill: '#c43a3a', stroke: INK, sw: 1 }));

  // Slot machine ("Daddelautomat"), lights dimmed to save electricity.
  s.push(ellipse(348, 300, 36, 6, { fill: '#000000', opacity: 0.35 }));
  s.push(inked(wobble([[318, 160], [378, 158], [380, 300], [316, 300]], { seed: 31, wobble: 1 }), '#8a2a3a', 3));
  s.push(path('M362 160L378 158L380 300L364 300Z', { fill: '#6a1e2c' }));
  s.push(inked(wobble(rectPts(326, 170, 44, 20), { seed: 32, wobble: 0.5 }), '#e8c23a', 2));
  s.push(text(348, 184, 'JACKPOT', { size: 7, fill: '#6a1e2c' }));
  s.push(inked(wobble(rectPts(326, 198, 44, 30), { seed: 33, wobble: 0.5 }), '#f4f0e6', 2));
  for (const [x, c] of [[334, '#c43a3a'], [348, '#3a8a4a'], [362, '#e8c23a']] as Array<[number, string]>) {
    s.push(circle(x, 213, 4.5, { fill: c, stroke: INK, sw: 1.2 }));
  }
  s.push(path('M326 205H370M326 221H370', { stroke: '#c8c0b0', sw: 1 }));
  for (let i = 0; i < 6; i++) s.push(circle(328 + i * 8, 240, 2.6, { fill: i % 2 ? '#ffd34a' : '#ff8a5a', stroke: INK, sw: 1 }));
  s.push(inked('M330 254h36v10h-36z', '#2a1a14', 1.6));
  s.push(rect(340, 258, 16, 2.5, { fill: '#c8ccd4' }));
  s.push(path('M380 184L390 178L392 196', { stroke: INK, sw: 4 }));
  s.push(circle(392, 176, 4, { fill: '#c43a3a', stroke: INK, sw: 1.5 }));

  // Behind the bar: drinks board, bottle shelf, the fridge.
  s.push(inked(wobble(crookedRect(406, 56, 138, 116, 2, 1), { seed: 41, wobble: 1.4 }), '#6a4222', 3));
  s.push(path(wobble(crookedRect(414, 63, 122, 101, 2, 1), { seed: 42, wobble: 1 }), { fill: '#1e2a26', stroke: '#141c1a', sw: 2 }));
  s.push(text(476, 80, 'ENERGY', { size: 12, fill: '#f4f0e6', family: CHALK, weight: 700, rotate: -2 }));
  s.push(text(474, 101, 'Red Cow', { size: 11, fill: '#ff8a8a', family: CHALK, weight: 700 }));
  s.push(text(474, 117, 'Flying Pony', { size: 11, fill: '#8ac8ff', family: CHALK, weight: 700 }));
  s.push(text(474, 133, 'Magic Woman', { size: 11, fill: '#e0a8ff', family: CHALK, weight: 700 }));
  s.push(text(476, 152, 'je 2,– €  inkl. Pfand', { size: 9, fill: '#f6f0a0', family: CHALK, weight: 700 }));
  s.push(path('M424 88q50 -6 104 0', { stroke: '#f4f0e6', sw: 1.2, opacity: 0.6 }));

  // Shelf: two boards of bottles, a mirror strip behind them.
  s.push(rect(560, 92, 240, 122, { fill: '#2a1a12', stroke: INK, sw: 2.5 }));
  s.push(rect(566, 98, 228, 110, { fill: '#5a6a6e', opacity: 0.35 }));
  s.push(path('M580 100L620 206M640 100L680 206', { stroke: '#e8f0f4', sw: 3, opacity: 0.12 }));
  const br = rng(9);
  const bottleColors = ['#3a7a3a', '#7a3a1a', '#c8a040', '#e8e0d0', '#2a4a7a', '#8a2a2a', '#4a3a2a'];
  for (const shelfY of [148, 206]) {
    s.push(inked(`M556 ${shelfY}H804V${shelfY + 7}H556Z`, '#7a4a26', 2));
    let x = 572;
    while (x < 790) {
      const w = 9 + br() * 6;
      const h = 30 + br() * 16;
      const c = bottleColors[Math.floor(br() * bottleColors.length)];
      const neck = w * 0.35;
      s.push(inked(`M${x} ${shelfY}V${shelfY - h * 0.62}Q${x} ${shelfY - h * 0.75} ${x + w / 2 - neck / 2} ${shelfY - h * 0.8}V${shelfY - h}H${x + w / 2 + neck / 2}V${shelfY - h * 0.8}Q${x + w} ${shelfY - h * 0.75} ${x + w} ${shelfY - h * 0.62}V${shelfY}Z`, c, 1.6));
      s.push(rect(x + 1.5, shelfY - h * 0.5, w - 3, h * 0.22, { fill: '#f4f0e6', opacity: 0.85 }));
      s.push(line([x + 2, shelfY - 4], [x + 2, shelfY - h * 0.6], '#ffffff', 1.2, 0.35));
      x += w + 4 + br() * 5;
    }
  }
  // Football scarf draped over the shelf.
  s.push(path('M556 92Q620 112 680 96Q740 112 804 92', { stroke: INK, sw: 11 }));
  s.push(path('M556 92Q620 112 680 96Q740 112 804 92', { stroke: '#2a6ac0', sw: 7 }));
  s.push(path('M556 92Q620 112 680 96Q740 112 804 92', { stroke: '#f4f0e6', sw: 2.5, extra: 'stroke-dasharray="8 8"' }));
  s.push(text(680, 88, 'SV ECKE 09', { size: 10, fill: '#f4f0e6', stroke: INK, sw: 2.5 }));

  // Back counter under the shelf (mostly hidden by the front counter).
  s.push(inked('M548 214H960V300H548Z', '#3a2214', 2.5));
  s.push(path('M548 222H960', { stroke: '#6a4222', sw: 2 }));

  // The fridge: a glass door, energy drinks in three colour-coded rows.
  s.push(inked(wobble([[814, 116], [908, 114], [910, 300], [812, 300]], { seed: 51, wobble: 1 }), '#d8dce0', 3));
  s.push(path(wobble(rectPts(822, 124, 78, 150), { seed: 52, wobble: 0.6 }), { fill: '#a8d0e0', stroke: INK, sw: 2 }));
  s.push(glow('knFridge', 861, 196, 46, '#e8fbff', 0.5, 80));
  const row = (yy: number, c: string | null, label: string) => {
    s.push(path(`M824 ${yy + 22}H898`, { stroke: '#7a8a90', sw: 2 }));
    if (!c) {
      s.push(text(861, yy + 14, label, { size: 6, fill: '#5a6a70', weight: 700 }));
      return;
    }
    for (let i = 0; i < 6; i++) {
      const x = 828 + i * 11.5;
      s.push(rect(x, yy, 8, 21, { fill: c, stroke: INK, sw: 1.2 }, 2));
      s.push(rect(x + 1.5, yy + 8, 5, 4, { fill: '#ffd34a' }));
    }
  };
  row(128, null, '— leer —');
  row(176, null, '— leer —');
  row(224, '#7a3aa8', '');
  s.push(text(861, 160, 'RED COW', { size: 6, fill: '#c43a3a', weight: 700 }));
  s.push(text(861, 208, 'FLYING PONY', { size: 6, fill: '#2a6ac0', weight: 700 }));
  s.push(path('M826 130L846 270', { stroke: '#ffffff', sw: 3, opacity: 0.25 }));
  s.push(rect(902, 170, 4, 40, { fill: '#8a8e98', stroke: INK, sw: 1.2 }, 2));
  s.push(text(861, 290, 'KALT', { size: 9, fill: '#2a6ac0' }));

  // Framed photo: Ali, 1987, same moustache.
  s.push(inked(wobble(rectPts(918, 138, 40, 50), { seed: 61, wobble: 0.6 }), '#c9a24a', 2.5));
  s.push(rect(923, 143, 30, 40, { fill: '#c8b090' }));
  s.push(circle(938, 158, 8, { fill: '#a8805a', stroke: INK, sw: 1.2 }));
  s.push(path('M932 162q6 -3 12 0q-6 2 -12 0Z', { fill: '#2a1a14' }));
  s.push(path('M926 183q12 -18 24 0Z', { fill: '#3a3040' }));
  s.push(text(938, 180, '1987', { size: 6, fill: '#f4f0e6' }));

  // Hanging lamps with green glass shades.
  for (const lx of [520, 720]) {
    s.push(glow(`knLampWall${lx}`, lx, 120, 150, '#ffe6a8', 0.28, 110));
    s.push(path(`M${lx} 12V52`, { stroke: INK, sw: 2 }));
    s.push(inked(`M${lx - 22} 70Q${lx} 44 ${lx + 22} 70Z`, '#2a7a4a', 2.5));
    s.push(path(`M${lx - 12} 60Q${lx - 4} 54 ${lx + 6} 56`, { stroke: '#8ae0a8', sw: 2, opacity: 0.7 }));
    s.push(glow(`knBulb${lx}`, lx, 72, 14, '#fff4c0', 0.95));
  }

  s.push(glow('knFloorGlow', 600, 400, 330, '#ffd890', 0.16, 60));
  s.push(vignette('knVig', 960, 450, 0.45));
  s.push(grainOverlay(960, 450));
  return s.join('');
}

/** The counter (occluder, 570×100 layer at 392,252): slab, panelled front,
 *  brass foot rail, the tap, a bowl of peanuts and the till. */
function kneipeCounter(): string {
  const s: string[] = [];
  s.push(defs(linear('knSlab', 0, 26, 0, 44, [[0, '#b07a46'], [1, '#7d5232']])));
  s.push(glow('knCounterGlow', 228, 34, 230, '#ffe6a8', 0.25, 30));
  // Tap tower (stands on the back edge of the slab).
  s.push(inked('M72 30V-6h12V30z', '#c8ccd4', 2));
  s.push(path('M75 -4V28', { stroke: '#ffffff', sw: 1.6, opacity: 0.6 }));
  s.push(inked('M66 -10h24v8h-24z', '#8a8e98', 2));
  s.push(inked('M84 6h10v4h-10z', '#8a8e98', 1.5));
  s.push(inked('M90 10v6h3v-6z', '#8a8e98', 1.2));
  s.push(inked('M74 -10l-4 -16h10l-2 16z', '#2a1a14', 1.6));
  s.push(rect(70, -20, 10, 6, { fill: '#e8c23a', stroke: INK, sw: 1 }));
  // Slab with a rounded end on the left.
  s.push(inked('M18 28H570V44H8Q2 44 2 36Q2 28 18 28Z', 'url(#knSlab)', 3));
  s.push(path('M14 30H570', { stroke: '#e0b07a', sw: 1.6, opacity: 0.7 }));
  // Front: panels, rail, kick plate.
  s.push(inked('M8 44H570V96H12Q6 70 8 44Z', '#5a3420', 3));
  for (let x = 26; x < 560; x += 68) {
    s.push(path(wobble(rectPts(x, 52, 54, 30), { seed: x, wobble: 0.6 }), { fill: '#663c24', stroke: '#2e1a10', sw: 2 }));
    s.push(path(`M${x + 2} 80H${x + 54}V54`, { stroke: '#8a5a34', sw: 1.2, opacity: 0.7 }));
  }
  s.push(rect(10, 88, 560, 8, { fill: '#2e1a10' }));
  s.push(path('M8 84H570', { stroke: INK, sw: 6 }));
  s.push(path('M8 84H570', { stroke: '#d8a840', sw: 3 }));
  s.push(path('M8 83H570', { stroke: '#fff0b0', sw: 1, opacity: 0.6 }));
  for (let x = 40; x < 570; x += 120) s.push(inked(`M${x} 82v-14h4v14z`, '#c89a34', 1.4));
  // Peanuts, beer mats, the till.
  s.push(ellipse(302, 28, 15, 4.5, { fill: '#e8dcc0', stroke: INK, sw: 1.6 }));
  for (let i = 0; i < 7; i++) s.push(ellipse(292 + i * 3.4, 25 - (i % 2) * 2, 2.6, 1.8, { fill: '#c89a5a', stroke: INK, sw: 0.8 }));
  s.push(path('M287 28Q302 36 317 28', { fill: '#d8ccb0', stroke: INK, sw: 1.4 }));
  s.push(ellipse(176, 31, 9, 2.5, { fill: '#f4f0e6', stroke: INK, sw: 1.2 }));
  s.push(ellipse(196, 32, 9, 2.5, { fill: '#c43a3a', stroke: INK, sw: 1.2 }));
  s.push(inked('M500 30L506 4H556L562 30Z', '#5a5e68', 2.2));
  s.push(inked('M512 4L516 -12H548L550 4Z', '#3a3e48', 2));
  s.push(rect(518, -8, 26, 8, { fill: '#7ad08a', stroke: INK, sw: 1 }));
  s.push(text(531, -1.5, '2,00', { size: 6, fill: '#1e3a24', weight: 700 }));
  for (let i = 0; i < 6; i++) s.push(rect(512 + (i % 3) * 13, 10 + Math.floor(i / 3) * 8, 10, 5, { fill: '#e8e4dc', stroke: INK, sw: 0.8 }, 1));
  return s.join('');
}

/** A bar stool, in local coords of a 50×44 layer (seat top at y=4). */
function stool(seed: number): string {
  return [
    ellipse(25, 41, 18, 3.5, { fill: '#000000', opacity: 0.3 }),
    path('M25 8V40', { stroke: INK, sw: 6 }),
    path('M25 8V40', { stroke: '#a8acb4', sw: 3 }),
    ellipse(25, 22, 13, 3.5, { stroke: INK, sw: 4.5 }),
    ellipse(25, 22, 13, 3.5, { stroke: '#c8ccd4', sw: 2 }),
    inked(wobble([[6, 4], [44, 4], [43, 10], [7, 10]], { seed, wobble: 0.5 }), '#a82a3a', 2.2),
    path('M10 5.5H40', { stroke: '#e86a7a', sw: 1.4, opacity: 0.8 }),
    ellipse(25, 41, 12, 3, { fill: '#7a7e88', stroke: INK, sw: 1.6 }),
  ].join('');
}

/** The bistro table in the front left (occluder, 90×70 layer at 170,338). */
function kneipeTable(): string {
  return [
    ellipse(45, 64, 30, 5, { fill: '#000000', opacity: 0.35 }),
    path('M45 16V62', { stroke: INK, sw: 7 }),
    path('M45 16V62', { stroke: '#4a2c1a', sw: 4 }),
    inked('M30 64Q45 56 60 64Z', '#3a2214', 1.8),
    inked(wobble([[6, 12], [84, 12], [80, 20], [10, 20]], { seed: 71, wobble: 0.6 }), '#7d5232', 2.5),
    path('M10 13.5H80', { stroke: '#c48a5a', sw: 1.4, opacity: 0.8 }),
    // Ashtray (empty since the smoking ban, polished out of spite).
    ellipse(30, 11, 8, 2.6, { fill: '#c8ccd4', stroke: INK, sw: 1.4 }),
    // Half a beer, abandoned by history.
    inked('M56 12V-6h10V12z', '#e8b440', 1.6),
    rect(56, -9, 10, 5, { fill: '#f8f4ec', stroke: INK, sw: 1.2 }, 2),
    line([58, -2], [58, 9], '#fff4c8', 1.2, 0.7),
  ].join('');
}

const KNEIPE_BG = kneipeBg();

// ---- scripts ---------------------------------------------------------------------

/** "Ich zeig das an": the Partykiller reacts to petty offences — while awake. */
async function anzeige(ctx: ScriptContext, line: string): Promise<boolean> {
  if (ctx.flag('copAsleep')) return false;
  await ctx.say('cop', line);
  return true;
}

/** The Partykiller drinks the Magic Woman, dances, and sleeps. */
async function giveMagicWoman(ctx: ScriptContext): Promise<void> {
  await ctx.playerSay('Eine kleine Aufmerksamkeit. Von einem dankbaren Bürger.');
  await ctx.say('cop', 'Ein Geschenk? Das ist Vorteilsannahme.');
  await ctx.wait(500);
  await ctx.say('cop', '...Aber ich bin ja außer Dienst.');
  ctx.removeItem('magicwoman');
  ctx.sfx('open');
  await ctx.wait(700);
  await ctx.say('cop', 'Hm. Schmeckt nach Gummibärchen und Ordnungswidrigkeit.');
  await ctx.wait(400);
  ctx.playMusic('disco-theme');
  await ctx.animate('cop', 'stand', 500);
  const traffic = ctx.animate('cop', 'traffic', 3200);
  await ctx.wait(500);
  await ctx.playerSay('Sieht aus, als würde er eine Kreuzung regeln.');
  await traffic;
  const disco = ctx.animate('cop', 'disco', 3600);
  await ctx.wait(400);
  await ctx.playerSay('Oh. Jetzt kommt die Hüfte dazu.');
  await ctx.playerSay('Und ein überraschend ehrgeiziger Discofinger.');
  await disco;
  await ctx.animate('cop', 'stand', 300);
  ctx.sfx('step');
  ctx.shake(150, 0.004);
  ctx.setFlag('copAsleep');
  await ctx.repaint();
  ctx.playMusic('pub-theme');
  await ctx.wait(900);
  await ctx.say('ali', 'Früher hat er wenigstens noch gewartet, bis die Party vorbei war.');
}

async function leave(ctx: ScriptContext): Promise<void> {
  if (!ctx.flag('password')) {
    await ctx.playerSay('Ohne zu wissen, wo die Goa steigt, bringt mir der Wald nichts.');
    await ctx.playerSay('Ali weiß es. Ali weiß alles.');
    return;
  }
  ctx.sfx('open');
  await ctx.playerSay('Folge dem Bass. Chakabunga. Los geht’s!');
  ctx.setFlag('chapterDone');
  ctx.sfx('win');
  ctx.showTitle('FORTSETZUNG FOLGT …');
}

// ---- room ------------------------------------------------------------------------

export const kneipeRoom: RoomDef = {
  id: 'kneipe',
  name: 'Alis Eck',

  layers: [
    { id: 'bg', depth: Layer.BEHIND, svg: KNEIPE_BG },
    // Occluders: Ali (feet at y=316) stands behind the counter; the player
    // passes behind the stools and the table.
    { id: 'counter', depth: 330, x: 392, y: 252, w: 570, h: 100, svg: kneipeCounter() },
    { id: 'stool', depth: 373, x: 636, y: 340, w: 50, h: 44, svg: stool(81) },
    { id: 'copStool', depth: 373, x: 755, y: 340, w: 50, h: 44, svg: stool(82) },
    { id: 'table', depth: 400, x: 170, y: 338, w: 90, h: 70, svg: kneipeTable() },
  ],

  walkArea: [
    { x: 28, y: 318 },
    { x: 388, y: 318 },
    { x: 394, y: 354 },
    { x: 948, y: 354 },
    { x: 948, y: 445 },
    { x: 28, y: 445 },
  ],
  holes: [
    // The table
    [
      { x: 188, y: 388 },
      { x: 242, y: 388 },
      { x: 242, y: 406 },
      { x: 188, y: 406 },
    ],
    // The free stool
    [
      { x: 645, y: 362 },
      { x: 677, y: 362 },
      { x: 677, y: 382 },
      { x: 645, y: 382 },
    ],
    // The Partykiller's stool
    [
      { x: 762, y: 362 },
      { x: 800, y: 362 },
      { x: 800, y: 384 },
      { x: 762, y: 384 },
    ],
  ],
  scaling: { yTop: 300, scaleTop: 0.92, yBottom: 445, scaleBottom: 1.24 },

  music: 'pub-theme',

  entries: {
    start: { x: 300, y: 412, facing: 'right' },
    door: { x: 86, y: 326, facing: 'down' },
  },

  actors: [
    { id: 'ali', x: 560, y: 316, facing: 'down' },
    { id: 'cop', x: 780, y: 374, facing: 'down' },
  ],

  async onEnter(ctx) {
    if (ctx.flag('introDone')) return;
    ctx.setFlag('introDone');
    await ctx.wait(400);
    await ctx.playerSay('Alis Eck. Wenn einer weiß, wo heute die Goa im Wald steigt, dann Ali.');
    await ctx.playerSay('Zwei Euro hab ich noch. Das muss reichen.');
  },

  ambients: [
    {
      // The Partykiller keeps a running commentary on everybody's misdeeds.
      every: [9000, 16000],
      run: async (ctx) => {
        if (ctx.busy || ctx.flag('copAsleep')) return;
        const lines = [
          'Ruhestörung ab 22 Uhr. Ich notier mir das.',
          'Der Automat da hängt nicht ordnungsgemäß.',
          'Falsch geparkt, draußen. Ich hab’s im Gefühl.',
          'Ich hab mehr Partys beendet als ihr besucht habt.',
        ];
        await ctx.say('cop', lines[Math.floor(Math.random() * lines.length)]);
      },
    },
  ],

  hotspots: [
    {
      id: 'door',
      name: 'Ausgang',
      rect: { x: 38, y: 104, w: 96, h: 198 },
      walkTo: { x: 86, y: 322 },
      facing: 'up',
      defaultVerb: 'open',
      on: {
        lookat: 'Die Tür nach draußen. Draußen: Nacht, Nieselregen, irgendwo ein Wald.',
        open: leave,
        use: leave,
        close: 'Sie ist zu. Noch.',
      },
    },
    {
      id: 'window',
      name: 'Fenster',
      rect: { x: 160, y: 84, w: 142, h: 134 },
      walkTo: { x: 230, y: 330 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('Es nieselt. Irgendwo hinter den Dächern wummert ein Bass.');
          await ctx.playerSay('Oder das ist mein Herz.');
        },
        open: async (ctx) => {
          if (!(await anzeige(ctx, 'Fenster auf bei Regen? Sachbeschädigung durch Feuchtigkeit!'))) {
            await ctx.playerSay('Dann wird’s nur kalt.');
          }
        },
      },
    },
    {
      id: 'dartboard',
      name: 'Dartscheibe',
      rect: { x: 324, y: 82, w: 48, h: 48 },
      walkTo: { x: 350, y: 322 },
      facing: 'up',
      on: {
        lookat: 'Eine Dartscheibe ohne Pfeile. Die wurden 2009 beschlagnahmt.',
        pickup: async (ctx) => {
          if (!(await anzeige(ctx, 'Finger weg vom Inventar der Gaststätte!'))) {
            await ctx.playerSay('Die hängt da gut.');
          }
        },
      },
    },
    {
      id: 'slots',
      name: 'Daddelautomat',
      rect: { x: 316, y: 156, w: 66, h: 146 },
      walkTo: { x: 350, y: 322 },
      facing: 'up',
      on: {
        lookat: 'Ein Daddelautomat. Er blinkt mich an, als wüsste er von den zwei Euro.',
        use: async (ctx) => {
          if (ctx.hasItem('euro')) await ctx.playerSay('Der will Geld. Ich hab nur die zwei Euro, und die sind verplant.');
          else await ctx.playerSay('Ohne Geld spielt der nicht mit mir.');
        },
        push: async (ctx) => {
          if (!(await anzeige(ctx, 'Gewalt gegen Sachen! Ich zeig das an!'))) {
            await ctx.playerSay('Er gibt nichts her. Typisch.');
          }
        },
        pull: 'Der Hebel ist nur Deko. Wie bei allem Schönen.',
      },
      onItem: {
        use: {
          euro: async (ctx) => {
            await ctx.playerSay('Nee. Die zwei Euro verzocke ich nicht.');
            await ctx.playerSay('Die sind für was Wichtiges.');
          },
        },
      },
    },
    {
      id: 'table',
      name: 'Tisch',
      rect: { x: 174, y: 326, w: 84, h: 66 },
      walkTo: { x: 215, y: 424 },
      facing: 'up',
      on: {
        lookat: 'Ein Aschenbecher, blank poliert, und ein halbes Bier, um das sich niemand mehr kümmert.',
        pickup: async (ctx) => {
          if (!(await anzeige(ctx, 'Fremdes Bier! Das ist Unterschlagung!'))) {
            await ctx.playerSay('Fremdes Bier trink ich nicht. Ich hab Prinzipien. Zwei.');
          }
        },
      },
    },
    {
      id: 'board',
      name: 'Getränkekarte',
      rect: { x: 406, y: 56, w: 140, h: 116 },
      walkTo: { x: 470, y: 362 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('Energydrinks, je zwei Euro inklusive Pfand:');
          await ctx.playerSay('Red Cow, Flying Pony und Magic Woman.');
          await ctx.playerSay('Die freie Getränkewahl. Herrlich.');
        },
        pickup: 'Die Karte gehört an die Wand. Sagt die Karte.',
      },
    },
    {
      id: 'tap',
      name: 'Zapfhahn',
      rect: { x: 456, y: 230, w: 42, h: 54 },
      walkTo: { x: 476, y: 362 },
      facing: 'up',
      on: {
        lookat: 'Ein Zapfhahn. Er tropft im Takt der Musik.',
        use: async (ctx) => {
          if (!(await anzeige(ctx, 'Zapfen ohne Schankerlaubnis? Angezeigt!'))) {
            await ctx.say('ali', 'Hinterm Tresen bin ich der Chef, mein Lieber.');
          }
        },
        pull: async (ctx) => {
          if (!(await anzeige(ctx, 'Zapfen ohne Schankerlaubnis? Angezeigt!'))) {
            await ctx.say('ali', 'Hinterm Tresen bin ich der Chef, mein Lieber.');
          }
        },
      },
    },
    {
      id: 'shelf',
      name: 'Flaschenregal',
      rect: { x: 560, y: 86, w: 244, h: 112 },
      walkTo: { x: 610, y: 362 },
      facing: 'up',
      on: {
        lookat: 'Korn, Kräuterlikör, Ouzo und eine Flasche, deren Etikett nur noch „...ITTER“ sagt.',
        pickup: 'Da komme ich nicht ran. Und das ist auch besser so.',
      },
    },
    {
      id: 'scarf',
      name: 'Fanschal',
      rect: { x: 640, y: 76, w: 90, h: 20 },
      walkTo: { x: 690, y: 362 },
      facing: 'up',
      on: {
        lookat: 'SV Ecke 09. Seit 1909 knapp am Aufstieg vorbei.',
      },
    },
    {
      id: 'fridge',
      name: 'Kühlschrank',
      rect: { x: 812, y: 114, w: 98, h: 160 },
      walkTo: { x: 860, y: 362 },
      facing: 'up',
      on: {
        lookat: async (ctx) => {
          await ctx.playerSay('Ein Kühlschrank voller Energydrinks.');
          await ctx.playerSay('Also: voller Magic Woman. Die anderen Fächer sind leer.');
        },
        open: async (ctx) => {
          if (!(await anzeige(ctx, 'Hausfriedensbruch am Kühlschrank! Ich zeig das an!'))) {
            await ctx.say('ali', 'Bestellt wird bei mir, mein Lieber.');
          }
        },
      },
    },
    {
      id: 'photo',
      name: 'Foto',
      rect: { x: 916, y: 136, w: 44, h: 54 },
      walkTo: { x: 900, y: 362 },
      facing: 'up',
      on: {
        lookat: 'Ali, 1987. Der Schnauzer hat sich seitdem kaum verändert. Ali auch nicht.',
      },
    },
    {
      id: 'counter',
      name: 'Tresen',
      rect: { x: 394, y: 280, w: 566, h: 64 },
      walkTo: { x: 520, y: 362 },
      facing: 'up',
      on: {
        lookat: 'Der Tresen. Klebt an genau den richtigen Stellen.',
      },
    },
    {
      id: 'peanuts',
      name: 'Erdnüsse',
      rect: { x: 676, y: 268, w: 36, h: 18 },
      walkTo: { x: 700, y: 362 },
      facing: 'up',
      on: {
        lookat: 'Erdnüsse. Gesalzen, angefasst, unsterblich.',
        pickup: async (ctx) => {
          if (!(await anzeige(ctx, 'Mundraub! Auch das ist eine Straftat!'))) {
            await ctx.playerSay('Nach dem, was hier alles reingegriffen hat? Nein danke.');
          }
        },
      },
    },
    {
      id: 'stool',
      name: 'Barhocker',
      rect: { x: 640, y: 340, w: 42, h: 42 },
      walkTo: { x: 662, y: 394 },
      facing: 'up',
      on: {
        lookat: 'Der einzige freie Hocker. Direkt neben dem Partykiller. Kein Zufall.',
        use: 'Ich setz mich lieber nicht neben ihn. Er nimmt bestimmt Fingerabdrücke.',
      },
    },
    {
      id: 'ali',
      name: 'Ali',
      rect: { x: 528, y: 206, w: 64, h: 76 },
      walkTo: { x: 560, y: 362 },
      facing: 'up',
      defaultVerb: 'talkto',
      on: {
        lookat: 'Ali. Wirt, Barmann, Seelsorger. Poliert seit 1987 dasselbe Glas.',
        talkto: async (ctx) => {
          await ctx.dialog('ali');
        },
        pickup: 'Ali ist hier eher das Inventar.',
      },
      onItem: {
        give: {
          euro: async (ctx) => {
            await ctx.say('ali', 'Wofür? Erst bestellen, mein Lieber.');
            await ctx.dialog('ali-order');
          },
          magicwoman: async (ctx) => {
            await ctx.say('ali', 'Hab ich dir gerade verkauft. Pfand gibt’s erst, wenn sie leer ist.');
          },
        },
      },
    },
    {
      id: 'cop',
      name: 'Partykiller',
      rect: { x: 750, y: 244, w: 62, h: 128 },
      walkTo: { x: 730, y: 396 },
      facing: 'right',
      defaultVerb: 'talkto',
      on: {
        lookat: async (ctx) => {
          if (ctx.flag('copAsleep')) {
            await ctx.playerSay('Er schläft. Arme verschränkt, Mütze auf. Schnarcht im Dienstton.');
            return;
          }
          await ctx.playerSay('Der einzige andere Gast. Ein Polizist im Ruhestand, noch in Uniform.');
          if (ctx.flag('knowsPartykiller')) await ctx.playerSay('Der Partykiller. Er zeigt immer noch alles an.');
        },
        talkto: async (ctx) => {
          if (ctx.flag('copAsleep')) {
            await ctx.playerSay('Den weck ich bestimmt nicht.');
            return;
          }
          await ctx.dialog('cop');
        },
        push: async (ctx) => {
          if (!(await anzeige(ctx, 'Körperverletzung! Versuchte! Ich zeig das an!'))) {
            await ctx.playerSay('Bloß nicht. Schlafende Polizisten soll man liegen lassen.');
          }
        },
        pull: async (ctx) => {
          if (!(await anzeige(ctx, 'Widerstand gegen ... äh ... mich!'))) {
            await ctx.playerSay('Bloß nicht. Schlafende Polizisten soll man liegen lassen.');
          }
        },
        pickup: 'Der ist schwerer als er aussieht. Und er sieht schwer aus.',
      },
      onItem: {
        give: {
          euro: async (ctx) => {
            if (await anzeige(ctx, 'Bestechung eines Beamten? Ich zeig das an!')) {
              await ctx.playerSay('Er zeigt wirklich alles an.');
            } else {
              await ctx.playerSay('Der schläft. Und die zwei Euro behalte ich.');
            }
          },
          magicwoman: async (ctx) => {
            if (ctx.flag('copAsleep')) {
              await ctx.playerSay('Der hatte genug.');
              return;
            }
            await giveMagicWoman(ctx);
          },
        },
      },
    },
  ],
};
