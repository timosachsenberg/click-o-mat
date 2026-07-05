import type { AssetManifest } from '../engine/types';

// Asset URLs are resolved relative to the site's base path so they work both
// in dev (served at "/") and on GitHub Pages (served under "/click-o-mat/").
const base = import.meta.env.BASE_URL;

/**
 * Per-room asset bundles, loaded lazily when their room is first entered
 * (see RoomScene.ensureRoomAssets) and cached afterwards. Keeping these off
 * the global boot manifest is what lets a large game start fast — only the
 * rooms you visit pay for their art.
 *
 * The demo's shared characters (Norb, Pia, Ned) and icons are procedural
 * (generated in BootScene), so nothing needs to be in the global manifest.
 */

// The gallery: PNG backdrop, foreground pillar, Blobbo's spritesheet, and the
// animated wall sconce.
export const GALLERY_ASSETS: AssetManifest = {
  images: [
    { key: 'gallery-bg', url: `${base}img/gallery-bg.png` }, // 960×450 backdrop
    { key: 'pillar', url: `${base}img/pillar.png` }, // alpha foreground column
  ],
  spritesheets: [
    // 8×3 grid of 48×48 frames (front/side/back × idle/walk/talk).
    { key: 'critter', url: `${base}img/critter.png`, frameWidth: 48, frameHeight: 48 },
    // 4 flame frames of 32×48 (the animated wall-sconce layer).
    { key: 'sconce', url: `${base}img/sconce.png`, frameWidth: 32, frameHeight: 48 },
  ],
  // Anims follow the actor convention `<textureSet>-<pose>-<variant>`.
  anims: [
    { key: 'critter-idle-front', texture: 'critter', frames: [0, 1], frameRate: 2 },
    { key: 'critter-idle-side', texture: 'critter', frames: [2, 3], frameRate: 2 },
    { key: 'critter-idle-back', texture: 'critter', frames: [4, 5], frameRate: 2 },
    { key: 'critter-talk-front', texture: 'critter', frames: [6, 7], frameRate: 7 },
    { key: 'critter-walk-front', texture: 'critter', frames: [8, 9, 10, 11], frameRate: 9 },
    { key: 'critter-walk-side', texture: 'critter', frames: [12, 13, 14, 15], frameRate: 9 },
    { key: 'critter-walk-back', texture: 'critter', frames: [16, 17, 18, 19], frameRate: 9 },
    { key: 'critter-talk-side', texture: 'critter', frames: [20, 21], frameRate: 7 },
    { key: 'critter-talk-back', texture: 'critter', frames: [22, 23], frameRate: 7 },
    { key: 'sconce-flicker', texture: 'sconce', frames: [0, 1, 2, 3], frameRate: 8 },
  ],
};

// The mountain: the ambient bird that crosses the sky.
export const MOUNTAIN_ASSETS: AssetManifest = {
  spritesheets: [
    { key: 'bird', url: `${base}img/bird.png`, frameWidth: 40, frameHeight: 28 },
  ],
  anims: [{ key: 'bird-flap', texture: 'bird', frames: [0, 1], frameRate: 6 }],
};

// The forest: the animated rain overlay (a 4-frame 480×270 loop, tiled).
export const FOREST_ASSETS: AssetManifest = {
  spritesheets: [
    { key: 'rain', url: `${base}img/rain.png`, frameWidth: 480, frameHeight: 270 },
  ],
  anims: [{ key: 'rain-fall', texture: 'rain', frames: [0, 1, 2, 3], frameRate: 14 }],
};
