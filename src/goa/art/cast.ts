import type { ActorPose, ActorVariant, SvgActorAsset } from '../../engine/types';
import { INK, blob, circle, curve, ellipse, group, path, poly, puff, rect, text, type Pt } from '../../game/art/toon';
import {
  FACE_FRONT,
  OUT,
  POSES,
  SKULL_SIDE,
  drawHumanFront,
  drawHumanSide,
  frontRig,
  sideRig,
  humanDraw,
  mouthFront,
  mouthSide,
  shadedHead,
  type HumanLook,
  type Mouth,
  type Rig,
} from '../../game/art/characters';

/**
 * The cast of "Folge dem Bass", built on the demo's puppet rig (same joints,
 * same DOTT proportions) with their own heads and clothes:
 *  - der Spieler: beanie, hoodie, cargo pants — on his way to a forest rave;
 *  - Ali: the landlord of the Picasso, polishing a glass behind his counter;
 *    Custom poses: 'sing' (eyes shut, hand on heart — the jukebox refrain)
 *    and 'wink' (the conspicuous one).
 *  - Hilde: a regular who dances in front of the DJ booth and grabs at
 *    anyone who comes too close ('dance', 'grab');
 *  - der Partykiller: a retired cop on a bar stool, in his old green uniform,
 *    seated with his back to us at the counter (back view) — he turns round
 *    (front view) to talk. Custom poses: 'reach' and 'drink' (the refrain:
 *    eyes shut, grabbing for a glass), 'sleep', 'stand', and his dance,
 *    'traffic' then 'disco'.
 */

const ear = (L: HumanLook, x: number): string =>
  ellipse(x, 1, 3.2, 4.6, { fill: L.skin, stroke: INK, sw: OUT }) +
  path(`M${x * 0.97} -1Q${x * 1.04} 1 ${x * 0.97} 3`, { stroke: L.skinShade, sw: 1.4 });

/** Round eyes with pupils; `look` shifts the pupils sideways. */
function eyesFront(r: Rig, xs: number[], look = 0.5, y = -1.5): string {
  return xs
    .map((x) =>
      r.blink
        ? path(`M${x - 3.3} ${y + 0.5}Q${x} ${y + 2.6} ${x + 3.3} ${y + 0.5}`, { stroke: INK, sw: 1.6 })
        : ellipse(x, y, 3.3, 3.9, { fill: '#ffffff', stroke: INK, sw: 1.5 }) +
          circle(x + look, y + 0.4, 1.7, { fill: INK }) +
          circle(x + look + 0.6, y - 0.6, 0.55, { fill: '#ffffff' })
    )
    .join('');
}

function eyeSide(r: Rig, x = 8.4, y = -1.8): string {
  if (r.blink) return path(`M${x - 2.8} ${y + 0.4}Q${x} ${y + 2.4} ${x + 2.8} ${y + 0.4}`, { stroke: INK, sw: 1.5 });
  return (
    ellipse(x, y, 2.7, 3.6, { fill: '#ffffff', stroke: INK, sw: 1.4 }) +
    circle(x + 1.2, y + 0.4, 1.6, { fill: INK }) +
    circle(x + 1.7, y - 0.5, 0.5, { fill: '#ffffff' })
  );
}

// ---- der Spieler ------------------------------------------------------------------

const BEANIE = '#e8743a';
const BEANIE_SHADE = '#b9532a';

const RAVER: HumanLook = {
  skin: '#f2c39c',
  skinShade: '#d4926a',
  hair: '#9a6a34',
  hairShade: '#6a4420',
  top: '#2fb3a3',
  topShade: '#1f8478',
  legs: '#6e6b45',
  legsShade: '#4f4c30',
  shoes: '#f4efe4',
  shoeTrim: '#ef7a32',
  style: 'custom',
  head: { front: raverHeadFront, side: raverHeadSide },
  torso: { front: hoodieFront, side: hoodieSide },
};

function beanieFront(): string {
  return (
    path(blob([[-15.5, -5], [-15.5, -14], [-9, -21], [0, -23], [9, -21], [15.5, -14], [15.5, -5]]), {
      fill: BEANIE,
      stroke: INK,
      sw: OUT,
    }) +
    path(curve([[-6, -19], [-5, -12], [-5.5, -8]]), { stroke: BEANIE_SHADE, sw: 1.3 }) +
    path(curve([[3, -20.5], [3.5, -13], [3, -8]]), { stroke: BEANIE_SHADE, sw: 1.3 }) +
    path(blob([[-16.5, -11], [0, -12.5], [16.5, -11], [16.8, -4], [0, -3], [-16.8, -4]]), {
      fill: BEANIE_SHADE,
      stroke: INK,
      sw: OUT,
    }) +
    [-12, -7, -2, 3, 8, 13].map((x) => path(`M${x} -10.5V-5`, { stroke: '#8f3e1e', sw: 1.1 })).join('') +
    circle(0, -21.5, 3.6, { fill: '#ffd34a', stroke: INK, sw: OUT }) +
    circle(-1.1, -22.6, 1.1, { fill: '#fff4b8' })
  );
}

function raverHeadFront(r: Rig, back: boolean): string {
  const L = RAVER;
  const s: string[] = [ear(L, -14), ear(L, 14)];
  if (back) {
    s.push(path(blob([[-14.5, 9], [-15, -5], [0, -8], [15, -5], [14.5, 9], [7, 13], [-7, 13]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-6, 0], [-5, 6], [-7, 11]]), { stroke: L.hairShade, sw: 1.4 }));
    s.push(path(curve([[5, 0], [6, 6], [4, 11]]), { stroke: L.hairShade, sw: 1.4 }));
    s.push(beanieFront());
    return s.join('');
  }
  s.push(shadedHead(L, FACE_FRONT, 'faceF', 3));
  // Tufts escaping the beanie.
  s.push(path(blob([[-15, -6], [-17.5, 1], [-13.5, -1.5], [-12, -5]]), { fill: L.hair, stroke: INK, sw: 1.6 }));
  s.push(path(blob([[15, -6], [17.5, 1.5], [13.5, -1], [12, -5]]), { fill: L.hair, stroke: INK, sw: 1.6 }));
  s.push(eyesFront(r, [-5.6, 5.6]));
  s.push(path('M-9 -7.2Q-5.6 -9.2 -2.4 -7.4M2.4 -7.4Q5.6 -9.2 9 -7.2', { stroke: L.hairShade, sw: 1.7 }));
  s.push(ellipse(0, 5.4, 3.9, 4.1, { fill: L.skin, stroke: INK, sw: 1.8 }));
  s.push(circle(-1.3, 3.8, 1, { fill: '#ffffff', opacity: 0.7 }));
  s.push(mouthFront(r.mouth, 11.6, 3.5));
  s.push(path('M-8.5 6.5h2M7 6.5h2', { stroke: '#e07a6a', sw: 1.4, opacity: 0.6 }));
  s.push(beanieFront());
  return s.join('');
}

function raverHeadSide(r: Rig): string {
  const L = RAVER;
  const s: string[] = [shadedHead(L, SKULL_SIDE, 'faceS', -3)];
  s.push(ellipse(-4, 2, 3.1, 4.5, { fill: L.skin, stroke: INK, sw: OUT }));
  s.push(path('M-4.6 0Q-2.6 2 -4.6 4', { stroke: L.skinShade, sw: 1.3 }));
  s.push(path(blob([[-13, -4], [-15, 6], [-10.5, 3], [-9, -3]]), { fill: L.hair, stroke: INK, sw: 1.6 }));
  s.push(eyeSide(r));
  s.push(path('M5 -8.4Q8.5 -10.4 11.8 -8.2', { stroke: L.hairShade, sw: 1.7 }));
  s.push(path(blob([[12, -1], [16.5, 1.5], [17.5, 5.5], [13.5, 7.5], [11, 4]]), { fill: L.skin, stroke: INK, sw: 1.8 }));
  s.push(mouthSide(r.mouth, 10, 11.5));
  s.push(
    path(blob([[-14.5, -3], [-14, -13], [-5, -20.5], [6, -20], [13, -13], [14, -5]]), { fill: BEANIE, stroke: INK, sw: OUT }) +
      path(blob([[-15.5, -9], [0, -10.5], [15, -8.5], [15.5, -2], [0, -3.5], [-15.8, -2.5]]), { fill: BEANIE_SHADE, stroke: INK, sw: OUT }) +
      circle(-1.5, -21, 3.6, { fill: '#ffd34a', stroke: INK, sw: OUT })
  );
  return s.join('');
}

function hoodieFront(top: number, back: boolean, clip: string): string {
  const L = RAVER;
  if (back) {
    // The hood, lying between the shoulders.
    return path(blob([[24, top - 1], [40, top - 1], [38, top + 9], [32, top + 12], [26, top + 9]]), {
      fill: L.topShade,
      stroke: INK,
      sw: 1.8,
    });
  }
  return (
    path(`M23 ${top + 0.5}Q32 ${top + 8} 41 ${top + 0.5}`, { stroke: INK, sw: 3.6 }) +
    path(`M23 ${top + 0.5}Q32 ${top + 8} 41 ${top + 0.5}`, { stroke: L.topShade, sw: 2 }) +
    path(`M29.5 ${top + 4}V${top + 12}M34.5 ${top + 4}V${top + 11}`, { stroke: '#f4efe4', sw: 1.4 }) +
    group(
      path(blob([[23, top + 16], [41, top + 16], [43.5, top + 28], [20.5, top + 28]]), {
        fill: L.topShade,
        stroke: INK,
        sw: 1.5,
      }),
      undefined,
      `clip-path="url(#${clip})"`
    ) +
    // A little smiley-sun print: rave-ready.
    circle(32, top + 10.5, 2.6, { fill: '#ffd34a', stroke: INK, sw: 1 })
  );
}

function hoodieSide(top: number): string {
  return (
    path(blob([[21, top + 1], [29, top - 1], [28, top + 9], [22.5, top + 10]]), { fill: RAVER.topShade, stroke: INK, sw: 1.8 }) +
    path(`M33 ${top + 17}L39 ${top + 17}`, { stroke: INK, sw: 1.4 })
  );
}

// ---- Ali ----------------------------------------------------------------------------

const VEST = '#2c2633';

const ALI: HumanLook = {
  skin: '#d6a074',
  skinShade: '#b07850',
  hair: '#231a1e',
  hairShade: '#4a3a40',
  top: '#f4f1e8',
  topShade: '#cfc8b8',
  legs: '#2c2a34',
  legsShade: '#1c1a22',
  shoes: '#3a2a20',
  shoeTrim: '#1e1410',
  style: 'custom',
  head: { front: aliHeadFront, side: aliHeadSide },
  torso: { front: aliVestFront, side: aliVestSide },
};

function aliHeadFront(r: Rig, back: boolean): string {
  const L = ALI;
  const s: string[] = [ear(L, -14), ear(L, 14)];
  if (back) {
    s.push(path(blob([[-15, 7], [-15.5, -8], [-9, -18], [0, -20], [9, -18], [15.5, -8], [15, 7], [8, 11], [-8, 11]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(path(curve([[-8, -12], [-9, -4], [-8, 5]]), { stroke: L.hairShade, sw: 1.4 }));
    return s.join('');
  }
  s.push(shadedHead(L, FACE_FRONT, 'faceF', 3));
  // Five-o'clock shadow along the jaw.
  s.push(path(blob([[-12.5, 5], [-7, 14], [0, 17], [7, 14], [12.5, 5], [7, 9], [0, 10.5], [-7, 9]]), { fill: '#5a4038', opacity: 0.22 }));
  // r.swing === 1 marks the wink ('wink' pose): left eye squeezed shut,
  // right eye wide, right brow way up.
  const wink = r.swing === 1;
  if (wink) {
    s.push(path('M-9.4 -1Q-5.6 2.2 -1.8 -1', { stroke: INK, sw: 2 }));
    s.push(path('M-9.6 1.6L-8 0M-9 -3.4L-7.4 -2', { stroke: INK, sw: 1 }));
    s.push(eyesFront({ ...r, blink: false }, [5.6], 0.3, -2));
  } else {
    s.push(eyesFront(r, [-5.6, 5.6], 0.3));
  }
  // Kind, heavy-lidded eyes and serious brows.
  if (!r.blink && !wink) {
    for (const x of [-5.6, 5.6]) {
      s.push(path(`M${x - 3.5} -2.4Q${x} -6.4 ${x + 3.5} -2.4Q${x} -4.2 ${x - 3.5} -2.4Z`, { fill: L.skinShade, stroke: INK, sw: 1.2 }));
    }
  }
  s.push(path(wink ? 'M-10 -6.4Q-6 -7.8 -2 -6M2 -10.8Q6 -14.2 10 -11.4' : 'M-10 -7.8Q-6 -10.6 -2 -8.2M2 -8.2Q6 -10.6 10 -7.8', { stroke: L.hair, sw: 2.8 }));
  s.push(ellipse(0, 4.6, 4.4, 4.8, { fill: L.skin, stroke: INK, sw: 1.8 }));
  s.push(circle(-1.5, 3, 1.1, { fill: '#ffffff', opacity: 0.6 }));
  s.push(mouthFront(r.mouth, 11.6, 3.4));
  // Hair: short, neat, a proud widow's peak.
  s.push(path(blob([[-15, -1], [-15.5, -11], [-9, -19], [0, -21], [9, -19], [15.5, -11], [15, -1], [12.5, -9], [6, -11], [0, -8.5], [-6, -11], [-12.5, -9]]), { fill: L.hair, stroke: INK, sw: OUT }));
  s.push(path(curve([[-8, -15], [0, -17.5], [8, -15]]), { stroke: L.hairShade, sw: 1.3 }));
  return s.join('');
}

function aliHeadSide(r: Rig): string {
  const L = ALI;
  const s: string[] = [shadedHead(L, SKULL_SIDE, 'faceS', -3)];
  s.push(path(blob([[2, 6], [8, 15], [3, 16.5], [-3, 15]]), { fill: '#5a4038', opacity: 0.22 }));
  s.push(ellipse(-4, 2, 3.1, 4.5, { fill: L.skin, stroke: INK, sw: OUT }));
  s.push(eyeSide(r, 8.2, -2));
  s.push(path('M4.5 -8.8Q8.5 -11 12 -8.6', { stroke: L.hair, sw: 2.6 }));
  s.push(path(blob([[11.5, -2], [17, -0.5], [19.5, 4], [16.5, 8], [12, 7.5], [10.5, 3]]), { fill: L.skin, stroke: INK, sw: 1.8 }));
  s.push(mouthSide(r.mouth, 10, 11.8));
  s.push(path(blob([[-14, 6], [-15.5, -6], [-10, -16.5], [0, -21], [9, -19], [13.5, -12.5], [10, -9.5], [3, -10], [-3, -6], [-7, 1], [-10, 8]]), { fill: L.hair, stroke: INK, sw: OUT }));
  return s.join('');
}

function aliVestFront(top: number, back: boolean, clip: string): string {
  const panels = back
    ? rect(0, top - 4, 64, 34, { fill: VEST })
    : path(poly([[8, top - 4], [28.5, top + 1], [30, top + 28], [8, top + 28]]), { fill: VEST }) +
      path(poly([[56, top - 4], [35.5, top + 1], [34, top + 28], [56, top + 28]]), { fill: VEST });
  const s: string[] = [group(panels, undefined, `clip-path="url(#${clip})"`)];
  if (!back) {
    s.push(path(`M28.5 ${top + 1}L30 ${top + 27}M35.5 ${top + 1}L34 ${top + 27}`, { stroke: INK, sw: 1.4 }));
    for (const y of [12, 18, 24]) s.push(circle(29.6, top + y, 0.9, { fill: '#c9a24a' }));
    // A bow tie — Ali runs a respectable establishment.
    s.push(path(`M28 ${top - 1}L32 ${top + 1.5}L28 ${top + 4}ZM36 ${top - 1}L32 ${top + 1.5}L36 ${top + 4}Z`, { fill: '#a8283a', stroke: INK, sw: 1.2 }));
    // Bar towel over the shoulder.
    s.push(path(blob([[17, top - 1], [24, top - 1], [24, top + 17], [18, top + 16]]), { fill: '#f0ece0', stroke: INK, sw: 1.5 }));
    s.push(path(`M18 ${top + 5}H24M18 ${top + 9}H24`, { stroke: '#4a7ac0', sw: 1.4 }));
  }
  return s.join('');
}

function aliVestSide(top: number, clip: string): string {
  return group(path(poly([[0, top - 4], [33, top - 4], [35, top + 30], [0, top + 30]]), { fill: VEST }), undefined, `clip-path="url(#${clip})"`);
}

/** Ali's idle stance: polishing a glass with the towel, in small circles. */
function aliPolish(variant: ActorVariant, f: number): string {
  const r = frontRig('idle', f * 2);
  const sy = r.hipY - 26 - r.breath * 0.7;
  const a = (f / 4) * Math.PI * 2;
  const gx = 32 + Math.cos(a) * 1.2;
  const gy = sy + 13 + Math.sin(a) * 1.2;
  r.arms = [
    { shoulder: [21, sy], elbow: [17, sy + 11], hand: [gx - 5, gy + 2] },
    { shoulder: [43, sy], elbow: [47, sy + 10], hand: [gx + 4 + Math.cos(a) * 2, gy - 3 + Math.sin(a) * 2] },
  ];
  const back = variant === 'back';
  const body = drawHumanFront(ALI, r, back);
  if (back) return body;
  const glass =
    path(`M${gx - 4} ${gy - 8}L${gx + 4} ${gy - 8}L${gx + 3} ${gy + 4}L${gx - 3} ${gy + 4}Z`, {
      fill: '#d8eef4',
      stroke: INK,
      sw: 1.4,
      opacity: 0.95,
    }) + path(`M${gx - 2.2} ${gy - 6}L${gx - 1.6} ${gy + 2}`, { stroke: '#ffffff', sw: 1.2 });
  // The glass sits between the hands; the towel hand rubs over it.
  const hands = r.arms
    .map((arm) => circle(arm.hand[0], arm.hand[1], 3.3, { fill: ALI.skin, stroke: INK, sw: OUT }))
    .join('');
  return body + glass + hands;
}

/** Ali sings along to the refrain: eyes shut, hand on his heart, swaying. */
function aliSing(variant: ActorVariant, f: number): string {
  const mouth = (['o', 'a', 'o', 'shut'] as Mouth[])[f];
  if (variant === 'side') {
    const r = sideRig('talk', f);
    r.blink = true;
    r.mouth = mouth;
    r.tilt = [-6, -3, -6, -2][f];
    return drawHumanSide(ALI, r);
  }
  const r = frontRig('idle', 2);
  const sy = r.hipY - 26 - r.breath * 0.7;
  r.blink = true;
  r.mouth = mouth;
  r.tilt = [-5, 0, 5, 0][f];
  r.arms[1] = { shoulder: [43, sy], elbow: [44, sy + 12], hand: [35, sy + 8] };
  return drawHumanFront(ALI, r, variant === 'back');
}

/** "Zwinker, zwinker": a wink you could see from the street. */
function aliWink(f: number): string {
  const r = frontRig('idle', 0);
  r.swing = 1;
  r.mouth = 'a';
  r.tilt = [6, 8][f];
  r.headDy = -f;
  return drawHumanFront(ALI, r);
}

// ---- der Partykiller ------------------------------------------------------------

const COP: HumanLook = {
  skin: '#eab894',
  skinShade: '#c98c6c',
  hair: '#c4c0b8',
  hairShade: '#8a867e',
  top: '#4c7a52',
  topShade: '#33573a',
  legs: '#c9b98e',
  legsShade: '#a3946c',
  shoes: '#1e1a1a',
  shoeTrim: '#3a3434',
  style: 'custom',
  head: { front: copHeadFront, side: copHeadSide },
  torso: { front: copJacketFront, side: copJacketSide },
};

function capFront(): string {
  return (
    path(blob([[-17, -11], [-17.5, -21], [-9, -27.5], [9, -27.5], [17.5, -21], [17, -11]]), { fill: '#3f6e47', stroke: INK, sw: OUT }) +
    path(curve([[-9, -24], [0, -26], [9, -24]]), { stroke: '#6a9a70', sw: 1.4 }) +
    rect(-16.5, -14.5, 33, 6, { fill: '#1e2a20', stroke: INK, sw: 1.6 }, 1.5) +
    path('M-15 -8.5Q0 -2.5 15 -8.5L13 -6Q0 -1 -13 -6Z', { fill: '#141414', stroke: INK, sw: 1.6 }) +
    path('M-10 -7Q0 -4 10 -7', { stroke: '#5a5a5a', sw: 1 }) +
    // The star badge, still polished.
    path('M0 -24.5L1.5 -21.2L5 -21L2.3 -18.8L3.2 -15.4L0 -17.3L-3.2 -15.4L-2.3 -18.8L-5 -21L-1.5 -21.2Z', {
      fill: '#e8c23a',
      stroke: INK,
      sw: 1,
    })
  );
}

function copHeadFront(r: Rig, back: boolean): string {
  const L = COP;
  const s: string[] = [ear(L, -14), ear(L, 14)];
  if (back) {
    s.push(path(blob([[-15, 6], [-15.5, -8], [0, -12], [15.5, -8], [15, 6], [8, 10], [-8, 10]]), { fill: L.hair, stroke: INK, sw: OUT }));
    s.push(capFront().replace(/#141414/g, '#2a3a2c'));
    return s.join('');
  }
  s.push(shadedHead(L, FACE_FRONT, 'faceF', 3));
  // Grey sideburns under the cap.
  s.push(path(blob([[-14.5, -9], [-15, 1], [-12, 0], [-11.5, -8]]), { fill: L.hair, stroke: INK, sw: 1.4 }));
  s.push(path(blob([[14.5, -9], [15, 1], [12, 0], [11.5, -8]]), { fill: L.hair, stroke: INK, sw: 1.4 }));
  // Eyes that see everything (r.swing steers the pupils).
  s.push(eyesFront(r, [-5.6, 5.6], r.swing * 1.4, -1));
  // Brows: a permanent frown.
  s.push(path('M-10 -5.6L-2.6 -3.6M2.6 -3.6L10 -5.6', { stroke: '#e8e4dc', sw: 3.6 }));
  s.push(path('M-10 -5.6L-2.6 -3.6M2.6 -3.6L10 -5.6', { stroke: INK, sw: 1, opacity: 0.6 }));
  // The nose has seen a few Feierabendbiere.
  s.push(ellipse(0, 5, 4.8, 4.6, { fill: '#e08070', stroke: INK, sw: 1.8 }));
  s.push(circle(-1.6, 3.4, 1.1, { fill: '#ffffff', opacity: 0.6 }));
  s.push(mouthFront(r.mouth, 13.5, 3.4));
  // Walrus moustache.
  s.push(path(blob([[-11, 13], [-7, 8.5], [0, 9.5], [7, 8.5], [11, 13], [7, 12], [3, 13.5], [0, 12], [-3, 13.5], [-7, 12]]), { fill: '#e8e4dc', stroke: INK, sw: 1.5 }));
  s.push(path('M-6 10.5L-6.5 12.5M-3 10.5L-3 12.8M3 10.5L3 12.8M6 10.5L6.5 12.5', { stroke: '#a8a49c', sw: 0.9 }));
  s.push(capFront());
  return s.join('');
}

function copHeadSide(r: Rig): string {
  const L = COP;
  const s: string[] = [shadedHead(L, SKULL_SIDE, 'faceS', -3)];
  s.push(ellipse(-4, 2, 3.1, 4.5, { fill: L.skin, stroke: INK, sw: OUT }));
  s.push(path(blob([[-13.5, -8], [-14, 4], [-9, 2], [-8.5, -7]]), { fill: L.hair, stroke: INK, sw: 1.4 }));
  s.push(eyeSide(r, 8.2, -1.6));
  s.push(path('M4.5 -5.8L12 -4.4', { stroke: '#e8e4dc', sw: 3.4 }));
  s.push(path(blob([[11.5, -1], [17.5, 0.5], [20, 5], [16.5, 8.5], [12, 7.5], [10.5, 3]]), { fill: '#e08070', stroke: INK, sw: 1.8 }));
  s.push(mouthSide(r.mouth, 10, 14));
  s.push(path(blob([[6, 10], [12, 8.6], [17, 11.5], [13, 14], [7.5, 13]]), { fill: '#e8e4dc', stroke: INK, sw: 1.4 }));
  s.push(
    path(blob([[-15.5, -9], [-15, -20], [-5, -26], [8, -25], [15, -19], [15, -10]]), { fill: '#3f6e47', stroke: INK, sw: OUT }) +
      rect(-15.5, -13, 31, 5.5, { fill: '#1e2a20', stroke: INK, sw: 1.5 }, 1.5) +
      path('M9 -8L22 -6.5L20 -4.5L8 -6Z', { fill: '#141414', stroke: INK, sw: 1.5 })
  );
  return s.join('');
}

function copJacketFront(top: number, back: boolean): string {
  if (back) return path(`M32 ${top + 2}V${top + 26}`, { stroke: '#33573a', sw: 1.4 });
  return (
    // Beige shirt and tie in the V of the jacket.
    path(`M26.5 ${top}L32 ${top + 9}L37.5 ${top}Z`, { fill: '#e8dcb4', stroke: INK, sw: 1.3 }) +
    path(`M31 ${top + 2}h2l0.8 6.5l-1.8 2l-1.8 -2z`, { fill: '#2e3a30', stroke: INK, sw: 0.9 }) +
    path(`M26.5 ${top}L32 ${top + 9}L37.5 ${top}`, { stroke: INK, sw: 1.6 }) +
    path(`M32 ${top + 9}V${top + 26}`, { stroke: INK, sw: 1.3 }) +
    [13, 19, 24].map((y) => circle(33.6, top + y, 1, { fill: '#c9b04a', stroke: INK, sw: 0.6 })).join('') +
    // Breast pockets and the epaulettes with their retired stars.
    path(`M22 ${top + 9}h6v5h-6zM36 ${top + 9}h6v5h-6z`, { fill: '#436e49', stroke: INK, sw: 1.1 }) +
    path(`M20 ${top + 0.5}l7 1.5M44 ${top + 0.5}l-7 1.5`, { stroke: '#2a4430', sw: 3.2 }) +
    circle(23, top + 1, 1, { fill: '#e8c23a' }) +
    circle(41, top + 1, 1, { fill: '#e8c23a' })
  );
}

function copJacketSide(top: number): string {
  return path(`M35 ${top + 9}h5v5h-5z`, { fill: '#436e49', stroke: INK, sw: 1.1 });
}

const COP_W = 96;
const COP_H = 132;
/** The cop frames are wider (outstretched arms) and taller (cap, snoring
 *  z's) than the rig's 64×120; the rig draws centred at x=32. */
const COP_DX = 16;
const COP_DY = COP_H - 120;

/** Seated on the bar stool: hips at seat height, feet on the foot rest. */
function seatedRig(f: number, mouth: Mouth = 'shut'): Rig {
  const base = frontRig('idle', f % 8);
  // Perched on a bar stool: hips up at seat height, feet on the foot rest.
  const hipY = 80;
  const sy = hipY - 26 - base.breath * 0.7;
  return {
    ...base,
    hipY,
    mouth,
    // Knees apart, feet tucked back onto the stool's foot rest.
    legs: [-1, 1].map((side) => ({
      hip: [32 + side * 5, hipY] as Pt,
      knee: [32 + side * 11.5, hipY + 6] as Pt,
      ankle: [32 + side * 9, hipY + 17] as Pt,
      footRot: 0,
      lift: 0,
    })),
    // Hands resting on the knees.
    arms: [-1, 1].map((side) => ({
      shoulder: [32 + side * 11, sy] as Pt,
      elbow: [32 + side * 14.5, sy + 11] as Pt,
      hand: [32 + side * 11, hipY + 4] as Pt,
    })),
  };
}

/** A pointing index finger sticking out of a hand, along the forearm. */
function finger(elbow: Pt, hand: Pt, skin: string): string {
  const dx = hand[0] - elbow[0];
  const dy = hand[1] - elbow[1];
  const len = Math.hypot(dx, dy) || 1;
  const tip: Pt = [hand[0] + (dx / len) * 6.5, hand[1] + (dy / len) * 6.5];
  return (
    path(`M${hand[0]} ${hand[1]}L${tip[0]} ${tip[1]}`, { stroke: INK, sw: 3.6 }) +
    path(`M${hand[0]} ${hand[1]}L${tip[0]} ${tip[1]}`, { stroke: skin, sw: 1.6 })
  );
}

const copFrame = (body: string): string => group(body, `translate(${COP_DX} ${COP_DY})`);

function copSeated(f: number): string {
  const r = seatedRig(f);
  // Shifty eyes: everything gets noticed. Everything gets reported.
  r.swing = [0, 0, -1, -1, -1, 0, 1, 1][f];
  r.blink = f === 5;
  return copFrame(drawHumanFront(COP, r));
}

function copTalk(f: number): string {
  const r = seatedRig(0, (['a', 'shut', 'o', 'shut'] as Mouth[])[f]);
  const sy = r.hipY - 26;
  // The raised index finger of official objection.
  const hand: Pt = [44, sy - 4 + (f % 2) * 2];
  const elbow: Pt = [48, sy + 9];
  r.arms[1] = { shoulder: [43, sy], elbow, hand };
  r.tilt = [2, -1, 3, 0][f];
  return copFrame(drawHumanFront(COP, r) + finger(elbow, hand, COP.skin));
}

function copSleep(f: number): string {
  const r = seatedRig(0, f % 2 ? 'o' : 'shut');
  const sy = r.hipY - 26;
  r.blink = true;
  r.headDy = 3 + (f % 2) * 0.6;
  r.tilt = 9;
  // Arms crossed over the chest.
  r.arms = [
    { shoulder: [21, sy], elbow: [18.5, sy + 12], hand: [40, sy + 9] },
    { shoulder: [43, sy], elbow: [46, sy + 13], hand: [24, sy + 12] },
  ];
  return copFrame(drawHumanFront(COP, r) + zzz(f));
}

// Back view: seated at the counter, facing it (as in the concept art).

function copSeatedBack(f: number): string {
  const r = seatedRig(f);
  const sy = r.hipY - 26 - r.breath * 0.7;
  // Elbows out, hands on the counter in front of him.
  r.arms = [-1, 1].map((side) => ({ shoulder: [32 + side * 11, sy] as Pt, elbow: [32 + side * 16, sy + 9] as Pt, hand: [32 + side * 7, sy + 6] as Pt }));
  r.tilt = [0, 0, 3, 3, 3, 0, -3, -3][f];
  return copFrame(drawHumanFront(COP, r, true));
}

function copTalkBack(f: number): string {
  const r = seatedRig(0);
  const sy = r.hipY - 26;
  r.arms = [-1, 1].map((side) => ({ shoulder: [32 + side * 11, sy] as Pt, elbow: [32 + side * 16, sy + 9] as Pt, hand: [32 + side * 7, sy + 6] as Pt }));
  r.headDy = -(f % 2);
  r.tilt = [4, 0, 6, 2][f];
  return copFrame(drawHumanFront(COP, r, true));
}

/** The refrain: eyes shut, swaying, one hand groping for a glass. */
function copReach(f: number): string {
  const r = seatedRig(0);
  const sy = r.hipY - 26;
  r.arms = [
    { shoulder: [21, sy], elbow: [16, sy + 9], hand: [24, sy + 6] },
    { shoulder: [43, sy], elbow: [52, sy - 6 + (f % 2) * 2], hand: [56 + (f % 2) * 2, sy - 17 + (f % 2) * 3] },
  ];
  r.tilt = [-4, 4, -4, 4][f];
  const hand = r.arms[1].hand;
  // Fingers curled round an imaginary glass.
  const grab = path(`M${hand[0] - 3} ${hand[1] - 3}q3 -4 6 0`, { stroke: INK, sw: 1.6 });
  return copFrame(drawHumanFront(COP, r, true) + grab);
}

/** Down in one: glass to the mouth, head back. */
function copDrink(f: number): string {
  const r = seatedRig(0);
  const sy = r.hipY - 26;
  r.arms = [
    { shoulder: [21, sy], elbow: [16, sy + 9], hand: [24, sy + 6] },
    { shoulder: [43, sy], elbow: [53, sy + 1], hand: [41, sy - 15] },
  ];
  r.headDy = -2;
  r.tilt = [-8, -12][f];
  const [hx, hy] = r.arms[1].hand;
  const glass = path(`M${hx - 3} ${hy - 9}h6l-1 9h-4z`, { fill: '#e8f4f8', stroke: INK, sw: 1.2 }) + path(`M${hx - 2.2} ${hy - 7}h4.4`, { stroke: '#ffffff', sw: 1 });
  return copFrame(drawHumanFront(COP, r, true) + glass);
}

function copSleepBack(f: number): string {
  const r = seatedRig(0);
  const sy = r.hipY - 26;
  r.arms = [-1, 1].map((side) => ({ shoulder: [32 + side * 11, sy] as Pt, elbow: [32 + side * 15, sy + 11] as Pt, hand: [32 + side * 5, sy + 9] as Pt }));
  r.headDy = 4 + (f % 2) * 0.6;
  r.tilt = 4;
  return copFrame(drawHumanFront(COP, r, true) + zzz(f));
}

/** Snoring z's rising beside the head. */
function zzz(f: number): string {
  const z = (i: number) => {
    const t = (f + i * 1.3) % 4;
    return text(53 + i * 6 + t * 1.5, 22 - t * 3 - i * 5, 'z', {
      size: 9 + i * 2,
      fill: '#c9f0ff',
      stroke: INK,
      sw: 2.5,
      family: "'Comic Sans MS', 'Trebuchet MS', sans-serif",
      weight: 700,
    });
  };
  return z(0) + z(1) + z(2);
}

/** Standing straight (between stool and dance floor). */
function copStand(): string {
  return copFrame(drawHumanFront(COP, frontRig('idle', 0)));
}

/** Dance, part one: directing traffic at an imaginary crossroads. */
function copTraffic(f: number): string {
  const r = frontRig('idle', 2);
  const sy = r.hipY - 26 - r.breath * 0.7;
  const out = (side: number): Rig['arms'][number] => ({
    shoulder: [32 + side * 11, sy],
    elbow: [32 + side * 23, sy - 1],
    hand: [32 + side * 34, sy - 2],
  });
  const wave = (side: number): Rig['arms'][number] => ({
    shoulder: [32 + side * 11, sy],
    elbow: [32 + side * 15, sy + 10],
    hand: [32 - side * 2, sy + 4],
  });
  const down = (side: number): Rig['arms'][number] => ({
    shoulder: [32 + side * 11, sy],
    elbow: [32 + side * 13, sy + 12.5],
    hand: [32 + side * 13.5, sy + 24],
  });
  r.arms = [
    [out(-1), down(1)],
    [out(-1), wave(1)],
    [down(-1), out(1)],
    [wave(-1), out(1)],
  ][f];
  r.mouth = 'o'; // the whistle
  r.tilt = [-3, -3, 3, 3][f];
  const whistle = rect(29.5, r.hipY - 51 + 13, 5, 3.2, { fill: '#c8ccd4', stroke: INK, sw: 1 }, 1);
  return copFrame(drawHumanFront(COP, r) + whistle);
}

/** Dance, part two: hips — and a surprisingly ambitious disco finger. */
function copDisco(f: number): string {
  const r = frontRig('idle', 0);
  const hx = [5, 2, -5, -2][f];
  const sy = r.hipY - 26;
  // Feet stay planted; everything above them sways by hx.
  r.legs = r.legs.map((l) => ({ ...l, ankle: [l.ankle[0] - hx, l.ankle[1]] as Pt, knee: [l.knee[0] - hx / 2, l.knee[1]] as Pt }));
  const up = f < 2;
  const point = up
    ? { shoulder: [43, sy] as Pt, elbow: [52, sy - 10] as Pt, hand: [59, sy - 21] as Pt }
    : { shoulder: [43, sy] as Pt, elbow: [42, sy + 10] as Pt, hand: [30, sy + 18] as Pt };
  const onHip = { shoulder: [21, sy] as Pt, elbow: [11, sy + 9] as Pt, hand: [22, r.hipY - 2] as Pt };
  r.arms = [onHip, point];
  r.tilt = up ? -8 : 7;
  r.mouth = f % 2 ? 'a' : 'o';
  const body = drawHumanFront(COP, r) + finger(point.elbow, point.hand, COP.skin);
  return group(copFrame(body), `translate(${hx} 0)`);
}

const COP_POSES = {
  ...POSES,
  reach: { frames: 4, frameRate: 4 },
  drink: { frames: 2, frameRate: 3 },
  traffic: { frames: 4, frameRate: 3 },
  disco: { frames: 4, frameRate: 4 },
  stand: { frames: 1, frameRate: 1 },
  sleep: { frames: 4, frameRate: 2 },
};

const COP_WALK = humanDraw(COP);

function copDraw(variant: ActorVariant, pose: ActorPose | string, f: number): string {
  const back = variant === 'back';
  switch (pose) {
    case 'idle':
      return back ? copSeatedBack(f) : copSeated(f);
    case 'talk':
      return back ? copTalkBack(f) : copTalk(f);
    case 'sleep':
      return back ? copSleepBack(f) : copSleep(f);
    case 'reach':
      return copReach(f);
    case 'drink':
      return copDrink(f);
    case 'stand':
      return copStand();
    case 'traffic':
      return copTraffic(f);
    case 'disco':
      return copDisco(f);
    default:
      return copFrame(COP_WALK(variant, 'walk', f));
  }
}

// ---- Hilde ---------------------------------------------------------------------
// A regular: silver-lilac perm, red glasses, pearls, fuchsia blouse and a
// pleated skirt. She dances (stance 'dance') and grabs at anyone who comes
// too close ('grab').

const HILDE: HumanLook = {
  skin: '#f0c4a4',
  skinShade: '#cc9a7c',
  hair: '#d8d0e8',
  hairShade: '#a89ac0',
  top: '#c8407a',
  topShade: '#9a2a5c',
  // Thighs vanish under the skirt; stockinged shins below it.
  legs: '#34346e',
  legsShade: '#24244e',
  shins: '#e2b494',
  shoes: '#6a2a3a',
  shoeTrim: '#3a1420',
  style: 'custom',
  head: { front: hildeHeadFront, side: hildeHeadSide },
  torso: { front: hildeBlouseFront, side: hildeBlouseSide },
};

function hildeHeadFront(r: Rig, back: boolean): string {
  const L = HILDE;
  const perm = path(puff(0, -9, 17, 13, 9, 4, 0.18), { fill: L.hair, stroke: INK, sw: OUT });
  if (back) return perm + path(puff(0, 2, 15, 9, 7, 5, 0.2), { fill: L.hair, stroke: INK, sw: OUT });
  const s: string[] = [ear(L, -14), ear(L, 14)];
  s.push(circle(-14, 6, 1.8, { fill: '#f4f0f8', stroke: INK, sw: 0.8 }), circle(14, 6, 1.8, { fill: '#f4f0f8', stroke: INK, sw: 0.8 }));
  s.push(shadedHead(L, FACE_FRONT, 'faceF', 3));
  s.push(eyesFront(r, [-5.6, 5.6], 0.4, -1));
  // Big red glasses.
  for (const x of [-5.6, 5.6]) s.push(circle(x, -1, 5.4, { stroke: '#c43a3a', sw: 1.8 }));
  s.push(path('M-0.4 -1.5Q0 -2.6 0.4 -1.5', { stroke: '#c43a3a', sw: 1.6 }));
  s.push(path('M-10 -7.4Q-5.6 -9.6 -2 -7.6M2 -7.6Q5.6 -9.6 10 -7.4', { stroke: L.hairShade, sw: 1.5 }));
  s.push(ellipse(0, 5, 3, 3.4, { fill: L.skin, stroke: INK, sw: 1.6 }));
  s.push(ellipse(-9, 6.5, 2.8, 1.8, { fill: '#e8607a', opacity: 0.45 }), ellipse(9, 6.5, 2.8, 1.8, { fill: '#e8607a', opacity: 0.45 }));
  s.push(mouthFront(r.mouth, 11.2, 3.4));
  s.push(path(r.mouth === 'shut' ? 'M-3.6 11Q0 12.8 3.6 10.6' : 'M-3.2 10.6Q0 9.6 3.2 10.6', { stroke: '#c43a5a', sw: 1.6 }));
  s.push(path(puff(0, -12, 17, 10, 9, 4, 0.18), { fill: L.hair, stroke: INK, sw: OUT }));
  s.push(path(curve([[-9, -15], [-2, -18], [6, -16]]), { stroke: L.hairShade, sw: 1.3 }));
  return s.join('');
}

function hildeHeadSide(r: Rig): string {
  const L = HILDE;
  const s: string[] = [path(puff(-3, -6, 16, 14, 8, 6, 0.18), { fill: L.hair, stroke: INK, sw: OUT })];
  s.push(shadedHead(L, SKULL_SIDE, 'faceS', -3));
  s.push(eyeSide(r, 8.4, -1.6));
  s.push(circle(8.4, -1.6, 5, { stroke: '#c43a3a', sw: 1.6 }));
  s.push(path('M3.4 -1.4L-2 -1', { stroke: '#c43a3a', sw: 1.4 }));
  s.push(path(blob([[12, -0.5], [15.5, 2], [15, 5.6], [11.6, 5.4]]), { fill: L.skin, stroke: INK, sw: 1.5 }));
  s.push(mouthSide(r.mouth, 10, 11));
  s.push(path(puff(-2, -12, 15, 9, 8, 7, 0.18), { fill: L.hair, stroke: INK, sw: OUT }));
  return s.join('');
}

/** Blouse print, pearls — and the pleated skirt, drawn over the thighs. */
function hildeBlouseFront(top: number, back: boolean, clip: string): string {
  const s: string[] = [];
  if (!back) {
    s.push(group([[24, 9], [38, 6], [29, 17], [41, 18], [25, 23]].map(([x, y]) => circle(x, top + y, 1.5, { fill: '#ffd0e4' })).join(''), undefined, `clip-path="url(#${clip})"`));
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.15 + (i / 8) * 0.7);
      s.push(circle(32 - Math.cos(a) * 7.5, top + 1 + Math.sin(a) * 5.5, 1.3, { fill: '#f8f4ee', stroke: INK, sw: 0.5 }));
    }
  }
  const w = top + 21;
  const hem = top + 46;
  s.push(path(`M${32 - 11.5} ${w}L${32 + 11.5} ${w}L${32 + 17} ${hem}Q32 ${hem + 3} ${32 - 17} ${hem}Z`, { fill: HILDE.legs, stroke: INK, sw: OUT }));
  for (const dx of [-9, -3, 3, 9]) s.push(path(`M${32 + dx * 0.7} ${w + 3}L${32 + dx} ${hem}`, { stroke: HILDE.legsShade, sw: 1.2 }));
  return s.join('');
}

function hildeBlouseSide(top: number): string {
  const w = top + 21;
  const hem = top + 46;
  return path(`M23 ${w}L41 ${w}L45 ${hem}Q32 ${hem + 3} 20 ${hem}Z`, { fill: HILDE.legs, stroke: INK, sw: OUT });
}

/** Dancing: hips swaying, one arm up and waving, the other on her hip. */
function hildeDance(f: number): string {
  const r = frontRig('idle', 0);
  const hx = [-5, -2, 3, 5, 2, -3][f];
  const sy = r.hipY - 26;
  r.legs = r.legs.map((l) => ({ ...l, ankle: [l.ankle[0] - hx, l.ankle[1]] as Pt, knee: [l.knee[0] - hx / 2, l.knee[1]] as Pt }));
  const up = (side: number, wave: number): Rig['arms'][number] => ({
    shoulder: [32 + side * 11, sy],
    elbow: [32 + side * 18, sy - 9],
    hand: [32 + side * (16 + wave), sy - 24],
  });
  const onHip = (side: number): Rig['arms'][number] => ({
    shoulder: [32 + side * 11, sy],
    elbow: [32 + side * 21, sy + 9],
    hand: [32 + side * 10, r.hipY - 3],
  });
  const right = f < 3;
  const wave = [0, 4, -2][f % 3];
  r.arms = right ? [onHip(-1), up(1, wave)] : [up(-1, wave), onHip(1)];
  r.tilt = hx * 1.4;
  r.mouth = f % 3 === 1 ? 'o' : 'shut';
  return group(drawHumanFront(HILDE, r), `translate(${hx} 0)`);
}

/** Grabbing at whoever came too close: both arms out, eyes wide. */
function hildeGrab(f: number): string {
  const r = frontRig('idle', 0);
  const sy = r.hipY - 26;
  const reach = f === 0 ? 30 : 24;
  r.arms = [-1, 1].map((side) => ({
    shoulder: [32 + side * 11, sy] as Pt,
    elbow: [32 + side * (reach - 8), sy + 1] as Pt,
    hand: [32 + side * reach, sy - 2 + f * 2] as Pt,
  }));
  r.mouth = 'a';
  r.tilt = f ? 4 : -2;
  return drawHumanFront(HILDE, r);
}

const HILDE_DRAW = humanDraw(HILDE);

const ALI_DRAW = humanDraw(ALI);

export const GOA_CAST: SvgActorAsset[] = [
  { key: 'raver', width: 64, height: 120, poses: POSES, draw: humanDraw(RAVER) },
  {
    key: 'ali',
    width: 64,
    height: 120,
    poses: { ...POSES, polish: { frames: 4, frameRate: 5 }, sing: { frames: 4, frameRate: 4 }, wink: { frames: 2, frameRate: 4 } },
    draw: (variant, pose, f) => {
      if (pose === 'polish') return aliPolish(variant, f);
      if (pose === 'sing') return aliSing(variant, f);
      if (pose === 'wink') return aliWink(f);
      return ALI_DRAW(variant, pose as ActorPose, f);
    },
  },
  { key: 'cop', width: COP_W, height: COP_H, poses: COP_POSES, draw: copDraw },
  {
    key: 'hilde',
    width: 64,
    height: 120,
    poses: { ...POSES, dance: { frames: 6, frameRate: 6 }, grab: { frames: 2, frameRate: 5 } },
    draw: (variant, pose, f) => {
      if (pose === 'dance') return hildeDance(f);
      if (pose === 'grab') return hildeGrab(f);
      return HILDE_DRAW(variant, pose as ActorPose, f);
    },
  },
];
