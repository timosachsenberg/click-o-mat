import Phaser from 'phaser';
import { engine } from './engine/Engine';
import { audio } from './engine/Audio';
import { BootScene } from './engine/BootScene';
import { TitleScene } from './engine/TitleScene';
import { RoomScene } from './engine/RoomScene';
import { UIScene } from './engine/UIScene';
import { GAME_W, GAME_H } from './engine/constants';
import { CONTENT } from './game';

engine.registerContent(CONTENT);

// Debugging aid: inspect engine/audio state from the browser console (dev only).
if (import.meta.env.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, { __engine: engine, __audio: audio });
}

// Right-click is a game input (default verb), not a context menu.
document.addEventListener('contextmenu', (e) => e.preventDefault());

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'app',
  backgroundColor: '#000000',
  // premultipliedAlpha:false fixes canvas/text textures rendering with an
  // opaque BLACK box where they should be transparent — a WebGL premultiplied-
  // alpha bug that only shows up on some GPUs/drivers. Every procedural sprite
  // and Text object is a canvas-backed texture, so the whole demo is affected
  // on those systems; this makes the alpha upload consistent across drivers.
  render: { premultipliedAlpha: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, RoomScene, UIScene],
});
