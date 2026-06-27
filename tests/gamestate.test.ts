import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { GameState } from '../src/state/GameState';
import { SaveManager } from '../src/state/SaveManager';
import { EventBus, GameEvents } from '../src/state/EventBus';
import { Balance } from '../src/config/Balance';

beforeAll(() => {
  // minimal localStorage polyfill for the node test env
  const store: Record<string, string> = {};
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
});

describe('GameState', () => {
  beforeEach(() => GameState.newGame());

  it('starts a fresh run with full stats and a weapon', () => {
    expect(GameState.data.day).toBe(1);
    expect(GameState.player.health).toBe(Balance.PLAYER_MAX_HEALTH);
    expect(GameState.data.equippedWeapon).toBe('pipe');
    expect(GameState.bunker.plots.length).toBe(Balance.STARTING_PLOTS);
  });

  it('advanceDay drains hunger and raises mutation', () => {
    const m0 = GameState.player.mutation;
    GameState.advanceDay();
    expect(GameState.data.day).toBe(2);
    expect(GameState.player.mutation).toBeGreaterThan(m0);
    expect(GameState.player.hunger).toBeLessThan(Balance.PLAYER_MAX_HUNGER);
  });

  it('clamps health and fires death at zero', () => {
    let died = '';
    const off = EventBus.on(GameEvents.PLAYER_DIED, (c: string) => (died = c));
    GameState.damagePlayer(9999);
    expect(GameState.player.health).toBe(0);
    expect(died).toBe('wounds');
    off();
  });

  it('mutation reaching 100 ends the run', () => {
    let died = '';
    const off = EventBus.on(GameEvents.PLAYER_DIED, (c: string) => (died = c));
    GameState.changeMutation(999);
    expect(GameState.player.mutation).toBe(100);
    expect(died).toBe('mutation');
    off();
  });

  it('buyUpgrade spends materials and a garden adds a plot', () => {
    GameState.addToInventory('wood', 10);
    GameState.addToInventory('cloth', 10);
    const plotsBefore = GameState.bunker.plots.length;
    expect(GameState.buyUpgrade('garden')).toBe(true);
    expect(GameState.upgradeLevel('garden')).toBe(1);
    expect(GameState.bunker.plots.length).toBe(plotsBefore + 1);
  });

  it('cannot rescue without sanctuary capacity, then can after building it', () => {
    expect(GameState.rescue({ defId: 'pip', name: 'Pip', rescuedDay: 1 })).toBe(false);
    GameState.addToInventory('wood', 20);
    GameState.addToInventory('cloth', 20);
    expect(GameState.buyUpgrade('comfort')).toBe(true);
    expect(GameState.rescue({ defId: 'pip', name: 'Pip', rescuedDay: 1 })).toBe(true);
  });

  it('save/load round-trips the full state', () => {
    GameState.advanceDay();
    GameState.addToInventory('scrap', 7);
    SaveManager.save();
    const day = GameState.data.day;
    const scrap = GameState.inventory.find((i) => i.id === 'scrap')?.qty;
    GameState.newGame(); // wipe in-memory
    expect(GameState.data.day).toBe(1);
    expect(SaveManager.load()).toBe(true);
    expect(GameState.data.day).toBe(day);
    expect(GameState.inventory.find((i) => i.id === 'scrap')?.qty).toBe(scrap);
  });
});
