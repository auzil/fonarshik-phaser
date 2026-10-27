import type Phaser from 'phaser';
import type { BulletOptions } from '../entities/Bullet';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { LevelMap } from '../world/LevelMap';
import type { Darkness } from '../systems/Darkness';
import type { Effects } from '../systems/Effects';
import { hasLineOfSight } from '../world/lineOfSight';

/**
 * Всё, что оружию нужно знать о мире.
 *
 * Оружие не импортирует GameScene напрямую, а получает этот «пульт».
 * Так оружие легко читать отдельно, а GameScene не превращается в паутину зависимостей.
 *
 * add, tweens, time — те же самые фабрика объектов, твины и часы, что у любой сцены,
 * поэтому код оружия выглядит как обычный код сцены: this.host.add.image(...).
 */
export interface WeaponHost extends Pick<Phaser.Scene, 'add' | 'tweens' | 'time'> {
  map: LevelMap;
  player: Player;
  /** Живые враги на этом кадре. */
  livingEnemies(): Enemy[];
  /** Выпустить пулю пистолета (создать объект и добавить в группу пуль). */
  spawnBullet(x: number, y: number, angle: number, opts: BulletOptions): void;
  fx: Effects;
  darkness: Darkness;
}

/** Любое оружие — это объект, который каждый кадр делает что-то своё. */
export interface Weapon {
  update(dt: number): void;
  destroy?(): void;
}

/**
 * Какая часть радиуса фонаря считается «светло». У края пятно света почти прозрачное,
 * и враг там едва различим — по такому герой не стреляет.
 */
const LIT_FRACTION = 0.85;

/**
 * Видит ли герой врага: враг в свете фонаря и между ними нет стены.
 * Стена — это и есть тень (см. world/shadows.ts), так что проверка совпадает с тем, что на экране.
 * Враги в темноте (видны только светящиеся глаза) не годятся в цели.
 */
export function isLit(host: WeaponHost, enemy: Enemy): boolean {
  const { player, map } = host;
  const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y) - enemy.radius;
  if (dist > player.lightRadius * LIT_FRACTION) return false;
  return hasLineOfSight(map, player.x, player.y, enemy.x, enemy.y);
}

/**
 * Ближайший живой враг в радиусе range, которого видит герой (isLit) и до которого
 * есть линия видимости из точки (fromX, fromY).
 * thickness — толщина луча (для пуль), exclude — кого пропустить (для цепной молнии).
 */
export function findNearestVisible(
  host: WeaponHost,
  fromX: number,
  fromY: number,
  range: number,
  opts: { thickness?: number; exclude?: Set<Enemy> } = {},
): Enemy | null {
  let best: Enemy | null = null;
  let bestDist = range;

  for (const enemy of host.livingEnemies()) {
    if (opts.exclude?.has(enemy)) continue;
    // Меряем до края врага, а не до центра: большого голема видно чуть раньше.
    const dist = Math.hypot(enemy.x - fromX, enemy.y - fromY) - enemy.radius;
    if (dist >= bestDist) continue;
    if (!isLit(host, enemy)) continue; // в темноте не стреляем
    if (!hasLineOfSight(host.map, fromX, fromY, enemy.x, enemy.y, opts.thickness ?? 0)) continue;
    best = enemy;
    bestDist = dist;
  }
  return best;
}

/** Единичный вектор от точки A к точке B (для отбрасывания). */
export function direction(ax: number, ay: number, bx: number, by: number) {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  return { x: (bx - ax) / len, y: (by - ay) / len };
}
