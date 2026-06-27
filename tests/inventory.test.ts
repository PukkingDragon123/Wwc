import { describe, it, expect } from 'vitest';
import {
  addItem,
  removeItem,
  removeItems,
  hasItems,
  countItem,
} from '../src/systems/InventorySystem';
import type { InventoryItem } from '../src/state/types';

describe('InventorySystem', () => {
  it('stacks into existing slots up to maxStack', () => {
    const inv: InventoryItem[] = [{ id: 'scrap', qty: 97 }];
    const leftover = addItem(inv, 'scrap', 5);
    // scrap maxStack 99: fills to 99 (+2), then a new stack with 3
    expect(leftover).toBe(0);
    expect(countItem(inv, 'scrap')).toBe(102);
    expect(inv.length).toBe(2);
  });

  it('respects slot capacity and reports leftover', () => {
    const inv: InventoryItem[] = [];
    const leftover = addItem(inv, 'pipe', 3, 2); // pipe maxStack 1 -> needs 3 slots, only 2 allowed
    expect(inv.length).toBe(2);
    expect(leftover).toBe(1);
  });

  it('removeItem only succeeds with enough quantity', () => {
    const inv: InventoryItem[] = [{ id: 'wood', qty: 2 }];
    expect(removeItem(inv, 'wood', 3)).toBe(false);
    expect(countItem(inv, 'wood')).toBe(2);
    expect(removeItem(inv, 'wood', 2)).toBe(true);
    expect(inv.length).toBe(0);
  });

  it('hasItems / removeItems are atomic', () => {
    const inv: InventoryItem[] = [
      { id: 'scrap', qty: 3 },
      { id: 'wood', qty: 1 },
    ];
    const reqs = [
      { id: 'scrap', qty: 4 },
      { id: 'wood', qty: 1 },
    ];
    expect(hasItems(inv, reqs)).toBe(false);
    expect(removeItems(inv, reqs)).toBe(false);
    // nothing consumed on failure
    expect(countItem(inv, 'scrap')).toBe(3);
    expect(countItem(inv, 'wood')).toBe(1);
  });
});
