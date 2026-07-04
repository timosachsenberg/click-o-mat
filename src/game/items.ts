import type { ItemDef } from '../engine/types';

export const ITEMS: Record<string, ItemDef> = {
  battery: {
    id: 'battery',
    name: 'battery',
    icon: 'icon-battery',
    lookAt: 'A 9-volt battery. Slightly corroded, fully menacing.',
    combine: {
      hamster: "I'm not duct-taping a battery to a live hamster.",
      key: "That would generate exactly zero volts of usefulness.",
    },
  },
  key: {
    id: 'key',
    name: 'small key',
    icon: 'icon-key',
    lookAt: 'A small brass key. It smells faintly of ficus.',
  },
  hamster: {
    id: 'hamster',
    name: 'hamster',
    icon: 'icon-hamster',
    lookAt: 'A fat hamster. He is judging my life choices.',
  },
  glowhamster: {
    id: 'glowhamster',
    name: 'glowing hamster',
    icon: 'icon-glowhamster',
    lookAt: 'He glows with a warm green light and, I assume, purpose.',
  },
  canteen: {
    id: 'canteen',
    name: 'canteen',
    icon: 'icon-canteen',
    lookAt: 'A dented canteen, sloshing with suspiciously fresh water.',
  },
  medal: {
    id: 'medal',
    name: 'summit medal',
    icon: 'icon-medal',
    lookAt: "A medal that reads 'I CLIMBED A MOUNTAIN AND ALL I GOT WAS THIS MEDAL.'",
  },
};
