import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new' });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 20000 });
await new Promise(r=>setTimeout(r,1500));
const info = await page.evaluate(() => {
  const out = [];
  for (const id of ['hero-view','charselect-panel','charcreate-panel']) {
    const el = document.getElementById(id); if(!el){out.push(id+':ABSENT');continue;}
    const cs = window.getComputedStyle(el);
    out.push(id+': display='+cs.display+' hidden='+el.hidden+' w='+Math.round(el.getBoundingClientRect().width));
  }
  return out.join(' | ');
});
console.log('LANDING: '+info);
await browser.close();
