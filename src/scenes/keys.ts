/**
 * Имена сцен. Сцена в Phaser — это «экран» со своим жизненным циклом
 * (init → preload → create → update каждый кадр). Несколько сцен могут работать
 * одновременно и рисуются друг поверх друга: так HUD живёт поверх игры.
 */
export const SCENE = {
  boot: 'Boot',
  menu: 'Menu',
  game: 'Game',
  hud: 'Hud',
  levelUp: 'LevelUp',
  dialog: 'Dialog',
} as const;
