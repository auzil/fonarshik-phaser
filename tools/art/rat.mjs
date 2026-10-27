// Перегенерировать: node tools/art/rat.mjs  (ПЕРЕЗАПИШЕТ public/assets/rat.png!)
// Placeholder rat spritesheet: 4 cols × 2 rows of 24×24 frames, facing right.
// row 0: run (4), row 1: bite (3).
import { writePng } from './png.mjs';

const F = 24, COLS = 4, ROWS = 2, W = F * COLS, H = F * ROWS;
const img = new Uint8Array(W * H * 4);

const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const C = {
  outline: hex('#21180f'),
  fur: hex('#8a7350'),
  furLit: hex('#a68d64'),
  furDark: hex('#5e4c33'),
  belly: hex('#b09a74'),
  pink: hex('#c98a7a'),
  pinkDark: hex('#9c6458'),
  eye: hex('#140c06'),
  mouth: hex('#3a120c'),
  tooth: hex('#f2ead8'),
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
    const dx = (x + 0.5 - 12) / 8, dy = (y + 0.5 - 19.5) / 1.6;
    if (dx * dx + dy * dy <= 1) img.set([0, 0, 0, 80], i);
  }
}

/**
 * The head never moves between frames: the glowing eye overlay in the game
 * sits at a fixed offset (see EYE in src/art/sheets.ts).
 * stretch — body length, back/front — leg offsets, tail — tail wave phase, bite — mouth open.
 */
function rat(p, { stretch = 0, hump = 0, back = 0, front = 0, tail = 0, bite = false } = {}) {
  // tail
  for (let i = 0; i < 7; i++) {
    const x = 5 - i;
    const y = 15 + Math.round(Math.sin(i * 0.7 + tail) * 1.4 + i * 0.15);
    p.set(x, y, i < 3 ? C.pink : C.pinkDark);
  }
  // legs
  p.rect(7 + back, 17, 2, 2, C.furDark);
  p.rect(9 - back, 17, 2, 1, C.furDark);
  p.rect(14 + front, 17, 2, 2, C.furDark);
  p.rect(12 - front, 17, 1, 1, C.furDark);
  // body
  p.ellipse(10.5 - stretch / 2, 14 - hump, 5.5 + stretch, 3.6 + hump / 2, C.fur);
  p.ellipse(9 - stretch / 2, 12.5 - hump, 3, 1.6, C.furLit);
  p.rect(8, 16, 7, 1, C.belly);
  // head (fixed)
  p.ellipse(16, 13, 3.4, 2.8, C.fur);
  p.ellipse(15.5, 12, 2, 1.2, C.furLit);
  p.rect(18, 13, 3, 2, C.fur); // snout
  p.set(21, 13, C.pink); // nose
  p.ellipse(14.5, 10, 1.6, 1.6, C.pink); // ear
  p.set(14, 9, C.furDark);
  p.set(17, 12, C.eye);
  if (bite) {
    p.rect(18, 15, 3, 1, C.mouth);
    p.set(20, 16, C.tooth);
    p.set(19, 16, C.mouth);
  }
}

// run: gallop — gather, stretch, gather
[
  { stretch: 0, hump: 1, back: 1, front: -1, tail: 0 },
  { stretch: 1, hump: 0, back: 0, front: 1, tail: 1.5 },
  { stretch: 0, hump: 1, back: -1, front: 0, tail: 3 },
  { stretch: 1, hump: 0, back: 0, front: 1, tail: 4.5 },
].forEach((f, i) => frame(i, 0, p => rat(p, f)));
// bite: crouch, snap, recover
frame(0, 1, p => rat(p, { stretch: -1, hump: 1, back: 1 }));
frame(1, 1, p => rat(p, { stretch: 1, front: 1, bite: true }));
frame(2, 1, p => rat(p, { stretch: 0, bite: true, tail: 2 }));

writePng(process.argv[2] ?? new URL('../../public/assets/rat.png', import.meta.url).pathname, img, W, H);
