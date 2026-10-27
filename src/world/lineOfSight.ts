import { TILE } from '../config';
import type { LevelMap } from './LevelMap';

/**
 * Линия видимости: можно ли провести отрезок из точки A в точку B, не задев стену.
 *
 * Используем алгоритм DDA («Digital Differential Analyzer», как в старом Wolfenstein 3D):
 * идём по клеткам, через которые проходит отрезок, по одной, в правильном порядке.
 * В отличие от проверки «точками через каждые N пикселей» он не проскакивает углы стен.
 */
function segmentIsClear(map: LevelMap, x0: number, y0: number, x1: number, y1: number): boolean {
  let cx = Math.floor(x0 / TILE);
  let cy = Math.floor(y0 / TILE);
  const endX = Math.floor(x1 / TILE);
  const endY = Math.floor(y1 / TILE);

  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;

  // Сколько «доли отрезка» нужно пройти, чтобы пересечь одну клетку по X / по Y.
  const cellStepX = dx !== 0 ? TILE / Math.abs(dx) : Infinity;
  const cellStepY = dy !== 0 ? TILE / Math.abs(dy) : Infinity;

  // Через какую долю отрезка пересечём ближайшую вертикальную / горизонтальную границу клетки.
  let nextX = dx !== 0 ? (dx > 0 ? (cx + 1) * TILE - x0 : x0 - cx * TILE) / Math.abs(dx) : Infinity;
  let nextY = dy !== 0 ? (dy > 0 ? (cy + 1) * TILE - y0 : y0 - cy * TILE) / Math.abs(dy) : Infinity;

  for (let guard = 0; guard < 512; guard++) {
    if (map.isWall(cx, cy)) return false;
    if (cx === endX && cy === endY) return true;

    if (Math.abs(nextX - nextY) < 1e-9) {
      // Отрезок проходит ровно через угол клетки: проверяем обе соседние клетки,
      // иначе пуля «протиснется» между двумя стенами, стоящими по диагонали.
      if (map.isWall(cx + stepX, cy) || map.isWall(cx, cy + stepY)) return false;
      nextX += cellStepX;
      nextY += cellStepY;
      cx += stepX;
      cy += stepY;
    } else if (nextX < nextY) {
      nextX += cellStepX;
      cx += stepX;
    } else {
      nextY += cellStepY;
      cy += stepY;
    }
  }
  return true;
}

/**
 * Линия видимости с толщиной.
 *
 * thickness = 0 — тонкий луч (молния, взгляд врага).
 * thickness > 0 — проверяем ещё две параллельные линии по бокам: так пуля
 * не будет цепляться краем за угол стены, если цель только выглядывает из-за него.
 */
export function hasLineOfSight(map: LevelMap, x0: number, y0: number, x1: number, y1: number, thickness = 0): boolean {
  if (!segmentIsClear(map, x0, y0, x1, y1)) return false;
  if (thickness <= 0) return true;

  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  // Перпендикуляр к отрезку длиной thickness.
  const nx = (-(y1 - y0) / len) * thickness;
  const ny = ((x1 - x0) / len) * thickness;

  return (
    segmentIsClear(map, x0 + nx, y0 + ny, x1 + nx, y1 + ny) &&
    segmentIsClear(map, x0 - nx, y0 - ny, x1 - nx, y1 - ny)
  );
}
