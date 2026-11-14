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
  text,
  vignette,
  wobble,
  type Pt,
} from '../../game/art/toon';
import { band } from './neckar';

/**
 * The street between the Picasso and the Epplehaus at sunset: on the left
 * the stairs down into the Picasso under its flickering neon, in the middle
 * a döner stand — Neckar-Kebap, a spit turning in the window, steam and a
 * smell you can see — with two standing tables, on the right the street on
 * to the Epplehaus. No puzzle here. It just smells good.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

export const DB = {
  ground: 304,
  cellar: { x: 46, y: 204, w: 78, h: 100 },
  kiosk: { x: 300, y: 118, w: 360, h: 186 },
  /** The window with the spit (an animation layer). */
  spit: { x: 344, y: 168, w: 64, h: 92 },
  counter: { x: 330, y: 168, w: 300, h: 88 },
  tables: [700, 820],
};

const LIT = '#ffd870';
const DARK_PANE = '#3a3258';

function sky(): string {
  return [
    rect(0, 0, 960, 310, { fill: 'url(#dbSky)' }),
    glow('dbSun', 900, 260, 360, '#ffd27a', 0.55, 200),
    band(-40, 520, 36, 20, 21),
    band(420, 1000, 72, 14, 23),
    ...([[120, 26], [460, 12], [700, 30]] as Pt[]).map(([x, y]) => circle(x, y, 1.2, { fill: '#fff6d8', opacity: 0.8 })),
  ].join('');
}

/** Old town houses behind, roofs against the sky, first lights on. */
function backdrop(): string {
  const s: string[] = [];
  const houses: Array<[number, number, number, string]> = [
    [-10, 60, 200, '#7a5a7a'], [180, 86, 140, '#8a5a6a'], [660, 70, 150, '#6a5a84'], [800, 50, 180, '#7a4a6a'],
  ];
  for (const [x, top, w, c] of houses) {
    s.push(inked(poly([[x, DB.ground], [x, top], [x + w / 2, top - 46], [x + w, top], [x + w, DB.ground]]), c, 2.4));
    s.push(path(poly([[x + w / 2, top - 46], [x + w, top], [x + w * 0.6, top]]), { fill: '#1e1038', opacity: 0.3 }));
    const r = rng(x + 99);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < Math.floor(w / 46); col++) {
        const wx = x + 18 + col * 46;
        const wy = top + 14 + row * 52;
        if (wy > DB.ground - 40) continue;
        const lit = r() < 0.35;
        s.push(rect(wx, wy, 20, 28, { fill: lit ? LIT : DARK_PANE, stroke: INK, sw: 1.6 }));
        if (lit) s.push(rect(wx - 6, wy - 6, 32, 40, { fill: LIT, opacity: 0.14 }, 6));
      }
    }
  }
  return s.join('');
}

/** The stairs down to the Picasso, under its neon. */
function picassoStairs(): string {
  const s: string[] = [];
  const { x, y, w, h } = DB.cellar;
  s.push(inked(`M${x} ${y + h}V${y + 26}Q${x + w / 2} ${y - 16} ${x + w} ${y + 26}V${y + h}Z`, '#1a1028', 2.6));
  for (let k = 0; k < 5; k++) s.push(path(`M${x + 6 + k * 3} ${y + h - 6 - k * 13}H${x + w - 6 - k * 3}`, { stroke: '#5a3a6a', sw: 3, opacity: 0.9 - k * 0.15 }));
  s.push(glow('dbCellar', x + w / 2, y + 50, 46, '#ff5ab4', 0.5, 40));
  s.push(path(`M${x - 8} ${y + h}V${y + 58}H${x + 6}M${x + w + 8} ${y + h}V${y + 58}H${x + w - 6}`, { stroke: INK, sw: 4 }));
  s.push(path(`M${x - 8} ${y + h}V${y + 58}H${x + 6}M${x + w + 8} ${y + h}V${y + 58}H${x + w - 6}`, { stroke: '#8a8a9a', sw: 1.6 }));
  s.push(glow('dbNeon', x + w / 2, y - 26, 70, '#ff5ab4', 0.55, 28));
  s.push(text(x + w / 2, y - 20, 'Picasso', { size: 24, fill: '#ffe6f4', stroke: '#ff3aa0', sw: 3.4, family: "'Brush Script MT', 'Segoe Script', cursive", weight: 700, rotate: -4 }));
  s.push(path(`M${x + w / 2 - 9} ${y - 8}h18l-9 11z`, { fill: '#ffe6f4', stroke: '#ff3aa0', sw: 2 }));
  return s.join('');
}

/** The döner stand: a little pavilion, awning, menu, the window with the spit. */
function kiosk(): string {
  const s: string[] = [];
  const { x, y, w, h } = DB.kiosk;
  const c = DB.counter;
  // Body, warm light inside.
  s.push(inked(wobble([[x, y + 30], [x + w, y + 30], [x + w, y + h], [x, y + h]], { seed: 4, wobble: 1.2 }), '#e8dcc8', 3));
  s.push(path(poly([[x + w - 70, y + 30], [x + w, y + 30], [x + w, y + h], [x + w - 70, y + h]]), { fill: '#3a2058', opacity: 0.18 }));
  s.push(rect(c.x, c.y, c.w, c.h, { fill: '#ffcf7a', stroke: INK, sw: 2.4 }));
  s.push(glow('dbInside', c.x + c.w / 2, c.y + c.h / 2, 190, '#fff0b0', 0.5, 70));
  // Tiles at the back, a shelf with cans, the döner man behind the counter.
  for (let tx = c.x + 4; tx < c.x + c.w; tx += 16) s.push(line([tx, c.y + 2], [tx, c.y + c.h - 26], '#e8b060', 1, 0.6));
  for (let ty = c.y + 14; ty < c.y + c.h - 26; ty += 16) s.push(line([c.x + 2, ty], [c.x + c.w - 2, ty], '#e8b060', 1, 0.6));
  for (let k = 0; k < 7; k++) s.push(inked(`M${c.x + 120 + k * 22} ${c.y + 30}h12v-18h-12z`, ['#d8322a', '#3a8a4a', '#2a6ad8', '#f2c230'][k % 4], 1.2));
  s.push(path(`M${c.x + 110} ${c.y + 32}H${c.x + 290}`, { stroke: '#8a5a2a', sw: 3 }));
  // The man: white cap, moustache, apron — a big grin.
  const mx = c.x + 200;
  const my = c.y + 64;
  s.push(inked(`M${mx - 22} ${c.y + c.h}V${my + 4}Q${mx} ${my - 8} ${mx + 22} ${my + 4}V${c.y + c.h}Z`, '#f4efe4', 2));
  s.push(circle(mx, my - 14, 13, { fill: '#e0a878', stroke: INK, sw: 2 }));
  s.push(path(`M${mx - 9} ${my - 9}q4 4 9 0q5 4 9 0`, { stroke: '#2a1a10', sw: 3.4 }));
  s.push(circle(mx - 5, my - 17, 1.4, { fill: INK }) + circle(mx + 5, my - 17, 1.4, { fill: INK }));
  s.push(inked(`M${mx - 13} ${my - 22}h26v-8q-13 -6 -26 0z`, '#f4efe4', 1.6));
  // The counter's front, the awning, the sign.
  s.push(inked(poly([[c.x - 10, c.y + c.h - 4], [c.x + c.w + 10, c.y + c.h - 4], [c.x + c.w + 10, c.y + c.h + 6], [c.x - 10, c.y + c.h + 6]]), '#b8b8c8', 2));
  for (const [cx, col] of [[c.x + 236, '#d8322a'], [c.x + 252, '#f2c230'], [c.x + 268, '#3a8a4a']] as Array<[number, string]>) s.push(inked(`M${cx - 5} ${c.y + c.h - 4}v-14h10v14z`, col, 1.2));
  s.push(inked(`M${x - 16} ${y + 34}L${x + w + 16} ${y + 34}L${x + w} ${y}L${x} ${y}Z`, '#d8322a', 2.6));
  for (let k = 0; k < 12; k++) {
    const sx = x - 16 + k * ((w + 32) / 12);
    s.push(path(`M${sx} ${y + 34}q${(w + 32) / 24} 10 ${(w + 32) / 12} 0`, { fill: k % 2 ? '#d8322a' : '#f4efe4', stroke: INK, sw: 1.6 }));
  }
  s.push(inked(`M${x + 60} ${y - 34}h${w - 120}v34h${-(w - 120)}z`, '#1e1838', 2.4));
  s.push(glow('dbSignGlow', x + w / 2, y - 17, 140, '#ffb04a', 0.4, 26));
  s.push(text(x + w / 2, y - 9, 'NECKAR-KEBAP', { size: 22, fill: '#ffd34a', stroke: '#d8322a', sw: 2, spacing: 1 }));
  // The menu board on the right.
  s.push(inked(`M${x + w - 56} ${y + 46}h48v108h-48z`, '#2a2a3a', 2));
  const menu: Array<[string, string]> = [['Döner', '7,50'], ['Dürüm', '8,00'], ['Pommes', '4,00'], ['Ayran', '2,50']];
  menu.forEach(([n, p], i) => {
    s.push(text(x + w - 51, y + 62 + i * 24, n, { size: 8, fill: '#f4efe4', anchor: 'start', weight: 700 }));
    s.push(text(x + w - 13, y + 72 + i * 24, p, { size: 8, fill: '#ffd34a', anchor: 'end', weight: 700 }));
  });
  return s.join('');
}

/** Standing tables with a napkin dispenser, and a bin. */
function tables(): string {
  const s: string[] = [];
  for (const tx of DB.tables) {
    s.push(ellipse(tx, DB.ground + 44, 30, 6, { fill: '#000000', opacity: 0.3 }));
    s.push(path(`M${tx} ${DB.ground - 16}V${DB.ground + 42}M${tx - 18} ${DB.ground + 44}H${tx + 18}`, { stroke: INK, sw: 6 }));
    s.push(path(`M${tx} ${DB.ground - 16}V${DB.ground + 42}M${tx - 18} ${DB.ground + 44}H${tx + 18}`, { stroke: '#8a8a9a', sw: 3 }));
    s.push(ellipse(tx, DB.ground - 18, 34, 8, { fill: '#c8c8d0', stroke: INK, sw: 2.2 }));
    s.push(inked(`M${tx - 6} ${DB.ground - 20}v-12h12v12z`, '#d8d8e0', 1.4));
    s.push(path(`M${tx - 3} ${DB.ground - 32}v-4h6v4`, { stroke: '#ffffff', sw: 1.6 }));
  }
  s.push(inked('M890 300h30l-4 44h-22z', '#3a6a4a', 2));
  s.push(path('M892 300h26', { stroke: '#2a4a3a', sw: 4 }));
  return s.join('');
}

function ground(): string {
  const s: string[] = [];
  s.push(rect(-4, DB.ground, 968, 150, { fill: 'url(#dbGround)' }));
  s.push(path(`M-4 ${DB.ground}H964`, { stroke: INK, sw: 2.4 }));
  for (let row = 0, y = DB.ground + 10; y < 452; row++, y += 9 + row * 1.6) {
    const w = 22 + row * 3.4;
    for (let x = -w + (row % 2) * (w / 2); x < 964; x += w) s.push(path(`M${x} ${y}q${w / 2} ${-4 - row * 0.5} ${w} 0`, { stroke: '#3a2a52', sw: 1.2, opacity: 0.5 }));
  }
  s.push(glow('dbKioskPool', DB.counter.x + DB.counter.w / 2, 340, 220, LIT, 0.32, 40));
  s.push(glow('dbNeonPool', 86, 324, 90, '#ff5ab4', 0.3, 26));
  // A dropped napkin, a döner wrapper.
  s.push(inked('M560 392l14 -3l3 10l-14 3z', '#f4efe4', 1.2));
  s.push(inked('M240 420l18 2l-2 10l-18 -2z', '#e8c860', 1.2));
  return s.join('');
}

export function doenerBg(): string {
  return [
    defs(
      grainDefs(83),
      linear('dbSky', 0, 0, 0, 300, [
        [0, '#34347c'],
        [0.3, '#7c4a94'],
        [0.6, '#e2607a'],
        [0.85, '#ff9a52'],
        [1, '#ffe08a'],
      ]),
      linear('dbGround', 0, DB.ground, 0, 450, [
        [0, '#9a7488'],
        [1, '#4c3c6c'],
      ]),
      linear('dbDusk', 0, 250, 0, 450, [
        [0, '#2a1a50', 0],
        [1, '#2a1a50', 0.28],
      ])
    ),
    sky(),
    backdrop(),
    picassoStairs(),
    kiosk(),
    ground(),
    tables(),
    rect(0, 0, 960, 450, { fill: '#ff7a3a', opacity: 0.07 }),
    rect(0, 250, 960, 200, { fill: 'url(#dbDusk)' }),
    vignette('dbVig', 960, 450, 0.4, '#241040'),
    grainOverlay(960, 450, 0.3, 0.22),
  ].join('');
}

/** The spit turning: four frames of the meat cone, its stripes moving round. */
export const SPIT_FRAMES: SvgImageAsset[] = [0, 1, 2, 3].map((f) => {
  const { w, h } = DB.spit;
  const cx = w / 2;
  const s: string[] = [];
  s.push(line([cx, 2], [cx, h - 2], '#8a8a9a', 3));
  s.push(inked(`M${cx - 22} 12Q${cx} 6 ${cx + 22} 12L${cx + 14} ${h - 14}Q${cx} ${h - 10} ${cx - 14} ${h - 14}Z`, '#a85a2a', 2.2));
  for (let k = 0; k < 6; k++) {
    const t = ((k + f / 4) / 6) * Math.PI * 2;
    const xo = Math.sin(t);
    if (Math.cos(t) < 0) continue;
    const xt = cx + xo * 20;
    const xb = cx + xo * 12;
    s.push(path(`M${xt} 12L${xb} ${h - 14}`, { stroke: '#7a3a12', sw: 2.4 }));
    s.push(path(`M${xt + 3} 14L${xb + 2} ${h - 16}`, { stroke: '#e08a3a', sw: 1.6, opacity: 0.8 }));
  }
  // Crispy edge highlight on the side facing the heater.
  s.push(path(`M${cx + 20} 14L${cx + 13} ${h - 16}`, { stroke: '#ffb04a', sw: 2.4 }));
  s.push(rect(w - 8, 6, 6, h - 12, { fill: '#ff6a2a', opacity: 0.4 + (f % 2) * 0.2 }));
  return { key: `doener-spit-${f}`, width: w, height: h, svg: s.join('') };
});

/** Steam and the smell rising from the stand, as wavy lines (its own layer,
 *  so an ambient can let it drift). */
export function smell(): string {
  const s: string[] = [];
  const x0 = DB.counter.x + 40;
  for (let k = 0; k < 4; k++) {
    const x = x0 + k * 22;
    s.push(path(`M${x} 150q-8 -12 0 -24t0 -24t0 -24`, { stroke: '#fff6e0', sw: 3, opacity: 0.5 }));
  }
  return group(s);
}
