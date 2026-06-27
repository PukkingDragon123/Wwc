// Every tunable number lives here. Tuning = editing one file.

export const VIRTUAL_WIDTH = 1280;
export const VIRTUAL_HEIGHT = 720;

export const Balance = {
  // ---- time / day cycle (clock only runs while outside) ----
  DAY_DURATION_MS: 150_000, // ~2.5 min day (tune up for release)
  DUSK_START: 0.6, // timeOfDay where light begins to fade
  NIGHT_WARNING_AT: 0.78, // fire NIGHT_WARNING here
  NIGHT_AT: 1.0,

  // ---- player ----
  PLAYER_MAX_HEALTH: 100,
  PLAYER_MAX_HUNGER: 100,
  PLAYER_MOVE_FORCE: 0.012, // matter force applied while running
  PLAYER_MAX_RUN_SPEED: 4.2,
  PLAYER_JUMP_VELOCITY: -10,
  PLAYER_ATTACK_COOLDOWN_MS: 360,
  PLAYER_WIDTH: 26,
  PLAYER_HEIGHT: 54,

  // ---- hunger ----
  HUNGER_DRAIN_PER_DAY: 30,
  STARVING_HP_LOSS_PER_DAY: 14,

  // ---- radiation / mutation (the slow death) ----
  BASE_MUTATION_PER_DAY: 5,
  SURFACE_EXPOSURE_PER_SECOND: 0.35, // accrues while in the world; added at day end
  MUTATION_STAGE_THRESHOLDS: [25, 50, 75, 95] as const,
  NIGHT_CAUGHT_DAMAGE: 45,
  NIGHT_CAUGHT_MUTATION: 8,

  // mutation stage effects (index aligns with thresholds; stage 0 = none)
  MUTATION_SPEED_PENALTY: [0, 0.06, 0.14, 0.26, 0.4], // fraction of speed lost
  MUTATION_MAXHP_PENALTY: [0, 0, 8, 20, 35], // flat max-hp reduction

  // ---- combat / gore ----
  MAX_GORE_BODIES: 64,
  SEVER_DAMAGE_THRESHOLD: 9, // single hit above this can sever a weak limb
  BLOOD_PER_HIT: 7,
  BLOOD_PER_SEVER: 22,
  HITSTOP_MS: 55,
  KNOCKBACK_SCALE: 0.0016,
  WEAPON_DAMAGE_FROM_SPEED: 0.9,
  CONTACT_DAMAGE_COOLDOWN_MS: 700,
  CORPSE_LIFETIME_MS: 30_000,

  // ---- world ----
  WORLD_WIDTH: 5200,
  GROUND_Y: 640,
  WORLD_GRAVITY_Y: 1.1,
  EXIT_DOOR_X: 120, // bunker door on the far left of the town
  PLAYER_SPAWN_X: 240,

  // ---- farming ----
  STARTING_PLOTS: 2,

  // ---- starting state ----
  STARTING_INVENTORY: [
    { id: 'pipe', qty: 1 },
    { id: 'canned_food', qty: 2 },
  ],
} as const;

// Returns the mutation stage 0..4 for a given mutation value.
export function mutationStage(mutation: number): number {
  let stage = 0;
  for (const t of Balance.MUTATION_STAGE_THRESHOLDS) {
    if (mutation >= t) stage++;
  }
  return stage;
}
