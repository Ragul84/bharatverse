import puppeteer from 'puppeteer-core';
const BROWSER = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:5173/';
const SHOTS = 'C:\\tmp\\bv_shots';

async function main() {
  const fs = await import('node:fs');
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  console.log('1. Landing...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: SHOTS + '\\01_landing.png' });
  const v1 = await page.evaluate(() => ['hero-view','login-panel','charselect-panel','charcreate-panel','realm-panel','phaser-game-container'].map(id => { const el = document.getElementById(id); return el ? id+':'+window.getComputedStyle(el).display+'/'+el.getBoundingClientRect().width : id+':ABSENT'; }).join(' | ') + ' | game-active='+document.body.classList.contains('game-active') + ' | startScreen='+document.getElementById('start-screen')?.style.display);
  console.log('STATE1: ' + v1);

  console.log('2. Enter the Realm...');
  await page.click('#btn-play-online').catch(() => console.log('  no btn'));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: SHOTS + '\\02_login.png' });

  console.log('3. Register throwaway...');
  const user = 'bvtest' + Math.floor(Math.random()*100000);
  await page.evaluate(() => { document.querySelectorAll('[data-auth-mode="register"], #btn-show-register, [data-switch-auth="register"]').forEach(b => b.click()); });
  await new Promise(r => setTimeout(r, 400));
  await page.type('#login-user', user).catch(()=>{});
  await page.type('#login-pass', 'Test1234!').catch(()=>{});
  const emailEl = await page.$('#login-email'); if (emailEl) await emailEl.type(user+'@test.local');
  await page.click('#btn-auth-submit').catch(()=>{});
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: SHOTS + '\\03_after_auth.png' });
  const v2 = await page.evaluate(() => ['hero-view','login-panel','charselect-panel','charcreate-panel','phaser-game-container'].map(id => { const el = document.getElementById(id); return el ? id+':'+window.getComputedStyle(el).display+'/'+Math.round(el.getBoundingClientRect().width) : id+':ABSENT'; }).join(' | ') + ' | canvas='+document.querySelectorAll('canvas').length);
  console.log('STATE2: ' + v2);

  console.log('--- errors (first 12) ---');
  errors.slice(0,12).forEach(e => console.log(e));
  await browser.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
