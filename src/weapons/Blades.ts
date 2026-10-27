import Phaser from 'phaser';
import { DEPTH } from '../config';
import { direction, type Weapon, type WeaponHost } from './Weapon';

/** Характеристики по уровню оружия (1..5). */
const statsFor = (level: number) => ({
  count: level + 1,
  damage: 8 + 4 * level,
  orbitRadius: 42 + 5 * level,
  spinSpeed: 3.4, // радиан в секунду
  hitCooldown: 0.3, // один враг получает урон не чаще, чем раз в 0.3 с
});

/**
 * Серпы: кружат вокруг героя и режут врагов при касании.
 * Серп, который сейчас «внутри» стены, не наносит урона.
 */
export class Blades implements Weapon {
  private spin = 0;
  private sprites: Phaser.GameObjects.Image[] = [];

  constructor(private readonly host: WeaponHost) {}

  update(dt: number) {
    const { player, map, fx } = this.host;
    const s = statsFor(player.stats.blades);

    // Уровень вырос — серпов стало больше. Пересоздаём спрайты.
    while (this.sprites.length < s.count) {
      this.sprites.push(this.host.add.image(player.x, player.y, 'blade').setDepth(DEPTH.fx));
    }

    this.spin += s.spinSpeed * dt;
    const now = this.host.time.now / 1000;

    this.sprites.forEach((sprite, i) => {
      const angle = this.spin + (i * Math.PI * 2) / s.count;
      const bx = player.x + Math.cos(angle) * s.orbitRadius;
      const by = player.y + Math.sin(angle) * s.orbitRadius;
      sprite.setPosition(bx, by).setRotation(angle + Math.PI / 2);

      if (map.isWallAt(bx, by)) {
        sprite.setAlpha(0.25); // показываем, что серп «в камне»
        return;
      }
      sprite.setAlpha(1);

      for (const enemy of this.host.livingEnemies()) {
        if (enemy.bladeCooldown > now) continue;
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, bx, by) > enemy.radius + 8) continue;

        enemy.bladeCooldown = now + s.hitCooldown;
        const push = direction(player.x, player.y, enemy.x, enemy.y);
        enemy.hurt(s.damage, push.x * 120, push.y * 120);
        fx.burst(bx, by, 0xe6f1f3, 4);
      }
    });
  }

  destroy() {
    this.sprites.forEach(s => s.destroy());
  }
}
