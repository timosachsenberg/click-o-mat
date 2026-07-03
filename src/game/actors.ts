import type { ActorDef } from '../engine/types';

export const ACTORS: Record<string, ActorDef> = {
  norb: {
    id: 'norb',
    name: 'Norb',
    talkColor: '#9fd6ff',
    textureSet: 'guy',
    speed: 240,
  },
  tent: {
    id: 'tent',
    name: 'Ned the Tentacle',
    talkColor: '#8dff7a',
    textureSet: 'tent',
  },
};
