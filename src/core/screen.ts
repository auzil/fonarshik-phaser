import Phaser from 'phaser';

/**
 * Чёткая картинка на телефонах.
 *
 * У телефона devicePixelRatio обычно 2–3: на один «CSS-пиксель» приходится 2–3 физических.
 * Если сделать canvas размером с окно в CSS-пикселях, браузер его растянет и всё будет мыльным.
 *
 * Поэтому делаем canvas в DPR раз больше (game size = окно × DPR),
 * а через scale.zoom = 1 / DPR ужимаем его обратно до размера окна.
 * Итог: один пиксель canvas = один физический пиксель экрана.
 *
 * Цена: все сцены работают в «физических» пикселях. Чтобы верстать интерфейс
 * в привычных CSS-пикселях, UI-сцены ставят камере zoom = DPR (см. setupUiCamera).
 */
export const DPR = Math.min(2, window.devicePixelRatio || 1);

export function screenSize() {
  return { width: Math.round(window.innerWidth * DPR), height: Math.round(window.innerHeight * DPR) };
}

/** Размер экрана в CSS-пикселях — в них удобно задавать отступы и размеры шрифтов. */
export function uiSize(scene: Phaser.Scene) {
  return { w: scene.scale.width / DPR, h: scene.scale.height / DPR };
}

/** Камера интерфейса: координаты (0,0) — левый верхний угол, единица — CSS-пиксель. */
export function setupUiCamera(scene: Phaser.Scene) {
  scene.cameras.main.setOrigin(0, 0).setZoom(DPR);
}
