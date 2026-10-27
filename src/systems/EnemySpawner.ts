import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { enemyHpMultiplier, type EnemyKind } from '../data/enemies';
import type { LevelDef } from '../data/levels';
import type { LevelMap } from '../world/LevelMap';
import type { FlowField } from '../world/FlowField';

interface SpawnContext {
  scene: Phaser.Scene;
  map: LevelMap;
  flow: FlowField;
  level: LevelDef;
  levelIndex: number;
  enemies: Phaser.GameObjects.Group;
  /** Где герой и как далеко светит фонарь: в свете враги не появляются. */
  hero: () => { x: number; y: number; light: number };
}

/**
 * Решает, когда и где появляются враги.
 *
 * Правило «где»: на клетке пола, до которой от героя 7–20 шагов по лабиринту
 * (берём расстояние из FlowField) и которая вне круга света.
 * Так враги выходят из темноты со всех сторон и всегда могут дойти до героя.
 */
export class EnemySpawner {
  private timer = 2; // первая волна через 2 секунды
  private elapsed = 0;

  constructor(private readonly ctx: SpawnContext) {}

  update(dt: number) {
    this.elapsed += dt;
    this.timer -= dt;
    if (this.timer > 0) return;

    const { level } = this.ctx;
    // Чем дольше на уровне, тем чаще волны (но не чаще, чем в 2,2 раза).
    this.timer = level.spawnEvery * Math.max(0.45, 1 - this.elapsed / 200);

    const roll = Math.random();
    const packSize = roll < 0.25 ? 3 : roll < 0.6 ? 2 : 1;
    for (let i = 0; i < packSize; i++) this.spawnOne();
  }

  /** Засада: сразу много врагов поближе (когда герой берёт осколок). */
  ambush(count: number) {
    for (let i = 0; i < count; i++) this.spawnOne(5, 14);
  }

  spawnOne(minSteps = 7, maxSteps = 20): Enemy | null {
    const { scene, map, flow, level, enemies } = this.ctx;
    if (enemies.countActive() >= level.maxEnemies) return null;
    const hero = this.ctx.hero();

    // Пробуем до 40 случайных клеток — этого почти всегда хватает.
    for (let attempt = 0; attempt < 40; attempt++) {
      const cell = Phaser.Utils.Array.GetRandom(map.floorCells) as number;
      const steps = flow.distance[cell];
      if (steps < minSteps || steps > maxSteps) continue;

      const p = map.cellCenter(cell % map.width, Math.floor(cell / map.width));
      if (Phaser.Math.Distance.Between(p.x, p.y, hero.x, hero.y) < hero.light + 24) continue;

      const enemy = new Enemy(
        scene,
        p.x + Phaser.Math.Between(-6, 6),
        p.y + Phaser.Math.Between(-6, 6),
        this.pickKind(),
        enemyHpMultiplier(this.ctx.levelIndex, this.elapsed),
      );
      enemies.add(enemy);
      return enemy;
    }
    return null;
  }

  /** Случайный тип врага с учётом весов из описания уровня. */
  private pickKind(): EnemyKind {
    const mix = this.ctx.level.enemyMix;
    const total = mix.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [kind, weight] of mix) {
      roll -= weight;
      if (roll <= 0) return kind;
    }
    return mix[0][0];
  }
}
