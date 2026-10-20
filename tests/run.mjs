// Zero-framework test runner. `npm test` (needs `npm i` once for puppeteer-core and a local Chrome for the browser tests).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(root, 'skills', 'idea-to-3d');
const node = process.execPath;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i23d-'));
let pass = 0, fail = 0;
const t = async (name, fn) => { if (process.env.ONLY && !name.includes(process.env.ONLY)) return; try { await fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'expected'} ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const run = (script, args, env) => spawnSync(node, [path.join(S, 'scripts', script), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
const scaffold = (name, scene, extra = []) => { const d = path.join(tmp, name); const r = run('scaffold.mjs', [d, ...(scene ? ['--scene', scene] : []), ...extra]); eq(r.status, 0, 'scaffold ' + name + ': ' + r.stderr); return d; };

// ---- structure and safety (no browser) --------------------------------------------------------
await t('SKILL.md has valid frontmatter (name + description)', () => {
  const s = fs.readFileSync(path.join(S, 'SKILL.md'), 'utf8');
  const m = s.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---/);
  ok(m, 'frontmatter missing'); eq(m[1], 'idea-to-3d'); ok(m[2].length >= 60 && m[2].length <= 1024, 'description length');
});
await t('scaffold creates a runnable project with the bundled CC0 asset pack', () => {
  const d = scaffold('s1');
  for (const f of ['index.html', 'serve.mjs', 'src/main.js', 'src/kit.js', 'src/cine.js', 'src/anims.js', 'src/assets.js', 'src/city.js', 'src/scene.js', 'vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/addons/loaders/GLTFLoader.js', 'vendor/LICENSE-three.txt', 'assets/NOTICE.md']) ok(fs.existsSync(path.join(d, f)), 'missing ' + f);
});
await t('scaffold --no-assets leaves the asset pack out', () => ok(!fs.existsSync(path.join(scaffold('s0', null, ['--no-assets']), 'assets'))));
await t('scaffold refuses a non-empty folder (no silent overwrite)', () => {
  const d = path.join(tmp, 's2'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'keep.txt'), 'mine');
  eq(run('scaffold.mjs', [d]).status, 3); eq(fs.readFileSync(path.join(d, 'keep.txt'), 'utf8'), 'mine');
});
await t('scaffold refuses the home directory', () => eq(run('scaffold.mjs', [os.homedir(), '--force']).status, 2));
await t('install does not overwrite without --force', () => {
  const home = path.join(tmp, 'h'); fs.mkdirSync(path.join(home, '.claude', 'skills', 'idea-to-3d'), { recursive: true });
  eq(run('install.mjs', [], { HOME: home }).status, 3);
});
await t('static server: traversal attempts never reach a canary file outside the project, positive control works', async () => {
  const proj = path.join(tmp, 'srv', 'project'); fs.mkdirSync(proj, { recursive: true });
  fs.cpSync(path.join(S, 'template'), proj, { recursive: true });
  const CANARY = 'CANARY-' + Math.random().toString(36).slice(2); fs.writeFileSync(path.join(tmp, 'srv', 'secret.txt'), CANARY);
  const { start } = await import(pathToFileURL(path.join(proj, 'serve.mjs')).href);
  const srv = await start(0); const port = srv.address().port; eq(srv.address().address, '127.0.0.1', 'bind');
  const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res({ code: r.statusCode, body: b })); }).on('error', rej));
  const control = await get('/index.html'); eq(control.code, 200, 'control status'); ok(control.body.includes('<canvas'), 'control body');
  for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%2e%2e%2fsecret.txt', '/..\\secret.txt', '//../secret.txt', '/./../secret.txt', '/src/../../secret.txt']) {
    const r = await get(p); ok(!r.body.includes(CANARY), 'canary leaked via ' + p); ok(r.code !== 200, `traversal ${p} answered ${r.code}`);
  }
  srv.close();
});
await t('serve.mjs starts when launched through a symlinked folder (macOS tmp, user symlinks)', async () => {
  const real = scaffold('sym_real', null, ['--no-assets']); const link = path.join(tmp, 'sym_link'); fs.symlinkSync(real, link);
  const port = 5600 + Math.floor(Math.random() * 300); const { spawn } = await import('node:child_process');
  const p = spawn(node, [path.join(link, 'serve.mjs'), String(port)]); let out = ''; p.stdout.on('data', d => out += d);
  await new Promise(r => setTimeout(r, 1500)); p.kill(); ok(out.includes('127.0.0.1:' + port), 'server did not start through the symlink: ' + out);
});
await t('lint accepts every example', () => {
  const dirs = [...fs.readdirSync(path.join(root, 'examples')).filter(d => d !== 'legacy').map(d => path.join('examples', d)), ...fs.readdirSync(path.join(root, 'examples', 'legacy')).map(d => path.join('examples', 'legacy', d))];
  for (const d of dirs) eq(run('lint-scene.mjs', [path.join(root, d, 'scene.js')]).status, 0, d);
});
await t('lint rejects network, eval, external URL, Math.random, Date.now, storage, missing export', () => {
  const bad = { 'fetch("x")': 1, 'eval("1")': 1, 'const u="https://evil.example"': 1, 'Math.random()': 1, 'Date.now()': 1, 'document.cookie': 1, 'new Function("1")': 1, 'new WebSocket("x")': 1 };
  for (const code of Object.keys(bad)) { const f = path.join(tmp, 'bad.js'); fs.writeFileSync(f, `export default { build(){ ${code} }, update(){} };`); eq(run('lint-scene.mjs', [f]).status, 1, code); }
  const f = path.join(tmp, 'noexp.js'); fs.writeFileSync(f, 'const x=1;'); eq(run('lint-scene.mjs', [f]).status, 1, 'no export');
});
await t('asset pack: every bundled file has CC0 attribution in NOTICE.md, no symlink, only allowed extensions', () => {
  const a = path.join(S, 'assets'); const notice = fs.readFileSync(path.join(a, 'NOTICE.md'), 'utf8'); ok(/CC0/.test(notice));
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.lstatSync(p); ok(!st.isSymbolicLink(), 'symlink ' + p); if (st.isDirectory()) walk(p); else { ok(/\.(glb|png|jpg|txt|md)$/i.test(f), 'unexpected file type ' + p); } } }; walk(a);
  for (const f of fs.readdirSync(a)) if (fs.statSync(path.join(a, f)).isDirectory()) ok(fs.existsSync(path.join(a, f, 'LICENSE.txt')), 'no licence text for ' + f);
  ok(fs.statSync(a).isDirectory()); const total = (function sz(d) { return fs.readdirSync(d).reduce((s, f) => { const p = path.join(d, f); return s + (fs.statSync(p).isDirectory() ? sz(p) : fs.statSync(p).size); }, 0); })(a); ok(total < 8 * 1048576, 'asset pack grew beyond 8 MB: ' + total);
});

// ---- browser tests ----------------------------------------------------------------------------
let pptr = null; for (const r of [createRequire(import.meta.url)]) { try { pptr = r('puppeteer-core'); } catch {} }
const cached = (() => { try { const b = path.join(os.homedir(), '.cache/puppeteer/chrome'); const d = fs.readdirSync(b).sort().pop(); const p = path.join(b, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'); return fs.existsSync(p) ? p : null; } catch { return null; } })();
const chrome = [process.env.CHROME_PATH, cached, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const needBrowser = () => ok(pptr && chrome, 'puppeteer-core / Chrome not available (npm i, or set CHROME_PATH)');
async function withPage(proj, fn) {
  needBrowser();
  const { start } = await import(pathToFileURL(path.join(proj, 'serve.mjs')).href); const srv = await start(0);
  const browser = await pptr.launch({ headless: true, executablePath: chrome, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  try { const page = await browser.newPage(); await page.setViewport({ width: 960, height: 540 }); const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text()));
    await page.goto(`http://127.0.0.1:${srv.address().port}/?capture=1`, { waitUntil: 'load', timeout: 60000 }); await page.waitForFunction('window.__i3d && window.__i3d.ready', { timeout: 60000 }); return await fn(page, errs); }
  finally { await browser.close(); srv.close(); }
}
const qa = (dir, extra = []) => { const r = run('cine-qa.mjs', [dir, '--fps', '6', ...extra]); let j = null; try { j = JSON.parse(r.stdout); } catch {} return { status: r.status, j, raw: r.stdout + r.stderr }; };

for (const e of ['a-city-courier', 'b-robot-mishap', 'c-ai-pipeline']) {
  await t(`example ${e}: cinematography audit passes (subject framed, no occlusion, no clipping, motivated moves, enough motion)`, () => {
    const d = scaffold('ex_' + e, path.join(root, 'examples', e, 'scene.js')); const r = qa(d); ok(r.j, 'no report: ' + r.raw.slice(-300));
    eq(r.status, 0, 'audit: ' + JSON.stringify(r.j.problems) + ' errors ' + JSON.stringify(r.j.errors)); ok(r.j.stats.shots >= 5, 'fewer than 5 shots'); ok(r.j.stats.totalMotionUnits > 20, 'static');
  });
}
for (const e of ['a-robot-welcome', 'b-lighthouse-night', 'c-robot-modified']) {
  await t(`v0.1 compatibility: legacy scene ${e} still renders, animates, no console error`, () => {
    const d = scaffold('lg_' + e, path.join(root, 'examples', 'legacy', e, 'scene.js'), ['--no-assets']); const r = run('capture.mjs', [d, '--times', '0,3,6']); eq(r.status, 0, (r.stdout + r.stderr).slice(-400));
  });
}
await t('audit rejects a deliberately bad scene (camera in wall, static, moving shot without reason, subject out of frame)', () => {
  const d = scaffold('bad', path.join(root, 'tests/fixtures/bad-scene.js'), ['--no-assets']); const r = qa(d); ok(r.j, r.raw.slice(-300)); eq(r.status, 1, 'audit should fail'); const p = r.j.problems.join(' | ');
  for (const k of ['camera inside geometry', 'static', 'without a "why"']) ok(p.includes(k), `expected problem "${k}" in: ${p}`);
});
await t('audit accepts a well directed minimal scene', () => { const d = scaffold('good', path.join(root, 'tests/fixtures/good-scene.js'), ['--no-assets']); const r = qa(d); eq(r.status, 0, JSON.stringify(r.j && r.j.problems)); });
await t('determinism: pose at t is a pure function of t (order of evaluation does not matter)', async () => {
  const d = scaffold('det', path.join(root, 'tests/fixtures/good-scene.js'), ['--no-assets']);
  await withPage(d, async page => { const r = await page.evaluate(() => { const c = window.__cine, f = t => { const p = c.eval(t); const a = c.actors.get('bot'); return JSON.stringify([p.pos.toArray(), p.target.toArray(), a.group.position.toArray(), a.group.rotation.y]); }; const a1 = f(5.3); f(1); f(7.9); f(0); const a2 = f(5.3); return [a1, a2]; }); eq(r[0], r[1], 'poses differ'); });
});
await t('keyframed props are a pure function of t (no stale scale/rotation/visibility from other instants)', async () => {
  const d = scaffold('keys', path.join(root, 'tests/fixtures/keys-scene.js'), ['--no-assets']);
  await withPage(d, async page => { const r = await page.evaluate(() => { const c = window.__cine, p = c.props.get('p'), f = t => { c.eval(t); return JSON.stringify([p.group.position.toArray(), p.group.scale.toArray(), p.group.rotation.toArray().slice(0, 3), p.group.visible]); }; const a = f(1); f(9); f(5); f(2); return [a, f(1)]; }); eq(r[0], r[1], 'prop state depends on evaluation order'); });
});
await t('camera: tracking keeps the subject in frame and never enters geometry; reveal ends wider than it starts', async () => {
  const d = scaffold('cam', path.join(root, 'tests/fixtures/good-scene.js'), ['--no-assets']);
  await withPage(d, async page => { const r = await page.evaluate(() => { const c = window.__cine; const a = c.audit({ fps: 10 }); const s0 = c.eval(4.05).pos.distanceTo(c.eval(4.05).target), s1 = c.eval(7.95).pos.distanceTo(c.eval(7.95).target); return { st: a.stats, s0, s1 }; });
    eq(r.st.subjectOffFramePct, 0, 'subject left the frame'); eq(r.st.cameraInGeometryPct, 0, 'camera in geometry'); ok(r.s1 > r.s0 * 1.5, `reveal did not pull back (${r.s0.toFixed(1)} -> ${r.s1.toFixed(1)})`); });
});
await t('assets: textures load, bad paths/schemes/missing/broken files are refused cleanly, missing clip falls back', async () => {
  const d = scaffold('as', path.join(root, 'tests/fixtures/assets-scene.js')); fs.mkdirSync(path.join(d, 'assets', 'bad'), { recursive: true }); fs.writeFileSync(path.join(d, 'assets', 'bad', 'broken.glb'), Buffer.from('not a glb at all, just bytes'));
  await withPage(d, async (page, errs) => { const r = await page.evaluate('window.__assetTest'); ok(r.textureWidth > 0, 'colormap texture did not load');
    for (const k of ['traversal', 'scheme', 'missing', 'broken']) ok(r.errors[k] && r.errors[k] !== 'LOADED', `${k} should be refused, got ${r.errors[k]}`); ok(/refused/.test(r.errors.traversal) && /refused/.test(r.errors.scheme), 'traversal/scheme must be refused before any request');
    ok(r.warnings.some(w => /walk/.test(w)), 'missing clip should be reported as a warning'); const walking = await page.evaluate(() => { const c = window.__cine; c.eval(1.5); return c.actors.get('c').group.position.x; }); ok(walking > 0.5, 'character did not move'); });
});
await t('performance: frame time and triangle budget stay sane on the heaviest example', async () => {
  const d = scaffold('perf', path.join(root, 'examples', 'a-city-courier', 'scene.js'));
  await withPage(d, async page => { const r = await page.evaluate(async () => { const t0 = performance.now(); for (let i = 0; i < 12; i++) window.__setTime(i * 2); const ms = (performance.now() - t0) / 12; return { ms, tris: window.__renderer ? window.__renderer.info.render.triangles : -1 }; });
    console.log(`     perf: ${r.ms.toFixed(0)} ms/frame (software GL), ${r.tris} triangles`); ok(r.ms < 4000, 'frame time ' + r.ms); ok(r.tris < 800000, 'too many triangles ' + r.tris); });
});
await t('repo hygiene: no symlink, no env/key file, no secret-looking string, no private absolute path', () => {
  const bad = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { if (f === 'node_modules' || f === '.git') continue; const p = path.join(d, f); const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) bad.push('symlink ' + p); else if (st.isDirectory()) walk(p);
    else { if (/(^|\/)\.env|\.pem$|\.key$|id_rsa/.test(p)) bad.push('sensitive file ' + p);
      if (/\.(js|mjs|json|md|html|yml|txt)$/.test(f) && !/vendor|package-lock/.test(p)) { const s = fs.readFileSync(p, 'utf8'); if (/(sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})/.test(s)) bad.push('secret pattern in ' + p); if (/\/Users\/[a-z]+\/|hyperframes-assets|Developer\/hyperframes/.test(s) && !/tests\/run\.mjs/.test(p)) bad.push('private path/reference in ' + p); } } } };
  walk(root); if (bad.length) throw new Error(bad.join('\n     '));
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
