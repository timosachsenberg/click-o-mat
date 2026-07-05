import Phaser from 'phaser';
import { engine } from './Engine';
import { Actor } from './Actor';
import { WalkArea } from './Pathfinder';
import { pointInPolygon } from './geometry';
import { makeCanvasTex, redrawCanvasTex } from './canvasTex';
import { audio } from './Audio';
import { queueManifest, registerManifestAnims, runLoader } from './assetLoader';
import { DEFAULT_RESPONSES } from './verbs';
import { GAME_W, ROOM_H } from './constants';
import type {
  AmbientDef,
  Facing,
  HotspotDef,
  LayerDef,
  RegionDef,
  RoomDef,
  Script,
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

  private layerObjs = new Map<
    string,
    Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite
  >();
  /** Tiled scrolling layers (rain/water/fog), advanced each frame. */
  private tileLayers: Array<{ obj: Phaser.GameObjects.TileSprite; sx: number; sy: number }> = [];
  private ambientTimers: Phaser.Time.TimerEvent[] = [];
  /** Bumped on every room change so in-flight ambients stop rescheduling. */
  private ambientEpoch = 0;
  /** Region ids the player currently stands in (transient, per room). */
  private regionInside = new Set<string>();
  private hoverHotspot: HotspotDef | null = null;
  /** Tab-held hotspot name labels (public so tests can observe them). */
  hotspotLabels: Phaser.GameObjects.Container | null = null;
  private lastClick = { time: 0, x: 0, y: 0 };
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
    this.input.keyboard?.on('keydown-F1', () => this.toggleDebug());

    // Hold Tab: label every visible hotspot (the pixel-hunting killer).
    this.input.keyboard?.addCapture('TAB');
    this.input.keyboard?.on('keydown-TAB', () => this.showHotspotLabels());
    this.input.keyboard?.on('keyup-TAB', () => {
      this.hotspotLabels?.destroy();
      this.hotspotLabels = null;
    });

    // Continue from the title screen: state was already restored, we just
    // start in the saved room at the saved position.
    void this.bootFirstRoom();
  }

  private async bootFirstRoom(): Promise<void> {
    const restore = engine.pendingRestore;
    engine.pendingRestore = null;
    if (restore) await this.enterRoom(engine.state.currentRoom, undefined, restore);
    else await this.enterRoom(engine.startRoom, engine.startEntry);
  }

  /** Load a room's lazy assets, then load the room (no fade). Use this — not
   *  loadRoom directly — for save-loads and scripted jumps, so lazy per-room
   *  assets are always present before the room builds. */
  async enterRoom(roomId: string, entryId?: string, restore?: RestoreInfo): Promise<void> {
    await this.ensureRoomAssets(roomId);
    this.loadRoom(roomId, entryId, restore);
  }

  /** Load a room's lazy asset bundle (idempotent; cached after first load).
   *  Shows a brief "Loading…" overlay only if the load takes a moment. */
  async ensureRoomAssets(roomId: string): Promise<void> {
    if (engine.loadedRooms.has(roomId)) return;
    const def = engine.rooms[roomId];
    const queued = queueManifest(this, def?.assets);
    if (queued) {
      // Only flash the indicator if loading is slow (real PNGs on a cold
      // cache); fast/procedural loads never show it.
      const overlay = this.add
        .container(0, 0)
        .setDepth(60000)
        .setScrollFactor(0)
        .setVisible(false);
      overlay.add(this.add.rectangle(0, 0, GAME_W, ROOM_H, 0x000000, 0.85).setOrigin(0));
      overlay.add(
        this.add
          .text(GAME_W / 2, ROOM_H / 2, 'Loading…', {
            fontFamily: 'Verdana, Arial, sans-serif',
            fontSize: '22px',
            color: '#c9f0ff',
          })
          .setOrigin(0.5)
      );
      const timer = this.time.delayedCall(180, () => overlay.setVisible(true));
      await runLoader(this);
      timer.remove();
      overlay.destroy();
    }
    registerManifestAnims(this, def?.assets);
    engine.loadedRooms.add(roomId);
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
    this.tileLayers = [];
    this.debugGfx = null;
    this.hotspotLabels = null; // destroyed with the room's children
    this.hoverHotspot = null;

    this.roomDef = def;
    this.roomSize = def.size ?? { w: GAME_W, h: ROOM_H };
    // (currentRoom for the active character is set once the player spawns,
    // below — so the "spawn at parked position" check can compare rooms.)

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

    // Active player character. Prefer an explicit restore, else its parked
    // position, else the room's entry point.
    const activeId = engine.state.activeChar;
    const stored = engine.state.chars[activeId];
    const entry = def.entries[entryId ?? ''] ?? Object.values(def.entries)[0];
    const useStored = !restore && !entryId && stored?.pos && stored.room === roomId;
    const px = restore?.pos?.x ?? (useStored ? stored.pos!.x : entry?.x) ?? GAME_W / 2;
    const py = restore?.pos?.y ?? (useStored ? stored.pos!.y : entry?.y) ?? ROOM_H - 60;
    const pFacing = restore?.facing ?? (useStored ? stored.facing : entry?.facing) ?? 'down';
    const playerDef = engine.actors[activeId];
    const player = new Actor(this, playerDef, px, py, pFacing);
    player.applyPerspective(def.scaling);
    this.actors.set(playerDef.id, player);
    // Persist the active character's location for this room.
    engine.state.currentRoom = roomId;
    engine.state.playerPos = { x: px, y: py };
    engine.state.playerFacing = pFacing;

    // Follow the player through scrolling rooms; snap to them immediately so
    // entering a room never starts with a camera swoosh.
    cam.startFollow(player.sprite, false, 0.12, 0.12);
    cam.centerOn(px, py);

    // Regions: seed containment from the spawn position — standing inside a
    // region at room entry must not fire its onEnter.
    this.regionInside.clear();
    for (const region of def.regions ?? []) {
      if ((region.active?.(engine.state) ?? true) && regionContains(region, { x: px, y: py })) {
        this.regionInside.add(region.id);
      }
    }

    // Co-located party members (other than the active one) stand parked at
    // their stored positions; they're clickable to switch to / pass items.
    for (const id of engine.state.party) {
      if (id === activeId) continue;
      const cs = engine.state.chars[id];
      if (!cs || cs.room !== roomId || !cs.pos) continue;
      const mate = new Actor(this, engine.actors[id], cs.pos.x, cs.pos.y, cs.facing);
      mate.applyPerspective(def.scaling);
      this.actors.set(id, mate);
    }

    // Room NPCs (skip any that are party members — those are spawned above).
    for (const placement of def.actors ?? []) {
      if (engine.state.party.includes(placement.id)) continue;
      const adef = engine.actors[placement.id];
      const npc = new Actor(this, adef, placement.x, placement.y, placement.facing ?? 'down');
      npc.applyPerspective(def.scaling);
      this.actors.set(adef.id, npc);
    }

    engine.events.emit('hover', null);

    // Decide narration now (first entry, commentary on) — before onEnter runs.
    const narrate = !!def.features?.length && engine.shouldNarrate(def.id);
    if (def.onEnter || narrate) {
      engine.beginBusy();
      void (async () => {
        try {
          if (def.onEnter) await def.onEnter(engine.makeContext());
          if (narrate) await this.narrateFeatures(def);
        } finally {
          engine.endBusy();
        }
      })();
    }

    for (const ambient of def.ambients ?? []) this.scheduleAmbient(ambient);
  }

  /** "Director's commentary": the player names the engine features this room
   *  demonstrates, in one skippable speech bubble. */
  async narrateFeatures(def: RoomDef): Promise<void> {
    if (!def.features?.length) return;
    await engine.makeContext().playerSay(
      `(Commentary — this room shows off: ${def.features.join('; ')}.)`
    );
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
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite {
    const sources = [layer.image, layer.paint, layer.anim].filter((s) => s !== undefined);
    if (sources.length !== 1) {
      throw new Error(
        `Layer "${layer.id}" in room "${roomId}" must have exactly one of image/paint/anim`
      );
    }
    const x = layer.x ?? 0;
    const y = layer.y ?? 0;
    let obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite;

    if (layer.tile) {
      // An infinitely-scrolling tiled texture (rain, water, fog, skies).
      if (!layer.image) throw new Error(`Layer "${layer.id}": tile requires an image`);
      const ts = this.add
        .tileSprite(x, y, layer.w ?? this.roomSize.w, layer.h ?? this.roomSize.h, layer.image)
        .setOrigin(0);
      if (layer.tile.scale) ts.setTileScale(layer.tile.scale);
      this.tileLayers.push({ obj: ts, sx: layer.tile.scrollX ?? 0, sy: layer.tile.scrollY ?? 0 });
      obj = ts;
    } else if (layer.paint) {
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
    if (layer.alpha !== undefined) obj.setAlpha(layer.alpha);
    obj.setVisible(layer.visible ? !!layer.visible(engine.state) : true);
    obj.setData('layer', layer);
    return obj;
  }

  /** Live Phaser object of a layer — for transient cutscene tweens; durable
   *  changes belong in flags + repaint(). */
  layerObj(
    id: string
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite {
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
    // Parting hook of the room being left (bookkeeping, one-liners).
    const exit = this.roomDef?.onExit;
    if (exit) await exit(engine.makeContext());
    // If a cutscene left the camera zoomed, snap back so the fade overlay
    // (scrollFactor 0, but still zoom-scaled by Phaser) covers the viewport.
    this.cameras.main.setZoom(1);
    await this.fade(1);
    await this.ensureRoomAssets(roomId); // lazy per-room assets, under the fade
    this.loadRoom(roomId, entryId);
    engine.autosave(); // every room transition refreshes the AUTO slot
    await this.fade(0);
  }

  private fade(to: number): Promise<void> {
    this.fadeRect.setAlpha(1 - to);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.fadeRect,
        alpha: to,
        duration: engine.skipping ? 40 : 220,
        onComplete: () => resolve(),
      });
    });
  }

  /** Jump every in-flight walk to its destination (cutscene skip). */
  finishWalks(): void {
    for (const actor of this.actors.values()) actor.finishWalk();
  }

  // ---- regions (walk-on triggers) ------------------------------------------

  /** Fire enter/exit scripts as the player crosses region boundaries. Only
   *  player-driven movement fires: during cutscenes/dialog/menu (or a skip)
   *  containment updates silently so no stale burst fires afterwards. */
  private checkRegions(): void {
    const regions = this.roomDef.regions;
    if (!regions?.length) return;
    const player = this.player;
    if (!player) return;
    const canFire =
      (!engine.busy || engine.interruptible) &&
      !engine.dialogMode &&
      !engine.menuOpen &&
      !engine.skipping;
    const feet = { x: player.x, y: player.y };

    for (const region of regions) {
      const inside = (region.active?.(engine.state) ?? true) && regionContains(region, feet);
      const was = this.regionInside.has(region.id);
      if (inside === was) continue;
      if (inside) this.regionInside.add(region.id);
      else this.regionInside.delete(region.id);
      if (!canFire) continue;

      const script = inside ? region.onEnter : region.onExit;
      if (!script) continue;
      if (region.once) {
        const key = `region:${this.roomDef.id}:${region.id}:${inside ? 'enter' : 'exit'}`;
        if (engine.state.getFlag(key)) continue;
        engine.state.setFlag(key);
      }
      this.fireRegion(script);
    }
  }

  /** Run a region script as a cutscene: stop the player's current walk (its
   *  owner releases its own busy count) and lock input for the script. */
  private fireRegion(script: Script): void {
    this.player?.stop();
    engine.interruptible = false;
    engine.beginBusy();
    void (async () => {
      try {
        await script(engine.makeContext());
      } finally {
        engine.endBusy();
      }
    })();
  }

  // ---- input -------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (engine.menuOpen) return; // options menu captures all input
    if (pointer.y >= ROOM_H) return; // UI band: handled by UIScene
    if (engine.dialogMode) {
      engine.events.emit('skipLine');
      return;
    }
    // Double-click while the player is auto-walking: break into a run
    // (a fast real walk, so regions and onExit staging still fire — never a
    // teleport).
    const now = performance.now();
    const isDouble =
      now - this.lastClick.time < 350 &&
      Math.hypot(pointer.x - this.lastClick.x, pointer.y - this.lastClick.y) < 40;
    this.lastClick = { time: now, x: pointer.x, y: pointer.y };
    if (isDouble && engine.busy && engine.interruptible) {
      const player = this.player;
      if (player) player.sprint = true;
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
    const rightClick = pointer.rightButtonDown();

    // Clicking a co-located party member: pass an armed item (give), or switch
    // control to them (plain click).
    const mate = this.partyMemberAt(point);
    if (mate && !rightClick) {
      if (engine.pendingItem && engine.pendingItemVerb === 'give') {
        // If the member has a content hotspot with a give handler, run it (a
        // scripted exchange); otherwise just transfer the item.
        const bound = this.roomDef.hotspots.find(
          (h) => h.actor === mate.def.id && (!h.visible || h.visible(engine.state))
        );
        if (bound) void this.performVerb(bound, 'give', engine.pendingItem);
        else void this.passItemTo(mate.def.id, engine.pendingItem);
        return;
      }
      if (!engine.pendingItem && !engine.selectedVerb) {
        void engine.switchTo(mate.def.id);
        return;
      }
    }

    const hotspot = this.hotspotAt(point);

    if (hotspot) {
      if (engine.pendingItem && engine.pendingItemVerb) {
        void this.performVerb(hotspot, engine.pendingItemVerb, engine.pendingItem);
      } else if (rightClick) {
        void this.performVerb(hotspot, hotspot.defaultVerb ?? 'lookat');
      } else if (engine.selectedVerb) {
        void this.performVerb(hotspot, engine.selectedVerb);
      } else if (hotspot.defaultVerb) {
        // Smart click: plain left-click performs the obvious action
        // (open the door, pick up the thing, talk to them).
        void this.performVerb(hotspot, hotspot.defaultVerb);
      } else {
        void this.walkPlayer(hotspot.walkTo ?? point);
      }
    } else {
      void this.walkPlayer(point);
    }
  }

  /** While Tab is held: name labels over every visible hotspot. */
  private showHotspotLabels(): void {
    if (this.hotspotLabels || engine.dialogMode || engine.menuOpen || !this.roomDef) return;
    const container = this.add.container(0, 0).setDepth(45000);
    for (const hs of this.roomDef.hotspots) {
      if (hs.visible && !hs.visible(engine.state)) continue;
      let cx: number | null = null;
      let cy: number | null = null;
      if (hs.actor) {
        const a = this.actors.get(hs.actor);
        if (a) {
          cx = a.x;
          cy = a.y - a.sprite.displayHeight * 0.6;
        }
      } else if (hs.rect) {
        cx = hs.rect.x + hs.rect.w / 2;
        cy = hs.rect.y + hs.rect.h / 2;
      } else if (hs.polygon) {
        cx = hs.polygon.reduce((s, p) => s + p.x, 0) / hs.polygon.length;
        cy = hs.polygon.reduce((s, p) => s + p.y, 0) / hs.polygon.length;
      }
      if (cx === null || cy === null) continue;
      container.add(
        this.add
          .text(cx, cy, hs.name, {
            fontFamily: 'Verdana, Arial, sans-serif',
            fontSize: '13px',
            color: '#ffe066',
            stroke: '#000000',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
      );
    }
    this.hotspotLabels = container;
  }

  /** Re-point camera + state to the newly active character (same-room switch;
   *  the character is already an actor in the room). */
  retargetPlayer(): void {
    const player = this.player;
    if (!player) return;
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.startFollow(player.sprite, false, 0.12, 0.12);
    cam.centerOn(player.x, player.y);
    engine.state.currentRoom = this.roomDef.id;
    engine.state.playerPos = { x: player.x, y: player.y };
    engine.state.playerFacing = player.facing;
    engine.events.emit('hover', null);
  }

  /** A co-located party member (not the active one) under the point, if any. */
  private partyMemberAt(p: Vec2): Actor | null {
    for (const id of engine.state.party) {
      if (id === engine.state.activeChar) continue;
      const a = this.actors.get(id);
      if (!a) continue;
      const b = a.sprite.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 6, 6);
      if (b.contains(p.x, p.y)) return a;
    }
    return null;
  }

  /** Walk the active character to a party member and hand over an item. */
  private async passItemTo(charId: string, item: string): Promise<void> {
    const player = this.player;
    const mate = this.actors.get(charId);
    if (!player || !mate) return;
    const seq = ++this.interactionSeq;
    engine.beginBusy();
    try {
      engine.interruptible = true;
      const side = player.x <= mate.x ? -1 : 1;
      const gap = 55 * mate.sprite.scale + 25;
      const res = await player.walkTo({ x: mate.x + side * gap, y: mate.y }, this.walkArea);
      if (seq !== this.interactionSeq) return;
      engine.interruptible = false;
      if (res === 'cancelled') return;
      player.setFacing(facingBetween(player, mate));
      mate.setFacing(facingBetween(mate, player));
      engine.state.transferItem(item, engine.state.activeChar, charId);
      engine.events.emit('ui');
      const itemName = engine.items[item]?.name ?? item;
      const charName = engine.actors[charId]?.name ?? charId;
      engine.uiScene.toast(`Gave ${itemName} to ${charName}.`);
    } finally {
      engine.endBusy();
      if (seq === this.interactionSeq) {
        engine.interruptible = false;
        engine.clearSelection();
      }
    }
  }

  private get player(): Actor | undefined {
    return this.actors.get(engine.state.activeChar);
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
      const targetActor = hotspot.actor ? this.actors.get(hotspot.actor) : undefined;
      // Approach point: explicit walkTo, or computed beside a bound actor.
      let walkTarget = hotspot.walkTo;
      if (!walkTarget && targetActor) {
        const side = player.x <= targetActor.x ? -1 : 1;
        const gap = 55 * targetActor.sprite.scale + 25;
        walkTarget = { x: targetActor.x + side * gap, y: targetActor.y };
      }

      if (walkTarget) {
        engine.interruptible = true;
        const result = await player.walkTo(walkTarget, this.walkArea);
        if (seq !== this.interactionSeq) return; // superseded by a newer click
        engine.interruptible = false;
        if (result === 'cancelled') return;
        if (result === 'blocked') {
          await player.say("I can't get over there.");
          return;
        }
        if (hotspot.facing) player.setFacing(hotspot.facing);
        else if (targetActor) player.setFacing(facingBetween(player, targetActor));
        else player.setFacing(this.faceToward(player, hotspot));
      }

      // A bound actor pauses its stroll and turns to the player.
      if (targetActor) {
        targetActor.stop();
        targetActor.setFacing(facingBetween(targetActor, player));
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
    const list = this.roomDef.hotspots;
    const shown = (hs: HotspotDef) => !hs.visible || hs.visible(engine.state);
    // Actor-bound hotspots first: clicking directly on a character should
    // reach the character, not an overlapping static hotspot behind it.
    for (let i = list.length - 1; i >= 0; i--) {
      const hs = list[i];
      if (!hs.actor || !shown(hs)) continue;
      const a = this.actors.get(hs.actor);
      if (!a) continue;
      const b = a.sprite.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 6, 6);
      if (b.contains(p.x, p.y)) return hs;
    }
    // Then static hotspots; later ones are "on top".
    for (let i = list.length - 1; i >= 0; i--) {
      const hs = list[i];
      if (hs.actor || !shown(hs)) continue;
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
    const dt = delta / 1000;
    for (const { obj, sx, sy } of this.tileLayers) {
      // Subtract: increasing tilePosition scrolls the sampled texture the
      // opposite way, so positive scrollX/scrollY read intuitively as the
      // content moving right / DOWN (rain falls).
      obj.tilePositionX -= sx * dt;
      obj.tilePositionY -= sy * dt;
    }
    for (const actor of this.actors.values()) {
      actor.update(delta, this.roomDef.scaling);
    }
    this.checkRegions();
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
      if (hs.actor) {
        const a = this.actors.get(hs.actor);
        if (a) {
          const b = a.sprite.getBounds();
          g.strokeRect(b.x - 6, b.y - 6, b.width + 12, b.height + 12);
        }
        continue;
      }
      if (hs.rect) g.strokeRect(hs.rect.x, hs.rect.y, hs.rect.w, hs.rect.h);
      if (hs.polygon) {
        g.strokePoints(hs.polygon.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
      }
      if (hs.walkTo) {
        g.strokeCircle(hs.walkTo.x, hs.walkTo.y, 4);
      }
    }
    g.lineStyle(2, 0x00ccff, 0.8);
    for (const region of this.roomDef.regions ?? []) {
      if (region.active && !region.active(engine.state)) continue;
      if (region.rect) g.strokeRect(region.rect.x, region.rect.y, region.rect.w, region.rect.h);
      if (region.polygon) {
        g.strokePoints(region.polygon.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
      }
    }
  }
}

/** Dominant-axis facing from one actor toward another. */
function facingBetween(from: Actor, to: Actor): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function regionContains(region: RegionDef, p: Vec2): boolean {
  if (region.rect) {
    const r = region.rect;
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return true;
  }
  if (region.polygon && pointInPolygon(p, region.polygon)) return true;
  return false;
}
