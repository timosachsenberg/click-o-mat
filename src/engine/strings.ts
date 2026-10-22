import type { VerbId } from './types';

/**
 * Every piece of text the engine itself puts on screen — verb labels, the
 * sentence line, fallback responses, the title menu, the options panel — so
 * a game can ship in any language. A game overrides any subset through
 * `GameContent.strings`; anything left out stays English.
 */
export interface UIStrings {
  verbs: Record<VerbId, string>;
  /** Sentence line while an item is in hand: "Use battery with …". */
  useWith: (item: string) => string;
  giveTo: (item: string) => string;
  /** Sentence line with no verb selected. */
  walkTo: string;
  /** Player one-liners when a hotspot has no handler for the verb. */
  defaultResponses: Record<VerbId, string>;
  /** Walking to a hotspot found no path. */
  cantReach: string;
  /** Item used on / given to a hotspot without a matching handler. */
  noEffect: string;
  notWanted: string;
  /** Two inventory items without a combine handler. */
  noCombine: string;
  /** Looking at an item that has no lookAt line. */
  itemLook: (item: string) => string;
  /** Toasts. */
  pickedUp: (item: string) => string;
  gaveTo: (item: string, char: string) => string;
  /** "Director's commentary" narration of a room's `features`. */
  commentary: (features: string[]) => string;
  loading: string;

  // Title screen
  newGame: string;
  continueGame: string;
  tagline: string;

  // Options panel, save slots, hotkey toasts
  options: string;
  master: string;
  music: string;
  soundFx: string;
  textSpeed: string;
  soundState: (muted: boolean) => string;
  soundToast: (muted: boolean) => string;
  commentaryState: (on: boolean) => string;
  commentaryToast: (on: boolean) => string;
  saves: string;
  close: string;
  save: string;
  load: string;
  yes: string;
  no: string;
  /** Labels of the save slots: quick, the manual ones, auto. */
  slotLabels: string[];
  emptySlot: string;
  confirmOverwrite: string;
  confirmDelete: string;
  savedTo: (slot: string) => string;
  loaded: (slot: string) => string;
  deleted: (slot: string) => string;
  saveFailed: string;
  loadFailed: string;
  slotEmpty: string;
  quickSaved: string;
  quickLoaded: string;
  noQuickSave: string;
  /** BCP 47 locale for save timestamps (undefined = the browser's). */
  locale?: string;
  /** Pager under dialog choices that don't fit on one page. */
  moreChoices: (page: number, pages: number) => string;
}

export const DEFAULT_STRINGS: UIStrings = {
  verbs: {
    give: 'Give',
    pickup: 'Pick up',
    use: 'Use',
    open: 'Open',
    lookat: 'Look at',
    push: 'Push',
    close: 'Close',
    talkto: 'Talk to',
    pull: 'Pull',
  },
  useWith: (item) => `Use ${item} with`,
  giveTo: (item) => `Give ${item} to`,
  walkTo: 'Walk to',
  defaultResponses: {
    give: "I'd rather hang on to it.",
    pickup: "I don't need that.",
    use: "I can't use that.",
    open: "It doesn't open.",
    lookat: "There's nothing special about it.",
    push: "It won't budge.",
    close: "It isn't open.",
    talkto: "It doesn't seem very talkative.",
    pull: 'Nope. Not moving.',
  },
  cantReach: "I can't get over there.",
  noEffect: "That doesn't seem to work.",
  notWanted: "I don't think that's wanted here.",
  noCombine: "Those don't go together.",
  itemLook: (item) => `It's ${item}.`,
  pickedUp: (item) => `Picked up: ${item}`,
  gaveTo: (item, char) => `Gave ${item} to ${char}.`,
  commentary: (features) => `(Commentary — this room shows off: ${features.join('; ')}.)`,
  loading: 'Loading…',

  newGame: '> NEW GAME <',
  continueGame: 'CONTINUE',
  tagline: 'a Phaser 4 point-and-click adventure engine',

  options: 'OPTIONS',
  master: 'Master',
  music: 'Music',
  soundFx: 'Sound FX',
  textSpeed: 'Text speed',
  soundState: (muted) => (muted ? 'Sound: OFF  (click to unmute)' : 'Sound: ON  (click to mute)'),
  soundToast: (muted) => (muted ? 'Sound off' : 'Sound on'),
  commentaryState: (on) => `Director's commentary: ${on ? 'ON' : 'OFF'}  (F2)`,
  commentaryToast: (on) => `Director's commentary ${on ? 'on' : 'off'}`,
  saves: '— SAVES —',
  close: 'Close',
  save: 'Save',
  load: 'Load',
  yes: 'Yes',
  no: 'No',
  slotLabels: ['QUICK', 'SLOT 1', 'SLOT 2', 'SLOT 3', 'AUTO'],
  emptySlot: '— empty —',
  confirmOverwrite: 'Overwrite this save?',
  confirmDelete: 'Delete this save?',
  savedTo: (slot) => `Saved to ${slot}.`,
  loaded: (slot) => `Loaded ${slot}.`,
  deleted: (slot) => `Deleted ${slot}.`,
  saveFailed: 'Save failed.',
  loadFailed: 'Load failed.',
  slotEmpty: 'That slot is empty.',
  quickSaved: 'Quick-saved.',
  quickLoaded: 'Quick save loaded.',
  noQuickSave: 'No quick save.',
  moreChoices: (page, pages) => `▾ More choices  (${page}/${pages})`,
};
