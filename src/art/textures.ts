import Phaser from 'phaser';
import { ENEMIES, type EnemyKind } from '../data/enemies';

/**
 * Почти вся графика игры рисуется кодом при запуске. Тайлы, персонажи, крыса, Морок и зелья — из файлов, см. art/sheets.ts.
 *
 * Как это работает: создаём CanvasTexture (обычный <canvas> внутри Phaser),
 * рисуем на нём через привычный Canvas 2D API и вызываем refresh().
 * После этого текстуру можно использовать по ключу, как будто её загрузили из PNG:
 *   this.add.image(x, y, 'player')
 *
 * Когда появятся нарисованные спрайты, замени makeTexture(...) на
 *   this.load.image('player', 'assets/player.png')   // в BootScene.preload()
 * и ничего больше менять не придётся.
 */
function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Не удалось создать текстуру ${key}`);
  draw(tex.getContext());
  tex.refresh();
}

export const LIGHT_TEXTURE_SIZE = 128;

export function createTextures(scene: Phaser.Scene) {
  createHeroGear(scene);
  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) createEnemy(scene, kind);

  // Глаза врагов: светятся поверх тьмы, поэтому отдельный спрайт.
  makeTexture(scene, 'eyes', 12, 8, ctx => {
    ctx.fillStyle = '#fff';
    dot(ctx, 9, 2, 1.6);
    dot(ctx, 9, 6, 1.6);
  });

  makeTexture(scene, 'bullet', 12, 4, ctx => {
    const g = ctx.createLinearGradient(0, 0, 12, 0);
    g.addColorStop(0, 'rgba(255,179,71,0)');
    g.addColorStop(1, '#ffb347');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 12, 4);
    ctx.fillStyle = '#fff1d0';
    ctx.fillRect(9, 1, 3, 2);
  });

  // Сгусток Морока: фиолетовое свечение с белым ядром.
  makeTexture(scene, 'hex-bolt', 12, 12, ctx => {
    const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#c9a2ff');
    g.addColorStop(1, 'rgba(120,60,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 12, 12);
  });

  makeTexture(scene, 'gem', 8, 12, ctx => {
    ctx.fillStyle = '#6fe3ff';
    diamond(ctx, 4, 6, 4, 6);
  });

  makeTexture(scene, 'shard', 12, 18, ctx => {
    ctx.fillStyle = '#ffd27a';
    diamond(ctx, 6, 9, 6, 9);
    ctx.fillStyle = '#fff4d6';
    ctx.fillRect(5, 5, 2, 5);
  });

  makeTexture(scene, 'exit', 34, 34, ctx => {
    ctx.fillStyle = '#05070a';
    dot(ctx, 17, 17, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(17, 17, 14, a, a + 0.6);
      ctx.stroke();
    }
  });

  makeTexture(scene, 'blade', 18, 18, ctx => {
    ctx.strokeStyle = '#e6f1f3';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(6, 9, 7, -1.1, 1.1);
    ctx.stroke();
  });

  makeTexture(scene, 'flask', 8, 12, ctx => {
    ctx.fillStyle = '#7a4a22';
    ctx.fillRect(1, 4, 6, 8);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(3, 0, 2, 4);
  });

  // Один глаз для врагов, нарисованных сбоку (спрайтшиты).
  makeTexture(scene, 'eye', 3, 3, ctx => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 1, 3, 1);
    ctx.fillRect(1, 0, 1, 3);
  });

  makeTexture(scene, 'spark', 4, 4, ctx => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 4, 4);
  });

  // Мягкое пятно света: белый центр → прозрачный край.
  // Им «вырезаем» дыры в слое тьмы (см. systems/Darkness.ts).
  makeTexture(scene, 'light', LIGHT_TEXTURE_SIZE, LIGHT_TEXTURE_SIZE, ctx => {
    const r = LIGHT_TEXTURE_SIZE / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LIGHT_TEXTURE_SIZE, LIGHT_TEXTURE_SIZE);
  });

  makeTexture(scene, 'fire', 64, 64, ctx => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,214,120,0.85)');
    g.addColorStop(0.5, 'rgba(240,110,40,0.6)');
    g.addColorStop(1, 'rgba(140,30,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

/* ───────────── Снаряжение героя и враги ───────────── */

function createHeroGear(scene: Phaser.Scene) {
  makeTexture(scene, 'gun', 12, 4, ctx => {
    ctx.fillStyle = '#d7d0c0';
    ctx.fillRect(3, 1, 9, 2);
  });

  makeTexture(scene, 'lantern', 8, 8, ctx => {
    ctx.fillStyle = '#ffcf7a';
    dot(ctx, 4, 4, 3.2);
  });
}

function createEnemy(scene: Phaser.Scene, kind: EnemyKind) {
  const def = ENEMIES[kind];
  const size = def.radius * 2 + 4;
  makeTexture(scene, `enemy-${kind}`, size, size, ctx => {
    const c = size / 2;
    ctx.fillStyle = def.body;
    ctx.strokeStyle = def.rim;
    ctx.lineWidth = 2;
    dot(ctx, c, c, def.radius);
    ctx.stroke();
    if (kind === 'golem') {
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.moveTo(c - 6, c - 8); ctx.lineTo(c - 1, c + 2); ctx.lineTo(c + 5, c - 3);
      ctx.stroke();
    }
  });
}

/* ───────────── маленькие помощники рисования ───────────── */

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.fill();
}
