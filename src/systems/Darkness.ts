import Phaser from 'phaser';
import { COLOR, DEPTH } from '../config';
import { LIGHT_TEXTURE_SIZE } from '../art/textures';

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
 * Важно для Phaser 4: команды рисования в RenderTexture копятся в буфере
 * и выполняются только после rt.render().
 */
export class Darkness {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly lights: Light[] = [];
  /**
   * Запас по краям. Камера сдвигается уже после нашего update (в момент отрисовки),
   * поэтому слой тьмы ставим по позиции камеры с прошлого кадра — и с запасом,
   * чтобы при движении у края экрана не мелькала незатемнённая полоска.
   */
  private static readonly PAD = 96;

  constructor(private readonly scene: Phaser.Scene, private readonly opacity = 0.94) {
    this.rt = scene.add.renderTexture(0, 0, 16, 16).setOrigin(0, 0).setDepth(DEPTH.darkness);
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
    if (this.rt.width !== w || this.rt.height !== h) this.rt.resize(w, h);

    // Слой тьмы живёт в мировых координатах и всегда накрывает видимую область.
    this.rt.setPosition(view.x - pad, view.y - pad);

    this.rt.clear();
    this.rt.fill(COLOR.darkness, this.opacity);
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
}

const evenCeil = (n: number) => Math.ceil(n / 2) * 2;
