/**
 * Зелья. Падают из врагов (шанс — potionChance в data/enemies.ts), герой подбирает их, наступив.
 *
 * Зелье может лечить сразу (heal), доливать масло в фонарь (fuel) и/или действовать какое-то время (duration):
 * пока оно действует, характеристики героя умножаются на множители ниже.
 * Сами stats при этом не меняются — поэтому эффект не переносится на следующий уровень.
 *
 * Новое зелье: добавь вид в PotionKind, запись в POTIONS и кадр в public/assets/potions.png.
 */
export type PotionKind = 'heal' | 'frenzy' | 'speed' | 'oil';

export interface PotionDef {
  name: string;
  glyph: string;
  /** Номер кадра в potions.png. */
  frame: number;
  /** Цвет вспышки и искр. */
  color: number;
  /** Насколько часто выпадает по сравнению с другими зельями. */
  weight: number;
  /** Сразу вылечить на столько здоровья. */
  heal?: number;
  /** Сколько секунд действует (нет — зелье мгновенное). */
  duration?: number;
  /** Во сколько раз чаще стреляет пистолет. */
  fireRate?: number;
  /** Во сколько раз быстрее ходит герой. */
  speed?: number;
  /** Долить столько масла в фонарь. */
  fuel?: number;
}

export const POTIONS: Record<PotionKind, PotionDef> = {
  heal: { name: 'Лечебное зелье', glyph: '♥', frame: 0, color: 0xe5484d, weight: 50, heal: 35 },
  frenzy: { name: 'Ярость', glyph: '»', frame: 1, color: 0xff8a2a, weight: 25, duration: 8, fireRate: 2 },
  /**
   * Масло для фонаря. Вес 0 — среди случайных зелий не выпадает:
   * у масла свой шанс (RULES.oilDropChance) и свои места на картах (символ O).
   */
  oil: { name: 'Масло', glyph: '◍', frame: 3, color: 0xffcf7a, weight: 0, fuel: 30 },
  speed: { name: 'Быстрые ноги', glyph: '≫', frame: 2, color: 0x4fd06a, weight: 25, duration: 8, speed: 1.5 },
};

export const POTION_KINDS = Object.keys(POTIONS) as PotionKind[];

/** Случайное зелье с учётом весов. */
export function rollPotion(): PotionKind {
  const total = POTION_KINDS.reduce((sum, k) => sum + POTIONS[k].weight, 0);
  let roll = Math.random() * total;
  for (const kind of POTION_KINDS) {
    roll -= POTIONS[kind].weight;
    if (roll < 0) return kind;
  }
  return POTION_KINDS[POTION_KINDS.length - 1];
}
