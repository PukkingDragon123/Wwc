// Pure, seeded loot resolution so a given day/encounter is reproducible.

import type { InventoryItem, LootEntry } from '../state/types';
import { Rng } from '../util/rng';

export function rollLoot(table: LootEntry[], rng: Rng): InventoryItem[] {
  const out: InventoryItem[] = [];
  for (const entry of table) {
    if (rng.chance(entry.chance)) {
      const qty = rng.int(entry.min, entry.max);
      if (qty > 0) out.push({ id: entry.itemId, qty });
    }
  }
  return out;
}

// Container loot tables for scavenging the town.
export const CONTAINER_TABLES: Record<string, LootEntry[]> = {
  cabinet: [
    { itemId: 'canned_food', chance: 0.55, min: 1, max: 2 },
    { itemId: 'cloth', chance: 0.5, min: 1, max: 3 },
    { itemId: 'bandage', chance: 0.25, min: 1, max: 1 },
    { itemId: 'scrap', chance: 0.4, min: 1, max: 2 },
  ],
  locker: [
    { itemId: 'scrap', chance: 0.7, min: 1, max: 3 },
    { itemId: 'pipe', chance: 0.15, min: 1, max: 1 },
    { itemId: 'chemicals', chance: 0.3, min: 1, max: 2 },
    { itemId: 'wood', chance: 0.4, min: 1, max: 2 },
  ],
  crate: [
    { itemId: 'wood', chance: 0.7, min: 1, max: 3 },
    { itemId: 'scrap', chance: 0.5, min: 1, max: 2 },
    { itemId: 'veg_seed', chance: 0.3, min: 1, max: 2 },
    { itemId: 'antirad', chance: 0.12, min: 1, max: 1 },
  ],
};

export const CONTAINER_KINDS = Object.keys(CONTAINER_TABLES);
