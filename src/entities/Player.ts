import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { CAT } from '../util/collision';
import { Tex } from '../gfx/TextureFactory';
import { GameState } from '../state/GameState';
import { speedMultiplier } from '../systems/RadiationSystem';

const SKIN = 0xc89a6a;
const JACKET = 0x445a5a;
const JACKET_DARK = 0x2c3c40;
const HAIR = 0x2a1f18;

export interface PlayerControls {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
}

// The player: a fixed-rotation Matter capsule with shaded cosmetic parts and a
// ground drop-shadow for 2.5D depth. Mutation stage slows movement.
export class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Matter.Sprite;
  private head: Phaser.GameObjects.Image;
  private hair: Phaser.GameObjects.Image;
  private eye: Phaser.GameObjects.Image;
  private legFront: Phaser.GameObjects.Image;
  private legBack: Phaser.GameObjects.Image;
  private arm: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  facing = 1;
  groundContacts = 0;
  combatEnabled = true;
  private groundY: number;
  private walkPhase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
    const W = Balance.PLAYER_WIDTH;
    const H = Balance.PLAYER_HEIGHT;

    this.shadow = scene.add.image(x, groundY, Tex.SHADOW).setTint(0x000000).setAlpha(0.4).setDepth(4);

    const sprite = scene.matter.add.sprite(x, y, Tex.LIMB);
    sprite.setRectangle(W, H, { friction: 0.05, frictionAir: 0.012, restitution: 0 });
    sprite.setFixedRotation();
    sprite.setDisplaySize(W, H);
    sprite.setTint(JACKET);
    sprite.setDepth(40);
    sprite.setCollisionCategory(CAT.PLAYER);
    sprite.setCollidesWith(CAT.GROUND | CAT.PROP);
    (sprite.body as MatterJS.BodyType).label = 'player';
    this.sprite = sprite;

    this.legBack = scene.add.image(x, y, Tex.LIMB).setDisplaySize(9, 20).setTint(JACKET_DARK).setDepth(39);
    this.legFront = scene.add.image(x, y, Tex.LIMB).setDisplaySize(9, 20).setTint(JACKET).setDepth(41);
    this.head = scene.add.image(x, y, Tex.ORB).setDisplaySize(20, 20).setTint(SKIN).setDepth(42);
    this.hair = scene.add.image(x, y, Tex.LIMB).setDisplaySize(20, 9).setTint(HAIR).setDepth(43);
    this.eye = scene.add.image(x, y, Tex.PX).setDisplaySize(3, 4).setTint(0x101010).setDepth(43);
    this.arm = scene.add.image(x, y, Tex.LIMB).setDisplaySize(20, 8).setTint(JACKET).setDepth(44).setOrigin(0.1, 0.5);
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get body(): MatterJS.BodyType {
    return this.sprite.body as MatterJS.BodyType;
  }

  isGrounded(): boolean {
    return this.groundContacts > 0;
  }

  handPosition(): { x: number; y: number } {
    return { x: this.sprite.x + this.facing * 14, y: this.sprite.y - 6 };
  }

  update(c: PlayerControls): void {
    const mult = speedMultiplier(GameState.player.mutation);
    const max = Balance.PLAYER_MAX_RUN_SPEED * mult;
    const v = this.sprite.body as MatterJS.BodyType;

    let vx = 0;
    if (c.left) {
      vx = -max;
      this.facing = -1;
    } else if (c.right) {
      vx = max;
      this.facing = 1;
    }
    this.sprite.setVelocityX(vx);

    if (c.jumpPressed && this.isGrounded()) {
      this.sprite.setVelocityY(Balance.PLAYER_JUMP_VELOCITY);
    }

    if (Math.abs(v.velocity.x) > 0.4 && this.isGrounded()) this.walkPhase += 0.3;
    else this.walkPhase = 0;
    this.syncCosmetics();
  }

  syncCosmetics(): void {
    const x = this.sprite.x;
    const y = this.sprite.y;
    const f = this.facing;
    const swing = Math.sin(this.walkPhase) * 6;
    this.legFront.setPosition(x + f * 4, y + 24).setRotation(swing * 0.04 * f);
    this.legBack.setPosition(x - f * 4, y + 24).setRotation(-swing * 0.04 * f);
    this.head.setPosition(x + f * 3, y - 28);
    this.hair.setPosition(x + f * 3, y - 34);
    this.eye.setPosition(x + f * 9, y - 28);
    this.arm.setVisible(this.combatEnabled).setPosition(x + f * 8, y - 6);

    // shadow shrinks/fades as you rise off the ground
    const h = Phaser.Math.Clamp((this.groundY - y) / 220, 0, 1);
    this.shadow.setPosition(x, this.groundY).setScale(1 - h * 0.6).setAlpha(0.42 * (1 - h * 0.7));
  }

  destroy(): void {
    this.sprite.destroy();
    this.head.destroy();
    this.hair.destroy();
    this.eye.destroy();
    this.arm.destroy();
    this.legFront.destroy();
    this.legBack.destroy();
    this.shadow.destroy();
  }
}
