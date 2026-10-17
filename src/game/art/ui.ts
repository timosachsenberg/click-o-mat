import type { SvgImageAsset, UITheme } from '../../engine/types';
import { INK, defs, grainDefs, grainOverlay, linear, path, rect, rectPts, wobble } from './toon';

/**
 * The verb/inventory band in the house style: an aubergine panel with a
 * carved, gilded top edge, an inset plaque for the verbs and a tray of inset
 * slots for the inventory. Positions match the engine's built-in layout
 * (verbs at x 26..410, page arrows at x 440, slots from x 470).
 */

function panel(): string {
  const s: string[] = [];
  s.push(
    defs(
      grainDefs(5),
      linear('uiBg', 0, 0, 0, 150, [[0, '#321c38'], [1, '#1c1022']]),
      linear('uiPlaque', 0, 24, 0, 146, [[0, '#170c1c'], [1, '#22132a']])
    )
  );
  s.push(rect(0, 0, 960, 150, { fill: 'url(#uiBg)' }));
  // Carved top edge with a gold inlay
  s.push(path('M0 0H960V6Q480 9 0 6Z', { fill: '#4a2a3a' }));
  s.push(path('M0 6Q480 9 960 6', { stroke: INK, sw: 2.5 }));
  s.push(path('M0 3H960', { stroke: '#d2a43c', sw: 1.5, opacity: 0.9 }));
  // Verb plaque and inventory tray: inset, hand-cut edges
  for (const [x, y, w, h, seed] of [
    [12, 24, 400, 120, 3],
    [458, 18, 466, 128, 4],
  ]) {
    s.push(path(wobble(rectPts(x + 2, y + 3, w, h), { seed, wobble: 1 }), { fill: '#0a0410', opacity: 0.5 }));
    s.push(path(wobble(rectPts(x, y, w, h), { seed, wobble: 1 }), { fill: 'url(#uiPlaque)', stroke: INK, sw: 2.5 }));
    s.push(path(`M${x + 3} ${y + h - 2}H${x + w - 3}V${y + 3}`, { stroke: '#5a3a5e', sw: 1.6, opacity: 0.8 }));
    for (const [cx, cy] of [
      [x + 8, y + 8],
      [x + w - 8, y + 8],
      [x + 8, y + h - 8],
      [x + w - 8, y + h - 8],
    ]) {
      s.push(`<circle cx="${cx}" cy="${cy}" r="2.6" fill="#c9963a" stroke="${INK}" stroke-width="1.2"/>`);
    }
  }
  s.push(grainOverlay(960, 150, 0.3, 0.25));
  return s.join('');
}

function slot(): string {
  return [
    path(wobble(rectPts(1.5, 1.5, 101, 55), { seed: 9, wobble: 0.7 }), { fill: '#2a1832', stroke: INK, sw: 2 }),
    path('M4 52V4H100', { stroke: '#0e0612', sw: 3, opacity: 0.8 }),
    path('M5 54H100V6', { stroke: '#6a4a72', sw: 1.4, opacity: 0.7 }),
  ].join('');
}

export const UI_IMAGES: SvgImageAsset[] = [
  { key: 'ui-panel', width: 960, height: 150, svg: panel() },
  { key: 'ui-slot', width: 104, height: 58, svg: slot() },
];

export const UI_THEME: Partial<UITheme> = {
  font: "'Fredoka', 'Trebuchet MS', Verdana, sans-serif",
  panel: 'ui-panel',
  slot: 'ui-slot',
  verb: '#e2c98e',
  verbHover: '#fff27a',
  verbSelected: '#9cf07a',
  sentence: '#f4ead0',
};
