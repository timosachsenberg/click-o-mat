import type { SvgImageAsset } from '../../engine/types';
import { INK, blob, circle, ellipse, group, path, rect, text, type Pt } from './toon';

/** Inventory icons (64×48), inked and cel-shaded like the rest of the cast. */

const W = 64;
const H = 48;
/** Soft contact shadow so icons sit in their slot instead of floating. */
const shadow = (cx: number, rx: number) => ellipse(cx, 42, rx, 3.2, { fill: '#000000', opacity: 0.28 });

function battery(): string {
  return [
    shadow(32, 20),
    group(
      [
        rect(-17, -10, 32, 20, { fill: '#e8c23a', stroke: INK, sw: 2.4 }, 3),
        rect(-17, 2, 32, 8, { fill: '#c9a024' }, 2),
        rect(-17, -10, 11, 20, { fill: '#2b2a36' }, 3),
        rect(-17, -10, 32, 20, { stroke: INK, sw: 2.4 }, 3),
        rect(15, -5, 5, 10, { fill: '#b8bcc8', stroke: INK, sw: 2 }, 1.5),
        path('M-12 -6L-12 6', { stroke: '#ffffff', sw: 1.6, opacity: 0.5 }),
        text(4.5, 4.5, '9V', { size: 11, fill: '#3a2a10' }),
        path('M-2 -7.5L12 -7.5', { stroke: '#fff6c8', sw: 1.5, opacity: 0.8 }),
      ],
      'translate(30 26) rotate(-8)'
    ),
  ].join('');
}

function key(): string {
  const bit: Pt[] = [
    [8, -2.5],
    [26, -2.5],
    [26, 7],
    [22, 7],
    [22, 3],
    [18, 3],
    [18, 6],
    [14, 6],
    [14, 2.5],
    [8, 2.5],
  ];
  return [
    shadow(32, 22),
    group(
      [
        path('M' + bit.map((p) => p.join(' ')).join('L') + 'Z', { fill: '#e9c45a', stroke: INK, sw: 2.2 }),
        circle(0, 0, 9.5, { fill: '#e9c45a', stroke: INK, sw: 2.4 }),
        circle(0, 0, 4, { fill: '#5b4426', stroke: INK, sw: 1.8 }),
        path('M-6 -5A7.5 7.5 0 0 1 3 -7', { stroke: '#fff3c4', sw: 1.8 }),
        path('M10 -1L24 -1', { stroke: '#fff3c4', sw: 1.2, opacity: 0.8 }),
      ],
      'translate(19 24) rotate(-14)'
    ),
  ].join('');
}

function hamster(glowing: boolean): string {
  const fur = glowing ? '#bfe86a' : '#c98a4a';
  const shade = glowing ? '#8cc040' : '#9c6232';
  const belly = glowing ? '#effcc8' : '#f1d9b4';
  const body: Pt[] = [
    [14, 30],
    [17, 18],
    [27, 11],
    [40, 11],
    [50, 17],
    [53, 28],
    [48, 37],
    [32, 40],
    [18, 38],
  ];
  const s: string[] = [];
  if (glowing) {
    s.push(`<defs><radialGradient id="hglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#d8ff7a" stop-opacity="0.8"/><stop offset="1" stop-color="#9cff4a" stop-opacity="0"/></radialGradient></defs>`);
    s.push(ellipse(33, 26, 31, 22, { fill: 'url(#hglow)' }));
  }
  s.push(shadow(33, 19));
  s.push(`<defs><clipPath id="hb"><path d="${blob(body)}"/></clipPath></defs>`);
  s.push(path(blob(body), { fill: fur }));
  s.push(group(ellipse(46, 34, 14, 14, { fill: shade }), undefined, 'clip-path="url(#hb)"'));
  s.push(path(blob(body), { stroke: INK, sw: 2.2 }));
  s.push(ellipse(34, 31, 10, 6.5, { fill: belly }));
  for (const [x, y] of [[23, 12], [35, 9]]) {
    s.push(circle(x, y, 4.2, { fill: fur, stroke: INK, sw: 2 }));
    s.push(circle(x, y + 0.5, 2, { fill: '#e8a0a0' }));
  }
  // Grumpy face: heavy lids, tiny nose, whiskers.
  s.push(ellipse(22, 21, 3, 3.3, { fill: '#ffffff', stroke: INK, sw: 1.4 }));
  s.push(circle(21.4, 21.8, 1.6, { fill: INK }));
  s.push(path('M18.8 19.6L25.2 18.6', { stroke: INK, sw: 1.8 }));
  s.push(circle(15.2, 26, 1.6, { fill: '#e07a8a', stroke: INK, sw: 1 }));
  s.push(path('M15 28M10 25L4 23M10 27.5L4 28.5', { stroke: INK, sw: 1 }));
  s.push(path('M17 30Q19 31.5 21 30', { stroke: INK, sw: 1.3 }));
  if (glowing) {
    for (const [x, y] of [[8, 10], [56, 8], [58, 30], [6, 36]]) {
      s.push(path(`M${x - 3} ${y}L${x + 3} ${y}M${x} ${y - 3}L${x} ${y + 3}`, { stroke: '#f6ffb0', sw: 1.6 }));
    }
  }
  return s.join('');
}

function canteen(): string {
  return [
    shadow(32, 17),
    path('M22 12Q14 6 18 2', { stroke: '#7a5a34', sw: 2.6 }),
    ellipse(32, 27, 16, 16, { fill: '#5f8a4a', stroke: INK, sw: 2.4 }),
    path('M24 36A14 14 0 0 0 46 31A16 16 0 0 1 24 38Z', { fill: '#456a35' }),
    ellipse(32, 27, 10.5, 10.5, { stroke: '#456a35', sw: 2 }),
    rect(21, 23, 22, 7, { fill: '#ece2c0', stroke: INK, sw: 1.6 }, 1.5),
    rect(27.5, 6, 9, 7, { fill: '#3e3a40', stroke: INK, sw: 2 }, 1.5),
    path('M23 18A11 11 0 0 1 30 13', { stroke: '#a8d090', sw: 2, opacity: 0.8 }),
  ].join('');
}

function medal(): string {
  return [
    shadow(32, 13),
    path('M24 2L30 20L34 20L28 2Z', { fill: '#c0392b', stroke: INK, sw: 1.8 }),
    path('M40 2L34 20L30 20L36 2Z', { fill: '#2e5fb8', stroke: INK, sw: 1.8 }),
    circle(32, 30, 12, { fill: '#f0c43c', stroke: INK, sw: 2.4 }),
    circle(32, 30, 8, { stroke: '#c0921c', sw: 1.8 }),
    path('M32 24.5L33.6 28.2L37.5 28.4L34.5 30.9L35.5 34.8L32 32.6L28.5 34.8L29.5 30.9L26.5 28.4L30.4 28.2Z', { fill: '#fff2b0', stroke: '#a77c12', sw: 1 }),
    path('M24 24A10 10 0 0 1 30 19.5', { stroke: '#fff6d0', sw: 1.8, opacity: 0.9 }),
  ].join('');
}

export const ICONS: SvgImageAsset[] = [
  { key: 'icon-battery', width: W, height: H, svg: battery() },
  { key: 'icon-key', width: W, height: H, svg: key() },
  { key: 'icon-hamster', width: W, height: H, svg: hamster(false) },
  { key: 'icon-glowhamster', width: W, height: H, svg: hamster(true) },
  { key: 'icon-canteen', width: W, height: H, svg: canteen() },
  { key: 'icon-medal', width: W, height: H, svg: medal() },
];
