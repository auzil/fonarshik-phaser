import Phaser from 'phaser';
import { COLOR, CSS_COLOR, FONT } from '../config';
import type { Choice } from '../data/upgrades';
import { setupUiCamera, uiSize } from '../core/screen';
import { makeDim, uiText } from '../ui/widgets';
import { SCENE } from './keys';

export interface LevelUpOffer {
  kicker: string;
  choices: Choice[];
}

/**
 * Данные, с которыми GameScene запускает эту сцену.
 * Сцена ничего не знает об игре: только показывает карточки и сообщает о выборе.
 */
export interface LevelUpData {
  /** Следующий набор карточек или null, если усиления закончились. */
  nextOffer: () => LevelUpOffer | null;
  onPick: (choice: Choice) => void;
  onDone: () => void;
}

const CARD_GAP = 8;

/** Экран выбора усиления: затемнение и три карточки. */
export class LevelUpScene extends Phaser.Scene {
  /** Не называем поле `data`: у Phaser.Scene уже есть свойство data (DataManager). */
  private source!: LevelUpData;
  private content?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE.levelUp);
  }

  init(data: LevelUpData) {
    this.source = data;
  }

  create() {
    setupUiCamera(this);
    const { w, h } = uiSize(this);
    makeDim(this, w, h, 0.78);

    const offer = this.source.nextOffer();
    if (offer) this.show(offer);
    else this.finish();
  }

  private show(offer: LevelUpOffer) {
    this.content?.destroy();
    const { w, h } = uiSize(this);
    const width = Math.min(w - 32, 380);
    const column = this.add.container((w - width) / 2, 0);
    this.content = column;

    let y = 0;
    const kicker = uiText(this, 0, y, offer.kicker.toUpperCase(), { fontSize: '11px', fontStyle: '600', color: CSS_COLOR.muted, letterSpacing: 3 });
    y += kicker.height + 10;
    const title = uiText(this, 0, y, 'Выбери усиление', { fontFamily: FONT.display, fontSize: '32px', color: CSS_COLOR.ember });
    y += title.height + 16;
    column.add([kicker, title]);

    for (const choice of offer.choices) {
      const card = this.makeCard(choice, width);
      card.setY(y);
      column.add(card);
      y += card.height + CARD_GAP;
    }

    column.y = Math.max(16, (h - y) / 2);
  }

  /** Карточка: иконка в кружке, подпись, название и описание. Высота зависит от длины описания. */
  private makeCard(choice: Choice, width: number) {
    const isWeapon = choice.kind === 'weapon';
    const accent = isWeapon ? COLOR.ember : COLOR.soul;
    const accentCss = isWeapon ? CSS_COLOR.ember : CSS_COLOR.soul;
    const pad = 14;
    const textX = pad + 34 + 12;
    const textW = width - textX - pad;

    const tag = uiText(this, textX, pad, choice.tag.toUpperCase(), { fontSize: '10px', fontStyle: '600', color: isWeapon ? CSS_COLOR.ember : CSS_COLOR.muted, letterSpacing: 2 });
    const name = uiText(this, textX, tag.y + tag.height + 3, choice.name, { fontSize: '16px', fontStyle: '800' });
    const desc = uiText(this, textX, name.y + name.height + 3, choice.desc, { fontSize: '13px', color: CSS_COLOR.muted, wordWrap: { width: textW } });
    const height = desc.y + desc.height + pad;

    const bg = this.add.rectangle(0, 0, width, height, COLOR.panel, 0.95).setOrigin(0, 0).setStrokeStyle(1, accent, 0.45);
    const ring = this.add.circle(pad + 17, height / 2, 17).setStrokeStyle(1, accent, 0.5);
    const glyph = uiText(this, pad + 17, height / 2, choice.glyph, { fontFamily: FONT.mono, fontSize: '15px', color: accentCss }).setOrigin(0.5);

    const card = this.add.container(0, 0, [bg, ring, glyph, tag, name, desc]);
    card.setSize(width, height);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setStrokeStyle(1, accent, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(1, accent, 0.45));
    bg.on('pointerup', () => this.pick(choice));
    return card;
  }

  private pick(choice: Choice) {
    this.source.onPick(choice);
    const next = this.source.nextOffer();
    if (next) this.show(next);
    else this.finish();
  }

  private finish() {
    this.scene.stop();
    this.source.onDone();
  }
}
