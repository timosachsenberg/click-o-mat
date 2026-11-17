import type { GameContent } from '../engine/Engine';
import { ACTORS } from './actors';
import { ITEMS } from './items';
import { DIALOGS } from './dialogs';
import { PASSWORD_FARE } from './wormhole';
import { DE_STRINGS } from './strings';
import { GOA_MUSIC } from './music';
import { picassoRoom } from './rooms/picasso';
import { neckarRoom } from './rooms/neckar';
import { epplehausRoom } from './rooms/epplehaus';
import { waldrandRoom } from './rooms/waldrand';
import { doenerRoom } from './rooms/doener';
import { goaEingangRoom } from './rooms/goaeingang';
import { goaRoom } from './rooms/goa';
import { turmtuerRoom } from './rooms/turmtuer';
import { hoelderlinturmRoom } from './rooms/hoelderlinturm';
import { GOA_CAST } from './art/cast';
import { GOA_ICONS } from './art/icons';
import { UI_IMAGES, UI_THEME } from '../game/art/ui';
// The UI font, bundled (OFL) rather than fetched from a font CDN.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';

/**
 * "Folge dem Bass" — the adventure proper (in German). It starts with the
 * player getting off the bus on the Neckarbrücke with nothing but a two-euro
 * coin; the goal is tonight's Goa party in the forest. The engine demo ships
 * alongside it (src/game); the title screen picks between the two.
 */
export const CONTENT: GameContent = {
  id: 'goa',
  rooms: {
    picasso: picassoRoom,
    doener: doenerRoom,
    goaeingang: goaEingangRoom,
    goa: goaRoom,
    epplehaus: epplehausRoom,
    waldrand: waldrandRoom,
    neckar: neckarRoom,
    turmtuer: turmtuerRoom,
    hoelderlinturm: hoelderlinturmRoom,
  },
  items: ITEMS,
  actors: ACTORS,
  dialogs: DIALOGS,
  assets: { svgActors: GOA_CAST, svgImages: [...GOA_ICONS, ...UI_IMAGES] },
  theme: UI_THEME,
  strings: DE_STRINGS,
  music: GOA_MUSIC,
  playerId: 'player',
  startRoom: 'neckar',
  startEntry: 'bus',
  startItems: ['euro'],
  easyMode: true,
  // „Benutze“ + Gegenstand nimmt ihn immer erst in die Hand; „Benutze X mit
  // Person“ und „Gib X an Person“ gelten gleich.
  forgivingItems: true,
};

// A renamed item must not silently drop out of the wormhole's exemptions:
// that would turn a jump without the password into a dead end.
for (const id of Object.keys(PASSWORD_FARE)) {
  if (!(id in ITEMS)) throw new Error(`wormhole.ts: PASSWORD_FARE names an unknown item "${id}"`);
}
