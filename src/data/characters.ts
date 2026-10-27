/**
 * Персонажи, за которых можно играть. Выбор делается в главном меню и запоминается.
 *
 * Пока персонажи отличаются только внешностью: у каждого свой спрайтшит
 * с одинаковой раскладкой (idle / walk / hurt, см. art/sheets.ts).
 * Id персонажа совпадает с ключом его спрайтшита.
 *
 * Новый персонаж: нарисуй лист как public/assets/hero.png, добавь его в SHEETS
 * (с CHARACTER_ANIMS) и строчку сюда.
 */
export type CharacterId = 'hero' | 'heroine';

export interface CharacterDef {
  name: string;
  desc: string;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  hero: { name: 'Фонарщик', desc: 'Капюшон и старый плащ' },
  heroine: { name: 'Фонарщица', desc: 'Рыжая коса и тёмное платье' },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export const isCharacterId = (value: unknown): value is CharacterId => CHARACTER_IDS.includes(value as CharacterId);
