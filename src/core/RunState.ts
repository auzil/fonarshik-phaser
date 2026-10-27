import { BASE_STATS, type Stats } from '../data/upgrades';
import { LEVELS } from '../data/levels';
import { RULES } from '../config';

/**
 * «Забег» — всё, что переносится с уровня на уровень.
 * GameScene получает его при старте и отдаёт обновлённым при выходе.
 */
export interface RunState {
  levelIndex: number;
  stats: Stats;
  hp: number;
  heroLevel: number;
  xp: number;
  /** Сколько карточек усилений выдать сразу при старте уровня. */
  pendingUpgrades: number;
}

/** Новый забег с нуля или со стартом с открытого уровня (тогда дадим бонусные усиления). */
export function newRun(levelIndex = 0): RunState {
  return {
    levelIndex,
    stats: { ...BASE_STATS },
    hp: BASE_STATS.maxHp,
    heroLevel: 1,
    xp: 0,
    pendingUpgrades: levelIndex * RULES.bonusUpgradesPerSkippedLevel,
  };
}

/** Копия забега: Stats — плоский объект, поэтому хватает spread. */
export function cloneRun(run: RunState): RunState {
  return { ...run, stats: { ...run.stats } };
}

export const isLastLevel = (index: number) => index >= LEVELS.length - 1;

/* ───────────── Сохранение прогресса ───────────── */

const UNLOCK_KEY = 'fonarshik.unlocked';

/** localStorage может быть недоступен (приватный режим, iframe), поэтому всегда try/catch. */
export function getUnlockedLevel(): number {
  try {
    return Number(localStorage.getItem(UNLOCK_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function unlockLevel(index: number) {
  try {
    if (index > getUnlockedLevel()) localStorage.setItem(UNLOCK_KEY, String(index));
  } catch {
    /* без сохранения тоже можно играть */
  }
}
