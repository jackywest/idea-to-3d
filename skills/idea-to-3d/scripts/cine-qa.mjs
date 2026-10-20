#!/usr/bin/env node
// Objective cinematography check + motion preview.
// Runs the director audit (subject size/visibility, occlusion, camera inside geometry, body penetration, jerk, static scenes,
// moving shots without a "why"), saves a contact sheet of key moments and, with --video, renders an MP4 so you can judge motion.
// Usage: node cine-qa.mjs <project-dir> [--fps 8] [--video 20] [--gpu] [--size 960x540] [--out qa]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const flag = n => a.includes('--' + n);
const proj = path.resolve(a.find((x, i) => !x.startsWith('--') && !a[i - 1]?.startsWith('--')) || '.');
const out = path.resolve(proj, opt('out', 'qa'));
const [W, H] = opt('size', '960x540').split('x').map(Number);
const vfps = Number(opt('video', 0));
if (!out.startsWith(proj + path.sep)) { console.error('--out must stay inside the project'); process.exit(2); }
const req = createRequire(path.join(proj, 'x.js')), reqHere = createRequire(import.meta.url);
let pptr; for (const r of [req, reqHere]) for (const n of ['puppeteer', 'puppeteer-core']) { if (pptr) break; try { pptr = r(n); } catch {} }
if (!pptr) { console.error('Install a browser driver first: npm i -D puppeteer-core'); process.exit(5); }
const cached = (() => { try { const b = path.join(process.env.HOME || '', '.cache/puppeteer/chrome'); const d = fs.readdirSync(b).sort().pop(); const p = path.join(b, d, d.startsWith('mac_arm') || d.startsWith('mac-') ? 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' : 'chrome-linux64/chrome'); return fs.existsSync(p) ? p : null; } catch { return null; } })();
const chrome = [process.env.CHROME_PATH, cached, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const { start } = await import(pathToFileURL(path.join(proj, 'serve.mjs')).href);
const srv = await start(0), port = srv.address().port;
fs.mkdirSync(out, { recursive: true });
const gl = flag('gpu') ? ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await pptr.launch({ headless: true, executablePath: chrome, args: [...gl, '--no-sandbox'] });
const report = { errors: [] };
try {
  const page = await browser.newPage(); await page.setViewport({ width: W, height: H });
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', e => report.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?capture=1&${opt('query', '')}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__i3d && window.__i3d.ready', { timeout: 30000 });
  report.audit = await page.evaluate(`window.__cine.audit({fps:${opt('fps', 8)}})`);
  const info = await page.evaluate('({shots: window.__cine.shots.map(s=>({t:s.t,dur:s.dur,type:s.type,why:s.why||null})), dur: window.__cine.duration})');
  // contact sheet: start, middle and end of each shot
  const times = [...new Set(info.shots.flatMap(s => [s.t + 0.05, s.t + s.dur / 2, s.t + s.dur - 0.05]))].map(t => Math.min(Math.max(t, 0), info.dur - 0.01)).sort((x, y) => x - y);
  const files = [];
  for (const [i, t] of times.entries()) { await page.evaluate(`window.__setTime(${t})`); await new Promise(r => setTimeout(r, 350)); const f = path.join(out, `sheet-${String(i).padStart(2, '0')}.png`); await page.screenshot({ path: f }); files.push(f); }
  report.sheetFrames = files.map(f => path.relative(proj, f));
  if (vfps) {
    const dir = path.join(out, 'frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(info.dur * vfps);
    for (let i = 0; i < n; i++) { await page.evaluate(`window.__setTime(${(i / vfps).toFixed(4)})`); await new Promise(r => setTimeout(r, 60)); await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 }); }
    const mp4 = path.join(out, 'preview.mp4');
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(vfps), '-i', path.join(dir, 'f%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', mp4]);
    report.video = r.status === 0 ? path.relative(proj, mp4) : 'ffmpeg failed';
    fs.rmSync(dir, { recursive: true, force: true });
  }
  report.errors.push(...(await page.evaluate('window.__i3d.errors')));
  report.assetsUsed = await page.evaluate('[...(window.__assetIds||[])].sort()');
} finally { await browser.close(); srv.close(); }
report.ok = report.errors.length === 0 && report.audit && report.audit.pass;
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, stats: report.audit?.stats, problems: report.audit?.problems, details: report.audit?.details, errors: report.errors, video: report.video, sheet: report.sheetFrames?.length }, null, 2));
process.exit(report.ok ? 0 : 1);
