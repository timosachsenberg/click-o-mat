import type { VerbId } from './types';
import { engine } from './Engine';

/** Classic DOTT layout: three columns, three rows (labels live in the UI
 *  strings, so a game can translate them — see strings.ts). */
export const VERBS: VerbId[] = ['give', 'pickup', 'use', 'open', 'lookat', 'push', 'close', 'talkto', 'pull'];

export function verbLabel(id: VerbId): string {
  return engine.strings.verbs[id] ?? id;
}
