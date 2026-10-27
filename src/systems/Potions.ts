import Phaser from 'phaser';
import { DEPTH } from '../config';
import { POTIONS, type PotionKind } from '../data/potions';
import type { Player } from '../entities/Player';
import type { Darkness } from './Darkness';

/** С какого расстояния зелье считается подобранным (px). */
const PICKUP_DISTANCE = 16;
/** Сколько секунд зелье лежит на полу. */
const LIFETIME = 20;
/** За сколько секунд до исчезновения начинает мигать. */
const BLINK_TIME = 4;

interface Potion {
  sprite: Phaser.GameObjects.Image;
  kind: PotionKind;
  baseY: number;
  age: number;
}

/**
 * Зелья на полу. Устроены как кристаллы опыта (XpGems), только без магнита:
 * за зельем надо подойти самому. Немного светятся, чтобы их было видно в темноте.
 */
export class Potions {
  private potions: Potion[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  drop(x: number, y: number, kind: PotionKind) {
    const sprite = this.scene.add.image(x, y, 'potions', POTIONS[kind].frame).setDepth(DEPTH.loot);
    this.potions.push({ sprite, kind, baseY: y, age: 0 });
  }

  /** Возвращает зелья, подобранные за этот кадр. */
  update(dt: number, player: Player, darkness: Darkness): PotionKind[] {
    const picked: PotionKind[] = [];

    for (const p of this.potions) {
      p.age += dt;
      const s = p.sprite;
      s.y = p.baseY + Math.sin(p.age * 4) * 1.5; // покачивается

      if (Phaser.Math.Distance.Between(s.x, p.baseY, player.x, player.y) < PICKUP_DISTANCE) {
        picked.push(p.kind);
        s.destroy();
      } else if (p.age > LIFETIME) {
        s.destroy();
      } else {
        // Перед исчезновением мигает, и чем ближе конец, тем чаще.
        const left = LIFETIME - p.age;
        s.setVisible(left > BLINK_TIME || Math.sin(p.age * (left < 1.5 ? 30 : 15)) > 0);
        darkness.addLight(s.x, s.y, 18, 0.45);
      }
    }

    this.potions = this.potions.filter(p => p.sprite.active);
    return picked;
  }
}
