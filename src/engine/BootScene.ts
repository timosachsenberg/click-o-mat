import Phaser from 'phaser';
import { engine } from './Engine';
import { prepareSvgAssets, queueManifest, registerManifestAnims } from './assetLoader';

/**
 * Loads the GLOBAL asset manifest (`engine.assets`): image/audio files
 * through Phaser's loader, then rasterizes its inline SVG art (procedural
 * characters, icons). A game can be fully file-based, fully procedural, or a
 * mix. Hands off to the title screen once everything is ready.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  /** Queue the GLOBAL manifest (shared assets). Per-room bundles load lazily
   *  when their room is entered — see RoomScene.ensureRoomAssets. */
  preload(): void {
    queueManifest(this, engine.assets);
  }

  create(): void {
    // Rasterize the SVG art first: animations may use SVG images as frames.
    void Promise.all([prepareSvgAssets(this, engine.assets), loadThemeFont()]).then(() => {
      registerManifestAnims(this, engine.assets);
      this.scene.start('title');
    });
  }
}

/** Make sure the theme's web font (if any) is loaded before any Text object
 *  measures itself with fallback metrics. Never blocks boot on failure. */
async function loadThemeFont(): Promise<void> {
  if (!document.fonts) return;
  const font = engine.theme.font;
  try {
    await Promise.all([document.fonts.load(`17px ${font}`), document.fonts.load(`bold 17px ${font}`)]);
  } catch {
    /* unknown/unavailable font: Phaser falls back to the next family */
  }
}
