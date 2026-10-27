import Phaser from 'phaser';

/**
 * Картинки и спрайтшиты из папки public/assets/, анимации.
 *
 * Лист — сетка квадратных кадров, одна строка = одна анимация.
 * Все персонажи нарисованы лицом ВПРАВО, влево их разворачивает flipX.
 * Номер кадра в Phaser = строка * columns + столбец.
 *
 * Ключ листа совпадает с ключом текстуры. Если лист для ключа есть, art/textures.ts
 * его уже не рисует (makeTexture пропускает существующие ключи). Поэтому, чтобы
 * заменить, например, гуля картинкой, достаточно добавить сюда 'enemy-ghoul'.
 */
export interface AnimDef {
  row: number;
  frames: number;
  frameRate: number;
  /** -1 — по кругу, 0 — один раз. */
  repeat: number;
}

export interface SheetDef {
  file: string;
  /** Размер кадра (кадры квадратные). */
  frame: number;
  columns: number;
  anims: Record<string, AnimDef>;
  /** Для врагов: где на кадре светящийся глаз, относительно центра (герой смотрит вправо). */
  eye?: { x: number; y: number };
}

export const SHEETS: Record<string, SheetDef> = {
  /** 32×32. idle — дыхание, walk — шаг, hurt — вспышка и отдача. */
  hero: {
    file: 'hero.png',
    frame: 32,
    columns: 6,
    anims: {
      idle: { row: 0, frames: 4, frameRate: 4, repeat: -1 },
      walk: { row: 1, frames: 6, frameRate: 12, repeat: -1 },
      hurt: { row: 2, frames: 2, frameRate: 12, repeat: 0 },
    },
  },
  /** 24×24. run — галоп, bite — укус. Голова во всех кадрах на одном месте, иначе глаз «уплывёт». */
  'enemy-rat': {
    file: 'rat.png',
    frame: 24,
    columns: 4,
    anims: {
      run: { row: 0, frames: 4, frameRate: 14, repeat: -1 },
      bite: { row: 1, frames: 3, frameRate: 14, repeat: 0 },
    },
    eye: { x: 5.5, y: 0.5 },
  },
  /** 16×16, кадры по порядку: лечение, ярость, скорость (см. frame в data/potions.ts). Анимаций нет. */
  potions: {
    file: 'potions.png',
    frame: 16,
    columns: 3,
    anims: {},
  },
};

/**
 * Обычные картинки без анимаций: ключ текстуры → файл в public/assets/.
 *
 * tiles — тайлсет карты: 7 тайлов 32×32 в одну строку, порядок — TILE_INDEX в world/LevelMap.ts:
 * 0–3 варианты пола, 4 верх стены, 5 стена с лицевой гранью снизу, 6 глухая порода.
 * Пол рисуй так, чтобы тайлы стыковались друг с другом без шва.
 */
export const IMAGES: Record<string, string> = {
  tiles: 'tiles.png',
};

/** Имя анимации: animKey('hero', 'walk') → 'hero-walk'. */
export const animKey = (sheet: string, anim: string) => `${sheet}-${anim}`;

export const HERO_ANIM = {
  idle: animKey('hero', 'idle'),
  walk: animKey('hero', 'walk'),
  hurt: animKey('hero', 'hurt'),
} as const;

/** Вызывать в preload(). */
export function loadAssets(scene: Phaser.Scene) {
  for (const [key, file] of Object.entries(IMAGES)) scene.load.image(key, `assets/${file}`);
  for (const [key, sheet] of Object.entries(SHEETS)) {
    scene.load.spritesheet(key, `assets/${sheet.file}`, { frameWidth: sheet.frame, frameHeight: sheet.frame });
  }
}

/** Вызывать в create(), когда листы уже загружены. Анимации глобальные — доступны во всех сценах. */
export function createAnimations(scene: Phaser.Scene) {
  for (const [key, sheet] of Object.entries(SHEETS)) {
    for (const [name, a] of Object.entries(sheet.anims)) {
      const animName = animKey(key, name);
      if (scene.anims.exists(animName)) continue;
      const start = a.row * sheet.columns;
      scene.anims.create({
        key: animName,
        frames: scene.anims.generateFrameNumbers(key, { start, end: start + a.frames - 1 }),
        frameRate: a.frameRate,
        repeat: a.repeat,
      });
    }
  }
}
