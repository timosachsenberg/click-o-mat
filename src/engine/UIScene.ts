import Phaser from 'phaser';
import { engine, SAVE_SLOTS, SLOT_LABELS } from './Engine';
import { audio } from './Audio';
import { VERBS, verbLabel } from './verbs';
import { GAME_W, GAME_H, ROOM_H, UI_H } from './constants';
import type { VerbId } from './types';

const PANEL_BG = 0x1a1626;
const VERB_COLOR = '#8f7fd4';
const VERB_HOVER = '#ffe066';
const VERB_SELECTED = '#7dff7a';
const SENTENCE_COLOR = '#c9f0ff';
const INV_SLOTS_X = 4;
const INV_SLOTS_Y = 2;

/**
 * Persistent overlay scene: sentence line, verb grid, inventory grid,
 * dialog-choice list, and save/load hotkeys.
 */
export class UIScene extends Phaser.Scene {
  private sentenceText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private toastTimer: Phaser.Time.TimerEvent | null = null;
  private verbTexts = new Map<VerbId, Phaser.GameObjects.Text>();
  private hoverName: string | null = null;

  private invSlots: Array<{
    bg: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image;
    itemId: string | null;
  }> = [];
  private invPage = 0;
  private invPrev!: Phaser.GameObjects.Text;
  private invNext!: Phaser.GameObjects.Text;

  private gameplayUI!: Phaser.GameObjects.Container;
  /** Exposed for automated testing: the live choice text objects. */
  choiceContainer!: Phaser.GameObjects.Container;
  private choiceResolve: ((index: number) => void) | null = null;
  /** Set while paginated choices are showing; the wheel cycles pages. */
  private choiceChangePage: ((dir: number) => void) | null = null;

  constructor() {
    super('ui');
  }

  create(): void {
    engine.uiScene = this;

    this.add
      .rectangle(0, ROOM_H, GAME_W, UI_H, PANEL_BG)
      .setOrigin(0)
      .setStrokeStyle(2, 0x3a3356);

    this.sentenceText = this.add
      .text(GAME_W / 2, ROOM_H + 14, '', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '17px',
        color: SENTENCE_COLOR,
      })
      .setOrigin(0.5, 0.5);

    this.gameplayUI = this.add.container(0, 0);
    this.buildVerbGrid();
    this.buildInventory();

    this.choiceContainer = this.add.container(0, 0).setVisible(false);

    this.toastText = this.add
      .text(GAME_W / 2, ROOM_H - 24, '', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '15px',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: GAME_W - 40 }, // never spill off the sides
      })
      .setOrigin(0.5)
      .setAlpha(0);

    engine.events.on('hover', (name: string | null) => {
      this.hoverName = name;
      this.refreshSentence();
    });
    engine.events.on('ui', () => this.refresh());

    this.input.keyboard?.on('keydown-F5', () => {
      this.toast(engine.save() ? 'Quick-saved.' : 'Save failed.');
    });
    this.input.keyboard?.on('keydown-F9', () => {
      this.toast(engine.load() ? 'Quick save loaded.' : 'No quick save.');
    });

    this.buildAudioButton();
    this.buildOptionsMenu();
    this.input.keyboard?.on('keydown-M', () => this.toggleMute());

    // SCUMM-style verb hotkeys, laid out like the 3×3 grid on screen.
    const VERB_KEYS = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C'];
    VERB_KEYS.forEach((key, i) => {
      this.input.keyboard?.on(`keydown-${key}`, () => {
        if (engine.busy || engine.dialogMode || engine.menuOpen) return;
        const id = VERBS[i].id;
        engine.setVerb(engine.selectedVerb === id ? null : id);
      });
    });

    // Mouse wheel: page through dialog choices when they're showing, else
    // through the inventory.
    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
        if (engine.menuOpen) return;
        if (engine.choicesShowing && this.choiceChangePage) {
          this.choiceChangePage(dy > 0 ? 1 : -1);
          return;
        }
        if (engine.dialogMode) return;
        if (pointer.y < ROOM_H || pointer.x < 430) return;
        this.changePage(dy > 0 ? 1 : -1);
      }
    );
    this.input.keyboard?.on('keydown-ESC', () => {
      if (engine.menuOpen) this.toggleOptions(false);
      else engine.startSkip(); // fast-forward the current cutscene, if any
    });

    this.refresh();
  }

  // ---- options menu --------------------------------------------------------

  private optionsButton!: Phaser.GameObjects.Text;
  private optionsPanel!: Phaser.GameObjects.Container;
  private sliderFills: Array<{ fill: Phaser.GameObjects.Rectangle; get: () => number }> = [];
  private muteToggle!: Phaser.GameObjects.Text;
  private sliderDrag: { x0: number; w: number; set: (v: number) => void } | null = null;
  private slotRows: Array<{
    info: Phaser.GameObjects.Text;
    save: Phaser.GameObjects.Text;
    load: Phaser.GameObjects.Text;
    del: Phaser.GameObjects.Text;
    yes: Phaser.GameObjects.Text;
    no: Phaser.GameObjects.Text;
  }> = [];
  /** A destructive slot action awaiting inline Yes/No confirmation. */
  private pendingConfirm: { slot: number; action: 'save' | 'delete' } | null = null;

  private buildOptionsMenu(): void {
    this.optionsButton = this.add
      .text(GAME_W - 54, 12, '⚙', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '24px',
        color: '#c9f0ff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    this.optionsButton.on('pointerdown', () => {
      audio.resume();
      this.toggleOptions();
    });

    // Panel
    this.optionsPanel = this.add.container(0, 0).setDepth(30000).setVisible(false);
    const bg = this.add
      .rectangle(GAME_W / 2, 278, 400, 480, 0x1a1626, 0.97)
      .setStrokeStyle(2, 0x8f7fd4);
    // Swallow clicks so the room never sees them through the panel.
    bg.setInteractive();
    const title = this.add
      .text(GAME_W / 2, 62, 'OPTIONS', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffe066',
      })
      .setOrigin(0.5);
    this.optionsPanel.add(bg);
    this.optionsPanel.add(title);

    this.makeSlider('Master', 100, () => audio.settings.master, (v) => audio.setMasterVolume(v));
    this.makeSlider('Music', 134, () => audio.settings.music, (v) => audio.setMusicVolume(v));
    this.makeSlider('Sound FX', 168, () => audio.settings.sfx, (v) => audio.setSfxVolume(v));
    this.makeSlider('Text speed', 202, () => engine.textSpeed, (v) => engine.setTextSpeed(v));

    this.muteToggle = this.add
      .text(GAME_W / 2, 234, '', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '16px',
        color: '#9be89b',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.muteToggle.on('pointerdown', () => this.toggleMute());
    this.optionsPanel.add(this.muteToggle);

    // Save slots
    this.optionsPanel.add(
      this.add
        .text(GAME_W / 2, 260, '— SAVES —', {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: '14px',
          color: '#8f7fd4',
        })
        .setOrigin(0.5)
    );
    for (let slot = 0; slot < SAVE_SLOTS; slot++) this.buildSlotRow(slot, 286 + slot * 34);

    const close = this.add
      .text(GAME_W / 2, 484, 'Close', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#8f7fd4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setColor('#ffe066'));
    close.on('pointerout', () => close.setColor('#8f7fd4'));
    close.on('pointerdown', () => this.toggleOptions(false));
    this.optionsPanel.add(close);

    engine.events.on('saves', () => {
      if (engine.menuOpen) this.refreshOptions();
    });

    // Slider dragging (shared handlers)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.sliderDrag || !pointer.isDown) return;
      const v = Phaser.Math.Clamp((pointer.x - this.sliderDrag.x0) / this.sliderDrag.w, 0, 1);
      this.sliderDrag.set(v);
      this.refreshOptions();
    });
    this.input.on('pointerup', () => {
      this.sliderDrag = null;
    });
  }

  /** One save-slot row: label · room+time info · Save · Load · ✕, where
   *  overwriting or deleting flips the row into an inline Yes/No confirm. */
  private buildSlotRow(slot: number, y: number): void {
    const name = SLOT_LABELS[slot] ?? `slot ${slot}`;
    const small = (x: number, text: string, color: string, bold = false) =>
      this.add
        .text(x, y, text, {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: bold ? '14px' : '12px',
          fontStyle: bold ? 'bold' : 'normal',
          color,
        })
        .setOrigin(0, 0.5);

    const label = small(300, SLOT_LABELS[slot] ?? `SLOT ${slot}`, '#c9f0ff', true);
    const info = small(370, '— empty —', '#6a6a8a');

    const btn = (x: number, text: string, color: string, onClick: () => void) => {
      const t = this.add
        .text(x, y, text, {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffe066'));
      t.on('pointerout', () => t.setColor(color));
      t.on('pointerdown', onClick);
      return t;
    };

    const doSave = () => {
      this.toast(engine.save(slot) ? `Saved to ${name}.` : 'Save failed.');
      this.refreshOptions();
    };

    const save = btn(578, 'Save', '#8f7fd4', () => {
      this.pendingConfirm = engine.hasSave(slot) ? { slot, action: 'save' } : null;
      if (this.pendingConfirm) this.refreshOptions();
      else doSave();
    });
    const load = btn(628, 'Load', '#8f7fd4', () => {
      this.pendingConfirm = null;
      if (!engine.hasSave(slot)) {
        this.toast('That slot is empty.');
        this.refreshOptions();
        return;
      }
      const ok = engine.load(slot);
      this.toast(ok ? `Loaded ${name}.` : 'Load failed.');
      if (ok) this.toggleOptions(false);
    });
    const del = btn(668, '✕', '#c06a6a', () => {
      if (!engine.hasSave(slot)) return;
      this.pendingConfirm = { slot, action: 'delete' };
      this.refreshOptions();
    });
    const yes = btn(590, 'Yes', '#9be89b', () => {
      const pc = this.pendingConfirm;
      this.pendingConfirm = null;
      if (!pc || pc.slot !== slot) {
        this.refreshOptions();
        return;
      }
      if (pc.action === 'save') {
        doSave();
      } else {
        engine.deleteSave(slot);
        this.toast(`Deleted ${name}.`);
        this.refreshOptions();
      }
    });
    const no = btn(640, 'No', '#ff8a7a', () => {
      this.pendingConfirm = null;
      this.refreshOptions();
    });
    yes.setVisible(false);
    no.setVisible(false);

    this.slotRows[slot] = { info, save, load, del, yes, no };
    for (const obj of [label, info, save, load, del, yes, no]) this.optionsPanel.add(obj);
  }

  private makeSlider(label: string, y: number, get: () => number, set: (v: number) => void): void {
    const trackX = 440;
    const trackW = 180;
    const text = this.add
      .text(320, y, label, {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '15px',
        color: '#c9f0ff',
      })
      .setOrigin(0, 0.5);
    const track = this.add.rectangle(trackX, y, trackW, 8, 0x4a4370).setOrigin(0, 0.5);
    const fill = this.add
      .rectangle(trackX, y, trackW * get(), 8, 0x8f7fd4)
      .setOrigin(0, 0.5);
    // Wider invisible hit zone for comfortable clicking/dragging.
    const hit = this.add
      .rectangle(trackX, y, trackW, 28, 0x000000, 0.001)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const v = Phaser.Math.Clamp((pointer.x - trackX) / trackW, 0, 1);
      set(v);
      this.sliderDrag = { x0: trackX, w: trackW, set };
      this.refreshOptions();
    });
    this.optionsPanel.add(text);
    this.optionsPanel.add(track);
    this.optionsPanel.add(fill);
    this.optionsPanel.add(hit);
    this.sliderFills.push({ fill, get });
  }

  toggleOptions(open?: boolean): void {
    const next = open ?? !engine.menuOpen;
    engine.menuOpen = next;
    this.pendingConfirm = null; // stale confirms never survive open/close
    this.optionsPanel.setVisible(next);
    if (next) this.refreshOptions();
  }

  private refreshOptions(): void {
    for (const s of this.sliderFills) s.fill.width = 180 * s.get();
    this.muteToggle.setText(audio.muted ? 'Sound: OFF  (click to unmute)' : 'Sound: ON  (click to mute)');
    this.updateMuteButton();
    // Slot listings (a row in confirm mode shows the inline Yes/No instead)
    const saves = engine.listSaves();
    const pc = this.pendingConfirm;
    this.slotRows.forEach((row, slot) => {
      const entry = saves[slot];
      const confirming = pc?.slot === slot;
      row.save.setVisible(!confirming);
      row.load.setVisible(!confirming);
      row.del.setVisible(!confirming);
      row.yes.setVisible(confirming);
      row.no.setVisible(confirming);
      if (confirming) {
        row.info
          .setText(pc!.action === 'save' ? 'Overwrite this save?' : 'Delete this save?')
          .setColor(pc!.action === 'save' ? '#ffe066' : '#ff8a7a');
        return;
      }
      if (entry) {
        const when = new Date(entry.when).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const room = entry.room.length > 13 ? `${entry.room.slice(0, 12)}…` : entry.room;
        row.info.setText(`${room} · ${when}`).setColor('#c9f0ff');
        row.load.setAlpha(1);
        row.del.setAlpha(1);
      } else {
        row.info.setText('— empty —').setColor('#6a6a8a');
        row.load.setAlpha(0.35);
        row.del.setAlpha(0.35);
      }
    });
  }

  // ---- audio (mute) control ----------------------------------------------

  private muteButton!: Phaser.GameObjects.Text;

  private buildAudioButton(): void {
    this.muteButton = this.add
      .text(GAME_W - 12, 12, '', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '22px',
        color: '#c9f0ff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    this.muteButton.on('pointerdown', () => {
      audio.resume();
      this.toggleMute();
    });
    this.updateMuteButton();
  }

  private toggleMute(): void {
    const muted = audio.toggleMute();
    this.updateMuteButton();
    if (engine.menuOpen) this.refreshOptions();
    this.toast(muted ? 'Sound off' : 'Sound on');
  }

  private updateMuteButton(): void {
    this.muteButton.setText(audio.muted ? '🔇' : '🔊');
  }

  // ---- verb grid ---------------------------------------------------------

  private buildVerbGrid(): void {
    const originX = 26;
    const originY = ROOM_H + 36;
    const colW = 128;
    const rowH = 38;
    VERBS.forEach((verb, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const t = this.add
        .text(originX + col * colW, originY + row * rowH, verb.label, {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: '19px',
          fontStyle: 'bold',
          color: VERB_COLOR,
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.styleVerb(verb.id, true));
      t.on('pointerout', () => this.styleVerb(verb.id, false));
      t.on('pointerdown', () => {
        if (engine.busy || engine.dialogMode || engine.menuOpen) return;
        engine.setVerb(engine.selectedVerb === verb.id ? null : verb.id);
      });
      this.verbTexts.set(verb.id, t);
      this.gameplayUI.add(t);
    });
  }

  private styleVerb(id: VerbId, hover: boolean): void {
    const t = this.verbTexts.get(id);
    if (!t) return;
    if (engine.selectedVerb === id) t.setColor(VERB_SELECTED);
    else t.setColor(hover ? VERB_HOVER : VERB_COLOR);
  }

  // ---- inventory ---------------------------------------------------------

  private buildInventory(): void {
    const originX = 470;
    const originY = ROOM_H + 26;
    const slotW = 104;
    const slotH = 58;
    for (let row = 0; row < INV_SLOTS_Y; row++) {
      for (let col = 0; col < INV_SLOTS_X; col++) {
        const x = originX + col * (slotW + 8);
        const y = originY + row * (slotH + 8);
        const bg = this.add
          .rectangle(x, y, slotW, slotH, 0x262038)
          .setOrigin(0)
          .setStrokeStyle(1, 0x4a4370)
          .setInteractive({ useHandCursor: true });
        const icon = this.add
          .image(x + slotW / 2, y + slotH / 2, '__DEFAULT')
          .setVisible(false);
        const slotIndex = row * INV_SLOTS_X + col;
        bg.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
          this.onSlotClick(slotIndex, pointer)
        );
        bg.on('pointerover', () => this.onSlotHover(slotIndex, true));
        bg.on('pointerout', () => this.onSlotHover(slotIndex, false));
        this.invSlots.push({ bg, icon, itemId: null });
        this.gameplayUI.add(bg);
        this.gameplayUI.add(icon);
      }
    }
    const arrowStyle = {
      fontFamily: 'Verdana, Arial, sans-serif',
      fontSize: '22px',
      color: VERB_COLOR,
    };
    this.invPrev = this.add
      .text(440, ROOM_H + 55, '▲', arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.changePage(-1));
    this.invNext = this.add
      .text(440, ROOM_H + 115, '▼', arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.changePage(1));
    this.gameplayUI.add(this.invPrev);
    this.gameplayUI.add(this.invNext);
  }

  private changePage(dir: number): void {
    const pageSize = INV_SLOTS_X * INV_SLOTS_Y;
    const maxPage = Math.max(0, Math.ceil(engine.state.inventory.length / pageSize) - 1);
    this.invPage = Phaser.Math.Clamp(this.invPage + dir, 0, maxPage);
    this.refresh();
  }

  private onSlotClick(slotIndex: number, pointer?: Phaser.Input.Pointer): void {
    if (engine.busy || engine.dialogMode || engine.menuOpen) return;
    const itemId = this.invSlots[slotIndex].itemId;
    if (!itemId) return;
    const item = engine.items[itemId];

    // Right-click an item: look at it, no verb needed.
    if (pointer?.rightButtonDown()) {
      void engine.runScript(item.lookAt, `It's ${item.name}.`);
      return;
    }

    if (engine.pendingItem && engine.pendingItem !== itemId) {
      // Item-on-item combination; look up both directions.
      const other = engine.items[engine.pendingItem];
      const script = other.combine?.[itemId] ?? item.combine?.[engine.pendingItem];
      void engine.runScript(script, "Those don't go together.");
      return;
    }
    if (engine.selectedVerb === 'lookat') {
      void engine.runScript(item.lookAt, `It's ${item.name}.`);
      return;
    }
    if (engine.selectedVerb === 'give') {
      engine.setPendingItem(itemId, 'give');
      return;
    }
    // 'use' or bare click both arm the item for "use X with ...".
    engine.setPendingItem(itemId, 'use');
  }

  private onSlotHover(slotIndex: number, over: boolean): void {
    const itemId = this.invSlots[slotIndex].itemId;
    this.hoverName = over && itemId ? engine.items[itemId].name : null;
    this.refreshSentence();
  }

  // ---- dialog choices ----------------------------------------------------

  setDialogMode(on: boolean): void {
    this.gameplayUI.setVisible(!on);
    if (!on) {
      engine.choicesShowing = false;
      this.choiceChangePage = null;
      this.choiceContainer.setVisible(false);
      this.choiceContainer.removeAll(true);
    }
    this.refreshSentence();
  }

  /** Show dialog choices; resolves with the picked index. Choices are laid
   *  out by their real (wrapped) height so they never overlap, and paginated
   *  when they don't all fit in the UI band. */
  presentChoices(texts: string[]): Promise<number> {
    this.choiceContainer.removeAll(true);
    this.choiceContainer.setVisible(true);
    engine.choicesShowing = true;
    engine.skipping = false; // a fast-forward always stops at a choice

    const GAP = 5;
    const NAV_H = 22;
    const topY = ROOM_H + 10;
    const maxBottom = GAME_H - 6;

    return new Promise<number>((resolve) => {
      this.choiceResolve = resolve;

      const pick = (index: number) => {
        if (!this.choiceResolve || engine.menuOpen) return;
        const r = this.choiceResolve;
        this.choiceResolve = null;
        engine.choicesShowing = false;
        this.choiceChangePage = null;
        this.choiceContainer.setVisible(false);
        this.choiceContainer.removeAll(true);
        r(index);
      };

      // Build the (top-left anchored) choice objects and measure heights.
      const items = texts.map((text, i) => {
        const t = this.add
          .text(30, 0, `● ${text}`, {
            fontFamily: 'Verdana, Arial, sans-serif',
            fontSize: '16px',
            color: '#9be89b',
            wordWrap: { width: GAME_W - 60 },
          })
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#ffe066'));
        t.on('pointerout', () => t.setColor('#9be89b'));
        t.on('pointerdown', () => pick(i));
        this.choiceContainer.add(t);
        return { t, h: t.height };
      });

      // Greedy pack into pages; reserve nav space only if multi-page.
      const pack = (reserve: number) => {
        const avail = maxBottom - topY - reserve;
        const pages: Array<Array<(typeof items)[number]>> = [];
        let cur: Array<(typeof items)[number]> = [];
        let used = 0;
        for (const it of items) {
          if (used + it.h > avail && cur.length) {
            pages.push(cur);
            cur = [];
            used = 0;
          }
          cur.push(it);
          used += it.h + GAP;
        }
        if (cur.length) pages.push(cur);
        return pages;
      };
      let pages = pack(0);
      if (pages.length > 1) pages = pack(NAV_H);
      const multi = pages.length > 1;

      const nav = this.add
        .text(30, maxBottom - NAV_H + 4, '', {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#8f7fd4',
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      nav.on('pointerover', () => nav.setColor('#ffe066'));
      nav.on('pointerout', () => nav.setColor('#8f7fd4'));
      this.choiceContainer.add(nav);

      let page = 0;
      const render = () => {
        for (const it of items) it.t.setVisible(false);
        let y = topY;
        for (const it of pages[page]) {
          it.t.setPosition(30, y).setVisible(true);
          y += it.h + GAP;
        }
        nav.setVisible(multi).setText(`▾ More choices  (${page + 1}/${pages.length})`);
      };
      const changePage = (dir: number) => {
        if (!multi) return;
        page = (page + dir + pages.length) % pages.length;
        render();
      };
      nav.on('pointerdown', () => changePage(1));
      this.choiceChangePage = changePage; // wheel paging (see wheel handler)
      render();
    });
  }

  // ---- shared ------------------------------------------------------------

  refresh(): void {
    // Verb colors.
    for (const verb of VERBS) this.styleVerb(verb.id, false);
    // Inventory page.
    const pageSize = INV_SLOTS_X * INV_SLOTS_Y;
    const inv = engine.state.inventory;
    const maxPage = Math.max(0, Math.ceil(inv.length / pageSize) - 1);
    this.invPage = Phaser.Math.Clamp(this.invPage, 0, maxPage);
    this.invSlots.forEach((slot, i) => {
      const itemId = inv[this.invPage * pageSize + i] ?? null;
      slot.itemId = itemId;
      if (itemId) {
        slot.icon.setTexture(engine.items[itemId].icon).setVisible(true);
        slot.bg.setStrokeStyle(
          engine.pendingItem === itemId ? 2 : 1,
          engine.pendingItem === itemId ? 0x7dff7a : 0x4a4370
        );
      } else {
        slot.icon.setVisible(false);
        slot.bg.setStrokeStyle(1, 0x4a4370);
      }
    });
    this.invPrev.setVisible(this.invPage > 0);
    this.invNext.setVisible(this.invPage < maxPage);
    this.refreshSentence();
  }

  private refreshSentence(): void {
    if (engine.dialogMode) {
      this.sentenceText.setText('');
      return;
    }
    let head: string;
    if (engine.pendingItem && engine.pendingItemVerb) {
      const itemName = engine.items[engine.pendingItem].name;
      head =
        engine.pendingItemVerb === 'give' ? `Give ${itemName} to` : `Use ${itemName} with`;
    } else if (engine.selectedVerb) {
      head = verbLabel(engine.selectedVerb);
    } else {
      head = 'Walk to';
    }
    this.sentenceText.setText(this.hoverName ? `${head} ${this.hoverName}` : head);
  }

  toast(message: string): void {
    this.toastText.setText(message).setAlpha(1);
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(1800, () => {
      this.tweens.add({ targets: this.toastText, alpha: 0, duration: 400 });
    });
  }
}
