import Phaser from 'phaser';
import { generateAll } from '../gfx/TextureFactory';
import { bakeWorldTextures, bakeBunkerTextures } from '../gfx/backgrounds';
import { Palette, cssColor } from '../gfx/palette';

// The only "loading" step is baking procedural textures (instant). We still
// show a beat of title so the boot reads intentionally, then signal readiness.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    generateAll(this);
    bakeWorldTextures(this);
    bakeBunkerTextures(this);

    this.cameras.main.setBackgroundColor(cssColor(Palette.home.bg));
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'generating wasteland…', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: cssColor(Palette.ui.textDim),
      })
      .setOrigin(0.5);

    (window as unknown as { __GAME_READY__?: boolean }).__GAME_READY__ = true;

    this.time.delayedCall(350, () => this.scene.start('MainMenu'));
  }
}
