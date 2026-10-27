import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Enemy } from '../entities/Enemy';
import { hasLineOfSight } from '../world/lineOfSight';
import type { Weapon, WeaponHost } from './Weapon';

const statsFor = (level: number) => ({
  cooldown: 3.0 - 0.3 * level,
  poolRadius: 30 + 6 * level,
  poolSeconds: 2 + 0.5 * level,
  damagePerSecond: 16 + 9 * level,
  range: 230,
});

const FLIGHT_MS = 420;

interface FirePool {
  sprite: Phaser.GameObjects.Image;
  radius: number;
  life: number;
  damagePerSecond: number;
}

/**
 * Огненный флакон: бросаем в того врага, вокруг которого больше всего соседей.
 * Полёт сделан твинами: один двигает x/y, второй раздувает масштаб туда-обратно —
 * так кажется, что флакон летит по дуге.
 */
export class FireFlask implements Weapon {
  private cooldown = 1.2;
  private pools: FirePool[] = [];

  constructor(private readonly host: WeaponHost) {}

  update(dt: number) {
    const s = statsFor(this.host.player.stats.flask);

    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      const target = this.pickTarget(s.range, s.poolRadius);
      if (target) {
        this.cooldown = s.cooldown;
        this.throwAt(target.x, target.y, s);
      } else {
        this.cooldown = 0.2;
      }
    }

    this.burnEnemies(dt);
  }

  /** Видимый враг в радиусе броска с максимумом соседей. */
  private pickTarget(range: number, poolRadius: number): Enemy | null {
    const { player, map } = this.host;
    const enemies = this.host.livingEnemies();
    let best: Enemy | null = null;
    let bestCrowd = -1;

    for (const e of enemies) {
      if (Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) > range) continue;
      if (!hasLineOfSight(map, player.x, player.y, e.x, e.y, 3)) continue;
      const crowd = enemies.filter(o => Phaser.Math.Distance.Between(o.x, o.y, e.x, e.y) < poolRadius).length;
      if (crowd > bestCrowd) {
        bestCrowd = crowd;
        best = e;
      }
    }
    return best;
  }

  private throwAt(x: number, y: number, s: ReturnType<typeof statsFor>) {
    const { player, tweens } = this.host;
    const flask = this.host.add.image(player.x, player.y, 'flask').setDepth(DEPTH.fx);

    tweens.add({ targets: flask, x, y, angle: 540, duration: FLIGHT_MS });
    tweens.add({
      targets: flask,
      scale: 1.7,
      duration: FLIGHT_MS / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flask.destroy();
        this.spawnPool(x, y, s);
      },
    });
  }

  private spawnPool(x: number, y: number, s: ReturnType<typeof statsFor>) {
    const { fx } = this.host;
    const sprite = this.host.add
      .image(x, y, 'fire')
      .setDepth(DEPTH.pools)
      .setBlendMode(Phaser.BlendModes.ADD) // «складываем» цвет с полом — выглядит как свечение
      .setScale((s.poolRadius * 2) / 64);

    // Мерцание пламени.
    this.host.tweens.add({ targets: sprite, alpha: 0.75, duration: 90, yoyo: true, repeat: -1 });

    this.pools.push({ sprite, radius: s.poolRadius, life: s.poolSeconds, damagePerSecond: s.damagePerSecond });
    fx.burst(x, y, 0xffb347, 14);
  }

  private burnEnemies(dt: number) {
    for (const pool of this.pools) {
      pool.life -= dt;
      if (pool.life < 0.4) pool.sprite.setScale(pool.sprite.scale * 0.97); // гаснет

      for (const enemy of this.host.livingEnemies()) {
        const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, pool.sprite.x, pool.sprite.y);
        if (d < pool.radius + enemy.radius * 0.5) enemy.burn(pool.damagePerSecond, dt);
      }
      this.host.darkness.addLight(pool.sprite.x, pool.sprite.y, pool.radius * 2.2, 0.85 * Math.min(1, pool.life / 0.4));
    }

    for (const dead of this.pools.filter(p => p.life <= 0)) dead.sprite.destroy();
    this.pools = this.pools.filter(p => p.life > 0);
  }

  destroy() {
    this.pools.forEach(p => p.sprite.destroy());
  }
}
