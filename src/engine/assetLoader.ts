import type { AssetManifest } from './types';

/**
 * Shared asset-loading helpers used by both the boot-time global manifest and
 * the lazy per-room bundles. Textures/audio are cached globally by Phaser, so
 * loading is idempotent — already-present assets are skipped.
 */

/** Queue a manifest's images/spritesheets/audio into a scene's loader,
 *  skipping anything already loaded. Returns whether anything was queued. */
export function queueManifest(scene: Phaser.Scene, m: AssetManifest | undefined): boolean {
  if (!m) return false;
  let queued = false;
  for (const img of m.images ?? []) {
    if (!scene.textures.exists(img.key)) {
      scene.load.image(img.key, img.url);
      queued = true;
    }
  }
  for (const s of m.spritesheets ?? []) {
    if (!scene.textures.exists(s.key)) {
      scene.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      queued = true;
    }
  }
  for (const clip of m.audio ?? []) {
    if (!scene.cache.audio.exists(clip.key)) {
      scene.load.audio(clip.key, clip.url);
      queued = true;
    }
  }
  return queued;
}

/** Create a manifest's animations (idempotent). Call after the spritesheets
 *  they reference are loaded. */
export function registerManifestAnims(scene: Phaser.Scene, m: AssetManifest | undefined): void {
  for (const a of m?.anims ?? []) {
    if (scene.anims.exists(a.key)) continue;
    scene.anims.create({
      key: a.key,
      frames: scene.anims.generateFrameNumbers(a.texture, { frames: a.frames }),
      frameRate: a.frameRate,
      repeat: a.repeat ?? -1,
    });
  }
}

/** Run the scene's loader for currently-queued files and resolve when done. */
export function runLoader(scene: Phaser.Scene): Promise<void> {
  return new Promise((resolve) => {
    scene.load.once('complete', () => resolve());
    scene.load.start();
  });
}
