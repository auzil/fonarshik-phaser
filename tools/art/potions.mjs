// Перегенерировать: node tools/art/potions.mjs  (ПЕРЕЗАПИШЕТ public/assets/potions.png!)
// Placeholder potions: 4 frames of 16×16 in a row — heal, frenzy, speed, lantern oil can.
import { writePng } from './png.mjs';

const F = 16, COLS = 4, W = F * COLS, H = F;
const img = new Uint8Array(W * H * 4);
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const shade = (c, k) => [...c.slice(0, 3).map(v => Math.min(255, Math.round(v * k))), 255];

const OUTLINE = hex('#140f0a'), GLASS = hex('#9fb4b8'), CORK = hex('#8a5a32'), CORK_DARK = hex('#5e3b1f'), SHINE = hex('#ffffff');

/** Draws one 16×16 item into column col: draw(set, rect), then a 1px outline around it. */
function item(col, draw) {
  const buf = new Array(F * F).fill(null);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < F && y < F) buf[y * F + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  draw(set, rect);

  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    let c = buf[y * F + x];
    if (!c && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => buf[(y + dy) * F + x + dx] && x + dx >= 0 && x + dx < F && y + dy >= 0 && y + dy < F)) c = OUTLINE;
    if (c) img.set(c, (y * W + col * F + x) * 4);
  }
}

const potion = (col, liquid) => item(col, (set, rect) => {
  // round flask body
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 10;
    if (dx * dx + dy * dy <= 4.6 * 4.6) set(x, y, dy < -1.5 ? GLASS : y > 12 ? shade(liquid, 0.7) : liquid);
  }
  rect(7, 3, 2, 3, GLASS); // neck
  rect(6, 1, 4, 2, CORK); rect(6, 2, 4, 1, CORK_DARK);
  set(5, 8, SHINE); set(5, 9, SHINE); set(6, 7, SHINE); // glint
  set(10, 11, shade(liquid, 1.35)); set(9, 12, shade(liquid, 1.35)); // bubbles
});

// Lantern oil: a tin can with a spout and an amber label — must not look like the orange frenzy potion.
const TIN = hex('#7b8285'), TIN_LIT = hex('#a9b1b3'), TIN_DARK = hex('#4b5053'), LABEL = hex('#e0a030'), OIL = hex('#ffcf7a');
const oilCan = col => item(col, (set, rect) => {
  rect(4, 5, 8, 10, TIN);
  rect(4, 5, 2, 10, TIN_LIT);
  rect(10, 5, 2, 10, TIN_DARK);
  rect(4, 9, 8, 3, LABEL);
  set(7, 10, OIL); set(8, 10, OIL); // flame mark on the label
  rect(4, 4, 8, 1, TIN_DARK); // lid rim
  set(11, 3, TIN); set(12, 2, TIN); set(13, 1, TIN_LIT); // spout
  set(5, 2, TIN_DARK); set(6, 1, TIN_DARK); set(7, 1, TIN_DARK); set(8, 1, TIN_DARK); set(9, 2, TIN_DARK); // handle
  set(5, 3, TIN_DARK); set(9, 3, TIN_DARK);
});

potion(0, hex('#e5484d')); // heal
potion(1, hex('#ff8a2a')); // frenzy
potion(2, hex('#4fd06a')); // speed
oilCan(3); // oil

writePng(process.argv[2] ?? new URL('../../public/assets/potions.png', import.meta.url).pathname, img, W, H);
