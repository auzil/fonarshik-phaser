---
name: add-sprite
description: Wire an image or spritesheet from public/assets/ into the game — replace a code-drawn texture (enemy, item, tiles) with a PNG, add or change animations, mirror/flip, physics offsets, glowing enemy eyes. Use when the user wants something "as an image", "with animation", or gives a PNG to hook up.
---

# Add or replace a sprite with an image asset

All file-based art goes through `src/art/sheets.ts`. Read it and `src/art/textures.ts` first.

## 1. Decide the kind of asset

| Asset | Register in | Loaded as |
|---|---|---|
| Animated character / several frames | `SHEETS` | `load.spritesheet` (square frames, one row per animation) |
| Single image, or frames picked by index without animation (`potions`) | `SHEETS` with `anims: {}` | spritesheet, use `add.image(x, y, key, frame)` |
| Plain image / tileset | `IMAGES` | `load.image` |

**The key must equal the texture key the code already uses** (`hero`, `enemy-<kind>`, `tiles`, `potions`, `gem`, `shard`, …).
`makeTexture` in `textures.ts` skips existing keys, so the PNG wins. Then delete the now-dead canvas drawing for that key
(and any helpers / imports only it used — `noUnusedLocals` will tell you).

## 2. Sheet entry

```ts
'enemy-ghoul': {
  file: 'ghoul.png',
  frame: 28,          // square frame size
  columns: 4,         // frames per row in the PNG (used only to compute frame numbers)
  anims: {
    run:  { row: 0, frames: 4, frameRate: 10, repeat: -1 },
    bite: { row: 1, frames: 3, frameRate: 14, repeat: 0 },
  },
  eye: { x: 6, y: -1 }, // enemies only: glow position from frame center, sprite facing right
},
```

Animation keys are `animKey(sheet, name)` → `'enemy-ghoul-run'`. They are global (created once in `BootScene`).

## 3. Code expectations already in place

- **Enemies** (`entities/Enemy.ts`): if `SHEETS['enemy-<kind>']` exists the enemy plays `run`, plays `bite` from
  `enemy.bite()` (called in `GameScene.onEnemyTouch`), flips with `flipX` toward the hero and uses the single `eye` overlay.
  So an enemy sheet **must** have `run` and `bite` and an `eye`.
- **Hero** (`entities/Player.ts`): `idle`, `walk`, `hurt` via `HERO_ANIM`. Walk speed scales with `moveSpeed`.
- **Physics** circle offset = `this.width / 2 - radius` — frame size can be anything ≥ 2·radius.
- Hit flash / burning are tints, they work on any sprite.
- **Tiles**: 32×32, the order is `TILE_INDEX` in `world/LevelMap.ts`; floor variants and weights are `FLOOR_VARIANTS`.
  Floor tiles must tile seamlessly (draw seams on top/left edges only).

## 4. Art rules to tell the user (or follow when generating)

- Characters face **right**. Heads stay at a fixed pixel across frames when an `eye` overlay is used.
- Keep frames on an exact grid, transparent background, no padding between frames.
- Need placeholder art? Use the `pixel-art` skill.

## 5. Finish

- Update README.md: the file tree line for `art/sheets.ts`, and the "Как добавить…" recipe if a new pattern appeared.
- Update the "Graphics pipeline" list in CLAUDE.md if a new asset file was added.
- Run the `verify-game` skill (typecheck, build, asset served with HTTP 200).
