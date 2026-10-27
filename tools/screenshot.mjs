// Скриншот игры из headless Chrome (через Chrome DevTools Protocol, без зависимостей).
// Открывает игру, запускает уровень, снимает экран; можно выполнить JS в странице и снять ещё раз.
// Ошибки и предупреждения из консоли браузера печатает в конце.
//
//   node tools/screenshot.mjs <url> <outPrefix> [js] [character] [level]
//   node tools/screenshot.mjs http://localhost:5173/ /tmp/shot "game.scene.getScene('Game').player.fuel = 5"
//
// Пишет <outPrefix>-start.png и, если передан js, <outPrefix>-extra.png. Нужен запущенный npm run dev и Google Chrome (macOS).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, out, extra = '', character = 'hero', level = '0'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node tools/screenshot.mjs <url> <outPrefix> [js] [character] [level]');
  process.exit(1);
}
const port = 9333;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`,
  '--window-size=900,700', '--use-gl=angle', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50; i++) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find(t => t.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(200);
}
await new Promise(r => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + JSON.stringify(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type))
    logs.push(msg.params.type.toUpperCase() + ' ' + msg.params.args.map(a => a.value ?? a.description).join(' '));
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) logs.push('EVAL ' + JSON.stringify(r.result.exceptionDetails.exception?.description));
  return r.result?.result?.value;
};
const shoot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}-${name}.png`, Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(4000);
await evaluate(`(async () => {
  const { newRun } = await import('/src/core/RunState.ts');
  game.scene.getScene('Menu').scene.start('Game', { run: newRun('${character}', ${Number(level)}) });
})()`);
await sleep(1500);
// Если на старте открылся выбор усилений — закрываем, чтобы снять сам уровень.
await evaluate(`(() => { const g = game.scene.getScene('Game'); g.scene.stop('LevelUp'); g.scene.resume(); })()`);
await sleep(300);
await shoot('start');
if (extra) {
  console.log('extra ->', await evaluate(extra));
  await sleep(800);
  await shoot('extra');
}
console.log(logs.length ? logs.join('\n') : 'no console errors');
ws.close();
chrome.kill();
process.exit(0);
