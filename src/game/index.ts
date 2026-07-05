import type { GameContent } from '../engine/Engine';
import { ACTORS } from './actors';
import { ITEMS } from './items';
import { DIALOGS } from './dialogs';
import { labRoom } from './rooms/lab';
import { hallwayRoom } from './rooms/hallway';
import { galleryRoom } from './rooms/gallery';
import { stairhallRoom } from './rooms/stairhall';
import { mountainRoom } from './rooms/mountain';
import { forestRoom } from './rooms/forest';

export const CONTENT: GameContent = {
  rooms: {
    lab: labRoom,
    hallway: hallwayRoom,
    gallery: galleryRoom,
    stairhall: stairhallRoom,
    mountain: mountainRoom,
    forest: forestRoom,
  },
  items: ITEMS,
  actors: ACTORS,
  dialogs: DIALOGS,
  // No global asset manifest: every PNG in the demo is declared on the room
  // that uses it (see gallery/mountain) and loads lazily on entry.
  playerId: 'norb',
  startRoom: 'lab',
  startEntry: 'start',
};
