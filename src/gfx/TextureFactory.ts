// Bakes a tiny set of WHITE base textures at runtime. Everything in the game is
// then rendered as a tint + scale of these — so the whole look is code, with
// zero asset files. Call generateAll() once in PreloadScene.

import Phaser from 'phaser';

export const Tex = {
  PX: 'px', // square — limbs, debris, bars, particles
  DISC: 'disc', // circle — heads, eyes, round bodies, dots
  GLOW: 'glow', // soft radial — candle glow, vignette, blood softness
  NOISE: 'noise', // tileable speckle — ground / floor (tinted per scene)
  SPLAT: 'splat', // blobby blood decal
  RING: 'ring', // hollow ring — interaction highlight
} as const;

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

export function generateAll(scene: Phaser.Scene): void {
  // solid white square
  bake(scene, Tex.PX, 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
  });

  // white filled circle (drawn large for crisp downscaling)
  bake(scene, Tex.DISC, 64, 64, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 32, 32);
  });

  // soft radial glow — many low-alpha circles stacking toward an opaque centre
  bake(scene, Tex.GLOW, 128, 128, (g) => {
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const r = 64 * (1 - i / steps);
      g.fillStyle(0xffffff, 0.05);
      g.fillCircle(64, 64, r);
    }
  });

  // tileable speckle noise (tinted per scene for ground/floor)
  bake(scene, Tex.NOISE, 64, 64, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(Math.random() * 64);
      const y = Math.floor(Math.random() * 64);
      const s = 1 + Math.floor(Math.random() * 3);
      const dark = Math.random() < 0.6;
      g.fillStyle(dark ? 0x000000 : 0xffffff, dark ? 0.18 : 0.12);
      g.fillRect(x, y, s, s);
    }
  });

  // blobby splat for blood decals
  bake(scene, Tex.SPLAT, 96, 96, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 48, 20);
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 26;
      const r = 5 + Math.random() * 13;
      g.fillCircle(48 + Math.cos(a) * d, 48 + Math.sin(a) * d, r);
    }
  });

  // hollow ring for interaction prompts
  bake(scene, Tex.RING, 64, 64, (g) => {
    g.lineStyle(5, 0xffffff, 1);
    g.strokeCircle(32, 32, 27);
  });
}
