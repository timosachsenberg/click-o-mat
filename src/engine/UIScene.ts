import Phaser from 'phaser';
import { engine } from './Engine';
import { audio } from './Audio';
import { VERBS, verbLabel } from './verbs';
import { GAME_W, ROOM_H, UI_H } from './constants';
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
      })
      .setOrigin(0.5)
      .setAlpha(0);

    engine.events.on('hover', (name: string | null) => {
      this.hoverName = name;
      this.refreshSentence();
    });
    engine.events.on('ui', () => this.refresh());

    this.input.keyboard?.on('keydown-F5', () => {
      this.toast(engine.save() ? 'Game saved.' : 'Save failed.');
    });
    this.input.keyboard?.on('keydown-F9', () => {
      this.toast(engine.load() ? 'Game loaded.' : 'No saved game.');
    });

    this.buildAudioButton();
    this.buildOptionsMenu();
    this.input.keyboard?.on('keydown-M', () => this.toggleMute());
    this.input.keyboard?.on('keydown-ESC', () => {
      if (engine.menuOpen) this.toggleOptions(false);
    });

    this.refresh();
  }

  // ---- options menu --------------------------------------------------------

  private optionsButton!: Phaser.GameObjects.Text;
  private optionsPanel!: Phaser.GameObjects.Container;
  private sliderFills: Array<{ fill: Phaser.GameObjects.Rectangle; get: () => number }> = [];
  private muteToggle!: Phaser.GameObjects.Text;
  private sliderDrag: { x0: number; w: number; set: (v: number) => void } | null = null;

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
      .rectangle(GAME_W / 2, 225, 380, 280, 0x1a1626, 0.97)
      .setStrokeStyle(2, 0x8f7fd4);
    // Swallow clicks so the room never sees them through the panel.
    bg.setInteractive();
    const title = this.add
      .text(GAME_W / 2, 112, 'OPTIONS', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffe066',
      })
      .setOrigin(0.5);
    this.optionsPanel.add(bg);
    this.optionsPanel.add(title);

    this.makeSlider('Master', 158, () => audio.settings.master, (v) => audio.setMasterVolume(v));
    this.makeSlider('Music', 200, () => audio.settings.music, (v) => audio.setMusicVolume(v));
    this.makeSlider('Sound FX', 242, () => audio.settings.sfx, (v) => audio.setSfxVolume(v));

    this.muteToggle = this.add
      .text(GAME_W / 2, 286, '', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '16px',
        color: '#9be89b',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.muteToggle.on('pointerdown', () => this.toggleMute());
    this.optionsPanel.add(this.muteToggle);

    const button = (x: number, label: string, onClick: () => void) => {
      const t = this.add
        .text(x, 330, label, {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#8f7fd4',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffe066'));
      t.on('pointerout', () => t.setColor('#8f7fd4'));
      t.on('pointerdown', onClick);
      this.optionsPanel.add(t);
    };
    button(390, 'Save', () => this.toast(engine.save() ? 'Game saved.' : 'Save failed.'));
    button(480, 'Load', () => {
      const ok = engine.load();
      this.toast(ok ? 'Game loaded.' : 'No saved game.');
      if (ok) this.toggleOptions(false);
    });
    button(570, 'Close', () => this.toggleOptions(false));

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
    this.optionsPanel.setVisible(next);
    if (next) this.refreshOptions();
  }

  private refreshOptions(): void {
    for (const s of this.sliderFills) s.fill.width = 180 * s.get();
    this.muteToggle.setText(audio.muted ? 'Sound: OFF  (click to unmute)' : 'Sound: ON  (click to mute)');
    this.updateMuteButton();
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
        bg.on('pointerdown', () => this.onSlotClick(slotIndex));
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

  private onSlotClick(slotIndex: number): void {
    if (engine.busy || engine.dialogMode || engine.menuOpen) return;
    const itemId = this.invSlots[slotIndex].itemId;
    if (!itemId) return;
    const item = engine.items[itemId];

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
      this.choiceContainer.setVisible(false);
      this.choiceContainer.removeAll(true);
    }
    this.refreshSentence();
  }

  /** Show dialog choices; resolves with the picked index. */
  presentChoices(texts: string[]): Promise<number> {
    this.choiceContainer.removeAll(true);
    this.choiceContainer.setVisible(true);
    engine.choicesShowing = true;
    return new Promise<number>((resolve) => {
      this.choiceResolve = resolve;
      texts.forEach((text, i) => {
        const t = this.add
          .text(30, ROOM_H + 34 + i * 24, `● ${text}`, {
            fontFamily: 'Verdana, Arial, sans-serif',
            fontSize: '16px',
            color: '#9be89b',
            wordWrap: { width: GAME_W - 60 },
          })
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#ffe066'));
        t.on('pointerout', () => t.setColor('#9be89b'));
        t.on('pointerdown', () => {
          if (!this.choiceResolve || engine.menuOpen) return;
          const r = this.choiceResolve;
          this.choiceResolve = null;
          engine.choicesShowing = false;
          this.choiceContainer.setVisible(false);
          this.choiceContainer.removeAll(true);
          r(i);
        });
        this.choiceContainer.add(t);
      });
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
