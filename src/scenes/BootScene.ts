import Phaser from 'phaser';
import { FONT } from '../config';
import { createTextures } from '../art/textures';
import { createAnimations, loadAssets } from '../art/sheets';
import { SCENE } from './keys';

/**
 * Первая сцена: готовим всё, что нужно остальным, и уходим в меню.
 *
 * В preload() грузим картинки и спрайтшиты из public/assets/ (art/sheets.ts),
 * в create() дорисовываем кодом всё остальное (art/textures.ts).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.boot);
  }

  preload() {
    loadAssets(this);
  }

  create() {
    createTextures(this);
    createAnimations(this);

    // Phaser рисует текст на canvas, и если шрифт ещё не скачался, текст будет системным шрифтом.
    // Поэтому ждём шрифты (но не дольше 2,5 с — без интернета просто возьмём запасные).
    waitForFonts().then(() => this.scene.start(SCENE.menu));
  }
}

async function waitForFonts() {
  const fonts = [`32px ${FONT.display}`, `16px ${FONT.body}`, `800 16px ${FONT.body}`, `12px ${FONT.mono}`];
  const timeout = new Promise(resolve => setTimeout(resolve, 2500));
  try {
    await Promise.race([Promise.all(fonts.map(f => document.fonts.load(f))), timeout]);
  } catch {
    /* шрифты не критичны */
  }
}
