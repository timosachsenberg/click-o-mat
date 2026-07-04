import type { Engine } from './Engine';
import type { GameState } from './GameState';
import type { Actor } from './Actor';
import type { Facing, Script } from './types';
import { audio, type SfxName } from './Audio';
import { runInkDialog, type InkDialogOptions, type InkStory } from './InkDialogRunner';
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

  /** True while a cutscene/interaction is running. Ambients can use this to
   *  skip their flourish while the player is mid-scene. */
  get busy(): boolean {
    return this.eng.busy;
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
    return this.actor(this.eng.state.activeChar);
  }

  // ---- flags & inventory -------------------------------------------------

  flag<T = unknown>(key: string): T | undefined {
    return this.state.getFlag<T>(key);
  }

  setFlag(key: string, value: unknown = true): void {
    this.state.setFlag(key, value);
  }

  /** Does a character hold the item? Defaults to the active character. */
  hasItem(id: string, char?: string): boolean {
    return this.state.hasItem(id, char ?? this.state.activeChar);
  }

  addItem(id: string, opts: { silent?: boolean; char?: string } = {}): void {
    this.state.addItem(id, opts.char ?? this.state.activeChar);
    if (!opts.silent) {
      audio.playSfx('pickup');
      const name = this.eng.items[id]?.name ?? id;
      this.eng.uiScene.toast(`Picked up: ${name}`);
    }
    this.eng.events.emit('ui');
  }

  removeItem(id: string, char?: string): void {
    this.state.removeItem(id, char ?? this.state.activeChar);
    this.eng.events.emit('ui');
  }

  // ---- party / characters ------------------------------------------------

  /** The id of the character the player currently controls. */
  get activeCharId(): string {
    return this.state.activeChar;
  }

  /** Add a character to the switchable party (shows the switcher UI). If
   *  they're already an actor in the current room their position is captured;
   *  otherwise pass a location. */
  addToParty(id: string, at?: { room: string; pos: { x: number; y: number }; facing?: Facing }): void {
    this.eng.addToParty(id, at);
  }

  /** Switch player control to another party member (fades if they're in a
   *  different room). */
  async switchTo(id: string): Promise<void> {
    await this.eng.switchTo(id);
  }

  /** Move an item from one character to another (defaults: from active). */
  giveTo(id: string, item: string, from?: string): void {
    this.state.transferItem(item, from ?? this.state.activeChar, id);
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
    if (this.eng.skipping) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.eng.events.off('skipCutscene', finish);
        resolve();
      };
      this.scene.time.delayedCall(ms, finish);
      this.eng.events.on('skipCutscene', finish); // Esc releases in-flight waits
    });
  }

  /** Run `script` only the first time this key is seen (persisted as flag
   *  `once:<key>`). Returns whether it ran — usable bare as a guard, too. */
  async once(key: string, script?: Script): Promise<boolean> {
    if (this.state.getFlag(`once:${key}`)) return false;
    this.state.setFlag(`once:${key}`);
    if (script) await script(this);
    return true;
  }

  async goToRoom(roomId: string, entryId?: string): Promise<void> {
    await this.eng.roomScene.transitionTo(roomId, entryId);
  }

  async dialog(dialogId: string): Promise<void> {
    await this.eng.runDialog(dialogId);
  }

  /** Run an ink story as a conversation (see InkDialogRunner). */
  async inkDialog(story: InkStory, opts: InkDialogOptions): Promise<void> {
    await runInkDialog(this.eng, story, opts);
  }

  /** Repaint paint-layers, re-evaluate layer visibility, and rebuild the walk
   *  area from state. Call after changing flags that room art depends on. */
  repaint(): void {
    this.eng.roomScene.repaintRoom();
  }

  /** Live Phaser object of a room layer — for transient cutscene tweens only.
   *  Durable changes must go through flags + repaint(), or they'll be lost on
   *  room reload and won't survive save/load. */
  layerObj(id: string): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
    return this.eng.roomScene.layerObj(id);
  }

  /** Tween any game object's properties and await completion. Skip-aware:
   *  during a cutscene fast-forward the tween jumps straight to its end. */
  tween(targets: unknown, props: Record<string, unknown>, duration = 400): Promise<void> {
    return new Promise((resolve) => {
      const t = this.eng.roomScene.tweens.add({
        targets,
        duration,
        ...props,
        onComplete: () => {
          this.eng.untrackTween(t);
          resolve();
        },
      } as Phaser.Types.Tweens.TweenBuilderConfig);
      this.eng.trackTween(t);
      if (this.eng.skipping) t.complete();
    });
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

  /** Tween the camera zoom (1 = normal, <1 = pull back to reveal more of the
   *  room). Cutscene-scoped: rooms always start at zoom 1, and transitions
   *  snap back. The room must be at least viewport/zoom large (960×450 at
   *  zoom 0.5 needs a 1920×900 room) or the camera runs out of world. */
  zoomCamera(zoom: number, duration = 900): Promise<void> {
    const cam = this.eng.roomScene.cameras.main;
    return this.tween(cam, { zoom, ease: 'Sine.easeInOut' }, duration);
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
        wordWrap: { width: GAME_W - 80 }, // wrap long titles
      })
      .setOrigin(0.5)
      .setDepth(20000)
      .setScrollFactor(0); // stay centered even in scrolled rooms
    // Shrink to fit if a single unbreakable line is still too wide/tall.
    const fit = Math.min(1, (GAME_W - 40) / t.width, (ROOM_H - 40) / t.height);
    t.setScale(0.2 * fit);
    this.eng.roomScene.tweens.add({ targets: t, scale: fit, duration: 500, ease: 'Back.Out' });
  }
}
