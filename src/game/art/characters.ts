import type { ActorPose, ActorVariant, SvgActorAsset } from '../../engine/types';
import { INK, blob, circle, curve, ellipse, group, path, type Pt } from './toon';

/**
 * The demo's procedural cast as SVG puppets: each frame is posed from a few
 * joint angles (hips, knees, shoulders, elbows) and drawn with fat inked
 * strokes, so walk cycles stay smooth and every character shares one style —
 * big heads, bigger noses, Day-of-the-Tentacle proportions.
 *
 * The human rig is shared: other casts (see src/goa/art/cast.ts) supply
 * their own heads and shirt details through HumanLook's `head`/`torso`
 * hooks, and draw hand-posed frames (sitting, dancing) with drawHumanFront.
 */

export const OUT = 2.2; // outline width at 1:1 scale
const GROUND = 117; // feet line inside the frame (headroom above for the hair)
export const ANKLE_Y = GROUND - 5;

export const POSES = {
  idle: { frames: 8, frameRate: 4 }, // breathing, a blink on frame 6
  walk: { frames: 8, frameRate: 12 },
  talk: { frames: 4, frameRate: 8 },
};

export type Mouth = 'shut' | 'a' | 'o';

const deg = (r: number): number => (r * 180) / Math.PI;
/** Step from p by len along an angle measured from straight down, positive
 *  towards +x (the facing direction in side views). */
export const step = (p: Pt, len: number, ang: number): Pt => [p[0] + Math.sin(ang) * len, p[1] + Math.cos(ang) * len];
const pts = (list: Pt[], dx: number, dy: number): Pt[] => list.map(([x, y]) => [x + dx, y + dy]);
const d = (list: Pt[]): string => list.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

/** A jointed limb as fat round strokes: one ink pass under per-segment colour
 *  passes, so joints and colour changes (sleeve → arm) merge seamlessly. */
export function limb(joints: Pt[], width: number, colors: string[]): string {
  let s = path(d(joints), { stroke: INK, sw: width + OUT * 2 });
  for (let i = 0; i < joints.length - 1; i++) {
    s += path(d([joints[i], joints[i + 1]]), { stroke: colors[Math.min(i, colors.length - 1)], sw: width });
  }
  return s;
}

// ---- humanoids ------------------------------------------------------------------

export interface HumanLook {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  top: string;
  topShade: string;
  /** Trousers / shorts. */
  legs: string;
  legsShade: string;
  /** Colour below the knee (skin for shorts); defaults to `legs`. */
  shins?: string;
  shoes: string;
  shoeTrim: string;
  style: 'norb' | 'pia' | 'custom';
  /** Style 'custom': the head, in head-local coords ((0,0) = head centre,
   *  drawn a size up by the rig). */
  head?: { front: (r: Rig, back: boolean) => string; side: (r: Rig) => string };
  /** Style 'custom': details over the shirt (`top` = shirt top y, `clip` =
   *  the id of the shirt's clipPath). */
  torso?: { front?: (top: number, back: boolean, clip: string) => string; side?: (top: number, clip: string) => string };
}

const NORB_LOOK: HumanLook = {
  skin: '#f6cba2',
  skinShade: '#d99a72',
  hair: '#7a4424',
  hairShade: '#4f2814',
  top: '#5b8fe0',
  topShade: '#3a64b4',
  legs: '#463c5e',
  legsShade: '#2f2744',
  shoes: '#f1ebe0',
  shoeTrim: '#d94a3a',
  style: 'norb',
};

const PIA_LOOK: HumanLook = {
  skin: '#e6a97c',
  skinShade: '#c27f55',
  hair: '#5c2a1c',
  hairShade: '#3c1a10',
  top: '#d9507a',
  topShade: '#a8365a',
  legs: '#b8a06c',
  legsShade: '#8e7748',
  shins: '#e6a97c',
  shoes: '#7a4a28',
  shoeTrim: '#4a2a14',
  style: 'pia',
};

/** Joint positions for one frame. Legs/arms are [far, near] in side view and
 *  [left, right] (screen) in front/back views. */
export interface Rig {
  hipY: number;
  legs: Array<{ hip: Pt; knee: Pt; ankle: Pt; footRot: number; lift: number }>;
  arms: Array<{ shoulder: Pt; elbow: Pt; hand: Pt }>;
  headDy: number;
  tilt: number;
  breath: number;
  mouth: Mouth;
  blink: boolean;
  /** Ponytail swing, -1..1. */
  swing: number;
}

/** DOTT proportions: the heads are drawn a size up from the body. */
const HEAD_SCALE = 1.12;
const THIGH = 15;
const SHIN = 15;
const UPPER_ARM = 13;
const FOREARM = 12;

export function sideRig(pose: ActorPose, f: number): Rig {
  const phase = (f / POSES.walk.frames) * Math.PI * 2;
  const leg = (ph: number) => {
    if (pose !== 'walk') return { th: 0.04, k: 0.05 };
    return { th: 0.46 * Math.sin(ph), k: 0.8 * Math.max(0, Math.cos(ph)) ** 1.4 };
  };
  const far = leg(phase + Math.PI);
  const near = leg(phase);
  const rel = (l: { th: number; k: number }): Pt => {
    const knee = step([0, 0], THIGH, l.th);
    return step(knee, SHIN, l.th - l.k);
  };
  // Lowest foot touches the ground: this alone produces the walk's bob.
  const hipY = ANKLE_Y - Math.max(rel(far)[1], rel(near)[1]);
  const legs = [far, near].map((l, i) => {
    const hip: Pt = [32 + (i === 0 ? -1 : 1), hipY];
    const knee = step(hip, THIGH, l.th);
    const ankle = step(knee, SHIN, l.th - l.k);
    const lift = ANKLE_Y - ankle[1];
    const footRot = lift > 0.6 ? Math.max(-0.45, Math.min(0.7, -(l.th - l.k) * 0.9)) : 0;
    return { hip, knee, ankle, footRot, lift };
  });

  const breath = pose === 'idle' ? [0, 0, 1, 1, 1, 1, 0, 0][f] : 0;
  const shoulderY = hipY - 26 - breath * 0.7;
  const arm = (sh: Pt, a: number, b: number) => {
    const elbow = step(sh, UPPER_ARM, a);
    return { shoulder: sh, elbow, hand: step(elbow, FOREARM, a + b) };
  };
  let arms;
  if (pose === 'walk') {
    arms = [
      arm([30, shoulderY], 0.55 * Math.sin(phase), 0.3 + 0.3 * Math.max(0, Math.sin(phase))),
      arm([33, shoulderY], -0.55 * Math.sin(phase), 0.3 + 0.3 * Math.max(0, -Math.sin(phase))),
    ];
  } else if (pose === 'talk') {
    // The near hand comes up to make a point, bobbing with the words.
    arms = [arm([30, shoulderY], 0.08, 0.2), arm([33, shoulderY], 0.35, 1.6 + (f % 2) * 0.35)];
  } else {
    arms = [arm([30, shoulderY], 0.06, 0.15), arm([33, shoulderY], 0.02, 0.18 + breath * 0.04)];
  }

  return {
    hipY,
    legs,
    arms,
    headDy: pose === 'talk' ? -(f % 2) : -breath * 0.6,
    tilt: pose === 'talk' ? [2, -1, 3, 0][f] : 0,
    breath,
    mouth: pose === 'talk' ? (['a', 'shut', 'o', 'shut'] as Mouth[])[f] : 'shut',
    blink: pose === 'idle' && f === 6,
    swing: pose === 'walk' ? Math.sin(phase * 2) : pose === 'talk' ? (f % 2) * 0.4 : 0,
  };
}

export function frontRig(pose: ActorPose, f: number): Rig {
  const phase = (f / POSES.walk.frames) * Math.PI * 2;
  const walking = pose === 'walk';
  const hipY = ANKLE_Y - 30 - (walking ? 1.6 * Math.abs(Math.sin(phase)) : 0);
  const legs = [-1, 1].map((side) => {
    const lift = walking ? 5 * Math.max(0, Math.sin(phase + (side < 0 ? 0 : Math.PI))) : 0;
    const hip: Pt = [32 + side * 5, hipY];
    const ankle: Pt = [32 + side * 5.5, ANKLE_Y - lift];
    const knee: Pt = [(hip[0] + ankle[0]) / 2 + side * (0.6 + lift * 0.25), (hip[1] + ankle[1]) / 2];
    return { hip, knee, ankle, footRot: 0, lift };
  });
  const breath = pose === 'idle' ? [0, 0, 1, 1, 1, 1, 0, 0][f] : 0;
  const shoulderY = hipY - 26 - breath * 0.7;
  const arms = [-1, 1].map((side) => {
    const shoulder: Pt = [32 + side * 11, shoulderY];
    if (pose === 'talk' && side > 0) {
      const elbow: Pt = [shoulder[0] + 4, shoulder[1] + 11];
      return { shoulder, elbow, hand: [elbow[0] - 2, elbow[1] - 9 + (f % 2) * 2] as Pt };
    }
    const sw = walking ? Math.sin(phase + (side < 0 ? Math.PI : 0)) : 0;
    const elbow: Pt = [shoulder[0] + side * 2, shoulder[1] + 12.5 - Math.max(0, sw) * 1.5];
    const hand: Pt = [elbow[0] + side * 0.6 - side * Math.max(0, sw) * 1.5, elbow[1] + 11.5 - sw * 3];
    return { shoulder, elbow, hand };
  });
  return {
    hipY,
    legs,
    arms,
    headDy: pose === 'talk' ? -(f % 2) : -breath * 0.6,
    tilt: pose === 'talk' ? [3, -1, 2, 0][f] : walking ? Math.sin(phase) * 1.5 : 0,
    breath,
    mouth: pose === 'talk' ? (['a', 'shut', 'o', 'shut'] as Mouth[])[f] : 'shut',
    blink: pose === 'idle' && f === 6,
    swing: walking ? Math.sin(phase) : 0,
  };
}

// -- shoes

function shoeSide(L: HumanLook, ankle: Pt, rot: number, shade = false): string {
  const shape: Pt[] = [
    [-5, -3],
    [2, -4.5],
    [9, -2.5],
    [12.5, 1.5],
    [11.5, 5.5],
    [-5.5, 5.5],
  ];
  const t = `translate(${ankle[0].toFixed(1)} ${ankle[1].toFixed(1)}) rotate(${deg(rot).toFixed(1)})`;
  const fill = shade ? mix(L.shoes, '#000000', 0.25) : L.shoes;
  return group(
    [
      path(blob(shape), { fill, stroke: INK, sw: OUT }),
      path(d([[-5.5, 3.6], [12, 3.6]]), { stroke: L.shoeTrim, sw: 2 }),
    ],
    t
  );
}

function shoeFront(L: HumanLook, ankle: Pt, lift: number): string {
  const k = 1 + lift * 0.03;
  const shape: Pt[] = [
    [-6, -2.5],
    [6, -2.5],
    [7.8, 2],
    [6.5, 5.5],
    [-6.5, 5.5],
    [-7.8, 2],
  ];
  return group(
    [
      path(blob(shape), { fill: L.shoes, stroke: INK, sw: OUT }),
      path(d([[-6.8, 3.6], [6.8, 3.6]]), { stroke: L.shoeTrim, sw: 1.8 }),
    ],
    `translate(${ankle[0].toFixed(1)} ${ankle[1].toFixed(1)}) scale(${k.toFixed(3)})`
  );
}

/** Blend two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// -- heads (drawn in head-local coords, (0,0) = head centre)

export function mouthFront(m: Mouth, y: number, wide: number): string {
  if (m === 'a') {
    return (
      ellipse(0, y + 1, wide * 0.95, 3, { fill: '#5a1a28', stroke: INK, sw: 1.6 }) +
      ellipse(0, y + 2.6, wide * 0.5, 1.1, { fill: '#e0607a' })
    );
  }
  if (m === 'o') return ellipse(0, y + 1, wide * 0.55, 2.6, { fill: '#5a1a28', stroke: INK, sw: 1.6 });
  return path(`M${-wide} ${y}Q0 ${y + 2.4} ${wide} ${y - 0.4}`, { stroke: INK, sw: 1.6 });
}

export function mouthSide(m: Mouth, x: number, y: number): string {
  if (m === 'a') return ellipse(x, y + 1, 2.4, 2.8, { fill: '#5a1a28', stroke: INK, sw: 1.5 });
  if (m === 'o') return ellipse(x + 0.6, y + 1, 1.6, 2.2, { fill: '#5a1a28', stroke: INK, sw: 1.5 });
  return path(`M${x - 3} ${y}Q${x} ${y + 1.6} ${x + 2.5} ${y - 0.2}`, { stroke: INK, sw: 1.5 });
}

export const FACE_FRONT: Pt[] = [
  [0, -17],
  [10, -14.5],
  [14, -4],
  [13, 6],
  [8, 15],
  [0, 18],
  [-8, 15],
  [-13, 6],
  [-14, -4],
  [-10, -14.5],
];

export const SKULL_SIDE: Pt[] = [
  [-13, -2],
  [-11, -12],
  [-2, -17.5],
  [8, -15],
  [13, -6],
  [13.5, 4],
  [11, 12],
  [6, 17],
  [-3, 16.5],
  [-9, 12],
  [-13, 5],
];

/** Face fill with a cel-shaded crescent on the side away from the light. */
export function shadedHead(L: HumanLook, shape: Pt[], id: string, shadeDx: number): string {
  const dShape = blob(shape);
  return (
    `<defs><clipPath id="${id}"><path d="${dShape}"/></clipPath></defs>` +
    path(dShape, { fill: L.skinShade }) +
    group(path(blob(pts(shape, -shadeDx, -1).map(([x, y]) => [x * 0.96, y * 0.97] as Pt)), { fill: L.skin }), undefined, `clip-path="url(#${id})"`) +
    path(dShape, { stroke: INK, sw: OUT })
  );
}

function headFront(L: HumanLook, r: Rig, back: boolean): string {
  if (L.head) return L.head.front(r, back);
  const s: string[] = [];
  const ear = (x: number) =>
    ellipse(x, 1, 3.2, 4.6, { fill: L.skin, stroke: INK, sw: OUT }) +
    path(`M${x * 0.97} -1Q${x * 1.04} 1 ${x * 0.97} 3`, { stroke: L.skinShade, sw: 1.4 });

  if (L.style === 'pia') {
    // Hair mass behind the face (bob), plus the ponytail from behind.
    s.push(path(blob([[-16, 11], [-17.5, -5], [-11, -18], [0, -21.5], [11, -18], [17.5, -5], [16, 11], [9, 13], [-9, 13]]), { fill: L.hair, stroke: INK, sw: OUT }));
  }
  s.push(ear(-14), ear(14));

  if (back) {
    // Seen from behind: the hair covers the head; ponytail hangs down.
    if (L.style === 'pia') {
      const sw = r.swing * 2.5;
      s.push(path(blob([[-16, 10], [-17, -6], [-10, -18.5], [0, -21.5], [10, -18.5], [17, -6], [16, 10], [8, 13], [-8, 13]]), { fill: L.hair, stroke: INK, sw: OUT }));
      s.push(path(curve([[-6, -10], [-10, -6], [-12, 0]]), { stroke: L.hairShade, sw: 1.4 }));
      s.push(path(curve([[6, -10], [10, -6], [12, 0]]), { stroke: L.hairShade, sw: 1.4 }));
      s.push(path(blob([[-4, -6], [4, -6], [5 + sw, 6], [3 + sw * 1.5, 19], [sw * 1.8, 23], [-3 + sw * 1.5, 19], [-5 + sw, 6]]), { fill: L.hair, stroke: INK, sw: OUT }));
      s.push(ellipse(0, -5, 4.5, 2.2, { fill: '#f2c94c', stroke: INK, sw: 1.4 }));
    } else {
      s.push(path(blob([[-15, 6], [-15.5, -8], [-9, -18], [0, -21], [9, -18], [15.5, -8], [15, 6], [9, 12], [0, 13.5], [-9, 12]]), { fill: L.hair, stroke: INK, sw: OUT }));
      s.push(path(curve([[-5, -14], [-7, -6], [-6, 4]]), { stroke: L.hairShade, sw: 1.5 }));
      s.push(path(curve([[4, -15], [6, -6], [5, 5]]), { stroke: L.hairShade, sw: 1.5 }));
      s.push(path(curve([[-1, -20], [1, -26], [5, -25]]), { stroke: INK, sw: 2.6 }));
      s.push(path(curve([[-1, -20], [1, -26], [5, -25]]), { stroke: L.hair, sw: 1.2 }));
    }
    return s.join('');
  }

  s.push(shadedHead(L, FACE_FRONT, 'faceF', 3));

  if (L.style === 'norb') {
    // Glasses: lenses, eyes behind them, bridge.
    for (const x of [-6.5, 6.5]) {
      s.push(circle(x, -1, 5.9, { fill: '#ffffff' }));
      if (r.blink) {
        s.push(path(`M${x - 3.5} -0.5Q${x} 1.5 ${x + 3.5} -0.5`, { stroke: INK, sw: 1.5 }));
      } else {
        s.push(ellipse(x, -1, 3.2, 3.6, { fill: '#ffffff' }));
        s.push(circle(x + 0.6, -0.4, 1.7, { fill: INK }));
      }
      s.push(circle(x, -1, 5.9, { fill: '#cfe6ff', opacity: 0.25 }));
      s.push(circle(x, -1, 5.9, { stroke: INK, sw: 1.9 }));
      s.push(path(`M${x - 3.4} -4.2Q${x - 1.5} -5.6 ${x + 0.6} -5.2`, { stroke: '#ffffff', sw: 1.1, opacity: 0.8 }));
    }
    s.push(path('M-0.8 -1.5Q0 -3 0.8 -1.5', { stroke: INK, sw: 1.8 }));
    s.push(path('M-12.4 -1.5L-14 0M12.4 -1.5L14 0', { stroke: INK, sw: 1.6 }));
    s.push(path('M-10.5 -9.5Q-6.5 -12 -2.5 -9.8M2.5 -9.8Q6.5 -12 10.5 -9.5', { stroke: L.hairShade, sw: 1.8 }));
    // The nose: generous.
    s.push(ellipse(0, 6, 4.3, 4.7, { fill: L.skin, stroke: INK, sw: 1.8 }));
    s.push(path('M1.5 3.6Q3 4.6 2.8 6.5', { stroke: L.skinShade, sw: 1.4 }));
    s.push(circle(-1.4, 4.2, 1.1, { fill: '#ffffff', opacity: 0.7 }));
    s.push(mouthFront(r.mouth, 12.5, 3.6));
    // The mop, with its signature cowlick.
    s.push(path(blob([[-15, -1], [-15, -12], [-8.5, -19.5], [0, -21.5], [8.5, -19.5], [15, -12], [15, -1], [12.5, -6.5], [8.5, -9.5], [4, -7.5], [-1, -10.5], [-5.5, -7.5], [-10.5, -9], [-13, -5]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-9, -15], [-3, -17], [4, -16]]), { stroke: L.hairShade, sw: 1.4 }));
    s.push(path(curve([[-1, -20.5], [1, -27], [5.5, -25.5]]), { stroke: INK, sw: 2.8 }));
    s.push(path(curve([[-1, -20.5], [1, -27], [5.5, -25.5]]), { stroke: L.hair, sw: 1.2 }));
  } else {
    // Pia: big eyes, button nose, freckles, bangs.
    for (const x of [-5.6, 5.6]) {
      if (r.blink) {
        s.push(path(`M${x - 3.3} -0.5Q${x} 1.6 ${x + 3.3} -0.5`, { stroke: INK, sw: 1.6 }));
      } else {
        s.push(ellipse(x, -1, 3.3, 4.1, { fill: '#ffffff', stroke: INK, sw: 1.5 }));
        s.push(circle(x + 0.5, -0.4, 2, { fill: '#3a2216' }));
        s.push(circle(x + 1.1, -1.4, 0.7, { fill: '#ffffff' }));
        const o = Math.sign(x);
        s.push(path(`M${x + o * 2.6} -4.2L${x + o * 4.4} -5.6`, { stroke: INK, sw: 1.3 }));
      }
    }
    s.push(path('M-8.8 -7.5Q-5.6 -9.5 -2.6 -7.8M2.6 -7.8Q5.6 -9.5 8.8 -7.5', { stroke: L.hairShade, sw: 1.6 }));
    s.push(ellipse(-8.6, 6, 2.6, 1.6, { fill: '#e8607a', opacity: 0.35 }));
    s.push(ellipse(8.6, 6, 2.6, 1.6, { fill: '#e8607a', opacity: 0.35 }));
    for (const [x, y] of [[-8, 4.4], [-6.6, 5.6], [-9.2, 5.8], [8, 4.4], [6.6, 5.6], [9.2, 5.8]]) {
      s.push(circle(x, y, 0.45, { fill: '#9a5a34' }));
    }
    s.push(ellipse(0, 4.6, 2.5, 2.2, { fill: L.skin, stroke: INK, sw: 1.5 }));
    s.push(mouthFront(r.mouth, 10.5, 3.2));
    s.push(path(blob([[-15, -3], [-14.5, -13], [-7, -19.5], [3, -20.5], [12, -16.5], [15.5, -8], [14.5, -2.5], [10.5, -8], [5.5, -6.5], [2, -10], [-3, -7], [-8, -9.5], [-11.5, -5]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-8, -15], [-1, -17.5], [7, -15]]), { stroke: L.hairShade, sw: 1.3 }));
    s.push(ellipse(13.5, -12, 3, 2, { fill: '#f2c94c', stroke: INK, sw: 1.3 }));
  }
  return s.join('');
}

function headSide(L: HumanLook, r: Rig): string {
  if (L.head) return L.head.side(r);
  const s: string[] = [];
  if (L.style === 'pia') {
    // Ponytail streaming back, swinging with the stride.
    const sw = r.swing * 2.2;
    s.push(path(blob([[-11, -10], [-19, -9 + sw * 0.4], [-25, -2 + sw], [-26, 8 + sw * 1.4], [-22, 13 + sw * 1.6], [-19, 6 + sw], [-15, 0], [-11, -3]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-15, -6], [-21, -1 + sw * 0.8], [-23, 7 + sw * 1.3]]), { stroke: L.hairShade, sw: 1.3 }));
  }
  s.push(shadedHead(L, SKULL_SIDE, 'faceS', -3));
  // Ear
  s.push(ellipse(-4, 2, 3.1, 4.5, { fill: L.skin, stroke: INK, sw: OUT }));
  s.push(path('M-4.6 0Q-2.6 2 -4.6 4', { stroke: L.skinShade, sw: 1.3 }));

  if (L.style === 'norb') {
    if (r.blink) s.push(path('M5.5 -1.5Q8 0.5 10.5 -1.5', { stroke: INK, sw: 1.5 }));
    else {
      s.push(ellipse(8.2, -2, 2.6, 3.3, { fill: '#ffffff' }));
      s.push(circle(9.4, -1.6, 1.5, { fill: INK }));
    }
    s.push(circle(8.2, -2, 5.6, { fill: '#cfe6ff', opacity: 0.25 }));
    s.push(circle(8.2, -2, 5.6, { stroke: INK, sw: 1.9 }));
    s.push(path('M2.6 -2.2L-1.5 -1.2', { stroke: INK, sw: 1.7 }));
    s.push(path('M4.5 -10Q8.5 -12 12 -9.5', { stroke: L.hairShade, sw: 1.8 }));
    // The nose, in glorious profile.
    s.push(path(blob([[11, -1], [16, 0.5], [19, 4], [17, 8], [12.5, 8], [11, 4]]), { fill: L.skin, stroke: INK, sw: 1.8 }));
    s.push(circle(15.5, 2.5, 1, { fill: '#ffffff', opacity: 0.7 }));
    s.push(mouthSide(r.mouth, 9, 12));
    s.push(path(blob([[-14, 7], [-15.5, -6], [-10, -16.5], [0, -21.5], [8.5, -19.5], [13.5, -13], [11, -9.5], [5, -11], [0, -9], [-4, -4.5], [-7.5, 3], [-10.5, 10]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-9, -12], [-3, -16], [5, -16]]), { stroke: L.hairShade, sw: 1.4 }));
    s.push(path(curve([[0, -21], [2, -27.5], [6.5, -26]]), { stroke: INK, sw: 2.8 }));
    s.push(path(curve([[0, -21], [2, -27.5], [6.5, -26]]), { stroke: L.hair, sw: 1.2 }));
  } else {
    if (r.blink) s.push(path('M5.5 -1.2Q8 0.8 10.5 -1.2', { stroke: INK, sw: 1.5 }));
    else {
      s.push(ellipse(8.4, -1.6, 2.8, 3.8, { fill: '#ffffff', stroke: INK, sw: 1.4 }));
      s.push(circle(9.6, -1.2, 1.8, { fill: '#3a2216' }));
      s.push(circle(10.1, -2.1, 0.6, { fill: '#ffffff' }));
      s.push(path('M10.6 -4.6L12.6 -6', { stroke: INK, sw: 1.3 }));
    }
    s.push(path('M5 -8Q8.5 -10 11.5 -8', { stroke: L.hairShade, sw: 1.6 }));
    s.push(ellipse(5.5, 6, 2.6, 1.6, { fill: '#e8607a', opacity: 0.35 }));
    for (const [x, y] of [[4.6, 4.4], [6.2, 5.4], [7.4, 4.2]]) s.push(circle(x, y, 0.45, { fill: '#9a5a34' }));
    s.push(path(blob([[12.5, 0], [15.6, 2.4], [14.8, 5.4], [12, 5.2]]), { fill: L.skin, stroke: INK, sw: 1.5 }));
    s.push(mouthSide(r.mouth, 10, 10.5));
    s.push(path(blob([[-13.5, 9], [-15.5, -6], [-9.5, -17], [1, -21], [10, -18], [14.5, -10], [13, -5.5], [8, -8.5], [3, -7], [-2, -5], [-6.5, 2], [-9.5, 11]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-8, -13], [-1, -17], [7, -15]]), { stroke: L.hairShade, sw: 1.3 }));
    s.push(ellipse(-11, -9, 2.2, 3.4, { fill: '#f2c94c', stroke: INK, sw: 1.3 }));
  }
  return s.join('');
}

// -- whole figure

function torsoFront(L: HumanLook, r: Rig, back: boolean): string {
  const top = r.hipY - 28 - r.breath * 0.7;
  const s: string[] = [];
  const shirt: Pt[] = pts([[-11, 2], [-6, -0.5], [6, -0.5], [11, 2], [12, 9], [9.5, 27], [-9.5, 27], [-12, 9]], 32, top);
  const id = back ? 'torsoB' : 'torsoF';
  s.push(`<defs><clipPath id="${id}"><path d="${blob(shirt)}"/></clipPath></defs>`);
  s.push(path(blob(shirt), { fill: L.top }));
  s.push(group(ellipse(32 + 13, top + 14, 7, 16, { fill: L.topShade }), undefined, `clip-path="url(#${id})"`));
  s.push(path(blob(shirt), { stroke: INK, sw: OUT }));
  if (L.torso?.front) s.push(L.torso.front(top, back, id));
  if (!back) {
    if (L.style === 'norb') {
      // Collar, buttons, and a fully-stocked pocket protector.
      s.push(path(`M${32 - 5} ${top - 0.5}L32 ${top + 5}L${32 + 5} ${top - 0.5}`, { fill: '#ffffff', stroke: INK, sw: 1.6 }));
      for (const y of [9, 15, 21]) s.push(circle(32, top + y, 0.9, { fill: INK }));
      s.push(path(`M${32 + 4} ${top + 3}L${32 + 4} ${top + 7}`, { stroke: '#d94a3a', sw: 1.6 }));
      s.push(path(`M${32 + 6.5} ${top + 2.5}L${32 + 6.5} ${top + 7}`, { stroke: '#2e2e3a', sw: 1.6 }));
      s.push(path(`M${32 + 2.5} ${top + 6}h6v5h-6z`, { fill: '#f4f4f0', stroke: INK, sw: 1.3 }));
    } else if (L.style === 'pia') {
      // Stripe across the chest, backpack straps.
      s.push(group(path(`M10 ${top + 10}L54 ${top + 8}L54 ${top + 13}L10 ${top + 15}Z`, { fill: '#fbe9c8' }), undefined, `clip-path="url(#${id})"`));
      s.push(path(`M${32 - 7} ${top}L${32 - 6} ${top + 16}M${32 + 7} ${top}L${32 + 6} ${top + 16}`, { stroke: '#3b5e38', sw: 2.6 }));
    }
  } else if (L.style === 'pia') {
    s.push(path(blob(pts([[-9, 3], [9, 3], [10, 17], [8, 22], [-8, 22], [-10, 17]], 32, top)), { fill: '#4f7d4a', stroke: INK, sw: OUT }));
    s.push(path(`M${32 - 9} ${top + 9}Q32 ${top + 12} ${32 + 9} ${top + 9}`, { stroke: INK, sw: 1.5 }));
    s.push(path(blob(pts([[-5, 13], [5, 13], [5, 19], [-5, 19]], 32, top)), { fill: '#3e6639', stroke: INK, sw: 1.4 }));
  }
  // Trousers' seat / waistband over the leg tops.
  const seat: Pt[] = pts([[-10.5, -4], [10.5, -4], [11, 4.5], [1.5, 6], [-1.5, 6], [-11, 4.5]], 32, r.hipY);
  s.push(path(blob(seat), { fill: L.legs, stroke: INK, sw: OUT }));
  if (L.style === 'norb') s.push(path(`M21.5 ${r.hipY - 2.5}L42.5 ${r.hipY - 2.5}`, { stroke: '#5a3a22', sw: 2.4 }));
  return s.join('');
}

function humanFront(L: HumanLook, pose: ActorPose, f: number, back: boolean): string {
  return drawHumanFront(L, frontRig(pose, f), back);
}

/** A front (or back) view from explicit joints — for hand-built poses. */
export function drawHumanFront(L: HumanLook, r: Rig, back = false): string {
  const s: string[] = [];
  const shinColor = L.shins ?? L.legs;
  for (const l of r.legs) s.push(limb([l.hip, l.knee, l.ankle], 8, [L.legs, shinColor]));
  if (L.style === 'pia') {
    for (const l of r.legs) s.push(path(d([[l.ankle[0] - 3.5, l.ankle[1] - 3.5], [l.ankle[0] + 3.5, l.ankle[1] - 3.5]]), { stroke: '#f4f0e6', sw: 3 }));
  }
  for (const l of r.legs) s.push(shoeFront(L, l.ankle, l.lift));
  // Arms first when seen from behind; otherwise the torso goes underneath.
  const arms = r.arms.map((a) => limb([a.shoulder, a.elbow, a.hand], 6, [L.top, L.skin]) + circle(a.hand[0], a.hand[1], 3.3, { fill: L.skin, stroke: INK, sw: OUT }));
  const neckTop = r.hipY - 51 + r.headDy + 13;
  s.push(limb([[32, neckTop], [32, r.hipY - 26]], 7, [L.skin]));
  s.push(torsoFront(L, r, back));
  s.push(...arms);
  const hx = 32;
  const hy = r.hipY - 51 + r.headDy;
  s.push(group(headFront(L, r, back), `translate(${hx} ${hy.toFixed(1)}) rotate(${r.tilt}) scale(${HEAD_SCALE})`));
  return s.join('');
}

function humanSide(L: HumanLook, pose: ActorPose, f: number): string {
  return drawHumanSide(L, sideRig(pose, f));
}

/** A side view (facing right) from explicit joints — for hand-built poses. */
export function drawHumanSide(L: HumanLook, r: Rig): string {
  const s: string[] = [];
  const [farArm, nearArm] = r.arms;
  const [farLeg, nearLeg] = r.legs;
  const shinColor = L.shins ?? L.legs;
  const dark = (c: string) => mix(c, '#1e1424', 0.22);

  // Far side, a shade darker.
  s.push(limb([farArm.shoulder, farArm.elbow, farArm.hand], 5.5, [dark(L.top), dark(L.skin)]));
  s.push(circle(farArm.hand[0], farArm.hand[1], 3.1, { fill: dark(L.skin), stroke: INK, sw: OUT }));
  s.push(limb([farLeg.hip, farLeg.knee, farLeg.ankle], 7.5, [dark(L.legs), dark(shinColor)]));
  s.push(shoeSide(L, farLeg.ankle, farLeg.footRot, true));
  s.push(limb([nearLeg.hip, nearLeg.knee, nearLeg.ankle], 7.5, [L.legs, shinColor]));
  if (L.style === 'pia') {
    for (const l of [nearLeg]) s.push(path(d([[l.ankle[0] - 3.2, l.ankle[1] - 3.6], [l.ankle[0] + 3.2, l.ankle[1] - 3.6]]), { stroke: '#f4f0e6', sw: 3 }));
  }
  s.push(shoeSide(L, nearLeg.ankle, nearLeg.footRot));

  const top = r.hipY - 28 - r.breath * 0.7;
  const neckTop = r.hipY - 51 + r.headDy + 13;
  s.push(limb([[31, neckTop], [32, top + 2]], 7, [L.skin]));
  if (L.style === 'pia') {
    // Backpack rides behind the shoulders.
    s.push(path(blob(pts([[-15, 3], [-6, 1], [-5, 21], [-15, 22], [-17, 12]], 32, top)), { fill: '#4f7d4a', stroke: INK, sw: OUT }));
    s.push(path(blob(pts([[-16.5, 11], [-12, 10], [-12, 18], [-16, 19]], 32, top)), { fill: '#3e6639', stroke: INK, sw: 1.4 }));
  }
  const shirt: Pt[] = pts([[-6.5, 1], [1, -0.8], [7.5, 2.5], [8.5, 12], [7.5, 27], [-7.5, 27], [-8, 12]], 32, top);
  s.push(`<defs><clipPath id="torsoS"><path d="${blob(shirt)}"/></clipPath></defs>`);
  s.push(path(blob(shirt), { fill: L.top }));
  s.push(group(ellipse(32 - 10, top + 15, 6, 16, { fill: L.topShade }), undefined, 'clip-path="url(#torsoS)"'));
  s.push(path(blob(shirt), { stroke: INK, sw: OUT }));
  if (L.torso?.side) s.push(L.torso.side(top, 'torsoS'));
  if (L.style === 'norb') {
    s.push(path(`M${32 + 3} ${top + 6}h4.5v5h-4.5z`, { fill: '#f4f4f0', stroke: INK, sw: 1.2 }));
    s.push(path(`M${32 + 4.5} ${top + 3.5}L${32 + 4.5} ${top + 6.5}`, { stroke: '#d94a3a', sw: 1.5 }));
  } else if (L.style === 'pia') {
    s.push(group(path(`M10 ${top + 10}L54 ${top + 9}L54 ${top + 14}L10 ${top + 15}Z`, { fill: '#fbe9c8' }), undefined, 'clip-path="url(#torsoS)"'));
    s.push(path(`M${32 - 4} ${top + 1}Q${32 + 2} ${top + 8} ${32 - 3} ${top + 16}`, { stroke: '#3b5e38', sw: 2.6 }));
  }
  const seat: Pt[] = pts([[-8.5, -4], [8.5, -4], [8.5, 4], [0, 6], [-8.5, 4.5]], 32, r.hipY);
  s.push(path(blob(seat), { fill: L.legs, stroke: INK, sw: OUT }));
  if (L.style === 'norb') s.push(path(`M24 ${r.hipY - 2.5}L40.5 ${r.hipY - 2.5}`, { stroke: '#5a3a22', sw: 2.4 }));

  s.push(limb([nearArm.shoulder, nearArm.elbow, nearArm.hand], 6, [L.top, L.skin]));
  s.push(circle(nearArm.hand[0], nearArm.hand[1], 3.3, { fill: L.skin, stroke: INK, sw: OUT }));
  const hy = r.hipY - 51 + r.headDy;
  s.push(group(headSide(L, r), `translate(31 ${hy.toFixed(1)}) rotate(${r.tilt}) scale(${HEAD_SCALE})`));
  return s.join('');
}

export function humanDraw(L: HumanLook) {
  return (variant: ActorVariant, pose: ActorPose, f: number): string =>
    variant === 'side' ? humanSide(L, pose, f) : humanFront(L, pose, f, variant === 'back');
}

// ---- the tentacle -----------------------------------------------------------------

const TENT = {
  body: '#5cbf4a',
  shade: '#3b8f31',
  light: '#9ae585',
  foot: '#2f7a28',
  sucker: '#c4f0b0',
  lips: '#86d46c',
  mouth: '#24461d',
};

/** Ned: a tapered, swaying column with bulging eyes and a sucker mouth. The
 *  outline is built from the centreline and a width profile, so sway and
 *  squash-and-stretch stay smooth. */
function tentacleDraw(variant: ActorVariant, pose: ActorPose, f: number): string {
  const base = 116;
  let sway = 0;
  let squash = 0; // + = squashed flatter, - = stretched taller
  if (pose === 'idle') sway = 3.2 * Math.sin((f / 8) * Math.PI * 2);
  if (pose === 'walk') {
    const ph = (f / 8) * Math.PI * 2;
    sway = 6 * Math.sin(ph);
    squash = 0.07 * Math.cos(ph * 2);
  }
  if (pose === 'talk') {
    sway = [2, -1, 3, -2][f];
    squash = [-0.05, 0.02, -0.07, 0.03][f];
  }
  const height = 92 * (1 - squash);
  const widen = 1 + squash * 0.8;
  const side = variant === 'side' ? 1 : 0;
  // A gentle S-bend, the top curling forward in profile.
  const cx = (t: number) =>
    32 + sway * t ** 1.6 + Math.sin(t * Math.PI * 1.3) * 2.2 + (side ? 5 * t ** 3 : 0);
  const cy = (t: number) => base - 6 - height * t;
  const hw = (t: number) => (15.5 - 7.6 * t ** 0.9) * widen;

  // Outline: right side up, round cap over the top, left side down, flared foot.
  const right: Pt[] = [];
  const left: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = 0.08 + (i / 10) * 0.92;
    right.push([cx(t) + hw(t), cy(t)]);
    left.push([cx(t) - hw(t), cy(t)]);
  }
  const tipX = cx(1);
  const tipY = cy(1);
  const capR = hw(1);
  const outline: Pt[] = [
    [32 + 19 * widen, base],
    [32 + 16 * widen, base - 5],
    ...right.slice(1),
    [tipX + capR * 0.7, tipY - capR * 0.75],
    [tipX, tipY - capR],
    [tipX - capR * 0.7, tipY - capR * 0.75],
    ...left.slice(1).reverse(),
    [32 - 16 * widen, base - 5],
    [32 - 19 * widen, base],
  ];
  const body = blob(outline);
  const s: string[] = [];
  s.push(`<defs><clipPath id="tent"><path d="${body}"/></clipPath></defs>`);
  s.push(ellipse(32, base - 0.5, 21 * widen, 5.5, { fill: TENT.foot, stroke: INK, sw: OUT }));
  s.push(path(body, { fill: TENT.body }));
  // Cel shading: a dark band down the right flank, a highlight streak on the left.
  const shadeBand: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    shadeBand.push([cx(t) + hw(t) * 0.45, cy(t)]);
  }
  s.push(group(path(d([...shadeBand, [70, cy(1) - 20], [70, base + 4]]) + 'Z', { fill: TENT.shade }), undefined, 'clip-path="url(#tent)"'));
  const hl: Pt[] = [];
  for (let i = 1; i <= 7; i++) {
    const t = 0.15 + i * 0.1;
    hl.push([cx(t) - hw(t) * 0.55, cy(t)]);
  }
  s.push(path(curve(hl), { stroke: TENT.light, sw: 3, opacity: 0.85 }));
  s.push(ellipse(tipX - capR * 0.35, tipY - capR * 0.35, 2, 1.3, { fill: '#e6ffd8', opacity: 0.8 }));
  s.push(path(body, { stroke: INK, sw: OUT }));

  if (variant === 'back') {
    // From behind: just the ridge of the back and a couple of bumps.
    s.push(path(curve([[cx(0.15), cy(0.15)], [cx(0.5), cy(0.5)], [cx(0.85), cy(0.85)]]), { stroke: TENT.shade, sw: 2 }));
    return s.join('');
  }

  // Suckers down the front (side view: along the facing edge).
  const suckers: Array<[number, number, number]> = side
    ? [[0.2, 0.74, 3.2], [0.33, 0.78, 2.6]]
    : [[0.2, -0.3, 3.4], [0.33, 0.28, 2.8]];
  for (const [t, off, r] of suckers) {
    const x = cx(t) + hw(t) * off;
    s.push(ellipse(x, cy(t), r * (side ? 0.7 : 1), r * 0.85, { fill: TENT.sucker, stroke: INK, sw: 1.4 }));
    s.push(ellipse(x, cy(t) + 0.3, r * 0.35 * (side ? 0.7 : 1), r * 0.3, { fill: TENT.shade }));
  }

  // Mouth: a rubbery sucker ring that opens when he talks.
  const mt = 0.56;
  const mx = cx(mt) + (side ? hw(mt) * 0.75 : 0);
  const my = cy(mt);
  const open = pose === 'talk' ? [4.4, 1.6, 3.6, 2][f] : 1.2;
  const mw = side ? 3.6 : 6.8;
  s.push(ellipse(mx + (side ? 1.5 : 0), my, mw + 2.6, open + 3, { fill: TENT.lips, stroke: INK, sw: 1.9 }));
  s.push(path(`M${mx - mw - 1} ${my - open - 1.2}Q${mx} ${my - open - 3.2} ${mx + mw + 1} ${my - open - 1.2}`, { stroke: TENT.light, sw: 1.6, opacity: 0.9 }));
  s.push(ellipse(mx + (side ? 1.5 : 0), my + 0.3, mw - 0.4, open, { fill: TENT.mouth, stroke: INK, sw: 1.3 }));

  // Eyes: bulging, slightly crossed, with heavy lids.
  const et = 0.8;
  const blink = pose === 'idle' && f === 6;
  const eyes: Array<[number, number]> = side ? [[hw(et) * 0.1, 5.8], [hw(et) * 0.95, 5.2]] : [[-hw(et) * 0.55, 6.4], [hw(et) * 0.55, 6.4]];
  for (const [ox, r] of eyes) {
    const ex = cx(et) + ox;
    const ey = cy(et);
    s.push(ellipse(ex, ey, r, r * 1.15, { fill: '#ffffff', stroke: INK, sw: 1.8 }));
    if (blink) {
      s.push(path(`M${ex - r} ${ey}Q${ex} ${ey + r * 0.9} ${ex + r} ${ey}`, { fill: TENT.body, stroke: INK, sw: 1.5 }));
      s.push(path(`M${ex - r} ${ey}A${r} ${r * 1.15} 0 0 1 ${ex + r} ${ey}Z`, { fill: TENT.body, stroke: INK, sw: 1.5 }));
    } else {
      const look = side ? 1.6 : 0.8;
      s.push(circle(ex + look, ey + 0.6, r * 0.42, { fill: INK }));
      s.push(circle(ex + look + 0.7, ey - 0.4, r * 0.15, { fill: '#ffffff' }));
      // Upper lid: a sleepy, friendly droop.
      s.push(path(`M${ex - r * 1.02} ${ey - r * 0.25}A${r} ${r * 1.15} 0 0 1 ${ex + r * 1.02} ${ey - r * 0.25}Q${ex} ${ey - r * 0.55} ${ex - r * 1.02} ${ey - r * 0.25}Z`, { fill: TENT.body, stroke: INK, sw: 1.5 }));
    }
  }
  const brow = pose === 'talk' ? [1.5, 0, 2, 0.5][f] : 0;
  for (const [ox, r] of eyes) {
    const ex = cx(et) + ox;
    const ey = cy(et) - r * 1.5 - brow;
    s.push(path(`M${ex - r * 0.8} ${ey + 1}Q${ex} ${ey - 1.5} ${ex + r * 0.8} ${ey + 0.5}`, { stroke: INK, sw: 1.8 }));
  }
  return s.join('');
}

// ---- manifest entries ---------------------------------------------------------------

export const CHARACTER_SPRITES: SvgActorAsset[] = [
  { key: 'guy', width: 64, height: 120, poses: POSES, draw: humanDraw(NORB_LOOK) },
  { key: 'pal', width: 64, height: 120, poses: POSES, draw: humanDraw(PIA_LOOK) },
  { key: 'tent', width: 64, height: 120, poses: POSES, draw: tentacleDraw },
];
