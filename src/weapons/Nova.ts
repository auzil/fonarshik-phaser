import Phaser from 'phaser';
import { DEPTH } from '../config';
import { hasLineOfSight } from '../world/lineOfSight';
import { direction, type Weapon, type WeaponHost } from './Weapon';

const statsFor = (level: number) => ({
  cooldown: 3.8 - 0.35 * level,
  radius: 78 + 14 * level,
  damage: 16 + 9 * level,
  knockback: 280,
});

const RING_SECONDS = 0.35;

/**
 * Вспышка: когда враги подошли близко, фонарь бьёт кольцом света.
 * Задевает только тех, кого видно (стена защищает).
 */
export class Nova implements Weapon {
  private cooldown = 1.8;
  private ring: { x: number; y: number; radius: number; age: number } | null = null;
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(private readonly host: WeaponHost) {
    this.gfx = host.add.graphics().setDepth(DEPTH.glow);
  }

  update(dt: number) {
    const { player, map, fx } = this.host;
    const s = statsFor(player.stats.nova);

    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      const targets = this.host
        .livingEnemies()
        .filter(e => Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < s.radius + e.radius)
        .filter(e => hasLineOfSight(map, player.x, player.y, e.x, e.y));

      if (targets.length === 0) {
        this.cooldown = 0.2; // некого бить — не тратим вспышку
      } else {
        this.cooldown = s.cooldown;
        for (const enemy of targets) {
          const push = direction(player.x, player.y, enemy.x, enemy.y);
          enemy.hurt(s.damage, push.x * s.knockback, push.y * s.knockback);
        }
        this.ring = { x: player.x, y: player.y, radius: s.radius, age: 0 };
        fx.shake(0.003, 90);
      }
    }

    this.drawRing(dt);
  }

  private drawRing(dt: number) {
    this.gfx.clear();
    if (!this.ring) return;

    this.ring.age += dt;
    const t = this.ring.age / RING_SECONDS; // 0 → 1
    if (t >= 1) {
      this.ring = null;
      return;
    }
    // Phaser.Math.Easing — готовые кривые: кольцо быстро расширяется и плавно тормозит.
    const r = this.ring.radius * Phaser.Math.Easing.Cubic.Out(t);
    this.gfx.lineStyle(4 * (1 - t) + 1, 0xffd68c, 1 - t).strokeCircle(this.ring.x, this.ring.y, r);
    this.host.darkness.addLight(this.ring.x, this.ring.y, this.ring.radius * (0.4 + t), 0.9 * (1 - t));
  }

  destroy() {
    this.gfx.destroy();
  }
}
