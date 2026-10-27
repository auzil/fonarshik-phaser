import Phaser from 'phaser';
import { DEPTH, RULES } from '../config';
import { BASE_STATS, type Stats } from '../data/upgrades';
import { POTIONS, type PotionKind } from '../data/potions';
import type { RunState } from '../core/RunState';
import { animKey } from '../art/sheets';
import type { CharacterId } from '../data/characters';

/**
 * Герой.
 *
 * Наследуемся от Phaser.Physics.Arcade.Sprite: это картинка + физическое тело.
 * Тело само двигается по velocity и упирается в стены (коллайдер настраивает GameScene).
 *
 * Пистолет и фонарь в руке — отдельные картинки, которые мы каждый кадр
 * ставим рядом с героем (syncAttachments).
 *
 * Внешность берём из спрайтшита выбранного персонажа (run.character).
 * Анимации (idle / walk / hurt) создаются в art/sheets.ts, здесь только выбираем,
 * какую играть: this.play(key, true) — true значит «не перезапускать, если уже играет».
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  static readonly RADIUS = 10;

  stats: Stats;
  hp: number;
  heroLevel: number;
  xp: number;

  /** Куда смотрит герой (угол движения). */
  facing = 0;
  /** Куда целится пистолет; null — целей нет. Заполняет оружие Pistol. */
  aimAngle: number | null = null;
  /** Действующие зелья: вид → сколько секунд осталось. */
  readonly buffs = new Map<PotionKind, number>();
  /** Сколько секунд ещё перепутано управление (попадание Морока). */
  confusedTime = 0;

  readonly character: CharacterId;
  /** Имена анимаций этого персонажа: 'heroine-walk' и т. п. */
  private readonly anim: Record<'idle' | 'walk' | 'hurt', string>;

  private readonly gun: Phaser.GameObjects.Image;
  private readonly lantern: Phaser.GameObjects.Image;
  private walkPhase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, run: RunState) {
    super(scene, x, y, run.character);
    scene.add.existing(this); // показать на экране
    scene.physics.add.existing(this); // дать физическое тело

    this.character = run.character;
    this.anim = {
      idle: animKey(run.character, 'idle'),
      walk: animKey(run.character, 'walk'),
      hurt: animKey(run.character, 'hurt'),
    };
    this.stats = { ...run.stats };
    this.hp = run.hp;
    this.heroLevel = run.heroLevel;
    this.xp = run.xp;

    this.setDepth(DEPTH.player);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Круглое тело радиусом 10 по центру кадра: смещение = половина кадра − радиус.
    const offset = this.width / 2 - Player.RADIUS;
    body.setCircle(Player.RADIUS, offset, offset);
    // Враги не могут толкать героя, а он их — может.
    body.pushable = false;

    this.gun = scene.add.image(x, y, 'gun').setOrigin(0, 0.5).setDepth(DEPTH.player + 0.1);
    this.lantern = scene.add.image(x, y, 'lantern').setDepth(DEPTH.player + 0.1);

    this.play(this.anim.idle);
    // После вспышки от удара возвращаемся к обычной анимации.
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.anim.hurt, () => this.play(this.anim.idle));
  }

  /** dirX, dirY — направление от -1 до 1 (джойстик или клавиатура). */
  move(dirX: number, dirY: number, dt: number) {
    this.setVelocity(dirX * this.moveSpeed, dirY * this.moveSpeed);
    const moving = dirX !== 0 || dirY !== 0;
    if (moving) {
      this.facing = Math.atan2(dirY, dirX);
      this.walkPhase += dt * 10;
    }

    // Стоим — смотрим на цель, идём — по ходу движения.
    // Порог 0.2: при ходьбе почти вертикально герой не дёргается влево-вправо.
    const lookX = moving ? dirX : this.aimAngle !== null ? Math.cos(this.aimAngle) : 0;
    if (Math.abs(lookX) > 0.2) this.setFlipX(lookX < 0);

    if (this.anims.getName() === this.anim.hurt && this.anims.isPlaying) return;
    this.play(moving ? this.anim.walk : this.anim.idle, true);
    // Сапоги скорости ускоряют и шаг, чтобы ноги не «скользили».
    this.anims.timeScale = moving ? this.moveSpeed / BASE_STATS.speed : 1;
  }

  /** Скорость с учётом зелий. */
  get moveSpeed() {
    return this.stats.speed * this.buffMultiplier('speed');
  }

  /** Пауза между выстрелами пистолета с учётом зелий. */
  get fireDelay() {
    return this.stats.fireDelay / this.buffMultiplier('fireRate');
  }

  /** Произведение множителей field у всех действующих зелий. */
  private buffMultiplier(field: 'speed' | 'fireRate') {
    let k = 1;
    for (const kind of this.buffs.keys()) k *= POTIONS[kind][field] ?? 1;
    return k;
  }

  drink(kind: PotionKind) {
    const def = POTIONS[kind];
    if (def.heal) this.heal(def.heal);
    // Повторное зелье того же вида не складывается, а продлевает время.
    if (def.duration) this.buffs.set(kind, def.duration);
  }

  updateBuffs(dt: number) {
    for (const [kind, left] of this.buffs) {
      if (left <= dt) this.buffs.delete(kind);
      else this.buffs.set(kind, left - dt);
    }
    this.confusedTime = Math.max(0, this.confusedTime - dt);
    // Пока управление спутано, герой подкрашен фиолетовым.
    if (this.isConfused) this.setTint(0xc9a2ff);
    else this.clearTint();
  }

  get isConfused() {
    return this.confusedTime > 0;
  }

  /** Перепутать управление на seconds. Повторное попадание продлевает, а не складывает. Возвращает true, если путаница только началась. */
  confuse(seconds: number): boolean {
    const wasConfused = this.isConfused;
    this.confusedTime = Math.max(this.confusedTime, seconds);
    return !wasConfused;
  }

  regenerate(dt: number) {
    if (this.stats.regen > 0) this.heal(this.stats.regen * dt);
  }

  heal(amount: number) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  /** Возвращает true, если герой погиб. */
  takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.play(this.anim.hurt);
    return this.hp <= 0;
  }

  /** Добавляет опыт и возвращает, сколько уровней герой получил. */
  addXp(amount: number): number {
    this.xp += amount;
    let gained = 0;
    while (this.xp >= RULES.xpToNext(this.heroLevel)) {
      this.xp -= RULES.xpToNext(this.heroLevel);
      this.heroLevel++;
      gained++;
    }
    return gained;
  }

  /**
   * Ставим пистолет и фонарь рядом с героем.
   * GameScene вызывает это ПОСЛЕ шага физики, иначе они отставали бы на кадр.
   */
  syncAttachments() {
    const bob = Math.sin(this.walkPhase) * 1.2;
    const aim = this.aimAngle ?? this.facing;
    this.gun.setPosition(this.x + Math.cos(aim) * 5, this.y + Math.sin(aim) * 5).setRotation(aim);
    this.lantern.setPosition(this.x + Math.cos(this.facing + 1.1) * 12, this.y + Math.sin(this.facing + 1.1) * 12 + bob);
  }

  /** Снимок героя для следующего уровня. */
  toRun(levelIndex: number): RunState {
    return { character: this.character, levelIndex, stats: { ...this.stats }, hp: this.hp, heroLevel: this.heroLevel, xp: this.xp, pendingUpgrades: 0 };
  }

  destroy(fromScene?: boolean) {
    this.gun.destroy();
    this.lantern.destroy();
    super.destroy(fromScene);
  }
}
