import Phaser from 'phaser';
import { Tex } from '../gfx/TextureFactory';

interface Light {
  get: () => { x: number; y: number };
  radius: number;
  flicker: number; // 0 = steady, >0 = amount of radius wobble
  phase: number;
}

// World-space darkness that follows the camera. Each frame it refills to the
// ambient dark level then ERASES soft circles at every light source, so the
// player's lantern (and fires/candles) carve out the only visible area. This is
// the single biggest atmosphere lever — near-black horror outside, warm pools
// of safety inside.
export class LightingSystem {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture;
  private eraser: Phaser.GameObjects.Image;
  private lights: Light[] = [];
  private ambient = 0.5;
  private darkColor = 0x05070b;
  private w: number;
  private h: number;

  constructor(scene: Phaser.Scene, depth = 70) {
    this.scene = scene;
    this.w = Math.ceil(scene.scale.width / 0.7) + 80;
    this.h = Math.ceil(scene.scale.height / 0.7) + 80;
    this.rt = scene.add.renderTexture(0, 0, this.w, this.h).setOrigin(0.5, 0.5).setDepth(depth);
    this.rt.setScrollFactor(1);
    this.eraser = scene.make.image({ x: 0, y: 0, key: Tex.GLOW }, false).setOrigin(0.5);
  }

  setAmbient(a: number): void {
    this.ambient = Phaser.Math.Clamp(a, 0, 1);
  }
  setDarkColor(c: number): void {
    this.darkColor = c;
  }

  addLight(get: () => { x: number; y: number }, radius: number, flicker = 0): void {
    this.lights.push({ get, radius, flicker, phase: Math.random() * Math.PI * 2 });
  }

  addStatic(x: number, y: number, radius: number, flicker = 0): void {
    this.addLight(() => ({ x, y }), radius, flicker);
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, time: number): void {
    const cx = cam.worldView.centerX;
    const cy = cam.worldView.centerY;
    this.rt.setPosition(cx, cy);
    const left = cx - this.w / 2;
    const top = cy - this.h / 2;

    this.rt.clear();
    this.rt.fill(this.darkColor, this.ambient);

    for (const l of this.lights) {
      const p = l.get();
      const wob = l.flicker > 0 ? 1 + Math.sin(time * 0.008 + l.phase) * l.flicker : 1;
      const r = l.radius * wob;
      this.eraser.setScale((r * 2) / 128);
      this.rt.erase(this.eraser, p.x - left, p.y - top);
    }
  }

  destroy(): void {
    this.rt.destroy();
    this.eraser.destroy();
    this.lights = [];
  }
}
