import type { CreatureDef } from '../../state/types';

// Creatures are limb sets. limbs[0] is always the torso/root (not severable).
// "Mutant wrongness" comes from asymmetry, extra limbs and lurid accent tints.
// Cute creatures are round, big-eyed, soft-coloured and harmless.

export const CREATURES: Record<string, CreatureDef> = {
  // ---- THREATS ----
  mauler: {
    id: 'mauler',
    name: 'Mauler',
    kind: 'threat',
    moveSpeed: 2.4,
    contactDamage: 10,
    detectRange: 360,
    scale: 1,
    accentColor: 0x8e44ad,
    loot: [
      { itemId: 'mutant_meat', chance: 0.9, min: 1, max: 2 },
      { itemId: 'scrap', chance: 0.3, min: 1, max: 1 },
    ],
    limbs: [
      { name: 'torso', x: 0, y: 0, w: 58, h: 26, hp: 28, shape: 'rect', color: 0x6a5a4a, severable: false },
      { name: 'head', x: 34, y: -8, w: 26, h: 24, hp: 16, shape: 'circle', color: 0x7a6452, severable: true },
      { name: 'frontleg', x: 20, y: 22, w: 9, h: 26, hp: 9, shape: 'rect', color: 0x5a4c3e, severable: true },
      { name: 'backleg', x: -20, y: 22, w: 9, h: 26, hp: 9, shape: 'rect', color: 0x5a4c3e, severable: true },
      { name: 'tail', x: -36, y: -2, w: 24, h: 8, hp: 6, shape: 'rect', color: 0x6a5a4a, severable: true },
    ],
  },

  crawler: {
    id: 'crawler',
    name: 'Crawler',
    kind: 'threat',
    moveSpeed: 3.2,
    contactDamage: 7,
    detectRange: 300,
    scale: 0.85,
    accentColor: 0x6f7a3a,
    loot: [
      { itemId: 'mutant_meat', chance: 0.6, min: 1, max: 1 },
      { itemId: 'chemicals', chance: 0.25, min: 1, max: 1 },
    ],
    limbs: [
      { name: 'torso', x: 0, y: 0, w: 44, h: 18, hp: 18, shape: 'rect', color: 0x5f6a3a, severable: false },
      { name: 'head', x: 26, y: -2, w: 20, h: 18, hp: 12, shape: 'circle', color: 0x6f7a3a, severable: true },
      { name: 'leg1', x: 12, y: 16, w: 7, h: 20, hp: 6, shape: 'rect', color: 0x4f5a2a, severable: true },
      { name: 'leg2', x: -4, y: 16, w: 7, h: 20, hp: 6, shape: 'rect', color: 0x4f5a2a, severable: true },
      { name: 'leg3', x: -18, y: 16, w: 7, h: 20, hp: 6, shape: 'rect', color: 0x4f5a2a, severable: true },
    ],
  },

  brute: {
    id: 'brute',
    name: 'Brute',
    kind: 'threat',
    moveSpeed: 1.5,
    contactDamage: 18,
    detectRange: 320,
    scale: 1.4,
    accentColor: 0xa0306a,
    loot: [
      { itemId: 'mutant_meat', chance: 1, min: 2, max: 3 },
      { itemId: 'scrap', chance: 0.6, min: 1, max: 2 },
      { itemId: 'chemicals', chance: 0.3, min: 1, max: 1 },
    ],
    limbs: [
      { name: 'torso', x: 0, y: 0, w: 72, h: 40, hp: 46, shape: 'rect', color: 0x6a4a4a, severable: false },
      { name: 'head', x: 40, y: -14, w: 30, h: 28, hp: 24, shape: 'circle', color: 0x7a4a5a, severable: true },
      { name: 'arm', x: 30, y: 6, w: 14, h: 34, hp: 16, shape: 'rect', color: 0x5a3a3a, severable: true },
      { name: 'frontleg', x: 22, y: 30, w: 14, h: 30, hp: 14, shape: 'rect', color: 0x5a3a3a, severable: true },
      { name: 'backleg', x: -22, y: 30, w: 14, h: 30, hp: 14, shape: 'rect', color: 0x5a3a3a, severable: true },
    ],
  },

  // ---- CUTE / HARMLESS (rescuable) ----
  pip: {
    id: 'pip',
    name: 'Pip',
    kind: 'cute',
    moveSpeed: 1.2,
    contactDamage: 0,
    detectRange: 160,
    scale: 0.8,
    accentColor: 0xf0d0e8,
    loot: [],
    limbs: [
      { name: 'torso', x: 0, y: 0, w: 30, h: 26, hp: 12, shape: 'circle', color: 0xc98fd0, severable: false },
      { name: 'head', x: 0, y: -18, w: 24, h: 22, hp: 10, shape: 'circle', color: 0xd6a0dc, severable: false },
      { name: 'foot1', x: 8, y: 16, w: 8, h: 10, hp: 5, shape: 'rect', color: 0xb87ec0, severable: false },
      { name: 'foot2', x: -8, y: 16, w: 8, h: 10, hp: 5, shape: 'rect', color: 0xb87ec0, severable: false },
    ],
  },

  mossback: {
    id: 'mossback',
    name: 'Mossback',
    kind: 'cute',
    moveSpeed: 0.9,
    contactDamage: 0,
    detectRange: 140,
    scale: 0.9,
    accentColor: 0x9fd06a,
    loot: [],
    limbs: [
      { name: 'torso', x: 0, y: 0, w: 38, h: 24, hp: 14, shape: 'circle', color: 0x7fb05a, severable: false },
      { name: 'head', x: 18, y: -8, w: 18, h: 16, hp: 8, shape: 'circle', color: 0x9fd06a, severable: false },
      { name: 'leg1', x: 10, y: 14, w: 7, h: 10, hp: 5, shape: 'rect', color: 0x6f9a4a, severable: false },
      { name: 'leg2', x: -10, y: 14, w: 7, h: 10, hp: 5, shape: 'rect', color: 0x6f9a4a, severable: false },
    ],
  },
};

export const THREAT_IDS = Object.values(CREATURES)
  .filter((c) => c.kind === 'threat')
  .map((c) => c.id);

export const CUTE_IDS = Object.values(CREATURES)
  .filter((c) => c.kind === 'cute')
  .map((c) => c.id);

export function getCreature(id: string): CreatureDef {
  const def = CREATURES[id];
  if (!def) throw new Error(`Unknown creature id: ${id}`);
  return def;
}
