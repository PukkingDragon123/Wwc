import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import { Tex } from '../gfx/TextureFactory';
import { Palette, cssColor } from '../gfx/palette';
import { textButton, FONT } from '../ui/widgets';
import { AudioBus } from '../audio/AudioBus';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(cssColor(Palette.home.bg));

    // warm hearth glow — a hint of the cozy home you're fighting to keep
    this.add
      .image(width / 2, height * 0.62, Tex.GLOW)
      .setTint(Palette.home.amber)
      .setAlpha(0.16)
      .setScale(9);

    this.add
      .text(width / 2, height * 0.3, 'LAST LIGHT', {
        fontFamily: FONT,
        fontSize: '64px',
        color: cssColor(Palette.home.candle),
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, 'the last human — one more day', {
        fontFamily: FONT,
        fontSize: '18px',
        color: cssColor(Palette.ui.textDim),
      })
      .setOrigin(0.5);

    textButton(this, width / 2, height * 0.56, 'New Game', () => {
      SaveManager.clear();
      GameState.newGame();
      this.enterGame();
    });

    if (SaveManager.hasSave()) {
      textButton(this, width / 2, height * 0.66, 'Continue', () => {
        if (SaveManager.load()) this.enterGame();
      });
    }

    this.add
      .text(
        width / 2,
        height * 0.88,
        'A/D move   W/Space jump   Mouse + Click swing   E interact',
        { fontFamily: FONT, fontSize: '14px', color: cssColor(Palette.ui.textDim) }
      )
      .setOrigin(0.5);
  }

  private enterGame(): void {
    AudioBus.ensure();
    this.scene.launch('Hud');
    this.scene.start('Bunker');
  }
}
