import Phaser from 'phaser';
import { Creature } from './Creature';
import { getCreature } from './definitions';

export function spawnCreature(
  scene: Phaser.Scene,
  id: string,
  x: number,
  y: number,
  groundY: number
): Creature {
  return new Creature(scene, getCreature(id), x, y, groundY);
}
