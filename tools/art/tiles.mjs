// Перегенерировать: node tools/art/tiles.mjs  (ПЕРЕЗАПИШЕТ public/assets/tiles.png!)
// Placeholder tileset: 7 tiles of 32×32 in one row (same order as TILE_INDEX in LevelMap.ts).
// 0–3 floor variants (plain, crack, moss, bones), 4 wall top, 5 wall with front face, 6 solid rock.
import { writePng } from './png.mjs';

const T = 32, N = 7, W = T * N, H = T;
const img = new Uint8Array(W * H * 4);

let seed = 1337;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const shade = ([r, g, b], k) => [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v * k))));

function tile(n) {
  const set = (x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= T || y >= T) return;
    const i = (y * W + n * T + x) * 4;
    if (a === 255) img.set([...c, 255], i);
    else for (let k = 0; k < 3; k++) img[i + k] = Math.round(img[i + k] * (1 - a / 255) + c[k] * (a / 255));
    img[i + 3] = 255;
  };
  const rect = (x, y, w, h, c, a) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c, a); };
  return { set, rect };
}

/* ── floor: four flagstones per tile, seams on the top/left edges so tiles join seamlessly ── */
const FLOOR = hex('#1a2023');
const SEAM = hex('#0c1012');

function floor(n) {
  const t = tile(n);
  // slabs: 2×2 per tile, each slightly different shade, with a lit top-left edge
  const slabs = [[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]];
  for (const [x, y, w, h] of slabs) {
    const base = shade(FLOOR, 0.9 + rnd() * 0.2);
    t.rect(x, y, w, h, base);
    t.rect(x + 1, y + 1, w - 1, 1, shade(base, 1.18));
    t.rect(x + 1, y + 1, 1, h - 1, shade(base, 1.1));
    t.rect(x, y, w, 1, SEAM);
    t.rect(x, y, 1, h, SEAM);
    // grit
    for (let i = 0; i < 6; i++) t.set(x + between(2, w - 2), y + between(2, h - 2), shade(base, rnd() < 0.5 ? 0.75 : 1.25));
  }
  return t;
}

floor(0);

const t1 = floor(1); // crack
{
  let x = 7, y = 6;
  for (let i = 0; i < 14; i++) {
    t1.set(x, y, SEAM);
    if (i % 3 === 0) t1.set(x + 1, y, hex('#2a3236'));
    x += between(0, 1); y += 1;
    if (i === 6) for (let j = 1; j < 5; j++) t1.set(x + j, y - Math.floor(j / 2), SEAM);
  }
}

const t2 = floor(2); // moss in the seams
{
  const moss = [hex('#2f4a26'), hex('#3d5c2e'), hex('#24391e')];
  const blob = (cx, cy, r) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r && rnd() < 0.75) t2.set(cx + x, cy + y, moss[between(0, 2)], 220);
  };
  blob(16, 16, 4); blob(13, 18, 2); blob(20, 13, 2); blob(4, 16, 2); blob(16, 27, 2);
}

const t3 = floor(3); // bones
{
  const bone = hex('#cfc4a8'), boneDark = hex('#8f8670');
  const line = (x0, y0, x1, y1, c) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) t3.set(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), c);
  };
  // femur
  line(8, 20, 19, 15, bone); line(8, 21, 19, 16, boneDark);
  t3.rect(6, 19, 2, 3, bone); t3.rect(19, 14, 2, 3, bone);
  // small bones and a skull-ish lump
  line(22, 24, 26, 26, bone);
  t3.rect(23, 6, 5, 4, bone); t3.rect(24, 10, 3, 1, boneDark); t3.set(24, 7, SEAM); t3.set(26, 7, SEAM);
  t3.set(5, 8, bone); t3.set(6, 8, bone); t3.set(11, 27, bone);
}

/* ── walls: brick masonry seen from above, face drawn in perspective ── */
const BRICK = hex('#343c3e');
const MORTAR = hex('#161b1d');

function bricks(t, y0, h, rowH, base, mortar) {
  for (let row = 0; row * rowH < h; row++) {
    const y = y0 + row * rowH;
    const off = row % 2 ? 8 : 0;
    for (let bx = -off; bx < T; bx += 16) {
      const c = shade(base, 0.88 + rnd() * 0.24);
      t.rect(Math.max(0, bx), y, Math.min(T, bx + 16) - Math.max(0, bx), Math.min(rowH, y0 + h - y), c);
      t.rect(Math.max(0, bx), y, Math.min(T, bx + 16) - Math.max(0, bx), 1, shade(c, 1.2));
      if (bx >= 0) t.rect(bx, y, 1, Math.min(rowH, y0 + h - y), mortar);
    }
    t.rect(0, y + rowH - 1, T, 1, mortar);
  }
}

const t4 = tile(4);
bricks(t4, 0, 32, 8, BRICK, MORTAR);

const t5 = tile(5);
bricks(t5, 0, 21, 8, BRICK, MORTAR);
// front face: darker, taller bricks, lit lip, dark foot
const FACE = hex('#1d2426');
t5.rect(0, 21, T, 11, FACE);
t5.rect(0, 21, T, 1, hex('#4a5457'));
for (const [x, y] of [[0, 22], [10, 22], [22, 22], [5, 27], [17, 27], [28, 27]]) t5.rect(x, y, 1, 5, shade(FACE, 0.6));
t5.rect(0, 26, T, 1, shade(FACE, 0.6));
t5.rect(0, 31, T, 1, hex('#07090b'));

const t6 = tile(6);
t6.rect(0, 0, T, T, hex('#07090b'));
for (let i = 0; i < 12; i++) t6.set(between(0, 31), between(0, 31), hex('#0d1113'));

writePng(process.argv[2] ?? new URL('../../public/assets/tiles.png', import.meta.url).pathname, img, W, H);
