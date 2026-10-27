import Phaser from 'phaser';
import { TILE } from '../config';
import type { LevelDef } from '../data/levels';

export interface Point {
  x: number;
  y: number;
}

/**
 * Варианты пола и их вес: чем больше вес, тем чаще тайл встречается.
 * Веса не обязаны давать в сумме 100 — считается доля от общей суммы
 * (здесь гладкий пол выпадает в 70 случаях из 100, кости — в 5).
 * Новый вариант: дорисуй тайл в tiles.png и добавь строчку с его номером.
 */
export const FLOOR_VARIANTS: { tile: number; weight: number }[] = [
  { tile: 0, weight: 70 }, // гладкий
  { tile: 1, weight: 15 }, // трещина
  { tile: 2, weight: 10 }, // мох
  { tile: 3, weight: 5 }, // кости
];

/** Номера кадров в тайлсете public/assets/tiles.png (см. art/sheets.ts). */
export const TILE_INDEX = {
  wallTop: 4, // стена, у которой снизу тоже стена
  wallFace: 5, // стена, у которой снизу пол: рисуем «лицевую» грань
  solid: 6, // глухая порода, до которой герой никогда не дойдёт
} as const;

export const COLLIDING_TILES = [TILE_INDEX.wallTop, TILE_INDEX.wallFace, TILE_INDEX.solid];

/**
 * Логическая карта уровня: где стены, где пол, где старт, выход и осколки.
 *
 * Phaser-тайлмап нужен для отрисовки и физики, а этот класс — для «умной» логики:
 * поиска пути, линии видимости, выбора точки спавна. Держать их отдельно удобно:
 * логику можно тестировать без Phaser.
 */
export class LevelMap {
  readonly width: number; // в клетках
  readonly height: number;
  readonly start: Point;
  readonly exit: Point;
  readonly shardSpots: Point[] = [];
  /** Индексы всех клеток пола (index = y * width + x). */
  readonly floorCells: number[] = [];
  private readonly walls: Uint8Array;

  constructor(def: LevelDef) {
    const rows = def.map.trim().split('\n');
    this.height = rows.length;
    this.width = Math.max(...rows.map(r => r.length));
    this.walls = new Uint8Array(this.width * this.height).fill(1);

    let start: Point | null = null;
    let exit: Point | null = null;

    rows.forEach((row, y) => {
      for (let x = 0; x < this.width; x++) {
        const ch = row[x] ?? '#';
        if (ch === '#') continue;

        this.walls[y * this.width + x] = 0;
        this.floorCells.push(y * this.width + x);

        const center = this.cellCenter(x, y);
        if (ch === 'P') start = center;
        if (ch === 'E') exit = center;
        if (ch === 'K') this.shardSpots.push(center);
      }
    });

    if (!start || !exit) throw new Error(`На карте "${def.name}" нет P (старт) или E (выход)`);
    this.start = start;
    this.exit = exit;
  }

  get pixelWidth() {
    return this.width * TILE;
  }
  get pixelHeight() {
    return this.height * TILE;
  }

  /** Стена ли в клетке. Всё за краем карты считаем стеной. */
  isWall(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) return true;
    return this.walls[cy * this.width + cx] === 1;
  }

  /** То же самое, но по мировым координатам в пикселях. */
  isWallAt(px: number, py: number): boolean {
    return this.isWall(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  cellCenter(cx: number, cy: number): Point {
    return { x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE };
  }

  cellIndexAt(px: number, py: number): number {
    return Math.floor(py / TILE) * this.width + Math.floor(px / TILE);
  }

  /**
   * Двумерный массив номеров тайлов для Phaser: this.make.tilemap({ data }).
   * Здесь же решаем, как выглядит каждая клетка.
   */
  toTileData(seed: number): number[][] {
    const rnd = new Phaser.Math.RandomDataGenerator([String(seed)]);
    const data: number[][] = [];

    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        if (!this.isWall(x, y)) {
          row.push(pickWeighted(rnd, FLOOR_VARIANTS));
        } else if (!this.isWall(x, y + 1)) {
          row.push(TILE_INDEX.wallFace);
        } else if (this.touchesFloor(x, y)) {
          row.push(TILE_INDEX.wallTop);
        } else {
          row.push(TILE_INDEX.solid);
        }
      }
      data.push(row);
    }
    return data;
  }

  private touchesFloor(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!this.isWall(x + dx, y + dy)) return true;
      }
    }
    return false;
  }
}

/** Случайный тайл с учётом весов: бросаем число от 0 до суммы весов и смотрим, в чей отрезок попали. */
function pickWeighted(rnd: Phaser.Math.RandomDataGenerator, variants: { tile: number; weight: number }[]): number {
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  let roll = rnd.frac() * total;
  for (const v of variants) {
    roll -= v.weight;
    if (roll < 0) return v.tile;
  }
  return variants[variants.length - 1].tile;
}
