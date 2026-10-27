import Phaser from 'phaser';
import { COLOR, CSS_COLOR, FONT } from '../config';
import { LEVELS } from '../data/levels';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import { getCharacter, getUnlockedLevel, newRun, saveCharacter } from '../core/RunState';
import { animKey } from '../art/sheets';
import { setupUiCamera, uiSize } from '../core/screen';
import { makeButton, uiText } from '../ui/widgets';
import { SCENE } from './keys';

/** Главное меню: название, правила, выбор героя и кнопки уровней, которые уже открыты. */
export class MenuScene extends Phaser.Scene {
  private character: CharacterId = 'hero';

  constructor() {
    super(SCENE.menu);
  }

  create() {
    this.character = getCharacter();
    setupUiCamera(this);
    this.cameras.main.setBackgroundColor(COLOR.void);
    this.layout();

    // При повороте телефона проще всего перестроить экран заново.
    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  private layout() {
    const { w, h } = uiSize(this);
    const width = Math.min(w - 32, 380);
    const x = (w - width) / 2;
    const unlocked = getUnlockedLevel();

    // Тёплое пятно света за заголовком.
    this.add.image(w / 2, h * 0.38, 'light').setScale(4).setTint(COLOR.ember).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);

    // Всё содержимое складываем в Container — потом сдвинем его целиком, чтобы отцентрировать.
    const column = this.add.container(x, 0);
    let y = 0;
    const add = (obj: Phaser.GameObjects.Text, gap: number) => {
      obj.setPosition(0, y);
      column.add(obj);
      y += obj.height + gap;
    };

    add(uiText(this, 0, 0, 'КАТАКОМБЫ · ТРИ УРОВНЯ', { fontSize: '11px', fontStyle: '600', color: CSS_COLOR.muted, letterSpacing: 3 }), 14);
    add(uiText(this, 0, 0, 'Фонарщик', { fontFamily: FONT.display, fontSize: `${Math.min(64, w * 0.14)}px`, color: CSS_COLOR.ember }), 16);
    add(
      uiText(this, 0, 0, 'Бродишь по катакомбам с фонарём. Стреляешь сам, по ближайшему врагу. Собери три осколка света на уровне, и откроется выход.', {
        wordWrap: { width },
        lineSpacing: 4,
      }),
      12,
    );
    add(uiText(this, 0, 0, 'Веди пальцем в любом месте экрана · WASD или стрелки', { fontFamily: FONT.mono, fontSize: '12px', color: CSS_COLOR.muted, wordWrap: { width } }), 20);

    add(uiText(this, 0, 0, 'ГЕРОЙ', { fontSize: '11px', fontStyle: '600', color: CSS_COLOR.muted, letterSpacing: 3 }), 8);
    y += this.addCharacterPicker(column, y, width) + 20;

    LEVELS.slice(0, unlocked + 1).forEach((level, i) => {
      const isFirstRun = unlocked === 0;
      const button = makeButton(this, 0, y, {
        width,
        label: isFirstRun ? 'Спуститься' : `${i + 1}. ${level.name}`,
        hint: isFirstRun ? '→' : i === 0 ? 'с нуля' : `+${i * 2} усиления`,
        primary: i === unlocked,
        onClick: () => this.scene.start(SCENE.game, { run: newRun(this.character, i) }),
      });
      column.add(button);
      y += 56;
    });

    column.y = Math.max(24, (h - y) / 2);
  }

  /**
   * Карточки персонажей в ряд. Выбранный идёт на месте (анимация walk), остальные дышат (idle).
   * Возвращает высоту ряда.
   */
  private addCharacterPicker(column: Phaser.GameObjects.Container, y: number, width: number) {
    const gap = 12;
    const cardW = (width - gap * (CHARACTER_IDS.length - 1)) / CHARACTER_IDS.length;
    const cardH = 124;

    const cards = CHARACTER_IDS.map((id, i) => {
      const def = CHARACTERS[id];
      const bg = this.add.rectangle(0, 0, cardW, cardH, COLOR.panel, 1).setOrigin(0, 0);
      // Кадр 32×32 увеличиваем вдвое; pixelArt в main.ts сохраняет пиксели чёткими.
      const sprite = this.add.sprite(cardW / 2, 38, id).setScale(2);
      const name = uiText(this, cardW / 2, 74, def.name, { fontStyle: '800', fontSize: '15px' }).setOrigin(0.5, 0);
      const desc = uiText(this, cardW / 2, 94, def.desc, {
        fontSize: '11px',
        color: CSS_COLOR.muted,
        align: 'center',
        wordWrap: { width: cardW - 12 },
      }).setOrigin(0.5, 0);

      const card = this.add.container(i * (cardW + gap), y, [bg, sprite, name, desc]);
      column.add(card);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => {
        this.character = id;
        saveCharacter(id);
        refresh();
      });
      return { id, bg, sprite, name };
    });

    const refresh = () => {
      for (const c of cards) {
        const selected = c.id === this.character;
        c.bg.setStrokeStyle(selected ? 2 : 1, selected ? COLOR.ember : COLOR.bone, selected ? 1 : 0.2);
        c.sprite.play(animKey(c.id, selected ? 'walk' : 'idle'), true).setAlpha(selected ? 1 : 0.55);
        c.name.setColor(selected ? CSS_COLOR.ember : CSS_COLOR.bone);
      }
    };
    refresh();
    return cardH;
  }
}
