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
  cop: {
    id: 'cop',
    name: 'Partykiller',
    talkColor: '#9be89b',
    textureSet: 'cop',
    // Seated and watchful (idle), until the Magic Woman knocks him out.
    stance: (state) => (state.getFlag('copAsleep') ? 'sleep' : undefined),
  },
};
