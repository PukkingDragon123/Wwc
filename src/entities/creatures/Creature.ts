import Phaser from 'phaser';
import { LimbPart } from '../LimbPart';
import type { CreatureDef } from '../../state/types';

let GROUP_SEQ = 1;

// A mutant assembled from limbs joined to a torso by breakable constraints.
// Alive: the torso is held upright and driven toward (threat) or away from
// (cute) the player. Dead: forcing stops and the constraints let it ragdoll.
export class Creature {
  scene: Phaser.Scene;
  def: CreatureDef;
  limbs: LimbPart[] = [];
  torso: LimbPart;
  alive = true;
  facing = -1;
  private hopTimer = 0;

  constructor(scene: Phaser.Scene, def: CreatureDef, x: number, y: number) {
    this.scene = scene;
    this.def = def;
    const group = GROUP_SEQ++;
    const s = def.scale;

    for (const limbDef of def.limbs) {
      const limb = new LimbPart(
        scene,
        x + limbDef.x * s,
        y + limbDef.y * s,
        limbDef,
        group,
        s,
        def.accentColor
      );
      this.limbs.push(limb);
    }
    this.torso = this.limbs[0];

    // joint every non-torso limb to the torso
    for (let i = 1; i < this.limbs.length; i++) {
      const limb = this.limbs[i];
      const c = scene.matter.add.constraint(
        this.torso.sprite.body as MatterJS.BodyType,
        limb.sprite.body as MatterJS.BodyType,
        0,
        0.9,
        {
          pointA: { x: limb.def.x * s, y: limb.def.y * s },
          pointB: { x: 0, y: 0 },
          damping: 0.15,
        }
      );
      limb.constraint = c;
    }
  }

  get x(): number {
    return this.torso.x;
  }
  get y(): number {
    return this.torso.y;
  }

  isThreat(): boolean {
    return this.def.kind === 'threat';
  }

  limbByName(name: string): LimbPart | undefined {
    return this.limbs.find((l) => l.def.name === name);
  }

  // limbs that can still be struck (attached, non-severed)
  hittableLimbs(): LimbPart[] {
    return this.limbs.filter((l) => !l.severed && l.sprite.active);
  }

  update(_dt: number, px: number, _py: number): void {
    if (!this.alive) return;
    const torso = this.torso;
    // hold upright while alive
    torso.sprite.setRotation(0);
    torso.sprite.setAngularVelocity(0);

    const dx = px - torso.x;
    const dist = Math.abs(dx);

    if (this.isThreat()) {
      if (dist < this.def.detectRange) {
        const dir = Math.sign(dx) || 1;
        this.facing = dir;
        torso.sprite.setVelocityX(dir * this.def.moveSpeed);
        // occasional lunge-hop
        this.hopTimer -= _dt;
        if (this.hopTimer <= 0 && dist < 90) {
          torso.sprite.setVelocityY(-5.5);
          this.hopTimer = 1400;
        }
      } else {
        torso.sprite.setVelocityX(0);
      }
    } else {
      // cute: skitter away if the player gets close
      if (dist < 130) {
        const dir = -(Math.sign(dx) || 1);
        torso.sprite.setVelocityX(dir * this.def.moveSpeed);
      } else {
        torso.sprite.setVelocityX(0);
      }
    }
  }

  // Returns true if this damage killed the creature.
  registerLimbDestroyed(limb: LimbPart): boolean {
    // death if the torso is gone or the head comes off
    if (limb === this.torso) return true;
    if (limb.def.name === 'head') return true;
    // death if it has lost most of its limbs
    const remaining = this.limbs.filter((l) => !l.severed).length;
    return remaining <= 1;
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.torso.sprite.setAngularVelocity((Math.random() - 0.5) * 0.6);
  }

  destroy(): void {
    for (const l of this.limbs) l.destroy();
    this.limbs = [];
  }
}
