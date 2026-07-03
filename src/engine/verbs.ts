import type { VerbDef, VerbId } from './types';

/** Classic DOTT layout: three columns, three rows. */
export const VERBS: VerbDef[] = [
  { id: 'give', label: 'Give', prep: 'to' },
  { id: 'pickup', label: 'Pick up' },
  { id: 'use', label: 'Use', prep: 'with' },
  { id: 'open', label: 'Open' },
  { id: 'lookat', label: 'Look at' },
  { id: 'push', label: 'Push' },
  { id: 'close', label: 'Close' },
  { id: 'talkto', label: 'Talk to' },
  { id: 'pull', label: 'Pull' },
];

export function verbLabel(id: VerbId): string {
  return VERBS.find((v) => v.id === id)?.label ?? id;
}

/** Player one-liners when a hotspot has no handler for the verb. */
export const DEFAULT_RESPONSES: Record<VerbId, string> = {
  give: "I'd rather hang on to it.",
  pickup: "I don't need that.",
  use: "I can't use that.",
  open: "It doesn't open.",
  lookat: "There's nothing special about it.",
  push: "It won't budge.",
  close: "It isn't open.",
  talkto: "It doesn't seem very talkative.",
  pull: 'Nope. Not moving.',
};
