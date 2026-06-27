// Pure inventory operations on an InventoryItem[]. No Phaser, no GameState —
// fully unit-testable. Stacks respect each item's maxStack across slots.

import type { InventoryItem, ItemId } from '../state/types';
import { getItem } from '../data/items';

export function countItem(list: InventoryItem[], id: ItemId): number {
  let n = 0;
  for (const it of list) if (it.id === id) n += it.qty;
  return n;
}

export function usedSlots(list: InventoryItem[]): number {
  return list.length;
}

// Adds qty of an item, stacking into existing slots first then new slots up to
// maxSlots. Returns the leftover qty that did not fit (0 if all added).
export function addItem(
  list: InventoryItem[],
  id: ItemId,
  qty: number,
  maxSlots = Infinity
): number {
  const def = getItem(id);
  let remaining = qty;

  // fill existing stacks
  for (const it of list) {
    if (remaining <= 0) break;
    if (it.id !== id) continue;
    const space = def.maxStack - it.qty;
    if (space <= 0) continue;
    const put = Math.min(space, remaining);
    it.qty += put;
    remaining -= put;
  }

  // new stacks
  while (remaining > 0 && list.length < maxSlots) {
    const put = Math.min(def.maxStack, remaining);
    list.push({ id, qty: put });
    remaining -= put;
  }

  return remaining;
}

// Removes qty of an item if available. Returns true on success (and mutates),
// false if there isn't enough (no mutation in that case).
export function removeItem(
  list: InventoryItem[],
  id: ItemId,
  qty: number
): boolean {
  if (countItem(list, id) < qty) return false;
  let remaining = qty;
  for (let i = list.length - 1; i >= 0 && remaining > 0; i--) {
    if (list[i].id !== id) continue;
    const take = Math.min(list[i].qty, remaining);
    list[i].qty -= take;
    remaining -= take;
    if (list[i].qty <= 0) list.splice(i, 1);
  }
  return true;
}

export function hasItems(list: InventoryItem[], reqs: InventoryItem[]): boolean {
  return reqs.every((r) => countItem(list, r.id) >= r.qty);
}

// Removes a whole requirement list atomically. Returns false (no mutation) if
// any requirement is missing.
export function removeItems(
  list: InventoryItem[],
  reqs: InventoryItem[]
): boolean {
  if (!hasItems(list, reqs)) return false;
  for (const r of reqs) removeItem(list, r.id, r.qty);
  return true;
}
