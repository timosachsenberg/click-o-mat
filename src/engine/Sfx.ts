/** Tiny WebAudio bleep synthesizer so the demo needs no audio assets.
 *  Replace with real sounds (scene.sound) in production. */

export type SfxName = 'pickup' | 'open' | 'zap' | 'deny' | 'win' | 'step';

const PATTERNS: Record<SfxName, Array<[freq: number, dur: number]>> = {
  pickup: [[660, 0.06], [880, 0.09]],
  open: [[330, 0.08], [440, 0.1]],
  zap: [[120, 0.05], [900, 0.05], [150, 0.05], [1100, 0.1]],
  deny: [[220, 0.1], [165, 0.15]],
  win: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.25]],
  step: [[200, 0.03]],
};

let audioCtx: AudioContext | null = null;

export function sfx(name: SfxName): void {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    let t = audioCtx.currentTime;
    for (const [freq, dur] of PATTERNS[name]) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch {
    // Audio is a nicety; never let it break the game.
  }
}
