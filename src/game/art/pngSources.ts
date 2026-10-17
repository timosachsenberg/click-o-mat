import {
  INK,
  blob,
  circle,
  curve,
  defs,
  ellipse,
  glow,
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
  vignette,
  wobble,
  type Pt,
} from './toon';

/**
 * SVG source art for the demo's PNG assets in public/img. Not loaded by the
 * game: `tools/gen-assets.mjs` rasterizes these into PNGs, because the
 * gallery deliberately exercises the *file* pipeline (PNG backdrop,
 * spritesheets, alpha foreground). Drawing them with the same toolkit keeps
 * them in the house style — and shows the "author in SVG, ship PNG" route.
 */

// ---- gallery backdrop (960×450) ---------------------------------------------------

/** A gilded frame around a canvas area, with a picture light and plaque. */
function framed(x: number, y: number, w: number, h: number, art: string, seed: number, id: string): string {
  const s: string[] = [];
  s.push(glow(`${id}Light`, x + w / 2, y + h * 0.35, Math.max(w, h) * 0.95, '#ffe0a0', 0.32, h * 0.95));
  s.push(rect(x - 6, y - 4, w + 20, h + 20, { fill: '#1a0c14', opacity: 0.35 }, 3));
  s.push(inked(wobble(rectPts(x - 10, y - 10, w + 20, h + 20), { seed, wobble: 1 }), '#d2a43c', 3));
  s.push(path(wobble(rectPts(x - 5, y - 5, w + 10, h + 10), { seed: seed + 1, wobble: 0.6 }), { fill: '#a87a22', stroke: INK, sw: 1.5 }));
  s.push(path(`M${x - 8} ${y + h + 8}V${y - 8}H${x + w + 8}`, { stroke: '#f6dc8a', sw: 1.6, opacity: 0.8 }));
  s.push(`<clipPath id="${id}Clip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`);
  s.push(group(art, undefined, `clip-path="url(#${id}Clip)"`));
  s.push(rect(x, y, w, h, { stroke: INK, sw: 2 }));
  // Brass picture light above, plaque below
  s.push(inked(`M${x + w / 2 - 16} ${y - 22}h32l-4 7h-24z`, '#c9a24a', 1.8));
  s.push(line([x + w / 2, y - 15], [x + w / 2, y - 10], INK, 2));
  s.push(inked(wobble(rectPts(x + w / 2 - 15, y + h + 16, 30, 9), { seed: seed + 2, wobble: 0.4 }), '#e8dcb0', 1.5));
  s.push(line([x + w / 2 - 9, y + h + 20.5], [x + w / 2 + 9, y + h + 20.5], '#6a5a3a', 1.2));
  return s.join('');
}

function landscapeArt(x: number, y: number, w: number, h: number): string {
  return [
    `<defs>${linear('lsSky', 0, y, 0, y + h, [[0, '#f29a5e'], [0.55, '#f6c978'], [1, '#f8e4a8']])}</defs>`,
    rect(x, y, w, h, { fill: 'url(#lsSky)' }),
    circle(x + w - 34, y + 40, 15, { fill: '#fff2b8', stroke: '#e8803a', sw: 2 }),
    path(`M${x} ${y + h - 30}Q${x + w * 0.3} ${y + h - 64} ${x + w * 0.62} ${y + h - 30}Q${x + w * 0.85} ${y + h - 14} ${x + w} ${y + h - 40}V${y + h}H${x}Z`, { fill: '#6a9a4a', stroke: INK, sw: 2 }),
    path(`M${x} ${y + h - 10}Q${x + w * 0.5} ${y + h - 38} ${x + w} ${y + h - 12}V${y + h}H${x}Z`, { fill: '#3f7a3a', stroke: INK, sw: 2 }),
    inked(`M${x + 26} ${y + h - 36}l3 -16l3 16z`, '#2e5a2a', 1.5),
    path(curve([[x + 8, y + 30], [x + 30, y + 24], [x + 52, y + 32]]), { stroke: '#ffffff', sw: 3, opacity: 0.7 }),
  ].join('');
}

function abstractArt(x: number, y: number, w: number, h: number): string {
  const r = rng(77);
  const cols = ['#e2553e', '#4a7dd4', '#f0c040', '#4fae6a'];
  const s = [rect(x, y, w, h, { fill: '#26222e' })];
  for (let i = 0; i < 9; i++) {
    const cx = x + 10 + (i % 3) * 36;
    const cy = y + 10 + Math.floor(i / 3) * 36;
    s.push(path(wobble(rectPts(cx, cy, 30, 30), { seed: 90 + i, wobble: 1.6, jitter: 1.4 }), { fill: cols[(i * 3 + 1) % 4], stroke: INK, sw: 1.8 }));
    s.push(path(`M${cx + 4 + r() * 4} ${cy + 6}l${8 + r() * 10} ${r() * 4}`, { stroke: '#ffffff', sw: 2, opacity: 0.35 }));
  }
  return s.join('');
}

function nightArt(x: number, y: number, w: number, h: number): string {
  const r = rng(5);
  const s = [
    `<defs>${linear('ntSky', 0, y, 0, y + h, [[0, '#0f1a33'], [1, '#2a4468']])}</defs>`,
    rect(x, y, w, h, { fill: 'url(#ntSky)' }),
  ];
  for (let i = 0; i < 18; i++) s.push(circle(x + r() * w, y + r() * h * 0.6, 0.6 + r(), { fill: '#e8eaff' }));
  s.push(glow('ntMoon', x + 40, y + 34, 30, '#fff4c8', 0.5));
  s.push(circle(x + 40, y + 34, 17, { fill: '#f4ecc8', stroke: INK, sw: 2 }));
  s.push(circle(x + 34, y + 30, 4, { fill: '#d8ceaa' }));
  s.push(path(`M${x} ${y + h - 18}Q${x + w * 0.5} ${y + h - 62} ${x + w} ${y + h - 20}V${y + h}H${x}Z`, { fill: '#1d3a54', stroke: INK, sw: 2 }));
  s.push(path(`M${x + w * 0.6} ${y + h}Q${x + w * 0.8} ${y + h - 34} ${x + w} ${y + h - 30}V${y + h}Z`, { fill: '#142a40', stroke: INK, sw: 2 }));
  return s.join('');
}

export function galleryBackdrop(): string {
  const W = 960;
  const H = 450;
  const s: string[] = [];
  s.push(
    defs(
      linear('gWall', 0, 0, 0, 300, [[0, '#4a2034'], [0.6, '#6e3048'], [1, '#7a3a50']]),
      linear('gFloorShade', 0, 300, 0, 450, [[0, '#1c0a06', 0.6], [0.4, '#1c0a06', 0.12], [1, '#1c0a06', 0]]),
      linear('gCarpet', 0, 300, 0, 450, [[0, '#6a1424'], [1, '#a42634']])
    )
  );
  // Damask wall
  s.push(rect(0, 0, W, 304, { fill: 'url(#gWall)' }));
  for (let y = 26; y < 226; y += 44) {
    for (let x = (y / 44) % 2 ? 0 : 30; x < W; x += 60) {
      s.push(path(blob([[x, y - 12], [x + 7, y - 2], [x + 3, y], [x + 7, y + 3], [x, y + 12], [x - 7, y + 3], [x - 3, y], [x - 7, y - 2]]), { fill: '#e8b0c0', opacity: 0.08 }));
    }
  }
  // Cornice
  s.push(inked(wobble([[-10, -10], [970, -10], [970, 14], [-10, 18]], { seed: 2, wobble: 1.5 }), '#2c1220', 3));
  s.push(path('M-10 22H970', { stroke: '#d2a43c', sw: 4 }));
  s.push(path('M-10 22H970', { stroke: INK, sw: 1 }));
  // Wainscot: dark wood panels under a gold rail
  s.push(rect(0, 230, W, 70, { fill: '#3a1e1c' }));
  s.push(path('M0 230H960', { stroke: INK, sw: 3 }));
  s.push(rect(0, 226, W, 7, { fill: '#c9963a', stroke: INK, sw: 1.5 }));
  for (let x = 8; x < W; x += 96) {
    s.push(path(wobble(rectPts(x, 242, 80, 44), { seed: x + 3, wobble: 0.8 }), { fill: '#4a2824', stroke: '#22100e', sw: 2 }));
    s.push(path(`M${x + 2} 284H${x + 80}V244`, { stroke: '#6e4434', sw: 1.4 }));
  }

  // Doorway back to the hallway (left): dark, a little hall light spilling in
  s.push(inked(wobble([[28, 118], [148, 116], [148, 304], [30, 304]], { seed: 31, wobble: 1.2 }), '#5a2c34', 3));
  s.push(path(wobble([[42, 132], [134, 130], [134, 302], [42, 302]], { seed: 32, wobble: 1 }), { fill: '#1a0e16', stroke: INK, sw: 2.5 }));
  s.push(path('M42 302L134 302L120 250L58 250Z', { fill: '#5e4a6e', opacity: 0.35 }));
  s.push(path('M48 140V296', { stroke: '#a07890', sw: 2, opacity: 0.4 }));
  s.push(inked('M80 112h16l-2 10h-12z', '#d2a43c', 2));

  // Archway to the stair hall (right): rounded arch, the first steps beyond
  s.push(inked('M828 304V176Q828 112 888 112Q948 112 948 176V304Z', '#5a2c34', 3));
  s.push(path('M842 304V180Q842 128 888 128Q934 128 934 180V304Z', { fill: '#170c14', stroke: INK, sw: 2.5 }));
  for (let i = 0; i < 5; i++) {
    const yy = 300 - i * 14;
    s.push(path(`M${846 + i * 10} ${yy}H${930}V${yy - 14}`, { fill: '#2e1a1c', stroke: '#4a2e2a', sw: 1.5 }));
  }
  s.push(glow('archGlow', 900, 200, 60, '#ffcc88', 0.25));
  s.push(inked('M878 104h20l-3 14h-14z', '#d2a43c', 2));

  // Paintings (frames sized to the hotspots)
  s.push(framed(168, 70, 116, 110, landscapeArt(168, 70, 116, 110), 40, 'pLand'));
  s.push(framed(420, 60, 120, 120, abstractArt(420, 60, 120, 120), 50, 'pAbs'));
  s.push(framed(650, 74, 150, 100, nightArt(650, 74, 150, 100), 60, 'pNight'));

  // Parquet floor in perspective
  const vp: Pt = [480, 40];
  const at = (xb: number, yy: number) => vp[0] + ((xb - vp[0]) * (yy - vp[1])) / (450 - vp[1]);
  for (let i = -10, k = 0; i < 24; i++, k++) {
    const a = -260 + i * 64;
    const b = a + 64;
    for (let row = 0; row < 5; row++) {
      const y0 = 300 + row * 30;
      const y1 = y0 + 30;
      const shade = ['#8a5430', '#7e4c2a', '#965e36'][(k + row) % 3];
      s.push(path(poly([[at(a, y0), y0], [at(b, y0), y0], [at(b, y1), y1], [at(a, y1), y1]]), { fill: shade, stroke: '#3a1e10', sw: 1, opacity: 1 }));
    }
  }
  s.push(rect(0, 300, W, 150, { fill: 'url(#gFloorShade)' }));
  s.push(inked('M-5 292Q480 296 965 292L965 304Q480 308 -5 304Z', '#2c1220', 2.5));
  // Red carpet runner with gold trim
  s.push(path('M362 304L598 304L722 452L238 452Z', { fill: 'url(#gCarpet)', stroke: INK, sw: 3 }));
  s.push(path('M374 310L586 310L700 446L260 446Z', { stroke: '#e8b84a', sw: 2.5 }));
  for (let i = 0; i < 4; i++) {
    const yy = 330 + i * 32;
    const half = 120 + (yy - 304) * 0.82;
    s.push(path(poly([[480, yy - 6], [492, yy], [480, yy + 6], [468, yy]]), { fill: '#e8b84a', opacity: 0.8 }));
    s.push(line([480 - half * 0.7, yy], [480 - half * 0.55, yy], '#e8b84a', 1.5));
    s.push(line([480 + half * 0.55, yy], [480 + half * 0.7, yy], '#e8b84a', 1.5));
  }

  // Velvet bench (a walk-blocking hole in the room def)
  s.push(ellipse(490, 368, 74, 9, { fill: '#100408', opacity: 0.45 }));
  s.push(inked('M440 338l10 0l-3 30l-9 0z', '#2c1a14', 2));
  s.push(inked('M530 338l10 0l3 30l-9 0z', '#2c1a14', 2));
  s.push(inked(wobble([[426, 336], [554, 334], [552, 346], [428, 348]], { seed: 71, wobble: 0.6 }), '#3a1e1c', 2.5));
  s.push(inked(puff(490, 328, 66, 10, 6, 72, 0.08), '#5a3a8a', 2.5));
  s.push(path('M436 324Q490 316 544 324', { stroke: '#8a6ac0', sw: 2.5, opacity: 0.8 }));
  for (const bx of [452, 476, 500, 524]) s.push(circle(bx, 330, 1.6, { fill: '#2c1a4a' }));

  // Ceiling light pool, vignette, grain
  s.push(glow('gFloorGlow', 480, 380, 340, '#ffd090', 0.16, 80));
  s.push(vignette('gVig', W, H, 0.45));
  // No paper grain baked in: noise doesn't compress (it would make this PNG
  // ~20× larger), so the gallery lays it over the PNG at runtime as a small
  // svg layer instead — see rooms/gallery.ts.
  return s.join('');
}

// ---- foreground pillar (140×360, alpha) ---------------------------------------------

export function pillar(): string {
  const s: string[] = [];
  s.push(defs(linear('plShaft', 30, 0, 110, 0, [[0, '#6a6070'], [0.3, '#b8aeb4'], [0.55, '#d6ccd0'], [0.75, '#a49aa4'], [1, '#5a5262']])));
  // Shaft (bulging slightly, DOTT-style), flutes, a crack
  s.push(inked('M36 34Q30 180 38 326L104 326Q112 180 106 34Z', 'url(#plShaft)', 3));
  for (const fx of [50, 62, 74, 86, 96]) {
    s.push(path(`M${fx} 40Q${fx + (fx - 71) * 0.08} 180 ${fx} 320`, { stroke: '#4a4250', sw: 1.6, opacity: 0.55 }));
  }
  s.push(path('M44 40Q40 180 46 320', { stroke: '#f0e8ec', sw: 2.5, opacity: 0.6 }));
  s.push(path('M88 120l-6 14l5 10l-7 16', { stroke: INK, sw: 1.6 }));
  // Capital: abacus + echinus with volutes
  s.push(inked(wobble(rectPts(14, 6, 112, 16), { seed: 3, wobble: 0.8 }), '#c8bec4', 3));
  s.push(inked('M24 22Q70 40 116 22L110 36Q70 44 30 36Z', '#a89ea8', 2.5));
  for (const [cx, dir] of [[24, -1], [116, 1]] as Array<[number, number]>) {
    s.push(circle(cx, 28, 8, { fill: '#c8bec4', stroke: INK, sw: 2.5 }));
    s.push(path(`M${cx} 28m-4 0a4 4 0 1 0 ${8 * -dir} 0`, { stroke: INK, sw: 1.5 }));
  }
  s.push(path('M18 10H120', { stroke: '#f0e8ec', sw: 2, opacity: 0.7 }));
  // Base: torus + plinth
  s.push(inked('M26 326H116Q122 334 116 340H26Q20 334 26 326Z', '#b0a6b0', 2.5));
  s.push(inked(wobble(rectPts(10, 340, 122, 16), { seed: 4, wobble: 0.8 }), '#8e8490', 3));
  s.push(path('M14 344H128', { stroke: '#d8ced4', sw: 1.6, opacity: 0.6 }));
  return s.join('');
}

// ---- wall sconce (4 frames, 32×48 each) ---------------------------------------------

export function sconceFrame(f: number): string {
  const lean = [0, 2, -1, 1][f];
  const hgt = [15, 12, 16, 13][f];
  const cx = 16;
  return [
    glow('scGlow', cx, 18, 15, '#ffd890', [0.6, 0.45, 0.65, 0.5][f]),
    inked('M14 46V38h4v8z', '#8a6a2a', 1.5),
    inked('M5 35Q16 32.5 27 35Q25.5 42 16 42Q6.5 42 5 35Z', '#c9a24a', 1.8),
    path('M8 36.5Q16 35 24 36.5', { stroke: '#f6dc8a', sw: 1.2 }),
    inked('M12.5 24h7v12h-7z', '#f2ead4', 1.6),
    path('M13.5 26v8', { stroke: '#ffffff', sw: 1, opacity: 0.8 }),
    path(`M${cx} 24Q${cx - 5 + lean} ${24 - hgt * 0.45} ${cx + lean} ${24 - hgt}Q${cx + 5 + lean} ${24 - hgt * 0.45} ${cx} 24Z`, { fill: '#ff9c2a', stroke: '#8a3a10', sw: 1.2 }),
    path(`M${cx} 23Q${cx - 2.5 + lean * 0.6} ${23 - hgt * 0.35} ${cx + lean * 0.6} ${23 - hgt * 0.65}Q${cx + 2.5 + lean * 0.6} ${23 - hgt * 0.35} ${cx} 23Z`, { fill: '#fff2a0' }),
  ].join('');
}

// ---- bird (2 flap frames, 40×28) ----------------------------------------------------

export function birdFrame(f: number): string {
  const up = f === 0;
  const wing = (dir: number) =>
    up
      ? `M${20 + dir * 2} 15Q${20 + dir * 6} 2 ${20 + dir * 16} 3Q${20 + dir * 10} 9 ${20 + dir * 5} 17Z`
      : `M${20 + dir * 2} 15Q${20 + dir * 8} 24 ${20 + dir * 16} 25Q${20 + dir * 11} 18 ${20 + dir * 5} 14Z`;
  return [
    inked(wing(-1), '#d8dce4', 1.6),
    inked('M8 16L3 13L4 19Z', '#9aa2b0', 1.4),
    inked('M7 16Q12 10 22 12Q30 13 31 17Q26 21 16 20Q9 20 7 16Z', '#f4f4f0', 1.8),
    inked('M30 15L37 16.5L30 18.5Z', '#f2b43a', 1.3),
    circle(27, 14.5, 1.2, { fill: INK }),
    inked(wing(1), '#e8ecf0', 1.6),
  ].join('');
}

// ---- Blobbo the critter (8×3 sheet of 48×48 cells) -----------------------------------

export type CritterVariant = 'front' | 'side' | 'back';
export type CritterPose = 'idle' | 'walk' | 'talk';

/** Sheet index → [variant, pose, frame], matching GALLERY_ASSETS' anims. */
export const CRITTER_SHEET: Array<[CritterVariant, CritterPose, number]> = [
  ['front', 'idle', 0], ['front', 'idle', 1], ['side', 'idle', 0], ['side', 'idle', 1],
  ['back', 'idle', 0], ['back', 'idle', 1], ['front', 'talk', 0], ['front', 'talk', 1],
  ['front', 'walk', 0], ['front', 'walk', 1], ['front', 'walk', 2], ['front', 'walk', 3],
  ['side', 'walk', 0], ['side', 'walk', 1], ['side', 'walk', 2], ['side', 'walk', 3],
  ['back', 'walk', 0], ['back', 'walk', 1], ['back', 'walk', 2], ['back', 'walk', 3],
  ['side', 'talk', 0], ['side', 'talk', 1], ['back', 'talk', 0], ['back', 'talk', 1],
];

/**
 * One 48×48 critter cell. Bounds that keep the sheet bleed-free: the feet
 * stay above y 47 and only the antenna (x 16..32) rises into the top rows.
 */
export function critterFrame(variant: CritterVariant, pose: CritterPose, f: number): string {
  const cx = 24;
  const bob = pose === 'walk' ? (f % 2 === 0 ? -2 : 0) : 0;
  const squish = pose === 'idle' && f % 2 === 1 ? 1.5 : 0;
  const base = 42 + bob;
  const bw = 16 + squish;
  const top = 17 + squish + bob;
  const side = variant === 'side';
  const step = pose === 'walk' ? [4, 0, -4, 0][f % 4] : 0;
  const s: string[] = [];
  // Feet
  s.push(ellipse(cx - 8 + step, 43.5, 5.2, 3, { fill: '#b8641c', stroke: INK, sw: 1.6 }));
  s.push(ellipse(cx + 8 - step, 43.5, 5.2, 3, { fill: '#b8641c', stroke: INK, sw: 1.6 }));
  // Body dome with cel shading
  const dome = `M${cx - bw} ${base}C${cx - bw} ${top - 2} ${cx + bw} ${top - 2} ${cx + bw} ${base}Q${cx} ${base + 3} ${cx - bw} ${base}Z`;
  s.push(`<defs><clipPath id="cb"><path d="${dome}"/></clipPath></defs>`);
  s.push(path(dome, { fill: '#f4a040' }));
  s.push(group(ellipse(cx + 12, base - 2, 10, 16, { fill: '#d4762a' }), undefined, 'clip-path="url(#cb)"'));
  s.push(ellipse(cx - 1, base - 6, bw * 0.5, 5, { fill: '#ffd8a0', opacity: 0.7 }));
  s.push(path(dome, { stroke: INK, sw: 2 }));
  s.push(path(`M${cx - 9} ${top + 6}Q${cx - 5} ${top + 1} ${cx} ${top + 1}`, { stroke: '#ffe2b8', sw: 2, opacity: 0.9 }));
  // Antenna (kept within x 16..32 near the top of the cell)
  const tipX = cx + (side ? 4 : 0);
  const tipY = top - 9;
  s.push(path(`M${cx} ${top + 1}Q${cx + (side ? 1 : 0)} ${top - 4} ${tipX} ${tipY}`, { stroke: INK, sw: 3.4 }));
  s.push(path(`M${cx} ${top + 1}Q${cx + (side ? 1 : 0)} ${top - 4} ${tipX} ${tipY}`, { stroke: '#d4762a', sw: 1.6 }));
  s.push(circle(tipX, tipY - 2, 3.2, { fill: '#ffd23f', stroke: INK, sw: 1.5 }));
  s.push(circle(tipX - 1, tipY - 3, 1, { fill: '#fff8d0' }));
  if (variant === 'back') return s.join('');

  const eyeY = base - 14;
  const eyes: Array<[number, number]> = side ? [[cx + 8, 3.6]] : [[cx - 6, 4.2], [cx + 6, 4.2]];
  for (const [ex, r] of eyes) {
    s.push(ellipse(ex, eyeY, r, r * 1.1, { fill: '#ffffff', stroke: INK, sw: 1.4 }));
    s.push(circle(ex + (side ? 1.5 : 0.8), eyeY + 0.4, r * 0.45, { fill: INK }));
    s.push(circle(ex + (side ? 2 : 1.3), eyeY - 0.6, r * 0.16, { fill: '#ffffff' }));
  }
  const open = pose === 'talk' && f % 2 === 0;
  const mx = side ? cx + 10 : cx;
  const my = base - 6;
  s.push(open ? ellipse(mx, my, 3, 3.4, { fill: '#7a1e1a', stroke: INK, sw: 1.3 }) : path(`M${mx - 3.5} ${my - 0.5}Q${mx} ${my + 2} ${mx + 3.5} ${my - 0.5}`, { stroke: INK, sw: 1.4 }));
  return s.join('');
}
