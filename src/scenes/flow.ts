import Phaser from 'phaser';

// Shared scene transitions. The fade is where the brutal/cozy contrast is felt
// — the threshold moment at the bunker door.
export function fadeTo(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  color = 0x05060a,
  duration = 320
): void {
  const cam = scene.cameras.main;
  cam.fadeOut(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  cam.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function gameOver(scene: Phaser.Scene, cause: string): void {
  scene.scene.stop('Hud');
  for (const k of ['World', 'Bunker']) {
    if (k !== scene.scene.key) scene.scene.stop(k);
  }
  const cam = scene.cameras.main;
  cam.fadeOut(700, 0, 0, 0);
  cam.once('camerafadeoutcomplete', () => scene.scene.start('GameOver', { cause }));
}
