import type { ActorDef } from '../engine/types';

export const ACTORS: Record<string, ActorDef> = {
  player: {
    id: 'player',
    name: 'Ich',
    talkColor: '#ffd38a',
    textureSet: 'raver',
    speed: 240,
  },
  ali: {
    id: 'ali',
    name: 'Ali',
    talkColor: '#9fd6ff',
    textureSet: 'ali',
    // Polishing a glass whenever he isn't talking.
    stance: () => 'polish',
  },
  hilde: {
    id: 'hilde',
    name: 'Wilde Hilde',
    talkColor: '#ffb0d8',
    textureSet: 'hilde',
    // Always dancing, music or not.
    stance: () => 'dance',
  },
  cop: {
    id: 'cop',
    name: 'Partykiller',
    talkColor: '#9be89b',
    textureSet: 'cop',
    // His frames carry extra room above the cap (snoring z's).
    headroom: 12,
    // Seated and watchful (idle), until the Magic Woman knocks him out.
    stance: (state) => (state.getFlag('copAsleep') ? 'sleep' : undefined),
  },
  kahn: {
    id: 'kahn',
    name: 'Stocherkahn',
    talkColor: '#c8f09a',
    textureSet: 'punt',
    // Drawn small for crisp downscaling into the distance; big up close.
    baseScale: 1.3,
    // The poler's cap sits a little below the frame top.
    headroom: 14,
    stance: (state) => (state.getFlag('puntSunk') ? 'gone' : undefined),
  },
  floh: {
    id: 'floh',
    name: 'Flaschenfloh',
    talkColor: '#c4ec7a',
    textureSet: 'floh',
  },
  otto: {
    id: 'otto',
    name: 'Otto R.',
    talkColor: '#55ffff',
    textureSet: 'otto',
    speed: 150,
    // Otto lives in the pixel layer only (turmEra 1) — until he's out.
    stance: (state) => ((state.getFlag<number>('turmEra') ?? 0) !== 1 || state.getFlag('ottoFree') ? 'gone' : undefined),
  },
  // Otto R.'s voice on the tower's intercom, out on the promenade: never seen.
  ottoTuer: {
    id: 'ottoTuer',
    name: 'Otto R.',
    talkColor: '#55ffff',
    textureSet: 'otto',
    stance: () => 'gone',
  },
  // The Put-Put pigeon at the tower's door (the Epplehaus pigeon, on loan).
  taubeTuer: { id: 'taubeTuer', name: 'Put-Put-Taube', talkColor: '#d8d8ea', textureSet: 'taube2', baseScale: 0.9 },
  // The pigeons in front of the Epplehaus: eight of them, two plumages.
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].map((n): [string, ActorDef] => [
      `taube${n}`,
      { id: `taube${n}`, name: 'Taube', talkColor: '#d8d8ea', textureSet: n % 3 === 0 ? 'taube2' : 'taube', speed: 90, baseScale: 0.9 },
    ])
  ),
};
