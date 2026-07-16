import puppeteer from 'puppeteer-core';
const BROWSER = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 20000 });
await new Promise(r=>setTimeout(r,1200));
await page.click('#btn-play-online').catch(()=>{});
await new Promise(r=>setTimeout(r,600));
// switch to register
await page.evaluate(() => { document.querySelectorAll('[data-auth-mode="register"], #btn-show-register, [data-switch-auth="register"]').forEach(b => b.click()); });
await new Promise(r=>setTimeout(r,400));
const user = 'bvtest'+Math.floor(Math.random()*100000);
await page.type('#login-user', user);
await page.type('#login-pass', 'Test1234!');
const emailEl = await page.$('#login-email'); if (emailEl) await emailEl.type(user+'@test.local');
// what fields exist + turnstile?
const fields = await page.evaluate(() => {
  const o=[];
  for (const id of ['login-user','login-pass','login-email','login-pass-confirm']) { const e=document.getElementById(id); o.push(id+':'+(e?'present':'absent')); }
  o.push('turnstile visible: ' + !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]'));
  o.push('auth-mode attr: ' + (document.getElementById('login-panel')?.dataset.authMode));
  return o.join(' | ');
});
console.log('FIELDS: '+fields);
await page.click('#btn-auth-submit').catch(()=>{});
await new Promise(r=>setTimeout(r,4000));
const after = await page.evaluate(() => {
  const errEl = document.querySelector('#login-error, .auth-error, [id$="error"]');
  const o=[];
  o.push('login-error text: ' + (errEl?.textContent?.trim() || '(none)'));
  o.push('login-panel display: ' + (document.getElementById('login-panel') ? window.getComputedStyle(document.getElementById('login-panel')).display : 'gone'));
  o.push('phaser present: ' + !!document.getElementById('phaser-game-container'));
  return o.join(' | ');
});
console.log('AFTER: '+after);
await browser.close();
