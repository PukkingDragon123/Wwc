// A tiny, dependency-free typed event emitter. Phaser-free so it works in
// headless unit tests. The single decoupling layer between GameState (model)
// and the scenes / HUD (view).

export const GameEvents = {
  HEALTH_CHANGED: 'health-changed',
  HUNGER_CHANGED: 'hunger-changed',
  MUTATION_CHANGED: 'mutation-changed',
  DAY_ADVANCED: 'day-advanced',
  INVENTORY_CHANGED: 'inventory-changed',
  STASH_CHANGED: 'stash-changed',
  TIME_CHANGED: 'time-changed', // payload: timeOfDay 0..1
  NIGHT_WARNING: 'night-warning',
  PLAYER_DIED: 'player-died',
  CREATURE_KILLED: 'creature-killed',
  ANIMAL_RESCUED: 'animal-rescued',
  BUNKER_CHANGED: 'bunker-changed',
  SCENE_MOOD: 'scene-mood', // payload: 'home' | 'world'
  WEAPON_CHANGED: 'weapon-changed', // payload: itemId | null
  TOAST: 'toast', // payload: { text, tone? }
} as const;

export type GameEvent = (typeof GameEvents)[keyof typeof GameEvents];

type Handler = (...args: any[]) => void;

class EventBusImpl {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, fn: Handler): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => this.off(event, fn);
  }

  once(event: string, fn: Handler): void {
    const wrap: Handler = (...args) => {
      this.off(event, wrap);
      fn(...args);
    };
    this.on(event, wrap);
  }

  off(event: string, fn: Handler): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event: string, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // copy to allow handlers to unsubscribe during emit
    for (const fn of [...set]) fn(...args);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new EventBusImpl();
