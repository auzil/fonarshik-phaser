import Phaser from 'phaser';
import { COLOR, CSS_COLOR, FONT } from '../config';
import { DPR } from '../core/screen';

/**
 * Маленькие кирпичики интерфейса. Все размеры — в CSS-пикселях
 * (UI-сцены работают с камерой zoom = DPR, см. core/screen.ts).
 */

/**
 * Текст, который остаётся чётким на телефоне.
 * resolution = DPR: Phaser рендерит текст в текстуру в DPR раз крупнее.
 */
export function uiText(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT.body,
    fontSize: '16px',
    color: CSS_COLOR.bone,
    resolution: DPR,
    ...style,
  });
}

export interface ButtonOptions {
  width: number;
  height?: number;
  label: string;
  hint?: string; // мелкая подпись справа
  primary?: boolean; // залитая оранжевая кнопка или контурная
  onClick: () => void;
}

/**
 * Кнопка: Container (группа объектов с общей позицией) из прямоугольника и двух текстов.
 * Кликабельным делаем прямоугольник: setInteractive() + обработчик 'pointerup'.
 */
export function makeButton(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
  const h = opts.height ?? 48;
  const primary = opts.primary ?? true;

  const bg = scene.add
    .rectangle(0, 0, opts.width, h, primary ? COLOR.ember : 0x000000, primary ? 1 : 0.001)
    .setOrigin(0, 0)
    .setStrokeStyle(1, primary ? COLOR.ember : COLOR.bone, primary ? 1 : 0.35);

  const label = uiText(scene, 16, h / 2, opts.label, {
    fontStyle: '800',
    fontSize: '17px',
    color: primary ? CSS_COLOR.ink : CSS_COLOR.bone,
  }).setOrigin(0, 0.5);

  const parts: Phaser.GameObjects.GameObject[] = [bg, label];
  if (opts.hint) {
    parts.push(
      uiText(scene, opts.width - 16, h / 2, opts.hint, {
        fontFamily: FONT.mono,
        fontSize: '12px',
        color: primary ? CSS_COLOR.ink : CSS_COLOR.muted,
      }).setOrigin(1, 0.5).setAlpha(0.75),
    );
  }

  const button = scene.add.container(x, y, parts);
  button.setSize(opts.width, h);

  // Кликабельным делаем фон. Нажатие подсвечиваем прозрачностью.
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => button.setAlpha(0.8));
  bg.on('pointerout', () => button.setAlpha(1));
  bg.on('pointerup', () => {
    button.setAlpha(1);
    opts.onClick();
  });
  return button;
}

/** Затемнение на весь экран для модальных окон. Ловит клики, чтобы они не проходили насквозь. */
export function makeDim(scene: Phaser.Scene, w: number, h: number, alpha = 0.82) {
  return scene.add.rectangle(0, 0, w, h, COLOR.void, alpha).setOrigin(0, 0).setInteractive();
}
