import type { RecipeDef } from '../state/types';

// Data-driven crafting. ~12 meaningful recipes across weapon / armour / med /
// build / farm — deliberately small to avoid balance bloat.
export const RECIPES: RecipeDef[] = [
  {
    id: 'craft_rebar',
    name: 'Sharpened Rebar',
    inputs: [{ id: 'scrap', qty: 3 }],
    output: { id: 'rebar', qty: 1 },
    requiresUpgrade: 'workbench',
  },
  {
    id: 'craft_cleaver',
    name: 'Bone Cleaver',
    inputs: [
      { id: 'scrap', qty: 4 },
      { id: 'mutant_meat', qty: 1 },
    ],
    output: { id: 'cleaver', qty: 1 },
    requiresUpgrade: 'workbench',
  },
  {
    id: 'craft_sledge',
    name: 'Sledgehammer',
    inputs: [
      { id: 'scrap', qty: 8 },
      { id: 'wood', qty: 2 },
    ],
    output: { id: 'sledge', qty: 1 },
    requiresUpgrade: 'workbench',
  },
  {
    id: 'craft_bandage',
    name: 'Bandage',
    inputs: [{ id: 'cloth', qty: 2 }],
    output: { id: 'bandage', qty: 1 },
  },
  {
    id: 'craft_antirad',
    name: 'Anti-Rad Serum',
    inputs: [
      { id: 'chemicals', qty: 2 },
      { id: 'cloth', qty: 1 },
    ],
    output: { id: 'antirad', qty: 1 },
    requiresUpgrade: 'workbench',
  },
  {
    id: 'craft_seeds',
    name: 'Greens Seeds',
    inputs: [{ id: 'veg', qty: 1 }],
    output: { id: 'veg_seed', qty: 2 },
  },
];
