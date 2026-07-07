import Phaser from 'phaser';
import { engine } from './engine/Engine';
import { audio } from './engine/Audio';
import { BootScene } from './engine/BootScene';
import { TitleScene } from './engine/TitleScene';
import { RoomScene } from './engine/RoomScene';
import { UIScene } from './engine/UIScene';
import { GAME_W, GAME_H } from './engine/constants';
import { chooseRendererType, installCanvasTextureUploadFix } from './engine/renderCompat';
import { CONTENT } from './game';

engine.registerContent(CONTENT);

// Debugging aid: inspect engine/audio state from the browser console (dev only).
if (import.meta.env.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, { __engine: engine, __audio: audio });
}

// Right-click is a game input (default verb), not a context menu.
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Some GPUs/drivers lose the alpha channel when a canvas is uploaded as a
// WebGL texture, turning every procedural sprite and Text object into an
// opaque black box. renderCompat.ts documents the layered workarounds: canvas
// uploads are rerouted through ImageData, a boot-time probe falls back to the
// Canvas renderer when WebGL corrupts alpha anyway, and ?renderer=canvas or
// ?renderer=webgl in the URL forces a renderer by hand.
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
