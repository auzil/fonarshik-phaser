// Перегенерировать: node tools/art/heroine.mjs  (ПЕРЕЗАПИШЕТ public/assets/heroine.png!)
// Generates a placeholder heroine spritesheet (same layout as hero.png): 6 cols × 3 rows of 32×32 frames.
// row 0: idle (4), row 1: walk (6), row 2: hurt (2). Faces right.
import { writePng } from './png.mjs';

const F = 32, COLS = 6, ROWS = 3, W = F * COLS, H = F * ROWS;
const img = new Uint8Array(W * H * 4);

const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const C = {
  outline: hex('#140f0a'),
  dress: hex('#46344c'),
  dressLit: hex('#614a68'),
  dressDark: hex('#2e2233'),
  sash: hex('#c9b28a'),
  hair: hex('#a8552e'),
  hairLit: hex('#cf7c45'),
  hairDark: hex('#6e3219'),
  skin: hex('#e0b28c'),
  skinShade: hex('#b98a68'),
  eye: hex('#24160c'),
  boot: hex('#231b13'),
  white: hex('#ffffff'),
};

function frame(col, row, draw) {
  const buf = new Array(F * F).fill(null);
  const set = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < F && y < F) buf[y * F + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, c);
      }
  };
  const tint = draw({ set, rect, ellipse });

  // Outline around every opaque pixel.
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
    let c = out[y * F + x];
    if (!c) {
      // Soft shadow under the feet, only on empty pixels.
      const dx = (x + 0.5 - 16) / 8, dy = (y + 0.5 - 29) / 2.5;
      if (dx * dx + dy * dy <= 1) img.set([0, 0, 0, 90], i);
      continue;
    }
    if (tint) c = tint(c);
    img.set(c, i);
  }
}

/**
 * The heroine. bob — upper body offset, step — feet phase, lean — x offset, sway — braid swing.
 * No hood: face, fringe and a braid down the back; dress flares into a skirt.
 */
function heroine(p, { bob = 0, step = 0, lean = 0, sway = 0 } = {}) {
  const by = bob, lx = lean;
  // boots
  p.rect(12 + step, 25 - (step > 0 ? 1 : 0), 3, 4, C.boot);
  p.rect(17 - step, 25 - (step < 0 ? 1 : 0), 3, 4, C.boot);
  // hair behind the shoulders and the braid (drawn first, the body covers its root)
  p.rect(9 + lx, 12 + by, 5, 8, C.hairDark);
  for (let i = 0; i < 6; i++) p.rect(8 + lx + Math.round((sway * i) / 5), 18 + by + i, 2, 1, i % 2 ? C.hair : C.hairDark);
  // skirt: widens towards the hem
  for (let y = 19; y <= 25; y++) {
    const half = 5 + Math.round((y - 19) / 2.2);
    p.rect(16 + lx - half, y + by, half * 2, 1, y === 25 ? C.dressDark : C.dress);
  }
  // bodice
  p.ellipse(16 + lx, 18 + by, 5, 4.2, C.dress);
  p.rect(18 + lx, 16 + by, 2, 8, C.dressLit);
  p.rect(11 + lx, 20 + by, 10, 1, C.sash);
  // head: hair, face, fringe
  p.ellipse(16 + lx, 12 + by, 6, 5.8, C.hair);
  p.ellipse(19 + lx, 13 + by, 3.4, 3.6, C.skin);
  p.rect(16 + lx, 12 + by, 1, 4, C.skinShade);
  p.ellipse(16.5 + lx, 8.5 + by, 5.5, 2.6, C.hair);
  p.rect(13 + lx, 7 + by, 4, 1, C.hairLit);
  p.set(12 + lx, 9 + by, C.hairLit);
  p.set(20 + lx, 12 + by, C.eye);
  p.set(21 + lx, 15 + by, C.skinShade);
}

// idle: slow breathing, braid settles
[0, 0, 1, 1].forEach((bob, i) => frame(i, 0, p => heroine(p, { bob, sway: i < 2 ? 0 : -1 })));
// walk: alternating feet, body dips on contact, braid swings opposite to the step
[
  { step: 2, bob: 0, sway: -2 }, { step: 0, bob: 1, sway: -1 }, { step: -2, bob: 0, sway: 1 },
  { step: -2, bob: 0, sway: 2 }, { step: 0, bob: 1, sway: 1 }, { step: 2, bob: 0, sway: -1 },
].forEach((f, i) => frame(i, 1, p => heroine(p, f)));
// hurt: white flash, then knocked back
frame(0, 2, p => { heroine(p); return () => C.white; });
frame(1, 2, p => heroine(p, { lean: -1, bob: 1 }));

writePng(process.argv[2] ?? new URL('../../public/assets/heroine.png', import.meta.url).pathname, img, W, H);
