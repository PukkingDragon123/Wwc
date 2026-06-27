import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import { Palette, cssColor } from '../gfx/palette';
import { textButton, FONT } from '../ui/widgets';

const CAUSE_TEXT: Record<string, string> = {
  wounds: 'You bled out in the ruins.',
  mutation: 'The mutation finished what the bombs started.',
  night: 'The dark took you before you reached home.',
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { cause?: string }): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#05060a');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cause = data?.cause ?? 'wounds';
    SaveManager.clear();

    this.add
      .text(width / 2, height * 0.26, 'THE LAST LIGHT GOES OUT', {
        fontFamily: FONT,
        fontSize: '40px',
        color: cssColor(Palette.ui.health),
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.37, CAUSE_TEXT[cause] ?? CAUSE_TEXT.wounds, {
        fontFamily: FONT,
        fontSize: '18px',
        color: cssColor(Palette.ui.textDim),
      })
      .setOrigin(0.5);

    const d = GameState.data;
    const summary = [
      `Days survived: ${d.day}`,
      `Mutants killed: ${d.kills}`,
      `Animals rescued: ${d.animalsRescued}`,
    ].join('\n');

    this.add
      .text(width / 2, height * 0.55, summary, {
        fontFamily: FONT,
        fontSize: '20px',
        color: cssColor(Palette.ui.text),
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    textButton(this, width / 2, height * 0.78, 'Try Again', () => {
      this.scene.start('MainMenu');
    });
  }
}
