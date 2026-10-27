import Phaser from 'phaser';
import { DEPTH, RULES } from '../config';
import type { LevelMap } from '../world/LevelMap';
import type { Darkness } from './Darkness';

/**
 * Цель уровня: собрать все осколки света, после этого открывается выход.
 * Здесь же хорошо видно, как работают твины (tweens) — анимации свойств без кода в update().
 */
export class Objectives {
  readonly total: number;
  taken = 0;
  private readonly shards: Phaser.GameObjects.Image[];
  private readonly exit: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, private readonly map: LevelMap) {
    this.shards = map.shardSpots.map(p => {
      const shard = scene.add.image(p.x, p.y, 'shard').setDepth(DEPTH.loot);
      // Твин: покачивание вверх-вниз бесконечно (yoyo — туда и обратно, repeat: -1 — всегда).
      scene.tweens.add({ targets: shard, y: p.y - 4, duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: Math.random() * 600 });
      scene.tweens.add({ targets: shard, angle: 360, duration: 5000, repeat: -1 });
      return shard;
    });
    this.total = this.shards.length;

    this.exit = scene.add.image(map.exit.x, map.exit.y, 'exit').setDepth(DEPTH.loot).setTint(0x4a5456);
  }

  get exitOpen() {
    return this.taken >= this.total;
  }

  /**
   * Проверяем, не подобрал ли герой осколок.
   * Возвращает true, если подобрал (GameScene устроит засаду и покажет надпись).
   */
  checkPickup(x: number, y: number): boolean {
    for (const shard of this.shards) {
      if (!shard.active) continue;
      if (Phaser.Math.Distance.Between(x, y, shard.x, shard.y) > RULES.pickupRadius) continue;

      shard.destroy();
      this.taken++;
      if (this.exitOpen) this.openExit();
      return true;
    }
    return false;
  }

  isAtExit(x: number, y: number) {
    return this.exitOpen && Phaser.Math.Distance.Between(x, y, this.map.exit.x, this.map.exit.y) < RULES.pickupRadius;
  }

  addLights(darkness: Darkness) {
    for (const shard of this.shards) if (shard.active) darkness.addLight(shard.x, shard.y, 46, 0.7);
    if (this.exitOpen) darkness.addLight(this.exit.x, this.exit.y, 70, 0.85);
  }

  private openExit() {
    this.exit.setTint(0x6fe3ff);
    this.scene.tweens.add({ targets: this.exit, angle: 360, duration: 4000, repeat: -1 });
    this.scene.tweens.add({ targets: this.exit, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
