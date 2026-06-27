import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { EventBus, GameEvents } from '../state/EventBus';
import { Balance } from '../config/Balance';
import { stageLabel } from '../systems/RadiationSystem';
import { getItem } from '../data/items';
import { Palette, cssColor, lerpColor } from '../gfx/palette';
import { StatBar, FONT } from '../ui/widgets';

// Transparent overlay scene. Runs concurrently and survives Bunker<->World
// transitions. Reads GameState, reacts to EventBus — never mutates.
export class HudScene extends Phaser.Scene {
  private health!: StatBar;
  private hunger!: StatBar;
  private mutation!: StatBar;
  private dayText!: Phaser.GameObjects.Text;
  private clockFill!: Phaser.GameObjects.Rectangle;
  private clockLabel!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private bagText!: Phaser.GameObjects.Text;
  private mood: 'home' | 'world' = 'home';
  private unsubs: Array<() => void> = [];

  constructor() {
    super('Hud');
  }

  create(): void {
    const { width } = this.scale;

    this.health = new StatBar(this, 16, 24, 200, 16, Palette.ui.health, Palette.ui.healthBack, 'HP');
    this.hunger = new StatBar(this, 16, 46, 200, 16, Palette.ui.hunger, Palette.ui.hungerBack, 'FOOD');
    this.mutation = new StatBar(this, 16, 68, 200, 16, Palette.ui.mutation, Palette.ui.mutationBack, 'MUT');

    this.dayText = this.add.text(16, 90, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: cssColor(Palette.ui.textDim),
    });

    // day clock (top centre)
    this.add.rectangle(width / 2, 28, 280, 14, Palette.ui.panel).setOrigin(0.5);
    this.clockFill = this.add
      .rectangle(width / 2 - 140, 28, 0, 14, Palette.ui.accent)
      .setOrigin(0, 0.5);
    this.clockLabel = this.add
      .text(width / 2, 46, '', { fontFamily: FONT, fontSize: '13px', color: cssColor(Palette.ui.textDim) })
      .setOrigin(0.5);

    // bottom-left: equipped weapon + key supplies
    this.weaponText = this.add.text(16, this.scale.height - 48, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: cssColor(Palette.ui.text),
    });
    this.bagText = this.add.text(16, this.scale.height - 26, '', {
      fontFamily: FONT,
      fontSize: '13px',
      color: cssColor(Palette.ui.textDim),
    });

    this.bind();
    this.refreshStats();
    this.refreshBag();
    this.setClock(0);
  }

  private bind(): void {
    const add = (ev: string, fn: (...a: any[]) => void) => this.unsubs.push(EventBus.on(ev, fn));
    add(GameEvents.HEALTH_CHANGED, () => this.refreshStats());
    add(GameEvents.HUNGER_CHANGED, () => this.refreshStats());
    add(GameEvents.MUTATION_CHANGED, () => this.refreshStats());
    add(GameEvents.DAY_ADVANCED, () => this.refreshStats());
    add(GameEvents.INVENTORY_CHANGED, () => this.refreshBag());
    add(GameEvents.WEAPON_CHANGED, () => this.refreshBag());
    add(GameEvents.TIME_CHANGED, (t: number) => this.setClock(t));
    add(GameEvents.SCENE_MOOD, (m: 'home' | 'world') => {
      this.mood = m;
      if (m === 'home') this.setHomeClock();
    });
    add(GameEvents.NIGHT_WARNING, () => this.toast('NIGHT IS FALLING — GET HOME', 'warn'));
    add(GameEvents.TOAST, (p: { text: string; tone?: string }) => this.toast(p.text, p.tone));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });
  }

  private refreshStats(): void {
    const p = GameState.player;
    this.health.set(p.health, p.maxHealth);
    this.hunger.set(p.hunger, p.maxHunger);
    this.mutation.set(p.mutation, 100);
    this.dayText.setText(`Day ${GameState.data.day}    ${stageLabel(p.mutation)}`);
  }

  private refreshBag(): void {
    const inv = GameState.inventory;
    const equipped = GameState.data.equippedWeapon;
    const wname = equipped ? getItem(equipped).name : 'Fists';
    this.weaponText.setText(`Weapon: ${wname}`);
    const count = (id: string) => inv.filter((i) => i.id === id).reduce((s, i) => s + i.qty, 0);
    this.bagText.setText(
      `food ${count('canned_food') + count('mutant_meat') + count('veg')}   bandage ${count('bandage')}   serum ${count('antirad')}   scrap ${count('scrap')}`
    );
  }

  private setClock(t: number): void {
    if (this.mood === 'home') return;
    this.clockFill.width = 280 * Phaser.Math.Clamp(t, 0, 1);
    const danger = t >= Balance.NIGHT_WARNING_AT;
    this.clockFill.fillColor = danger
      ? Palette.ui.health
      : lerpColor(Palette.ui.accent, Palette.out.skyDusk, Math.max(0, (t - Balance.DUSK_START) * 3));
    let lbl = 'Morning';
    if (t >= 1) lbl = 'NIGHT';
    else if (t >= Balance.NIGHT_WARNING_AT) lbl = '⚠ NIGHT FALLING — RUN HOME';
    else if (t >= Balance.DUSK_START) lbl = 'Dusk approaches';
    else if (t >= 0.3) lbl = 'Afternoon';
    this.clockLabel.setText(lbl).setColor(cssColor(danger ? Palette.ui.textWarn : Palette.ui.textDim));
  }

  private setHomeClock(): void {
    this.clockFill.width = 0;
    this.clockLabel.setText('Home — safe').setColor(cssColor(Palette.home.amber));
  }

  private toast(text: string, tone?: string): void {
    const color = tone === 'warn' ? Palette.ui.textWarn : tone === 'good' ? Palette.home.plant : Palette.ui.text;
    const t = this.add
      .text(this.scale.width / 2, this.scale.height * 0.3, text, {
        fontFamily: FONT,
        fontSize: '20px',
        color: cssColor(color),
        backgroundColor: 'rgba(10,9,7,0.6)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: t,
      y: this.scale.height * 0.24,
      alpha: { from: 1, to: 0 },
      duration: 1800,
      ease: 'Cubic.easeIn',
      onComplete: () => t.destroy(),
    });
  }
}
