import type { SvgImageAsset } from '../../engine/types';
import { INK, circle, ellipse, group, path, rect, text } from '../../game/art/toon';
import { miniSpiral } from './turm';

/** Inventory icons (64×48), in the demo's inked, cel-shaded style. */

const shadow = (cx: number, rx: number) => ellipse(cx, 42, rx, 3.2, { fill: '#000000', opacity: 0.28 });

/** The two-euro coin: silver ring, golden core, a big friendly 2. */
function euro(): string {
  return [
    shadow(32, 17),
    group(
      [
        circle(0, 0, 17, { fill: '#c9ccd4', stroke: INK, sw: 2.4 }),
        circle(0, 0, 15.5, { stroke: '#eef0f4', sw: 1.2, opacity: 0.8 }),
        circle(0, 0, 11, { fill: '#e2b84a', stroke: INK, sw: 1.8 }),
        path('M-7 -5A8.5 8.5 0 0 1 2 -9', { stroke: '#fff1b8', sw: 1.8 }),
        text(-0.5, 6.5, '2', { size: 17, fill: '#7a5a14' }),
        text(9.5, -10, '€', { size: 7, fill: '#5a5e68', weight: 700 }),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2;
          return circle(Math.cos(a) * 13.6, Math.sin(a) * 13.6, 0.9, { fill: '#8a8e98' });
        }),
      ],
      'translate(32 23) rotate(-12)'
    ),
  ].join('');
}

/** A can of Magic Woman: purple, sparkly, suspiciously cheerful. */
function magicWoman(): string {
  return [
    shadow(32, 12),
    group(
      [
        rect(-10, -19, 20, 38, { fill: '#7a3aa8', stroke: INK, sw: 2.4 }, 4),
        rect(4, -18, 5, 36, { fill: '#5a2680' }, 2),
        path('M-10 -15H10M-10 15H10', { stroke: '#c8ccd4', sw: 3 }),
        rect(-10, -19, 20, 38, { stroke: INK, sw: 2.4 }, 4),
        rect(-7, -22, 14, 4, { fill: '#c8ccd4', stroke: INK, sw: 1.6 }, 1.5),
        path('M0 -9L1.6 -5.4L5.4 -5L2.5 -2.6L3.4 1.2L0 -0.8L-3.4 1.2L-2.5 -2.6L-5.4 -5L-1.6 -5.4Z', {
          fill: '#ffd34a',
          stroke: INK,
          sw: 1,
        }),
        text(0, 7.5, 'MAGIC', { size: 5.5, fill: '#ffe6f4', spacing: 0.2 }),
        text(0, 12.5, 'WOMAN', { size: 5.5, fill: '#ff8ad0', spacing: 0.2 }),
        path('M-7 -12V10', { stroke: '#ffffff', sw: 1.6, opacity: 0.45 }),
      ],
      'translate(32 22) rotate(8)'
    ),
  ].join('');
}

/** The empty can, a little crumpled. */
function emptyCan(): string {
  return [
    shadow(32, 13),
    group(
      [
        path('M-10 -17L10 -19L11 -4L7 2L11 8L10 17L-10 18L-11 6L-7 0L-11 -6Z', { fill: '#6a3a90', stroke: INK, sw: 2.4 }),
        path('M3 -18L9 -19L10 -4L6 2L10 8L9 17L4 17Z', { fill: '#4a2468' }),
        path('M-10 -14H10M-10 14H10', { stroke: '#a8acb4', sw: 2.6 }),
        path('M-7 -1L7 1', { stroke: INK, sw: 1.4 }),
        text(0, -4, 'MAGIC', { size: 5, fill: '#ffe6f4' }),
        ellipse(0, -19, 9, 2.5, { fill: '#a8acb4', stroke: INK, sw: 1.4 }),
      ],
      'translate(32 23) rotate(-14)'
    ),
  ].join('');
}

/** The 25-cent coin (which doesn't exist — and yet, here it is). */
function cent25(): string {
  return [
    shadow(32, 13),
    group(
      [
        circle(0, 0, 13, { fill: '#d8a040', stroke: INK, sw: 2.4 }),
        circle(0, 0, 10.5, { stroke: '#a87420', sw: 1.2 }),
        path('M-6 -5A7 7 0 0 1 2 -8', { stroke: '#fff1b8', sw: 1.6 }),
        text(0, 4.5, '25', { size: 11, fill: '#6a4410' }),
        text(0, 10.5, 'CENT', { size: 4, fill: '#6a4410', weight: 700 }),
      ],
      'translate(32 24) rotate(10)'
    ),
  ].join('');
}

/** Ali's ouzo, in its little glass. */
function ouzo(): string {
  return [
    shadow(32, 10),
    group(
      [
        path('M-8 -16H8L6 16H-6Z', { fill: '#e8f4f8', stroke: INK, sw: 2.2, opacity: 0.95 }),
        path('M-7 -6H7L5.6 14H-5.6Z', { fill: '#f8f6ea' }),
        path('M-5 -13L-4 12', { stroke: '#ffffff', sw: 1.6 }),
      ],
      'translate(32 24)'
    ),
  ].join('');
}

/** The worm-eaten chair leg: turned wood, full of holes, one worm peeking out. */
function stuhlbein(): string {
  return [
    shadow(32, 22),
    group(
      [
        path('M-24 -3Q-26 -7 -22 -8L-14 -6Q-11 -9 -8 -6L18 -4Q24 -6 26 -2Q27 3 22 4L-8 6Q-11 9 -14 6L-22 8Q-26 7 -24 3Z', {
          fill: '#b07a3a',
          stroke: INK,
          sw: 2.2,
        }),
        path('M-20 -5L-14 -4M-6 -3L20 -1', { stroke: '#e0a862', sw: 1.8 }),
        path('M-8 5L20 3', { stroke: '#7a4a1e', sw: 1.6 }),
        ...[[-18, 1], [-4, -1], [3, 2], [9, -1], [15, 1], [21, 0]].map(([x, y]) => circle(x, y, 1.3, { fill: '#2a140a' })),
        path('M4 2Q6 -6 10 -7Q13 -7 13 -4', { stroke: INK, sw: 4 }),
        path('M4 2Q6 -6 10 -7Q13 -7 13 -4', { stroke: '#f0a0b8', sw: 2.4 }),
        circle(11.5, -6.2, 0.8, { fill: INK }),
      ],
      'translate(32 24) rotate(-18)'
    ),
  ].join('');
}

/** The Burschenschaftler's cap: green, with the colours round the band. */
function muetze(): string {
  return [
    shadow(32, 18),
    group(
      [
        path('M-17 6L-15 -10H15L17 6Z', { fill: '#2f7a3a', stroke: INK, sw: 2.4 }),
        path('M-16.5 2H16.5', { stroke: '#ffffff', sw: 2.4 }),
        path('M-16 -1.5H16', { stroke: '#c43a2a', sw: 2.4 }),
        path('M5 -10L14 -10L16 4L8 4Z', { fill: '#000000', opacity: 0.18 }),
        ellipse(0, -10, 15, 4, { fill: '#3e9a4a', stroke: INK, sw: 2 }),
        path('M-8 -11Q0 -14 8 -11', { stroke: '#8ad08a', sw: 1.6 }),
        path('M2 6Q16 5 20 11H2Z', { fill: '#1a1a1a', stroke: INK, sw: 1.8 }),
        path('M-12 7Q-10 12 -6 12', { stroke: '#7ad0e8', sw: 1.6, opacity: 0.8 }),
      ],
      'translate(31 25) rotate(-8)'
    ),
  ].join('');
}

/** The portable hole: a black disc, thin as a pancake, one edge curling up. */
function loch(): string {
  return [
    shadow(32, 20),
    group(
      [
        ellipse(0, 0, 21, 9, { fill: '#000000', stroke: INK, sw: 2.4 }),
        ellipse(-2, 1, 15, 5.5, { fill: '#1a0a2a' }),
        path('M10 -7Q20 -16 24 -4Q17 -2 10 -7Z', { fill: '#3a3048', stroke: INK, sw: 1.8 }),
        path('M14 -10Q19 -12 21 -8', { stroke: '#ffffff', sw: 1.4, opacity: 0.8 }),
        circle(-8, 0, 0.9, { fill: '#e8d0ff' }),
        circle(3, 2, 0.7, { fill: '#e8d0ff' }),
      ],
      'translate(30 28) rotate(-6)'
    ),
  ].join('');
}

/** The pocket attractor: the Rössler spiral on a little brass foot. */
function taschenattraktor(): string {
  return [
    shadow(32, 14),
    path('M22 41H42L39 36H25Z', { fill: '#c8964a', stroke: INK, sw: 2 }),
    path('M32 36V30', { stroke: INK, sw: 2.4 }),
    miniSpiral(),
  ].join('');
}

/** The wormhole: a black hole with the pocket attractor circling it, glowing. */
function wurmloch(): string {
  return [
    shadow(32, 20),
    ellipse(32, 24, 22, 14, { fill: '#b06aff', opacity: 0.35 }),
    ellipse(32, 24, 17, 10, { fill: '#120a24', stroke: INK, sw: 2.4 }),
    ellipse(32, 24, 11, 6, { fill: '#000000' }),
    path('M14 24Q20 10 34 13Q50 16 48 26Q46 36 30 35Q18 34 22 26Q26 19 36 21Q44 23 40 28', { stroke: '#4ae8ff', sw: 2.2 }),
    path('M16 22Q22 12 34 15', { stroke: '#ff5ab4', sw: 1.6 }),
    circle(40, 28, 1.8, { fill: '#ffd34a', stroke: INK, sw: 0.8 }),
  ].join('');
}

export const GOA_ICONS: SvgImageAsset[] = [
  { key: 'icon-loch', width: 64, height: 48, svg: loch() },
  { key: 'icon-taschenattraktor', width: 64, height: 48, svg: taschenattraktor() },
  { key: 'icon-wurmloch', width: 64, height: 48, svg: wurmloch() },
  { key: 'icon-dose', width: 64, height: 48, svg: emptyCan() },
  { key: 'icon-cent25', width: 64, height: 48, svg: cent25() },
  { key: 'icon-ouzo', width: 64, height: 48, svg: ouzo() },
  { key: 'icon-euro', width: 64, height: 48, svg: euro() },
  { key: 'icon-magicwoman', width: 64, height: 48, svg: magicWoman() },
  { key: 'icon-stuhlbein', width: 64, height: 48, svg: stuhlbein() },
  { key: 'icon-muetze', width: 64, height: 48, svg: muetze() },
];
