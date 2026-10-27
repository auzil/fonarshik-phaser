---
name: verify-game
description: Check a change to Фонарщик end to end — typecheck, production build, dev server and asset availability, and how to exercise the feature from the browser console. Use after every code or asset change before reporting it done.
---

# Verify a change

1. **Types**: `npm run typecheck` (strict; unused locals/params are errors — remove dead code rather than silencing).
2. **Build**: `npx vite build 2>&1 | tail -3` — must end with `✓ built`. New files in `public/assets/` must show up in `dist/assets/`.
   (`npm run build` = both steps.)
3. **Dev server**: if one is not running, start `npm run dev` in the background and read the real port from its output
   (5173 is often taken → 5174). Vite hot-reloads, no restart needed after edits.
   Check new assets are served: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<port>/assets/<file>.png` → 200.
4. **In-game check** (when a browser tool is available, or ask the user to look). Useful console hooks:
   ```js
   const g = game.scene.getScene('Game');
   g.player.stats.blades = 5;     // weapon levels apply at the next level-up pick
   g.player.drink('speed');       // potions: 'heal' | 'frenzy' | 'speed'
   g.player.hp = 1;               // test low-HP / death
   g.spawner.spawnOne(3, 10, 'wraith'); // force a specific enemy 3–10 steps away
   g.player.confuse(3);           // reversed controls
   ```
   `debug: true` in `src/main.ts` draws physics bodies — use it to check circle offsets after changing sprite sizes.
5. **Report honestly**: say what was verified (types, build, HTTP 200) and what was not (e.g. "not checked visually").
