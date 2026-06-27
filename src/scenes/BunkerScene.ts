import Phaser from 'phaser';
import { Balance } from '../config/Balance';
import { GameState } from '../state/GameState';
import { EventBus, GameEvents } from '../state/EventBus';
import { SaveManager } from '../state/SaveManager';
import { Tex } from '../gfx/TextureFactory';
import { Bg } from '../gfx/backgrounds';
import { Palette, cssColor } from '../gfx/palette';
import { Player } from '../entities/Player';
import { getItem } from '../data/items';
import { UPGRADES } from '../data/upgrades';
import { availableRecipes, canCraft } from '../systems/CraftingSystem';
import { countItem } from '../systems/InventorySystem';
import { LightingSystem } from '../systems/LightingSystem';
import { AudioBus } from '../audio/AudioBus';
import { FONT } from '../ui/widgets';
import { fadeTo, gameOver } from './flow';

interface Row {
  text: string;
  enabled: boolean;
  onClick: () => void;
}
interface Station {
  x: number;
  range: number;
  label: string;
  act: () => void;
}

const G = Balance.GROUND_Y;

export class BunkerScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prompt!: Phaser.GameObjects.Text;
  private stations: Station[] = [];
  private panel?: Phaser.GameObjects.Container;
  private panelOpen = false;
  private lighting!: LightingSystem;
  private lightPoints: { x: number; y: number }[] = [];
  private unsubs: Array<() => void> = [];

  constructor() {
    super('Bunker');
  }

  create(): void {
    this.panelOpen = false;
    this.stations = [];
    this.cameras.main.setBounds(0, 0, this.scale.width, this.scale.height);

    this.lightPoints = [];
    this.buildRoom();
    this.buildStations();
    this.spawnRescues();

    this.player = new Player(this, 360, G - 70, G);
    this.player.combatEnabled = false;

    // warm, cozy chiaroscuro — gentle darkness with candle-lit pools
    this.lighting = new LightingSystem(this, 70);
    this.lighting.setDarkColor(Palette.home.bgGlow);
    this.lighting.setAmbient(0.2); // warm-dim but clearly brighter/safer than outside
    this.lighting.addLight(() => ({ x: this.player.x, y: this.player.y - 6 }), 240, 0.03);
    for (const p of this.lightPoints) this.lighting.addStatic(p.x, p.y, 185, 0.07);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,SPACE,E,I,ESC') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.prompt = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: cssColor(Palette.home.candle) })
      .setOrigin(0.5)
      .setDepth(76);

    this.unsubs.push(EventBus.on(GameEvents.PLAYER_DIED, (c: string) => gameOver(this, c)));
    this.unsubs.push(EventBus.on(GameEvents.BUNKER_CHANGED, () => this.refreshRoom()));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      AudioBus.stopAmbient();
      if (this.lighting) this.lighting.destroy();
    });
    this.input.on('pointerdown', () => AudioBus.ensure());

    EventBus.emit(GameEvents.SCENE_MOOD, 'home');
    AudioBus.startAmbient('home');
    this.cameras.main.fadeIn(360, 20, 14, 8);
  }

  // ---- room visuals ----
  private buildRoom(): void {
    this.cameras.main.setBackgroundColor(cssColor(Palette.home.bg));
    this.add
      .tileSprite(0, 0, this.scale.width, G - 20, Bg.BUNKER_WALL)
      .setOrigin(0, 0)
      .setDepth(-5);
    this.add
      .tileSprite(0, G - 20, this.scale.width, this.scale.height - G + 40, Tex.NOISE)
      .setOrigin(0, 0)
      .setTint(Palette.home.floor)
      .setDepth(0);
    // overall warm wash
    this.add
      .image(this.scale.width / 2, G - 120, Tex.GLOW)
      .setTint(Palette.home.amber)
      .setAlpha(0.1)
      .setScale(16)
      .setDepth(1);

    // physics floor + walls
    const floor = this.matter.add.rectangle(this.scale.width / 2, G + 40, this.scale.width, 80, {
      isStatic: true,
    });
    (floor as MatterJS.BodyType).label = 'ground';
    const lw = this.matter.add.rectangle(20, G - 200, 40, 600, { isStatic: true });
    (lw as MatterJS.BodyType).label = 'wall';
    const rw = this.matter.add.rectangle(this.scale.width - 20, G - 200, 40, 600, { isStatic: true });
    (rw as MatterJS.BodyType).label = 'wall';
  }

  private buildStations(): void {
    this.makeStation(150, 'door', 'Venture Out', Palette.home.wood, () => this.ventureOut());
    this.makeStation(330, 'bed', 'Sleep', Palette.home.wallLight, () => this.sleep());
    this.makeStation(510, 'bench', 'Craft', Palette.out.buildingLight, () => this.openCraft());
    this.makeStation(690, 'build', 'Build', Palette.home.crate, () => this.openBuild());
    this.makeStation(880, 'garden', 'Garden', Palette.home.plantDark, () => this.openGarden());
    this.makeStation(1060, 'supplies', 'Supplies', Palette.home.wood, () => this.openUse());
  }

  private makeStation(x: number, kind: string, label: string, color: number, act: () => void): void {
    const y = G - 30;
    if (kind === 'door') {
      this.add.image(x, y - 8, Tex.GLOW).setTint(0x6a7a8a).setAlpha(0.3).setScale(2.2).setDepth(2);
      this.add.image(x, y, Tex.PX).setDisplaySize(54, 76).setTint(color).setDepth(3);
      this.add.image(x, y, Tex.PX).setDisplaySize(36, 60).setTint(Palette.home.bg).setDepth(4);
    } else if (kind === 'bed') {
      this.add.image(x, y + 18, Tex.PX).setDisplaySize(90, 26).setTint(color).setDepth(3);
      this.add.image(x - 30, y + 6, Tex.PX).setDisplaySize(24, 18).setTint(Palette.ui.text).setDepth(4);
    } else if (kind === 'garden') {
      for (let i = 0; i < 3; i++) {
        this.add.image(x - 30 + i * 30, y + 22, Tex.PX).setDisplaySize(24, 14).setTint(Palette.home.wood).setDepth(3);
      }
    } else {
      this.add.image(x, y + 8, Tex.PX).setDisplaySize(48, 44).setTint(color).setDepth(3);
    }
    // candle glow accent on most stations (also a warm light source)
    if (kind !== 'door') {
      this.add
        .image(x, y - 26, Tex.GLOW)
        .setTint(Palette.home.candle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.3)
        .setScale(2)
        .setDepth(2);
      this.lightPoints.push({ x, y: y - 20 });
    }
    this.add
      .text(x, y - 58, label, { fontFamily: FONT, fontSize: '12px', color: cssColor(Palette.ui.textDim) })
      .setOrigin(0.5)
      .setDepth(75);
    this.stations.push({ x, range: 60, label: `E: ${label}`, act });
  }

  private rescueSprites: Phaser.GameObjects.Image[] = [];
  private spawnRescues(): void {
    this.rescueSprites.forEach((s) => s.destroy());
    this.rescueSprites = [];
    const rescues = GameState.bunker.rescues;
    rescues.forEach((r, i) => {
      const x = 780 + (i % 7) * 56;
      const color = r.defId === 'mossback' ? 0x7fb05a : 0xc98fd0;
      const s = this.add.image(x, G - 22, Tex.DISC).setDisplaySize(22, 22).setTint(color).setDepth(7);
      this.rescueSprites.push(s);
      this.tweens.add({
        targets: s,
        y: G - 30,
        duration: 700 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private refreshRoom(): void {
    this.spawnRescues();
  }

  // ---- main loop ----
  update(time: number, _delta: number): void {
    (globalThis as Record<string, unknown>).__WWC__ = { scene: 'Bunker', x: this.player.x };
    this.lighting.update(this.cameras.main, time);
    if (this.panelOpen) {
      this.player.update({ left: false, right: false, jumpPressed: false });
      if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.closePanel();
      return;
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.W) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up!);
    this.player.update({
      left: this.cursors.left!.isDown || this.keys.A.isDown,
      right: this.cursors.right!.isDown || this.keys.D.isDown,
      jumpPressed,
    });

    if (Phaser.Input.Keyboard.JustDown(this.keys.I)) {
      this.openUse();
      return;
    }

    // nearest station prompt + E
    let best: Station | null = null;
    for (const s of this.stations) {
      const d = Math.abs(this.player.x - s.x);
      if (d <= s.range && (!best || d < Math.abs(this.player.x - best.x))) best = s;
    }
    if (best) {
      this.prompt.setText(best.label).setPosition(best.x, G - 76).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) best.act();
    } else {
      this.prompt.setVisible(false);
    }
  }

  // ---- actions ----
  private ventureOut(): void {
    SaveManager.save();
    fadeTo(this, 'World', undefined, 0x07080c);
  }

  private sleep(): void {
    GameState.advanceDay();
    if (GameState.player.health <= 0 || GameState.player.mutation >= 100) return; // gameOver handles
    SaveManager.save();
    EventBus.emit(GameEvents.TOAST, { text: `You rest. Day ${GameState.data.day} dawns.`, tone: 'good' });
    this.cameras.main.flash(500, 20, 14, 8);
  }

  private useConsumable(id: string): void {
    const def = getItem(id);
    if (!GameState.removeFromInventory([{ id, qty: 1 }])) return;
    if (def.nourish) GameState.changeHunger(def.nourish);
    if (def.heal) GameState.healPlayer(def.heal);
    if (def.radReduce) GameState.changeMutation(-def.radReduce);
    EventBus.emit(GameEvents.TOAST, { text: `Used ${def.name}`, tone: 'good' });
  }

  private plant(i: number): void {
    const plot = GameState.bunker.plots[i];
    if (!plot || plot.seedId) return;
    if (!GameState.removeFromInventory([{ id: 'veg_seed', qty: 1 }])) return;
    const seed = getItem('veg_seed');
    plot.seedId = 'veg_seed';
    plot.plantedDay = GameState.data.day;
    plot.growDays = seed.growDays ?? 2;
    plot.producesItemId = seed.growsInto ?? 'veg';
    EventBus.emit(GameEvents.TOAST, { text: 'Planted Greens', tone: 'good' });
    EventBus.emit(GameEvents.BUNKER_CHANGED);
  }

  private harvest(i: number): void {
    const plot = GameState.bunker.plots[i];
    if (!plot || !plot.producesItemId) return;
    GameState.addToInventory(plot.producesItemId, 2);
    EventBus.emit(GameEvents.TOAST, { text: '+2 Bunker Greens', tone: 'good' });
    plot.seedId = null;
    plot.plantedDay = null;
    plot.producesItemId = null;
    EventBus.emit(GameEvents.BUNKER_CHANGED);
  }

  // ---- panels ----
  private openCraft(): void {
    this.openList('CRAFTING', () => {
      const lvl = (id: string) => GameState.upgradeLevel(id);
      return availableRecipes(lvl).map((r) => {
        const ok = canCraft(r, GameState.inventory, lvl);
        const inStr = r.inputs.map((i) => `${i.qty} ${getItem(i.id).name}`).join(', ');
        return {
          text: `${r.name}  —  ${inStr}`,
          enabled: ok,
          onClick: () => {
            if (canCraft(r, GameState.inventory, lvl)) {
              GameState.craft(r.inputs, r.output.id, r.output.qty);
              EventBus.emit(GameEvents.TOAST, { text: `Crafted ${getItem(r.output.id).name}`, tone: 'good' });
            }
          },
        };
      });
    });
  }

  private openBuild(): void {
    this.openList('BUILD / UPGRADE', () =>
      UPGRADES.map((u) => {
        const lvl = GameState.upgradeLevel(u.id);
        const maxed = lvl >= u.maxLevel;
        const cost = maxed ? null : u.cost[lvl];
        const costStr = cost ? cost.map((c) => `${c.qty} ${getItem(c.id).name}`).join(', ') : 'MAX';
        const afford = cost ? GameState.hasInInventory(cost) : false;
        return {
          text: `${u.name}  Lv${lvl}/${u.maxLevel}  ${maxed ? '(max)' : '— ' + costStr}`,
          enabled: !maxed && afford,
          onClick: () => {
            if (GameState.buyUpgrade(u.id))
              EventBus.emit(GameEvents.TOAST, { text: `Built ${u.name}`, tone: 'good' });
          },
        };
      })
    );
  }

  private openGarden(): void {
    this.openList('GARDEN', () =>
      GameState.bunker.plots.map((p, i) => {
        if (!p.seedId) {
          const have = countItem(GameState.inventory, 'veg_seed') > 0;
          return {
            text: `Plot ${i + 1}: empty${have ? ' — plant Greens' : ' (need seeds)'}`,
            enabled: have,
            onClick: () => this.plant(i),
          };
        }
        const elapsed = GameState.data.day - (p.plantedDay ?? GameState.data.day);
        const ready = elapsed >= p.growDays;
        return {
          text: ready ? `Plot ${i + 1}: READY — harvest` : `Plot ${i + 1}: growing (${p.growDays - elapsed}d)`,
          enabled: ready,
          onClick: () => this.harvest(i),
        };
      })
    );
  }

  private openUse(): void {
    this.openList('SUPPLIES', () => {
      const rows: Row[] = [];
      for (const i of GameState.inventory) {
        if (getItem(i.id).category === 'weapon') {
          const eq = GameState.data.equippedWeapon === i.id;
          rows.push({
            text: `${eq ? '▶ ' : ''}Equip ${getItem(i.id).name}`,
            enabled: !eq,
            onClick: () => {
              GameState.setWeapon(i.id);
              EventBus.emit(GameEvents.TOAST, { text: `Equipped ${getItem(i.id).name}`, tone: 'good' });
            },
          });
        }
      }
      for (const i of GameState.inventory) {
        const cat = getItem(i.id).category;
        if (cat === 'food' || cat === 'medicine') {
          rows.push({ text: `Use ${getItem(i.id).name}  x${i.qty}`, enabled: true, onClick: () => this.useConsumable(i.id) });
        }
      }
      if (rows.length === 0) rows.push({ text: '(nothing usable)', enabled: false, onClick: () => {} });
      return rows;
    });
  }

  private openList(title: string, getRows: () => Row[]): void {
    this.closePanel();
    this.panelOpen = true;
    const cw = 560;
    const ch = 440;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const cont = this.add.container(cx, cy).setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(Palette.ui.panel, 0.97);
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 10);
    bg.lineStyle(2, Palette.ui.panelBorder, 1);
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 10);
    const titleT = this.add
      .text(0, -ch / 2 + 20, title, { fontFamily: FONT, fontSize: '22px', color: cssColor(Palette.home.candle) })
      .setOrigin(0.5);
    const close = this.add
      .text(cw / 2 - 24, -ch / 2 + 20, '✕', { fontFamily: FONT, fontSize: '20px', color: cssColor(Palette.ui.textDim) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closePanel());
    const hint = this.add
      .text(0, ch / 2 - 18, 'Esc to close', { fontFamily: FONT, fontSize: '12px', color: cssColor(Palette.ui.textDim) })
      .setOrigin(0.5);

    const rowsLayer = this.add.container(0, 0);
    cont.add([bg, titleT, close, hint, rowsLayer]);
    this.panel = cont;

    const refresh = () => {
      rowsLayer.removeAll(true);
      const rows = getRows();
      rows.forEach((r, i) => {
        const y = -ch / 2 + 64 + i * 30;
        const t = this.add
          .text(-cw / 2 + 28, y, r.text, {
            fontFamily: FONT,
            fontSize: '16px',
            color: cssColor(r.enabled ? Palette.ui.text : Palette.ui.textDim),
          })
          .setOrigin(0, 0);
        if (r.enabled) {
          t.setInteractive({ useHandCursor: true });
          t.on('pointerover', () => t.setColor(cssColor(Palette.ui.accent)));
          t.on('pointerout', () => t.setColor(cssColor(Palette.ui.text)));
          t.on('pointerdown', () => {
            r.onClick();
            refresh();
          });
        }
        rowsLayer.add(t);
      });
    };
    refresh();
  }

  private closePanel(): void {
    if (this.panel) {
      this.panel.destroy();
      this.panel = undefined;
    }
    this.panelOpen = false;
  }
}
