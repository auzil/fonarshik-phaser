/**
 * Типы врагов. Внешний вид генерируется в art/textures.ts по полям body/rim/eyes,
 * если для врага нет спрайтшита в art/sheets.ts (сейчас он есть у крысы).
 */
export type EnemyKind = 'ghoul' | 'rat' | 'golem';

export interface EnemyDef {
  hp: number;
  /** Скорость в пикселях в секунду. */
  speed: number;
  /** Радиус тела (для физики и отрисовки). */
  radius: number;
  /** Урон за один укус. */
  damage: number;
  /** Сколько опыта падает с трупа. */
  xp: number;
  /** Шанс, что выпадет зелье (0..1). */
  potionChance: number;
  body: string;
  rim: string;
  eyes: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  ghoul: { hp: 18, speed: 52, radius: 11, damage: 10, xp: 1, potionChance: 0.04, body: '#5d7754', rim: '#26331f', eyes: 0xff5a3c },
  rat: { hp: 7, speed: 112, radius: 7, damage: 5, xp: 1, potionChance: 0.02, body: '#8a7350', rim: '#3a2e1f', eyes: 0xff5a3c },
  golem: { hp: 85, speed: 36, radius: 16, damage: 22, xp: 4, potionChance: 0.2, body: '#6c5b86', rim: '#2c2440', eyes: 0xc48bff },
};

/**
 * Враги крепнут на поздних уровнях и со временем внутри уровня.
 * Возвращает множитель здоровья.
 */
export function enemyHpMultiplier(levelIndex: number, secondsInLevel: number): number {
  return 1 + levelIndex * 0.45 + secondsInLevel / 240;
}
