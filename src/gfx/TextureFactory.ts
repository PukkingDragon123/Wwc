// Bakes a set of WHITE/neutral base textures at runtime. Everything is then
// rendered as a tint + scale of these, so the whole look is code — zero asset
// files. The shaded shapes (LIMB/ORB) carry internal light→dark gradients and
// dark outlines that survive tinting, giving a chunky low-poly-pixel feel.

import Phaser from 'phaser';

export const Tex = {
  PX: 'px',
  DISC: 'disc',
  GLOW: 'glow',
  NOISE: 'noise',
  SPLAT: 'splat',
  LIMB: 'limb', // shaded block — tinted for ragdoll limbs
  ORB: 'orb', // shaded sphere — tinted for heads / round bodies
  SHADOW: 'shadow', // soft ground ellipse (2.5D depth)
  TOOTH: 'tooth',
  CLAW: 'claw',
  FOG: 'fog',
  BONE: 'bone',
  INVGLOW: 'invglow', // opaque edges, clear centre — vignette / low-HP overlay
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
  bake(scene, Tex.PX, 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
  });

  bake(scene, Tex.DISC, 64, 64, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 32, 32);
  });

  bake(scene, Tex.GLOW, 128, 128, (g) => {
    for (let i = 0; i < 44; i++) {
      g.fillStyle(0xffffff, 0.045);
      g.fillCircle(64, 64, 64 * (1 - i / 44));
    }
  });

  bake(scene, Tex.NOISE, 64, 64, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(Math.random() * 64);
      const y = Math.floor(Math.random() * 64);
      const s = 1 + Math.floor(Math.random() * 3);
      const dark = Math.random() < 0.62;
      g.fillStyle(dark ? 0x000000 : 0xffffff, dark ? 0.22 : 0.12);
      g.fillRect(x, y, s, s);
    }
  });

  // irregular blood splat
  bake(scene, Tex.SPLAT, 96, 96, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 48, 18);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 6 + Math.random() * 30;
      const r = 3 + Math.random() * 12;
      g.fillCircle(48 + Math.cos(a) * d, 48 + Math.sin(a) * d, r);
    }
  });

  // shaded block: top-lit gradient + dark outline (tint-friendly)
  bake(scene, Tex.LIMB, 48, 48, (g) => {
    g.fillGradientStyle(0xffffff, 0xffffff, 0x7a7a7a, 0x7a7a7a, 1);
    g.fillRect(0, 0, 48, 48);
    g.lineStyle(5, 0x131313, 1);
    g.strokeRect(2.5, 2.5, 43, 43);
  });

  // shaded sphere: top-left highlight, bottom-right shade + outline
  bake(scene, Tex.ORB, 48, 48, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(24, 24, 22);
    for (let i = 0; i < 16; i++) {
      g.fillStyle(0x000000, 0.05);
      g.fillCircle(26 + i * 0.5, 28 + i * 0.5, 22 - i * 0.9);
    }
    g.lineStyle(4, 0x131313, 1);
    g.strokeCircle(24, 24, 22);
  });

  // soft ground shadow
  bake(scene, Tex.SHADOW, 72, 30, (g) => {
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0xffffff, 0.06);
      g.fillEllipse(36, 15, 68 - i * 5, 26 - i * 2);
    }
  });

  // downward fang strip
  bake(scene, Tex.TOOTH, 30, 12, (g) => {
    g.fillStyle(0xffffff, 1);
    for (let x = 0; x <= 24; x += 6) {
      g.fillTriangle(x, 0, x + 6, 0, x + 3, 11);
    }
  });

  bake(scene, Tex.CLAW, 12, 14, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(0, 0, 12, 2, 4, 14);
  });

  // tileable fog clouds
  bake(scene, Tex.FOG, 256, 256, (g) => {
    for (let i = 0; i < 46; i++) {
      g.fillStyle(0xffffff, 0.04);
      g.fillCircle(Math.random() * 256, Math.random() * 256, 28 + Math.random() * 46);
    }
  });

  bake(scene, Tex.BONE, 16, 6, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.fillCircle(13, 3, 3);
    g.fillRect(3, 2, 10, 2);
  });

  // inverse glow (opaque ring, clear centre) for vignette + low-HP pulse
  if (!scene.textures.exists(Tex.INVGLOW)) {
    const rt = scene.add.renderTexture(0, 0, 256, 256).setVisible(false);
    rt.fill(0xffffff, 1);
    const tmp = scene.make.image({ x: 0, y: 0, key: Tex.GLOW }, false).setScale(2.3);
    rt.erase(tmp, 128, 128);
    tmp.destroy();
    rt.saveTexture(Tex.INVGLOW);
  }
}
