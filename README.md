# Фонарщик

Мобильный top-down шутер-бродилка на **Phaser 4 + TypeScript + Vite**.
Герой бродит по тёмным катакомбам с фонарём и сам стреляет в ближайшего монстра.
На каждом уровне надо собрать 3 осколка света, тогда откроется выход.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173, с телефона в той же Wi-Fi — по адресу из консоли (Network)
npm run build      # проверка типов + сборка в dist/
npm run preview    # посмотреть собранную версию
```

Управление: палец в любом месте экрана (плавающий джойстик), на компьютере WASD или стрелки, `Esc`/`P` для паузы.

Отладка из консоли браузера: `game.scene.getScene('Game')` вернёт текущую сцену со всеми полями.
Например, `game.scene.getScene('Game').player.stats.blades = 5` даст серпы 5 уровня
(создадутся при следующем выборе усиления), а `game.scene.getScene('Game').player.drink('frenzy')` — выпить зелье. Физику можно увидеть, поставив `debug: true` в `src/main.ts`.

## Как читать код

Рекомендуемый порядок, от простого к сложному:

1. `src/main.ts` — создание `Phaser.Game`, список сцен, физика.
2. `src/config.ts` и папка `src/data/` — все числа баланса, карты уровней, враги, усиления. Чистые данные, без Phaser.
3. `src/scenes/BootScene.ts` → `MenuScene.ts` — жизненный цикл сцены и переход между сценами.
4. `src/world/` — логика карты без Phaser: `LevelMap` (стены), `lineOfSight` (видимость), `FlowField` (поиск пути).
5. `src/entities/` — `Player`, `Enemy`, `Bullet`: спрайты с физическими телами.
6. `src/scenes/GameScene.ts` — главная сцена, которая всё связывает. Сверху есть комментарий с порядком кадра.
7. `src/systems/` — спавн врагов, тьма и свет, частицы, кристаллы опыта, цели уровня.
8. `src/weapons/` — оружие. Начни с `Weapon.ts` (интерфейс), потом `Pistol.ts`.
9. `src/scenes/HudScene.ts`, `LevelUpScene.ts`, `DialogScene.ts` — интерфейс поверх игры.

## Структура

```
src/
  main.ts                 точка входа, конфиг Phaser
  config.ts               тайл, слои отрисовки (depth), палитра, шрифты, общие правила
  core/
    screen.ts             чёткая картинка на телефонах (DPR), камера для UI
    joystick.ts           общее состояние джойстика между сценами
    RunState.ts           что переносится между уровнями + сохранение прогресса
  data/
    levels.ts             карты уровней символами (# . P K E)
    enemies.ts            типы врагов
    upgrades.ts           характеристики героя, оружие, карточки усилений
    potions.ts            зелья: лечение, ярость, скорость
  art/
    textures.ts           графика, нарисованная кодом через Canvas
    sheets.ts             картинки из public/assets/ (тайлы, герой, крыса) и анимации
  world/
    LevelMap.ts           разбор карты, стены, данные для тайлмапа
    lineOfSight.ts        линия видимости (DDA) с толщиной луча
    FlowField.ts          поле потока: как враги находят героя в лабиринте
  entities/
    Player.ts  Enemy.ts  Bullet.ts
  systems/
    EnemySpawner.ts       когда и где появляются враги
    Darkness.ts           слой тьмы с «вырезанным» светом (RenderTexture + ERASE)
    Effects.ts            частицы, тряска камеры, вибрация
    XpGems.ts             кристаллы опыта и магнит
    Potions.ts            зелья на полу: подбор, мигание, исчезновение
    Objectives.ts         осколки и выход, твины
  weapons/
    Weapon.ts             интерфейс оружия, WeaponHost, поиск цели
    Pistol.ts  Blades.ts  Lightning.ts  FireFlask.ts  Nova.ts
    index.ts              фабрика: id оружия → объект
  scenes/
    keys.ts               имена сцен
    BootScene  MenuScene  GameScene  HudScene  LevelUpScene  DialogScene
  ui/
    widgets.ts            текст, кнопка, затемнение
```

## Плейсхолдер-графика

Картинки в `public/assets/` сгенерированы скриптами из `tools/art/` (чистый Node, без зависимостей).
`node tools/art/hero.mjs` пересоздаст `public/assets/hero.png` — **осторожно, перезапишет твою перерисованную версию**.
Скрипты — хороший образец, если хочешь нарисовать что-то кодом попиксельно.

## Главные идеи Phaser, которые здесь есть

| Что | Где посмотреть |
|---|---|
| Сцены, `init/create/update`, запуск нескольких сцен поверх друг друга | `GameScene.create()`, `scene.launch(SCENE.hud)` |
| Пауза сцены и модальные окна | `GameScene.openLevelUp()`, `DialogScene` |
| Arcade Physics: тела, `collider` и `overlap` | `GameScene.setupCollisions()` |
| Тайлмап из массива и коллизии со стенами | `GameScene.createTilemap()`, `LevelMap.toTileData()` |
| Камера: следование, границы, зум, тряска | `GameScene.setupCamera()`, `Effects.shake()` |
| Текстуры из Canvas | `art/textures.ts` |
| Спрайтшит и анимации (`load.spritesheet`, `anims.create`, `play`) | `art/sheets.ts`, `Player.move()`, `Enemy.walkTowards()` |
| RenderTexture и режимы смешивания (свет во тьме) | `systems/Darkness.ts` |
| Твины (анимация свойств) и цепочки твинов | `Objectives.ts`, `FireFlask.throwAt()`, `HudScene.showToast()` |
| Частицы | `systems/Effects.ts` |
| Graphics: рисование линий и фигур каждый кадр | `Lightning.ts`, `Nova.ts`, полоски HP |
| Ввод: клавиатура и касания | `GameScene.setupKeyboard()`, `HudScene.setupJoystick()` |
| События между сценами и отписка при выключении | `GAME_EVENT` в `GameScene`, `HudScene.create()` |
| Tint и режимы tint в Phaser 4 (белая вспышка при попадании) | `Enemy.updateTint()` |

Особенности Phaser 4 по сравнению с туториалами по Phaser 3:
- В `RenderTexture` нужно вызывать `rt.render()` после команд рисования.
- Вместо `setTintFill()` теперь `setTint(color).setTintMode(Phaser.TintModes.FILL)`.
- Canvas-рендерер устарел, используем WebGL.
- В пакете Phaser есть папка `node_modules/phaser/skills/` с подробными гайдами по каждой теме (на английском). Очень полезно.

## Как добавить…

**Свои тайлы.** Перерисуй `public/assets/tiles.png`: 7 тайлов 32×32 в одну строку —
4 варианта пола, верх стены, стена с лицевой гранью снизу, глухая порода. Какой тайл где ставить, решает `LevelMap.toTileData()`.
Как часто встречается каждый вариант пола — веса в `FLOOR_VARIANTS` (`src/world/LevelMap.ts`).

**Своего героя.** Перерисуй `public/assets/hero.png` в любом пиксельном редакторе (Aseprite, Piskel, LibreSprite).
Кадры 32×32, по 6 в строке; строки: idle (4 кадра), walk (6), hurt (2). Герой смотрит вправо.
Число кадров и скорость анимаций — в `src/art/sheets.ts`.

**Картинку врагу.** Так же устроена крыса (`public/assets/rat.png`, кадры 24×24: run — 4, bite — 3).
Добавь запись `'enemy-<вид>'` в `SHEETS` (`src/art/sheets.ts`) с анимациями `run` и `bite` и координатой глаза `eye`.

**Зелье.** Добавь вид в `PotionKind` и запись в `POTIONS` (`src/data/potions.ts`) и дорисуй кадр 16×16 в конец `public/assets/potions.png`.
Как часто зелья падают — `potionChance` у врагов в `src/data/enemies.ts`.

**Уровень.** Допиши объект в `LEVELS` в `src/data/levels.ts`. Нужен хотя бы один `P`, один `E` и осколки `K`.

**Врага.** Добавь тип в `EnemyKind` и `ENEMIES` (`src/data/enemies.ts`), потом впиши его в `enemyMix` нужных уровней. Текстура создастся сама.

**Оружие.**
1. Поле с уровнем оружия в `Stats` и `BASE_STATS`, описание в `WEAPON_INFO` (`src/data/upgrades.ts`).
2. Файл в `src/weapons/`, класс с методом `update(dt)` (скопируй `Nova.ts` как образец).
3. Строчка в `WEAPON_FACTORY` (`src/weapons/index.ts`).

## Задания для практики

От простого к сложному:

1. **Баланс.** Сделай крыс быстрее, а голема медленнее, и посмотри, как меняется игра. Только `data/`.
2. **Звук.** Положи `.mp3` в `public/sfx/`, загрузи в `BootScene.preload()` через `this.load.audio(...)` и проигрывай `this.sound.play('shot')` при выстреле.
3. **Мини-карта.** Добавь вторую камеру: `this.cameras.add(x, y, w, h).setZoom(0.1).startFollow(player)`. Подумай, как спрятать от неё слой тьмы (`camera.ignore(...)`).
4. **Пул пуль.** Сейчас пули создаются и уничтожаются. Переделай на `this.physics.add.group({ classType: Bullet, maxSize: 100 })` и `group.get()`.
5. **Новое оружие.** Например, «Бумеранг»: летит к врагу и возвращается, бьёт на обоих пролётах.
6. **Босс** на третьем уровне: большой враг с атакой по кругу, который появляется, когда собраны все осколки.
7. **Карта из Tiled.** Нарисуй уровень в редакторе [Tiled](https://www.mapeditor.org/), экспортируй JSON и загрузи через `this.load.tilemapTiledJSON()`. `LevelMap` можно строить из слоя тайлмапа.
8. **Сохранение забега** в `localStorage`, чтобы продолжить после закрытия вкладки. `RunState` уже простой объект, его легко сериализовать.

## Публикация

- **Web-порталы** (Poki, CrazyGames, itch.io): `npm run build`, папку `dist/` залить как есть (пути относительные).
- **App Store / Google Play**: обернуть `dist/` через [Capacitor](https://capacitorjs.com/) (`npx cap add android`).
