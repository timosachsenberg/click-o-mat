import Phaser from 'phaser';
import { makeCanvasTex } from './canvasTex';
import { engine } from './Engine';

type Variant = 'front' | 'back' | 'side';
type Pose = 'idle' | 'walk' | 'talk';

const POSE_FRAMES: Record<Pose, number> = { idle: 2, walk: 4, talk: 2 };
const POSE_RATE: Record<Pose, number> = { idle: 1.5, walk: 10, talk: 7 };

interface GuyColors {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  glasses?: boolean;
}

/**
 * Loads real assets from the manifest (`engine.assets`) AND generates the
 * demo's procedural placeholder art. The two paths coexist: a game can be
 * fully procedural, fully PNG-based, or a mix. Hands off to the room + UI
 * scenes once everything is ready.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  /** Queue every image/spritesheet in the manifest. Phaser runs this before
   *  create(), so the textures exist by the time we build animations. */
  preload(): void {
    for (const img of engine.assets.images ?? []) {
      this.load.image(img.key, img.url);
    }
    for (const sheet of engine.assets.spritesheets ?? []) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    for (const clip of engine.assets.audio ?? []) {
      this.load.audio(clip.key, clip.url);
    }
  }

  create(): void {
    // Procedural placeholder art for the demo characters + icons.
    this.makeHumanoidSet('guy', {
      skin: '#f2c99a',
      hair: '#5a3820',
      shirt: '#4a7dd4',
      pants: '#3a3550',
      shoes: '#22202e',
      glasses: true,
    });
    this.makeTentacleSet('tent', '#4fae4a', '#2f7a2c');
    this.makeIcons();
    this.registerAnims('guy');
    this.registerAnims('tent');

    // Animations built from loaded spritesheets in the manifest.
    for (const a of engine.assets.anims ?? []) {
      if (this.anims.exists(a.key)) continue;
      this.anims.create({
        key: a.key,
        frames: this.anims.generateFrameNumbers(a.texture, { frames: a.frames }),
        frameRate: a.frameRate,
        repeat: a.repeat ?? -1,
      });
    }

    this.scene.start('title');
  }

  // ---- humanoid character ------------------------------------------------

  private makeHumanoidSet(set: string, c: GuyColors): void {
    const variants: Variant[] = ['front', 'back', 'side'];
    for (const variant of variants) {
      for (const pose of Object.keys(POSE_FRAMES) as Pose[]) {
        for (let f = 0; f < POSE_FRAMES[pose]; f++) {
          makeCanvasTex(this, `${set}-${variant}-${pose}-${f}`, 48, 96, (g) =>
            drawHumanoid(g, variant, pose, f, c)
          );
        }
      }
    }
  }

  // ---- tentacle character --------------------------------------------------

  private makeTentacleSet(set: string, body: string, dark: string): void {
    const variants: Variant[] = ['front', 'back', 'side'];
    for (const variant of variants) {
      for (const pose of Object.keys(POSE_FRAMES) as Pose[]) {
        for (let f = 0; f < POSE_FRAMES[pose]; f++) {
          makeCanvasTex(this, `${set}-${variant}-${pose}-${f}`, 56, 92, (g) =>
            drawTentacle(g, pose, f, body, dark)
          );
        }
      }
    }
  }

  private registerAnims(set: string): void {
    for (const variant of ['front', 'back', 'side'] as Variant[]) {
      for (const pose of Object.keys(POSE_FRAMES) as Pose[]) {
        const frames = [];
        for (let f = 0; f < POSE_FRAMES[pose]; f++) {
          frames.push({ key: `${set}-${variant}-${pose}-${f}` });
        }
        this.anims.create({
          key: `${set}-${pose}-${variant}`,
          frames,
          frameRate: POSE_RATE[pose],
          repeat: -1,
        });
      }
    }
  }

  // ---- inventory icons -----------------------------------------------------

  private makeIcons(): void {
    makeCanvasTex(this, 'icon-battery', 64, 48, (g) => {
      g.fillStyle = '#d4b430';
      g.fillRect(14, 14, 34, 20);
      g.fillStyle = '#888888';
      g.fillRect(48, 19, 6, 10);
      g.fillStyle = '#222222';
      g.font = 'bold 12px monospace';
      g.fillText('9V', 22, 28);
    });
    makeCanvasTex(this, 'icon-key', 64, 48, (g) => {
      g.strokeStyle = '#e6c860';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(18, 24, 8, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(26, 24);
      g.lineTo(52, 24);
      g.moveTo(44, 24);
      g.lineTo(44, 32);
      g.moveTo(52, 24);
      g.lineTo(52, 32);
      g.stroke();
    });
    makeCanvasTex(this, 'icon-hamster', 64, 48, (g) => drawHamsterIcon(g, false));
    makeCanvasTex(this, 'icon-glowhamster', 64, 48, (g) => drawHamsterIcon(g, true));
  }
}

// ---- drawing helpers -------------------------------------------------------

function drawHumanoid(
  g: CanvasRenderingContext2D,
  variant: Variant,
  pose: Pose,
  f: number,
  c: GuyColors
): void {
  const cx = 24;
  const swing = pose === 'walk' ? [7, 0, -7, 0][f % 4] : 0;
  const bob = pose === 'walk' && f % 2 === 0 ? 2 : 0;
  const idleBreath = pose === 'idle' && f % 2 === 1 ? 1 : 0;

  g.save();
  g.translate(0, bob + idleBreath);

  // Legs + shoes
  g.fillStyle = c.pants;
  if (variant === 'side') {
    g.fillRect(cx - 4 + swing * 0.8, 62, 8, 26);
    g.fillRect(cx - 4 - swing * 0.8, 62, 8, 26);
    g.fillStyle = c.shoes;
    g.fillRect(cx - 5 + swing * 0.8, 86, 13, 7);
    g.fillRect(cx - 6 - swing * 0.8, 86, 13, 7);
  } else {
    g.fillRect(cx - 10, 62 + Math.max(0, swing * 0.4), 8, 26 - Math.max(0, swing * 0.4));
    g.fillRect(cx + 2, 62 + Math.max(0, -swing * 0.4), 8, 26 - Math.max(0, -swing * 0.4));
    g.fillStyle = c.shoes;
    g.fillRect(cx - 11, 87, 10, 6);
    g.fillRect(cx + 1, 87, 10, 6);
  }

  // Torso
  g.fillStyle = c.shirt;
  g.fillRect(cx - 12, 34, 24, 30);

  // Arms (swing opposite the legs)
  g.fillStyle = c.shirt;
  if (variant === 'side') {
    g.fillRect(cx - 3 - swing * 0.7, 36, 7, 24);
    g.fillStyle = c.skin;
    g.fillRect(cx - 3 - swing * 0.7, 58, 7, 6);
  } else {
    g.fillRect(cx - 17, 36, 6, 24 + swing * 0.3);
    g.fillRect(cx + 11, 36, 6, 24 - swing * 0.3);
    g.fillStyle = c.skin;
    g.fillRect(cx - 17, 58 + swing * 0.3, 6, 6);
    g.fillRect(cx + 11, 58 - swing * 0.3, 6, 6);
  }

  // Head
  g.fillStyle = c.skin;
  g.beginPath();
  g.arc(cx, 22, 12, 0, Math.PI * 2);
  g.fill();

  // Hair
  g.fillStyle = c.hair;
  g.beginPath();
  g.arc(cx, 18, 12, Math.PI, 2 * Math.PI);
  g.fill();
  if (variant === 'back') {
    g.fillRect(cx - 12, 18, 24, 10);
    g.restore();
    return; // no face from behind
  }

  // Face
  const eyeY = 22;
  g.fillStyle = '#222222';
  if (variant === 'front') {
    g.fillRect(cx - 6, eyeY, 3, 3);
    g.fillRect(cx + 3, eyeY, 3, 3);
    if (c.glasses) {
      g.strokeStyle = '#222222';
      g.lineWidth = 1.5;
      g.strokeRect(cx - 8, eyeY - 2, 7, 7);
      g.strokeRect(cx + 1, eyeY - 2, 7, 7);
      g.beginPath();
      g.moveTo(cx - 1, eyeY + 1);
      g.lineTo(cx + 1, eyeY + 1);
      g.stroke();
    }
    const mouthOpen = pose === 'talk' && f % 2 === 0;
    if (mouthOpen) {
      g.beginPath();
      g.ellipse(cx, 30, 3, 4, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillRect(cx - 3, 29, 6, 2);
    }
  } else {
    // side profile faces right; Actor flips the sprite for left
    g.fillRect(cx + 5, eyeY, 3, 3);
    if (c.glasses) {
      g.strokeStyle = '#222222';
      g.lineWidth = 1.5;
      g.strokeRect(cx + 3, eyeY - 2, 8, 7);
    }
    const mouthOpen = pose === 'talk' && f % 2 === 0;
    if (mouthOpen) {
      g.beginPath();
      g.ellipse(cx + 8, 30, 2, 3, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillRect(cx + 5, 29, 6, 2);
    }
  }
  g.restore();
}

function drawTentacle(
  g: CanvasRenderingContext2D,
  pose: Pose,
  f: number,
  body: string,
  dark: string
): void {
  const sway = pose === 'idle' ? (f % 2 === 0 ? 3 : -3) : pose === 'walk' ? (f % 2 === 0 ? 5 : -5) : 0;
  const baseX = 28;
  const baseY = 86;

  // Tapering column of overlapping circles, leaning with the sway.
  g.fillStyle = body;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = baseX + Math.sin(t * 2.4) * 3 + sway * t;
    const y = baseY - t * 66;
    const r = 15 - t * 8;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // Curled tip
  const tipX = baseX + Math.sin(2.4) * 3 + sway;
  g.beginPath();
  g.arc(tipX + 6, baseY - 70, 6, 0, Math.PI * 2);
  g.fill();

  // Base skirt
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(baseX, baseY, 18, 7, 0, 0, Math.PI * 2);
  g.fill();

  // Suckers
  g.fillStyle = '#a8e0a0';
  g.beginPath();
  g.arc(baseX - 2 + sway * 0.3, baseY - 30, 3, 0, Math.PI * 2);
  g.arc(baseX + 1 + sway * 0.5, baseY - 44, 2.5, 0, Math.PI * 2);
  g.fill();

  // Eyes
  const eyeX = baseX + Math.sin(1.9) * 3 + sway * 0.8;
  const eyeY = baseY - 56;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(eyeX - 4, eyeY, 4, 0, Math.PI * 2);
  g.arc(eyeX + 5, eyeY, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#111111';
  g.beginPath();
  g.arc(eyeX - 3, eyeY, 1.8, 0, Math.PI * 2);
  g.arc(eyeX + 6, eyeY, 1.8, 0, Math.PI * 2);
  g.fill();

  // Mouth
  g.fillStyle = '#12330f';
  const mouthOpen = pose === 'talk' && f % 2 === 0;
  g.beginPath();
  if (mouthOpen) {
    g.ellipse(eyeX + 1, eyeY + 9, 4, 5, 0, 0, Math.PI * 2);
  } else {
    g.ellipse(eyeX + 1, eyeY + 9, 4, 1.5, 0, 0, Math.PI * 2);
  }
  g.fill();
}

function drawHamsterIcon(g: CanvasRenderingContext2D, glowing: boolean): void {
  if (glowing) {
    g.fillStyle = 'rgba(120, 255, 100, 0.45)';
    g.beginPath();
    g.ellipse(32, 26, 26, 18, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = glowing ? '#b8e07a' : '#b07840';
  g.beginPath();
  g.ellipse(32, 28, 18, 12, 0, 0, Math.PI * 2);
  g.fill();
  // Ears
  g.beginPath();
  g.arc(22, 17, 4, 0, Math.PI * 2);
  g.arc(32, 15, 4, 0, Math.PI * 2);
  g.fill();
  // Belly
  g.fillStyle = glowing ? '#e0f5c0' : '#e8d0b0';
  g.beginPath();
  g.ellipse(34, 32, 10, 6, 0, 0, Math.PI * 2);
  g.fill();
  // Eye + nose
  g.fillStyle = '#111111';
  g.beginPath();
  g.arc(24, 24, 2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(16, 27, 1.5, 0, Math.PI * 2);
  g.fill();
}
