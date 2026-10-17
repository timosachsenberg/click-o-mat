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
import { CHARACTER_SPRITES } from './art/characters';
import { ICONS } from './art/icons';
import { UI_IMAGES, UI_THEME } from './art/ui';
// The UI font, bundled (OFL) rather than fetched from a font CDN.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';

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
  // The global manifest holds only procedural SVG art — the cast, inventory
  // icons and UI panel (rasterized at boot). Every PNG in the demo is declared on the room
  // that uses it (see gallery/mountain/forest) and loads lazily on entry.
  assets: { svgActors: CHARACTER_SPRITES, svgImages: [...ICONS, ...UI_IMAGES] },
  theme: UI_THEME,
  playerId: 'norb',
  startRoom: 'lab',
  startEntry: 'start',
};
