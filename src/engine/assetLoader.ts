import type { ActorVariant, AssetManifest } from './types';
import { makeSvgTex } from './svgTex';

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

const VARIANTS: ActorVariant[] = ['front', 'back', 'side'];

/** Rasterize a manifest's inline SVG images and SVG actor frames (skipping
 *  textures that already exist) and register the actors' animations. */
export async function prepareSvgAssets(scene: Phaser.Scene, m: AssetManifest | undefined): Promise<void> {
  if (!m) return;
  const jobs: Promise<void>[] = [];
  for (const img of m.svgImages ?? []) {
    if (!scene.textures.exists(img.key)) {
      jobs.push(makeSvgTex(scene, img.key, img.width, img.height, img.svg));
    }
  }
  for (const a of m.svgActors ?? []) {
    for (const variant of VARIANTS) {
      for (const pose of Object.keys(a.poses)) {
        for (let f = 0; f < a.poses[pose].frames; f++) {
          const key = `${a.key}-${variant}-${pose}-${f}`;
          if (!scene.textures.exists(key)) {
            jobs.push(makeSvgTex(scene, key, a.width, a.height, a.draw(variant, pose, f)));
          }
        }
      }
    }
  }
  await Promise.all(jobs);
  for (const a of m.svgActors ?? []) {
    for (const variant of VARIANTS) {
      for (const pose of Object.keys(a.poses)) {
        const animKey = `${a.key}-${pose}-${variant}`;
        if (scene.anims.exists(animKey)) continue;
        const { frames, frameRate } = a.poses[pose];
        scene.anims.create({
          key: animKey,
          frames: Array.from({ length: frames }, (_, f) => ({ key: `${a.key}-${variant}-${pose}-${f}` })),
          frameRate,
          repeat: -1,
        });
      }
    }
  }
}

/** Run the scene's loader for currently-queued files and resolve when done. */
export function runLoader(scene: Phaser.Scene): Promise<void> {
  return new Promise((resolve) => {
    scene.load.once('complete', () => resolve());
    scene.load.start();
  });
}
