import type { SvgImageAsset } from '../../engine/types';
import { INK, circle, ellipse, group, path, rect, text } from '../../game/art/toon';

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
        rect(-6.5, -3, 13, 6, { fill: '#2a6ac0', opacity: 0.85 }),
        text(0, 2, 'ALI', { size: 5, fill: '#ffffff' }),
      ],
      'translate(32 24)'
    ),
  ].join('');
}

export const GOA_ICONS: SvgImageAsset[] = [
  { key: 'icon-dose', width: 64, height: 48, svg: emptyCan() },
  { key: 'icon-cent25', width: 64, height: 48, svg: cent25() },
  { key: 'icon-ouzo', width: 64, height: 48, svg: ouzo() },
  { key: 'icon-euro', width: 64, height: 48, svg: euro() },
  { key: 'icon-magicwoman', width: 64, height: 48, svg: magicWoman() },
];
