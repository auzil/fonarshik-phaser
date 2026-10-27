/**
 * Все «магические числа» игры в одном месте.
 * Хочешь подкрутить баланс — начинай отсюда и из папки data/.
 */

/** Размер одной клетки карты в мировых пикселях. */
export const TILE = 32;

/**
 * Порядок отрисовки (depth). Чем больше число, тем «выше» объект.
 * Phaser рисует объекты сцены по возрастанию depth.
 */
export const DEPTH = {
  floor: 0,
  pools: 1, // горящие лужи лежат на полу
  loot: 2, // кристаллы опыта, осколки, выход
  enemies: 3,
  hpBars: 3.5,
  player: 4,
  bullets: 5,
  fx: 6, // частицы, серпы, флаконы
  darkness: 10, // слой тьмы закрывает всё, что ниже
  glow: 11, // то, что светится сквозь тьму: глаза, молнии
} as const;

/** Палитра. Числа — для Phaser-графики, строки — для текста. */
export const COLOR = {
  void: 0x07090b,
  darkness: 0x030507,
  ember: 0xffb347,
  soul: 0x6fe3ff,
  blood: 0xe5484d,
  bone: 0xebe3d0,
  muted: 0x8b9590,
  panel: 0x151c1f,
} as const;

export const CSS_COLOR = {
  ember: '#ffb347',
  soul: '#6fe3ff',
  blood: '#e5484d',
  bone: '#ebe3d0',
  muted: '#8b9590',
  ink: '#1a0f02',
} as const;

export const FONT = {
  display: '"Ruslan Display", Georgia, serif',
  body: '"Fira Sans Condensed", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

/** Общие правила игры, не относящиеся к конкретному оружию или врагу. */
export const RULES = {
  /** Сколько опыта нужно, чтобы перейти с уровня lv на lv+1. */
  xpToNext: (lv: number) => 4 + lv * 3,
  /** Как часто один враг может кусать героя (сек). */
  contactCooldown: 0.7,
  /** Радиус подбора осколка и входа в выход (px). */
  pickupRadius: 22,
  /** Масло в фонаре: полный бак. Расход в секунду — stats.fuelBurn. Каждый уровень начинается с полным баком. */
  maxFuel: 100,
  /** До какой доли масла фонарь светит в полную силу; ниже свет сжимается. */
  fuelFullLightAt: 0.75,
  /** Какая доля радиуса света остаётся, когда масло кончилось. */
  minLightFactor: 0.4,
  /** При какой доле масла предупреждаем «Масло на исходе». */
  lowFuelWarning: 0.2,
  /** Шанс, что из врага выпадет банка масла (отдельно от зелий). */
  oilDropChance: 0.05,
  /** Какую долю здоровья лечим при переходе на следующий уровень. */
  healBetweenLevels: 0.5,
  /** Сколько бонусных усилений получаешь, если начинаешь сразу с уровня N (N * это число). */
  bonusUpgradesPerSkippedLevel: 2,
} as const;
