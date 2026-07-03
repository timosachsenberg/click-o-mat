import type { Facing } from './types';

export interface SaveData {
  flags: Record<string, unknown>;
  inventory: string[];
  usedChoices: string[];
  currentRoom: string;
  playerPos: { x: number; y: number } | null;
  playerFacing: Facing;
}

/** All persistent game state: flags, inventory, dialog history, location. */
export class GameState {
  flags: Record<string, unknown> = {};
  inventory: string[] = [];
  /** Keys of dialog choices marked `once` that were already picked. */
  usedChoices: string[] = [];
  currentRoom = '';
  playerPos: { x: number; y: number } | null = null;
  playerFacing: Facing = 'down';

  getFlag<T = unknown>(key: string): T | undefined {
    return this.flags[key] as T | undefined;
  }

  setFlag(key: string, value: unknown = true): void {
    this.flags[key] = value;
  }

  hasItem(id: string): boolean {
    return this.inventory.includes(id);
  }

  addItem(id: string): void {
    if (!this.hasItem(id)) this.inventory.push(id);
  }

  removeItem(id: string): void {
    this.inventory = this.inventory.filter((i) => i !== id);
  }

  toSave(): SaveData {
    return {
      flags: { ...this.flags },
      inventory: [...this.inventory],
      usedChoices: [...this.usedChoices],
      currentRoom: this.currentRoom,
      playerPos: this.playerPos ? { ...this.playerPos } : null,
      playerFacing: this.playerFacing,
    };
  }

  static fromSave(data: SaveData): GameState {
    const s = new GameState();
    s.flags = { ...data.flags };
    s.inventory = [...data.inventory];
    s.usedChoices = [...data.usedChoices];
    s.currentRoom = data.currentRoom;
    s.playerPos = data.playerPos ? { ...data.playerPos } : null;
    s.playerFacing = data.playerFacing ?? 'down';
    return s;
  }
}
