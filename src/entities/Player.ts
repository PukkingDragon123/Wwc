import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { CAT } from '../util/collision';
import { Tex } from '../gfx/TextureFactory';
import { Palette } from '../gfx/palette';
import { GameState } from '../state/GameState';
import { speedMultiplier } from '../systems/RadiationSystem';

const SKIN = 0xd8a778;
const JACKET = 0x3f5560;

export interface PlayerControls {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
}

// The player: a single fixed-rotation Matter capsule with cosmetic head/limb
// sprites synced on top. Mutation stage slows movement (the "dying" pressure).
export class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Matter.Sprite;
  head: Phaser.GameObjects.Image;
  legFront: Phaser.GameObjects.Image;
  legBack: Phaser.GameObjects.Image;
  arm: Phaser.GameObjects.Image;
  facing = 1;
  groundContacts = 0;
  combatEnabled = true;
  private walkPhase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    const W = Balance.PLAYER_WIDTH;
    const H = Balance.PLAYER_HEIGHT;

    const sprite = scene.matter.add.sprite(x, y, Tex.PX);
    sprite.setRectangle(W, H, { friction: 0.05, frictionAir: 0.012, restitution: 0 });
    sprite.setFixedRotation();
    sprite.setDisplaySize(W, H);
    sprite.setTint(JACKET);
    sprite.setDepth(40);
    sprite.setCollisionCategory(CAT.PLAYER);
    sprite.setCollidesWith(CAT.GROUND | CAT.PROP);
    (sprite.body as MatterJS.BodyType).label = 'player';
    this.sprite = sprite;

    this.legBack = scene.add.image(x, y, Tex.PX).setDisplaySize(8, 18).setTint(0x2a3a42).setDepth(39);
    this.legFront = scene.add.image(x, y, Tex.PX).setDisplaySize(8, 18).setTint(0x32444e).setDepth(41);
    this.head = scene.add.image(x, y, Tex.DISC).setDisplaySize(20, 20).setTint(SKIN).setDepth(42);
    this.arm = scene.add.image(x, y, Tex.PX).setDisplaySize(20, 7).setTint(JACKET).setDepth(43).setOrigin(0.1, 0.5);
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

  // hand anchor for the weapon
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

    // walk cycle drives cosmetic legs
    if (Math.abs(v.velocity.x) > 0.4 && this.isGrounded()) {
      this.walkPhase += 0.3;
    } else {
      this.walkPhase = 0;
    }
    this.syncCosmetics();
  }

  // keep cosmetic parts glued to the physics body
  syncCosmetics(): void {
    const x = this.sprite.x;
    const y = this.sprite.y;
    const swing = Math.sin(this.walkPhase) * 6;
    this.legFront.setPosition(x + this.facing * 4, y + 24).setRotation(swing * 0.04 * this.facing);
    this.legBack.setPosition(x - this.facing * 4, y + 24).setRotation(-swing * 0.04 * this.facing);
    this.head.setPosition(x + this.facing * 3, y - 28);
    if (!this.combatEnabled) {
      this.arm.setVisible(false);
    } else {
      this.arm.setVisible(true);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.head.destroy();
    this.arm.destroy();
    this.legFront.destroy();
    this.legBack.destroy();
  }
}
