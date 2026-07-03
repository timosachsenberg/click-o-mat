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
  // Driven entirely by a loaded PNG spritesheet (see game/assets.ts). The
  // engine treats it exactly like the procedural actors above.
  critter: {
    id: 'critter',
    name: 'Blobbo',
    talkColor: '#ffcf6a',
    textureSet: 'critter',
    baseScale: 1.5,
    speed: 130,
  },
};
