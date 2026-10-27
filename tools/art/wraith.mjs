// Перегенерировать: node tools/art/wraith.mjs  (ПЕРЕЗАПИШЕТ public/assets/wraith.png!)
// Placeholder wraith (Морок) spritesheet: 4 cols × 2 rows of 28×28 frames, facing right.
// row 0: run — floating, tattered hem waves (4); row 1: cast — orb grows in the hand and is thrown (3).
// The head never moves: the glowing eye overlay sits at a fixed offset (SHEETS['enemy-wraith'].eye).
import { writePng } from './png.mjs';

const F = 28, COLS = 4, ROWS = 2, W = F * COLS, H = F * ROWS;
const img = new Uint8Array(W * H * 4);

const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const C = {
  outline: hex('#0d0814'),
  robe: hex('#3d2d5c'),
  robeLit: hex('#5a4585'),
  robeDark: hex('#251a3a'),
  trim: hex('#7bd35a'),
  void: hex('#07040c'),
  hand: hex('#8f86a8'),
  orb: hex('#c9a2ff'),
  orbCore: hex('#ffffff'),
};

function frame(col, row, draw) {
  const buf = new Array(F * F).fill(null);
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < F && y < F) buf[y * F + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, c);
      }
  };
  draw({ set, rect, ellipse });

  const out = buf.slice();
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (buf[y * F + x]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < F && ny < F && buf[ny * F + nx];
    });
    if (n) out[y * F + x] = C.outline;
  }

  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const i = ((row * F + y) * W + col * F + x) * 4;
    const c = out[y * F + x];
    if (c) { img.set(c, i); continue; }
    const dx = (x + 0.5 - 14) / 6, dy = (y + 0.5 - 26) / 1.3;
    if (dx * dx + dy * dy <= 1) img.set([0, 0, 0, 55], i);
  }
}

/** hem — tatter wave phase, arm — 0 at the side, 1 raised forward, orb — orb radius in the hand (0 = none). */
function wraith(p, { hem = 0, arm = 0, orb = 0 } = {}) {
  // robe: widens to a tattered hem that waves (the head above stays fixed)
  for (let y = 11; y <= 22; y++) {
    const half = 4 + Math.round((y - 11) / 2.2);
    p.rect(14 - half, y, half * 2, 1, C.robe);
  }
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 3;
    const len = 2 + Math.round((Math.sin(hem + i * 1.7) + 1) * 1.2);
    p.rect(x, 23, 2, len, i % 2 ? C.robeDark : C.robe);
  }
  p.rect(16, 13, 2, 9, C.robeLit);
  p.rect(9, 18, 10, 1, C.trim);
  // hood with a void for a face (eye glow is a separate sprite in the game)
  p.ellipse(14, 9, 5.5, 5.5, C.robe);
  p.ellipse(12.5, 7.5, 2.5, 2, C.robeLit);
  p.rect(13, 3, 3, 1, C.robe);
  p.ellipse(16.5, 9.5, 2.6, 3, C.void);
  // arm: hangs at the side or reaches forward to cast
  if (arm === 0) {
    p.rect(17, 14, 2, 5, C.robeDark);
    p.set(17, 19, C.hand); p.set(18, 19, C.hand);
  } else {
    p.rect(17, 13, 5, 2, C.robeDark);
    p.rect(22, 13, 2, 2, C.hand);
  }
  if (orb > 0) {
    p.ellipse(25, 12.5, orb, orb, C.orb);
    p.set(25, 12, C.orbCore);
  }
}

// run: floating, only the hem moves
[0, 1.6, 3.2, 4.8].forEach((hem, i) => frame(i, 0, p => wraith(p, { hem })));
// cast: gather, hold a big orb, throw
frame(0, 1, p => wraith(p, { hem: 0.8, arm: 1, orb: 1.2 }));
frame(1, 1, p => wraith(p, { hem: 2.4, arm: 1, orb: 2.4 }));
frame(2, 1, p => wraith(p, { hem: 4, arm: 1, orb: 0 }));

writePng(process.argv[2] ?? new URL('../../public/assets/wraith.png', import.meta.url).pathname, img, W, H);
