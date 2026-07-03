import Phaser from 'phaser';
import { GameState, type SaveData } from './GameState';
import type {
  ActorDef,
  AssetManifest,
  DialogDef,
  Facing,
  ItemDef,
  RoomDef,
  ScriptOrLine,
  VerbId,
} from './types';
import { runDialog } from './DialogRunner';
import { ScriptContext } from './ScriptContext';
import type { RoomScene } from './RoomScene';
import type { UIScene } from './UIScene';

export interface GameContent {
  rooms: Record<string, RoomDef>;
  items: Record<string, ItemDef>;
  actors: Record<string, ActorDef>;
  dialogs: Record<string, DialogDef>;
  /** Optional images/spritesheets/animations to preload before the game runs. */
  assets?: AssetManifest;
  playerId: string;
  startRoom: string;
  startEntry: string;
}

const SAVE_KEY = 'pnc-adventure-save';

/**
 * Global engine singleton: content registries, live game state, current
 * verb/item selection, and cross-scene event wiring.
 */
export class Engine {
  state = new GameState();
  events = new Phaser.Events.EventEmitter();

  rooms: Record<string, RoomDef> = {};
  items: Record<string, ItemDef> = {};
  actors: Record<string, ActorDef> = {};
  dialogs: Record<string, DialogDef> = {};
  assets: AssetManifest = {};
  playerId = 'player';
  startRoom = '';
  startEntry = 'start';

  /** Scenes register themselves here on create(). */
  roomScene!: RoomScene;
  uiScene!: UIScene;

  /** Reference count of concurrently running scripts/cutscenes. Overlaps are
   *  real: a door script is still finishing while the next room's onEnter
   *  cutscene already runs — a single boolean would be cleared too early. */
  private busyCount = 0;

  /** True while any script/cutscene runs; room clicks then only skip lines... */
  get busy(): boolean {
    return this.busyCount > 0;
  }

  beginBusy(): void {
    this.busyCount++;
  }

  endBusy(): void {
    this.busyCount = Math.max(0, this.busyCount - 1);
    if (this.busyCount === 0) this.skipping = false; // cutscene over: stop fast-forwarding
  }

  resetBusy(): void {
    this.busyCount = 0;
    this.skipping = false;
  }

  /** True while fast-forwarding the current cutscene (Esc). Script primitives
   *  (say/wait/walkTo/tween/zoom) check this and complete instantly. */
  skipping = false;

  /** Script-created tweens currently in flight, so a skip can finish them. */
  private activeTweens = new Set<Phaser.Tweens.Tween>();

  trackTween(t: Phaser.Tweens.Tween): void {
    this.activeTweens.add(t);
  }

  untrackTween(t: Phaser.Tweens.Tween): void {
    this.activeTweens.delete(t);
  }

  /** Fast-forward the rest of the current cutscene: dismiss the showing line,
   *  finish in-flight walks/waits/tweens, and make subsequent primitives
   *  resolve instantly until the busy count returns to zero. Plain and
   *  approach walks (interruptible) and dialogs are deliberately not
   *  skippable — dialogs stop the fast-forward at their next choice. */
  startSkip(): void {
    if (!this.busy || this.interruptible || this.dialogMode || this.menuOpen) return;
    this.skipping = true;
    this.events.emit('skipLine'); // dismiss the currently showing speech
    this.events.emit('skipCutscene'); // release in-flight ctx.wait()s
    this.roomScene.finishWalks();
    for (const t of [...this.activeTweens]) {
      try {
        t.complete();
      } catch {
        // a tween whose target died with a room change — ignore
      }
    }
  }
  /** ...unless we're merely in the auto-walk phase, which clicks may cancel. */
  interruptible = false;
  dialogMode = false;
  /** True while dialog choices are on screen awaiting a pick. */
  choicesShowing = false;
  /** True while the options menu is open; gameplay input is blocked. */
  menuOpen = false;

  selectedVerb: VerbId | null = null;
  pendingItem: string | null = null;
  pendingItemVerb: 'use' | 'give' | null = null;

  registerContent(content: GameContent): void {
    this.rooms = content.rooms;
    this.items = content.items;
    this.actors = content.actors;
    this.dialogs = content.dialogs;
    this.assets = content.assets ?? {};
    this.playerId = content.playerId;
    this.startRoom = content.startRoom;
    this.startEntry = content.startEntry;
  }

  setVerb(verb: VerbId | null): void {
    this.selectedVerb = verb;
    this.pendingItem = null;
    this.pendingItemVerb = null;
    this.events.emit('ui');
  }

  setPendingItem(itemId: string, verb: 'use' | 'give'): void {
    this.pendingItem = itemId;
    this.pendingItemVerb = verb;
    this.selectedVerb = null;
    this.events.emit('ui');
  }

  clearSelection(): void {
    this.selectedVerb = null;
    this.pendingItem = null;
    this.pendingItemVerb = null;
    this.events.emit('ui');
  }

  makeContext(): ScriptContext {
    return new ScriptContext(this);
  }

  /** Run a standalone script (item look-at, combines) with input locked. */
  async runScript(script: ScriptOrLine | undefined, fallbackLine: string): Promise<void> {
    if (this.busy) return;
    this.beginBusy();
    try {
      const ctx = this.makeContext();
      const s = script ?? fallbackLine;
      if (typeof s === 'string') await ctx.playerSay(s);
      else await s(ctx);
    } finally {
      this.endBusy();
      this.clearSelection();
    }
  }

  async runDialog(dialogId: string): Promise<void> {
    const def = this.dialogs[dialogId];
    if (!def) throw new Error(`Unknown dialog: ${dialogId}`);
    await runDialog(this, def);
  }

  save(): boolean {
    try {
      const player = this.roomScene.actors.get(this.playerId);
      if (player) {
        this.state.playerPos = { x: player.x, y: player.y };
        this.state.playerFacing = player.facing;
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state.toSave()));
      return true;
    } catch {
      return false;
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as SaveData;
      this.state = GameState.fromSave(data);
      this.clearSelection();
      this.resetBusy();
      this.dialogMode = false;
      this.roomScene.loadRoom(this.state.currentRoom, undefined, {
        pos: this.state.playerPos ?? undefined,
        facing: this.state.playerFacing,
      });
      return true;
    } catch {
      return false;
    }
  }

  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /** Player position/facing staged by loadForStart(), consumed by the room
   *  scene's first loadRoom. */
  pendingRestore: { pos?: { x: number; y: number }; facing?: Facing } | null = null;

  /** Stage a saved game before the room scene exists (the title screen's
   *  Continue): state is restored now, the room loads when 'room' starts. */
  loadForStart(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as SaveData;
      this.state = GameState.fromSave(data);
      this.clearSelection();
      this.resetBusy();
      this.dialogMode = false;
      this.pendingRestore = {
        pos: this.state.playerPos ?? undefined,
        facing: this.state.playerFacing,
      };
      return true;
    } catch {
      return false;
    }
  }
}

export const engine = new Engine();
