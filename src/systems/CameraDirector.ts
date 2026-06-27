import Phaser from 'phaser';

interface Mode {
  name: string;
  zoom: number;
}

// Cinematic camera: smooth follow with facing look-ahead, a combat push-in,
// switchable view modes (C), and a kill punch — brief slow-mo + zoom snap +
// shake that sells every gory finisher.
export class CameraDirector {
  private scene: Phaser.Scene;
  private cam: Phaser.Cameras.Scene2D.Camera;
  private modes: Mode[] = [
    { name: 'Cinematic', zoom: 1.05 },
    { name: 'Close', zoom: 1.35 },
    { name: 'Wide', zoom: 0.82 },
  ];
  private modeIndex = 0;
  private punch = 1; // transient zoom multiplier
  private offX = 0;

  constructor(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.cam.startFollow(target as Phaser.GameObjects.Sprite, true, 0.1, 0.1);
    this.cam.setDeadzone(90, 70);
    this.cam.setZoom(this.modes[0].zoom);
  }

  cycleMode(): string {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    return this.modes[this.modeIndex].name;
  }

  kick(intensity = 0.005, duration = 90): void {
    this.cam.shake(duration, intensity);
  }

  // gory finisher: slow-mo + zoom punch + heavy shake
  killPunch(): void {
    this.punch = 1.14;
    this.cam.shake(180, 0.008);
    this.setTimeScale(0.32);
    this.scene.time.delayedCall(190, () => this.rampTimeScale());
  }

  hitStop(ms = 55): void {
    this.setTimeScale(0.0001);
    this.scene.time.delayedCall(ms, () => this.setTimeScale(1));
  }

  private setTimeScale(s: number): void {
    const eng = (this.scene.matter.world as unknown as { engine?: { timing: { timeScale: number } } }).engine;
    if (eng) eng.timing.timeScale = s;
  }

  private rampTimeScale(): void {
    this.scene.tweens.addCounter({
      from: 0.32,
      to: 1,
      duration: 260,
      onUpdate: (t) => this.setTimeScale(t.getValue() ?? 1),
    });
  }

  update(facing: number, inCombat: boolean): void {
    const base = this.modes[this.modeIndex].zoom;
    const target = base * (inCombat ? 1.07 : 1) * this.punch;
    this.cam.zoom = Phaser.Math.Linear(this.cam.zoom, target, 0.07);
    this.punch += (1 - this.punch) * 0.08;

    this.offX = Phaser.Math.Linear(this.offX, -facing * 64, 0.05);
    this.cam.setFollowOffset(this.offX, -18);
  }

  destroy(): void {
    this.setTimeScale(1);
  }
}
