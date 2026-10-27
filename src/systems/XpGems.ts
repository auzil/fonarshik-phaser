import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Player } from '../entities/Player';
import type { Darkness } from './Darkness';

/** С какого расстояния кристалл считается подобранным (px). */
const PICKUP_DISTANCE = 14;

interface Gem {
  sprite: Phaser.GameObjects.Image;
  value: number;
  pulled: boolean; // уже летит к герою
  age: number;
}

/**
 * Кристаллы опыта, которые падают из врагов.
 * Если герой подошёл ближе stats.magnet, кристалл начинает лететь к нему и уже не останавливается.
 *
 * Физика здесь не нужна: хватает расстояния и ручного движения.
 */
export class XpGems {
  private gems: Gem[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  drop(x: number, y: number, value: number) {
    const sprite = this.scene.add.image(x, y, 'gem').setDepth(DEPTH.loot).setScale(0.8 + Math.min(value, 4) * 0.15);
    this.gems.push({ sprite, value, pulled: false, age: 0 });
  }

  /** Двигает кристаллы и возвращает, сколько опыта собрано за кадр. */
  update(dt: number, player: Player, darkness: Darkness): number {
    let collected = 0;

    for (const gem of this.gems) {
      gem.age += dt;
      const s = gem.sprite;
      const dist = Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y);

      if (dist < player.stats.magnet) gem.pulled = true;
      if (gem.pulled) {
        const speed = (260 + gem.age * 40) * dt;
        const angle = Math.atan2(player.y - s.y, player.x - s.x);
        s.x += Math.cos(angle) * speed;
        s.y += Math.sin(angle) * speed;
      }

      if (dist < PICKUP_DISTANCE) {
        collected += gem.value;
        s.destroy();
      } else {
        darkness.addLight(s.x, s.y, 14, 0.4);
      }
    }

    this.gems = this.gems.filter(g => g.sprite.active);
    return collected;
  }
}
