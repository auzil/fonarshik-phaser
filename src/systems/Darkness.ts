import Phaser from 'phaser';
import { COLOR, DEPTH } from '../config';
import { LIGHT_TEXTURE_SIZE } from '../art/textures';
import type { LevelMap } from '../world/LevelMap';
import { shadowQuads } from '../world/shadows';

/** Ключ текстуры, в которую рисуем свет фонаря вместе с тенями от стен. */
const LANTERN_TEXTURE = 'lantern-light';

interface Light {
  x: number;
  y: number;
  radius: number;
  strength: number; // 0..1 — насколько сильно свет «прорезает» тьму
}

/**
 * Тьма и свет.
 *
 * Идея простая: поверх всего мира лежит RenderTexture (картинка, на которой можно рисовать в рантайме),
 * залитая почти чёрным. Каждый кадр мы заново заливаем её и «стираем» (blendMode ERASE)
 * мягкими пятнами в местах, где есть свет: фонарь героя, пули, осколки, огонь.
 *
 * Любая система может сказать darkness.addLight(...) в течение кадра,
 * а в конце кадра GameScene вызывает darkness.render().
 *
 * Фонарь героя особенный: его свет не проходит сквозь стены.
 * Для него есть отдельная невидимая текстура (DynamicTexture) того же размера, что и слой тьмы:
 *   1) рисуем в неё пятно света;
 *   2) стираем из неё тени от стен (клинья из world/shadows.ts, нарисованные Graphics);
 *   3) этим «пятном с тенями» и вырезаем дыру во тьме.
 * Та же текстура, подкрашенная оранжевым в режиме ADD, даёт тёплый отсвет — и он тоже не лезет за стены.
 * Остальные огоньки (пули, кристаллы, огонь) маленькие, им тени не нужны.
 *
 * Важно для Phaser 4: команды рисования в RenderTexture/DynamicTexture копятся в буфере
 * и выполняются только после render().
 */
export class Darkness {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly lights: Light[] = [];
  private readonly lanternTexture: Phaser.Textures.DynamicTexture;
  /** Тёплый отсвет фонаря поверх тьмы. */
  private readonly lanternGlow: Phaser.GameObjects.Image;
  /** Кисть для теней. Не добавлена на сцену: рисуем её только в текстуру. */
  private readonly shadowBrush: Phaser.GameObjects.Graphics;
  private lantern: Light | null = null;
  /**
   * Запас по краям. Камера сдвигается уже после нашего update (в момент отрисовки),
   * поэтому слой тьмы ставим по позиции камеры с прошлого кадра — и с запасом,
   * чтобы при движении у края экрана не мелькала незатемнённая полоска.
   */
  private static readonly PAD = 96;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: LevelMap,
    private readonly opacity = 0.94,
  ) {
    this.rt = scene.add.renderTexture(0, 0, 16, 16).setOrigin(0, 0).setDepth(DEPTH.darkness);

    // Текстуры живут в общем менеджере игры, а не в сцене: при перезапуске сцены убираем старую сами.
    if (scene.textures.exists(LANTERN_TEXTURE)) scene.textures.remove(LANTERN_TEXTURE);
    const texture = scene.textures.addDynamicTexture(LANTERN_TEXTURE, 16, 16);
    if (!texture) throw new Error('Не удалось создать текстуру света фонаря');
    this.lanternTexture = texture;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.textures.remove(LANTERN_TEXTURE));

    this.lanternGlow = scene.add
      .image(0, 0, LANTERN_TEXTURE)
      .setOrigin(0, 0)
      .setTint(0xffaa50)
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.darkness + 0.5);
    this.shadowBrush = scene.make.graphics({}, false);
  }

  /** Фонарь героя: свет, который не проходит сквозь стены. Вызывать каждый кадр перед render(). */
  setLantern(x: number, y: number, radius: number) {
    this.lantern = { x, y, radius, strength: 1 };
  }

  addLight(x: number, y: number, radius: number, strength = 1) {
    this.lights.push({ x, y, radius, strength });
  }

  render() {
    // worldView — прямоугольник мира, который сейчас видит камера.
    const view = this.scene.cameras.main.worldView;
    if (view.width === 0) return; // камера ещё не отрисовала ни одного кадра

    const pad = Darkness.PAD;
    // Размер округляем до чётного: Phaser всё равно сделает текстуру чётной,
    // а пересоздавать её каждый кадр из-за лишнего пикселя очень дорого.
    const w = evenCeil(view.width + pad * 2);
    const h = evenCeil(view.height + pad * 2);
    if (this.rt.width !== w || this.rt.height !== h) {
      this.rt.resize(w, h);
      this.lanternTexture.setSize(w, h);
    }

    // Слой тьмы живёт в мировых координатах и всегда накрывает видимую область.
    this.rt.setPosition(view.x - pad, view.y - pad);
    this.lanternGlow.setPosition(this.rt.x, this.rt.y);
    this.renderLantern();

    this.rt.clear();
    this.rt.fill(COLOR.darkness, this.opacity);
    // Дыра от фонаря — по форме текстуры «свет минус тени», левым верхним углом в угол слоя.
    this.rt.stamp(LANTERN_TEXTURE, undefined, 0, 0, { originX: 0, originY: 0, blendMode: Phaser.BlendModes.ERASE });
    for (const light of this.lights) {
      this.rt.stamp('light', undefined, light.x - this.rt.x, light.y - this.rt.y, {
        scale: (light.radius * 2) / LIGHT_TEXTURE_SIZE,
        alpha: light.strength,
        blendMode: Phaser.BlendModes.ERASE,
      });
    }
    this.rt.render();
    this.lights.length = 0;
  }

  /** Пятно света фонаря минус тени от стен — в текстуру lanternTexture. */
  private renderLantern() {
    const tex = this.lanternTexture;
    tex.clear();
    const lamp = this.lantern;
    if (!lamp) {
      tex.render();
      return;
    }

    // Всё рисуем в координатах текстуры: мировые минус угол слоя тьмы.
    const ox = this.rt.x;
    const oy = this.rt.y;
    tex.stamp('light', undefined, lamp.x - ox, lamp.y - oy, { scale: (lamp.radius * 2) / LIGHT_TEXTURE_SIZE });

    const brush = this.shadowBrush.clear().fillStyle(0xffffff, 1);
    for (const [ax, ay, bx, by, b2x, b2y, a2x, a2y] of shadowQuads(this.map, lamp.x, lamp.y, lamp.radius)) {
      // Четырёхугольник = два треугольника.
      brush.fillTriangle(ax - ox, ay - oy, bx - ox, by - oy, b2x - ox, b2y - oy);
      brush.fillTriangle(ax - ox, ay - oy, b2x - ox, b2y - oy, a2x - ox, a2y - oy);
    }
    tex.erase(brush);
    tex.render();
  }
}

const evenCeil = (n: number) => Math.ceil(n / 2) * 2;
