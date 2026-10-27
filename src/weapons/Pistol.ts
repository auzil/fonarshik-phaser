import { hasLineOfSight } from '../world/lineOfSight';
import { findNearestVisible, type Weapon, type WeaponHost } from './Weapon';

/** Половина толщины пули + небольшой запас: так пуля не цепляет угол стены. */
const SHOT_THICKNESS = 4;
/** Угол между пулями в веере (радианы). */
const FAN_SPREAD = 0.15;

/**
 * Стартовое оружие. Стреляет само в ближайшего врага, в которого точно попадёт.
 * Все его характеристики лежат в player.stats (damage, bullets, ...), паузу между выстрелами
 * берём из player.fireDelay — она учитывает зелья.
 */
export class Pistol implements Weapon {
  private cooldown = 0;

  constructor(private readonly host: WeaponHost) {}

  update(dt: number) {
    const { player } = this.host;
    const s = player.stats;

    // Цель ищем каждый кадр, чтобы ствол всегда смотрел на актуального врага.
    const target = findNearestVisible(this.host, player.x, player.y, s.range, { thickness: SHOT_THICKNESS });
    player.aimAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) : null;

    this.cooldown -= dt;
    if (!target || this.cooldown > 0 || player.aimAngle === null) return;
    this.cooldown = player.fireDelay; // с учётом зелья ярости

    const aim = player.aimAngle;
    const reach = Math.hypot(target.x - player.x, target.y - player.y);
    let fired = 0;

    for (let i = 0; i < s.bullets; i++) {
      // Пули веером: центральная смотрит в цель, остальные расходятся в стороны.
      const angle = aim + (i - (s.bullets - 1) / 2) * FAN_SPREAD;
      const endX = player.x + Math.cos(angle) * reach;
      const endY = player.y + Math.sin(angle) * reach;
      // Боковые пули, которые сразу врежутся в стену, не выпускаем.
      if (!hasLineOfSight(this.host.map, player.x, player.y, endX, endY, SHOT_THICKNESS)) continue;
      this.shoot(angle);
      fired++;
    }
    if (fired === 0) this.shoot(aim); // линия прямо на цель свободна по определению
  }

  private shoot(angle: number) {
    const { player } = this.host;
    const s = player.stats;
    this.host.spawnBullet(player.x + Math.cos(angle) * 12, player.y + Math.sin(angle) * 12, angle, {
      speed: s.bulletSpeed,
      range: s.range,
      damage: s.damage,
      pierce: s.pierce,
    });
  }
}
