import Phaser from 'phaser';
import { DEPTH } from '../config';

/**
 * Визуальные эффекты: брызги частиц и тряска камеры.
 *
 * Один ParticleEmitter на всю игру: он ничего не испускает сам (emitting: false),
 * а по команде explode() выбрасывает пачку частиц в нужной точке.
 * Перед выбросом меняем цвет — tint вычисляется для частицы в момент её рождения,
 * поэтому уже летящие частицы цвет не меняют.
 */
export class Effects {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.emitter = scene.add.particles(0, 0, 'spark', {
      emitting: false,
      speed: { min: 20, max: 140 },
      lifespan: { min: 200, max: 500 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0.2 },
    });
    this.emitter.setDepth(DEPTH.fx);
  }

  burst(x: number, y: number, color: number, count = 8) {
    this.emitter.setParticleTint(color);
    this.emitter.explode(count, x, y);
  }

  /** Встроенная тряска камеры Phaser: длительность в мс и сила (доля экрана). */
  shake(intensity = 0.004, durationMs = 120) {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /** Короткая вибрация телефона, если браузер её поддерживает. */
  vibrate(ms = 25) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* не везде разрешено */
    }
  }
}
