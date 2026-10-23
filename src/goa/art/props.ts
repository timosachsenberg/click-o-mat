import {
  INK,
  circle,
  ellipse,
  glow,
  inked,
  line,
  path,
  poly,
  rect,
  rectPts,
  rng,
  text,
  wobble,
  type Pt,
} from '../../game/art/toon';

/**
 * Props for the Picasso, a basement bar in the look of the concept art in
 * issue #5: purple ceiling, warm ochre walls, a fat ventilation duct, stucco
 * columns, slot machines, a dark metal back bar with lit bottles, wooden bar
 * stools with a heart cut out of the backrest — plus the toilet up two steps
 * and a DJ booth. All functions draw in room coordinates and return SVG
 * markup.
 */

export const PAL = {
  ceil0: '#241c4a',
  ceil1: '#45367e',
  wall0: '#d98a34',
  wall1: '#f6bc52',
  wallShade: '#7a3e5a',
  wood: '#8a4a22',
  woodLight: '#c0732e',
  woodHi: '#eaa252',
  woodDark: '#4e2612',
  stucco: '#efd28e',
  stuccoShade: '#b58a4a',
  metal: '#2a2238',
  navy: '#1e2450',
  navyLight: '#3a4a8a',
};

const CHALK = "'Comic Sans MS', 'Trebuchet MS', sans-serif";

/** A fat ventilation duct coming out of the back wall at `a` (radius r0)
 *  and running towards the viewer under the ceiling to `b` (radius r1 —
 *  bigger, as it's closer), ribbed. */
export function duct(a: Pt, b: Pt, r0: number, r1: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ux = -dy / len;
  const uy = dx / len;
  const at = (t: number, k: number): Pt => {
    const r = r0 + (r1 - r0) * t;
    return [a[0] + dx * t + ux * r * k, a[1] + dy * t + uy * r * k];
  };
  const s: string[] = [];
  // The wall flange, seen face-on where the duct leaves the wall.
  s.push(ellipse(a[0], a[1], r0 * 1.35, r0 * 1.35, { fill: '#8a6440', stroke: INK, sw: 2.5 }));
  s.push(inked(poly([at(0, 1), at(1, 1), at(1, -1), at(0, -1)]), '#c9a36e', 3));
  s.push(path(poly([at(0, 1), at(1, 1), at(1, 0.35), at(0, 0.35)]), { fill: '#8a6440' }));
  s.push(path(poly([at(0, -0.4), at(1, -0.4), at(1, -0.7), at(0, -0.7)]), { fill: '#f6e2b4', opacity: 0.8 }));
  // Ribs: rings that grow (and spread out) towards the viewer.
  for (let i = 1; i < 9; i++) {
    const t = (i / 9) ** 1.35;
    const p1 = at(t, 1);
    const p2 = at(t, -1);
    const bulge = (r0 + (r1 - r0) * t) * 0.35;
    s.push(path(`M${p1[0]} ${p1[1]}Q${(p1[0] + p2[0]) / 2 + (dx / len) * bulge} ${(p1[1] + p2[1]) / 2 + (dy / len) * bulge} ${p2[0]} ${p2[1]}`, { stroke: '#6a4a30', sw: 2 }));
  }
  return s.join('');
}

/** A stucco column with a flared lotus capital (like the concept art). */
export function column(cx: number, top: number, base: number, w: number): string {
  const s: string[] = [];
  const h = base - top;
  const capH = Math.max(24, h * 0.13);
  const shaftTop = top + capH;
  const baseH = Math.max(14, h * 0.06);
  // Shaft with fluting and a shaded right flank.
  s.push(inked(poly([[cx - w / 2, shaftTop], [cx + w / 2, shaftTop], [cx + w / 2 + 1, base - baseH], [cx - w / 2 - 1, base - baseH]]), PAL.stucco, 3));
  s.push(path(poly([[cx + w * 0.18, shaftTop], [cx + w / 2, shaftTop], [cx + w / 2 + 1, base - baseH], [cx + w * 0.18, base - baseH]]), { fill: PAL.stuccoShade }));
  for (const k of [-0.3, -0.05, 0.25]) s.push(line([cx + w * k, shaftTop + 4], [cx + w * k, base - baseH - 4], '#9a7240', 1.6, 0.8));
  s.push(path(`M${cx - w * 0.38} ${shaftTop + 4}V${base - baseH - 4}`, { stroke: '#fff2c8', sw: 2, opacity: 0.7 }));
  // Capital: a flared, ridged cup with a scroll band.
  s.push(inked(`M${cx - w / 2} ${shaftTop}L${cx - w * 1.05} ${top + 6}Q${cx} ${top - 4} ${cx + w * 1.05} ${top + 6}L${cx + w / 2} ${shaftTop}Z`, PAL.stucco, 3));
  for (const k of [-0.7, -0.35, 0, 0.35, 0.7]) s.push(path(`M${cx + k * w * 0.45} ${shaftTop - 2}L${cx + k * w} ${top + 7}`, { stroke: '#9a7240', sw: 1.5 }));
  s.push(inked(`M${cx - w * 1.1} ${top + 2}H${cx + w * 1.1}V${top + 9}H${cx - w * 1.1}Z`, '#e2bf72', 2.2));
  s.push(inked(`M${cx - w * 0.62} ${shaftTop - 3}H${cx + w * 0.62}V${shaftTop + 4}H${cx - w * 0.62}Z`, '#e2bf72', 2));
  // Base: two stacked plinths.
  s.push(inked(`M${cx - w * 0.68} ${base - baseH}H${cx + w * 0.68}V${base - baseH * 0.5}H${cx - w * 0.68}Z`, '#e2bf72', 2.2));
  s.push(inked(`M${cx - w * 0.8} ${base - baseH * 0.5}H${cx + w * 0.8}V${base}H${cx - w * 0.8}Z`, PAL.stuccoShade, 2.2));
  return s.join('');
}

/** A slot machine: cabinet, glowing reel window with coloured squares.
 *  `frame` animates it: the squares shuffle, the bulbs and buttons blink. */
export function slotMachine(x: number, y: number, w: number, h: number, body: string, trim: string, seed: number, frame = 0): string {
  const r = rng(seed + frame * 97);
  const lit = (i: number) => (i + frame + seed) % 2 === 0;
  const s: string[] = [];
  s.push(glow(`slotGlow${seed}f${frame}`, x + w / 2, y + h * 0.35, w * (0.8 + (frame % 2) * 0.2), trim, 0.35));
  s.push(inked(wobble([[x + 4, y], [x + w - 4, y], [x + w, y + h], [x, y + h]], { seed, wobble: 0.8 }), body, 3));
  s.push(path(poly([[x + w * 0.78, y + 2], [x + w - 4, y], [x + w, y + h], [x + w * 0.8, y + h]]), { fill: INK, opacity: 0.25 }));
  s.push(inked(`M${x + 8} ${y + 6}H${x + w - 8}V${y + 18}H${x + 8}Z`, trim, 2));
  s.push(circle(x + 16, y + 12, 3.5, { fill: lit(0) ? '#ffe066' : '#8a7a3a', stroke: INK, sw: 1 }));
  s.push(circle(x + w - 16, y + 12, 3.5, { fill: lit(1) ? '#ffe066' : '#8a7a3a', stroke: INK, sw: 1 }));
  // Screen
  const sx = x + 8;
  const sy = y + 24;
  const sw = w - 16;
  const sh = h * 0.36;
  s.push(rect(sx, sy, sw, sh, { fill: '#1a1440', stroke: INK, sw: 2.5 }, 3));
  const cols = ['#ff5a8a', '#ffd34a', '#5ae0a0', '#5ab4ff', '#c86aff', '#ff9a3a'];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      s.push(rect(sx + 4 + j * ((sw - 8) / 4), sy + 4 + i * ((sh - 8) / 3), (sw - 8) / 4 - 3, (sh - 8) / 3 - 3, { fill: cols[Math.floor(r() * cols.length)], opacity: 0.9 }, 2));
    }
  }
  // Button deck
  const by = sy + sh + 8;
  s.push(inked(`M${x + 4} ${by}H${x + w - 4}L${x + w} ${by + 14}H${x}Z`, '#3a2a5a', 2));
  for (let i = 0; i < 4; i++) {
    s.push(rect(x + 9 + i * ((w - 18) / 4), by + 3, (w - 18) / 4 - 4, 6, { fill: lit(i) ? cols[(i + seed) % cols.length] : '#4a3a6a', stroke: INK, sw: 1 }, 2));
  }
  s.push(rect(x + w / 2 - 9, by + 24, 18, 4, { fill: '#c8ccd4', stroke: INK, sw: 1 }, 1));
  return s.join('');
}

/** Wooden bar stool with a heart cut out of its backrest.
 *  `back`: we see the backrest from behind (stool faces away from us); else
 *  the stool faces us and the backrest is behind the seat. s = scale. */
export function heartStool(cx: number, floor: number, s: number, back: boolean): string {
  const seatY = floor - 62 * s;
  const out: string[] = [];
  const legs = () => {
    const l: string[] = [];
    l.push(ellipse(cx, floor + 1, 26 * s, 5 * s, { fill: '#000000', opacity: 0.3 }));
    for (const [x0, x1, shade] of [[-14, -20, false], [14, 20, true], [-7, -9, true], [7, 9, false]] as Array<[number, number, boolean]>) {
      l.push(inked(poly([[cx + x0 * s - 3 * s, seatY + 4 * s], [cx + x0 * s + 3 * s, seatY + 4 * s], [cx + x1 * s + 3 * s, floor], [cx + x1 * s - 3 * s, floor]]), shade ? PAL.wood : PAL.woodLight, 2));
    }
    l.push(path(`M${cx - 18 * s} ${floor - 18 * s}H${cx + 18 * s}`, { stroke: INK, sw: 5 * s }));
    l.push(path(`M${cx - 18 * s} ${floor - 18 * s}H${cx + 18 * s}`, { stroke: PAL.woodLight, sw: 2.6 * s }));
    return l.join('');
  };
  const seat = () =>
    inked(`M${cx - 22 * s} ${seatY}Q${cx} ${seatY - 8 * s} ${cx + 22 * s} ${seatY}L${cx + 21 * s} ${seatY + 6 * s}Q${cx} ${seatY + 10 * s} ${cx - 21 * s} ${seatY + 6 * s}Z`, PAL.woodLight, 2.4) +
    path(`M${cx - 16 * s} ${seatY - 1 * s}Q${cx} ${seatY - 6 * s} ${cx + 14 * s} ${seatY - 1.5 * s}`, { stroke: PAL.woodHi, sw: 2 * s, opacity: 0.8 });
  const backrest = () => {
    const by = seatY - 6 * s;
    const top = by - 46 * s;
    const board = `M${cx - 9 * s} ${by}L${cx - 10 * s} ${top + 22 * s}Q${cx - 24 * s} ${top + 14 * s} ${cx - 22 * s} ${top + 3 * s}Q${cx - 12 * s} ${top - 4 * s} ${cx} ${top + 4 * s}Q${cx + 12 * s} ${top - 4 * s} ${cx + 22 * s} ${top + 3 * s}Q${cx + 24 * s} ${top + 14 * s} ${cx + 10 * s} ${top + 22 * s}L${cx + 9 * s} ${by}Z`;
    const heart = `M${cx} ${top + 22 * s}Q${cx - 9 * s} ${top + 15 * s} ${cx - 7 * s} ${top + 10 * s}Q${cx - 4 * s} ${top + 6 * s} ${cx} ${top + 10 * s}Q${cx + 4 * s} ${top + 6 * s} ${cx + 7 * s} ${top + 10 * s}Q${cx + 9 * s} ${top + 15 * s} ${cx} ${top + 22 * s}Z`;
    return (
      inked(board, back ? PAL.wood : PAL.woodLight, 2.6) +
      path(`M${cx - 15 * s} ${top + 5 * s}Q${cx - 8 * s} ${top + 1 * s} ${cx - 3 * s} ${top + 6 * s}`, { stroke: PAL.woodHi, sw: 1.8 * s, opacity: 0.8 }) +
      inked(heart, '#2a1208', 2)
    );
  };
  if (back) out.push(legs(), seat(), backrest());
  else out.push(backrest(), legs(), seat());
  return out.join('');
}

/** Round navy bar stool (the bistro area). */
export function navyStool(cx: number, floor: number, s: number): string {
  const seatY = floor - 52 * s;
  return [
    ellipse(cx, floor, 18 * s, 4 * s, { fill: '#000000', opacity: 0.3 }),
    ...[-12, -4, 4, 12].map((dx) => line([cx + dx * 0.5 * s, seatY + 4 * s], [cx + dx * s, floor], INK, 4.5 * s)),
    ...[-12, -4, 4, 12].map((dx) => line([cx + dx * 0.5 * s, seatY + 4 * s], [cx + dx * s, floor], PAL.navyLight, 2.4 * s)),
    ellipse(cx, floor - 16 * s, 10 * s, 2.4 * s, { stroke: INK, sw: 3 * s }),
    ellipse(cx, seatY + 3 * s, 16 * s, 5 * s, { fill: '#5a2a1a', stroke: INK, sw: 2 }),
    ellipse(cx, seatY, 16 * s, 5 * s, { fill: '#b8642a', stroke: INK, sw: 2 }),
    ellipse(cx - 4 * s, seatY - 1 * s, 7 * s, 1.6 * s, { fill: '#eaa252', opacity: 0.8 }),
  ].join('');
}

/** High bistro table: wooden top, navy pedestal and cross foot. */
export function highTable(cx: number, floor: number, topY: number, rx: number): string {
  return [
    ellipse(cx, floor, rx * 0.9, rx * 0.16, { fill: '#000000', opacity: 0.3 }),
    path(`M${cx - rx * 0.75} ${floor - 2}L${cx + rx * 0.75} ${floor + 2}M${cx - rx * 0.4} ${floor + 5}L${cx + rx * 0.4} ${floor - 5}`, { stroke: INK, sw: 7 }),
    path(`M${cx - rx * 0.75} ${floor - 2}L${cx + rx * 0.75} ${floor + 2}M${cx - rx * 0.4} ${floor + 5}L${cx + rx * 0.4} ${floor - 5}`, { stroke: PAL.navyLight, sw: 3.5 }),
    path(`M${cx} ${topY + 6}V${floor}`, { stroke: INK, sw: 9 }),
    path(`M${cx} ${topY + 6}V${floor}`, { stroke: PAL.navy, sw: 5 }),
    ellipse(cx, topY + 5, rx, rx * 0.22, { fill: '#4a2412', stroke: INK, sw: 2.5 }),
    ellipse(cx, topY, rx, rx * 0.22, { fill: '#c06a2a', stroke: INK, sw: 2.5 }),
    ellipse(cx - rx * 0.2, topY - rx * 0.04, rx * 0.55, rx * 0.08, { fill: '#f0a050', opacity: 0.7 }),
  ].join('');
}

/** Dark metal back-bar shelving with lit bottles and little lamps. */
export function metalShelf(x: number, y: number, w: number, h: number, seed: number): string {
  const r = rng(seed);
  const s: string[] = [];
  s.push(rect(x, y, w, h, { fill: '#2a3050' }));
  s.push(glow(`shelfGlow${seed}`, x + w / 2, y + h * 0.45, w * 0.55, '#8ad0ff', 0.25, h * 0.5));
  const boards = [y + h * 0.36, y + h * 0.68, y + h];
  const bottleCols = ['#9ad0e0', '#c8e8f0', '#6a9ab0', '#e0d0a0', '#a0c890', '#d8a070', '#7a8ac8'];
  let prev = y + 6;
  for (const by of boards) {
    let bx = x + 10;
    while (bx < x + w - 14) {
      const bw = 9 + r() * 7;
      const bh = Math.min(by - prev - 8, 26 + r() * 22);
      const c = bottleCols[Math.floor(r() * bottleCols.length)];
      const neck = bw * 0.36;
      if (r() < 0.25) {
        // A jar
        s.push(inked(`M${bx} ${by}V${by - bh * 0.6}H${bx + bw + 4}V${by}Z`, c, 1.4));
        s.push(rect(bx - 1, by - bh * 0.6 - 4, bw + 6, 4, { fill: '#c43a3a', stroke: INK, sw: 1 }));
        bx += bw + 9;
        continue;
      }
      s.push(inked(`M${bx} ${by}V${by - bh * 0.6}Q${bx} ${by - bh * 0.75} ${bx + bw / 2 - neck / 2} ${by - bh * 0.8}V${by - bh}H${bx + bw / 2 + neck / 2}V${by - bh * 0.8}Q${bx + bw} ${by - bh * 0.75} ${bx + bw} ${by - bh * 0.6}V${by}Z`, c, 1.4));
      s.push(line([bx + 2, by - 4], [bx + 2, by - bh * 0.55], '#ffffff', 1.3, 0.55));
      bx += bw + 4 + r() * 5;
    }
    s.push(inked(`M${x - 4} ${by - 2}H${x + w + 4}V${by + 4}H${x - 4}Z`, '#3a2a40', 2));
    prev = by;
  }
  // Frame posts and little warm lamps under the top board.
  for (const px of [x, x + w * 0.34, x + w * 0.67, x + w]) s.push(inked(`M${px - 3} ${y - 4}H${px + 3}V${y + h + 4}H${px - 3}Z`, PAL.metal, 2));
  for (let i = 0; i < 4; i++) {
    const lx = x + w * (0.15 + i * 0.24);
    s.push(glow(`shelfLamp${seed}${i}`, lx, boards[0] + 8, 26, '#ffb040', 0.7, 14));
    s.push(ellipse(lx, boards[0] + 6, 6, 3, { fill: '#ffe08a', stroke: INK, sw: 1.2 }));
  }
  s.push(inked(`M${x - 8} ${y - 8}H${x + w + 8}V${y}H${x - 8}Z`, PAL.metal, 2.4));
  return s.join('');
}

/** The drinks board: a lavender whiteboard with marker writing. */
export function whiteboard(x: number, y: number, w: number, h: number): string {
  return [
    inked(wobble(rectPts(x, y, w, h), { seed: 5, wobble: 0.8 }), '#ece6f8', 2.6),
    rect(x + 3, y + 3, w - 6, 6, { fill: '#d0c8ea' }),
    text(x + w / 2, y + 18, 'ENERGY', { size: 11, fill: '#3a2a7a', family: CHALK, weight: 700 }),
    text(x + w / 2, y + 32, 'Red Cow', { size: 10, fill: '#c43a3a', family: CHALK, weight: 700 }),
    text(x + w / 2, y + 44, 'Flying Pony', { size: 10, fill: '#2a6ac0', family: CHALK, weight: 700 }),
    text(x + w / 2, y + 56, 'Magic Woman', { size: 10, fill: '#8a3ab0', family: CHALK, weight: 700 }),
    text(x + w / 2, y + h - 5, 'je 2,– € inkl. Pfand', { size: 8, fill: '#3a2a7a', family: CHALK, weight: 700 }),
    rect(x + w - 26, y + h - 2, 20, 4, { fill: '#c43a3a', stroke: INK, sw: 1 }, 1),
  ].join('');
}

/** A "genuine Picasso" (Ali insists): a cubist face in a gilt frame. */
export function picassoPainting(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    inked(rectPts(x - 5, y - 5, w + 10, h + 10).reduce((d, [px, py], i) => d + `${i ? 'L' : 'M'}${px} ${py}`, '') + 'Z', '#d8a838', 2.5),
    rect(x, y, w, h, { fill: '#3a8ac0', stroke: INK, sw: 1.6 }),
    path(poly([[x, y], [cx + 4, y], [cx - 6, y + h], [x, y + h]]), { fill: '#e8c04a' }),
    path(poly([[cx - 14, cy - 18], [cx + 10, cy - 22], [cx + 16, cy + 6], [cx + 2, cy + 22], [cx - 16, cy + 10]]), { fill: '#f0a080', stroke: INK, sw: 1.6 }),
    path(poly([[cx - 14, cy - 18], [cx - 2, cy - 20], [cx - 6, cy + 16], [cx - 16, cy + 10]]), { fill: '#c86a8a', stroke: INK, sw: 1.4 }),
    ellipse(cx - 9, cy - 6, 3, 4.5, { fill: '#ffffff', stroke: INK, sw: 1.2 }),
    circle(cx - 9, cy - 5, 1.5, { fill: INK }),
    path(`M${cx + 3} ${cy - 9}L${cx + 11} ${cy - 7}L${cx + 5} ${cy - 4}Z`, { fill: '#ffffff', stroke: INK, sw: 1.2 }),
    path(`M${cx + 1} ${cy - 4}L${cx + 9} ${cy + 6}L${cx + 1} ${cy + 7}`, { stroke: INK, sw: 1.6 }),
    path(`M${cx - 8} ${cy + 12}Q${cx} ${cy + 8} ${cx + 6} ${cy + 13}`, { stroke: '#a02a3a', sw: 2 }),
    text(x + w - 8, y + h - 3, 'P.', { size: 7, fill: INK, family: CHALK, weight: 700 }),
  ].join('');
}

/** The neon sign: "Picasso" in pink script with a cyan underline. */
export function neonSign(cx: number, cy: number, size = 26): string {
  const opts = (stroke: string, sw: number) => ({ size, fill: 'none', stroke, sw, family: CHALK, weight: 700 });
  return [
    glow(`neonGlow${cx}`, cx, cy - size * 0.3, size * 3.4, '#ff5ab4', 0.38, size * 1.2),
    text(cx, cy, 'Picasso', opts('#ff4aa8', size * 0.13)),
    text(cx, cy, 'Picasso', opts('#ffe0f4', size * 0.04)),
    path(`M${cx - size * 1.6} ${cy + size * 0.32}H${cx + size * 1.6}`, { stroke: '#4ae8ff', sw: size * 0.09 }),
    path(`M${cx - size * 1.6} ${cy + size * 0.32}H${cx + size * 1.6}`, { stroke: '#e0fcff', sw: size * 0.03 }),
  ].join('');
}

/** Irregular warm floor tiles in perspective, with purple-shadowed grout. */
export function tileFloor(y0: number, y1: number, w: number, seed: number): string {
  const r = rng(seed);
  const s: string[] = [rect(0, y0, w, y1 - y0, { fill: '#5a2a3a' })];
  const cols = ['#c8642a', '#e08a3a', '#a84a2a', '#d4743a', '#b85a30', '#ec9a48'];
  let y = y0 + 1;
  let row = 0;
  while (y < y1) {
    const h = 7 + row * 2.6;
    let x = -r() * 30;
    while (x < w) {
      const tw = (34 + row * 7) * (0.8 + r() * 0.5);
      const c = cols[Math.floor(r() * cols.length)];
      const shade = 0.55 + 0.45 * ((y - y0) / (y1 - y0));
      s.push(path(wobble([[x + 2, y + 1], [x + tw - 2, y + 1], [x + tw - 2, y + h - 1], [x + 2, y + h - 1]], { seed: Math.floor(r() * 1e5), wobble: 0.6 }), { fill: c, opacity: shade }));
      x += tw;
    }
    y += h;
    row++;
  }
  return s.join('');
}

export function wallClock(cx: number, cy: number, r: number): string {
  return [
    circle(cx, cy, r, { fill: '#3a3a6a', stroke: INK, sw: 3 }),
    circle(cx, cy, r - 4, { fill: '#e8e8f4', stroke: INK, sw: 1.6 }),
    path(`M${cx} ${cy}L${cx - r * 0.4} ${cy + r * 0.25}M${cx} ${cy}L${cx + r * 0.05} ${cy - r * 0.65}`, { stroke: INK, sw: 2.4 }),
  ].join('');
}

/** Wall air conditioner with a little screen hanging below it. */
export function acUnit(x: number, y: number, w: number, h: number): string {
  return [
    inked(wobble(rectPts(x, y, w, h), { seed: 13, wobble: 0.6 }), '#e8e4ee', 2.6),
    ...[0, 1, 2, 3].map((i) => line([x + 8, y + h * 0.45 + i * 3.5], [x + w - 8, y + h * 0.45 + i * 3.5], '#8a86a0', 1.4)),
    path(`M${x + w * 0.35} ${y + h}V${y + h + 10}M${x + w * 0.65} ${y + h}V${y + h + 10}`, { stroke: INK, sw: 2 }),
    inked(wobble(rectPts(x + w * 0.15, y + h + 10, w * 0.7, h * 0.95), { seed: 14, wobble: 0.6 }), '#22244a', 2.6),
    rect(x + w * 0.2, y + h + 14, w * 0.6, h * 0.95 - 8, { fill: '#3a4a9a' }, 2),
  ].join('');
}

/** The stairs out: a purple door with a green AUSGANG sign above it. */
export function exitDoor(x: number, y: number, w: number, h: number): string {
  return [
    inked(poly([[x - 6, y - 6], [x + w + 6, y - 6], [x + w + 6, y + h], [x - 6, y + h]]), '#4a2a3a', 3),
    inked(poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]), '#6a4a8a', 2.5),
    path(poly([[x + w * 0.6, y], [x + w, y], [x + w, y + h], [x + w * 0.6, y + h]]), { fill: '#4e3470' }),
    rect(x + 8, y + 12, w - 16, h * 0.3, { fill: '#3a2a5a', stroke: INK, sw: 2 }),
    ellipse(x + w - 10, y + h * 0.55, 3.5, 3.5, { fill: '#e8c23a', stroke: INK, sw: 1.5 }),
    rect(x + w / 2 - 26, y - 26, 52, 14, { fill: '#2a8a4a', stroke: INK, sw: 2 }, 2),
    text(x + w / 2, y - 15, 'AUSGANG', { size: 9, fill: '#e8ffe8' }),
  ].join('');
}

/** The toilet door, raised on a landing with two steps in front of it.
 *  Door bottom (= landing) at `sill`; the steps reach the floor at `floor`. */
export function wcDoor(x: number, w: number, top: number, sill: number, floor: number): string {
  const s: string[] = [];
  const mid = (sill + floor) / 2;
  const step = (y0: number, y1: number, inset: number, seed: number) => {
    const depth = (y1 - y0) * 0.45;
    s.push(inked(poly([[x - 12 + inset, y0], [x + w + 12 - inset, y0], [x + w + 14 - inset, y0 + depth], [x - 14 + inset, y0 + depth]]), '#c8642a', 2.4));
    s.push(inked(poly([[x - 14 + inset, y0 + depth], [x + w + 14 - inset, y0 + depth], [x + w + 14 - inset, y1], [x - 14 + inset, y1]]), '#7a3424', 2.4));
    s.push(path(`M${x - 10 + inset} ${y0 + 2}H${x + w + 10 - inset}`, { stroke: '#f0a050', sw: 1.6, opacity: 0.8 }));
    s.push(line([x - 14 + inset, y0 + depth + 4], [x + w + 14 - inset, y0 + depth + 4], '#4e1e18', 1.2, Math.min(1, seed)));
  };
  s.push(ellipse(x + w / 2, floor, w * 0.85, 5, { fill: '#000000', opacity: 0.3 }));
  // Door and frame first; the steps sit in front.
  s.push(inked(poly([[x - 6, top - 6], [x + w + 6, top - 6], [x + w + 6, sill], [x - 6, sill]]), '#4a2a3a', 3));
  s.push(inked(poly([[x, top], [x + w, top], [x + w, sill], [x, sill]]), '#2a7a8a', 2.5));
  s.push(path(poly([[x + w * 0.62, top], [x + w, top], [x + w, sill], [x + w * 0.62, sill]]), { fill: '#1e5a68' }));
  s.push(rect(x + 9, top + 12, w - 18, (sill - top) * 0.32, { fill: '#1e5a68', stroke: INK, sw: 2 }));
  s.push(ellipse(x + w - 10, top + (sill - top) * 0.56, 3.5, 3.5, { fill: '#c8ccd4', stroke: INK, sw: 1.5 }));
  // The sign: 00, ladies and gents.
  s.push(rect(x + w / 2 - 20, top + 18, 40, 22, { fill: '#f4f0e6', stroke: INK, sw: 1.6 }, 3));
  s.push(text(x + w / 2, top + 34, '00', { size: 15, fill: '#2a4a8a' }));
  s.push(text(x + w / 2, top - 10, 'WC', { size: 11, fill: '#f4f0e6', stroke: INK, sw: 2.5 }));
  step(sill, mid, 6, 1);
  step(mid, floor, 0, 1);
  return s.join('');
}

/** A DJ booth against the wall: two speakers, a desk with turntables and a
 *  mixer, headphones, and a little neon strip. Floor line at `floor`. */
export function djBooth(x: number, w: number, floor: number): string {
  const s: string[] = [];
  const spk = 26;
  const deskX = x + spk + 2;
  const deskW = w - 2 * spk - 4;
  const top = floor - 58;
  s.push(ellipse(x + w / 2, floor, w * 0.55, 6, { fill: '#000000', opacity: 0.35 }));
  for (const sx of [x, x + w - spk]) {
    s.push(inked(poly([[sx, floor - 88], [sx + spk, floor - 88], [sx + spk, floor], [sx, floor]]), '#22223a', 2.5));
    s.push(circle(sx + spk / 2, floor - 62, 8, { fill: '#3a3a5a', stroke: INK, sw: 1.8 }));
    s.push(circle(sx + spk / 2, floor - 62, 3, { fill: '#5a5a8a' }));
    s.push(circle(sx + spk / 2, floor - 30, 10.5, { fill: '#3a3a5a', stroke: INK, sw: 1.8 }));
    s.push(circle(sx + spk / 2, floor - 30, 4, { fill: '#5a5a8a' }));
  }
  // Desk
  s.push(inked(poly([[deskX, top + 8], [deskX + deskW, top + 8], [deskX + deskW, floor], [deskX, floor]]), '#2a2440', 2.5));
  s.push(path(`M${deskX + 4} ${top + 22}H${deskX + deskW - 4}`, { stroke: '#4ae8ff', sw: 3 }));
  s.push(glow(`djStrip${x}`, deskX + deskW / 2, top + 22, deskW * 0.7, '#4ae8ff', 0.4, 10));
  s.push(text(deskX + deskW / 2, floor - 14, 'DJ', { size: 14, fill: '#ff5ab4', stroke: INK, sw: 2.5 }));
  s.push(inked(poly([[deskX - 4, top], [deskX + deskW + 4, top], [deskX + deskW + 4, top + 8], [deskX - 4, top + 8]]), '#3a3456', 2.4));
  // Turntables and mixer on top.
  for (const tx of [deskX + deskW * 0.22, deskX + deskW * 0.78]) {
    s.push(ellipse(tx, top - 2, deskW * 0.17, 4.5, { fill: '#1a1a24', stroke: INK, sw: 1.6 }));
    s.push(ellipse(tx, top - 2.5, deskW * 0.06, 1.6, { fill: '#c43a3a' }));
    s.push(line([tx + deskW * 0.13, top - 6], [tx + deskW * 0.06, top - 2], '#c8ccd4', 1.6));
  }
  s.push(inked(poly([[deskX + deskW * 0.42, top - 6], [deskX + deskW * 0.58, top - 6], [deskX + deskW * 0.6, top], [deskX + deskW * 0.4, top]]), '#5a5a7a', 1.4));
  for (let i = 0; i < 3; i++) s.push(circle(deskX + deskW * (0.45 + i * 0.05), top - 3, 1, { fill: ['#5ae0a0', '#ffd34a', '#ff5a8a'][i] }));
  // Headphones hanging off the edge.
  s.push(path(`M${deskX + deskW - 8} ${top + 8}Q${deskX + deskW + 2} ${top + 18} ${deskX + deskW - 8} ${top + 28}`, { stroke: INK, sw: 3 }));
  s.push(ellipse(deskX + deskW - 8, top + 28, 4, 5, { fill: '#3a3a5a', stroke: INK, sw: 1.4 }));
  return s.join('');
}

/** A party flyer pinned to the wall — the Goa in the forest. */
export function flyer(x: number, y: number, w: number, h: number): string {
  return [
    inked(poly([[x, y + 2], [x + w, y], [x + w + 2, y + h], [x + 2, y + h + 1]]), '#2a1a4a', 2),
    circle(x + w / 2, y + h * 0.36, w * 0.24, { fill: '#ffd34a', opacity: 0.9 }),
    path(`M${x + 6} ${y + h * 0.62}L${x + w * 0.3} ${y + h * 0.4}L${x + w * 0.5} ${y + h * 0.58}L${x + w * 0.72} ${y + h * 0.36}L${x + w - 6} ${y + h * 0.62}Z`, { fill: '#1e5a3a' }),
    text(x + w / 2, y + h * 0.78, 'GOA', { size: 11, fill: '#ff5ab4', family: CHALK, weight: 700 }),
    text(x + w / 2, y + h * 0.93, 'Ort: ???', { size: 7, fill: '#4ae8ff', family: CHALK, weight: 700 }),
    circle(x + w / 2, y + 4, 2, { fill: '#c43a3a', stroke: INK, sw: 0.8 }),
  ].join('');
}

/** A disco ball on a chain, glinting. */
export function discoBall(cx: number, ceiling: number, cy: number, r: number): string {
  const s: string[] = [line([cx, ceiling], [cx, cy - r], INK, 2)];
  s.push(circle(cx, cy, r, { fill: '#9aa4c0', stroke: INK, sw: 2 }));
  for (let i = -2; i <= 2; i++) s.push(path(`M${cx - r} ${cy + i * r * 0.36}Q${cx} ${cy + i * r * 0.36 + 3} ${cx + r} ${cy + i * r * 0.36}`, { stroke: '#5a6280', sw: 1 }));
  for (let i = -2; i <= 2; i++) s.push(path(`M${cx + i * r * 0.36} ${cy - r}Q${cx + i * r * 0.36 - 2} ${cy} ${cx + i * r * 0.36} ${cy + r}`, { stroke: '#5a6280', sw: 1 }));
  s.push(circle(cx - r * 0.35, cy - r * 0.35, r * 0.25, { fill: '#ffffff', opacity: 0.8 }));
  s.push(glow(`disco${cx}`, cx, cy, r * 3, '#c8e0ff', 0.35));
  return s.join('');
}

/** The jukebox: arched cabinet, bubble tubes, a record window and the
 *  price tag. `lit`: a song is playing (lights on, record spinning). */
export function jukebox(x: number, w: number, floor: number, lit: boolean): string {
  const s: string[] = [];
  const top = floor - 118;
  const cx = x + w / 2;
  if (lit) s.push(glow(`jbGlow${x}`, cx, top + 50, w * 1.3, '#ff9ae0', 0.45, 80));
  s.push(ellipse(cx, floor, w * 0.6, 5, { fill: '#000000', opacity: 0.35 }));
  // Cabinet with an arched top.
  s.push(inked(`M${x} ${floor}V${top + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${top + w / 2}V${floor}Z`, '#8a3a1e', 3));
  s.push(path(`M${x + 6} ${floor - 4}V${top + w / 2}A${w / 2 - 6} ${w / 2 - 6} 0 0 1 ${x + w - 6} ${top + w / 2}V${floor - 4}`, { stroke: lit ? '#ffd34a' : '#c8902a', sw: 4 }));
  const tube = lit ? ['#ff5ab4', '#ffd34a', '#5ae0ff'] : ['#8a4a6a', '#8a7a3a', '#3a6a7a'];
  s.push(path(`M${x + 6} ${floor - 4}V${top + w / 2}A${w / 2 - 6} ${w / 2 - 6} 0 0 1 ${x + w - 6} ${top + w / 2}V${floor - 4}`, { stroke: tube[0], sw: 2, extra: 'stroke-dasharray="6 6"' }));
  // Record window.
  s.push(inked(`M${x + 12} ${top + 52}H${x + w - 12}V${top + 36}A${w / 2 - 12} ${w / 2 - 12} 0 0 0 ${x + 12} ${top + 36}Z`, lit ? '#3a2a6a' : '#22183a', 2));
  s.push(ellipse(cx, top + 44, w * 0.26, 4, { fill: '#141414', stroke: INK, sw: 1.2 }));
  s.push(ellipse(cx, top + 44, w * 0.08, 1.4, { fill: lit ? '#ff5ab4' : '#6a3a4a' }));
  // Song buttons and the speaker grille.
  for (let i = 0; i < 4; i++) s.push(rect(x + 10 + i * ((w - 20) / 4), top + 58, (w - 20) / 4 - 3, 7, { fill: lit ? tube[i % 3] : '#e8dcc0', stroke: INK, sw: 1 }, 1.5));
  s.push(inked(`M${x + 10} ${top + 72}H${x + w - 10}V${floor - 10}H${x + 10}Z`, '#5a2412', 2));
  for (let y = top + 77; y < floor - 12; y += 5) s.push(line([x + 13, y], [x + w - 13, y], '#c8902a', 1.4));
  // The price tag (what it says, the player reads out on a closer look).
  s.push(rect(cx - 14, top + 88, 28, 12, { fill: '#f4f0e6', stroke: INK, sw: 1.4 }, 2));
  s.push(path(`M${cx - 9} ${top + 92}h18M${cx - 9} ${top + 96}h12`, { stroke: '#a89a80', sw: 1.2 }));
  return s.join('');
}

/** A small ouzo glass standing on the counter (base at cx, baseY). */
export function ouzoGlass(cx: number, baseY: number, full: boolean): string {
  return [
    path(`M${cx - 4.5} ${baseY - 15}h9l-1.2 15h-6.6z`, { fill: '#e8f4f8', stroke: INK, sw: 1.4, opacity: 0.9 }),
    full ? path(`M${cx - 4} ${baseY - 11}h8l-0.9 10.4h-6.2z`, { fill: '#f8f6ea' }) : '',
    path(`M${cx - 2.8} ${baseY - 13}L${cx - 2.2} ${baseY - 2}`, { stroke: '#ffffff', sw: 1.2 }),
  ].join('');
}

/** Ali's coaster (it says "ALI. FINGER WEG." — too small to read from
 *  here; the player reads it out on a closer look). */
export function aliCoaster(cx: number, y: number): string {
  return [
    ellipse(cx, y, 13, 3.6, { fill: '#c43a3a', stroke: INK, sw: 1.4 }),
    ellipse(cx, y, 9, 2.2, { stroke: '#f4f0e6', sw: 0.8, opacity: 0.7 }),
  ].join('');
}

/** The refrain, as big lyrics across the top of the screen — the window
 *  in which nobody is watching. */
export function refrainBanner(cx: number, y: number): string {
  const opts = { size: 21, fill: '#ffe066', stroke: INK, sw: 5, family: CHALK, weight: 700 };
  return [
    rect(cx - 250, y - 4, 500, 62, { fill: '#1e1040', stroke: '#ff5ab4', sw: 3, opacity: 0.85 }, 14),
    glow('refrainGlow', cx, y + 27, 280, '#ff5ab4', 0.25, 50),
    text(cx, y + 22, '♫  Trink, trink, trink!  ♫', opts),
    text(cx, y + 48, 'Bis der ganze Tresen singt!', { ...opts, size: 17, fill: '#9ae8ff' }),
  ].join('');
}

/** The overhead bar rack ("Thekenüberbau") hanging above the counter:
 *  black pipes like the back bar, beer steins on top, stemware hanging
 *  upside down below, and an LED strip. It follows the counter in
 *  perspective, growing towards the viewer on the right. */
export function overheadRack(x0: number, x1: number, ceil: (x: number) => number): string {
  const s: string[] = [];
  const t = (x: number) => (x - x0) / (x1 - x0);
  const top = (x: number) => 132 - t(x) * 36;
  const bot = (x: number) => 158 - t(x) * 16;
  const k = (x: number) => 1 + t(x) * 0.6;
  // Hanging rods up to the ceiling.
  for (const rx of [x0 + 40, (x0 + x1) / 2, x1 - 60]) {
    s.push(line([rx, ceil(rx)], [rx, top(rx) + 2], INK, 4 * k(rx)));
    s.push(line([rx, ceil(rx)], [rx, top(rx) + 2], '#4a4a5a', 1.8 * k(rx)));
  }
  // Steins on top.
  for (let bx = x0 + 20; bx < x1 - 10; bx += 34 * k(bx)) {
    const kk = k(bx);
    s.push(inked(`M${bx - 6 * kk} ${top(bx)}v${-14 * kk}h${12 * kk}v${14 * kk}z`, '#e8b440', 1.4));
    s.push(rect(bx - 6 * kk, top(bx) - 16 * kk, 12 * kk, 4 * kk, { fill: '#f8f4ec', stroke: INK, sw: 1 }, 1.5));
    s.push(path(`M${bx + 6 * kk} ${top(bx) - 10 * kk}q${5 * kk} 0 ${5 * kk} ${4 * kk}q0 ${3 * kk} ${-5 * kk} ${3 * kk}`, { stroke: INK, sw: 1.6 }));
  }
  // Stemware upside down on the rails.
  for (let gx = x0 + 14; gx < x1 - 8; gx += 20 * k(gx)) {
    const kk = k(gx);
    const y = bot(gx) + 1;
    s.push(path(`M${gx - 4 * kk} ${y}h${8 * kk}M${gx} ${y}v${7 * kk}`, { stroke: '#e8f4f8', sw: 1.6 * kk }));
    s.push(path(`M${gx - 5 * kk} ${y + 7 * kk}h${10 * kk}l${-1.5 * kk} ${8 * kk}q${-3.5 * kk} ${3 * kk} ${-7 * kk} 0z`, { fill: '#d8eef4', stroke: INK, sw: 1.1, opacity: 0.9 }));
  }
  // The frame: two pipes and struts.
  for (const edge of [top, bot]) {
    s.push(path(`M${x0} ${edge(x0)}L${x1} ${edge(x1)}`, { stroke: INK, sw: 9 }));
    s.push(path(`M${x0} ${edge(x0)}L${x1} ${edge(x1)}`, { stroke: '#3a3a48', sw: 5 }));
    s.push(path(`M${x0} ${edge(x0) - 1.5}L${x1} ${edge(x1) - 1.5}`, { stroke: '#8a8aa0', sw: 1.2 }));
  }
  for (let sx = x0 + 6; sx < x1; sx += 60) s.push(line([sx, top(sx)], [sx, bot(sx)], '#3a3a48', 3));
  s.push(path(`M${x0} ${bot(x0) + 4}L${x1} ${bot(x1) + 5}`, { stroke: '#4ae8ff', sw: 2.4 }));
  s.push(glow('rackLed', (x0 + x1) / 2, bot((x0 + x1) / 2) + 40, (x1 - x0) * 0.55, '#4ae8ff', 0.18, 50));
  return s.join('');
}
