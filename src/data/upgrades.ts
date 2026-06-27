import type { UpgradeDef } from '../state/types';

// Bunker upgrades use PREDEFINED SLOTS (not free-form building) — huge scope
// saver while still delivering the "cozy progression" fantasy.
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'bed',
    name: 'Bed',
    description: 'Sleep restores more health each night.',
    effect: 'bed',
    effectPerLevel: 12, // hp restored per night per level
    maxLevel: 3,
    cost: [
      [
        { id: 'wood', qty: 3 },
        { id: 'cloth', qty: 2 },
      ],
      [
        { id: 'wood', qty: 5 },
        { id: 'cloth', qty: 4 },
      ],
    ],
  },
  {
    id: 'workbench',
    name: 'Workbench',
    description: 'Unlocks advanced crafting recipes.',
    effect: 'workbench',
    effectPerLevel: 1,
    maxLevel: 1,
    cost: [[{ id: 'scrap', qty: 5 }, { id: 'wood', qty: 3 }]],
  },
  {
    id: 'storage',
    name: 'Storage Lockers',
    description: 'Increases bunker stash capacity.',
    effect: 'storage',
    effectPerLevel: 12,
    maxLevel: 3,
    cost: [
      [{ id: 'scrap', qty: 4 }],
      [{ id: 'scrap', qty: 7 }, { id: 'wood', qty: 2 }],
    ],
  },
  {
    id: 'garden',
    name: 'Garden Plots',
    description: 'Adds a growing plot for food.',
    effect: 'garden',
    effectPerLevel: 1, // +1 plot per level
    maxLevel: 4,
    cost: [
      [{ id: 'wood', qty: 2 }, { id: 'cloth', qty: 1 }],
      [{ id: 'wood', qty: 3 }, { id: 'scrap', qty: 2 }],
      [{ id: 'wood', qty: 4 }, { id: 'scrap', qty: 3 }],
    ],
  },
  {
    id: 'decon',
    name: 'Decontamination',
    description: 'Reduces mutation gained each day.',
    effect: 'decon',
    effectPerLevel: 1.4, // mutation/day reduced
    maxLevel: 3,
    cost: [
      [{ id: 'chemicals', qty: 3 }, { id: 'scrap', qty: 3 }],
      [{ id: 'chemicals', qty: 5 }, { id: 'scrap', qty: 5 }],
    ],
  },
  {
    id: 'comfort',
    name: 'Sanctuary Pen',
    description: 'A warm space so rescued animals can live with you.',
    effect: 'comfort',
    effectPerLevel: 2, // animal capacity per level
    maxLevel: 3,
    cost: [
      [{ id: 'wood', qty: 4 }, { id: 'cloth', qty: 3 }],
      [{ id: 'wood', qty: 6 }, { id: 'cloth', qty: 5 }],
    ],
  },
];

export function getUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}
