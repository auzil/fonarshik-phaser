/**
 * Типы врагов. Внешний вид генерируется в art/textures.ts по полям body/rim/eyes,
 * если для врага нет спрайтшита в art/sheets.ts (сейчас он есть у крысы).
 */
export type EnemyKind = 'ghoul' | 'rat' | 'golem' | 'wraith';

/** Атака издалека: враг останавливается, замахивается и пускает снаряд. */
export interface RangedAttack {
  /** Стреляет, только если герой ближе и его видно (px). */
  range: number;
  /** Пауза между выстрелами (сек). */
  cooldown: number;
  /** Замах перед выстрелом (сек) — предупреждение, чтобы успеть отойти. */
  windup: number;
  /** Скорость снаряда (px/с). */
  shotSpeed: number;
  damage: number;
  /** На сколько секунд попадание путает управление (0 — не путает). */
  confuse: number;
}

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
  /** Сколько таких врагов может быть на уровне одновременно (нет — сколько угодно). */
  maxAlive?: number;
  /** Есть — враг стреляет (см. systems/EnemyShots.ts). */
  ranged?: RangedAttack;
  body: string;
  rim: string;
  eyes: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  ghoul: { hp: 18, speed: 52, radius: 11, damage: 10, xp: 1, potionChance: 0.04, body: '#5d7754', rim: '#26331f', eyes: 0xff5a3c },
  rat: { hp: 7, speed: 112, radius: 7, damage: 5, xp: 1, potionChance: 0.02, body: '#8a7350', rim: '#3a2e1f', eyes: 0xff5a3c },
  /**
   * Морок — редкий колдун. Держится на расстоянии и стреляет сгустками,
   * которые летят быстрее любого врага. Попадание путает управление.
   */
  wraith: {
    hp: 45, speed: 46, radius: 10, damage: 8, xp: 6, potionChance: 0.35, body: '#3d2d5c', rim: '#0d0814', eyes: 0x9dff6a,
    maxAlive: 1,
    ranged: { range: 230, cooldown: 2.6, windup: 0.45, shotSpeed: 165, damage: 6, confuse: 2.5 },
  },
  golem: { hp: 85, speed: 36, radius: 16, damage: 22, xp: 4, potionChance: 0.2, body: '#6c5b86', rim: '#2c2440', eyes: 0xc48bff },
};

/**
 * Враги крепнут на поздних уровнях и со временем внутри уровня.
 * Возвращает множитель здоровья.
 */
export function enemyHpMultiplier(levelIndex: number, secondsInLevel: number): number {
  return 1 + levelIndex * 0.45 + secondsInLevel / 240;
}
