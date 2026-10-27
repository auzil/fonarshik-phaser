import { TILE } from '../config';
import type { LevelMap, Point } from './LevelMap';

/**
 * Поле потока (flow field) — как враги находят дорогу к герою через лабиринт.
 *
 * Вместо того чтобы считать путь A* для каждого врага (60 врагов = 60 поисков за кадр),
 * один раз считаем от героя «волну» поиском в ширину (BFS): в каждой клетке пишем,
 * за сколько шагов из неё можно дойти до героя.
 *
 * Дальше каждому врагу достаточно посмотреть на соседние клетки и шагнуть туда,
 * где число меньше. Пересчитываем, только когда герой перешёл в другую клетку.
 */
export class FlowField {
  /** distance[i] — шагов до героя из клетки i, или -1, если туда не дойти. */
  readonly distance: Int16Array;
  private heroCell = -1;
  private readonly queue: Int32Array;

  constructor(private readonly map: LevelMap) {
    this.distance = new Int16Array(map.width * map.height);
    this.queue = new Int32Array(map.width * map.height);
  }

  /** Вызывать каждый кадр. Возвращает true, если поле пересчитано. */
  update(heroX: number, heroY: number): boolean {
    const cell = this.map.cellIndexAt(heroX, heroY);
    if (cell === this.heroCell) return false;
    this.heroCell = cell;
    this.rebuild(cell);
    return true;
  }

  private rebuild(fromCell: number) {
    const { width, height } = this.map;
    const dist = this.distance;
    const q = this.queue;
    dist.fill(-1);

    let head = 0;
    let tail = 0;
    dist[fromCell] = 0;
    q[tail++] = fromCell;

    while (head < tail) {
      const cell = q[head++];
      const x = cell % width;
      const y = (cell / width) | 0;
      const next = dist[cell] + 1;

      // четыре соседа: слева, справа, сверху, снизу
      const neighbours: Array<[number, number]> = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (const [nx, ny] of neighbours) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (this.map.isWall(nx, ny)) continue;
        const n = ny * width + nx;
        if (dist[n] !== -1) continue;
        dist[n] = next;
        q[tail++] = n;
      }
    }
  }

  distanceAt(px: number, py: number): number {
    return this.distance[this.map.cellIndexAt(px, py)] ?? -1;
  }

  /**
   * Куда шагнуть из точки (px, py), чтобы приблизиться к герою.
   * Возвращает центр соседней клетки (включая диагонали) или null.
   */
  nextStep(px: number, py: number): Point | null {
    const { map } = this;
    const cx = Math.floor(px / TILE);
    const cy = Math.floor(py / TILE);
    const here = this.distance[cy * map.width + cx];
    if (here <= 0) return null;

    let best = here;
    let bestCell: [number, number] | null = null;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (map.isWall(nx, ny)) continue;
        // По диагонали идём, только если оба «плеча» свободны — иначе враг срежет угол стены.
        if (dx !== 0 && dy !== 0 && (map.isWall(cx + dx, cy) || map.isWall(cx, cy + dy))) continue;
        const d = this.distance[ny * map.width + nx];
        if (d >= 0 && d < best) {
          best = d;
          bestCell = [nx, ny];
        }
      }
    }
    return bestCell ? map.cellCenter(bestCell[0], bestCell[1]) : null;
  }
}
