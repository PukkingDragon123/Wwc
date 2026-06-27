import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { Tex } from '../gfx/TextureFactory';
import { Palette } from '../gfx/palette';
import { CAT } from '../util/collision';

// Blood particles, persistent ground decals, severed gibs, and a hard cap on
// active debris bodies so the carnage never tanks the framerate.
export class GoreSystem {
  scene: Phaser.Scene;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private decals: Phaser.GameObjects.RenderTexture;
  private debris: Phaser.Physics.Matter.Sprite[] = [];

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;

    this.decals = scene.add.renderTexture(0, 0, worldWidth, worldHeight);
    this.decals.setOrigin(0, 0);
    this.decals.setDepth(6); // above ground, below actors

    this.emitter = scene.add.particles(0, 0, Tex.PX, {
      lifespan: 650,
      speed: { min: 30, max: 230 },
      angle: { min: 0, max: 360 },
      gravityY: 800,
      scale: { start: 0.8, end: 0.15 },
      alpha: { start: 1, end: 0.25 },
      tint: [Palette.fx.blood, Palette.fx.bloodDark, Palette.fx.bloodBright],
      emitting: false,
    });
    this.emitter.setDepth(35);
  }

  bloodBurst(x: number, y: number, count: number): void {
    this.emitter.emitParticleAt(x, y, count);
  }

  // permanent splat on the ground decal layer
  splatDecal(x: number, y: number): void {
    const tmp = this.scene.make
      .image({ x: 0, y: 0, key: Tex.SPLAT }, false)
      .setTint(Math.random() < 0.5 ? Palette.fx.blood : Palette.fx.bloodDark)
      .setAlpha(0.55)
      .setScale(0.4 + Math.random() * 0.6)
      .setRotation(Math.random() * Math.PI * 2);
    this.decals.draw(tmp, x, y);
    tmp.destroy();
  }

  // small flesh chunks flung from a sever point
  spawnGibs(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const s = this.scene.matter.add.sprite(x, y, Tex.PX);
      const size = 4 + Math.random() * 5;
      s.setRectangle(size, size, { frictionAir: 0.02 });
      s.setDisplaySize(size, size);
      s.setTint(Math.random() < 0.5 ? Palette.fx.bloodDark : 0x7a3a3a);
      s.setDepth(22);
      s.setCollisionCategory(CAT.DEBRIS);
      s.setCollidesWith(CAT.GROUND | CAT.PROP);
      s.setVelocity((Math.random() - 0.5) * 8, -2 - Math.random() * 6);
      s.setAngularVelocity((Math.random() - 0.5) * 0.8);
      this.registerDebris(s);
    }
  }

  // track a debris body (gib or severed limb) and enforce the cap
  registerDebris(sprite: Phaser.Physics.Matter.Sprite): void {
    this.debris.push(sprite);
    while (this.debris.length > Balance.MAX_GORE_BODIES) {
      const old = this.debris.shift();
      if (old && old.active) {
        this.scene.tweens.add({
          targets: old,
          alpha: 0,
          duration: 250,
          onComplete: () => old.destroy(),
        });
      }
    }
  }

  destroy(): void {
    this.emitter.destroy();
    this.decals.destroy();
    this.debris = [];
  }
}
