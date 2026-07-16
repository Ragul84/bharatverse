import puppeteer from 'puppeteer-core';
const BROWSER = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SHOTS = 'C:\\tmp\\bv_shots';
const fs = await import('node:fs'); fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: '+e.message));
page.on('console', (m) => { if (m.type()==='error') errors.push('CONSOLE: '+m.text()); });

// 1. clean landing
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 20000 });
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({ path: SHOTS+'\\10_landing_clean.png' });

// 2. Enter the Realm -> login
await page.click('#btn-play-online').catch(()=>{});
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path: SHOTS+'\\11_login.png' });

// 3. Register a throwaway account
const user = 'bvtest'+Math.floor(Math.random()*100000);
await page.evaluate(() => { document.querySelectorAll('[data-auth-mode="register"], #btn-show-register, [data-switch-auth="register"]').forEach(b => b.click()); });
await new Promise(r=>setTimeout(r,400));
await page.type('#login-user', user).catch(()=>{});
await page.type('#login-pass', 'Test1234!').catch(()=>{});
const emailEl = await page.$('#login-email'); if (emailEl) await emailEl.type(user+'@test.local');
await page.click('#btn-auth-submit').catch(()=>{});
await new Promise(r=>setTimeout(r,4500));
await page.screenshot({ path: SHOTS+'\\12_after_register.png' });

const post = await page.evaluate(() => {
  const o=[];
  for (const id of ['hero-view','login-panel','charselect-panel','charcreate-panel','phaser-game-container']) {
    const el=document.getElementById(id); if(!el){o.push(id+':ABSENT');continue;}
    const cs=window.getComputedStyle(el); o.push(id+':'+cs.display+'/'+Math.round(el.getBoundingClientRect().width)+'x'+Math.round(el.getBoundingClientRect().height));
  }
  o.push('canvas='+document.querySelectorAll('canvas').length);
  o.push('game-active='+document.body.classList.contains('game-active'));
  o.push('startScreen.display='+document.getElementById('start-screen')?.style.display);
  return o.join(' | ');
});
console.log('POST-REGISTER: '+post);
console.log('ERRORS:'); errors.slice(0,12).forEach(e=>console.log(e));
await browser.close();
