import Phaser from 'phaser';
import { audio } from './Audio';
import { engine } from './Engine';
import { makeCanvasTex } from './canvasTex';
import { GAME_W, GAME_H } from './constants';

/**
 * Retro start screen: "powered by CLICK-O-MAT ENGINE" in big chunky letters.
 * The pixel look comes from rendering text tiny and upscaling it with
 * nearest-neighbor — no fonts or image assets needed. The click that starts
 * the game doubles as the browser's audio-unlock gesture, so room music
 * begins immediately.
 */
export class TitleScene extends Phaser.Scene {
  private started = false;
  private hasSave = false;
  private continueImg!: Phaser.GameObjects.Image;

  constructor() {
    super('title');
  }

  create(): void {
    this.paintBackdrop();

    const centerX = GAME_W / 2;

    pixelText(this, 'title-powered', 'POWERED BY', 10, 3, ['#8f9bb8', '#5a6a8a']);
    this.add.image(centerX, 150, 'title-powered').setOrigin(0.5);

    pixelText(this, 'title-main', 'CLICK-O-MAT', 13, 7, [
      '#fff3b0',
      '#ffe066',
      '#ff9c2a',
      '#e0489c',
      '#7a2a8a',
    ]);
    const mainImg = this.add.image(centerX, 250, 'title-main').setOrigin(0.5);
    this.tweens.add({
      targets: mainImg,
      y: 244,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    pixelText(this, 'title-engine', 'ENGINE', 12, 5, ['#b0f0ff', '#4fc3e8', '#2a6a9c']);
    this.add.image(centerX, 340, 'title-engine').setOrigin(0.5);

    // Menu: click anywhere = new game; only the CONTINUE line loads a save.
    this.started = false;
    this.hasSave = engine.hasSave();

    pixelText(this, 'title-new', '> NEW GAME <', 9, 3, ['#9be89b', '#57a04e']);
    const newImg = this.add.image(centerX, 442, 'title-new').setOrigin(0.5);
    this.tweens.add({
      targets: newImg,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    pixelText(
      this,
      'title-continue',
      'CONTINUE',
      9,
      3,
      this.hasSave ? ['#b0f0ff', '#4fc3e8'] : ['#45455a', '#2e2e3e']
    );
    this.continueImg = this.add.image(centerX, 492, 'title-continue').setOrigin(0.5);
    if (!this.hasSave) this.continueImg.setAlpha(0.55);

    this.add
      .text(centerX, 560, 'a Phaser 4 point-and-click adventure engine', {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: '13px',
        color: '#5a6a8a',
      })
      .setOrigin(0.5);

    // Scanlines over everything for the CRT vibe.
    makeCanvasTex(this, 'title-scanlines', GAME_W, GAME_H, (g) => {
      g.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < GAME_H; y += 3) g.fillRect(0, y, GAME_W, 1);
    });
    this.add.image(0, 0, 'title-scanlines').setOrigin(0).setDepth(10);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.started) return;
      const overContinue =
        this.hasSave && this.continueImg.getBounds().contains(pointer.x, pointer.y);
      if (overContinue) this.continueGame();
      else this.startGame();
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.started) return;
      if (event.key.toLowerCase() === 'c' && this.hasSave) this.continueGame();
      else this.startGame();
    });
  }

  private startGame(): void {
    this.started = true;
    this.begin();
  }

  private continueGame(): void {
    this.started = true;
    if (!engine.loadForStart()) {
      // Corrupt/missing save: fall back to a fresh game.
      this.begin();
      return;
    }
    this.begin();
  }

  private begin(): void {
    audio.resume(); // the start click is the audio-unlock gesture
    const overlay = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x000000)
      .setOrigin(0)
      .setDepth(20)
      .setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 350,
      onComplete: () => this.scene.start('room'),
    });
  }

  private paintBackdrop(): void {
    makeCanvasTex(this, 'title-bg', GAME_W, GAME_H, (g) => {
      // Night gradient
      const grad = g.createLinearGradient(0, 0, 0, GAME_H);
      grad.addColorStop(0, '#0c0918');
      grad.addColorStop(0.62, '#241436');
      grad.addColorStop(0.66, '#3a1a4a');
      grad.addColorStop(1, '#120a20');
      g.fillStyle = grad;
      g.fillRect(0, 0, GAME_W, GAME_H);

      // Stars
      g.fillStyle = '#cdd8ee';
      for (let i = 0; i < 90; i++) {
        const x = (i * 211) % GAME_W;
        const y = (i * 137) % 380;
        const s = i % 7 === 0 ? 2 : 1;
        g.fillRect(x, y, s, s);
      }

      // Synthwave floor grid below the horizon
      const horizon = 396;
      g.strokeStyle = 'rgba(224, 72, 156, 0.55)';
      g.lineWidth = 1;
      // Fanning verticals from a vanishing point
      const vpx = GAME_W / 2;
      for (let i = -14; i <= 14; i++) {
        g.beginPath();
        g.moveTo(vpx + i * 12, horizon);
        g.lineTo(vpx + i * 110, GAME_H);
        g.stroke();
      }
      // Horizontals, spacing widening toward the viewer
      for (let i = 0; i < 12; i++) {
        const t = i / 12;
        const y = horizon + t * t * (GAME_H - horizon);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(GAME_W, y);
        g.stroke();
      }
      // Horizon glow
      const glow = g.createLinearGradient(0, horizon - 40, 0, horizon + 10);
      glow.addColorStop(0, 'rgba(224, 72, 156, 0)');
      glow.addColorStop(1, 'rgba(224, 72, 156, 0.35)');
      g.fillStyle = glow;
      g.fillRect(0, horizon - 40, GAME_W, 50);
    });
    this.add.image(0, 0, 'title-bg').setOrigin(0);
  }
}

/** Render `text` tiny, then upscale with smoothing off → chunky retro
 *  pixels, tinted with a vertical gradient. Returns the texture size. */
function pixelText(
  scene: Phaser.Scene,
  key: string,
  text: string,
  fontPx: number,
  scale: number,
  colors: string[]
): { w: number; h: number } {
  const small = document.createElement('canvas');
  let g = small.getContext('2d')!;
  g.font = `bold ${fontPx}px monospace`;
  const w = Math.ceil(g.measureText(text).width) + 2;
  const h = fontPx + 5;
  small.width = w;
  small.height = h; // resizing resets the context state
  g = small.getContext('2d')!;
  g.font = `bold ${fontPx}px monospace`;
  g.textBaseline = 'top';
  g.fillStyle = '#ffffff';
  g.fillText(text, 1, 2);
  const grad = g.createLinearGradient(0, 0, 0, h);
  colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c));
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  makeCanvasTex(scene, key, w * scale, h * scale, (big) => {
    big.imageSmoothingEnabled = false;
    big.drawImage(small, 0, 0, w * scale, h * scale);
  });
  return { w: w * scale, h: h * scale };
}
