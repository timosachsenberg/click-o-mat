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
    // Animations built from the global manifest's spritesheets.
    registerManifestAnims(this, engine.assets);
    void prepareSvgAssets(this, engine.assets).then(() => this.scene.start('title'));
  }
}
