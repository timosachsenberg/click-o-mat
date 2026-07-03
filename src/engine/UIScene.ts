import Phaser from 'phaser';
import { engine } from './Engine';
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

    this.refresh();
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
        if (engine.busy || engine.dialogMode) return;
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
    if (engine.busy || engine.dialogMode) return;
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
          if (!this.choiceResolve) return;
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
