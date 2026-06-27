import Phaser from 'phaser';
import { CAT } from '../util/collision';
import { Tex } from '../gfx/TextureFactory';
import { lerpColor } from '../gfx/palette';
import type { LimbDef } from '../state/types';

let LIMB_SEQ = 1;

// One ragdoll segment: a Matter body + synced tinted sprite, joined to its
// parent by a breakable constraint. Severing the constraint turns it into free
// debris — that's the physics dismemberment.
export class LimbPart {
  readonly id = LIMB_SEQ++;
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Matter.Sprite;
  def: LimbDef;
  hp: number;
  severable: boolean;
  severed = false;
  constraint?: MatterJS.ConstraintType;
  private baseTint: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: LimbDef,
    group: number,
    scale: number,
    accent: number
  ) {
    this.scene = scene;
    this.def = def;
    this.hp = def.hp;
    this.severable = def.severable;

    const w = def.w * scale;
    const h = def.h * scale;
    const tex = def.shape === 'circle' ? Tex.DISC : Tex.PX;
    const sprite = scene.matter.add.sprite(x, y, tex);

    if (def.shape === 'circle') {
      sprite.setCircle((Math.max(w, h) / 2) as number, { frictionAir: 0.02 });
      sprite.setDisplaySize(Math.max(w, h), Math.max(w, h));
    } else {
      sprite.setRectangle(w, h, { frictionAir: 0.02 });
      sprite.setDisplaySize(w, h);
    }
    this.baseTint = lerpColor(def.color, accent, 0.18);
    sprite.setTint(this.baseTint);
    sprite.setDepth(30);
    sprite.setCollisionCategory(CAT.ENEMY);
    sprite.setCollidesWith(CAT.GROUND | CAT.PROP | CAT.ENEMY);
    sprite.setCollisionGroup(-group); // same-creature limbs never collide
    (sprite.body as MatterJS.BodyType).label = `limb:${def.name}`;
    (sprite.body as unknown as { limb?: LimbPart }).limb = this;
    this.sprite = sprite;
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  // returns true if this hit destroyed the limb
  takeDamage(dmg: number): boolean {
    if (this.severed) return false;
    this.hp -= dmg;
    // brief white hit-flash, then restore base tint
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.sprite.active && !this.severed) this.sprite.setTint(this.baseTint);
    });
    return this.hp <= 0;
  }

  applyKnock(vx: number, vy: number): void {
    const v = (this.sprite.body as MatterJS.BodyType).velocity;
    this.sprite.setVelocity(v.x + vx, v.y + vy);
    this.sprite.setAngularVelocity((Math.random() - 0.5) * 0.4);
  }

  sever(): void {
    if (this.severed) return;
    this.severed = true;
    if (this.constraint) {
      this.scene.matter.world.removeConstraint(this.constraint, true);
      this.constraint = undefined;
    }
    this.sprite.setCollisionCategory(CAT.DEBRIS);
    this.sprite.setCollidesWith(CAT.GROUND | CAT.PROP);
    this.sprite.setCollisionGroup(0);
    this.sprite.setDepth(20);
    this.sprite.setTint(lerpColor(this.def.color, 0x5e0a0a, 0.35));
  }

  destroy(): void {
    if (this.constraint) {
      this.scene.matter.world.removeConstraint(this.constraint, true);
      this.constraint = undefined;
    }
    this.sprite.destroy();
  }
}
