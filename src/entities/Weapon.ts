import Phaser from 'phaser';
import { Tex } from '../gfx/TextureFactory';
import type { WeaponProfile } from '../state/types';
import { getItem } from '../data/items';

export interface SwingSegment {
  ax: number; // hand
  ay: number;
  bx: number; // tip
  by: number;
  dirX: number; // swing travel direction (for knockback)
  dirY: number;
}

// Cosmetic, non-physics weapon. It animates a swing arc; WorldScene reads the
// active segment each frame to detect hits and applies impulses to ragdolls.
export class Weapon {
  scene: Phaser.Scene;
  sprite: Phaser.GameObjects.Image;
  profile: WeaponProfile;
  itemId: string;

  private swinging = false;
  private elapsed = 0;
  private durationMs: number;
  private cooldownMs = 0;
  private prevTipX = 0;
  private prevTipY = 0;
  /** limbs already hit during the current swing (set of limb ids) */
  hitThisSwing = new Set<number>();

  // arc angles (radians, atan2 convention, +y down). ready -> follow-through.
  private readonly startA = -2.0;
  private readonly endA = 0.5;

  constructor(scene: Phaser.Scene, itemId: string) {
    this.scene = scene;
    this.itemId = itemId;
    this.profile = getItem(itemId).weapon ?? { damage: 4, reach: 36, weight: 1, swingSpeed: 0.6 };
    this.durationMs = Math.round(300 * (0.55 / this.profile.swingSpeed));
    this.sprite = scene.add
      .image(0, 0, Tex.PX)
      .setOrigin(0.05, 0.5)
      .setDisplaySize(this.profile.reach, 8)
      .setTint(getItem(itemId).color)
      .setDepth(44);
  }

  setItem(itemId: string): void {
    this.itemId = itemId;
    this.profile = getItem(itemId).weapon ?? this.profile;
    this.durationMs = Math.round(300 * (0.55 / this.profile.swingSpeed));
    this.sprite.setDisplaySize(this.profile.reach, 8).setTint(getItem(itemId).color);
  }

  canSwing(): boolean {
    return !this.swinging && this.cooldownMs <= 0;
  }

  startSwing(): boolean {
    if (!this.canSwing()) return false;
    this.swinging = true;
    this.elapsed = 0;
    this.hitThisSwing.clear();
    return true;
  }

  // rough impact speed fed to the damage formula
  impactSpeed(): number {
    return this.profile.swingSpeed * 18;
  }

  private angleAt(t: number): number {
    // ease-in for a snappy strike
    const e = t * t;
    return this.startA + (this.endA - this.startA) * e;
  }

  update(dt: number, hand: { x: number; y: number }, facing: number): void {
    if (this.cooldownMs > 0) this.cooldownMs -= dt;

    let theta: number;
    if (this.swinging) {
      this.elapsed += dt;
      const t = Phaser.Math.Clamp(this.elapsed / this.durationMs, 0, 1);
      theta = this.angleAt(t);
      if (t >= 1) {
        this.swinging = false;
        this.cooldownMs = 90;
      }
    } else {
      theta = this.startA + 1.1; // relaxed ready pose
    }

    const dirX = Math.cos(theta) * facing;
    const dirY = Math.sin(theta);
    this.prevTipX = this.sprite.x + this.sprite.scaleX; // unused fallback
    this.sprite.setPosition(hand.x, hand.y);
    this.sprite.setRotation(Math.atan2(dirY, dirX));
    this.sprite.setFlipX(false);
  }

  // Returns the live blade segment if the swing is in its damaging window.
  activeSegment(hand: { x: number; y: number }, facing: number): SwingSegment | null {
    if (!this.swinging) return null;
    const t = Phaser.Math.Clamp(this.elapsed / this.durationMs, 0, 1);
    if (t < 0.12 || t > 0.85) return null;
    const theta = this.angleAt(t);
    const dirX = Math.cos(theta) * facing;
    const dirY = Math.sin(theta);
    return {
      ax: hand.x,
      ay: hand.y,
      bx: hand.x + dirX * this.profile.reach,
      by: hand.y + dirY * this.profile.reach,
      dirX,
      dirY,
    };
  }

  isSwinging(): boolean {
    return this.swinging;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
