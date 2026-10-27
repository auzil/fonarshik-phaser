---
name: pixel-art
description: Generate or revise placeholder pixel-art PNGs (characters, enemies, tiles, items) with the dependency-free Node scripts in tools/art/, and preview them. Use when the game needs new art and the user has none yet, or asks to tweak the existing placeholder look.
---

# Placeholder pixel art

There is no image library installed (no PIL, no node-canvas). Art is drawn pixel by pixel in Node and encoded by
`tools/art/png.mjs` (`writePng(path, rgbaUint8Array, w, h)`). Existing generators are the templates:

| Script | Output | Notes |
|---|---|---|
| `tools/art/hero.mjs` | `hero.png` 6×3 frames of 32 | outline pass, foot shadow, idle/walk/hurt |
| `tools/art/rat.mjs` | `rat.png` 4×2 frames of 24 | head fixed for the eye overlay |
| `tools/art/tiles.mjs` | `tiles.png` 7 tiles of 32 | seeded RNG, seamless floor, brick walls |
| `tools/art/potions.mjs` | `potions.png` 3 frames of 16 | round flask, liquid colour per frame |

`node tools/art/<name>.mjs [outPath]` — without `outPath` it **overwrites `public/assets/<name>.png`**.

## Never clobber hand-made art

The user may have repainted a PNG. Before regenerating into `public/assets/`:

```bash
node tools/art/<name>.mjs "$SCRATCH/orig-<name>.png" && cmp -s "$SCRATCH/orig-<name>.png" public/assets/<name>.png
```

Run this with the **unmodified** script. If the files differ, the PNG was edited by hand — ask before overwriting
(or write the new version next to it and let the user choose).

## Workflow

1. Copy the closest generator to `tools/art/<new>.mjs` (new asset) or edit the existing one.
2. Keep the established style:
   - palette in a `C` object of hex colours; 1px dark outline added by an outline pass around opaque pixels;
   - soft semi-transparent ellipse shadow under characters (only on empty pixels);
   - characters face **right**; animation via small parameter changes per frame (bob, step, stretch, lean);
   - for enemies with a glowing eye, keep the eye pixel at the same position in every frame and report its offset from
     the frame center (pixel center − frame/2) for `SHEETS[key].eye`;
   - tiles: seeded RNG (deterministic), seams only on top/left edges so tiles join without double lines.
3. Generate into the scratchpad first and preview it enlarged with nearest-neighbour-ish scaling (macOS):
   `sips -z <h*6> <w*6> in.png --out preview.png`, then Read the preview image. Transparent pixels show as white —
   check that what looks "white" is meant to be transparent (a classic bug: shapes clipped at a frame/brick edge).
4. Iterate until it reads well at 1×, then write to `public/assets/`.
5. Wire it in with the `add-sprite` skill if it is a new asset; mention the frame layout to the user so they can repaint it.
