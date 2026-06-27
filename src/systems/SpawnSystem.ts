// Pure spawn planning — deterministic per (seed, day) so a day is reproducible.
// Returns descriptors; the scene turns them into game objects.

import { Rng } from '../util/rng';
import { CONTAINER_KINDS } from './LootSystem';
import { CUTE_IDS } from '../entities/creatures/definitions';

export interface SpawnPlan {
  threats: { id: string; x: number }[];
  containers: { kind: string; x: number }[];
  cuties: { id: string; x: number }[];
  weaponPickups: { id: string; x: number }[];
}

export function planDay(seed: number, day: number, worldWidth: number): SpawnPlan {
  const rng = new Rng((seed + day * 131) >>> 0);
  const left = 560;
  const right = worldWidth - 280;
  const span = right - left;

  const threatCount = Math.min(3 + Math.floor(day / 2), 9);
  const threats: { id: string; x: number }[] = [];
  for (let i = 0; i < threatCount; i++) {
    const x = left + ((i + rng.next()) / threatCount) * span;
    let id = 'mauler';
    const r = rng.next();
    if (day >= 3 && r < 0.28) id = 'brute';
    else if (r < 0.6) id = 'crawler';
    threats.push({ id, x });
  }

  const containerCount = 6;
  const containers: { kind: string; x: number }[] = [];
  for (let i = 0; i < containerCount; i++) {
    const x = left + ((i + rng.range(0.2, 0.8)) / containerCount) * span;
    containers.push({ kind: rng.pick(CONTAINER_KINDS), x });
  }

  const cuties: { id: string; x: number }[] = [];
  const cuteCount = rng.chance(0.7) ? rng.int(1, 2) : 0;
  for (let i = 0; i < cuteCount; i++) {
    cuties.push({ id: rng.pick(CUTE_IDS), x: rng.range(left, right) });
  }

  const weaponPickups: { id: string; x: number }[] = [];
  if (rng.chance(0.4)) {
    const id = rng.pick(['rebar', 'cleaver'] as const);
    weaponPickups.push({ id, x: rng.range(left, right) });
  }

  return { threats, containers, cuties, weaponPickups };
}
