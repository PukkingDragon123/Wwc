// Core domain types. Kept Phaser-free so game logic stays headless-testable.

export interface Vec2 {
  x: number;
  y: number;
}

export type ItemId = string;
export type ItemCategory =
  | 'weapon'
  | 'food'
  | 'medicine'
  | 'material'
  | 'seed'
  | 'misc';

export interface WeaponProfile {
  damage: number; // base damage multiplier applied on hit
  reach: number; // length of the weapon body in px
  weight: number; // mass factor — heavier hits harder / knocks back more
  swingSpeed: number; // angular speed of a swing (rad/frame-ish)
}

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  maxStack: number;
  value: number; // rough rarity / worth
  color: number; // procedural icon tint (0xRRGGBB)
  // consumable effects
  heal?: number; // restore health
  nourish?: number; // restore hunger
  radReduce?: number; // reduce mutation meter
  // weapon
  weapon?: WeaponProfile;
  // seed
  growsInto?: ItemId;
  growDays?: number;
}

export interface InventoryItem {
  id: ItemId;
  qty: number;
}

export type CreatureKind = 'threat' | 'cute';

export interface LimbDef {
  name: string;
  x: number; // offset from torso centre
  y: number;
  w: number;
  h: number;
  hp: number;
  shape: 'rect' | 'circle';
  color: number;
  severable: boolean; // torso/root should be false
}

export interface LootEntry {
  itemId: ItemId;
  chance: number; // 0..1
  min: number;
  max: number;
}

export interface CreatureDef {
  id: string;
  name: string;
  kind: CreatureKind;
  limbs: LimbDef[]; // limbs[0] is the torso/root
  moveSpeed: number;
  contactDamage: number;
  detectRange: number;
  scale: number;
  accentColor: number; // "mutant wrongness" accent
  loot: LootEntry[];
}

export interface RecipeDef {
  id: string;
  name: string;
  inputs: InventoryItem[];
  output: InventoryItem;
  requiresUpgrade?: string; // bunker upgrade id required
}

export type UpgradeEffect =
  | 'bed'
  | 'storage'
  | 'workbench'
  | 'garden'
  | 'decon'
  | 'comfort';

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: InventoryItem[][]; // cost[level] = inputs for that level
  maxLevel: number;
  effect: UpgradeEffect;
  effectPerLevel: number;
}

export interface PlotState {
  seedId: ItemId | null;
  plantedDay: number | null;
  growDays: number;
  producesItemId: ItemId | null;
}

export interface RescuedAnimal {
  defId: string;
  name: string;
  rescuedDay: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  mutation: number; // 0..100
}

export interface BunkerState {
  upgrades: Record<string, number>; // upgradeId -> level (0 = not built)
  plots: PlotState[];
  rescues: RescuedAnimal[];
  stash: InventoryItem[];
}

export interface GameStateData {
  version: number;
  day: number;
  timeOfDay: number; // 0..1 within the current day; resumes across re-entries
  pendingExposure: number; // surface seconds accrued, consumed at sleep
  player: PlayerStats;
  inventory: InventoryItem[];
  equippedWeapon: ItemId | null;
  bunker: BunkerState;
  flags: Record<string, boolean>;
  rngSeed: number;
  // run summary stats
  kills: number;
  animalsRescued: number;
}
