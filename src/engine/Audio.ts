/**
 * Music + sound-effects system.
 *
 * Two sources, mixed through one graph so volume/mute apply uniformly:
 *  - **Procedural** chiptune music and bleep SFX synthesized with WebAudio, so
 *    the demo needs zero audio files.
 *  - **Loaded** audio files (`this.load.audio`) declared in the asset manifest,
 *    played through Phaser's sound manager. A loaded key always wins over a
 *    procedural one of the same name.
 *
 * Graph:  musicGain ─┐
 *                     ├─> masterGain ─> analyser ─> destination
 *          sfxGain  ─┘
 * Master volume/mute ride on masterGain; the analyser lets tests (and any
 * VU meter) read the live output level.
 */

export type SfxName = 'pickup' | 'open' | 'zap' | 'deny' | 'win' | 'step';

const SFX_PATTERNS: Record<SfxName, Array<[freq: number, dur: number]>> = {
  pickup: [[660, 0.06], [880, 0.09]],
  open: [[330, 0.08], [440, 0.1]],
  zap: [[120, 0.05], [900, 0.05], [150, 0.05], [1100, 0.1]],
  deny: [[220, 0.1], [165, 0.15]],
  win: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.25]],
  step: [[200, 0.03]],
};

interface Track {
  bpm: number;
  /** Semitone offsets from A4 (440 Hz), or null for a rest. One per 8th note. */
  bass: (number | null)[];
  lead: (number | null)[];
  leadType?: OscillatorType;
  bassType?: OscillatorType;
}

/** Built-in procedural music tracks, keyed by name. */
const TRACKS: Record<string, Track> = {
  // Moody A-minor loop for the lab.
  'lab-theme': {
    bpm: 92,
    bassType: 'triangle',
    leadType: 'square',
    bass: [-24, null, null, null, -17, null, null, null, -21, null, null, null, -14, null, null, null],
    lead: [0, 3, 7, 3, 5, 3, 0, -2, 0, 3, 7, 10, 7, 5, 3, 0],
  },
  // Brighter C-major stroll for the hallway.
  'hall-theme': {
    bpm: 110,
    bassType: 'triangle',
    leadType: 'square',
    bass: [-21, null, null, null, -14, null, null, null, -16, null, null, null, -9, null, null, null],
    lead: [3, 7, 10, 7, 12, 10, 7, 3, 5, 8, 12, 8, 7, 5, 3, 7],
  },
  // Soft, elegant waltz-feel for the gallery.
  'gallery-theme': {
    bpm: 140,
    bassType: 'triangle',
    leadType: 'triangle',
    bass: [-21, null, null, -16, null, null, -14, null, null, -19, null, null, -21, null, null, -16],
    lead: [15, 12, 10, 12, 15, 19, 15, 12, 14, 10, 7, 10, 14, 17, 14, 12],
  },
};

interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

const SETTINGS_KEY = 'pnc-audio';
const FADE = 0.6; // seconds for music fade in/out

function freq(semitoneFromA4: number): number {
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

/**
 * Schedules a looping two-voice chiptune on a WebAudio context using a
 * lookahead scheduler. Owns its own output gain so it can fade independently
 * of other tracks (enabling crossfades).
 */
class SynthMusic {
  readonly out: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private stepDur = 0.25;
  private track: Track;
  /** Number of notes scheduled so far — used by tests to confirm progress. */
  noteCount = 0;
  private stopped = false;

  constructor(
    private ctx: AudioContext,
    dest: AudioNode,
    track: Track
  ) {
    this.track = track;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.stepDur = 60 / track.bpm / 2; // 8th notes
  }

  start(): void {
    this.nextTime = this.ctx.currentTime + 0.06;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(0, this.ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(1, this.ctx.currentTime + FADE);
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  private tick(): void {
    if (this.stopped) return;
    const len = this.track.lead.length;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const b = this.track.bass[this.step % this.track.bass.length];
      const l = this.track.lead[this.step % len];
      if (b !== null && b !== undefined) {
        this.note(freq(b), this.nextTime, this.stepDur * 1.9, this.track.bassType ?? 'triangle', 0.22);
      }
      if (l !== null && l !== undefined) {
        this.note(freq(l), this.nextTime, this.stepDur * 0.9, this.track.leadType ?? 'square', 0.1);
      }
      this.noteCount++;
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  private note(f: number, time: number, dur: number, type: OscillatorType, peak: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0002, time + dur);
    osc.connect(g).connect(this.out);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  /** Fade out over FADE seconds, then tear down. */
  fadeOutAndStop(): void {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + FADE);
    setTimeout(() => this.stop(), FADE * 1000 + 60);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      this.out.disconnect();
    } catch {
      /* already gone */
    }
  }
}

export class AudioManager {
  settings: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.9, muted: false };

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  private scene: Phaser.Scene | null = null;
  private synth: SynthMusic | null = null;
  private loadedMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusic: string | null = null;
  private pendingMusic: string | null = null;

  constructor() {
    this.load();
  }

  /** Give the manager the active scene so it can play loaded audio and reuse
   *  Phaser's (gesture-unlocked) AudioContext. */
  attachScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private ensure(): boolean {
    if (this.ctx) return true;
    try {
      const sm = this.scene?.sound as unknown as { context?: AudioContext } | undefined;
      this.ctx = sm?.context ?? new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.levelBuf = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.applyVolumes();
      this.ctx.onstatechange = () => {
        if (this.ctx?.state === 'running' && this.pendingMusic) {
          const key = this.pendingMusic;
          this.pendingMusic = null;
          this.startMusic(key);
        }
      };
      return true;
    } catch {
      return false;
    }
  }

  /** Resume the context after a user gesture and start any pending track. */
  resume(): void {
    if (!this.ensure() || !this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.ctx.state === 'running' && this.pendingMusic) {
      const key = this.pendingMusic;
      this.pendingMusic = null;
      this.startMusic(key);
    }
  }

  // ---- music -------------------------------------------------------------

  /** Switch background music. No-op if the track is already playing. Pass
   *  null to stop. Starts deferred until the audio context is unlocked. */
  playMusic(key: string | null): void {
    if (key === this.currentMusic && (this.synth || this.loadedMusic)) return;
    if (!this.ensure() || !this.ctx) {
      this.pendingMusic = key;
      return;
    }
    if (this.ctx.state !== 'running') {
      this.pendingMusic = key;
      void this.ctx.resume();
      return;
    }
    this.startMusic(key);
  }

  private startMusic(key: string | null): void {
    if (key === this.currentMusic && (this.synth || this.loadedMusic)) return;
    // Fade out whatever is playing.
    if (this.synth) {
      this.synth.fadeOutAndStop();
      this.synth = null;
    }
    if (this.loadedMusic) {
      this.loadedMusic.stop();
      this.loadedMusic.destroy();
      this.loadedMusic = null;
    }
    this.currentMusic = key;
    if (!key) return;

    // Prefer a loaded audio file with this key; else a procedural track.
    if (this.scene?.sound.get(key) || this.hasLoaded(key)) {
      const snd = this.scene!.sound.add(key, { loop: true, volume: this.effectiveMusic() });
      snd.play();
      this.loadedMusic = snd;
    } else if (TRACKS[key] && this.ctx && this.musicGain) {
      this.synth = new SynthMusic(this.ctx, this.musicGain, TRACKS[key]);
      this.synth.start();
    }
  }

  stopMusic(): void {
    this.pendingMusic = null;
    this.startMusic(null);
  }

  private hasLoaded(key: string): boolean {
    const cache = this.scene?.cache.audio;
    return !!cache && cache.exists(key);
  }

  // ---- sfx ---------------------------------------------------------------

  playSfx(name: string): void {
    if (!this.ensure() || !this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    // Loaded file wins over the synthesized bleep.
    if (this.scene && this.hasLoaded(name)) {
      this.scene.sound.play(name, { volume: this.effectiveSfx() });
      return;
    }
    const pattern = SFX_PATTERNS[name as SfxName];
    if (!pattern) return;
    let t = this.ctx.currentTime;
    for (const [f, dur] of pattern) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  }

  // ---- volume / mute -----------------------------------------------------

  private effectiveMusic(): number {
    return this.settings.muted ? 0 : this.settings.master * this.settings.music;
  }
  private effectiveSfx(): number {
    return this.settings.muted ? 0 : this.settings.master * this.settings.sfx;
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.master, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.settings.music, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx, now, 0.02);
    if (this.loadedMusic && 'setVolume' in this.loadedMusic) {
      (this.loadedMusic as unknown as { setVolume(v: number): void }).setVolume(this.effectiveMusic());
    }
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyVolumes();
    this.save();
  }
  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }
  setMasterVolume(v: number): void {
    this.settings.master = clamp01(v);
    this.applyVolumes();
    this.save();
  }
  setMusicVolume(v: number): void {
    this.settings.music = clamp01(v);
    this.applyVolumes();
    this.save();
  }
  setSfxVolume(v: number): void {
    this.settings.sfx = clamp01(v);
    this.applyVolumes();
    this.save();
  }

  get muted(): boolean {
    return this.settings.muted;
  }

  // ---- persistence & introspection --------------------------------------

  private save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
  }
  private load(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }

  /** RMS of the current output buffer (0..~1). For meters and tests. */
  level(): number {
    if (!this.analyser || !this.levelBuf) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (const v of this.levelBuf) sum += v * v;
    return Math.sqrt(sum / this.levelBuf.length);
  }

  /** Snapshot for debugging / automated verification. */
  debug(): Record<string, unknown> {
    return {
      state: this.ctx?.state ?? 'none',
      currentMusic: this.currentMusic,
      pending: this.pendingMusic,
      muted: this.settings.muted,
      notes: this.synth?.noteCount ?? (this.loadedMusic ? -1 : 0),
      level: this.level(),
      settings: { ...this.settings },
    };
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export const audio = new AudioManager();
