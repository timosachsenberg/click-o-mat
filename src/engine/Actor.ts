import Phaser from 'phaser';
import type { ActorDef, Facing, RoomDef, Vec2 } from './types';
import type { WalkArea } from './Pathfinder';
import { dist } from './geometry';
import { engine } from './Engine';
import { GAME_W } from './constants';

export type WalkResult = 'arrived' | 'cancelled' | 'blocked';
type Pose = 'idle' | 'walk' | 'talk';

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Verdana, Arial, sans-serif',
  fontSize: '17px',
  align: 'center',
  stroke: '#000000',
  strokeThickness: 5,
  wordWrap: { width: 420 },
};

/**
 * A character in a room: sprite with directional idle/walk/talk animations,
 * pathfollowing movement, perspective scaling, and speech text.
 */
export class Actor {
  sprite: Phaser.GameObjects.Sprite;
  facing: Facing = 'down';

  private pose: Pose = 'idle';
  private path: Vec2[] | null = null;
  private pathIndex = 0;
  private walkResolve: ((result: WalkResult) => void) | null = null;
  private speech: Phaser.GameObjects.Text | null = null;
  private speechTimer: Phaser.Time.TimerEvent | null = null;
  private speechResolve: (() => void) | null = null;
  private skipHandler: (() => void) | null = null;

  constructor(
    private scene: Phaser.Scene,
    public def: ActorDef,
    x: number,
    y: number,
    facing: Facing = 'down'
  ) {
    this.sprite = scene.add.sprite(x, y, `${def.textureSet}-front-idle-0`);
    this.sprite.setOrigin(0.5, 1);
    this.facing = facing;
    this.applyPose();
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
    this.applyPose();
  }

  /** Map facing to a texture variant + horizontal flip. */
  private variant(): { name: string; flip: boolean } {
    switch (this.facing) {
      case 'up':
        return { name: 'back', flip: false };
      case 'left':
        return { name: 'side', flip: true };
      case 'right':
        return { name: 'side', flip: false };
      default:
        return { name: 'front', flip: false };
    }
  }

  private applyPose(): void {
    const { name, flip } = this.variant();
    this.sprite.setFlipX(flip);
    const animKey = `${this.def.textureSet}-${this.pose}-${name}`;
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    } else {
      this.sprite.stop();
      this.sprite.setTexture(`${this.def.textureSet}-${name}-${this.pose}-0`);
    }
  }

  setPose(pose: Pose): void {
    if (this.pose === pose) return;
    this.pose = pose;
    this.applyPose();
  }

  /** Walk along the room's walk area to a target. Resolves when done. */
  walkTo(target: Vec2, area: WalkArea): Promise<WalkResult> {
    this.stop();
    const path = area.findPath({ x: this.x, y: this.y }, target);
    if (!path) return Promise.resolve('blocked');
    const end = path[path.length - 1];
    if (dist({ x: this.x, y: this.y }, end) < 3) {
      return Promise.resolve('arrived');
    }
    this.path = path;
    this.pathIndex = 1;
    this.setPose('walk');
    return new Promise<WalkResult>((resolve) => {
      this.walkResolve = resolve;
    });
  }

  /** Cancel any in-progress walk (resolves it as 'cancelled'). */
  stop(): void {
    if (this.walkResolve) {
      const resolve = this.walkResolve;
      this.walkResolve = null;
      this.path = null;
      this.setPose('idle');
      resolve('cancelled');
    }
  }

  /** Show a speech line above the actor's head; click or timeout dismisses it. */
  say(text: string): Promise<void> {
    this.dismissSpeech();
    this.setPose('talk');
    this.speech = this.scene.add
      .text(0, 0, text, { ...TEXT_STYLE, color: this.def.talkColor })
      .setOrigin(0.5, 1)
      .setDepth(9000);
    this.positionSpeech();

    const duration = Math.min(7000, Math.max(1400, text.length * 55));
    return new Promise<void>((resolve) => {
      this.speechResolve = resolve;
      this.speechTimer = this.scene.time.delayedCall(duration, () => this.dismissSpeech());
      this.skipHandler = () => this.dismissSpeech();
      engine.events.on('skipLine', this.skipHandler);
    });
  }

  private dismissSpeech(): void {
    if (this.skipHandler) {
      engine.events.off('skipLine', this.skipHandler);
      this.skipHandler = null;
    }
    this.speechTimer?.remove();
    this.speechTimer = null;
    this.speech?.destroy();
    this.speech = null;
    if (this.pose === 'talk') this.setPose('idle');
    const resolve = this.speechResolve;
    this.speechResolve = null;
    resolve?.();
  }

  private positionSpeech(): void {
    if (!this.speech) return;
    const x = Phaser.Math.Clamp(this.x, 90, GAME_W - 90);
    const y = Math.max(30 + this.speech.height, this.y - this.sprite.displayHeight - 12);
    this.speech.setPosition(x, y);
  }

  applyPerspective(scaling: RoomDef['scaling']): void {
    let scale = this.def.baseScale ?? 1;
    if (scaling) {
      const t = Phaser.Math.Clamp(
        (this.y - scaling.yTop) / (scaling.yBottom - scaling.yTop),
        0,
        1
      );
      scale *= scaling.scaleTop + (scaling.scaleBottom - scaling.scaleTop) * t;
    }
    this.sprite.setScale(scale);
    this.sprite.setDepth(this.y);
  }

  update(deltaMs: number, scaling: RoomDef['scaling']): void {
    if (this.path && this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const speed = (this.def.speed ?? 220) * this.sprite.scale;
      let remaining = (speed * deltaMs) / 1000;
      while (remaining > 0 && this.path && this.pathIndex < this.path.length) {
        const wp = this.path[this.pathIndex];
        const d = dist({ x: this.x, y: this.y }, wp);
        if (d <= remaining) {
          this.setPosition(wp.x, wp.y);
          remaining -= d;
          this.pathIndex++;
        } else {
          this.setPosition(
            this.x + ((wp.x - this.x) / d) * remaining,
            this.y + ((wp.y - this.y) / d) * remaining
          );
          remaining = 0;
        }
      }
      // Face dominant movement direction.
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        const facing: Facing =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        if (facing !== this.facing) {
          this.facing = facing;
          this.applyPose();
        }
      }
      if (this.path && this.pathIndex >= this.path.length) {
        this.path = null;
        this.setPose('idle');
        const resolve = this.walkResolve;
        this.walkResolve = null;
        resolve?.('arrived');
      }
    }
    this.applyPerspective(scaling);
    this.positionSpeech();
  }

  destroy(): void {
    this.stop();
    this.dismissSpeech();
    this.sprite.destroy();
  }
}
