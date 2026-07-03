import type { GameContent } from '../engine/Engine';
import { ACTORS } from './actors';
import { ITEMS } from './items';
import { DIALOGS } from './dialogs';
import { ASSETS } from './assets';
import { labRoom } from './rooms/lab';
import { hallwayRoom } from './rooms/hallway';
import { galleryRoom } from './rooms/gallery';
import { stairhallRoom } from './rooms/stairhall';
import { mountainRoom } from './rooms/mountain';

export const CONTENT: GameContent = {
  rooms: {
    lab: labRoom,
    hallway: hallwayRoom,
    gallery: galleryRoom,
    stairhall: stairhallRoom,
    mountain: mountainRoom,
  },
  items: ITEMS,
  actors: ACTORS,
  dialogs: DIALOGS,
  assets: ASSETS,
  playerId: 'norb',
  startRoom: 'lab',
  startEntry: 'start',
};
