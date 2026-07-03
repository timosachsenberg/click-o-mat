import type { GameContent } from '../engine/Engine';
import { ACTORS } from './actors';
import { ITEMS } from './items';
import { DIALOGS } from './dialogs';
import { labRoom } from './rooms/lab';
import { hallwayRoom } from './rooms/hallway';

export const CONTENT: GameContent = {
  rooms: {
    lab: labRoom,
    hallway: hallwayRoom,
  },
  items: ITEMS,
  actors: ACTORS,
  dialogs: DIALOGS,
  playerId: 'norb',
  startRoom: 'lab',
  startEntry: 'start',
};
