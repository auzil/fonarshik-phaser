import Phaser from 'phaser';
import { COLOR } from './config';
import { DPR, screenSize } from './core/screen';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { DialogScene } from './scenes/DialogScene';

/**
 * Точка входа. Создаём Phaser.Game и перечисляем сцены.
 * Порядок в массиве scene важен: сцены ниже по списку рисуются поверх.
 * Первая сцена (Boot) запускается автоматически.
 */
const { width, height } = screenSize();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  backgroundColor: COLOR.void,
  width,
  height,
  pixelArt: true, // без сглаживания при увеличении: чёткие пиксели и нет швов между тайлами
  scale: {
    mode: Phaser.Scale.NONE, // размер задаём сами (см. core/screen.ts про DPR)
    zoom: 1 / DPR,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }, // поставь true — увидишь тела и векторы скорости
  },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, HudScene, LevelUpScene, DialogScene],
});

// Окно поменяло размер (поворот телефона) — меняем размер игры.
window.addEventListener('resize', () => {
  const size = screenSize();
  game.scale.resize(size.width, size.height);
});

// Удобно для отладки из консоли браузера: window.game.scene.getScene('Game')
(window as unknown as { game: Phaser.Game }).game = game;
