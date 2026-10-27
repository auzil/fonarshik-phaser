import Phaser from 'phaser';
import { COLOR, CSS_COLOR, FONT, RULES } from '../config';
import { WEAPON_IDS, WEAPON_INFO } from '../data/upgrades';
import { POTIONS } from '../data/potions';
import { joystick } from '../core/joystick';
import { setupUiCamera, uiSize } from '../core/screen';
import { makeButton, uiText } from '../ui/widgets';
import { GAME_EVENT, type GameScene } from './GameScene';
import { SCENE } from './keys';

const JOY_RADIUS = 56;
const BAR_W = 200;

/**
 * Интерфейс поверх игры: здоровье, опыт, счётчики, кнопка паузы, надписи и джойстик.
 *
 * HUD — отдельная сцена: у неё своя камера, которая не двигается вместе с миром
 * и не зумится. Данные HUD читает прямо из GameScene каждый кадр.
 */
export class HudScene extends Phaser.Scene {
  private world!: GameScene;
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private metaText!: Phaser.GameObjects.Text;
  private weaponsText!: Phaser.GameObjects.Text;
  private buffsText!: Phaser.GameObjects.Text;
  private shardsText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private hurtOverlay!: Phaser.GameObjects.Rectangle;
  private pauseButton!: Phaser.GameObjects.Container;
  private joyGfx!: Phaser.GameObjects.Graphics;
  private joyPointer: { id: number; ox: number; oy: number; x: number; y: number } | null = null;

  constructor() {
    super(SCENE.hud);
  }

  init(data: { gameScene: GameScene }) {
    this.world = data.gameScene;
    this.joyPointer = null;
  }

  create() {
    setupUiCamera(this);

    this.hurtOverlay = this.add.rectangle(0, 0, 10, 10, COLOR.blood, 0).setOrigin(0, 0);
    this.bars = this.add.graphics();
    this.hpText = uiText(this, 0, 0, '', { fontFamily: FONT.mono, fontSize: '10px' });
    this.metaText = uiText(this, 0, 0, '', { fontFamily: FONT.mono, fontSize: '11px', color: CSS_COLOR.muted });
    this.weaponsText = uiText(this, 0, 0, '', { fontFamily: FONT.mono, fontSize: '12px', color: CSS_COLOR.ember });
    this.buffsText = uiText(this, 0, 0, '', { fontFamily: FONT.mono, fontSize: '12px', color: CSS_COLOR.bone });
    this.shardsText = uiText(this, 0, 0, '', { fontFamily: FONT.mono, fontSize: '12px', color: CSS_COLOR.ember }).setOrigin(1, 0);
    this.toastText = uiText(this, 0, 0, '', { fontFamily: FONT.display, fontSize: '22px', color: CSS_COLOR.ember, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0).setAlpha(0);
    this.joyGfx = this.add.graphics();

    this.layout();
    this.setupJoystick();

    // Слушаем события игры. Обязательно отписываемся, когда HUD выключается.
    const worldEvents = this.world.events;
    worldEvents.on(GAME_EVENT.toast, this.showToast, this);
    worldEvents.on(GAME_EVENT.hurt, this.flashHurt, this);
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      worldEvents.off(GAME_EVENT.toast, this.showToast, this);
      worldEvents.off(GAME_EVENT.hurt, this.flashHurt, this);
      this.scale.off('resize', this.layout, this);
      joystick.reset();
    });
  }

  /** Расставляем элементы по краям экрана (вызывается и при повороте телефона). */
  private layout() {
    const { w, h } = uiSize(this);
    const left = 16;
    const top = 12;

    this.hurtOverlay.setSize(w, h);
    this.hpText.setPosition(left + 6, top + 2);
    this.metaText.setPosition(left, top + 28);
    this.weaponsText.setPosition(left, top + 46);
    this.buffsText.setPosition(left, top + 64);
    this.shardsText.setPosition(w - 16, top + 2);
    this.toastText.setPosition(w / 2, top + 84);

    this.pauseButton?.destroy();
    this.pauseButton = makeButton(this, w - 16 - 76, top + 24, {
      width: 76,
      height: 30,
      label: 'Пауза',
      primary: false,
      onClick: () => this.world.pauseGame(),
    });
    // Меньший шрифт для маленькой кнопки.
    (this.pauseButton.getAt(1) as Phaser.GameObjects.Text).setFontSize(13);
  }

  update() {
    const p = this.world.player;
    if (!p?.active) return;
    const s = p.stats;
    const left = 16;
    const top = 12;

    // Полоски здоровья и опыта рисуем заново каждый кадр — это дёшево.
    const g = this.bars.clear();
    g.fillStyle(0x000000, 0.55).fillRect(left, top, BAR_W, 14);
    g.fillStyle(COLOR.blood, 1).fillRect(left, top, BAR_W * (p.hp / s.maxHp), 14);
    g.lineStyle(1, COLOR.bone, 0.18).strokeRect(left, top, BAR_W, 14);
    g.fillStyle(0x000000, 0.55).fillRect(left, top + 18, BAR_W, 6);
    g.fillStyle(COLOR.soul, 1).fillRect(left, top + 18, BAR_W * (p.xp / RULES.xpToNext(p.heroLevel)), 6);

    // setText перерисовывает текстуру текста даже при том же значении, поэтому сравниваем сами.
    setIfChanged(this.hpText, `${Math.ceil(p.hp)} / ${s.maxHp}`);
    setIfChanged(this.metaText, `ур. ${p.heroLevel}   убито ${this.world.kills}   ${this.world.levelDef.name}`);
    setIfChanged(this.weaponsText, WEAPON_IDS.filter(id => s[id] > 0).map(id => `${WEAPON_INFO[id].glyph} ${s[id]}`).join('   '));

    // Действующие зелья и путаница с оставшимися секундами.
    const effects = [...p.buffs].map(([kind, left]) => `${POTIONS[kind].glyph} ${POTIONS[kind].name} ${Math.ceil(left)}`);
    if (p.isConfused) effects.unshift(`⟲ Морок ${Math.ceil(p.confusedTime)}`);
    setIfChanged(this.buffsText, effects.join('   '));

    const o = this.world.objectives;
    setIfChanged(this.shardsText, o.exitOpen ? '◆ выход открыт' : `◆ ${o.taken}/${o.total}`);
    this.shardsText.setColor(o.exitOpen ? CSS_COLOR.soul : CSS_COLOR.ember);

    this.drawJoystick();
  }

  /* ───────────── надписи и вспышки ───────────── */

  private showToast(text: string) {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setAlpha(0);
    // Цепочка твинов: появиться → подождать → исчезнуть.
    this.tweens.chain({
      targets: this.toastText,
      tweens: [
        { alpha: 1, duration: 200 },
        { alpha: 0, duration: 300, delay: 1500 },
      ],
    });
  }

  private flashHurt() {
    this.tweens.killTweensOf(this.hurtOverlay);
    this.hurtOverlay.setFillStyle(COLOR.blood, 0.28);
    this.tweens.add({ targets: this.hurtOverlay, fillAlpha: 0, duration: 350 });
  }

  /* ───────────── виртуальный джойстик ───────────── */

  /**
   * «Плавающий» джойстик: касаешься в любом месте — там появляется центр,
   * ведёшь палец — герой идёт в эту сторону. Если увести палец далеко, центр подтягивается следом.
   */
  private setupJoystick() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return; // нажали на кнопку — это не джойстик
      if (!this.scene.isActive(SCENE.game) || this.joyPointer) return; // игра на паузе
      const pos = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      this.joyPointer = { id: pointer.id, ox: pos.x, oy: pos.y, x: pos.x, y: pos.y };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const j = this.joyPointer;
      if (!j || pointer.id !== j.id) return;
      const pos = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      j.x = pos.x;
      j.y = pos.y;

      let dx = j.x - j.ox;
      let dy = j.y - j.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > JOY_RADIUS) {
        j.ox = j.x - (dx / dist) * JOY_RADIUS;
        j.oy = j.y - (dy / dist) * JOY_RADIUS;
        dx = j.x - j.ox;
        dy = j.y - j.oy;
      }
      // Мёртвая зона 6px, чтобы герой не дёргался от дрожания пальца.
      if (dist > 6) {
        joystick.x = dx / JOY_RADIUS;
        joystick.y = dy / JOY_RADIUS;
      } else {
        joystick.reset();
      }
    });

    const release = (pointer: Phaser.Input.Pointer) => {
      if (this.joyPointer && pointer.id === this.joyPointer.id) {
        this.joyPointer = null;
        joystick.reset();
      }
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private drawJoystick() {
    const g = this.joyGfx.clear();
    const j = this.joyPointer;
    if (!j || !this.scene.isActive(SCENE.game)) {
      if (j) {
        this.joyPointer = null;
        joystick.reset();
      }
      return;
    }
    g.lineStyle(2, COLOR.bone, 0.25).strokeCircle(j.ox, j.oy, JOY_RADIUS);
    g.fillStyle(COLOR.ember, 0.55).fillCircle(j.x, j.y, 18);
  }
}

function setIfChanged(text: Phaser.GameObjects.Text, value: string) {
  if (text.text !== value) text.setText(value);
}
