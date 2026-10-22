import type { MusicTrack } from '../engine/Audio';

/** Procedural chiptune loops (semitones from A4; one entry per 8th note). */
export const GOA_MUSIC: Record<string, MusicTrack> = {
  // The Picasso: a lazy, slightly wistful Kneipen-Schlager shuffle in F.
  'pub-theme': {
    bpm: 84,
    bassType: 'triangle',
    leadType: 'triangle',
    bass: [-28, null, -21, null, -26, null, -21, null, -31, null, -24, null, -26, null, -24, null],
    lead: [8, null, 7, 8, 12, null, 10, 8, 7, null, 5, 3, 5, null, null, null],
  },
  // ---- the jukebox -----------------------------------------------------------------
  // "Du hast mein Herz am Pfandautomat vergessen": slow, heartbroken, in C.
  'song-pfand': {
    bpm: 76,
    bassType: 'triangle',
    leadType: 'triangle',
    bass: [-21, null, -14, null, -24, null, -17, null, -19, null, -12, null, -26, null, -19, null],
    lead: [7, null, 5, 3, 3, null, null, 0, 2, null, 3, 5, 3, null, null, null],
  },
  // "Barfuß am Baggersee": summer in a bottle, all major sixths.
  'song-baggersee': {
    bpm: 118,
    bassType: 'triangle',
    leadType: 'square',
    bass: [-21, -9, -14, -9, -19, -7, -14, -7, -17, -5, -12, -5, -19, -7, -14, -7],
    lead: [3, 7, 10, 7, 12, null, 10, 7, 5, 8, 12, 8, 7, null, 3, null],
  },
  // "Polonaise bis nach Wanne-Eickel": oom-pah, everybody hands on shoulders.
  'song-polonaise': {
    bpm: 140,
    bassType: 'square',
    leadType: 'square',
    bass: [-26, null, -14, null, -19, null, -14, null, -26, null, -14, null, -21, null, -14, null],
    lead: [5, 5, 9, 9, 12, 12, 9, null, 7, 7, 10, 10, 14, 12, 10, null],
  },
  // "Noch einen auf die Gemütlichkeit" — the verse sways along…
  'song-gemuetlichkeit': {
    bpm: 112,
    bassType: 'triangle',
    leadType: 'triangle',
    bass: [-21, null, -9, null, -16, null, -9, null, -21, null, -9, null, -14, null, -11, null],
    lead: [3, null, 5, 7, 7, null, 5, 3, 2, null, 3, 5, 3, null, null, null],
  },
  // …and the refrain hammers it home: ♫ Trink, trink, trink! ♫
  'song-gemuetlichkeit-refrain': {
    bpm: 112,
    bassType: 'square',
    leadType: 'square',
    bass: [-21, -9, -16, -9, -21, -9, -16, -9, -14, -2, -16, -4, -21, -9, -21, null],
    lead: [12, null, 12, null, 12, null, null, null, 10, 12, 14, 12, 10, 7, 3, null],
  },

  // What plays in the Partykiller's head while he dances: four on the floor.
  'disco-theme': {
    bpm: 124,
    bassType: 'square',
    leadType: 'square',
    bass: [-24, -12, -24, -12, -22, -10, -22, -10, -27, -15, -27, -15, -26, -14, -26, -14],
    lead: [12, null, 15, 12, null, 19, null, 17, 15, null, 12, null, 10, 12, null, null],
  },
};
