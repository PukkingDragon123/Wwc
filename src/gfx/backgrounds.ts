// Procedural parallax / scenery textures. Baked once in PreloadScene with real
// palette colours (the town's day/night mood comes from a single overlay rect
// in WorldScene, so these layers need no per-frame tinting).

import Phaser from 'phaser';
import { Palette } from './palette';

function bake(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export const Bg = {
  SKY_FAR: 'skylineFar',
  SKY_MID: 'skylineMid',
  BUNKER_WALL: 'bunkerWall',
} as const;

export function bakeWorldTextures(scene: Phaser.Scene): void {
  // far skyline — short, hazy, dark silhouettes
  bake(scene, Bg.SKY_FAR, 384, 240, (g) => {
    let x = 0;
    while (x < 384) {
      const w = 28 + Math.floor(Math.random() * 46);
      const h = 50 + Math.floor(Math.random() * 110);
      g.fillStyle(Palette.out.buildingDark, 1);
      g.fillRect(x, 240 - h, w, h);
      x += w + 2 + Math.floor(Math.random() * 8);
    }
  });

  // mid skyline — taller buildings with lit/dark window grids
  bake(scene, Bg.SKY_MID, 384, 280, (g) => {
    let x = 0;
    while (x < 384) {
      const w = 46 + Math.floor(Math.random() * 60);
      const h = 110 + Math.floor(Math.random() * 150);
      const top = 280 - h;
      g.fillStyle(Palette.out.building, 1);
      g.fillRect(x, top, w, h);
      // window grid
      for (let wy = top + 10; wy < 280 - 8; wy += 16) {
        for (let wx = x + 7; wx < x + w - 7; wx += 14) {
          const lit = Math.random() < 0.12;
          g.fillStyle(lit ? Palette.out.rust : Palette.out.window, lit ? 0.8 : 1);
          g.fillRect(wx, wy, 7, 9);
        }
      }
      x += w + 4;
    }
  });
}

export function bakeBunkerTextures(scene: Phaser.Scene): void {
  // wood-plank wall pattern, tileable
  bake(scene, Bg.BUNKER_WALL, 128, 128, (g) => {
    g.fillStyle(Palette.home.wall, 1);
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 22) {
      g.fillStyle(Palette.home.wallLight, 0.5);
      g.fillRect(0, y, 128, 2);
      for (let x = 0; x < 128; x += 40) {
        g.fillStyle(Palette.home.floorDark, 0.4);
        g.fillRect(x + (y % 44 === 0 ? 0 : 20), y, 2, 22);
      }
    }
  });
}
