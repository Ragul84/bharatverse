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

// Character creator now sits between boot and world — capture it, then advance.
await page.screenshot({ path: 'tmp/bv_creator.png' });
await page.evaluate(() => {
  const g = window.__game;
  const cc = g && g.scene.getScene('CharacterCreatorScene');
  if (cc && cc.scene.isActive()) g.scene.start('WorldScene');
});
await sleep(2500);

await page.screenshot({ path: 'tmp/bv_spawn.png' });

// Gathering: chop a tree -> quiz -> answer -> reward.
await page.evaluate(() => {
  const ws = window.__game.scene.getScene('WorldScene');
  const tree = ws.children.list.find((o) => o.type === 'Image' && o.input && o.input.enabled && o.displayWidth > 70);
  if (tree && ws.startGather) ws.startGather(tree);
});
await sleep(800);
await page.screenshot({ path: 'tmp/bv_gather_quiz.png' });
await page.evaluate(() => {
  const q = window.__game.scene.getScene('QuizScene');
  if (q && q.scene.isActive() && q.data_) q.selectOption(q.data_.question.correct);
});
await sleep(1700);
await page.screenshot({ path: 'tmp/bv_gather_reward.png' });

// Daily-quest board: open the HUD panel (progress should reflect the chop above).
await page.evaluate(() => {
  const hud = window.__game.scene.getScene('HUDScene');
  if (hud && hud.toggleDailyPanel) hud.toggleDailyPanel();
  else if (hud && hud.buildDailyPanel) hud.buildDailyPanel();
});
await sleep(500);
await page.screenshot({ path: 'tmp/bv_daily.png' });
await page.evaluate(() => {
  const hud = window.__game.scene.getScene('HUDScene');
  if (hud && hud.dailyPanel) { hud.dailyPanel.destroy(); hud.dailyPanel = undefined; }
});

// Cosmetic shop: give Gold, open the shop, buy+equip a hat and a pet.
await page.evaluate(() => {
  const ws = window.__game.scene.getScene('WorldScene');
  ws.gold = 5000; ws.pushHUDUpdate && ws.pushHUDUpdate();
  const hud = window.__game.scene.getScene('HUDScene');
  hud.toggleShopPanel(true);
});
await sleep(500);
await page.screenshot({ path: 'tmp/bv_shop.png' });
// Buy + equip the Royal Crown (hat index 1) and the Marmalade Cat pet.
await page.evaluate(() => {
  const ws = window.__game.scene.getScene('WorldScene');
  ws.events.emit('shop:buy', { kind: 'hat', ref: 1, price: 800 });
  ws.events.emit('shop:equip', { kind: 'hat', ref: 1 });
  ws.events.emit('shop:buy', { kind: 'pet', ref: 'cat_orange', price: 450 });
  ws.events.emit('shop:equip', { kind: 'pet', ref: 'cat_orange' });
  const hud = window.__game.scene.getScene('HUDScene');
  if (hud.shopPanel) { hud.shopPanel.destroy(); hud.shopPanel = undefined; }
});
await sleep(400);
await page.screenshot({ path: 'tmp/bv_cosmetic_equipped.png' });
// Walk so the crown + pet animate/trail; capture from a couple angles.
await page.keyboard.down('ArrowDown'); await sleep(1400); await page.keyboard.up('ArrowDown');
await sleep(200);
await page.screenshot({ path: 'tmp/bv_hat_walk.png' });
await page.keyboard.down('ArrowLeft'); await sleep(1200); await page.keyboard.up('ArrowLeft');
await sleep(200);
await page.screenshot({ path: 'tmp/bv_hat_walk2.png' });

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

// Open the entity action menu (Chat / Fight / …) on the nearest mob.
await page.evaluate(() => {
  const ws = window.__game.scene.getScene('WorldScene');
  const w = ws && ws.world;
  if (!ws || !w) return;
  const p = w.player;
  let best = null, bd = 1e9;
  for (const e of w.entities.values()) {
    if ((e.kind !== 'mob' && e.kind !== 'npc') || e.dead || e.id === w.playerId) continue;
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) ws.openEntityMenu(best.id);
});
await sleep(500);
await page.screenshot({ path: 'tmp/bv_menu.png' });

// Incoming duel-challenge prompt (Accept / Decline).
await page.evaluate(() => {
  const hud = window.__game.scene.getScene('HUDScene');
  if (hud && hud.showDuelPrompt) hud.showDuelPrompt('Arjuna the Bold');
});
await sleep(600);
await page.screenshot({ path: 'tmp/bv_duel.png' });

// Drive to find the lake (south) and the town (east) to verify water + buildings.
const drive = async (key, ms, name) => {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(300);
  await page.screenshot({ path: `tmp/${name}.png` });
};
await drive('ArrowDown', 7000, 'bv_south');
await drive('ArrowRight', 8000, 'bv_east');
await drive('ArrowRight', 8000, 'bv_east2');
// Launch the CombatScene directly with test data (via the dev __game handle).
await page.evaluate(() => {
  const g = window.__game;
  if (!g) return;
  const hud = g.scene.getScene('HUDScene');
  if (hud && hud.closeDuelPrompt) hud.closeDuelPrompt(); // clear the leftover modal
  g.scene.start('CombatScene', {
    enemy: { id: 'vigyan1', label: 'Vigyan Varah', subject: 'maths', tier: 1, hp: 66, maxHp: 66 },
    playerHp: 90, playerMaxHp: 100, playerClass: 'kshatriya',
    questions: g.registry.get('questions') || [],
  });
});
await sleep(1800);
await page.screenshot({ path: 'tmp/bv_combat.png' });

// Simulate a big hit (floating number + shake), then a victory banner.
await page.evaluate(() => {
  const cs = window.__game.scene.getScene('CombatScene');
  if (cs && cs.enemySprite) {
    cs.floatText(cs.enemySprite.x, cs.enemySprite.y - 56, '-38', '#fde047');
    cs.enemySprite.setTint(0xff8888);
    cs.enemyHp = 8; cs.refreshHPBars && cs.refreshHPBars();
  }
});
await sleep(500);
await page.screenshot({ path: 'tmp/bv_combat_hit.png' });
await page.evaluate(() => {
  const cs = window.__game.scene.getScene('CombatScene');
  if (cs && cs.endCombat) cs.endCombat(true);
});
await sleep(700);
await page.screenshot({ path: 'tmp/bv_combat_win.png' });

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
