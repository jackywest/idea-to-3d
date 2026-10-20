#!/usr/bin/env node
// Check a scene in a real headless browser: serves it, loads it, reads console errors, saves frames, rejects blank images.
// Needs `puppeteer-core` (or `puppeteer`) installed in the project:  npm i -D puppeteer-core
// Usage: node capture.mjs <project-dir> [--times 0,2,4,6] [--out captures] [--size 960x540] [--query "mood=night"]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const proj = path.resolve(a.find((x, i) => !x.startsWith('--') && !a[i - 1]?.startsWith('--')) || '.');
const times = opt('times', '0,2,4,6').split(',').map(Number);
const out = path.resolve(proj, opt('out', 'captures'));
const [W, H] = opt('size', '960x540').split('x').map(Number);
const query = opt('query', '');
if (!out.startsWith(proj + path.sep)) { console.error('--out must stay inside the project'); process.exit(2); }

const req = createRequire(path.join(proj, 'x.js'));
let pptr;
const reqHere = createRequire(import.meta.url);
for (const r of [req, reqHere]) for (const n of ['puppeteer', 'puppeteer-core']) { if (pptr) break; try { pptr = r(n); } catch {} }
if (!pptr) { console.error('Install a browser driver first:  npm i -D puppeteer-core  (and set CHROME_PATH if Chrome is not found)'); process.exit(5); }
const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find(p => fs.existsSync(p));

const { start } = await import(pathToFileURL(path.join(proj, 'serve.mjs')).href);
const srv = await start(0);
const port = srv.address().port;
fs.mkdirSync(out, { recursive: true });
const browser = await pptr.launch({ headless: true, executablePath: chrome, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const report = { frames: [], errors: [], ok: true };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', e => report.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?${query}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__i3d && window.__i3d.ready', { timeout: 20000 });
  for (const t of times) {
    await page.evaluate(`window.__setTime(${t})`);
    await new Promise(r => setTimeout(r, 400));
    const file = path.join(out, `t${String(t).replace('.', '_')}.png`);
    await page.screenshot({ path: file });
    const stats = await page.evaluate(() => { const c = document.getElementById('c'); const g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let s = 0, s2 = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; } const m = s / n; return { mean: +m.toFixed(3), std: +Math.sqrt(s2 / n - m * m).toFixed(2) }; });
    report.frames.push({ t, file: path.relative(proj, file), ...stats });
    if (stats.std < 3) { report.ok = false; report.errors.push(`frame t=${t} looks blank (std ${stats.std})`); }
  }
  report.errors.push(...(await page.evaluate('window.__i3d.errors')));
  if (report.frames.length > 1 && new Set(report.frames.map(f => f.mean)).size === 1) report.errors.push('scene does not change over time');
  if (report.errors.length) report.ok = false;
} finally { await browser.close(); srv.close(); }
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
