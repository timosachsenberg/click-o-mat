import Phaser from 'phaser';
import { engine } from './engine/Engine';
import { audio } from './engine/Audio';
import { BootScene } from './engine/BootScene';
import { TitleScene } from './engine/TitleScene';
import { RoomScene } from './engine/RoomScene';
import { UIScene } from './engine/UIScene';
import { GAME_W, GAME_H } from './engine/constants';
import { chooseRendererType, installCanvasTextureUploadFix } from './engine/renderCompat';
import { CONTENT as DEMO } from './game';
import { CONTENT as GOA } from './goa';

// Two games ship in one page: the adventure ("Folge dem Bass") and the
// engine demo. The title screen picks between them; a pick reloads the page
// with ?game=<id> and is remembered for the next visit.
const GAMES = { goa: GOA, demo: DEMO };
type GameId = keyof typeof GAMES;
const GAME_KEY = 'click-o-mat-game';
const isGame = (id: string | null): id is GameId => !!id && Object.hasOwn(GAMES, id);
const fromUrl = new URLSearchParams(location.search).get('game');
let stored: string | null = null;
try {
  stored = localStorage.getItem(GAME_KEY);
} catch {
  /* storage blocked: no memory of the last pick */
}
const current: GameId = isGame(fromUrl) ? fromUrl : isGame(stored) ? stored : 'goa';
try {
  localStorage.setItem(GAME_KEY, current);
} catch {
  /* ignore */
}

engine.registerContent(GAMES[current]);
engine.launcher = {
  current,
  games: [
    { id: 'goa', label: 'SPIEL' },
    { id: 'demo', label: 'DEMO' },
  ],
  select: (id) => {
    const url = new URL(location.href);
    url.searchParams.set('game', id);
    location.assign(url.toString());
  },
};

// Debugging aid: inspect engine/audio state from the browser console (dev only).
if (import.meta.env.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, { __engine: engine, __audio: audio });
}

// Right-click is a game input (default verb), not a context menu.
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Some GPUs/drivers corrupt the alpha channel of canvas-backed WebGL
// textures, turning every procedural sprite and Text object into an opaque
// black box — and the corruption can be invisible to upload-side probes.
// renderCompat.ts documents the details: the Canvas renderer is the default
// (immune, and plenty fast at this resolution); ?renderer=webgl opts into
// WebGL, where canvas uploads are rerouted through ImageData as a hardening.
installCanvasTextureUploadFix();

new Phaser.Game({
  type: chooseRendererType(),
  width: GAME_W,
  height: GAME_H,
  parent: 'app',
  backgroundColor: '#000000',
  render: { premultipliedAlpha: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, RoomScene, UIScene],
});
