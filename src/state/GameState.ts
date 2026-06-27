// The single source of truth. A typed singleton (not per-scene data) so every
// scene shares one consistent object across transitions. Mutators clamp values
// and emit EventBus events; the HUD and scenes only react.

import { Balance, mutationStage } from '../config/Balance';
import { EventBus, GameEvents } from './EventBus';
import { getUpgrade } from '../data/upgrades';
import { addItem, removeItems, hasItems } from '../systems/InventorySystem';
import { dailyMutationGain, maxHpPenalty } from '../systems/RadiationSystem';
import type {
  GameStateData,
  InventoryItem,
  ItemId,
  PlotState,
  RescuedAnimal,
} from './types';

export const SAVE_VERSION = 1;
const BASE_STASH_SLOTS = 12;
const BASE_INV_SLOTS = 12;

function freshPlot(): PlotState {
  return { seedId: null, plantedDay: null, growDays: 0, producesItemId: null };
}

function freshData(): GameStateData {
  const plots: PlotState[] = [];
  for (let i = 0; i < Balance.STARTING_PLOTS; i++) plots.push(freshPlot());
  return {
    version: SAVE_VERSION,
    day: 1,
    timeOfDay: 0,
    pendingExposure: 0,
    player: {
      health: Balance.PLAYER_MAX_HEALTH,
      maxHealth: Balance.PLAYER_MAX_HEALTH,
      hunger: Balance.PLAYER_MAX_HUNGER,
      maxHunger: Balance.PLAYER_MAX_HUNGER,
      mutation: 0,
    },
    inventory: Balance.STARTING_INVENTORY.map((i) => ({ ...i })),
    equippedWeapon: 'pipe',
    bunker: {
      upgrades: {},
      plots,
      rescues: [],
      stash: [],
    },
    flags: {},
    rngSeed: 1337,
    kills: 0,
    animalsRescued: 0,
  };
}

class GameStateImpl {
  data: GameStateData = freshData();

  newGame(): void {
    this.data = freshData();
    this.recomputeMaxHealth();
    EventBus.emit(GameEvents.DAY_ADVANCED, this.data.day);
    EventBus.emit(GameEvents.HEALTH_CHANGED, this.data.player);
    EventBus.emit(GameEvents.HUNGER_CHANGED, this.data.player);
    EventBus.emit(GameEvents.MUTATION_CHANGED, this.data.player);
    EventBus.emit(GameEvents.INVENTORY_CHANGED);
  }

  loadFrom(data: GameStateData): void {
    this.data = data;
    if (this.data.timeOfDay === undefined) this.data.timeOfDay = 0;
    if (this.data.pendingExposure === undefined) this.data.pendingExposure = 0;
    this.recomputeMaxHealth();
    EventBus.emit(GameEvents.DAY_ADVANCED, this.data.day);
    EventBus.emit(GameEvents.HEALTH_CHANGED, this.data.player);
    EventBus.emit(GameEvents.HUNGER_CHANGED, this.data.player);
    EventBus.emit(GameEvents.MUTATION_CHANGED, this.data.player);
    EventBus.emit(GameEvents.INVENTORY_CHANGED);
  }

  // ---- derived getters ----
  get player() {
    return this.data.player;
  }
  get inventory() {
    return this.data.inventory;
  }
  get bunker() {
    return this.data.bunker;
  }
  upgradeLevel(id: string): number {
    return this.data.bunker.upgrades[id] ?? 0;
  }
  hasWorkbench(): boolean {
    return this.upgradeLevel('workbench') > 0;
  }
  stashCapacity(): number {
    const u = getUpgrade('storage');
    return BASE_STASH_SLOTS + this.upgradeLevel('storage') * (u?.effectPerLevel ?? 0);
  }
  invCapacity(): number {
    return BASE_INV_SLOTS;
  }
  animalCapacity(): number {
    const u = getUpgrade('comfort');
    return this.upgradeLevel('comfort') * (u?.effectPerLevel ?? 0);
  }
  mutationStage(): number {
    return mutationStage(this.data.player.mutation);
  }

  // ---- player stats ----
  recomputeMaxHealth(): void {
    const penalty = maxHpPenalty(this.data.player.mutation);
    this.data.player.maxHealth = Math.max(20, Balance.PLAYER_MAX_HEALTH - penalty);
    if (this.data.player.health > this.data.player.maxHealth) {
      this.data.player.health = this.data.player.maxHealth;
    }
  }

  damagePlayer(amount: number): void {
    if (amount <= 0) return;
    this.data.player.health = Math.max(0, this.data.player.health - amount);
    EventBus.emit(GameEvents.HEALTH_CHANGED, this.data.player);
    if (this.data.player.health <= 0) EventBus.emit(GameEvents.PLAYER_DIED, 'wounds');
  }

  healPlayer(amount: number): void {
    if (amount <= 0) return;
    this.data.player.health = Math.min(
      this.data.player.maxHealth,
      this.data.player.health + amount
    );
    EventBus.emit(GameEvents.HEALTH_CHANGED, this.data.player);
  }

  changeHunger(delta: number): void {
    this.data.player.hunger = Math.max(
      0,
      Math.min(this.data.player.maxHunger, this.data.player.hunger + delta)
    );
    EventBus.emit(GameEvents.HUNGER_CHANGED, this.data.player);
  }

  changeMutation(delta: number): void {
    const hpBefore = this.data.player.health;
    this.data.player.mutation = Math.max(0, Math.min(100, this.data.player.mutation + delta));
    this.recomputeMaxHealth();
    EventBus.emit(GameEvents.MUTATION_CHANGED, this.data.player);
    if (this.data.player.health !== hpBefore) EventBus.emit(GameEvents.HEALTH_CHANGED, this.data.player);
    if (this.data.player.mutation >= 100) EventBus.emit(GameEvents.PLAYER_DIED, 'mutation');
  }

  addExposure(seconds: number): void {
    this.data.pendingExposure += seconds;
  }

  setTimeOfDay(t: number): void {
    this.data.timeOfDay = t;
  }

  // ---- inventory ----
  addToInventory(id: ItemId, qty: number): number {
    const leftover = addItem(this.data.inventory, id, qty, this.invCapacity());
    EventBus.emit(GameEvents.INVENTORY_CHANGED);
    return qty - leftover;
  }

  hasInInventory(reqs: InventoryItem[]): boolean {
    return hasItems(this.data.inventory, reqs);
  }

  removeFromInventory(reqs: InventoryItem[]): boolean {
    const ok = removeItems(this.data.inventory, reqs);
    if (ok) EventBus.emit(GameEvents.INVENTORY_CHANGED);
    return ok;
  }

  // move one unit from inventory to stash (returns success)
  toStash(id: ItemId): boolean {
    if (!removeItems(this.data.inventory, [{ id, qty: 1 }])) return false;
    const leftover = addItem(this.data.bunker.stash, id, 1, this.stashCapacity());
    if (leftover > 0) {
      // no room — put it back
      addItem(this.data.inventory, id, 1, this.invCapacity());
      return false;
    }
    EventBus.emit(GameEvents.INVENTORY_CHANGED);
    EventBus.emit(GameEvents.STASH_CHANGED);
    return true;
  }

  fromStash(id: ItemId): boolean {
    if (!removeItems(this.data.bunker.stash, [{ id, qty: 1 }])) return false;
    const leftover = addItem(this.data.inventory, id, 1, this.invCapacity());
    if (leftover > 0) {
      addItem(this.data.bunker.stash, id, 1, this.stashCapacity());
      return false;
    }
    EventBus.emit(GameEvents.INVENTORY_CHANGED);
    EventBus.emit(GameEvents.STASH_CHANGED);
    return true;
  }

  // Buy/upgrade a bunker station. Validates cost + max level, applies side
  // effects (a new garden plot), and reports success.
  buyUpgrade(id: string): boolean {
    const def = getUpgrade(id);
    if (!def) return false;
    const level = this.upgradeLevel(id);
    if (level >= def.maxLevel) return false;
    const cost = def.cost[level];
    if (!cost) return false;
    if (!removeItems(this.data.inventory, cost)) return false;
    this.data.bunker.upgrades[id] = level + 1;
    if (def.effect === 'garden') this.data.bunker.plots.push(freshPlot());
    EventBus.emit(GameEvents.INVENTORY_CHANGED);
    EventBus.emit(GameEvents.BUNKER_CHANGED);
    return true;
  }

  craft(inputs: InventoryItem[], outId: ItemId, outQty: number): boolean {
    if (!removeItems(this.data.inventory, inputs)) return false;
    this.addToInventory(outId, outQty);
    return true;
  }

  setWeapon(id: ItemId | null): void {
    this.data.equippedWeapon = id;
    EventBus.emit(GameEvents.WEAPON_CHANGED, id);
  }

  // ---- world events ----
  recordKill(): void {
    this.data.kills++;
    EventBus.emit(GameEvents.CREATURE_KILLED, this.data.kills);
  }

  rescue(animal: RescuedAnimal): boolean {
    if (this.data.bunker.rescues.length >= this.animalCapacity()) return false;
    this.data.bunker.rescues.push(animal);
    this.data.animalsRescued++;
    EventBus.emit(GameEvents.ANIMAL_RESCUED, animal);
    EventBus.emit(GameEvents.BUNKER_CHANGED);
    return true;
  }

  // ---- day advance (called when sleeping in the bunker) ----
  advanceDay(): void {
    const p = this.data.player;

    // mutation: base + accumulated surface exposure, reduced by decontamination
    const mut = dailyMutationGain(this.data.pendingExposure, this.upgradeLevel('decon'));
    this.data.pendingExposure = 0;
    this.data.timeOfDay = 0; // a fresh day begins; the clock resets only on sleep

    // hunger drain; starving costs health
    this.changeHunger(-Balance.HUNGER_DRAIN_PER_DAY);
    if (p.hunger <= 0) this.damagePlayer(Balance.STARVING_HP_LOSS_PER_DAY);

    // bed heals overnight
    const bedU = getUpgrade('bed');
    const heal = this.upgradeLevel('bed') * (bedU?.effectPerLevel ?? 0);
    if (heal > 0) this.healPlayer(heal);

    // apply mutation last (may trigger death)
    this.changeMutation(mut);

    this.data.day++;
    EventBus.emit(GameEvents.DAY_ADVANCED, this.data.day);
  }
}

export const GameState = new GameStateImpl();
