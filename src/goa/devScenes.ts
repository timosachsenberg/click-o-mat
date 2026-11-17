import type { DevScene } from '../engine/types';

/**
 * Jump targets for the developer scene picker (`?dev` in the URL opens it
 * with the DEV button or F4; `?dev=<id>` starts the game right in a scene):
 * every room, and the rooms in the states worth looking at.
 *
 * Every scene starts from `BASE` — all the switches the scenes below use,
 * switched off — and turns on what it shows, so a scene looks the same
 * whatever was jumped to before. The inventory and the rest of the story
 * state are left alone. Room intros play on the first visit as usual (Esc
 * skips them).
 */
const BASE: Record<string, unknown> = {
  // The opening scene is over: the bus has left.
  busGone: true,
  'once:neckarIntro': true,
  puntSunk: false,
  capAshore: false,
  capTaken: false,
  flohSatt: false,
  putTaube: false,
  putHeard: false,
  taubeCaught: false,
  copAsleep: false,
  turmOpen: false,
  turmEra: 0,
  portalOpen: false,
  wormholeUsed: false,
  portalLanding: false,
  goaEntered: false,
  password: false,
};

/** The wormhole pair has been thrown: a portal at the forest's edge, another on the dance floor. */
const PORTAL = { portalOpen: true, wormholeUsed: true };

const scene = (id: string, label: string, room: string, entry: string, flags: Record<string, unknown> = {}): DevScene => ({
  id,
  label,
  room,
  entry,
  flags: { ...BASE, ...flags },
});

export const DEV_SCENES: DevScene[] = [
  scene('start', 'Neckarbrücke · Ankunft mit dem Bus', 'neckar', 'bus', { busGone: false, 'once:neckarIntro': false }),
  scene('neckar', 'Neckarbrücke', 'neckar', 'picasso'),
  scene('neckar-kahn', 'Neckarbrücke · Kahn gesunken', 'neckar', 'picasso', { puntSunk: true, capAshore: true }),
  scene('epplehaus', 'Epplehaus', 'epplehaus', 'neckar'),
  scene('epplehaus-tauben', 'Epplehaus · Tauben gefüttert', 'epplehaus', 'neckar', { flohSatt: true, putTaube: true, putHeard: true }),
  scene('doener', 'Dönerbude', 'doener', 'epplehaus'),
  scene('picasso', 'Picasso', 'picasso', 'door'),
  scene('picasso-schlaf', 'Picasso · Partykiller schläft', 'picasso', 'door', { copAsleep: true, knowsPartykiller: true }),
  scene('turmtuer', 'Turmtür · verschlossen', 'turmtuer', 'weg'),
  scene('turmtuer-offen', 'Turmtür · offen', 'turmtuer', 'weg', { turmOpen: true }),
  scene('turm', 'Hölderlinturm · heute', 'hoelderlinturm', 'door', { turmOpen: true }),
  scene('turm-1987', 'Hölderlinturm · 1987', 'hoelderlinturm', 'door', { turmOpen: true, turmEra: 1 }),
  scene('turm-film', 'Hölderlinturm · Zeichentrick', 'hoelderlinturm', 'door', { turmOpen: true, turmEra: 2 }),
  scene('waldrand', 'Waldrand', 'waldrand', 'neckar'),
  scene('waldrand-portal', 'Waldrand · Portal offen', 'waldrand', 'neckar', PORTAL),
  scene('goaeingang', 'Goa-Eingang', 'goaeingang', 'wald', PORTAL),
  scene('goa', 'Goa · Tanzfläche', 'goa', 'eingang', { ...PORTAL, password: 'Chakabunga', goaEntered: true }),
  scene('goa-landung', 'Goa · Landung ohne Passwort', 'goa', 'portal', {
    ...PORTAL,
    portalLanding: true,
    'once:goaIntro': false,
    bouncerMetFloor: false,
  }),
];
