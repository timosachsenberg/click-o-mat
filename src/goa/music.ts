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
  // What plays in the Partykiller's head while he dances: four on the floor.
  'disco-theme': {
    bpm: 124,
    bassType: 'square',
    leadType: 'square',
    bass: [-24, -12, -24, -12, -22, -10, -22, -10, -27, -15, -27, -15, -26, -14, -26, -14],
    lead: [12, null, 15, 12, null, 19, null, 17, 15, null, 12, null, 10, 12, null, null],
  },
};
