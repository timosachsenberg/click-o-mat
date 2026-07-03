import Phaser from 'phaser';
import { engine } from './Engine';
import { Actor } from './Actor';
import { WalkArea } from './Pathfinder';
import { pointInPolygon } from './geometry';
import { makeCanvasTex, redrawCanvasTex } from './canvasTex';
import { audio } from './Audio';
import { DEFAULT_RESPONSES } from './verbs';
import { GAME_W, ROOM_H } from './constants';
import type {
  AmbientDef,
  Facing,
  HotspotDef,
  LayerDef,
  RoomDef,
  ScriptOrLine,
  Vec2,
  VerbId,
} from './types';

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
  /** World size of the current room (defaults to one screen). */
  roomSize = { w: GAME_W, h: ROOM_H };

  private layerObjs = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>();
  private ambientTimers: Phaser.Time.TimerEvent[] = [];
  /** Bumped on every room change so in-flight ambients stop rescheduling. */
  private ambientEpoch = 0;
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
    audio.attachScene(this);
    this.scene.launch('ui');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      audio.resume(); // browsers unlock audio only after a user gesture
      this.onPointerDown(pointer);
    });
    this.input.keyboard?.on('keydown-D', () => this.toggleDebug());

    this.loadRoom(engine.startRoom, engine.startEntry);
  }

  // ---- room lifecycle ----------------------------------------------------

  loadRoom(roomId: string, entryId?: string, restore?: RestoreInfo): void {
    const def = engine.rooms[roomId];
    if (!def) throw new Error(`Unknown room: ${roomId}`);

    this.cameras.main.stopFollow();
    this.ambientEpoch++;
    for (const t of this.ambientTimers) t.remove();
    this.ambientTimers = [];
    for (const actor of this.actors.values()) actor.destroy();
    this.actors.clear();
    this.children.removeAll(true);
    this.layerObjs.clear();
    this.debugGfx = null;
    this.hoverHotspot = null;

    this.roomDef = def;
    this.roomSize = def.size ?? { w: GAME_W, h: ROOM_H };
    engine.state.currentRoom = roomId;

    // Camera: the room band of the screen is a window onto the room's world.
    // Rooms exactly one screen large never scroll (bounds pin the camera).
    const cam = this.cameras.main;
    cam.setViewport(0, 0, GAME_W, ROOM_H);
    cam.setBounds(0, 0, this.roomSize.w, this.roomSize.h);
    cam.setZoom(1); // zoom is a cutscene-scoped effect; rooms start at 1:1

    // Crossfade to this room's music (if it declares one).
    if (def.music !== undefined) audio.playMusic(def.music);

    // Build the layer stack. All layers share one depth axis with the actors:
    // BEHIND < feet-y occluder baselines < FRONT.
    for (const layer of def.layers) {
      this.layerObjs.set(layer.id, this.buildLayer(roomId, layer));
    }

    this.rebuildWalkArea();

    // Fade overlay for room transitions: pinned to the camera, always on top.
    this.fadeRect = this.add
      .rectangle(0, 0, GAME_W, ROOM_H, 0x000000)
      .setOrigin(0)
      .setDepth(50000)
      .setScrollFactor(0)
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

    // Follow the player through scrolling rooms; snap to them immediately so
    // entering a room never starts with a camera swoosh.
    cam.startFollow(player.sprite, false, 0.12, 0.12);
    cam.centerOn(px, py);

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
      engine.beginBusy();
      void (async () => {
        try {
          await script(engine.makeContext());
        } finally {
          engine.endBusy();
        }
      })();
    }

    for (const ambient of def.ambients ?? []) this.scheduleAmbient(ambient);
  }

  /** Run an ambient on a randomized interval. Ambients never touch the busy
   *  count (they must not lock input) and stop rescheduling once the room
   *  changes; an in-flight run that outlives its room just errors into the
   *  catch when it touches torn-down objects. */
  private scheduleAmbient(ambient: AmbientDef): void {
    const epoch = this.ambientEpoch;
    const [min, max] = ambient.every;
    const timer = this.time.delayedCall(min + Math.random() * (max - min), () => {
      void (async () => {
        try {
          await ambient.run(engine.makeContext());
        } catch {
          // staging only — a room change mid-run is not an error
        }
        if (epoch === this.ambientEpoch) this.scheduleAmbient(ambient);
      })();
    });
    this.ambientTimers.push(timer);
  }

  /** Create the Phaser object for one layer definition. */
  private buildLayer(
    roomId: string,
    layer: LayerDef
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
    const sources = [layer.image, layer.paint, layer.anim].filter((s) => s !== undefined);
    if (sources.length !== 1) {
      throw new Error(
        `Layer "${layer.id}" in room "${roomId}" must have exactly one of image/paint/anim`
      );
    }
    const x = layer.x ?? 0;
    const y = layer.y ?? 0;
    let obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

    if (layer.paint) {
      const paint = layer.paint;
      const key = `room-layer-${roomId}-${layer.id}`;
      makeCanvasTex(this, key, layer.w ?? this.roomSize.w, layer.h ?? this.roomSize.h, (g) =>
        paint(g, engine.state)
      );
      obj = this.add.image(x, y, key).setOrigin(0);
    } else if (layer.anim) {
      const anim = this.anims.get(layer.anim);
      if (!anim) throw new Error(`Layer "${layer.id}": unknown animation "${layer.anim}"`);
      const first = anim.frames[0];
      const sprite = this.add.sprite(x, y, first.textureKey, first.textureFrame).setOrigin(0);
      sprite.play(layer.anim);
      if (layer.w && layer.h) sprite.setDisplaySize(layer.w, layer.h);
      obj = sprite;
    } else {
      obj = this.add.image(x, y, layer.image!).setOrigin(0);
      if (layer.w && layer.h) obj.setDisplaySize(layer.w, layer.h);
    }

    obj.setDepth(layer.depth);
    if (layer.parallax !== undefined) obj.setScrollFactor(layer.parallax);
    obj.setVisible(layer.visible ? !!layer.visible(engine.state) : true);
    obj.setData('layer', layer);
    return obj;
  }

  /** Live Phaser object of a layer — for transient cutscene tweens; durable
   *  changes belong in flags + repaint(). */
  layerObj(id: string): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
    const obj = this.layerObjs.get(id);
    if (!obj) throw new Error(`No layer "${id}" in room "${this.roomDef.id}"`);
    return obj;
  }

  /** Re-run the room's paint layers, visibility conditions, and walk-area
   *  builders against current state (e.g. after picking something up). */
  repaintRoom(): void {
    const def = this.roomDef;
    for (const [id, obj] of this.layerObjs) {
      const layer = obj.getData('layer') as LayerDef;
      if (layer.paint) {
        const paint = layer.paint;
        redrawCanvasTex(this, `room-layer-${def.id}-${id}`, (g) => paint(g, engine.state));
      }
      obj.setVisible(layer.visible ? !!layer.visible(engine.state) : true);
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
    // If a cutscene left the camera zoomed, snap back so the fade overlay
    // (scrollFactor 0, but still zoom-scaled by Phaser) covers the viewport.
    this.cameras.main.setZoom(1);
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
    if (engine.menuOpen) return; // options menu captures all input
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

    // Screen → world: in scrolling rooms the camera offsets everything.
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const point = { x: wp.x, y: wp.y };
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
    engine.beginBusy();
    engine.interruptible = true;
    try {
      await player.walkTo(target, this.walkArea);
    } finally {
      engine.endBusy(); // always pairs with our own beginBusy
      if (seq === this.interactionSeq) {
        engine.interruptible = false;
      }
    }
  }

  /** Full interaction: walk to the hotspot, face it, run the handler. */
  async performVerb(hotspot: HotspotDef, verb: VerbId | 'use' | 'give', itemId?: string): Promise<void> {
    const player = this.player;
    if (!player) return;
    const seq = ++this.interactionSeq;
    engine.beginBusy();
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
      engine.endBusy(); // always pairs with our own beginBusy
      if (seq === this.interactionSeq) {
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
    // Hover tracking for the sentence line (screen → world for hit-testing).
    const pointer = this.input.activePointer;
    let hover: HotspotDef | null = null;
    if (pointer.y < ROOM_H && !engine.dialogMode && !engine.menuOpen) {
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      hover = this.hotspotAt({ x: wp.x, y: wp.y });
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
