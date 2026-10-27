import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Enemy } from '../entities/Enemy';
import { findNearestVisible, type Weapon, type WeaponHost } from './Weapon';

const statsFor = (level: number) => ({
  cooldown: 1.9 - 0.2 * level,
  damage: 14 + 7 * level,
  jumps: 1 + level, // сколько раз перескакивает после первого удара
  jumpRange: 115,
  range: 260,
});

interface Bolt {
  points: Phaser.Math.Vector2[];
  life: number;
}

const BOLT_LIFETIME = 0.2;

/**
 * Цепная молния: бьёт ближайшего видимого врага, потом перескакивает
 * на соседнего (тоже только по прямой видимости), каждый раз чуть слабее.
 *
 * Рисуем через Graphics — объект, на котором можно рисовать линии и фигуры каждый кадр.
 */
export class Lightning implements Weapon {
  private cooldown = 0.6;
  private bolts: Bolt[] = [];
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(private readonly host: WeaponHost) {
    this.gfx = host.add.graphics().setDepth(DEPTH.glow);
  }

  update(dt: number) {
    const { player, fx } = this.host;
    const s = statsFor(player.stats.lightning);

    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      let target = findNearestVisible(this.host, player.x, player.y, s.range);
      if (!target) {
        this.cooldown = 0.15; // никого не видно — проверим чуть позже
      } else {
        this.cooldown = s.cooldown;
        const hit = new Set<Enemy>();
        const path = [new Phaser.Math.Vector2(player.x, player.y)];
        let damage = s.damage;

        for (let i = 0; i <= s.jumps && target; i++) {
          hit.add(target);
          path.push(new Phaser.Math.Vector2(target.x, target.y));
          target.hurt(damage);
          fx.burst(target.x, target.y, 0xbff4ff, 6);
          damage *= 0.85;
          target = findNearestVisible(this.host, target.x, target.y, s.jumpRange, { exclude: hit });
        }
        this.bolts.push({ points: zigzag(path), life: BOLT_LIFETIME });
      }
    }

    this.draw(dt);
  }

  private draw(dt: number) {
    this.gfx.clear();
    for (const bolt of this.bolts) {
      bolt.life -= dt;
      const a = Math.max(0, bolt.life / BOLT_LIFETIME);
      // Сначала широкий полупрозрачный «ореол», поверх тонкая яркая линия.
      this.gfx.lineStyle(6, 0x6fe3ff, 0.35 * a).strokePoints(bolt.points);
      this.gfx.lineStyle(2, 0xebfcff, a).strokePoints(bolt.points);
      // Молния ненадолго освещает всё по пути.
      for (let i = 1; i < bolt.points.length; i += 3) {
        this.host.darkness.addLight(bolt.points[i].x, bolt.points[i].y, 60, 0.7 * a);
      }
    }
    this.bolts = this.bolts.filter(b => b.life > 0);
  }

  destroy() {
    this.gfx.destroy();
  }
}

/** Ломаем прямые отрезки в зигзаг, чтобы было похоже на молнию. */
function zigzag(points: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Phaser.Math.Distance.BetweenPoints(a, b) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const segments = Math.max(2, Math.round(len / 18));
    for (let j = 1; j < segments; j++) {
      const t = j / segments;
      const offset = Phaser.Math.FloatBetween(-7, 7);
      out.push(new Phaser.Math.Vector2(a.x + (b.x - a.x) * t + nx * offset, a.y + (b.y - a.y) * t + ny * offset));
    }
    out.push(b);
  }
  return out;
}
