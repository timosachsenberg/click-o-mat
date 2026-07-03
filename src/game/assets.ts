import type { AssetManifest } from '../engine/types';

// Asset URLs are resolved relative to the site's base path so they work both
// in dev (served at "/") and on GitHub Pages (served under "/click-o-mat/").
const base = import.meta.env.BASE_URL;

/**
 * Real PNG assets loaded by BootScene before the game starts. This sits
 * alongside the procedurally generated demo art — a game can use either or
 * both. The gallery room and the "critter" NPC below are driven entirely by
 * these PNGs.
 */
export const ASSETS: AssetManifest = {
  images: [
    // A 960×450 room background.
    { key: 'gallery-bg', url: `${base}img/gallery-bg.png` },
    // Foreground column with alpha (a Layer.FRONT overlay in the gallery).
    { key: 'pillar', url: `${base}img/pillar.png` },
  ],
  spritesheets: [
    // 8×3 grid of 48×48 frames (front/side/back × idle/walk/talk).
    { key: 'critter', url: `${base}img/critter.png`, frameWidth: 48, frameHeight: 48 },
    // 4 flame frames of 32×48 (an animated wall-sconce layer).
    { key: 'sconce', url: `${base}img/sconce.png`, frameWidth: 32, frameHeight: 48 },
  ],
  // Animations follow the actor key convention `<textureSet>-<pose>-<variant>`
  // so an actor with textureSet "critter" picks them up automatically.
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
    // Ambient layer animation (not an actor — used via LayerDef.anim).
    { key: 'sconce-flicker', texture: 'sconce', frames: [0, 1, 2, 3], frameRate: 8 },
  ],
};
