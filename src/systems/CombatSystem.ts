// Pure damage maths. The physics layer (WorldScene) supplies impact speed and
// the weapon profile; this turns it into damage + whether the hit severs.

import { Balance } from '../config/Balance';
import type { WeaponProfile } from '../state/types';

export interface HitResult {
  damage: number;
  knockback: number; // impulse magnitude to apply along the collision normal
  canSever: boolean; // whether this single hit is strong enough to sever a weak limb
}

// impactSpeed: relative speed of the weapon body at contact (Matter units).
export function resolveHit(weapon: WeaponProfile, impactSpeed: number): HitResult {
  const speedTerm = 1 + impactSpeed * Balance.WEAPON_DAMAGE_FROM_SPEED;
  const damage = weapon.damage * speedTerm * (0.6 + 0.4 * weapon.weight);
  const knockback = impactSpeed * weapon.weight * Balance.KNOCKBACK_SCALE;
  const canSever = damage >= Balance.SEVER_DAMAGE_THRESHOLD;
  return {
    damage: Math.round(damage * 10) / 10,
    knockback,
    canSever,
  };
}

// Should a limb with `limbHp` remaining sever from `damage`?
export function shouldSever(
  limbHp: number,
  damage: number,
  canSever: boolean,
  severable: boolean
): boolean {
  if (!severable) return false;
  if (limbHp - damage > 0) return false; // limb survives
  // limb is destroyed; sever if hit was forceful enough
  return canSever || damage >= Balance.SEVER_DAMAGE_THRESHOLD;
}
