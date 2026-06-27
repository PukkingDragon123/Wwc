// Pure mutation maths. The "slowly dying" pressure. Mutation rises per day
// (mostly from surface exposure), is reduced by decontamination, and crosses
// discrete stages that apply legible penalties.

import { Balance, mutationStage } from '../config/Balance';
import { getUpgrade } from '../data/upgrades';

export function dailyMutationGain(exposureSeconds: number, deconLevel: number): number {
  const deconU = getUpgrade('decon');
  const reduce = deconLevel * (deconU?.effectPerLevel ?? 0);
  const gain =
    Balance.BASE_MUTATION_PER_DAY +
    exposureSeconds * Balance.SURFACE_EXPOSURE_PER_SECOND -
    reduce;
  return Math.max(0, gain);
}

// movement speed retained at a given mutation (1 = full, lower = slower)
export function speedMultiplier(mutation: number): number {
  const stage = mutationStage(mutation);
  const penalty = Balance.MUTATION_SPEED_PENALTY[stage] ?? 0;
  return 1 - penalty;
}

export function maxHpPenalty(mutation: number): number {
  const stage = mutationStage(mutation);
  return Balance.MUTATION_MAXHP_PENALTY[stage] ?? 0;
}

const STAGE_LABELS = [
  'Stable',
  'Itching',
  'Twitching',
  'Warping',
  'Turning',
] as const;

export function stageLabel(mutation: number): string {
  return STAGE_LABELS[mutationStage(mutation)] ?? 'Turning';
}
