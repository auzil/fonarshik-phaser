import { TILE } from '../config';
import type { LevelMap } from './LevelMap';

/** Четырёхугольник тени: A и B — края стены, A2 и B2 — их проекции далеко от света. */
export type ShadowQuad = [ax: number, ay: number, bx: number, by: number, b2x: number, b2y: number, a2x: number, a2y: number];

/**
 * Тени от стен для источника света в точке (lx, ly) с радиусом radius.
 *
 * Идея: свет летит по прямым из центра. За каждой гранью стены, которая
 * смотрит ОТ света, остаётся тень — «клин» от грани до бесконечности.
 * Берём именно дальние грани: так сама стена остаётся освещённой (видно кладку),
 * а темнеет всё, что за ней.
 *
 * Грань считаем, только если по другую сторону от неё пол: между двумя
 * стенами тень не нужна, её всё равно закроет тень от дальней грани.
 *
 * Чистая геометрия, без Phaser: рисует тени systems/Darkness.ts.
 */
export function shadowQuads(map: LevelMap, lx: number, ly: number, radius: number): ShadowQuad[] {
  const quads: ShadowQuad[] = [];
  const minX = Math.floor((lx - radius) / TILE);
  const maxX = Math.floor((lx + radius) / TILE);
  const minY = Math.floor((ly - radius) / TILE);
  const maxY = Math.floor((ly + radius) / TILE);
  // Тень тянем далеко за радиус света, чтобы её конец никогда не было видно.
  const far = radius * 3;

  const addEdge = (ax: number, ay: number, bx: number, by: number) => {
    const [a2x, a2y] = project(lx, ly, ax, ay, far);
    const [b2x, b2y] = project(lx, ly, bx, by, far);
    quads.push([ax, ay, bx, by, b2x, b2y, a2x, a2y]);
  };

  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      if (!map.isWall(cx, cy)) continue;
      const x0 = cx * TILE;
      const y0 = cy * TILE;
      const x1 = x0 + TILE;
      const y1 = y0 + TILE;
      // Грань «смотрит от света», если свет по другую сторону от неё, чем пол-сосед.
      if (!map.isWall(cx, cy - 1) && ly > y0) addEdge(x0, y0, x1, y0); // верхняя, свет снизу
      if (!map.isWall(cx, cy + 1) && ly < y1) addEdge(x0, y1, x1, y1); // нижняя, свет сверху
      if (!map.isWall(cx - 1, cy) && lx > x0) addEdge(x0, y0, x0, y1); // левая, свет справа
      if (!map.isWall(cx + 1, cy) && lx < x1) addEdge(x1, y0, x1, y1); // правая, свет слева
    }
  }
  return quads;
}

/** Точка на луче из (lx, ly) через (px, py), на расстоянии не меньше far от света. */
function project(lx: number, ly: number, px: number, py: number, far: number): [number, number] {
  const dx = px - lx;
  const dy = py - ly;
  const k = far / Math.max(1, Math.hypot(dx, dy));
  return [lx + dx * Math.max(1, k), ly + dy * Math.max(1, k)];
}
