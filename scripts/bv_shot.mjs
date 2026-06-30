// Bharatverse Phaser offline screenshot + movement check. Needs `npm run dev`.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BROWSER_PATH as EDGE } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const CLASS = process.env.BV_CLASS ?? 'kshatriya';
fs.mkdirSync('tmp', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=1280,800', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const clickById = (id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? (e.click(), true) : false; }, id);
const playerPos = () => page.evaluate(() => {
  const g = window.__game || window.game;
  const w = g && (g.sim || g.world || (g.registry && g.registry.get && g.registry.get('world')));
  const p = w && w.player;
  return p ? { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), facing: +(+p.facing).toFixed(2) } : null;
});

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await sleep(400);
await clickById('btn-play-offline');
await sleep(600);
await page.type('#char-name', 'Tester');
await page.evaluate((cls) => document.querySelector(`.mini-class[data-class="${cls}"]`)?.click(), CLASS);
await sleep(200);
await clickById('btn-start-offline');
await sleep(9000); // let the world + sprites load (real PNGs are ~1MB each)

await page.screenshot({ path: 'tmp/bv_spawn.png' });
const globals = await page.evaluate(() => Object.keys(window).filter((k) => k.startsWith('__') || k === 'game'));
console.log('globals:', JSON.stringify(globals));
const p0 = await playerPos();
console.log('spawn pos:', JSON.stringify(p0));

// Arrow-key movement: press Up for 2s.
await page.keyboard.down('ArrowUp');
await sleep(2000);
await page.keyboard.up('ArrowUp');
await sleep(200);
const p1 = await playerPos();
console.log('after ArrowUp:', JSON.stringify(p1));
await page.screenshot({ path: 'tmp/bv_after_up.png' });

// Click-to-move: click upper-left quadrant of the canvas.
const box = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.click(box.x + box.w * 0.35, box.y + box.h * 0.30);
await sleep(2500);
const p2 = await playerPos();
console.log('after click-to-move:', JSON.stringify(p2));
await page.screenshot({ path: 'tmp/bv_after_click.png' });

if (p0 && p1) {
  const d1 = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  console.log('ArrowUp moved:', d1.toFixed(1), d1 > 3 ? 'OK' : 'FAIL');
}
if (p1 && p2) {
  const d2 = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  console.log('click moved:', d2.toFixed(1), d2 > 3 ? 'OK' : 'FAIL');
}

await browser.close();
if (errors.length) { console.log('\nERRORS:'); errors.slice(0, 15).forEach((e) => console.log(e)); }
else console.log('no page errors');
