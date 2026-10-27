import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Enemy } from './Enemy';

export interface BulletOptions {
  speed: number;
  range: number;
  damage: number;
  pierce: number;
}

/**
 * Пуля пистолета. Летит по прямой, живёт ограниченное время,
 * может пробить нескольких врагов (pierce).
 */
export class Bullet extends Phaser.Physics.Arcade.Image {
  readonly damage: number;
  private pierceLeft: number;
  private lifeLeft: number;
  /** Кого эта пуля уже задела — чтобы не бить одного врага дважды. */
  private readonly alreadyHit = new Set<Enemy>();

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number, opts: BulletOptions) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = opts.damage;
    this.pierceLeft = opts.pierce;
    this.lifeLeft = opts.range / opts.speed + 0.1;

    this.setDepth(DEPTH.bullets).setRotation(angle);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(3, 3, -1);
    body.setVelocity(Math.cos(angle) * opts.speed, Math.sin(angle) * opts.speed);
  }

  /** Возвращает false, если пуля должна исчезнуть. */
  tick(dt: number): boolean {
    this.lifeLeft -= dt;
    return this.lifeLeft > 0;
  }

  /**
   * Попытка попасть во врага. Возвращает true, если урон нанесён.
   * Сама решает, лететь дальше или исчезнуть.
   */
  tryHit(enemy: Enemy): boolean {
    if (this.alreadyHit.has(enemy) || !this.active) return false;
    this.alreadyHit.add(enemy);
    if (this.pierceLeft-- <= 0) this.destroy();
    return true;
  }
}
