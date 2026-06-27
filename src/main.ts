import Phaser from 'phaser';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, Balance } from './config/Balance';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { BunkerScene } from './scenes/BunkerScene';
import { WorldScene } from './scenes/WorldScene';
import { HudScene } from './scenes/HudScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: VIRTUAL_WIDTH,
  height: VIRTUAL_HEIGHT,
  backgroundColor: '#05060a',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: Balance.WORLD_GRAVITY_Y },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    BunkerScene,
    WorldScene,
    HudScene,
    GameOverScene,
  ],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
