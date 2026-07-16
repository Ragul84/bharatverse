// Quick visual capture of the running BharatVerse client (needs `npm run dev` on :5173).
// Saves desktop + mobile screenshots to tmp/. Dev-only helper.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { BROWSER_PATH } from './browser_path.mjs';

const URL = process.env.GAME_URL || 'http://localhost:5173';
mkdirSync('tmp', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const errs = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errs.push(String(e)));

await page.setViewport({ width: 1366, height: 850, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(3500);
await page.screenshot({ path: 'tmp/bv_desktop.png' });
console.log('saved tmp/bv_desktop.png; title=', JSON.stringify(await page.title()));

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
await sleep(3500);
await page.screenshot({ path: 'tmp/bv_mobile.png' });
console.log('saved tmp/bv_mobile.png');

if (errs.length) console.log('page errors:', errs.slice(0, 5));
await browser.close();
console.log('DONE');
