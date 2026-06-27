import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { GameState } from '../state/GameState';
import { EventBus, GameEvents } from '../state/EventBus';
import { SaveManager } from '../state/SaveManager';
import { Tex } from '../gfx/TextureFactory';
import { Bg } from '../gfx/backgrounds';
import { Palette, cssColor, lerpColor } from '../gfx/palette';
import { distToSegment } from '../util/collision';
import { Player } from '../entities/Player';
import { Weapon } from '../entities/Weapon';
import { Creature } from '../entities/creatures/Creature';
import { getCreature } from '../entities/creatures/definitions';
import { TimeSystem } from '../systems/TimeSystem';
import { GoreSystem } from '../systems/GoreSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { CameraDirector } from '../systems/CameraDirector';
import { resolveHit, shouldSever } from '../systems/CombatSystem';
import { planDay } from '../systems/SpawnSystem';
import { rollLoot, CONTAINER_TABLES } from '../systems/LootSystem';
import { Rng } from '../util/rng';
import { getItem } from '../data/items';
import { FONT } from '../ui/widgets';
import { AudioBus } from '../audio/AudioBus';
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
  private lighting!: LightingSystem;
  private camDir!: CameraDirector;

  private creatures: Creature[] = [];
  private containers: Container[] = [];
  private pickups: WeaponPickup[] = [];

  private sky!: Phaser.GameObjects.Rectangle;
  private skyFar!: Phaser.GameObjects.TileSprite;
  private skyMid!: Phaser.GameObjects.TileSprite;
  private fog!: Phaser.GameObjects.TileSprite;
  private fog2!: Phaser.GameObjects.TileSprite;
  private lantern!: Phaser.GameObjects.Image;
  private prompt!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private attackQueued = false;
  private returning = false;

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

    this.gore = new GoreSystem(this, W, this.scale.height + 120, G);

    this.player = new Player(this, Balance.PLAYER_SPAWN_X, G - 70, G);
    this.camDir = new CameraDirector(this, this.player.sprite);
    this.weapon = new Weapon(this, GameState.data.equippedWeapon ?? 'pipe');

    // warm lantern that travels with the player
    this.lantern = this.add
      .image(this.player.x, this.player.y, Tex.GLOW)
      .setTint(Palette.light.lantern)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5)
      .setScale(3.4)
      .setDepth(43);

    this.spawnContents();

    // lighting — player lantern + any fire barrels added in spawnContents
    this.lighting = new LightingSystem(this, 70);
    this.lighting.setDarkColor(Palette.out.skyNight);
    this.lighting.addLight(() => ({ x: this.player.x, y: this.player.y - 6 }), 240, 0.05);
    for (const f of this.fireLights) this.lighting.addStatic(f.x, f.y, 200, 0.16);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,SPACE,E,C') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      AudioBus.ensure();
      if (p.leftButtonDown()) this.attackQueued = true;
    });

    this.prompt = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: cssColor(Palette.ui.accent) })
      .setOrigin(0.5)
      .setDepth(76);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.unsubs.push(EventBus.on(GameEvents.PLAYER_DIED, (cause: string) => this.onPlayerDied(cause)));

    // resume the in-progress day clock (re-entering the world mid-day)
    this.time2 = new TimeSystem();
    this.time2.resume(GameState.data.timeOfDay);
    EventBus.emit(GameEvents.SCENE_MOOD, 'world');
    EventBus.emit(GameEvents.TOAST, { text: `Day ${GameState.data.day} — scavenge and get home`, tone: 'normal' });
    AudioBus.startAmbient('world');

    this.cameras.main.fadeIn(320, 4, 5, 8);
  }

  private unsubs: Array<() => void> = [];
  private fireLights: { x: number; y: number }[] = [];

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

    // drifting fog layers (atmosphere + depth)
    this.fog = this.add
      .tileSprite(0, G - 220, this.scale.width, 260, Tex.FOG)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(Palette.out.fog)
      .setAlpha(0.1)
      .setDepth(50);
    this.fog2 = this.add
      .tileSprite(0, G - 120, this.scale.width, 200, Tex.FOG)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(Palette.out.haze)
      .setAlpha(0.12)
      .setDepth(51);

    const rng = new Rng((GameState.data.rngSeed + GameState.data.day * 17) >>> 0);
    for (let i = 0; i < 44; i++) {
      const x = rng.range(300, W - 200);
      const w = rng.range(14, 46);
      const h = rng.range(10, 30);
      this.add
        .image(x, G - h / 2 + 2, Tex.LIMB)
        .setDisplaySize(w, h)
        .setTint(lerpColor(Palette.out.debris, Palette.out.buildingDark, rng.next()))
        .setDepth(8);
    }
  }

  private buildGround(): void {
    this.add
      .tileSprite(0, G, W, this.scale.height - G + 120, Tex.NOISE)
      .setOrigin(0, 0)
      .setTint(Palette.out.ground)
      .setDepth(5);
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
    const glow = this.add.image(0, 0, Tex.GLOW).setTint(Palette.home.amber).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setScale(2.6);
    const frame = this.add.image(0, 0, Tex.LIMB).setDisplaySize(58, 80).setTint(Palette.home.wood);
    const hatch = this.add.image(0, 4, Tex.LIMB).setDisplaySize(40, 64).setTint(Palette.home.wallLight);
    const sign = this.add.text(0, -58, 'HOME', { fontFamily: FONT, fontSize: '14px', color: cssColor(Palette.home.candle) }).setOrigin(0.5);
    c.add([glow, frame, hatch, sign]);
  }

  private spawnContents(): void {
    const plan = planDay(GameState.data.rngSeed, GameState.data.day, W);
    for (const t of plan.threats) this.creatures.push(new Creature(this, getCreature(t.id), t.x, G - 80, G));
    for (const cu of plan.cuties) this.creatures.push(new Creature(this, getCreature(cu.id), cu.x, G - 60, G));

    for (const ct of plan.containers) {
      const sprite = this.add
        .image(ct.x, G - 18, Tex.LIMB)
        .setDisplaySize(30, 36)
        .setTint(ct.kind === 'crate' ? Palette.home.crate : Palette.out.buildingLight)
        .setDepth(9);
      this.containers.push({ sprite, kind: ct.kind, looted: false });
    }
    for (const wp of plan.weaponPickups) {
      const glow = this.add.image(wp.x, G - 16, Tex.GLOW).setTint(Palette.ui.accent).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(1.4).setDepth(8);
      const sprite = this.add
        .image(wp.x, G - 16, Tex.LIMB)
        .setDisplaySize(getItem(wp.id).weapon!.reach, 8)
        .setTint(getItem(wp.id).color)
        .setRotation(-0.5)
        .setDepth(9);
      this.pickups.push({ sprite, glow, id: wp.id });
    }

    // a couple of flickering fire barrels for light + dread
    this.fireLights = [];
    const fr = new Rng((GameState.data.rngSeed + GameState.data.day * 53) >>> 0);
    for (let i = 0; i < 3; i++) {
      const x = 900 + i * 1300 + fr.range(-200, 200);
      if (x > W - 300) continue;
      this.add.image(x, G - 16, Tex.LIMB).setDisplaySize(26, 34).setTint(0x2a2420).setDepth(8);
      const fire = this.add.image(x, G - 30, Tex.GLOW).setTint(Palette.light.fire).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setScale(1.6).setDepth(9);
      this.tweens.add({ targets: fire, alpha: 0.35, scale: 1.3, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.fireLights.push({ x, y: G - 26 });
    }
  }

  // ---- main loop ----
  update(_t: number, delta: number): void {
    (globalThis as Record<string, unknown>).__WWC__ = { scene: 'World', x: this.player.x, t: this.time2 ? this.time2.timeOfDay : 0 };

    this.skyFar.tilePositionX = this.cameras.main.scrollX * 0.2;
    this.skyMid.tilePositionX = this.cameras.main.scrollX * 0.5;
    this.fog.tilePositionX += 0.12;
    this.fog2.tilePositionX -= 0.18;
    this.lantern.setPosition(this.player.x, this.player.y - 6);

    if (this.returning) return;

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.W) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up!);
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      EventBus.emit(GameEvents.TOAST, { text: `Camera: ${this.camDir.cycleMode()}`, tone: 'normal' });
    }

    this.player.update({
      left: this.cursors.left!.isDown || this.keys.A.isDown,
      right: this.cursors.right!.isDown || this.keys.D.isDown,
      jumpPressed,
    });

    const hand = this.player.handPosition();
    if (this.attackQueued) {
      this.attackQueued = false;
      if (this.player.combatEnabled && this.weapon.startSwing()) {
        AudioBus.swing();
        this.camDir.kick(0.002, 60);
      }
    }
    this.weapon.update(delta, hand, this.player.facing);
    this.processSwing(hand);

    let inCombat = false;
    for (const c of this.creatures) {
      c.update(delta, this.player.x, this.player.y);
      if (c.alive && c.isThreat() && Math.abs(c.x - this.player.x) < 240) inCombat = true;
    }
    this.applyContactDamage();

    this.time2.update(delta);
    GameState.setTimeOfDay(this.time2.timeOfDay);
    GameState.addExposure(delta / 1000);
    this.updateLighting(_t);
    this.camDir.update(this.player.facing, inCombat);

    if (this.time2.isNight()) {
      this.returnHome(true);
      return;
    }
    this.updateInteraction();
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

        const kv = 3 + this.weapon.profile.weight * 3.4 + hit.knockback * 40;
        limb.applyKnock(seg.dirX * kv, seg.dirY * kv - 1.5);
        this.gore.bloodBurst(limb.x, limb.y, Balance.BLOOD_PER_HIT);
        AudioBus.squelch();
        this.camDir.kick(0.003, 50);

        if (destroyed) {
          const sever = shouldSever(preHp, hit.damage, hit.canSever, limb.severable);
          if (sever) {
            limb.sever();
            limb.applyKnock(seg.dirX * kv * 1.4, -3);
            this.gore.spawnGibs(limb.x, limb.y, 5);
            this.gore.bloodBurst(limb.x, limb.y, Balance.BLOOD_PER_SEVER);
            this.gore.splatDecal(limb.x, G - 4);
            this.gore.screenFlash();
            AudioBus.sever();
          }
          if (c.alive && c.registerLimbDestroyed(limb)) this.killCreature(c);
        }
      }
    }
  }

  private killCreature(c: Creature): void {
    c.die();
    GameState.recordKill();
    this.camDir.killPunch();
    AudioBus.screech();
    this.gore.bloodBurst(c.x, c.y, Balance.BLOOD_PER_SEVER);
    this.gore.splatDecal(c.x, G - 4);
    this.gore.bloodPool(c.x);

    if (c.isThreat()) {
      const rng = new Rng((GameState.data.rngSeed + GameState.data.kills * 2654435761) >>> 0);
      for (const it of rollLoot(c.def.loot, rng)) {
        GameState.addToInventory(it.id, it.qty);
        EventBus.emit(GameEvents.TOAST, { text: `+${it.qty} ${getItem(it.id).name}`, tone: 'good' });
      }
    }

    this.time.delayedCall(Balance.CORPSE_LIFETIME_MS, () => {
      const live = c.limbs.map((l) => l.sprite).filter((s) => s && s.active);
      if (live.length === 0) {
        c.destroy();
        this.creatures = this.creatures.filter((x) => x !== c);
        return;
      }
      this.tweens.add({
        targets: live,
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
    for (const c of this.creatures) {
      if (!c.alive || !c.isThreat()) continue;
      if (now - c.lastHitAt < Balance.CONTACT_DAMAGE_COOLDOWN_MS) continue;
      if (Math.abs(this.player.x - c.x) < 36 && Math.abs(this.player.y - c.y) < 60) {
        c.lastHitAt = now;
        GameState.damagePlayer(c.def.contactDamage);
        const dir = Math.sign(this.player.x - c.x) || 1;
        this.player.sprite.setVelocity(dir * 6, -3);
        this.camDir.kick(0.006, 130);
        AudioBus.impact();
        this.gore.screenFlash();
      }
    }
  }

  // ---- interaction ----
  private updateInteraction(): void {
    const px = this.player.x;
    const py = this.player.y;
    let best: { dist: number; text: string; act: () => void } | null = null;
    const consider = (dist: number, range: number, text: string, act: () => void) => {
      if (dist <= range && (!best || dist < best.dist)) best = { dist, text, act };
    };

    consider(Math.abs(px - Balance.EXIT_DOOR_X), 70, 'E: go home', () => this.returnHome(false));
    for (const ct of this.containers) {
      if (!ct.looted) consider(Math.abs(px - ct.sprite.x), 48, `E: search ${ct.kind}`, () => this.loot(ct));
    }
    for (const wp of this.pickups) {
      consider(Math.abs(px - wp.sprite.x), 46, `E: take ${getItem(wp.id).name}`, () => this.takeWeapon(wp));
    }
    for (const c of this.creatures) {
      if (c.alive && !c.isThreat()) {
        consider(Math.hypot(px - c.x, py - c.y), 60, `E: rescue ${c.def.name}`, () => this.rescue(c));
      }
    }

    if (best) {
      const b: { text: string; act: () => void } = best;
      this.prompt.setText(b.text).setPosition(px, py - 72).setVisible(true);
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
  private updateLighting(time: number): void {
    const d = this.time2.darkness();
    this.sky.fillColor = lerpColor(Palette.out.skyDay, Palette.out.skyDusk, Math.min(1, d * 1.3));
    // ambient darkness: subtle by day, near-total at night
    this.lighting.setAmbient(0.32 + d * 0.62);
    this.lighting.update(this.cameras.main, time);
    this.lantern.setAlpha(0.4 + d * 0.4);
  }

  // ---- return home (review-fixed: no soft-lock on night death) ----
  private returnHome(forced: boolean): void {
    if (this.returning) return;
    this.returning = true; // suppresses the auto PLAYER_DIED handler (no double game-over)
    this.prompt.setVisible(false);

    if (forced) {
      EventBus.emit(GameEvents.TOAST, { text: 'The night caught you!', tone: 'warn' });
      GameState.damagePlayer(Balance.NIGHT_CAUGHT_DAMAGE);
      GameState.changeMutation(Balance.NIGHT_CAUGHT_MUTATION);
      if (GameState.player.health <= 0 || GameState.player.mutation >= 100) {
        gameOver(this, GameState.player.health <= 0 ? 'night' : 'mutation');
        return;
      }
    }

    GameState.setTimeOfDay(this.time2.timeOfDay);
    SaveManager.save();
    this.cameras.main.fadeOut(360, 8, 6, 6);
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
    AudioBus.stopAmbient();
    if (this.camDir) this.camDir.destroy();
    if (this.lighting) this.lighting.destroy();
    if (this.gore) this.gore.destroy();
  }
}
