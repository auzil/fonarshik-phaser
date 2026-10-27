import Phaser from 'phaser';
import { COLOR, DEPTH, RULES, TILE } from '../config';
import { LEVELS, type LevelDef } from '../data/levels';
import { rollChoices, WEAPON_IDS, type Choice, type WeaponId } from '../data/upgrades';
import { cloneRun, isLastLevel, unlockLevel, type RunState } from '../core/RunState';
import { DPR } from '../core/screen';
import { joystick } from '../core/joystick';
import { LevelMap, COLLIDING_TILES } from '../world/LevelMap';
import { FlowField } from '../world/FlowField';
import { hasLineOfSight } from '../world/lineOfSight';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet, type BulletOptions } from '../entities/Bullet';
import { Darkness } from '../systems/Darkness';
import { Effects } from '../systems/Effects';
import { EnemySpawner } from '../systems/EnemySpawner';
import { XpGems } from '../systems/XpGems';
import { Potions } from '../systems/Potions';
import { EnemyShots } from '../systems/EnemyShots';
import type { RangedAttack } from '../data/enemies';
import { POTIONS, rollPotion, type PotionKind } from '../data/potions';
import { Objectives } from '../systems/Objectives';
import { Pistol, WEAPON_FACTORY, type Weapon, type WeaponHost } from '../weapons';
import type { DialogData } from './DialogScene';
import type { LevelUpData, LevelUpOffer } from './LevelUpScene';
import { SCENE } from './keys';

/** События, которые GameScene шлёт наружу (их слушает HudScene). */
export const GAME_EVENT = {
  toast: 'toast',
  hurt: 'hurt',
} as const;

/**
 * Главная сцена: один уровень катакомб.
 *
 * Сама сцена почти ничего не «умеет» — она собирает системы и связывает их:
 *   LevelMap + FlowField  — где стены и как ходить
 *   Player, Enemy, Bullet — сущности с физическими телами
 *   EnemySpawner, EnemyShots, XpGems, Potions, Objectives, Darkness, Effects — системы
 *   Weapon[]              — всё оружие героя
 *
 * Порядок кадра:
 *   update()     — ввод, ИИ врагов, оружие, подбор предметов
 *   (физика Phaser двигает тела и решает столкновения)
 *   lateUpdate() — прицепить пистолет/глаза к новым позициям, нарисовать тьму
 */
export class GameScene extends Phaser.Scene implements WeaponHost {
  // Публичное — нужно оружию (WeaponHost) и HUD.
  map!: LevelMap;
  player!: Player;
  bullets!: Phaser.GameObjects.Group;
  fx!: Effects;
  darkness!: Darkness;
  objectives!: Objectives;
  levelDef!: LevelDef;
  kills = 0;
  elapsed = 0;

  private run!: RunState;
  private runAtStart!: RunState;
  private flow!: FlowField;
  private enemies!: Phaser.GameObjects.Group;
  private spawner!: EnemySpawner;
  private gems!: XpGems;
  private potions!: Potions;
  private enemyShots!: EnemyShots;
  private weapons: Weapon[] = [];
  private ownedWeapons = new Set<WeaponId>();
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private hpBars!: Phaser.GameObjects.Graphics;
  private pendingUpgrades = 0;
  private finished = false;
  /** Уже предупредили, что масло кончается (сбрасывается, когда долили). */
  private warnedLowFuel = false;

  constructor() {
    super(SCENE.game);
  }

  /**
   * init() вызывается при каждом (пере)запуске сцены с данными из scene.start(..., data).
   * Важно: объект сцены один и тот же между перезапусками, поэтому все счётчики сбрасываем здесь.
   */
  init(data: { run: RunState }) {
    this.run = data.run;
    this.runAtStart = cloneRun(data.run);
    this.kills = 0;
    this.elapsed = 0;
    this.weapons = [];
    this.ownedWeapons = new Set();
    this.pendingUpgrades = data.run.pendingUpgrades;
    this.finished = false;
    this.warnedLowFuel = false;
  }

  create() {
    this.levelDef = LEVELS[this.run.levelIndex];
    this.map = new LevelMap(this.levelDef);
    this.flow = new FlowField(this.map);

    const walls = this.createTilemap();

    this.fx = new Effects(this);
    this.darkness = new Darkness(this, this.map);
    this.objectives = new Objectives(this, this.map);
    this.gems = new XpGems(this);
    this.potions = new Potions(this);
    this.enemyShots = new EnemyShots(this, this.fx);
    // Банки масла, расставленные на карте, лежат, пока их не подберут.
    for (const spot of this.map.oilSpots) this.potions.drop(spot.x, spot.y, 'oil', Infinity);

    this.player = new Player(this, this.map.start.x, this.map.start.y, this.run);
    // Обычные (не физические) группы: просто списки объектов, которые удобно передать в коллайдер.
    this.enemies = this.add.group();
    this.bullets = this.add.group();

    this.spawner = new EnemySpawner({
      scene: this,
      map: this.map,
      flow: this.flow,
      level: this.levelDef,
      levelIndex: this.run.levelIndex,
      enemies: this.enemies,
      // Свет тускнеет без масла — и враги появляются ближе.
      hero: () => ({ x: this.player.x, y: this.player.y, light: this.player.lightRadius }),
    });

    this.setupCollisions(walls);
    this.setupCamera();
    this.setupKeyboard();

    this.weapons.push(new Pistol(this));
    this.syncWeapons();

    this.hpBars = this.add.graphics().setDepth(DEPTH.hpBars);

    this.flow.update(this.player.x, this.player.y);

    // Подписки на события. Всё, на что подписались, отписываем при выключении сцены,
    // иначе после перезапуска обработчики будут срабатывать по два раза.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.lateUpdate, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.lateUpdate, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
      this.weapons.forEach(w => w.destroy?.());
      this.scene.stop(SCENE.hud);
      joystick.reset();
    });

    // HUD — отдельная сцена поверх этой.
    this.scene.launch(SCENE.hud, { gameScene: this });
    this.time.delayedCall(50, () => {
      this.toast(`${this.run.levelIndex + 1}. ${this.levelDef.name}`);
      this.openLevelUp(); // бонусные усиления, если начали не с первого уровня
    });
  }

  /* ───────────────────────── создание мира ───────────────────────── */

  /** Тайлмап из массива чисел + коллизии со стенами. */
  private createTilemap() {
    const tilemap = this.make.tilemap({ data: this.map.toTileData(this.run.levelIndex + 7), tileWidth: TILE, tileHeight: TILE });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    if (!tileset) throw new Error('Не нашёлся тайлсет "tiles"');
    // createLayer может вернуть и GPU-слой (новинка Phaser 4), но по умолчанию это обычный TilemapLayer.
    const layer = tilemap.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer | null;
    if (!layer) throw new Error('Не удалось создать слой карты');
    layer.setDepth(DEPTH.floor);
    layer.setCollision(COLLIDING_TILES); // эти тайлы будут твёрдыми для физики
    return layer;
  }

  private setupCollisions(walls: Phaser.Tilemaps.TilemapLayer) {
    const physics = this.physics.add;

    // collider — тела расталкиваются; overlap — только сообщает о пересечении.
    // Порядок важен: Phaser проверяет коллайдеры по очереди. Сначала тела расталкивают друг друга,
    // а стены — последними, чтобы после всех толчков никто не остался внутри стены.
    physics.collider(this.enemies, this.enemies); // враги не слипаются в одну точку
    physics.collider(this.player, this.enemies, (_player, enemy) => this.onEnemyTouch(enemy as Enemy));
    physics.collider(this.player, walls);
    physics.collider(this.enemies, walls);

    physics.collider(this.bullets, walls, bullet => {
      const b = bullet as Bullet;
      this.fx.burst(b.x, b.y, 0xffcf8a, 4);
      b.destroy();
    });

    physics.overlap(this.bullets, this.enemies, (bullet, enemy) => this.onBulletHit(bullet as Bullet, enemy as Enemy));
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor(COLOR.void);
    cam.setBounds(0, 0, this.map.pixelWidth, this.map.pixelHeight);
    // Плавное следование: 0.12 — какую долю расстояния до героя камера проходит за кадр.
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(worldZoom());
    cam.centerOn(this.player.x, this.player.y); // сразу на героя, без «подлёта» с угла карты

    const onResize = () => cam.setZoom(worldZoom());
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
  }

  private setupKeyboard() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D,
    }) as GameScene['keys'];
    this.input.keyboard!.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard!.on('keydown-P', () => this.pauseGame());
  }

  /* ───────────────────────── игровой цикл ───────────────────────── */

  update(_time: number, deltaMs: number) {
    if (this.finished) return;
    // Ограничиваем шаг, чтобы после лага (вкладка в фоне) всё не «телепортировалось».
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.elapsed += dt;

    const dir = this.readInput();
    // Попал Морок — управление наоборот.
    if (this.player.isConfused) {
      dir.x = -dir.x;
      dir.y = -dir.y;
    }
    this.player.move(dir.x, dir.y, dt);
    this.player.regenerate(dt);
    this.player.updateBuffs(dt);
    this.player.burnFuel(dt);
    this.checkFuel();

    this.flow.update(this.player.x, this.player.y);
    this.spawner.update(dt);
    this.steerEnemies(dt);

    for (const weapon of this.weapons) weapon.update(dt);
    this.tickBullets(dt);
    for (const attack of this.enemyShots.update(dt, this.player, this.map, this.darkness)) this.onShotHit(attack);
    if (this.finished) return; // снаряд мог добить героя
    this.removeDeadEnemies();

    const xp = this.gems.update(dt, this.player, this.darkness);
    if (xp > 0) this.gainXp(xp);
    for (const kind of this.potions.update(dt, this.player, this.darkness)) this.drinkPotion(kind);

    this.potionSparks();
    this.checkObjectives();
  }

  /** Вызывается после шага физики (событие POST_UPDATE). */
  private lateUpdate() {
    const p = this.player;
    p.keepOutOfWalls(this.map);
    p.syncAttachments();
    for (const enemy of this.livingEnemies()) enemy.syncEyes();
    this.drawHealthBars();

    // Свет собираем со всех и рисуем тьму одним проходом.
    // Когда масла мало, фонарь мерцает сильнее.
    const shaky = 1 + (1 - Math.min(1, p.fuelRatio / RULES.fuelFullLightAt)) * 2.5;
    const flicker = 1 + (Math.sin(this.time.now * 0.011) * 0.015 + Math.sin(this.time.now * 0.0043) * 0.02) * shaky;
    const light = p.lightRadius * flicker;
    this.darkness.setLantern(p.x, p.y, light); // фонарь не светит сквозь стены
    for (const b of this.bullets.getChildren() as Bullet[]) this.darkness.addLight(b.x, b.y, 26, 0.45);
    this.objectives.addLights(this.darkness);
    this.darkness.render();
  }

  /** Клавиатура + виртуальный джойстик → вектор длиной не больше 1. */
  private readInput() {
    const k = this.keys;
    let x = joystick.x;
    let y = joystick.y;
    if (k.left.isDown || k.a.isDown) x -= 1;
    if (k.right.isDown || k.d.isDown) x += 1;
    if (k.up.isDown || k.w.isDown) y -= 1;
    if (k.down.isDown || k.s.isDown) y += 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /**
   * ИИ врагов: рядом и в прямой видимости — идём прямо на героя, иначе по полю потока.
   * Стрелки (def.ranged), которые видят героя, останавливаются на дистанции и стреляют.
   */
  private steerEnemies(dt: number) {
    const p = this.player;
    for (const enemy of this.livingEnemies()) {
      const attack = enemy.def.ranged;
      if (attack && this.steerShooter(enemy, attack, dt)) continue;

      let targetX = p.x;
      let targetY = p.y;
      const near = Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y) < TILE * 2.5;
      if (!near || !hasLineOfSight(this.map, enemy.x, enemy.y, p.x, p.y)) {
        const step = this.flow.nextStep(enemy.x, enemy.y);
        if (step) {
          targetX = step.x;
          targetY = step.y;
        }
      }
      enemy.walkTowards(targetX, targetY, p.x, p.y, dt);
    }
  }

  private tickBullets(dt: number) {
    for (const bullet of [...this.bullets.getChildren()] as Bullet[]) {
      if (!bullet.tick(dt)) bullet.destroy();
    }
  }

  private removeDeadEnemies() {
    for (const enemy of [...this.enemies.getChildren()] as Enemy[]) {
      if (!enemy.isDead) continue;
      this.kills++;
      this.fx.burst(enemy.x, enemy.y, Phaser.Display.Color.HexStringToColor(enemy.def.body).color, 10);
      this.gems.drop(enemy.x, enemy.y, enemy.def.xp);
      // Чуть в сторону, чтобы зелье не лежало прямо под кристаллом.
      if (Math.random() < enemy.def.potionChance) this.potions.drop(enemy.x + 8, enemy.y + 4, rollPotion());
      if (Math.random() < RULES.oilDropChance) this.potions.drop(enemy.x - 8, enemy.y + 4, 'oil');
      enemy.destroy();
    }
  }

  private drawHealthBars() {
    const g = this.hpBars.clear();
    for (const e of this.livingEnemies()) {
      if (e.hp >= e.maxHp) continue;
      const w = e.radius * 2;
      const x = e.x - e.radius;
      const y = e.y - e.radius - 7;
      g.fillStyle(0x000000, 0.6).fillRect(x, y, w, 3);
      g.fillStyle(COLOR.blood, 1).fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 3);
    }
  }

  /** Возвращает true, если стрелок в этот кадр стоит и целится (тогда обычное движение не нужно). */
  private steerShooter(enemy: Enemy, attack: RangedAttack, dt: number): boolean {
    const p = this.player;
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y);
    // Толщина 4 — как у сгустка, чтобы не стрелять в угол стены.
    const canShoot = dist < attack.range && hasLineOfSight(this.map, enemy.x, enemy.y, p.x, p.y, 4);

    if (enemy.updateRanged(dt, canShoot)) {
      const hand = enemy.handPosition;
      this.enemyShots.fire(hand.x, hand.y, Math.atan2(p.y - hand.y, p.x - hand.x), attack);
    }
    if (enemy.isCasting) this.darkness.addLight(enemy.x, enemy.y, 30, 0.45); // замах видно в темноте

    // Видит героя и уже достаточно близко — стоит. Иначе подходит, как все.
    if (enemy.isCasting || (canShoot && dist < attack.range * 0.75)) {
      enemy.holdPosition(p.x, p.y, dt);
      return true;
    }
    return false;
  }

  /* ───────────────────────── столкновения ───────────────────────── */

  private onEnemyTouch(enemy: Enemy) {
    if (enemy.biteCooldown > 0 || this.finished) return;
    enemy.biteCooldown = RULES.contactCooldown;
    enemy.bite();

    this.damagePlayer(enemy.def.damage);
  }

  private onShotHit(attack: RangedAttack) {
    if (this.finished) return;
    if (attack.confuse > 0 && this.player.confuse(attack.confuse)) this.toast('Управление спуталось!');
    this.damagePlayer(attack.damage);
  }

  private damagePlayer(amount: number) {
    const died = this.player.takeDamage(amount);
    this.fx.shake(0.005, 120);
    this.fx.vibrate();
    this.events.emit(GAME_EVENT.hurt);
    if (died) this.gameOver();
  }

  private onBulletHit(bullet: Bullet, enemy: Enemy) {
    if (enemy.isDead) return;
    // Направление полёта читаем до tryHit: пуля может там же исчезнуть.
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    const dir = body.velocity.clone().normalize();
    const damage = bullet.damage;
    if (!bullet.tryHit(enemy)) return;

    enemy.hurt(damage, dir.x * 70, dir.y * 70);
    this.fx.burst(enemy.x - dir.x * enemy.radius, enemy.y - dir.y * enemy.radius, 0xffd9a0, 3);
  }

  /* ───────────────────────── цели уровня ───────────────────────── */

  private checkObjectives() {
    const p = this.player;
    if (this.objectives.checkPickup(p.x, p.y)) {
      const { taken, total } = this.objectives;
      this.toast(taken >= total ? 'Выход открыт' : `Осколок ${taken} из ${total}`);
      this.fx.burst(p.x, p.y, 0xffd27a, 24);
      this.fx.shake(0.006, 160);
      this.spawner.ambush(this.levelDef.shardAmbush); // тьма отвечает
    }
    if (this.objectives.isAtExit(p.x, p.y)) this.levelComplete();
  }

  /* ───────────────────────── зелья и масло ───────────────────────── */

  /** Предупреждаем один раз, когда масла становится мало; долили — можно предупредить снова. */
  private checkFuel() {
    const ratio = this.player.fuelRatio;
    if (!this.warnedLowFuel && ratio <= RULES.lowFuelWarning) {
      this.warnedLowFuel = true;
      this.toast(ratio <= 0 ? 'Масло кончилось' : 'Масло на исходе');
    } else if (ratio > RULES.lowFuelWarning + 0.1) {
      this.warnedLowFuel = false;
    }
  }

  private drinkPotion(kind: PotionKind) {
    const def = POTIONS[kind];
    this.player.drink(kind);
    this.toast(def.name);
    this.fx.burst(this.player.x, this.player.y, def.color, 14);
  }

  /** Искры от героя, пока действуют зелья (и фиолетовые — пока спутано управление). */
  private potionSparks() {
    const p = this.player;
    const colors = [...p.buffs.keys()].map(kind => POTIONS[kind].color);
    if (p.isConfused) colors.push(0xc9a2ff);
    for (const color of colors) {
      if (Math.random() < 0.25) this.fx.burst(p.x + Phaser.Math.Between(-6, 6), p.y + Phaser.Math.Between(-4, 8), color, 1);
    }
  }

  /* ───────────────────────── опыт и усиления ───────────────────────── */

  private gainXp(amount: number) {
    const levels = this.player.addXp(amount);
    if (levels === 0) return;
    this.pendingUpgrades += levels;
    this.openLevelUp();
  }

  /** Ставим игру на паузу и показываем сцену выбора усиления поверх. */
  private openLevelUp() {
    if (this.pendingUpgrades <= 0 || this.finished || this.scene.isActive(SCENE.levelUp)) return;
    this.scene.pause();
    const data: LevelUpData = {
      nextOffer: () => this.nextOffer(),
      onPick: choice => this.applyChoice(choice),
      onDone: () => this.scene.resume(),
    };
    this.scene.launch(SCENE.levelUp, data);
  }

  private nextOffer(): LevelUpOffer | null {
    if (this.pendingUpgrades <= 0) return null;
    const more = this.pendingUpgrades - 1;
    return {
      kicker: more > 0 ? `Новый уровень · ещё ${more}` : `Уровень ${this.player.heroLevel}`,
      choices: rollChoices(this.player.stats),
    };
  }

  private applyChoice(choice: Choice) {
    choice.apply(this.player.stats);
    if (choice.heal) this.player.heal(choice.heal);
    this.pendingUpgrades--;
    this.syncWeapons();
  }

  /** Создаём объекты оружия, уровень которого стал больше нуля. */
  private syncWeapons() {
    for (const id of WEAPON_IDS) {
      if (this.player.stats[id] > 0 && !this.ownedWeapons.has(id)) {
        this.ownedWeapons.add(id);
        this.weapons.push(WEAPON_FACTORY[id](this));
      }
    }
  }

  /* ───────────────────────── конец уровня ───────────────────────── */

  pauseGame() {
    if (this.finished || !this.scene.isActive()) return;
    this.scene.pause();
    this.showDialog({
      kicker: 'Пауза',
      title: 'Передышка',
      buttons: [
        { label: 'Продолжить', onClick: () => this.scene.resume() },
        { label: 'В меню', primary: false, onClick: () => this.goToMenu() },
      ],
    });
  }

  private levelComplete() {
    this.finished = true;
    this.player.setVelocity(0, 0);
    this.scene.pause();
    const index = this.run.levelIndex;
    const last = isLastLevel(index);
    if (!last) unlockLevel(index + 1);

    const next = this.player.toRun(index + 1);
    next.hp = Math.min(next.stats.maxHp, next.hp + next.stats.maxHp * RULES.healBetweenLevels);

    this.showDialog({
      kicker: last ? 'Катакомбы пройдены' : `Уровень ${index + 1} пройден`,
      title: last ? 'Ты вышел к свету' : 'Выход найден',
      stats: this.resultStats([['Уровень', String(this.player.heroLevel)]]),
      buttons: last
        ? [{ label: 'В меню', hint: '↺', onClick: () => this.goToMenu() }]
        : [{ label: 'Дальше вниз', hint: LEVELS[index + 1].name, onClick: () => this.scene.restart({ run: next }) }],
    });
  }

  private gameOver() {
    this.finished = true;
    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.showDialog({
      kicker: 'Тьма победила',
      title: 'Фонарь погас',
      stats: this.resultStats([['Осколки', `${this.objectives.taken}/${this.objectives.total}`]]),
      buttons: [
        { label: 'Ещё раз', hint: 'с начала уровня', onClick: () => this.scene.restart({ run: cloneRun(this.runAtStart) }) },
        { label: 'В меню', primary: false, onClick: () => this.goToMenu() },
      ],
    });
  }

  private resultStats(extra: Array<[string, string]>): Array<[string, string]> {
    const t = Math.floor(this.elapsed);
    return [['Убито', String(this.kills)], ['Время', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`], ...extra];
  }

  private showDialog(data: DialogData) {
    this.scene.launch(SCENE.dialog, data);
  }

  private goToMenu() {
    this.scene.start(SCENE.menu);
  }

  /* ───────────────────────── помощники ───────────────────────── */

  spawnBullet(x: number, y: number, angle: number, opts: BulletOptions) {
    this.bullets.add(new Bullet(this, x, y, angle, opts));
  }

  livingEnemies(): Enemy[] {
    return (this.enemies.getChildren() as Enemy[]).filter(e => !e.isDead);
  }

  toast(text: string) {
    this.events.emit(GAME_EVENT.toast, text);
  }
}

/**
 * Зум камеры мира. Целое число — чтобы пиксели не «плыли» (у нас pixelArt: true).
 * На телефоне в портрете видно ~12 клеток по ширине.
 */
function worldZoom() {
  const cssMin = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(1, Math.round(DPR * Phaser.Math.Clamp(cssMin / 320, 0.9, 2.2)));
}
