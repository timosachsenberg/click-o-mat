import type { Facing } from './types';

/** Per-character persistent state: where they are and what they carry. */
export interface CharState {
  room: string;
  pos: { x: number; y: number } | null;
  facing: Facing;
  inventory: string[];
}

/** Save format v2 (multi-character). v1 fields are tolerated on load and
 *  migrated into a single-character party. */
export interface SaveData {
  v?: 2;
  flags: Record<string, unknown>;
  usedChoices: string[];
  activeChar?: string;
  party?: string[];
  chars?: Record<string, CharState>;
  // ---- legacy v1 (single character) ----
  inventory?: string[];
  currentRoom?: string;
  playerPos?: { x: number; y: number } | null;
  playerFacing?: Facing;
}

function blankChar(): CharState {
  return { room: '', pos: null, facing: 'down', inventory: [] };
}

/**
 * All persistent game state. Flags and dialog history are global (a shared
 * world); location and inventory are **per character**. For single-character
 * games the party has one member and the proxied accessors below behave
 * exactly like the old flat state.
 */
export class GameState {
  flags: Record<string, unknown> = {};
  /** Keys of dialog choices marked `once` that were already picked. */
  usedChoices: string[] = [];

  /** The character the player currently controls. */
  activeChar = '';
  /** Switchable characters, in display order. Grows via addToParty(). */
  party: string[] = [];
  /** Per-character location + inventory. */
  chars: Record<string, CharState> = {};

  private char(id: string = this.activeChar): CharState {
    let c = this.chars[id];
    if (!c) {
      c = blankChar();
      this.chars[id] = c;
    }
    return c;
  }

  /** Register a character with an initial location (idempotent). */
  ensureChar(id: string, init?: Partial<CharState>): void {
    const c = this.char(id);
    if (init) Object.assign(c, init);
    if (!this.party.includes(id)) this.party.push(id);
  }

  // ---- proxied active-character accessors (backward compatible) ----------

  get inventory(): string[] {
    return this.char().inventory;
  }
  set inventory(v: string[]) {
    this.char().inventory = v;
  }
  get currentRoom(): string {
    return this.char().room;
  }
  set currentRoom(v: string) {
    this.char().room = v;
  }
  get playerPos(): { x: number; y: number } | null {
    return this.char().pos;
  }
  set playerPos(v: { x: number; y: number } | null) {
    this.char().pos = v;
  }
  get playerFacing(): Facing {
    return this.char().facing;
  }
  set playerFacing(v: Facing) {
    this.char().facing = v;
  }

  // ---- flags -------------------------------------------------------------

  getFlag<T = unknown>(key: string): T | undefined {
    return this.flags[key] as T | undefined;
  }

  setFlag(key: string, value: unknown = true): void {
    this.flags[key] = value;
  }

  // ---- inventory (defaults to the active character) ----------------------

  hasItem(id: string, char: string = this.activeChar): boolean {
    return this.char(char).inventory.includes(id);
  }

  addItem(id: string, char: string = this.activeChar): void {
    const inv = this.char(char).inventory;
    if (!inv.includes(id)) inv.push(id);
  }

  removeItem(id: string, char: string = this.activeChar): void {
    const c = this.char(char);
    c.inventory = c.inventory.filter((i) => i !== id);
  }

  inventoryOf(char: string): string[] {
    return this.char(char).inventory;
  }

  /** Move an item from one character to another. */
  transferItem(id: string, from: string, to: string): void {
    this.removeItem(id, from);
    this.addItem(id, to);
  }

  // ---- serialization -----------------------------------------------------

  toSave(): SaveData {
    const chars: Record<string, CharState> = {};
    for (const [id, c] of Object.entries(this.chars)) {
      chars[id] = { room: c.room, pos: c.pos ? { ...c.pos } : null, facing: c.facing, inventory: [...c.inventory] };
    }
    return {
      v: 2,
      flags: { ...this.flags },
      usedChoices: [...this.usedChoices],
      activeChar: this.activeChar,
      party: [...this.party],
      chars,
    };
  }

  /** Rebuild state from a save. `defaultChar` is used to migrate a v1
   *  (single-character) save into a one-member party. */
  static fromSave(data: SaveData, defaultChar: string): GameState {
    const s = new GameState();
    s.flags = { ...data.flags };
    s.usedChoices = [...(data.usedChoices ?? [])];

    if (data.chars && data.activeChar) {
      // v2 multi-character
      s.activeChar = data.activeChar;
      s.party = [...(data.party ?? [data.activeChar])];
      for (const [id, c] of Object.entries(data.chars)) {
        s.chars[id] = {
          room: c.room,
          pos: c.pos ? { ...c.pos } : null,
          facing: c.facing ?? 'down',
          inventory: [...(c.inventory ?? [])],
        };
      }
    } else {
      // v1 → single-character party
      s.activeChar = defaultChar;
      s.party = [defaultChar];
      s.chars[defaultChar] = {
        room: data.currentRoom ?? '',
        pos: data.playerPos ? { ...data.playerPos } : null,
        facing: data.playerFacing ?? 'down',
        inventory: [...(data.inventory ?? [])],
      };
    }
    return s;
  }
}
