import Phaser from 'phaser';
import { DEPTH } from '../config';
import { ENEMIES, type EnemyDef, type EnemyKind } from '../data/enemies';
import { SHEETS, animKey, type SheetDef } from '../art/sheets';

/**
 * Враг. Сам по себе он «глупый»: умеет идти к точке, получать урон и гореть.
 * Куда идти, решает GameScene с помощью FlowField.
 *
 * Внешний вид бывает двух видов:
 *   - круг, нарисованный кодом (art/textures.ts), который смотрит глазами на героя;
 *   - спрайтшит с анимациями run/bite (art/sheets.ts), который разворачивается flipX.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly def: EnemyDef;
  readonly maxHp: number;
  hp: number;

  /** Отбрасывание от попаданий: добавляется к скорости и быстро затухает. */
  private knockX = 0;
  private knockY = 0;
  private flashTime = 0;
  private burnTime = 0;
  private readonly speedJitter = Phaser.Math.FloatBetween(0.9, 1.1);
  private facing = 0;

  /** Таймеры, которые используют разные системы. */
  biteCooldown = 0;
  bladeCooldown = 0;

  /** Глаза — отдельный спрайт поверх слоя тьмы, чтобы светиться в темноте. */
  readonly eyes: Phaser.GameObjects.Image;
  /** Спрайтшит врага, если он нарисован картинкой. */
  private readonly sheet: SheetDef | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind, hpMultiplier: number) {
    const texture = `enemy-${kind}`;
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = kind;
    this.def = ENEMIES[kind];
    this.maxHp = this.def.hp * hpMultiplier;
    this.hp = this.maxHp;

    this.setDepth(DEPTH.enemies);
    // Круг по центру кадра: смещение = половина кадра − радиус.
    const offset = this.width / 2 - this.def.radius;
    (this.body as Phaser.Physics.Arcade.Body).setCircle(this.def.radius, offset, offset);

    this.sheet = SHEETS[texture];
    if (this.sheet) {
      this.eyes = scene.add.image(x, y, 'eye').setTint(this.def.eyes).setDepth(DEPTH.glow);
      this.play(animKey(texture, 'run'));
      // У каждой крысы свой ритм, иначе вся стая бежит в ногу.
      this.anims.setProgress(Math.random());
      this.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animKey(texture, 'bite'), () => this.play(animKey(texture, 'run')));
    } else {
      this.eyes = scene.add
        .image(x, y, 'eyes')
        .setTint(this.def.eyes)
        .setScale(this.def.radius / 11)
        .setDepth(DEPTH.glow);
    }
  }

  get radius() {
    return this.def.radius;
  }

  get isDead() {
    return this.hp <= 0;
  }

  /**
   * Идти к точке (targetX, targetY), смотреть на (lookX, lookY).
   * Смотрит враг всегда на героя, а идёт — по шагам поля потока.
   */
  walkTowards(targetX: number, targetY: number, lookX: number, lookY: number, dt: number) {
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = this.def.speed * this.speedJitter;
    this.setVelocity(Math.cos(angle) * speed + this.knockX, Math.sin(angle) * speed + this.knockY);

    // Затухание отбрасывания, не зависящее от FPS: за 1/60 секунды остаётся 85%.
    const decay = Math.pow(0.85, dt * 60);
    this.knockX *= decay;
    this.knockY *= decay;

    this.facing = Math.atan2(lookY - this.y, lookX - this.x);
    // Порог, чтобы враг прямо над героем не дёргался влево-вправо.
    const lookDir = Math.cos(this.facing);
    if (this.sheet && Math.abs(lookDir) > 0.2) this.setFlipX(lookDir < 0);
    this.biteCooldown -= dt;
    this.updateTint(dt);
  }

  /** Анимация укуса (сам урон считает GameScene). */
  bite() {
    if (this.sheet) this.play(animKey(this.texture.key, 'bite'));
  }

  /** Урон с отбрасыванием (kx, ky — сила толчка в px/с). */
  hurt(amount: number, kx = 0, ky = 0) {
    this.hp -= amount;
    this.knockX += kx;
    this.knockY += ky;
    this.flashTime = 0.08;
  }

  /** Урон от огня: понемногу каждый кадр, без белой вспышки. */
  burn(damagePerSecond: number, dt: number) {
    this.hp -= damagePerSecond * dt;
    this.burnTime = 0.25;
  }

  get isBurning() {
    return this.burnTime > 0;
  }

  /**
   * Подкраска спрайта. В Phaser 4 у tint есть режимы:
   *   MULTIPLY (по умолчанию) — умножает цвета, как цветное стекло;
   *   FILL — заливает силуэт одним цветом. Им делаем белую вспышку при попадании.
   */
  private updateTint(dt: number) {
    this.flashTime = Math.max(0, this.flashTime - dt);
    this.burnTime = Math.max(0, this.burnTime - dt);

    if (this.flashTime > 0) {
      this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else if (this.burnTime > 0) {
      this.setTint(0xff9a5a).setTintMode(Phaser.TintModes.MULTIPLY);
    } else {
      this.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    }
  }

  /** Глаза смотрят на героя. Вызывается после шага физики. */
  syncEyes() {
    if (this.sheet?.eye) {
      const { x, y } = this.sheet.eye;
      this.eyes.setPosition(this.x + (this.flipX ? -x : x), this.y + y);
      return;
    }
    const r = this.def.radius * 0.45;
    this.eyes.setPosition(this.x + Math.cos(this.facing) * r * 0.3, this.y + Math.sin(this.facing) * r * 0.3).setRotation(this.facing);
  }

  destroy(fromScene?: boolean) {
    this.eyes.destroy();
    super.destroy(fromScene);
  }
}
