import type { GameContent } from '../engine/Engine';
import { ACTORS } from './actors';
import { ITEMS } from './items';
import { DIALOGS } from './dialogs';
import { DE_STRINGS } from './strings';
import { GOA_MUSIC } from './music';
import { picassoRoom } from './rooms/picasso';
import { GOA_CAST } from './art/cast';
import { GOA_ICONS } from './art/icons';
import { UI_IMAGES, UI_THEME } from '../game/art/ui';
// The UI font, bundled (OFL) rather than fetched from a font CDN.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';

/**
 * "Folge dem Bass" — the adventure proper (in German). It starts in the
 * Picasso, Ali's basement bar, with nothing but a two-euro coin; the goal is
 * the password for tonight's Goa party in the forest. The engine demo ships alongside it
 * (src/game); the title screen picks between the two.
 */
export const CONTENT: GameContent = {
  id: 'goa',
  rooms: {
    picasso: picassoRoom,
  },
  items: ITEMS,
  actors: ACTORS,
  dialogs: DIALOGS,
  assets: { svgActors: GOA_CAST, svgImages: [...GOA_ICONS, ...UI_IMAGES] },
  theme: UI_THEME,
  strings: DE_STRINGS,
  music: GOA_MUSIC,
  playerId: 'player',
  startRoom: 'picasso',
  startEntry: 'start',
  startItems: ['euro'],
};
