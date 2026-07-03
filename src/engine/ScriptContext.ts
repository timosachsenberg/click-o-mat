import type { Engine } from './Engine';
import type { GameState } from './GameState';
import type { Actor } from './Actor';
import type { Facing } from './types';
import { audio, type SfxName } from './Audio';
import { ROOM_H, GAME_W } from './constants';

/**
 * The API surface game scripts use to drive the engine. One instance is
 * created per script run; all methods are safe to await in sequence.
 */
export class ScriptContext {
  constructor(private eng: Engine) {}

  get state(): GameState {
    return this.eng.state;
  }

  get scene(): Phaser.Scene {
    return this.eng.roomScene;
  }

  actor(id: string): Actor {
    const a = this.eng.roomScene.actors.get(id);
    if (!a) throw new Error(`Actor "${id}" is not in the current room`);
    return a;
  }

  get player(): Actor {
    return this.actor(this.eng.playerId);
  }

  // ---- flags & inventory -------------------------------------------------

  flag<T = unknown>(key: string): T | undefined {
    return this.state.getFlag<T>(key);
  }

  setFlag(key: string, value: unknown = true): void {
    this.state.setFlag(key, value);
  }

  hasItem(id: string): boolean {
    return this.state.hasItem(id);
  }

  addItem(id: string, opts: { silent?: boolean } = {}): void {
    this.state.addItem(id);
    if (!opts.silent) {
      audio.playSfx('pickup');
      const name = this.eng.items[id]?.name ?? id;
      this.eng.uiScene.toast(`Picked up: ${name}`);
    }
    this.eng.events.emit('ui');
  }

  removeItem(id: string): void {
    this.state.removeItem(id);
    this.eng.events.emit('ui');
  }

  // ---- staging -----------------------------------------------------------

  async say(actorId: string, text: string): Promise<void> {
    await this.actor(actorId).say(text);
  }

  async playerSay(text: string): Promise<void> {
    await this.player.say(text);
  }

  async walkTo(actorId: string, x: number, y: number): Promise<void> {
    await this.actor(actorId).walkTo({ x, y }, this.eng.roomScene.walkArea);
  }

  face(actorId: string, facing: Facing): void {
    this.actor(actorId).setFacing(facing);
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  async goToRoom(roomId: string, entryId?: string): Promise<void> {
    await this.eng.roomScene.transitionTo(roomId, entryId);
  }

  async dialog(dialogId: string): Promise<void> {
    await this.eng.runDialog(dialogId);
  }

  /** Repaint background/walk-behinds and rebuild the walk area from state. */
  repaint(): void {
    this.eng.roomScene.repaintRoom();
  }

  /** Play a sound effect — a loaded audio key, or a built-in synth bleep. */
  sfx(name: SfxName | string): void {
    audio.playSfx(name);
  }

  /** Start/switch looping background music (loaded key or procedural track).
   *  No-op if that track is already playing. */
  playMusic(key: string): void {
    audio.playMusic(key);
  }

  /** Fade out and stop the current music. */
  stopMusic(): void {
    audio.stopMusic();
  }

  flash(color = 0xffffff, duration = 300): void {
    this.eng.roomScene.cameras.main.flash(duration, color >> 16, (color >> 8) & 0xff, color & 0xff);
  }

  shake(duration = 300, intensity = 0.01): void {
    this.eng.roomScene.cameras.main.shake(duration, intensity);
  }

  /** Big centered title card (e.g. "THE END"). Cleared on room change. */
  showTitle(text: string): void {
    const t = this.eng.roomScene.add
      .text(GAME_W / 2, ROOM_H / 2, text, {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(20000)
      .setScale(0.2);
    this.eng.roomScene.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.Out' });
  }
}
