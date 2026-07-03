import Phaser from 'phaser';
import { GameState, type SaveData } from './GameState';
import type { ActorDef, DialogDef, ItemDef, RoomDef, ScriptOrLine, VerbId } from './types';
import { runDialog } from './DialogRunner';
import { ScriptContext } from './ScriptContext';
import type { RoomScene } from './RoomScene';
import type { UIScene } from './UIScene';

export interface GameContent {
  rooms: Record<string, RoomDef>;
  items: Record<string, ItemDef>;
  actors: Record<string, ActorDef>;
  dialogs: Record<string, DialogDef>;
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
  playerId = 'player';
  startRoom = '';
  startEntry = 'start';

  /** Scenes register themselves here on create(). */
  roomScene!: RoomScene;
  uiScene!: UIScene;

  /** True while a script/cutscene runs; room clicks then only skip lines... */
  busy = false;
  /** ...unless we're merely in the auto-walk phase, which clicks may cancel. */
  interruptible = false;
  dialogMode = false;
  /** True while dialog choices are on screen awaiting a pick. */
  choicesShowing = false;

  selectedVerb: VerbId | null = null;
  pendingItem: string | null = null;
  pendingItemVerb: 'use' | 'give' | null = null;

  registerContent(content: GameContent): void {
    this.rooms = content.rooms;
    this.items = content.items;
    this.actors = content.actors;
    this.dialogs = content.dialogs;
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
    this.busy = true;
    try {
      const ctx = this.makeContext();
      const s = script ?? fallbackLine;
      if (typeof s === 'string') await ctx.playerSay(s);
      else await s(ctx);
    } finally {
      this.busy = false;
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
      this.busy = false;
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
}

export const engine = new Engine();
