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
  /** The starting (and, for single-character games, only) player character. */
  playerId: string;
  /** Optional initial switchable party (defaults to just [playerId]).
   *  Characters can also join at runtime via ctx.addToParty(). */
  party?: string[];
  /** Optional per-character start locations for party members other than the
   *  starting one (room + named entry). */
  charStarts?: Record<string, { room: string; entry: string }>;
  startRoom: string;
  startEntry: string;
}

const LEGACY_SAVE_KEY = 'pnc-adventure-save';
const SAVE_PREFIX = 'pnc-save-';
/** Slot 0 is the quick slot (F5/F9); the last is the autosave. */
export const SAVE_SLOTS = 5;
export const SLOT_LABELS = ['QUICK', 'SLOT 1', 'SLOT 2', 'SLOT 3', 'AUTO'];
export const AUTO_SLOT = 4;
const TEXT_SPEED_KEY = 'pnc-text-speed';

interface SaveFile {
  v: 1;
  when: number;
  room: string;
  data: SaveData;
}

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
  /** Rooms whose lazy asset bundle has finished loading this session. */
  loadedRooms = new Set<string>();
  playerId = 'player';
  charStarts: Record<string, { room: string; entry: string }> = {};
  startRoom = '';
  startEntry = 'start';

  /** Scenes register themselves here on create(). */
  roomScene!: RoomScene;
  uiScene!: UIScene;

  /** The character the player currently controls (drives the "player" actor,
   *  ctx.player, the visible inventory, and save's live-position capture). */
  get activeChar(): string {
    return this.state.activeChar;
  }

  get party(): string[] {
    return this.state.party;
  }

  get isMultiChar(): boolean {
    return this.state.party.length > 1;
  }

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
    this.charStarts = content.charStarts ?? {};
    this.startRoom = content.startRoom;
    this.startEntry = content.startEntry;
    this.initParty(content.party ?? [content.playerId]);
    this.migrateLegacySave();
    this.loadPrefs();
  }

  /** Seed the live state's party at their start locations. The starting
   *  character (playerId) begins at startRoom/startEntry; others at their
   *  charStarts entry. Positions get filled in when their room first loads. */
  private initParty(party: string[]): void {
    const members = party.includes(this.playerId) ? party : [this.playerId, ...party];
    this.state.activeChar = this.playerId;
    this.state.party = [];
    for (const id of members) {
      if (id === this.playerId) {
        // The starting character's room/position are filled in when the first
        // room loads — keep currentRoom '' until then (the title screen relies
        // on that to know the game hasn't started).
        this.state.ensureChar(id, { room: '', pos: null, facing: 'down', inventory: [] });
      } else {
        const start = this.charStarts[id];
        const room = start?.room ?? '';
        const entry = room ? this.rooms[room]?.entries[start?.entry ?? ''] : undefined;
        this.state.ensureChar(id, {
          room,
          pos: entry ? { x: entry.x, y: entry.y } : null,
          facing: entry?.facing ?? 'down',
          inventory: [],
        });
      }
    }
  }

  /** Add a character to the switchable party at runtime (e.g. a companion
   *  joins). If they're already an actor in the current room, their live
   *  position is captured; otherwise pass a location. Shows the switcher UI. */
  addToParty(id: string, at?: { room: string; pos: { x: number; y: number }; facing?: Facing }): void {
    if (this.state.party.includes(id)) return;
    const live = this.roomScene?.actors.get(id);
    if (at) {
      this.state.ensureChar(id, { room: at.room, pos: { ...at.pos }, facing: at.facing ?? 'down' });
    } else if (live) {
      this.state.ensureChar(id, { room: this.state.currentRoom, pos: { x: live.x, y: live.y }, facing: live.facing });
    } else {
      this.state.ensureChar(id, {});
    }
    this.events.emit('party');
  }

  /** Switch player control to another party member. If they're in a different
   *  room, fades there; if co-located, just re-points control + camera. */
  async switchTo(id: string): Promise<void> {
    if (id === this.state.activeChar || !this.state.party.includes(id)) return;
    if (this.busy) return;
    // Which room are we leaving? Capture BEFORE reassigning activeChar —
    // currentRoom proxies to the active character's room, so reading it after
    // the switch would always equal the target and never transition.
    const fromRoom = this.state.currentRoom;
    // Park the current character at their live position.
    const cur = this.roomScene.actors.get(this.state.activeChar);
    if (cur) {
      this.state.chars[this.state.activeChar].pos = { x: cur.x, y: cur.y };
      this.state.chars[this.state.activeChar].facing = cur.facing;
    }
    const targetRoom = this.state.chars[id].room;
    this.state.activeChar = id;
    this.clearSelection();
    if (targetRoom && targetRoom !== fromRoom) {
      await this.roomScene.transitionTo(targetRoom);
    } else {
      this.roomScene.retargetPlayer();
    }
    this.events.emit('party');
    this.events.emit('ui');
  }

  // ---- player preferences --------------------------------------------------

  /** Text speed in [0, 1]; 0.5 is the classic timing. */
  textSpeed = 0.5;

  /** Multiplier applied to speech-line durations (fast → short). */
  get textDurationScale(): number {
    return 1.75 - 1.5 * this.textSpeed;
  }

  setTextSpeed(v: number): void {
    this.textSpeed = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem(TEXT_SPEED_KEY, String(this.textSpeed));
    } catch {
      /* ignore */
    }
  }

  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(TEXT_SPEED_KEY);
      if (raw !== null) this.textSpeed = Math.max(0, Math.min(1, parseFloat(raw)));
    } catch {
      /* ignore */
    }
  }

  /** Autosave into the AUTO slot (called on room transitions). */
  autosave(): void {
    this.save(AUTO_SLOT);
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

  // ---- save slots ----------------------------------------------------------
  // Slot 0 is the quick slot (F5/F9); slots 1..SAVE_SLOTS-1 are manual.

  private slotKey(slot: number): string {
    return `${SAVE_PREFIX}${slot}`;
  }

  private readSlot(slot: number): SaveFile | null {
    try {
      const raw = localStorage.getItem(this.slotKey(slot));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveFile | SaveData;
      // Tolerate a bare SaveData (pre-wrapper format).
      if ('data' in parsed && parsed.data) return parsed as SaveFile;
      return { v: 1, when: 0, room: '', data: parsed as SaveData };
    } catch {
      return null;
    }
  }

  /** One-time migration of the old single-save key into the quick slot. */
  migrateLegacySave(): void {
    try {
      const raw = localStorage.getItem(LEGACY_SAVE_KEY);
      if (raw && !localStorage.getItem(this.slotKey(0))) {
        const data = JSON.parse(raw) as SaveData;
        const file: SaveFile = { v: 1, when: Date.now(), room: data.currentRoom ?? '', data };
        localStorage.setItem(this.slotKey(0), JSON.stringify(file));
      }
      localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch {
      /* ignore */
    }
  }

  save(slot = 0): boolean {
    try {
      const player = this.roomScene.actors.get(this.state.activeChar);
      if (player) {
        this.state.playerPos = { x: player.x, y: player.y };
        this.state.playerFacing = player.facing;
      }
      const file: SaveFile = {
        v: 1,
        when: Date.now(),
        room: this.rooms[this.state.currentRoom]?.name ?? this.state.currentRoom,
        data: this.state.toSave(),
      };
      localStorage.setItem(this.slotKey(slot), JSON.stringify(file));
      this.events.emit('saves'); // slot listings refresh
      return true;
    } catch {
      return false;
    }
  }

  private applyLoaded(data: SaveData): void {
    this.state = GameState.fromSave(data, this.playerId);
    this.clearSelection();
    this.resetBusy();
    this.dialogMode = false;
    this.events.emit('party');
  }

  /** Load a save into the running game. Async because the saved room's lazy
   *  assets may need fetching first. */
  async load(slot = 0): Promise<boolean> {
    const file = this.readSlot(slot);
    if (!file) return false;
    this.applyLoaded(file.data);
    await this.roomScene.enterRoom(this.state.currentRoom, undefined, {
      pos: this.state.playerPos ?? undefined,
      facing: this.state.playerFacing,
    });
    return true;
  }

  /** Synchronous "is there a save in this slot?" without loading it. */
  canLoad(slot = 0): boolean {
    return this.readSlot(slot) !== null;
  }

  hasSave(slot?: number): boolean {
    if (slot !== undefined) return this.readSlot(slot) !== null;
    for (let s = 0; s < SAVE_SLOTS; s++) if (this.readSlot(s) !== null) return true;
    return false;
  }

  deleteSave(slot: number): void {
    try {
      localStorage.removeItem(this.slotKey(slot));
      this.events.emit('saves');
    } catch {
      /* ignore */
    }
  }

  /** Slot metadata for save/load UIs; null entries are empty slots. */
  listSaves(): Array<{ slot: number; when: number; room: string } | null> {
    const out: Array<{ slot: number; when: number; room: string } | null> = [];
    for (let s = 0; s < SAVE_SLOTS; s++) {
      const f = this.readSlot(s);
      out.push(f ? { slot: s, when: f.when, room: f.room } : null);
    }
    return out;
  }

  /** The most recently written slot, or null if there are no saves. */
  latestSlot(): number | null {
    let best: number | null = null;
    let bestWhen = -1;
    for (let s = 0; s < SAVE_SLOTS; s++) {
      const f = this.readSlot(s);
      if (f && f.when >= bestWhen) {
        bestWhen = f.when;
        best = s;
      }
    }
    return best;
  }

  /** Player position/facing staged by loadForStart(), consumed by the room
   *  scene's first loadRoom. */
  pendingRestore: { pos?: { x: number; y: number }; facing?: Facing } | null = null;

  /** Stage a saved game before the room scene exists (the title screen's
   *  Continue): state is restored now, the room loads when 'room' starts.
   *  Without a slot argument, the most recent save wins. */
  loadForStart(slot?: number): boolean {
    const s = slot ?? this.latestSlot();
    if (s === null) return false;
    const file = this.readSlot(s);
    if (!file) return false;
    this.applyLoaded(file.data);
    this.pendingRestore = {
      pos: this.state.playerPos ?? undefined,
      facing: this.state.playerFacing,
    };
    return true;
  }
}

export const engine = new Engine();
