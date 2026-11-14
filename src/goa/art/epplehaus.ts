import type { ActorVariant, SvgActorAsset } from '../../engine/types';
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
  puff,
  rect,
  rng,
  text,
  vignette,
  wobble,
  type Pt,
} from '../../game/art/toon';
import { band } from './neckar';

/**
 * The forecourt of the Epplehaus, Tübingen's self-run youth centre, at
 * sunset: an old villa under a hip roof, covered in graffiti up to the
 * first-floor windows, a bedsheet banner over the door. On the left the
 * neighbour's wall with the cellar stairs down to the Picasso; on the right
 * the street runs on to the Neckarbrücke. In front: bikes, the bottle
 * banks, Flaschenfloh's shopping trolley — and pigeons everywhere.
 *
 * All functions draw in room coordinates (960×450) and return SVG markup.
 */

export const EP = {
  /** The house: left and right edge, eaves, ground line. */
  x0: 190,
  x1: 770,
  eaves: 74,
  ground: 304,
  door: { x: 440, y: 196, w: 80, h: 104 },
  cellar: { x: 46, y: 204, w: 78, h: 100 },
  trolley: { x: 590, y: 286, w: 72, h: 52 },
  banks: { x: 684, y: 256, w: 112, h: 78 },
  bikes: { x: 214, y: 262, w: 190, h: 72 },
  sign: { x: 846, y: 196 },
};

const LIT = '#ffd870';
const DARK_PANE = '#3a3258';
const SPRAY = ['#ff4a8a', '#4ae8ff', '#ffd34a', '#8aff5a', '#b06aff', '#ff7a2a', '#ffffff'];

function sky(): string {
  return [
    rect(0, 0, 960, 310, { fill: 'url(#epSky)' }),
    glow('epSun', 60, 250, 360, '#ffd27a', 0.6, 220),
    band(300, 990, 30, 22, 13),
    band(-40, 420, 58, 16, 15),
    band(640, 1000, 96, 12, 17),
    ...([[130, 20], [560, 14], [880, 30]] as Pt[]).map(([x, y]) => circle(x, y, 1.2, { fill: '#fff6d8', opacity: 0.8 })),
  ].join('');
}

/** The street on towards the bridge: far roofs, a glimpse of the river, a signpost. */
function street(): string {
  const s: string[] = [];
  s.push(path('M776 304V236L800 214L826 232L850 206L880 230L906 212L940 236L964 226V304Z', { fill: '#6a4a7a' }));
  for (const [x, y] of [[806, 244], [856, 236], [886, 250], [932, 246]] as Pt[]) s.push(rect(x, y, 4, 5, { fill: LIT, opacity: 0.9 }));
  // The river beyond, catching the sky, and the bridge's balustrade.
  s.push(path('M776 304V282H964V304Z', { fill: '#f08a6a' }));
  s.push(path('M786 290h40M850 296h50M900 288h44', { stroke: '#fff0b0', sw: 1.4, opacity: 0.7 }));
  s.push(inked('M880 304V276H964V304Z', '#b98274', 2));
  for (let x = 890; x < 960; x += 12) s.push(inked(`M${x - 3} 282Q${x - 5} 290 ${x - 2} 298h4Q${x + 5} 290 ${x + 3} 282Z`, '#d89c80', 1.2));
  s.push(inked('M876 270H964V279H876Z', '#d89c80', 2));
  // The signpost.
  const { x, y } = EP.sign;
  s.push(inked(`M${x - 2.5} ${y}V${EP.ground + 28}h5V${y}Z`, '#4a4a5a', 1.6));
  s.push(inked(`M${x - 4} ${y + 6}h78l12 9l-12 9h-78z`, '#f2c230', 2));
  s.push(text(x + 36, y + 19, 'NECKARBRÜCKE', { size: 8.4, fill: INK, weight: 700 }));
  s.push(inked(`M${x - 4} ${y + 30}h60v14h-60z`, '#f4efe4', 1.6));
  s.push(text(x + 26, y + 40.5, 'Wald 4 km', { size: 8, fill: '#2a6a3a', weight: 700 }));
  return s.join('');
}

/** The neighbour's wall on the left, with the stairs down to the Picasso. */
function neighbour(): string {
  const s: string[] = [];
  const { x, y, w, h } = EP.cellar;
  s.push(inked(poly([[-4, 34], [178, 58], [178, EP.ground], [-4, EP.ground]]), '#6c4a70', 3));
  s.push(path(poly([[-4, 34], [178, 58], [178, 70], [-4, 46]]), { fill: '#3a2850' }));
  const r = rng(5);
  for (let yy = 80; yy < EP.ground; yy += 13) {
    s.push(line([0, yy], [176, yy + 2], '#4a3254', 1, 0.7));
    for (let xx = ((yy / 13) % 2) * 14 + r() * 6; xx < 176; xx += 28) s.push(line([xx, yy], [xx, yy + 13], '#4a3254', 1, 0.6));
  }
  // A dark window with a drawn curtain.
  s.push(rect(22, 84, 44, 60, { fill: DARK_PANE, stroke: INK, sw: 2.4 }));
  s.push(path('M44 84V144M22 110H66', { stroke: '#5a5078', sw: 1.6 }));
  // The cellar stairs: an arch, steps going down into the dark, a railing.
  s.push(inked(`M${x} ${y + h}V${y + 26}Q${x + w / 2} ${y - 16} ${x + w} ${y + 26}V${y + h}Z`, '#1a1028', 2.6));
  for (let k = 0; k < 5; k++) s.push(path(`M${x + 6 + k * 3} ${y + h - 6 - k * 13}H${x + w - 6 - k * 3}`, { stroke: '#5a3a6a', sw: 3, opacity: 0.9 - k * 0.15 }));
  s.push(glow('epCellar', x + w / 2, y + 50, 46, '#ff5ab4', 0.5, 40));
  s.push(path(`M${x - 8} ${y + h}V${y + 58}H${x + 6}M${x + w + 8} ${y + h}V${y + 58}H${x + w - 6}`, { stroke: INK, sw: 4 }));
  s.push(path(`M${x - 8} ${y + h}V${y + 58}H${x + 6}M${x + w + 8} ${y + h}V${y + 58}H${x + w - 6}`, { stroke: '#8a8a9a', sw: 1.6 }));
  // The neon sign and its arrow.
  s.push(glow('epNeon', x + w / 2, y - 26, 70, '#ff5ab4', 0.55, 28));
  s.push(text(x + w / 2, y - 20, 'Picasso', { size: 24, fill: '#ffe6f4', stroke: '#ff3aa0', sw: 3.4, family: "'Brush Script MT', 'Segoe Script', cursive", weight: 700, rotate: -4 }));
  s.push(path(`M${x + w / 2 - 9} ${y - 8}h18l-9 11z`, { fill: '#ffe6f4', stroke: '#ff3aa0', sw: 2 }));
  return s.join('');
}

function window(cx: number, y: number, w: number, h: number, kind: 'lit' | 'dark' | 'poster', seed: number): string {
  const s: string[] = [];
  const x = cx - w / 2;
  s.push(inked(wobble([[x - 5, y - 6], [x + w + 5, y - 6], [x + w + 4, y + h + 5], [x - 4, y + h + 5]], { seed, wobble: 1 }), '#e8dcc8', 2.2));
  if (kind === 'lit') s.push(rect(x - 12, y - 12, w + 24, h + 24, { fill: LIT, opacity: 0.16 }, 10));
  s.push(rect(x, y, w, h, { fill: kind === 'lit' ? LIT : DARK_PANE, stroke: INK, sw: 2 }));
  s.push(path(`M${cx} ${y}V${y + h}M${x} ${y + h * 0.4}H${x + w}`, { stroke: kind === 'lit' ? '#a8742a' : '#5a5078', sw: 1.8 }));
  if (kind === 'lit') s.push(path(`M${x + 6} ${y + h}v-18q6 -8 12 0v18z`, { fill: '#7a4a2a', opacity: 0.8 }));
  if (kind === 'poster') {
    const r = rng(seed);
    for (let i = 0; i < 3; i++) {
      const px = x + 2 + r() * (w - 20);
      const py = y + 3 + r() * (h - 26);
      s.push(`<g transform="rotate(${(r() - 0.5) * 16} ${px + 9} ${py + 11})">` + rect(px, py, 18, 22, { fill: SPRAY[Math.floor(r() * 6)], stroke: INK, sw: 1.2 }) + path(`M${px + 3} ${py + 6}h12M${px + 3} ${py + 11}h9M${px + 3} ${py + 16}h11`, { stroke: INK, sw: 1.4 }) + `</g>`);
    }
  }
  return s.join('');
}

/** Spray paint up to where an arm (or a ladder) reaches. */
function graffiti(): string {
  const s: string[] = [];
  const r = rng(77);
  const piece = (x: number, y: number, str: string, size: number, fill: string, rot: number, sw = 5) =>
    text(x, y, str, { size, fill, stroke: INK, sw, rotate: rot, anchor: 'middle' });
  // Colour fields behind the big pieces.
  s.push(path(puff(300, 268, 96, 30, 9, 3, 0.16), { fill: '#3a2a7a', opacity: 0.85 }));
  s.push(path(puff(646, 180, 70, 22, 8, 5, 0.16), { fill: '#7a2a5a', opacity: 0.8 }));
  s.push(path(puff(590, 276, 60, 22, 7, 7, 0.16), { fill: '#1e5a5a', opacity: 0.8 }));
  s.push(piece(300, 282, 'EPPLE', 42, '#ff4a8a', -4));
  s.push(path('M222 262q8 -5 16 0M352 256q8 -5 16 0', { stroke: '#ffffff', sw: 2.4, opacity: 0.9 }));
  s.push(piece(646, 190, 'ÄKTSCHN', 24, '#ffd34a', 3, 4));
  s.push(piece(590, 286, '1972', 28, '#4ae8ff', -3, 4));
  s.push(piece(300, 186, 'KEIN BASS IST ILLEGAL', 10.5, '#ffffff', -1, 3));
  s.push(piece(706, 296, 'A', 24, '#ff7a2a', 8, 3) + circle(706, 288, 13, { stroke: '#ff7a2a', sw: 3 }));
  // A stencilled pigeon, a heart, stars, arrows.
  s.push(path('M214 216q10 -14 26 -8q6 -8 14 -6l-6 8q10 6 4 18q-8 12 -26 8l-12 8l2 -12q-8 -6 -2 -16z', { fill: '#ffffff', stroke: INK, sw: 2 }));
  s.push(circle(248, 207, 1.6, { fill: INK }));
  s.push(path('M400 250q-10 -12 0 -16q6 -2 8 5q2 -7 8 -5q10 4 0 16l-8 8z', { fill: '#ff4a8a', stroke: INK, sw: 2 }));
  for (const [x, y, c] of [[392, 196, '#ffd34a'], [540, 262, '#8aff5a'], [756, 232, '#4ae8ff'], [204, 290, '#ffd34a']] as Array<[number, number, string]>) {
    s.push(path(`M${x} ${y - 8}l2.4 5.4l5.8 0.6l-4.4 4l1.3 5.8l-5.1 -3l-5.1 3l1.3 -5.8l-4.4 -4l5.8 -0.6z`, { fill: c, stroke: INK, sw: 1.4 }));
  }
  // Tags: quick scribbles, wherever there was room.
  for (let i = 0; i < 46; i++) {
    const x = EP.x0 + 8 + r() * (EP.x1 - EP.x0 - 40);
    const y = 176 + r() * 122;
    if (x > EP.door.x - 26 && x < EP.door.x + EP.door.w + 6) continue;
    const c = SPRAY[Math.floor(r() * SPRAY.length)];
    const d = `M${x} ${y}q${4 + r() * 6} ${-10 - r() * 6} ${9 + r() * 5} ${-1}t${6 + r() * 6} ${2 - r() * 6}q${3} ${5} ${-4 - r() * 8} ${4}`;
    s.push(path(d, { stroke: c, sw: 1.8 + r() * 1.4, opacity: 0.9 }));
    if (r() < 0.3) s.push(path(`M${x + 6} ${y}v${6 + r() * 12}`, { stroke: c, sw: 1.4, opacity: 0.7 }));
  }
  return s.join('');
}

/** A pigeon sitting somewhere, seen small (decoration; the live ones are actors). */
function roostingPigeon(x: number, y: number, flip: boolean): string {
  const k = flip ? -1 : 1;
  return (
    ellipse(x, y - 5, 6.5, 4.6, { fill: '#8a8a9c', stroke: INK, sw: 1.2 }) +
    circle(x + 5.4 * k, y - 10, 3, { fill: '#6a7a8a', stroke: INK, sw: 1.2 }) +
    path(`M${x + 8 * k} ${y - 10}l${3.4 * k} 1l${-3.4 * k} 1z`, { fill: '#f0b040', stroke: INK, sw: 0.8 }) +
    path(`M${x - 6 * k} ${y - 5}l${-6 * k} 3l${5 * k} 1z`, { fill: '#5a5a6c', stroke: INK, sw: 1 })
  );
}

function house(): string {
  const s: string[] = [];
  const { x0, x1, eaves, ground, door } = EP;
  // Roof: a hip roof with a chimney, pigeons along the ridge.
  s.push(inked('M610 22V-6h26v32z', '#7a4a52', 2.4));
  s.push(inked(poly([[x0 - 22, eaves + 2], [x0 + 46, 14], [x1 - 46, 14], [x1 + 22, eaves + 2]]), '#6a3a48', 3));
  s.push(path(poly([[x1 - 180, 14], [x1 - 46, 14], [x1 + 22, eaves + 2], [x1 - 150, eaves + 2]]), { fill: '#1e1038', opacity: 0.25 }));
  for (let k = 1; k < 5; k++) s.push(line([x0 - 22 + k * 14, eaves + 2 - k * 12], [x1 + 22 - k * 14, eaves + 2 - k * 12], '#3a2030', 1.4, 0.6));
  s.push(line([x0 - 22, eaves + 2], [x0 + 46, 14], '#ff9a5a', 2.4, 0.8));
  for (const [x, f] of [[300, false], [318, true], [420, false], [520, true], [540, true], [690, false]] as Array<[number, boolean]>) s.push(roostingPigeon(x, 14, f));
  // The wall, warm on the left where the sun still reaches it.
  s.push(inked(wobble([[x0, eaves], [x1, eaves], [x1, ground], [x0, ground]], { seed: 9, wobble: 1.4 }), 'url(#epWall)', 3));
  s.push(path(poly([[x0, eaves], [x0 + 70, eaves], [x0 + 70, ground], [x0, ground]]), { fill: '#ffb45a', opacity: 0.28 }));
  s.push(path(poly([[x1 - 150, eaves], [x1, eaves], [x1, ground], [x1 - 150, ground]]), { fill: '#3a2058', opacity: 0.2 }));
  s.push(inked(poly([[x0 - 8, eaves - 4], [x1 + 8, eaves - 4], [x1 + 6, eaves + 8], [x0 - 6, eaves + 8]]), '#e8dcc8', 2.4));
  s.push(path(`M${x0} 168H${x1}`, { stroke: '#b89a8a', sw: 3 }));
  s.push(graffiti());
  s.push(inked(poly([[x0 - 4, ground - 18], [x1 + 4, ground - 18], [x1 + 4, ground], [x0 - 4, ground]]), '#6a5a70', 2.4, 'opacity="0.55"'));
  // Windows: upstairs five, downstairs two either side of the door.
  const up: Array<[number, 'lit' | 'dark' | 'poster']> = [[250, 'dark'], [345, 'lit'], [480, 'dark'], [615, 'lit'], [710, 'poster']];
  up.forEach(([cx, kind], i) => s.push(window(cx, 92, 44, 58, kind, 20 + i)));
  for (const [x, f] of [[236, false], [352, true], [704, false]] as Array<[number, boolean]>) s.push(roostingPigeon(x, 86, f));
  const down: Array<[number, 'lit' | 'dark' | 'poster']> = [[250, 'poster'], [345, 'dark'], [615, 'dark'], [710, 'lit']];
  down.forEach(([cx, kind], i) => s.push(window(cx, 204, 40, 50, kind, 40 + i)));
  // The bedsheet banner over the door.
  s.push(inked(wobble([[392, 152], [568, 150], [566, 184], [394, 186]], { seed: 3, wobble: 2 }), '#f4efe4', 2.4));
  s.push(text(480, 177, 'EPPLEHAUS', { size: 23, fill: INK, spacing: 1 }));
  s.push(path('M402 160l3 6l6 1l-4.6 4l1.2 6l-5.6 -3l-5.6 3', { stroke: '#d83a2a', sw: 2 }));
  s.push(path('M392 152L384 140M568 150L576 138', { stroke: INK, sw: 1.6 }));
  // The door: stickers, posters, a warm crack of light; three steps.
  s.push(inked(poly([[door.x - 10, door.y - 10], [door.x + door.w + 10, door.y - 10], [door.x + door.w + 8, ground], [door.x - 8, ground]]), '#e8dcc8', 2.6));
  s.push(rect(door.x, door.y, door.w, door.h, { fill: '#2f5a6a', stroke: INK, sw: 2.6 }));
  s.push(path(`M${door.x + door.w / 2} ${door.y}V${door.y + door.h}`, { stroke: INK, sw: 2 }));
  s.push(path(`M${door.x + door.w / 2 - 1} ${door.y + 4}V${door.y + door.h}`, { stroke: LIT, sw: 2, opacity: 0.8 }));
  s.push(rect(door.x + 6, door.y + 8, 28, 30, { fill: DARK_PANE, stroke: INK, sw: 1.6 }) + rect(door.x + 46, door.y + 8, 28, 30, { fill: LIT, stroke: INK, sw: 1.6 }));
  const r = rng(51);
  for (let i = 0; i < 9; i++) {
    const px = door.x + 5 + r() * (door.w - 24);
    const py = door.y + 44 + r() * (door.h - 62);
    s.push(`<g transform="rotate(${(r() - 0.5) * 30} ${px + 7} ${py + 5})">` + rect(px, py, 10 + r() * 8, 7 + r() * 6, { fill: SPRAY[Math.floor(r() * SPRAY.length)], stroke: INK, sw: 1 }, 1.5) + `</g>`);
  }
  s.push(circle(door.x + door.w / 2 - 7, door.y + 62, 2.4, { fill: '#e8c860', stroke: INK, sw: 1 }) + circle(door.x + door.w / 2 + 7, door.y + 62, 2.4, { fill: '#e8c860', stroke: INK, sw: 1 }));
  for (let k = 0; k < 3; k++) s.push(inked(poly([[door.x - 12 - k * 8, ground - 6 + k * 6], [door.x + door.w + 12 + k * 8, ground - 6 + k * 6], [door.x + door.w + 14 + k * 8, ground + k * 6], [door.x - 14 - k * 8, ground + k * 6]]), k % 2 ? '#a89aa4' : '#c0b0b4', 2));
  // A string of coloured bulbs from the corner to the signpost.
  const sag = (t: number): Pt => [x1 + (EP.sign.x - x1) * t, 108 + 90 * t + Math.sin(t * Math.PI) * 26 - 0];
  let d = `M${x1} 108`;
  for (let i = 1; i <= 10; i++) d += `L${sag(i / 10)[0]} ${sag(i / 10)[1]}`;
  s.push(path(d, { stroke: INK, sw: 1.4 }));
  for (let i = 1; i < 10; i++) {
    const [bx, by] = sag(i / 10);
    const c = SPRAY[i % 6];
    s.push(circle(bx, by + 4, 8, { fill: c, opacity: 0.25 }) + circle(bx, by + 4, 3, { fill: c, stroke: INK, sw: 1 }));
  }
  return s.join('');
}

function ground(): string {
  const s: string[] = [];
  s.push(rect(-4, EP.ground, 968, 150, { fill: 'url(#epGround)' }));
  s.push(path(`M-4 ${EP.ground}H964`, { stroke: INK, sw: 2.4 }));
  // Cobbles, bigger towards us.
  for (let row = 0, y = EP.ground + 10; y < 452; row++, y += 9 + row * 1.6) {
    const w = 22 + row * 3.4;
    for (let x = -w + (row % 2) * (w / 2); x < 964; x += w) s.push(path(`M${x} ${y}q${w / 2} ${-4 - row * 0.5} ${w} 0`, { stroke: '#3a2a52', sw: 1.2, opacity: 0.5 }));
  }
  // Light from the door, the lit window, the cellar's neon.
  s.push(glow('epDoorPool', EP.door.x + EP.door.w / 2, 336, 110, LIT, 0.3, 30));
  s.push(glow('epNeonPool', 86, 324, 90, '#ff5ab4', 0.3, 26));
  // Crumbs and bottle caps the pigeons are after.
  const r = rng(23);
  for (let i = 0; i < 26; i++) s.push(circle(40 + r() * 880, 344 + r() * 96, 1 + r(), { fill: r() < 0.5 ? '#e8d8a8' : '#c8a060', opacity: 0.8 }));
  return s.join('');
}

function bikes(): string {
  const { x, y } = EP.bikes;
  const s: string[] = [];
  const bike = (bx: number, col: string, lean: number) => {
    const by = y + 48;
    const b: string[] = [];
    for (const wx of [0, 62]) b.push(circle(bx + wx, by, 20, { stroke: INK, sw: 4 }) + circle(bx + wx, by, 20, { stroke: '#6a6a7a', sw: 1.6 }) + circle(bx + wx, by, 2.4, { fill: INK }));
    const frame = `M${bx} ${by}L${bx + 22} ${by - 28}H${bx + 50}L${bx + 62} ${by}M${bx + 22} ${by - 28}L${bx + 32} ${by}H${bx}M${bx + 32} ${by}L${bx + 50} ${by - 28}M${bx + 48} ${by - 28}L${bx + 46} ${by - 40}h10M${bx + 22} ${by - 28}l-3 -8h-8h14`;
    b.push(path(frame, { stroke: INK, sw: 5 }) + path(frame, { stroke: col, sw: 2.4 }));
    return group(b, `rotate(${lean} ${bx + 30} ${by + 20})`);
  };
  // The rack, then two bikes leaning in it.
  s.push(path(`M${x} ${y + 68}h${EP.bikes.w}`, { stroke: INK, sw: 5 }) + path(`M${x} ${y + 68}h${EP.bikes.w}`, { stroke: '#8a8a9a', sw: 2 }));
  for (let k = 0; k < 5; k++) s.push(path(`M${x + 12 + k * 40} ${y + 68}v-26q8 -8 16 0v26`, { stroke: INK, sw: 4 }) + path(`M${x + 12 + k * 40} ${y + 68}v-26q8 -8 16 0v26`, { stroke: '#8a8a9a', sw: 1.6 }));
  s.push(bike(x + 22, '#d8402a', -3));
  s.push(bike(x + 104, '#3aa8c8', 4));
  return s.join('');
}

/** The bottle banks: Grünglas, Weißglas, Braunglas. */
function bottleBanks(): string {
  const { x, y, w, h } = EP.banks;
  const s: string[] = [];
  const bw = w / 3;
  (['#3a8a4a', '#e2ddd0', '#8a5a2a'] as const).forEach((c, i) => {
    const bx = x + i * bw;
    s.push(inked(`M${bx + 2} ${y + h}V${y + 22}Q${bx + bw / 2} ${y - 6} ${bx + bw - 2} ${y + 22}V${y + h}Z`, c, 2.4));
    s.push(path(`M${bx + bw - 12} ${y + 14}Q${bx + bw - 3} ${y + 20} ${bx + bw - 3} ${y + 30}V${y + h}H${bx + bw - 12}Z`, { fill: '#1e1038', opacity: 0.22 }));
    s.push(circle(bx + bw / 2, y + 34, 6.5, { fill: '#1a1028', stroke: INK, sw: 1.6 }));
    s.push(rect(bx + 7, y + 48, bw - 14, 12, { fill: '#f4efe4', stroke: INK, sw: 1 }));
    s.push(text(bx + bw / 2, y + 57, ['GRÜN', 'WEISS', 'BRAUN'][i], { size: 6.4, fill: INK, weight: 700 }));
  });
  // Bottles that didn't fit, lined up beside them — Pfand gehört daneben.
  for (const [bx, c] of [[x - 12, '#3a8a4a'], [x - 4, '#8a5a2a']] as Array<[number, string]>) s.push(inked(`M${bx} ${y + h}v-13q0 -3 2 -5v-6h3v6q2 2 2 5v13z`, c, 1.2));
  return s.join('');
}

/** Flaschenfloh's shopping trolley, piled with bags of empties. */
function trolley(): string {
  const { x, y, w, h } = EP.trolley;
  const s: string[] = [];
  // Bags and bottle necks, poking out of the basket.
  s.push(inked(`M${x + 8} ${y + 14}q4 -16 22 -12q14 -8 26 4q10 2 8 10z`, '#3a6ad8', 2));
  s.push(path(`M${x + 20} ${y + 6}q6 4 4 10M${x + 44} ${y + 4}q-4 6 0 12`, { stroke: '#243a8a', sw: 1.4 }));
  for (const [bx, c] of [[x + 14, '#3a8a4a'], [x + 30, '#8a5a2a'], [x + 40, '#3a8a4a'], [x + 54, '#d8e8e4']] as Array<[number, string]>) s.push(inked(`M${bx} ${y + 6}v-12h4v12z`, c, 1.2));
  // The basket, its handle and wheels.
  s.push(inked(poly([[x + 4, y + 12], [x + w - 4, y + 12], [x + w - 12, y + h - 12], [x + 12, y + h - 12]]), '#b8b8c8', 2.2, 'fill-opacity="0.35"'));
  for (let k = 1; k < 6; k++) s.push(line([x + 4 + k * ((w - 8) / 6), y + 12], [x + 12 + k * ((w - 24) / 6), y + h - 12], '#e8e8f0', 1.2));
  for (let k = 1; k < 3; k++) s.push(line([x + 4 + k * 2.6, y + 12 + k * 9.3], [x + w - 4 - k * 2.6, y + 12 + k * 9.3], '#e8e8f0', 1.2));
  s.push(path(`M${x + w - 4} ${y + 12}l10 -8h6`, { stroke: INK, sw: 4 }) + path(`M${x + w - 4} ${y + 12}l10 -8h6`, { stroke: '#d83a2a', sw: 1.8 }));
  s.push(path(`M${x + 12} ${y + h - 12}v6h${w - 24}v-6`, { stroke: INK, sw: 2 }));
  for (const wx of [x + 16, x + w - 16]) s.push(circle(wx, y + h - 3, 4, { fill: '#2a2a3a', stroke: INK, sw: 1.4 }));
  return s.join('');
}

export function epplehausBg(): string {
  return [
    defs(
      grainDefs(67),
      linear('epSky', 0, 0, 0, 300, [
        [0, '#34347c'],
        [0.3, '#7c4a94'],
        [0.6, '#e2607a'],
        [0.85, '#ff9a52'],
        [1, '#ffe08a'],
      ]),
      linear('epWall', 0, EP.eaves, 0, EP.ground, [
        [0, '#e8c8a8'],
        [1, '#c89a94'],
      ]),
      linear('epGround', 0, EP.ground, 0, 450, [
        [0, '#9a7488'],
        [1, '#4c3c6c'],
      ]),
      linear('epDusk', 0, 250, 0, 450, [
        [0, '#2a1a50', 0],
        [1, '#2a1a50', 0.28],
      ])
    ),
    sky(),
    street(),
    neighbour(),
    house(),
    ground(),
    bikes(),
    bottleBanks(),
    trolley(),
    rect(0, 0, 960, 450, { fill: '#ff7a3a', opacity: 0.07 }),
    rect(0, 250, 960, 200, { fill: 'url(#epDusk)' }),
    vignette('epVig', 960, 450, 0.4, '#241040'),
    grainOverlay(960, 450, 0.3, 0.22),
  ].join('');
}

// ---- the pigeons -------------------------------------------------------------------

/** Frame of a pigeon: 40×32, feet at the bottom centre, facing right. */
const PW = 40;
const PH = 32;

interface Plumage {
  body: string;
  wing: string;
  head: string;
  neck: string;
}

function pigeonFrame(c: Plumage, o: { peck: number; step: number; bob: number }): string {
  const s: string[] = [];
  const gy = 30;
  // Legs: two pink sticks, alternating.
  const legs: Array<[number, number]> = o.step ? [[17 - o.step * 3, 0], [21 + o.step * 3, -1.5]] : [[17, 0], [21, 0]];
  for (const [lx, lift] of legs) {
    s.push(path(`M${lx} ${gy - 9}L${lx} ${gy + lift}h4`, { stroke: INK, sw: 2.4 }));
    s.push(path(`M${lx} ${gy - 9}L${lx} ${gy + lift}h4`, { stroke: '#f08a8a', sw: 1.1 }));
  }
  // Tail, body, folded wing.
  s.push(path('M9 18L1 23L8 25Z', { fill: c.wing, stroke: INK, sw: 1.4 }));
  s.push(ellipse(17, 18, 10.5, 7.2, { fill: c.body, stroke: INK, sw: 1.6 }));
  s.push(path('M9 17Q16 10 25 17Q18 23 9 21Z', { fill: c.wing, stroke: INK, sw: 1.2 }));
  s.push(path('M12 19h9M13 16.6h7', { stroke: INK, sw: 0.8, opacity: 0.6 }));
  // Neck and head: up, or down pecking.
  const hx = 27 + o.bob + o.peck * 3;
  const hy = 9 + o.peck * 13;
  s.push(path(`M22 13Q${(22 + hx) / 2 + 2} ${(13 + hy) / 2 - 2} ${hx - 2} ${hy + 2}L${hx + 2} ${hy + 3}Q${(26 + hx) / 2 + 3} ${(18 + hy) / 2 + 2} 26 19Z`, { fill: c.neck, stroke: INK, sw: 1.4 }));
  s.push(circle(hx, hy, 4.2, { fill: c.head, stroke: INK, sw: 1.5 }));
  const down = o.peck > 0.5;
  s.push(path(down ? `M${hx + 2} ${hy + 3}l3 5l-5 -2z` : `M${hx + 3.6} ${hy - 0.6}l4.6 1.4l-4.6 1.6z`, { fill: '#f0b040', stroke: INK, sw: 0.9 }));
  s.push(circle(hx + 1.2, hy - 0.8, 1.3, { fill: '#ff8a3a', stroke: INK, sw: 0.7 }) + circle(hx + 1.4, hy - 0.8, 0.5, { fill: INK }));
  return s.join('');
}

function pigeonDraw(c: Plumage) {
  return (_variant: ActorVariant, pose: string, f: number): string => {
    if (pose === 'walk') return pigeonFrame(c, { peck: 0, step: [1, 0, -1, 0][f % 4], bob: [2, 0, -1.5, 0][f % 4] });
    if (pose === 'talk') return pigeonFrame(c, { peck: 0, step: 0, bob: f % 2 ? 1.5 : 0 });
    // idle: look about, then peck twice.
    return pigeonFrame(c, { peck: [0, 0, 0, 0.5, 1, 0.4, 1, 0.3][f % 8], step: 0, bob: f === 1 ? 1 : 0 });
  };
}

const PIGEON_POSES = {
  idle: { frames: 8, frameRate: 6 },
  walk: { frames: 4, frameRate: 10 },
  talk: { frames: 2, frameRate: 6 },
};

/** Two plumages: the grey city pigeon, and a piebald one. */
export const PIGEON_ACTORS: SvgActorAsset[] = [
  { key: 'taube', width: PW, height: PH, poses: PIGEON_POSES, draw: pigeonDraw({ body: '#9a9aae', wing: '#6e6e86', head: '#5a6a80', neck: '#4a9a8a' }) },
  { key: 'taube2', width: PW, height: PH, poses: PIGEON_POSES, draw: pigeonDraw({ body: '#e8e2da', wing: '#a87a5a', head: '#8a5a4a', neck: '#b06a9a' }) },
];
