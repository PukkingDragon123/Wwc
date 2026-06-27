import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { GameState } from '../state/GameState';
import { EventBus, GameEvents } from '../state/EventBus';
import { SaveManager } from '../state/SaveManager';
import { Tex } from '../gfx/TextureFactory';
import { Bg } from '../gfx/backgrounds';
import { Palette, cssColor, lerpColor } from '../gfx/palette';
import { CAT, distToSegment } from '../util/collision';
import { Player } from '../entities/Player';
import { Weapon } from '../entities/Weapon';
import { Creature } from '../entities/creatures/Creature';
import { getCreature } from '../entities/creatures/definitions';
import { TimeSystem } from '../systems/TimeSystem';
import { GoreSystem } from '../systems/GoreSystem';
import { resolveHit, shouldSever } from '../systems/CombatSystem';
import { planDay } from '../systems/SpawnSystem';
import { rollLoot, CONTAINER_TABLES } from '../systems/LootSystem';
import { Rng } from '../util/rng';
import { getItem } from '../data/items';
import { FONT } from '../ui/widgets';
import { gameOver } from './flow';

interface Container {
  sprite: Phaser.GameObjects.Image;
  kind: string;
  looted: boolean;
}
interface WeaponPickup {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  id: string;
}

const W = Balance.WORLD_WIDTH;
const G = Balance.GROUND_Y;

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private weapon!: Weapon;
  private time2!: TimeSystem;
  private gore!: GoreSystem;

  private creatures: Creature[] = [];
  private containers: Container[] = [];
  private pickups: WeaponPickup[] = [];

  private sky!: Phaser.GameObjects.Rectangle;
  private skyFar!: Phaser.GameObjects.TileSprite;
  private skyMid!: Phaser.GameObjects.TileSprite;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private door!: Phaser.GameObjects.Container;
  private prompt!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private attackQueued = false;
  private returning = false;
  private lastContactAt = 0;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('World');
  }

  create(): void {
    this.returning = false;
    this.attackQueued = false;
    this.creatures = [];
    this.containers = [];
    this.pickups = [];

    this.cameras.main.setBounds(0, 0, W, this.scale.height);
    this.matter.world.setBounds(0, 0, W, this.scale.height + 200);

    this.buildBackground();
    this.buildGround();
    this.buildDoor();

    // gore layer
    this.gore = new GoreSystem(this, W, this.scale.height + 120);

    // player + weapon
    this.player = new Player(this, Balance.PLAYER_SPAWN_X, G - 70);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);
    this.weapon = new Weapon(this, GameState.data.equippedWeapon ?? 'pipe');

    // world contents
    this.spawnContents();

    // input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,SPACE,E') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.leftButtonDown()) this.attackQueued = true;
    });

    this.prompt = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: cssColor(Palette.ui.accent) })
      .setOrigin(0.5)
      .setDepth(60);

    // collisions only used for grounded check
    this.matter.world.on('collisionstart', this.onCollisionStart, this);
    this.matter.world.on('collisionend', this.onCollisionEnd, this);

    this.unsubs.push(
      EventBus.on(GameEvents.PLAYER_DIED, (cause: string) => this.onPlayerDied(cause))
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    this.time2 = new TimeSystem();
    this.time2.reset();
    EventBus.emit(GameEvents.SCENE_MOOD, 'world');
    EventBus.emit(GameEvents.TOAST, { text: `Day ${GameState.data.day} — scavenge and get home`, tone: 'normal' });

    this.cameras.main.fadeIn(300, 5, 6, 10);
  }

  // ---- world building ----
  private buildBackground(): void {
    this.sky = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, Palette.out.skyDay)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);
    this.skyFar = this.add
      .tileSprite(0, G - 240, this.scale.width, 240, Bg.SKY_FAR)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-8);
    this.skyMid = this.add
      .tileSprite(0, G - 280, this.scale.width, 280, Bg.SKY_MID)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-6);
    this.nightOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, Palette.out.skyNight)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(80)
      .setAlpha(0);

    // scattered scenery debris
    const rng = new Rng((GameState.data.rngSeed + GameState.data.day * 17) >>> 0);
    for (let i = 0; i < 40; i++) {
      const x = rng.range(300, W - 200);
      const w = rng.range(14, 46);
      const h = rng.range(10, 30);
      this.add
        .rectangle(x, G - h / 2 + 2, w, h, lerpColor(Palette.out.debris, Palette.out.buildingDark, rng.next()))
        .setDepth(8);
    }
  }

  private buildGround(): void {
    this.add
      .tileSprite(0, G, W, this.scale.height - G + 120, Tex.NOISE)
      .setOrigin(0, 0)
      .setTint(Palette.out.ground)
      .setDepth(5);
    // physics floor + side walls
    const floor = this.matter.add.rectangle(W / 2, G + 60, W, 120, { isStatic: true });
    (floor as MatterJS.BodyType).label = 'ground';
    const lw = this.matter.add.rectangle(20, G - 200, 40, 600, { isStatic: true });
    (lw as MatterJS.BodyType).label = 'wall';
    const rw = this.matter.add.rectangle(W - 20, G - 200, 40, 600, { isStatic: true });
    (rw as MatterJS.BodyType).label = 'wall';
  }

  private buildDoor(): void {
    const x = Balance.EXIT_DOOR_X;
    const c = this.add.container(x, G - 40).setDepth(9);
    const frame = this.add.image(0, 0, Tex.PX).setDisplaySize(58, 80).setTint(Palette.home.wood);
    const hatch = this.add.image(0, 4, Tex.PX).setDisplaySize(40, 64).setTint(Palette.home.wallLight);
    const glow = this.add.image(0, 0, Tex.GLOW).setTint(Palette.home.amber).setAlpha(0.5).setScale(2.4);
    const sign = this.add
      .text(0, -58, 'HOME', { fontFamily: FONT, fontSize: '14px', color: cssColor(Palette.home.candle) })
      .setOrigin(0.5);
    c.add([glow, frame, hatch, sign]);
    this.door = c;
  }

  private spawnContents(): void {
    const plan = planDay(GameState.data.rngSeed, GameState.data.day, W);

    for (const t of plan.threats) {
      this.creatures.push(new Creature(this, getCreature(t.id), t.x, G - 80));
    }
    for (const cu of plan.cuties) {
      this.creatures.push(new Creature(this, getCreature(cu.id), cu.x, G - 60));
    }
    for (const ct of plan.containers) {
      const sprite = this.add
        .image(ct.x, G - 18, Tex.PX)
        .setDisplaySize(30, 36)
        .setTint(ct.kind === 'crate' ? Palette.home.crate : Palette.out.buildingLight)
        .setDepth(9);
      this.containers.push({ sprite, kind: ct.kind, looted: false });
    }
    for (const wp of plan.weaponPickups) {
      const glow = this.add.image(wp.x, G - 16, Tex.GLOW).setTint(Palette.ui.accent).setAlpha(0.4).setScale(1.4).setDepth(8);
      const sprite = this.add
        .image(wp.x, G - 16, Tex.PX)
        .setDisplaySize(getItem(wp.id).weapon!.reach, 7)
        .setTint(getItem(wp.id).color)
        .setRotation(-0.5)
        .setDepth(9);
      this.pickups.push({ sprite, glow, id: wp.id });
    }
  }

  // ---- collisions (grounded only) ----
  private onCollisionStart(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    this.adjustGround(event.pairs, +1);
  }
  private onCollisionEnd(event: Phaser.Physics.Matter.Events.CollisionEndEvent): void {
    this.adjustGround(event.pairs, -1);
  }
  private adjustGround(pairs: Phaser.Types.Physics.Matter.MatterCollisionPair[], delta: number): void {
    const pb = this.player.body;
    for (const pair of pairs) {
      const a = pair.bodyA as MatterJS.BodyType;
      const b = pair.bodyB as MatterJS.BodyType;
      const other = a === pb ? b : b === pb ? a : null;
      if (!other) continue;
      if (other.label === 'ground' || other.label === 'wall') {
        this.player.groundContacts = Math.max(0, this.player.groundContacts + delta);
      }
    }
  }

  // ---- main loop ----
  update(_t: number, delta: number): void {
    (globalThis as Record<string, unknown>).__WWC__ = {
      scene: 'World',
      x: this.player.x,
      t: this.time2 ? this.time2.timeOfDay : 0,
    };
    // parallax always
    this.skyFar.tilePositionX = this.cameras.main.scrollX * 0.2;
    this.skyMid.tilePositionX = this.cameras.main.scrollX * 0.5;

    if (this.returning) return;

    const kb = this.input.keyboard!;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.W) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up!);

    this.player.update({
      left: this.cursors.left!.isDown || this.keys.A.isDown,
      right: this.cursors.right!.isDown || this.keys.D.isDown,
      jumpPressed,
    });

    // weapon
    const hand = this.player.handPosition();
    if (this.attackQueued) {
      this.attackQueued = false;
      if (this.weapon.startSwing()) this.cameras.main.shake(40, 0.002);
    }
    this.weapon.update(delta, hand, this.player.facing);
    this.processSwing(hand);

    // creatures
    for (const c of this.creatures) c.update(delta, this.player.x, this.player.y);
    this.applyContactDamage();

    // time + exposure + lighting
    this.time2.update(delta);
    GameState.addExposure(delta / 1000);
    this.updateLighting();
    if (this.time2.isNight()) {
      this.returnHome(true);
      return;
    }

    this.updateInteraction(kb);
  }

  private processSwing(hand: { x: number; y: number }): void {
    const seg = this.weapon.activeSegment(hand, this.player.facing);
    if (!seg) return;
    for (const c of this.creatures) {
      for (const limb of c.hittableLimbs()) {
        if (this.weapon.hitThisSwing.has(limb.id)) continue;
        const r = Math.max(limb.sprite.displayWidth, limb.sprite.displayHeight) / 2;
        if (distToSegment(limb.x, limb.y, seg.ax, seg.ay, seg.bx, seg.by) > r + 6) continue;

        this.weapon.hitThisSwing.add(limb.id);
        const hit = resolveHit(this.weapon.profile, this.weapon.impactSpeed());
        const preHp = limb.hp;
        const destroyed = limb.takeDamage(hit.damage);

        const kv = 3 + this.weapon.profile.weight * 3.4;
        limb.applyKnock(seg.dirX * kv, seg.dirY * kv - 1.5);
        this.gore.bloodBurst(limb.x, limb.y, Balance.BLOOD_PER_HIT);
        this.cameras.main.shake(50, 0.003);

        if (destroyed) {
          const sever = shouldSever(preHp, hit.damage, hit.canSever, limb.severable);
          if (sever) {
            limb.sever();
            limb.applyKnock(seg.dirX * kv * 1.4, -3);
            this.gore.spawnGibs(limb.x, limb.y, 4);
            this.gore.bloodBurst(limb.x, limb.y, Balance.BLOOD_PER_SEVER);
            this.gore.splatDecal(limb.x, G - 4);
            this.gore.registerDebris(limb.sprite);
          }
          if (c.alive && c.registerLimbDestroyed(limb)) this.killCreature(c);
        }
      }
    }
  }

  private killCreature(c: Creature): void {
    c.die();
    GameState.recordKill();
    this.cameras.main.shake(120, 0.006);
    this.gore.bloodBurst(c.x, c.y, Balance.BLOOD_PER_SEVER);
    this.gore.splatDecal(c.x, G - 4);

    if (c.isThreat()) {
      const rng = new Rng((GameState.data.rngSeed + GameState.data.kills * 2654435761) >>> 0);
      const loot = rollLoot(c.def.loot, rng);
      for (const it of loot) {
        GameState.addToInventory(it.id, it.qty);
        EventBus.emit(GameEvents.TOAST, { text: `+${it.qty} ${getItem(it.id).name}`, tone: 'good' });
      }
    }

    // fade the corpse after a while
    this.time.delayedCall(Balance.CORPSE_LIFETIME_MS, () => {
      this.tweens.add({
        targets: c.limbs.map((l) => l.sprite),
        alpha: 0,
        duration: 600,
        onComplete: () => {
          c.destroy();
          this.creatures = this.creatures.filter((x) => x !== c);
        },
      });
    });
  }

  private applyContactDamage(): void {
    const now = this.time.now;
    if (now - this.lastContactAt < Balance.CONTACT_DAMAGE_COOLDOWN_MS) return;
    for (const c of this.creatures) {
      if (!c.alive || !c.isThreat()) continue;
      if (Math.abs(this.player.x - c.x) < 36 && Math.abs(this.player.y - c.y) < 60) {
        this.lastContactAt = now;
        GameState.damagePlayer(c.def.contactDamage);
        const dir = Math.sign(this.player.x - c.x) || 1;
        this.player.sprite.setVelocity(dir * 6, -3);
        this.cameras.main.shake(120, 0.005);
        break;
      }
    }
  }

  // ---- interaction (E) ----
  private updateInteraction(kb: Phaser.Input.Keyboard.KeyboardPlugin): void {
    const px = this.player.x;
    const py = this.player.y;
    let best: { kind: string; dist: number; text: string; act: () => void } | null = null;
    const consider = (dist: number, range: number, text: string, act: () => void, kind: string) => {
      if (dist <= range && (!best || dist < best.dist)) best = { kind, dist, text, act };
    };

    // door
    consider(Math.abs(px - Balance.EXIT_DOOR_X), 70, 'E: go home', () => this.returnHome(false), 'door');

    // containers
    for (const ct of this.containers) {
      if (ct.looted) continue;
      consider(Math.abs(px - ct.sprite.x), 48, `E: search ${ct.kind}`, () => this.loot(ct), 'loot');
    }
    // weapon pickups
    for (const wp of this.pickups) {
      consider(Math.abs(px - wp.sprite.x), 46, `E: take ${getItem(wp.id).name}`, () => this.takeWeapon(wp), 'weapon');
    }
    // cute rescues
    for (const c of this.creatures) {
      if (c.alive && !c.isThreat()) {
        const d = Math.hypot(px - c.x, py - c.y);
        consider(d, 60, `E: rescue ${c.def.name}`, () => this.rescue(c), 'rescue');
      }
    }

    if (best) {
      const b: { text: string; act: () => void } = best;
      this.prompt.setText(b.text).setPosition(px, py - 70).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) b.act();
    } else {
      this.prompt.setVisible(false);
    }
  }

  private loot(ct: Container): void {
    ct.looted = true;
    ct.sprite.setTint(Palette.out.buildingDark).setAlpha(0.6);
    const rng = new Rng((GameState.data.rngSeed + Math.round(ct.sprite.x) * 2246822519) >>> 0);
    const loot = rollLoot(CONTAINER_TABLES[ct.kind] ?? [], rng);
    if (loot.length === 0) {
      EventBus.emit(GameEvents.TOAST, { text: 'Empty…', tone: 'normal' });
      return;
    }
    for (const it of loot) {
      const added = GameState.addToInventory(it.id, it.qty);
      EventBus.emit(GameEvents.TOAST, {
        text: added > 0 ? `+${added} ${getItem(it.id).name}` : 'Inventory full',
        tone: added > 0 ? 'good' : 'warn',
      });
    }
  }

  private takeWeapon(wp: WeaponPickup): void {
    GameState.addToInventory(wp.id, 1);
    GameState.setWeapon(wp.id);
    this.weapon.setItem(wp.id);
    EventBus.emit(GameEvents.TOAST, { text: `Equipped ${getItem(wp.id).name}`, tone: 'good' });
    wp.sprite.destroy();
    wp.glow.destroy();
    this.pickups = this.pickups.filter((p) => p !== wp);
  }

  private rescue(c: Creature): void {
    const ok = GameState.rescue({ defId: c.def.id, name: c.def.name, rescuedDay: GameState.data.day });
    if (ok) {
      EventBus.emit(GameEvents.TOAST, { text: `Rescued ${c.def.name}! It will live at home.`, tone: 'good' });
      this.tweens.add({
        targets: c.limbs.map((l) => l.sprite),
        alpha: 0,
        scale: 0.2,
        duration: 300,
        onComplete: () => {
          c.destroy();
          this.creatures = this.creatures.filter((x) => x !== c);
        },
      });
    } else {
      EventBus.emit(GameEvents.TOAST, { text: 'No room — build a Sanctuary Pen at home', tone: 'warn' });
    }
  }

  // ---- lighting / dusk ----
  private updateLighting(): void {
    const d = this.time2.darkness();
    this.sky.fillColor = lerpColor(Palette.out.skyDay, Palette.out.skyDusk, Math.min(1, d * 1.3));
    this.nightOverlay.setAlpha(d * 0.86);
  }

  // ---- return home ----
  private returnHome(forced: boolean): void {
    if (this.returning) return;
    this.returning = true;
    this.prompt.setVisible(false);

    if (forced) {
      EventBus.emit(GameEvents.TOAST, { text: 'The night caught you!', tone: 'warn' });
      GameState.damagePlayer(Balance.NIGHT_CAUGHT_DAMAGE);
      GameState.changeMutation(Balance.NIGHT_CAUGHT_MUTATION);
      if (GameState.player.health <= 0 || GameState.player.mutation >= 100) return; // gameOver handler takes over
    }

    SaveManager.save();
    this.cameras.main.fadeOut(360, 12, 9, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Bunker'));
  }

  private onPlayerDied(cause: string): void {
    if (this.returning) return;
    this.returning = true;
    gameOver(this, cause);
  }

  private cleanup(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.matter.world.off('collisionstart', this.onCollisionStart, this);
    this.matter.world.off('collisionend', this.onCollisionEnd, this);
    if (this.gore) this.gore.destroy();
  }
}
