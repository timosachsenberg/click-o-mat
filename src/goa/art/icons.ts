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

export const GOA_ICONS: SvgImageAsset[] = [
  { key: 'icon-euro', width: 64, height: 48, svg: euro() },
  { key: 'icon-magicwoman', width: 64, height: 48, svg: magicWoman() },
];
