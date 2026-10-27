// Перегенерировать: node tools/art/potions.mjs  (ПЕРЕЗАПИШЕТ public/assets/potions.png!)
// Placeholder potions: 3 frames of 16×16 in a row — heal, frenzy, speed.
import { writePng } from './png.mjs';

const F = 16, COLS = 3, W = F * COLS, H = F;
const img = new Uint8Array(W * H * 4);
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const shade = (c, k) => [...c.slice(0, 3).map(v => Math.min(255, Math.round(v * k))), 255];

const OUTLINE = hex('#140f0a'), GLASS = hex('#9fb4b8'), CORK = hex('#8a5a32'), CORK_DARK = hex('#5e3b1f'), SHINE = hex('#ffffff');

function potion(col, liquid) {
  const buf = new Array(F * F).fill(null);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < F && y < F) buf[y * F + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  // round flask body
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 10;
    if (dx * dx + dy * dy <= 4.6 * 4.6) set(x, y, dy < -1.5 ? GLASS : y > 12 ? shade(liquid, 0.7) : liquid);
  }
  rect(7, 3, 2, 3, GLASS); // neck
  rect(6, 1, 4, 2, CORK); rect(6, 2, 4, 1, CORK_DARK);
  set(5, 8, SHINE); set(5, 9, SHINE); set(6, 7, SHINE); // glint
  set(10, 11, shade(liquid, 1.35)); set(9, 12, shade(liquid, 1.35)); // bubbles

  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    let c = buf[y * F + x];
    if (!c && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => buf[(y + dy) * F + x + dx] && x + dx >= 0 && x + dx < F && y + dy >= 0 && y + dy < F)) c = OUTLINE;
    if (c) img.set(c, (y * W + col * F + x) * 4);
  }
}

potion(0, hex('#e5484d')); // heal
potion(1, hex('#ff8a2a')); // frenzy
potion(2, hex('#4fd06a')); // speed

writePng(process.argv[2] ?? new URL('../../public/assets/potions.png', import.meta.url).pathname, img, W, H);
