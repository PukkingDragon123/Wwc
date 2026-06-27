import Phaser from 'phaser';
import { LimbPart } from '../LimbPart';
import { Tex } from '../../gfx/TextureFactory';
import { Palette } from '../../gfx/palette';
import type { CreatureDef } from '../../state/types';

let GROUP_SEQ = 1;

const EYE_GLOW: Record<string, number> = {
  mauler: Palette.light.eyeRed,
  crawler: Palette.light.eyeGreen,
  brute: Palette.light.eyePurple,
};

// A mutant assembled from limbs joined to a torso by breakable constraints.
// Alive: torso is eased upright and driven toward (threat) / away from (cute)
// the player, with glowing eyes + teeth for menace. Dead: forcing stops and the
// constraints let it ragdoll; the eyes go dark.
export class Creature {
  scene: Phaser.Scene;
  def: CreatureDef;
  limbs: LimbPart[] = [];
  torso: LimbPart;
  head?: LimbPart;
  alive = true;
  facing = -1;
  lastHitAt = 0; // per-creature contact-damage cooldown (swarms hurt)
  private hopTimer = 0;
  private groundY: number;

  private shadow: Phaser.GameObjects.Image;
  private eyes: Phaser.GameObjects.Image[] = [];
  private eyeGlow?: Phaser.GameObjects.Image;
  private teeth?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: CreatureDef, x: number, y: number, groundY: number) {
    this.scene = scene;
    this.def = def;
    this.groundY = groundY;
    const group = GROUP_SEQ++;
    const s = def.scale;

    for (const limbDef of def.limbs) {
      this.limbs.push(
        new LimbPart(scene, x + limbDef.x * s, y + limbDef.y * s, limbDef, group, s, def.accentColor)
      );
    }
    this.torso = this.limbs[0];
    this.head = this.limbs.find((l) => l.def.name === 'head');

    for (let i = 1; i < this.limbs.length; i++) {
      const limb = this.limbs[i];
      const c = scene.matter.add.constraint(
        this.torso.sprite.body as MatterJS.BodyType,
        limb.sprite.body as MatterJS.BodyType,
        0,
        0.9,
        { pointA: { x: limb.def.x * s, y: limb.def.y * s }, pointB: { x: 0, y: 0 }, damping: 0.15 }
      );
      limb.constraint = c;
    }

    this.shadow = scene.add.image(x, groundY, Tex.SHADOW).setTint(0x000000).setAlpha(0.4).setDepth(4);
    this.shadow.setScale((def.limbs[0].w * s) / 60);
    this.buildFace(s);
    this.syncFeatures();
  }

  private buildFace(s: number): void {
    if (!this.head) return;
    if (this.def.kind === 'threat') {
      const glowC = EYE_GLOW[this.def.id] ?? Palette.light.eyeRed;
      this.eyeGlow = this.scene.add
        .image(0, 0, Tex.GLOW)
        .setTint(glowC)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.7)
        .setScale(0.45 * s)
        .setDepth(31);
      const e1 = this.scene.add.image(0, 0, Tex.DISC).setTint(glowC).setDisplaySize(5 * s, 5 * s).setDepth(33);
      const e2 = this.scene.add.image(0, 0, Tex.DISC).setTint(glowC).setDisplaySize(4 * s, 4 * s).setDepth(33);
      this.eyes = [e1, e2];
      this.teeth = this.scene.add
        .image(0, 0, Tex.TOOTH)
        .setTint(Palette.creature.tooth)
        .setDisplaySize(this.head.def.w * 0.8 * s, 7 * s)
        .setDepth(32);
    } else {
      // cute: big dark eyes with a bright shine
      const e1 = this.scene.add.image(0, 0, Tex.DISC).setTint(Palette.creature.cuteEye).setDisplaySize(8 * s, 8 * s).setDepth(33);
      const e2 = this.scene.add.image(0, 0, Tex.DISC).setTint(0xffffff).setDisplaySize(2.5 * s, 2.5 * s).setDepth(34);
      this.eyes = [e1, e2];
    }
  }

  private syncFeatures(): void {
    const hx = this.head ? this.head.x : this.torso.x;
    const hy = this.head ? this.head.y : this.torso.y;
    const f = this.facing;
    const s = this.def.scale;
    const dead = !this.alive;
    const headGone = this.head ? this.head.severed : false;

    if (this.def.kind === 'threat') {
      const show = !headGone;
      this.eyeGlow?.setVisible(show && !dead).setPosition(hx + f * 5 * s, hy - 2 * s);
      if (this.eyes[0]) this.eyes[0].setVisible(show).setPosition(hx + f * 3 * s, hy - 3 * s).setTint(dead ? 0x401010 : (EYE_GLOW[this.def.id] ?? Palette.light.eyeRed));
      if (this.eyes[1]) this.eyes[1].setVisible(show).setPosition(hx + f * 8 * s, hy - 1 * s).setTint(dead ? 0x401010 : (EYE_GLOW[this.def.id] ?? Palette.light.eyeRed));
      this.teeth?.setVisible(show).setPosition(hx + f * 6 * s, hy + this.head!.def.h * 0.4 * s);
    } else {
      if (this.eyes[0]) this.eyes[0].setVisible(!headGone).setPosition(hx + f * 4 * s, hy - 1 * s);
      if (this.eyes[1]) this.eyes[1].setVisible(!headGone).setPosition(hx + f * 5 * s, hy - 2 * s);
    }

    // ground shadow
    const h = Phaser.Math.Clamp((this.groundY - this.torso.y) / 220, 0, 1);
    this.shadow.setPosition(this.torso.x, this.groundY).setAlpha((dead ? 0.25 : 0.4) * (1 - h * 0.7));
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
  hittableLimbs(): LimbPart[] {
    return this.limbs.filter((l) => !l.severed && l.sprite.active);
  }

  update(dt: number, px: number, _py: number): void {
    this.syncFeatures();
    if (!this.alive) return;
    const torso = this.torso;
    // ease upright (lets hits tilt it instead of hard-snapping)
    torso.sprite.setAngularVelocity(-torso.sprite.rotation * 0.3);

    const dx = px - torso.x;
    const dist = Math.abs(dx);

    if (this.isThreat()) {
      if (dist < this.def.detectRange) {
        const dir = Math.sign(dx) || 1;
        this.facing = dir;
        torso.sprite.setVelocityX(dir * this.def.moveSpeed);
        this.hopTimer -= dt;
        if (this.hopTimer <= 0 && dist < 90) {
          torso.sprite.setVelocityY(-5.5);
          this.hopTimer = 1400;
        }
      } else {
        torso.sprite.setVelocityX(0);
      }
    } else if (dist < 130) {
      const dir = -(Math.sign(dx) || 1);
      this.facing = dir;
      torso.sprite.setVelocityX(dir * this.def.moveSpeed);
    } else {
      torso.sprite.setVelocityX(0);
    }
  }

  registerLimbDestroyed(limb: LimbPart): boolean {
    if (limb === this.torso) return true;
    if (limb.def.name === 'head') return true;
    return this.limbs.filter((l) => !l.severed).length <= 1;
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.torso.sprite.setAngularVelocity((Math.random() - 0.5) * 0.6);
    this.eyeGlow?.setVisible(false);
    this.syncFeatures();
  }

  destroy(): void {
    for (const l of this.limbs) l.destroy();
    this.eyes.forEach((e) => e.destroy());
    this.eyeGlow?.destroy();
    this.teeth?.destroy();
    this.shadow.destroy();
    this.limbs = [];
  }
}
