import Phaser from 'phaser';
import { engine } from './Engine';
import { Actor } from './Actor';
import { WalkArea } from './Pathfinder';
import { pointInPolygon } from './geometry';
import { makeCanvasTex, redrawCanvasTex } from './canvasTex';
import { DEFAULT_RESPONSES } from './verbs';
import { GAME_W, ROOM_H } from './constants';
import type { Facing, HotspotDef, RoomDef, ScriptOrLine, Vec2, VerbId } from './types';

interface RestoreInfo {
  pos?: Vec2;
  facing?: Facing;
}

/**
 * Hosts the current room: background, walk-behind props, actors, hotspot
 * hit-testing and the verb-interaction state machine.
 */
export class RoomScene extends Phaser.Scene {
  actors = new Map<string, Actor>();
  walkArea!: WalkArea;
  roomDef!: RoomDef;

  private walkBehindImages: Phaser.GameObjects.Image[] = [];
  private hoverHotspot: HotspotDef | null = null;
  private debugGfx: Phaser.GameObjects.Graphics | null = null;
  private fadeRect!: Phaser.GameObjects.Rectangle;
  /** Guards against a cancelled interaction clobbering a newer one's state. */
  private interactionSeq = 0;

  constructor() {
    super('room');
  }

  create(): void {
    engine.roomScene = this;
    this.scene.launch('ui');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onPointerDown(pointer);
    });
    this.input.keyboard?.on('keydown-D', () => this.toggleDebug());

    this.loadRoom(engine.startRoom, engine.startEntry);
  }

  // ---- room lifecycle ----------------------------------------------------

  loadRoom(roomId: string, entryId?: string, restore?: RestoreInfo): void {
    const def = engine.rooms[roomId];
    if (!def) throw new Error(`Unknown room: ${roomId}`);

    for (const actor of this.actors.values()) actor.destroy();
    this.actors.clear();
    this.children.removeAll(true);
    this.walkBehindImages = [];
    this.debugGfx = null;
    this.hoverHotspot = null;

    this.roomDef = def;
    engine.state.currentRoom = roomId;

    // Background (painted into a canvas texture so it can react to state).
    const bgKey = `room-bg-${roomId}`;
    makeCanvasTex(this, bgKey, GAME_W, ROOM_H, (g) => def.paint(g, engine.state));
    this.add.image(0, 0, bgKey).setOrigin(0).setDepth(-1000);

    // Walk-behind props: depth equals their floor line so actors sort around them.
    for (const wb of def.walkBehinds ?? []) {
      const key = `room-wb-${roomId}-${wb.key}`;
      makeCanvasTex(this, key, wb.w, wb.h, (g) => wb.draw(g, engine.state));
      const img = this.add.image(wb.x, wb.y, key).setOrigin(0).setDepth(wb.depthY);
      img.setData('wb', wb);
      this.walkBehindImages.push(img);
    }

    this.rebuildWalkArea();

    // Fade overlay for room transitions, always on top.
    this.fadeRect = this.add
      .rectangle(0, 0, GAME_W, ROOM_H, 0x000000)
      .setOrigin(0)
      .setDepth(50000)
      .setAlpha(0);

    // Player.
    const entry = def.entries[entryId ?? ''] ?? Object.values(def.entries)[0];
    const px = restore?.pos?.x ?? entry?.x ?? GAME_W / 2;
    const py = restore?.pos?.y ?? entry?.y ?? ROOM_H - 60;
    const pFacing = restore?.facing ?? entry?.facing ?? 'down';
    const playerDef = engine.actors[engine.playerId];
    const player = new Actor(this, playerDef, px, py, pFacing);
    player.applyPerspective(def.scaling);
    this.actors.set(playerDef.id, player);

    // Room NPCs.
    for (const placement of def.actors ?? []) {
      const adef = engine.actors[placement.id];
      const npc = new Actor(this, adef, placement.x, placement.y, placement.facing ?? 'down');
      npc.applyPerspective(def.scaling);
      this.actors.set(adef.id, npc);
    }

    engine.events.emit('hover', null);

    if (def.onEnter) {
      const script = def.onEnter;
      engine.busy = true;
      void (async () => {
        try {
          await script(engine.makeContext());
        } finally {
          engine.busy = false;
        }
      })();
    }
  }

  /** Re-run the room's paint functions and walk-area builders against
   *  current state (e.g. after picking something up or moving a prop). */
  repaintRoom(): void {
    const def = this.roomDef;
    redrawCanvasTex(this, `room-bg-${def.id}`, (g) => def.paint(g, engine.state));
    for (const img of this.walkBehindImages) {
      const wb = img.getData('wb') as NonNullable<RoomDef['walkBehinds']>[number];
      redrawCanvasTex(this, `room-wb-${def.id}-${wb.key}`, (g) => wb.draw(g, engine.state));
    }
    this.rebuildWalkArea();
    if (this.debugGfx) this.drawDebug();
  }

  private rebuildWalkArea(): void {
    const def = this.roomDef;
    const boundary = typeof def.walkArea === 'function' ? def.walkArea(engine.state) : def.walkArea;
    const holes =
      typeof def.holes === 'function' ? def.holes(engine.state) : (def.holes ?? []);
    this.walkArea = new WalkArea(boundary, holes);
  }

  async transitionTo(roomId: string, entryId?: string): Promise<void> {
    await this.fade(1);
    this.loadRoom(roomId, entryId);
    await this.fade(0);
  }

  private fade(to: number): Promise<void> {
    this.fadeRect.setAlpha(1 - to);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.fadeRect,
        alpha: to,
        duration: 220,
        onComplete: () => resolve(),
      });
    });
  }

  // ---- input -------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y >= ROOM_H) return; // UI band: handled by UIScene
    if (engine.dialogMode) {
      engine.events.emit('skipLine');
      return;
    }
    if (engine.busy) {
      if (engine.interruptible) {
        // Cancel the auto-walk phase of the current interaction...
        this.player?.stop();
        engine.interruptible = false;
      } else {
        engine.events.emit('skipLine');
        return;
      }
    }

    const point = { x: pointer.x, y: pointer.y };
    const hotspot = this.hotspotAt(point);
    const rightClick = pointer.rightButtonDown();

    if (hotspot) {
      if (engine.pendingItem && engine.pendingItemVerb) {
        void this.performVerb(hotspot, engine.pendingItemVerb, engine.pendingItem);
      } else if (rightClick) {
        void this.performVerb(hotspot, hotspot.defaultVerb ?? 'lookat');
      } else if (engine.selectedVerb) {
        void this.performVerb(hotspot, engine.selectedVerb);
      } else {
        void this.walkPlayer(hotspot.walkTo ?? point);
      }
    } else {
      void this.walkPlayer(point);
    }
  }

  private get player(): Actor | undefined {
    return this.actors.get(engine.playerId);
  }

  /** Plain interruptible walk (no verb). */
  private async walkPlayer(target: Vec2): Promise<void> {
    const player = this.player;
    if (!player) return;
    const seq = ++this.interactionSeq;
    engine.busy = true;
    engine.interruptible = true;
    try {
      await player.walkTo(target, this.walkArea);
    } finally {
      if (seq === this.interactionSeq) {
        engine.busy = false;
        engine.interruptible = false;
      }
    }
  }

  /** Full interaction: walk to the hotspot, face it, run the handler. */
  async performVerb(hotspot: HotspotDef, verb: VerbId | 'use' | 'give', itemId?: string): Promise<void> {
    const player = this.player;
    if (!player) return;
    const seq = ++this.interactionSeq;
    engine.busy = true;
    try {
      if (hotspot.walkTo) {
        engine.interruptible = true;
        const result = await player.walkTo(hotspot.walkTo, this.walkArea);
        if (seq !== this.interactionSeq) return; // superseded by a newer click
        engine.interruptible = false;
        if (result === 'cancelled') return;
        if (result === 'blocked') {
          await player.say("I can't get over there.");
          return;
        }
        if (hotspot.facing) player.setFacing(hotspot.facing);
        else player.setFacing(this.faceToward(player, hotspot));
      }

      const ctx = engine.makeContext();
      const script = this.resolveScript(hotspot, verb as VerbId, itemId);
      if (typeof script === 'string') await player.say(script);
      else if (script) await script(ctx);
    } finally {
      if (seq === this.interactionSeq) {
        engine.busy = false;
        engine.interruptible = false;
        engine.clearSelection();
      }
    }
  }

  private resolveScript(
    hotspot: HotspotDef,
    verb: VerbId,
    itemId?: string
  ): ScriptOrLine | undefined {
    if (itemId) {
      const kind = verb === 'give' ? 'give' : 'use';
      return (
        hotspot.onItem?.[kind]?.[itemId] ??
        (kind === 'give' ? "I don't think that's wanted here." : "That doesn't seem to work.")
      );
    }
    return hotspot.on?.[verb] ?? DEFAULT_RESPONSES[verb];
  }

  private faceToward(player: Actor, hotspot: HotspotDef): Facing {
    const cx = hotspot.rect
      ? hotspot.rect.x + hotspot.rect.w / 2
      : (hotspot.polygon?.reduce((s, p) => s + p.x, 0) ?? player.x) /
        (hotspot.polygon?.length || 1);
    const cy = hotspot.rect
      ? hotspot.rect.y + hotspot.rect.h / 2
      : (hotspot.polygon?.reduce((s, p) => s + p.y, 0) ?? player.y) /
        (hotspot.polygon?.length || 1);
    const dx = cx - player.x;
    const dy = cy - player.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  // ---- hover & hit-testing -----------------------------------------------

  hotspotAt(p: Vec2): HotspotDef | null {
    // Later hotspots are considered "on top".
    const list = this.roomDef.hotspots;
    for (let i = list.length - 1; i >= 0; i--) {
      const hs = list[i];
      if (hs.visible && !hs.visible(engine.state)) continue;
      if (hs.rect) {
        const r = hs.rect;
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return hs;
      }
      if (hs.polygon && pointInPolygon(p, hs.polygon)) return hs;
    }
    return null;
  }

  override update(_time: number, delta: number): void {
    if (!this.roomDef) return;
    for (const actor of this.actors.values()) {
      actor.update(delta, this.roomDef.scaling);
    }
    // Hover tracking for the sentence line.
    const pointer = this.input.activePointer;
    let hover: HotspotDef | null = null;
    if (pointer.y < ROOM_H && !engine.dialogMode) {
      hover = this.hotspotAt({ x: pointer.x, y: pointer.y });
    }
    if (hover !== this.hoverHotspot) {
      this.hoverHotspot = hover;
      engine.events.emit('hover', hover?.name ?? null);
    }
  }

  // ---- debug overlay -----------------------------------------------------

  private toggleDebug(): void {
    if (this.debugGfx) {
      this.debugGfx.destroy();
      this.debugGfx = null;
      return;
    }
    this.drawDebug();
  }

  private drawDebug(): void {
    this.debugGfx?.destroy();
    const g = this.add.graphics().setDepth(40000);
    this.debugGfx = g;

    const boundary =
      typeof this.roomDef.walkArea === 'function'
        ? this.roomDef.walkArea(engine.state)
        : this.roomDef.walkArea;
    const holes =
      typeof this.roomDef.holes === 'function'
        ? this.roomDef.holes(engine.state)
        : (this.roomDef.holes ?? []);

    g.lineStyle(2, 0x00ff66, 0.9);
    g.strokePoints(boundary.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    g.lineStyle(2, 0xff4444, 0.9);
    for (const hole of holes) {
      g.strokePoints(hole.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    }
    g.lineStyle(1, 0xffff00, 0.8);
    for (const hs of this.roomDef.hotspots) {
      if (hs.visible && !hs.visible(engine.state)) continue;
      if (hs.rect) g.strokeRect(hs.rect.x, hs.rect.y, hs.rect.w, hs.rect.h);
      if (hs.polygon) {
        g.strokePoints(hs.polygon.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
      }
      if (hs.walkTo) {
        g.strokeCircle(hs.walkTo.x, hs.walkTo.y, 4);
      }
    }
  }
}
