import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { RangedAttack } from '../data/enemies';
import { Player } from '../entities/Player';
import type { LevelMap } from '../world/LevelMap';
import type { Darkness } from './Darkness';
import type { Effects } from './Effects';

/** Радиус снаряда для попадания (px). */
const SHOT_RADIUS = 4;

interface Shot {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  /** Сколько секунд ещё летит, потом гаснет. */
  life: number;
  attack: RangedAttack;
}

/**
 * Снаряды врагов (сгустки Морока).
 *
 * Как и XpGems, обходимся без физики: снарядов мало, а проверить
 * «упёрся в стену» и «долетел до героя» проще руками.
 * Снаряд светится и рисуется поверх тьмы (DEPTH.glow) — его должно быть видно издалека.
 */
export class EnemyShots {
  private shots: Shot[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
  ) {}

  fire(x: number, y: number, angle: number, attack: RangedAttack) {
    const sprite = this.scene.add.image(x, y, 'hex-bolt').setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD);
    this.shots.push({
      sprite,
      vx: Math.cos(angle) * attack.shotSpeed,
      vy: Math.sin(angle) * attack.shotSpeed,
      life: (attack.range * 1.6) / attack.shotSpeed, // чуть дальше радиуса атаки
      attack,
    });
  }

  /** Двигает снаряды и возвращает атаки, которые попали в героя за этот кадр. */
  update(dt: number, player: Player, map: LevelMap, darkness: Darkness): RangedAttack[] {
    const hits: RangedAttack[] = [];

    for (const shot of this.shots) {
      const s = shot.sprite;
      s.x += shot.vx * dt;
      s.y += shot.vy * dt;
      s.rotation += dt * 8;
      s.setScale(1 + Math.sin(this.scene.time.now * 0.03) * 0.15); // пульсирует
      shot.life -= dt;

      if (Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) < Player.RADIUS + SHOT_RADIUS) {
        hits.push(shot.attack);
        this.fx.burst(s.x, s.y, 0xc9a2ff, 12);
        s.destroy();
      } else if (map.isWallAt(s.x, s.y)) {
        this.fx.burst(s.x - shot.vx * dt, s.y - shot.vy * dt, 0xc9a2ff, 5);
        s.destroy();
      } else if (shot.life <= 0) {
        s.destroy();
      } else {
        darkness.addLight(s.x, s.y, 24, 0.5);
      }
    }

    this.shots = this.shots.filter(shot => shot.sprite.active);
    return hits;
  }
}
