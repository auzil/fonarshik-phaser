---
name: add-content
description: Recipes for adding game content to Фонарщик — a new enemy, weapon, potion, level-up upgrade, level map, or floor tile variant — touching exactly the right files. Use whenever the user asks to add or change one of these.
---

# Adding content

Read the files named in the recipe before editing; match their comment style (Russian, explanatory).
After any recipe: update README.md ("Как добавить…", file tree) and run the `verify-game` skill.

## Enemy
1. `src/data/enemies.ts`: add to `EnemyKind` and `ENEMIES` (hp, speed px/s, radius, damage, xp, potionChance, body/rim colours, eyes tint).
2. Add it to `enemyMix` of the levels where it should appear (`src/data/levels.ts`).
3. Looks: by default a circle is drawn from body/rim in `art/textures.ts` (`createEnemy`). Special touches go there.
   For real art + animation use the `add-sprite` skill (sheet key `enemy-<kind>`, anims `run` + `bite`, `eye`).

## Weapon
1. `src/data/upgrades.ts`: level field in `Stats` + `BASE_STATS` (0 = not owned), `WeaponId`, `WEAPON_INFO` (glyph, name, descs).
2. `src/weapons/<Name>.ts`: class implementing `Weapon` with `update(dt)` (copy `Nova.ts`). Use only `WeaponHost`
   (`host.player`, `host.livingEnemies()`, `host.fx`, `host.darkness`, `host.add/tweens/time`), never import GameScene.
   Helpers: `findNearestVisible`, `direction` in `Weapon.ts`. Scale with `player.stats.<id>` level. Clean up in `destroy()`.
3. `src/weapons/index.ts`: one line in `WEAPON_FACTORY`.
The level-up cards and HUD pick it up automatically.

## Potion
1. `src/data/potions.ts`: add to `PotionKind` and `POTIONS` (name, glyph, frame, color, weight, heal?/duration?/multipliers).
2. A new multiplier field (e.g. `damage`) also needs: the field in `PotionDef`, the union in `Player.buffMultiplier`, and a getter
   on `Player` that the consuming code reads instead of `stats.x`. Never mutate `stats` for timed effects.
3. Draw a new 16×16 frame at the end of `public/assets/potions.png` (`pixel-art` skill, `tools/art/potions.mjs`).
Drop rates: `potionChance` per enemy in `data/enemies.ts`.

## Upgrade card (permanent stat boost)
Add an entry to `UPGRADES` in `src/data/upgrades.ts`: `kind` ('pistol' | 'hero'), glyph, name, desc,
optional `available(s)` cap, `apply(s)`, optional `heal`.

## Level
Append to `LEVELS` in `src/data/levels.ts`. Map chars: `#` wall, `.` floor, `P` start (one), `K` shard (≥1), `E` exit (one).
Rows may differ in length (missing = wall). Tune `spawnEvery`, `maxEnemies`, `shardAmbush`, `enemyMix`.
The last level is detected by index, so nothing else to change.

## Floor tile variant
Draw tile N at the end of `public/assets/tiles.png` (keep 32×32, seamless) and add `{ tile: N, weight }` to
`FLOOR_VARIANTS` in `src/world/LevelMap.ts`. Wall-type tiles also need `TILE_INDEX` + `COLLIDING_TILES` + logic in `toTileData()`.
