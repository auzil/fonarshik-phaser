import type { WeaponId } from '../data/upgrades';
import { Blades } from './Blades';
import { FireFlask } from './FireFlask';
import { Lightning } from './Lightning';
import { Nova } from './Nova';
import type { Weapon, WeaponHost } from './Weapon';

export { Pistol } from './Pistol';
export type { Weapon, WeaponHost } from './Weapon';

/**
 * Как создать оружие по его id. Новое оружие = новый файл + одна строчка здесь
 * + описание в data/upgrades.ts (WEAPON_INFO и поле в Stats).
 */
export const WEAPON_FACTORY: Record<WeaponId, (host: WeaponHost) => Weapon> = {
  blades: host => new Blades(host),
  lightning: host => new Lightning(host),
  flask: host => new FireFlask(host),
  nova: host => new Nova(host),
};
