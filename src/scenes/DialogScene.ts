import Phaser from 'phaser';
import { CSS_COLOR, FONT, COLOR } from '../config';
import { setupUiCamera, uiSize } from '../core/screen';
import { makeButton, makeDim, uiText } from '../ui/widgets';
import { SCENE } from './keys';

export interface DialogButton {
  label: string;
  hint?: string;
  primary?: boolean;
  onClick: () => void;
}

export interface DialogData {
  kicker: string;
  title: string;
  /** Пары «подпись — значение» в ряд плиток. */
  stats?: Array<[string, string]>;
  buttons: DialogButton[];
}

/**
 * Универсальное модальное окно: пауза, победа, поражение.
 * Всё содержимое приходит в data — одна сцена на три разных экрана.
 */
export class DialogScene extends Phaser.Scene {
  constructor() {
    super(SCENE.dialog);
  }

  create(data: DialogData) {
    setupUiCamera(this);
    const { w, h } = uiSize(this);
    makeDim(this, w, h);

    const width = Math.min(w - 32, 380);
    const column = this.add.container((w - width) / 2, 0);
    let y = 0;

    const kicker = uiText(this, 0, y, data.kicker.toUpperCase(), { fontSize: '11px', fontStyle: '600', color: CSS_COLOR.muted, letterSpacing: 3 });
    y += kicker.height + 10;
    const title = uiText(this, 0, y, data.title, { fontFamily: FONT.display, fontSize: '36px', color: CSS_COLOR.ember, wordWrap: { width } });
    y += title.height + 18;
    column.add([kicker, title]);

    if (data.stats?.length) {
      const gap = 8;
      const tileW = (width - gap * (data.stats.length - 1)) / data.stats.length;
      data.stats.forEach(([label, value], i) => {
        const x = i * (tileW + gap);
        column.add([
          this.add.rectangle(x, y, tileW, 58, 0x000000, 0).setOrigin(0, 0).setStrokeStyle(1, COLOR.bone, 0.15),
          uiText(this, x + 10, y + 10, value, { fontFamily: FONT.mono, fontSize: '20px' }),
          uiText(this, x + 10, y + 38, label.toUpperCase(), { fontSize: '10px', color: CSS_COLOR.muted, letterSpacing: 1.5 }),
        ]);
      });
      y += 58 + 18;
    }

    for (const b of data.buttons) {
      column.add(
        makeButton(this, 0, y, {
          width,
          label: b.label,
          hint: b.hint,
          primary: b.primary,
          onClick: () => {
            this.scene.stop(); // сначала закрываем окно, потом выполняем действие
            b.onClick();
          },
        }),
      );
      y += 56;
    }

    column.y = Math.max(16, (h - y) / 2);
  }
}
