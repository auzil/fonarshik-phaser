// Перегенерировать: node tools/art/hero.mjs  (ПЕРЕЗАПИШЕТ public/assets/hero.png!)
// Generates a placeholder hero spritesheet: 6 cols × 3 rows of 32×32 frames.
// row 0: idle (4), row 1: walk (6), row 2: hurt (2). Faces right.
import { writePng } from './png.mjs';

const F = 32, COLS = 6, ROWS = 3, W = F * COLS, H = F * ROWS;
const img = new Uint8Array(W * H * 4);

const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const C = {
  outline: hex('#140f0a'),
  cloak: hex('#3b3328'),
  cloakLit: hex('#544a3a'),
  cloakDark: hex('#2a241c'),
  hood: hex('#c9b28a'),
  hoodLit: hex('#e2cfa6'),
  hoodDark: hex('#9c8662'),
  face: hex('#1d1610'),
  eye: hex('#ffcf7a'),
  boot: hex('#231b13'),
  belt: hex('#7a4a22'),
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

/** The hero. bob — upper body offset, step — feet phase (-1..1), lean — x offset. */
function hero(p, { bob = 0, step = 0, lean = 0 } = {}) {
  // boots
  p.rect(12 + step, 25 - (step > 0 ? 1 : 0), 3, 4, C.boot);
  p.rect(17 - step, 25 - (step < 0 ? 1 : 0), 3, 4, C.boot);
  // cloak
  const by = bob, lx = lean;
  p.ellipse(16 + lx, 20 + by, 7, 6.5, C.cloak);
  p.rect(9 + lx, 20 + by, 14, 5, C.cloak);
  p.rect(10 + lx, 24 + by, 12, 1, C.cloakDark);
  p.rect(18 + lx, 16 + by, 3, 7, C.cloakLit);
  p.rect(10 + lx, 21 + by, 12, 1, C.belt);
  // hood
  p.ellipse(16.5 + lx, 11.5 + by, 6.5, 6, C.hood);
  p.ellipse(15 + lx, 10 + by, 3, 3, C.hoodLit);
  p.rect(10 + lx, 13 + by, 3, 3, C.hoodDark);
  p.rect(14 + lx, 5 + by, 3, 1, C.hood); // hood tip
  // face opening, looking right
  p.ellipse(19.5 + lx, 12.5 + by, 2.6, 2.8, C.face);
  p.set(20 + lx, 12 + by, C.eye);
}

// idle: slow breathing
[0, 0, 1, 1].forEach((bob, i) => frame(i, 0, p => hero(p, { bob })));
// walk: alternating feet, body dips on contact
[
  { step: 2, bob: 0 }, { step: 0, bob: 1 }, { step: -2, bob: 0 },
  { step: -2, bob: 0 }, { step: 0, bob: 1 }, { step: 2, bob: 0 },
].forEach((f, i) => frame(i, 1, p => hero(p, f)));
// hurt: white flash, then knocked back
frame(0, 2, p => { hero(p); return () => C.white; });
frame(1, 2, p => hero(p, { lean: -1, bob: 1 }));

writePng(process.argv[2] ?? new URL('../../public/assets/hero.png', import.meta.url).pathname, img, W, H);
