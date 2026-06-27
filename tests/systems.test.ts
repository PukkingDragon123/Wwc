import { describe, it, expect } from 'vitest';
import { dailyMutationGain, speedMultiplier, stageLabel } from '../src/systems/RadiationSystem';
import { resolveHit, shouldSever } from '../src/systems/CombatSystem';
import { recipeUnlocked, canCraft } from '../src/systems/CraftingSystem';
import { rollLoot } from '../src/systems/LootSystem';
import { Rng } from '../src/util/rng';
import { Balance } from '../src/config/Balance';
import type { RecipeDef, LootEntry } from '../src/state/types';

describe('RadiationSystem', () => {
  it('mutation gain rises with exposure and falls with decontamination', () => {
    const base = dailyMutationGain(0, 0);
    expect(base).toBe(Balance.BASE_MUTATION_PER_DAY);
    const exposed = dailyMutationGain(20, 0);
    expect(exposed).toBeGreaterThan(base);
    const cleaned = dailyMutationGain(20, 3);
    expect(cleaned).toBeLessThan(exposed);
    expect(dailyMutationGain(0, 99)).toBeGreaterThanOrEqual(0); // never negative
  });

  it('speed multiplier drops as mutation crosses stages', () => {
    expect(speedMultiplier(0)).toBe(1);
    expect(speedMultiplier(99)).toBeLessThan(speedMultiplier(0));
    expect(stageLabel(0)).toBe('Stable');
    expect(stageLabel(100)).toBe('Turning');
  });
});

describe('CombatSystem', () => {
  it('faster, heavier swings do more damage and knockback', () => {
    const w = { damage: 8, reach: 40, weight: 1, swingSpeed: 0.6 };
    const slow = resolveHit(w, 2);
    const fast = resolveHit(w, 20);
    expect(fast.damage).toBeGreaterThan(slow.damage);
    expect(fast.knockback).toBeGreaterThan(slow.knockback);
  });

  it('severs only destroyed, severable limbs under a forceful hit', () => {
    expect(shouldSever(5, 20, true, true)).toBe(true); // destroyed + forceful + severable
    expect(shouldSever(5, 20, true, false)).toBe(false); // not severable (e.g. torso)
    expect(shouldSever(50, 5, false, true)).toBe(false); // limb survives
  });
});

describe('CraftingSystem', () => {
  const recipe: RecipeDef = {
    id: 'r',
    name: 'Test',
    inputs: [{ id: 'scrap', qty: 3 }],
    output: { id: 'rebar', qty: 1 },
    requiresUpgrade: 'workbench',
  };

  it('gates recipes behind required upgrades', () => {
    expect(recipeUnlocked(recipe, () => 0)).toBe(false);
    expect(recipeUnlocked(recipe, () => 1)).toBe(true);
  });

  it('canCraft needs both unlock and materials', () => {
    expect(canCraft(recipe, [{ id: 'scrap', qty: 3 }], () => 1)).toBe(true);
    expect(canCraft(recipe, [{ id: 'scrap', qty: 2 }], () => 1)).toBe(false);
    expect(canCraft(recipe, [{ id: 'scrap', qty: 3 }], () => 0)).toBe(false);
  });
});

describe('LootSystem', () => {
  it('rollLoot is deterministic for a given seed', () => {
    const table: LootEntry[] = [{ itemId: 'scrap', chance: 0.5, min: 1, max: 3 }];
    const a = rollLoot(table, new Rng(42));
    const b = rollLoot(table, new Rng(42));
    expect(a).toEqual(b);
  });
});
