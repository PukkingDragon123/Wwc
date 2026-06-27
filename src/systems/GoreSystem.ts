import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { Tex } from '../gfx/TextureFactory';
import { Palette } from '../gfx/palette';
import { CAT } from '../util/collision';

// Blood arcs, persistent ground pools/splatter, severed gibs + bone chips, a
// brief screen-blood flash on big hits, and a hard cap on debris bodies so the
// carnage never tanks the framerate.
export class GoreSystem {
  scene: Phaser.Scene;
  private blood: Phaser.GameObjects.Particles.ParticleEmitter;
  private decals: Phaser.GameObjects.RenderTexture;
  private debris: Phaser.Physics.Matter.Sprite[] = [];
  private screenBlood?: Phaser.GameObjects.Image;
  private groundY: number;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;

    this.decals = scene.add.renderTexture(0, 0, worldWidth, worldHeight);
    this.decals.setOrigin(0, 0).setDepth(6);

    this.blood = scene.add.particles(0, 0, Tex.PX, {
      lifespan: 750,
      speed: { min: 40, max: 320 },
      angle: { min: 0, max: 360 },
      gravityY: 900,
      scale: { start: 1.0, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      tint: [Palette.fx.blood, Palette.fx.bloodDark, Palette.fx.bloodBright],
      emitting: false,
    });
    this.blood.setDepth(35);
  }

  bloodBurst(x: number, y: number, count: number): void {
    this.blood.emitParticleAt(x, y, count);
  }

  // permanent splatter on the ground + a small splat where it hit
  splatDecal(x: number, y: number): void {
    const tmp = this.scene.make
      .image({ x: 0, y: 0, key: Tex.SPLAT }, false)
      .setTint(Math.random() < 0.5 ? Palette.fx.blood : Palette.fx.bloodDark)
      .setAlpha(0.6)
      .setScale(0.4 + Math.random() * 0.7)
      .setRotation(Math.random() * Math.PI * 2);
    this.decals.draw(tmp, x, y);
    tmp.destroy();
  }

  // a darker pool that pools on the ground beneath a kill
  bloodPool(x: number): void {
    const tmp = this.scene.make
      .image({ x: 0, y: 0, key: Tex.SPLAT }, false)
      .setTint(Palette.fx.bloodPool)
      .setAlpha(0.7)
      .setScale(0.9 + Math.random() * 0.8, 0.4 + Math.random() * 0.3);
    this.decals.draw(tmp, x, this.groundY - 2);
    tmp.destroy();
  }

  spawnGibs(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const bone = Math.random() < 0.3;
      const s = this.scene.matter.add.sprite(x, y, bone ? Tex.BONE : Tex.PX);
      const size = bone ? 6 : 4 + Math.random() * 6;
      if (bone) s.setRectangle(10, 5, { frictionAir: 0.02 });
      else s.setRectangle(size, size, { frictionAir: 0.02 });
      s.setDisplaySize(bone ? 12 : size, bone ? 5 : size);
      s.setTint(bone ? Palette.fx.bone : Math.random() < 0.5 ? Palette.fx.bloodDark : Palette.fx.gib);
      s.setDepth(22);
      s.setCollisionCategory(CAT.DEBRIS);
      s.setCollidesWith(CAT.GROUND | CAT.PROP);
      s.setVelocity((Math.random() - 0.5) * 10, -3 - Math.random() * 7);
      s.setAngularVelocity((Math.random() - 0.5) * 0.9);
      this.registerDebris(s);
    }
  }

  // red flash at the screen edges on a big/severing hit (screen-space)
  screenFlash(): void {
    if (!this.screenBlood) {
      this.screenBlood = this.scene.add
        .image(this.scene.scale.width / 2, this.scene.scale.height / 2, Tex.INVGLOW)
        .setTint(Palette.fx.bloodBright)
        .setScrollFactor(0)
        .setDepth(78)
        .setAlpha(0)
        .setDisplaySize(this.scene.scale.width, this.scene.scale.height);
    }
    this.screenBlood.setAlpha(0.5);
    this.scene.tweens.add({ targets: this.screenBlood, alpha: 0, duration: 420, ease: 'Cubic.easeOut' });
  }

  registerDebris(sprite: Phaser.Physics.Matter.Sprite): void {
    this.debris.push(sprite);
    while (this.debris.length > Balance.MAX_GORE_BODIES) {
      const old = this.debris.shift();
      if (old && old.active) {
        this.scene.tweens.add({ targets: old, alpha: 0, duration: 250, onComplete: () => old.destroy() });
      }
    }
  }

  destroy(): void {
    this.blood.destroy();
    this.decals.destroy();
    for (const d of this.debris) if (d.active) d.destroy();
    this.debris = [];
    this.screenBlood?.destroy();
  }
}
