import type { ItemDef, ItemId } from '../state/types';

// Procedural icon colours pulled from the palette family.
export const ITEMS: Record<ItemId, ItemDef> = {
  // ---- weapons ----
  pipe: {
    id: 'pipe',
    name: 'Lead Pipe',
    category: 'weapon',
    description: 'Heavy and blunt. Caves things in.',
    maxStack: 1,
    value: 6,
    color: 0x9aa0a6,
    weapon: { damage: 7, reach: 46, weight: 1.5, swingSpeed: 0.5 },
  },
  rebar: {
    id: 'rebar',
    name: 'Sharpened Rebar',
    category: 'weapon',
    description: 'Rusty, jagged, and good at removing limbs.',
    maxStack: 1,
    value: 12,
    color: 0x8a5a2b,
    weapon: { damage: 9, reach: 58, weight: 1.2, swingSpeed: 0.62 },
  },
  cleaver: {
    id: 'cleaver',
    name: 'Bone Cleaver',
    category: 'weapon',
    description: 'Crafted for butchery. Severs on a clean swing.',
    maxStack: 1,
    value: 20,
    color: 0xd0d4d8,
    weapon: { damage: 12, reach: 40, weight: 1.0, swingSpeed: 0.78 },
  },
  sledge: {
    id: 'sledge',
    name: 'Sledgehammer',
    category: 'weapon',
    description: 'Slow, devastating, deeply satisfying.',
    maxStack: 1,
    value: 28,
    color: 0x6b7075,
    weapon: { damage: 16, reach: 54, weight: 2.4, swingSpeed: 0.36 },
  },

  // ---- food ----
  canned_food: {
    id: 'canned_food',
    name: 'Canned Beans',
    category: 'food',
    description: 'Expired, but calories are calories.',
    maxStack: 10,
    value: 4,
    color: 0xc98f3a,
    nourish: 28,
    heal: 4,
  },
  mutant_meat: {
    id: 'mutant_meat',
    name: 'Mutant Meat',
    category: 'food',
    description: 'Filling. Slightly irradiated.',
    maxStack: 10,
    value: 3,
    color: 0xa0306a,
    nourish: 34,
  },
  veg: {
    id: 'veg',
    name: 'Bunker Greens',
    category: 'food',
    description: 'Grown safe at home. Clean food.',
    maxStack: 10,
    value: 6,
    color: 0x5fa83f,
    nourish: 26,
    heal: 8,
  },

  // ---- medicine ----
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    category: 'medicine',
    description: 'Stops the bleeding.',
    maxStack: 10,
    value: 5,
    color: 0xf0e9d6,
    heal: 30,
  },
  antirad: {
    id: 'antirad',
    name: 'Anti-Rad Serum',
    category: 'medicine',
    description: 'Pushes the mutation back. For a while.',
    maxStack: 10,
    value: 18,
    color: 0x8e44ad,
    radReduce: 14,
  },

  // ---- materials ----
  scrap: {
    id: 'scrap',
    name: 'Scrap Metal',
    category: 'material',
    description: 'The currency of the wasteland.',
    maxStack: 99,
    value: 1,
    color: 0x7a7f85,
  },
  cloth: {
    id: 'cloth',
    name: 'Cloth',
    category: 'material',
    description: 'Torn fabric. Useful.',
    maxStack: 99,
    value: 1,
    color: 0xb0a890,
  },
  chemicals: {
    id: 'chemicals',
    name: 'Chemicals',
    category: 'material',
    description: 'Volatile. Smells like a hospital.',
    maxStack: 99,
    value: 3,
    color: 0x4ad0c0,
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    category: 'material',
    description: 'Burns warm. Builds homes.',
    maxStack: 99,
    value: 1,
    color: 0x6b4a2f,
  },

  // ---- seeds ----
  veg_seed: {
    id: 'veg_seed',
    name: 'Greens Seeds',
    category: 'seed',
    description: 'Plant in a garden plot. Harvest in a few days.',
    maxStack: 20,
    value: 4,
    color: 0x9fd06a,
    growsInto: 'veg',
    growDays: 2,
  },
};

export function getItem(id: ItemId): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item id: ${id}`);
  return def;
}

export function itemExists(id: ItemId): boolean {
  return id in ITEMS;
}
