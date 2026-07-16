import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r=>setTimeout(r,2500));

// Inject candidate CSS fix
await page.addStyleTag({ content: `
  body[data-start-panel="login-panel"] #bv-feature-strip,
  body[data-start-panel="realm-panel"] #bv-feature-strip,
  body[data-start-panel="charselect-panel"] #bv-feature-strip,
  body[data-start-panel="charcreate-panel"] #bv-feature-strip,
  body[data-start-panel="login-panel"] #bv-players-online,
  body[data-start-panel="realm-panel"] #bv-players-online,
  body[data-start-panel="charselect-panel"] #bv-players-online,
  body[data-start-panel="charcreate-panel"] #bv-players-online { display: none !important; }
  body[data-start-panel="login-panel"] #hero-view,
  body[data-start-panel="realm-panel"] #hero-view,
  body[data-start-panel="charselect-panel"] #hero-view,
  body[data-start-panel="charcreate-panel"] #hero-view {
    justify-content: flex-start !important;
    padding-top: 32px !important;
  }
`});

await page.evaluate(() => document.querySelector('#btn-play-online').click());
await new Promise(r=>setTimeout(r,700));

const m = await page.evaluate(() => {
  const ss = document.querySelector('#start-screen');
  const lb = document.querySelector('#btn-login');
  const lp = document.querySelector('#login-panel');
  ss.scrollTop = 0;
  const lbR = lb.getBoundingClientRect();
  const lpR = lp.getBoundingClientRect();
  return {
    ssScrollHeight: ss.scrollHeight,
    ssClientHeight: ss.clientHeight,
    needsScroll: ss.scrollHeight > ss.clientHeight,
    loginPanel_y: Math.round(lpR.y),
    loginPanel_bottom: Math.round(lpR.bottom),
    loginBtn_y: Math.round(lbR.y),
    loginBtn_bottom: Math.round(lbR.bottom),
    loginBtn_inViewport: lbR.bottom <= 800 && lbR.top >= 64,
  };
});
console.log('WITH CSS FIX:', JSON.stringify(m,null,1));
await page.screenshot({ path: 'scripts/probe-cssfix.png' });
await browser.close();
