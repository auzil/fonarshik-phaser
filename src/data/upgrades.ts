/**
 * Характеристики героя и всё, что их улучшает.
 *
 * Важная идея: Stats — это простой объект с числами (без методов).
 * Поэтому его легко копировать ({ ...stats }), сохранять между уровнями
 * и в будущем класть в localStorage.
 */
export interface Stats {
  // герой
  speed: number;
  maxHp: number;
  regen: number; // здоровья в секунду
  light: number; // радиус фонаря, px
  magnet: number; // с какого расстояния тянутся кристаллы, px
  fuelBurn: number; // расход масла в фонаре, единиц в секунду (бак — RULES.maxFuel)
  // пистолет (есть всегда)
  fireDelay: number; // пауза между выстрелами, сек
  damage: number;
  bullets: number; // пуль в веере
  pierce: number; // сквозь скольких врагов проходит пуля
  range: number;
  bulletSpeed: number;
  // уровни дополнительного оружия (0 — оружия нет)
  blades: number;
  lightning: number;
  flask: number;
  nova: number;
}

export const BASE_STATS: Stats = {
  speed: 132,
  maxHp: 100,
  regen: 0,
  light: 170,
  magnet: 64,
  fuelBurn: 1.4, // полного бака хватает примерно на 70 секунд
  fireDelay: 0.45,
  damage: 10,
  bullets: 1,
  pierce: 0,
  range: 250,
  bulletSpeed: 430,
  blades: 0,
  lightning: 0,
  flask: 0,
  nova: 0,
};

/* ───────────── Дополнительное оружие ───────────── */

export type WeaponId = 'blades' | 'lightning' | 'flask' | 'nova';
export const WEAPON_MAX_LEVEL = 5;

export const WEAPON_INFO: Record<WeaponId, { glyph: string; name: string; firstDesc: string; nextDesc: string }> = {
  blades: { glyph: '◌', name: 'Серпы', firstDesc: 'Два серпа кружат вокруг и режут всех, кто подошёл вплотную', nextDesc: '+1 серп, урон и радиус больше' },
  lightning: { glyph: 'ϟ', name: 'Молния', firstDesc: 'Бьёт ближайшего врага и перескакивает на соседей', nextDesc: '+1 прыжок, больше урона, бьёт чаще' },
  flask: { glyph: '♨', name: 'Огненный флакон', firstDesc: 'Бросает масло в толпу, на полу остаётся горящая лужа', nextDesc: 'Лужа шире, горит дольше и жарче' },
  nova: { glyph: '✺', name: 'Вспышка', firstDesc: 'Фонарь вспыхивает и отбрасывает всех рядом', nextDesc: 'Радиус и урон больше, вспышка чаще' },
};

export const WEAPON_IDS = Object.keys(WEAPON_INFO) as WeaponId[];

/* ───────────── Простые усиления ───────────── */

interface Upgrade {
  kind: 'pistol' | 'hero';
  glyph: string;
  name: string;
  desc: string;
  /** Можно ли ещё брать это усиление (например, есть потолок). */
  available?: (s: Stats) => boolean;
  apply: (s: Stats) => void;
  /** Сразу вылечить на столько здоровья. */
  heal?: number;
}

const UPGRADES: Upgrade[] = [
  { kind: 'pistol', glyph: '»', name: 'Скорострельность', desc: 'Стреляет на 18% чаще', available: s => s.fireDelay > 0.12, apply: s => { s.fireDelay *= 0.82; } },
  { kind: 'pistol', glyph: '+6', name: 'Тяжёлые заряды', desc: '+6 урона каждой пуле', apply: s => { s.damage += 6; } },
  { kind: 'pistol', glyph: '⋔', name: 'Второй ствол', desc: '+1 пуля веером', available: s => s.bullets < 5, apply: s => { s.bullets++; } },
  { kind: 'pistol', glyph: '→', name: 'Пробитие', desc: 'Пуля проходит сквозь ещё одного врага', available: s => s.pierce < 4, apply: s => { s.pierce++; } },
  { kind: 'pistol', glyph: '⟶', name: 'Длинный ствол', desc: 'Дальность и скорость пуль +20%', available: s => s.range < 450, apply: s => { s.range *= 1.2; s.bulletSpeed *= 1.2; } },
  { kind: 'hero', glyph: '≫', name: 'Лёгкие сапоги', desc: 'Скорость ходьбы +12%', available: s => s.speed < 220, apply: s => { s.speed *= 1.12; } },
  { kind: 'hero', glyph: '☼', name: 'Ярче фонарь', desc: 'Свет дальше, кристаллы тянутся издалека', available: s => s.light < 300, apply: s => { s.light += 32; s.magnet += 24; } },
  { kind: 'hero', glyph: '◍', name: 'Экономный фитиль', desc: 'Масло в фонаре расходуется на 20% медленнее', available: s => s.fuelBurn > 0.6, apply: s => { s.fuelBurn *= 0.8; } },
  { kind: 'hero', glyph: '♥', name: 'Живучесть', desc: '+25 к здоровью и сразу лечит на 25', apply: s => { s.maxHp += 25; }, heal: 25 },
  { kind: 'hero', glyph: '❧', name: 'Травы', desc: '+1,5 здоровья в секунду', available: s => s.regen < 6, apply: s => { s.regen += 1.5; } },
];

/* ───────────── Карточки выбора при повышении уровня ───────────── */

/** То, что показываем игроку на карточке. */
export interface Choice {
  kind: 'weapon' | 'pistol' | 'hero';
  glyph: string;
  tag: string; // маленькая подпись над названием
  name: string;
  desc: string;
  apply: (s: Stats) => void;
  heal?: number;
}

/** Собирает 3 случайные карточки из всего, что сейчас доступно. */
export function rollChoices(stats: Stats, count = 3): Choice[] {
  const pool: Choice[] = [];

  for (const id of WEAPON_IDS) {
    const level = stats[id];
    if (level >= WEAPON_MAX_LEVEL) continue;
    const info = WEAPON_INFO[id];
    pool.push({
      kind: 'weapon',
      glyph: info.glyph,
      tag: level === 0 ? 'новое оружие' : `оружие · ур. ${level + 1}`,
      name: info.name,
      desc: level === 0 ? info.firstDesc : info.nextDesc,
      apply: s => { s[id]++; },
    });
  }

  for (const u of UPGRADES) {
    if (u.available && !u.available(stats)) continue;
    pool.push({ kind: u.kind, glyph: u.glyph, tag: u.kind === 'pistol' ? 'пистолет' : 'герой', name: u.name, desc: u.desc, apply: u.apply, heal: u.heal });
  }

  const picks = shuffle(pool).slice(0, count);

  // Пока у героя нет второго оружия, одна карточка всегда с оружием —
  // иначе можно долго бегать с одним пистолетом.
  const hasExtraWeapon = WEAPON_IDS.some(id => stats[id] > 0);
  if (!hasExtraWeapon && !picks.some(c => c.kind === 'weapon')) {
    const weapon = pool.find(c => c.kind === 'weapon');
    if (weapon) picks[picks.length - 1] = weapon;
  }
  return picks;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
