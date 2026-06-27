import Phaser from 'phaser';
import { Palette, cssColor } from '../gfx/palette';

export const FONT = 'monospace';

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 16,
  color: number = Palette.ui.text
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color: cssColor(color) })
    .setOrigin(0.5);
}

export function textButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  size = 20
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color: cssColor(Palette.ui.text),
      backgroundColor: cssColor(Palette.ui.panel),
      padding: { x: 16, y: 10 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setColor(cssColor(Palette.ui.accent)));
  btn.on('pointerout', () => btn.setColor(cssColor(Palette.ui.text)));
  btn.on('pointerdown', () => {
    btn.setColor(cssColor(Palette.ui.text));
    onClick();
  });
  return btn;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.92
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(Palette.ui.panel, alpha);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(2, Palette.ui.panelBorder, 1);
  g.strokeRoundedRect(x, y, w, h, 8);
  return g;
}

// A coloured stat bar that shrinks from the left.
export class StatBar {
  scene: Phaser.Scene;
  private back: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private w: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    backColor: number,
    caption: string
  ) {
    this.scene = scene;
    this.w = w;
    this.back = scene.add.rectangle(x, y, w, h, backColor).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(x, y, w, h, color).setOrigin(0, 0.5);
    this.text = scene.add
      .text(x + 6, y, caption, {
        fontFamily: FONT,
        fontSize: '12px',
        color: cssColor(Palette.ui.text),
      })
      .setOrigin(0, 0.5);
  }

  set(cur: number, max: number): void {
    const frac = max <= 0 ? 0 : Phaser.Math.Clamp(cur / max, 0, 1);
    this.fill.width = this.w * frac;
  }

  setCaption(s: string): void {
    this.text.setText(s);
  }

  setColor(c: number): void {
    this.fill.fillColor = c;
  }

  setScrollFactor(n: number): this {
    this.back.setScrollFactor(n);
    this.fill.setScrollFactor(n);
    this.text.setScrollFactor(n);
    return this;
  }

  setDepth(d: number): this {
    this.back.setDepth(d);
    this.fill.setDepth(d);
    this.text.setDepth(d + 1);
    return this;
  }
}
