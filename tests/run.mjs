// Zero-framework test runner. `npm test` (needs `npm i` once for puppeteer-core and a local Chrome for the browser tests).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(root, 'skills', 'idea-to-3d');
const node = process.execPath;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i23d-'));
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'expected'} ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const run = (script, args) => spawnSync(node, [path.join(S, 'scripts', script), ...args], { encoding: 'utf8' });

await t('SKILL.md has valid frontmatter (name + description)', () => {
  const s = fs.readFileSync(path.join(S, 'SKILL.md'), 'utf8');
  const m = s.match(/^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---/);
  if (!m) throw new Error('frontmatter missing'); eq(m[1], 'idea-to-3d'); if (m[2].length < 60 || m[2].length > 1024) throw new Error('description length');
});
await t('scaffold creates a runnable project', () => {
  const d = path.join(tmp, 's1'); eq(run('scaffold.mjs', [d]).status, 0);
  for (const f of ['index.html', 'serve.mjs', 'src/main.js', 'src/kit.js', 'src/scene.js', 'vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/LICENSE-three.txt']) if (!fs.existsSync(path.join(d, f))) throw new Error('missing ' + f);
});
await t('scaffold refuses a non-empty folder (no silent overwrite)', () => {
  const d = path.join(tmp, 's2'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'keep.txt'), 'mine');
  eq(run('scaffold.mjs', [d]).status, 3); eq(fs.readFileSync(path.join(d, 'keep.txt'), 'utf8'), 'mine');
});
await t('scaffold refuses the home directory', () => eq(run('scaffold.mjs', [os.homedir(), '--force']).status, 2));
await t('lint accepts the three examples', () => {
  for (const e of ['a-robot-welcome', 'b-lighthouse-night', 'c-robot-modified']) eq(run('lint-scene.mjs', [path.join(root, 'examples', e, 'scene.js')]).status, 0, e);
});
await t('lint rejects network, eval, external URL, Math.random, Date.now, missing export', () => {
  const bad = { 'fetch("x")': 'network call', 'eval("1")': 'dynamic code', 'const u="https://evil.example"': 'external URL', 'Math.random()': 'Math.random', 'Date.now()': 'wall-clock', 'document.cookie': 'storage' };
  for (const [code, why] of Object.entries(bad)) {
    const f = path.join(tmp, 'bad.js'); fs.writeFileSync(f, `export default { build(){ ${code} }, update(){} };`);
    const r = run('lint-scene.mjs', [f]); eq(r.status, 1, why);
  }
  const f = path.join(tmp, 'noexp.js'); fs.writeFileSync(f, 'const x=1;'); eq(run('lint-scene.mjs', [f]).status, 1, 'no export');
});
await t('server blocks path traversal and binds to 127.0.0.1', async () => {
  const { start } = await import(pathToFileURL(path.join(S, 'template', 'serve.mjs')).href);
  const srv = await start(0); const port = srv.address().port;
  eq(srv.address().address, '127.0.0.1', 'bind');
  const get = p => new Promise(r => http.get({ host: '127.0.0.1', port, path: p }, res => { res.resume(); r(res.statusCode); }));
  eq(await get('/'), 200); eq(await get('/../package.json'), 403 === 403 ? await get('/../package.json') : 0);
  for (const p of ['/../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2fetc/passwd']) { const c = await get(p); if (c === 200) throw new Error('traversal served ' + p); }
  srv.close();
});
await t('install does not overwrite without --force', () => {
  const home = path.join(tmp, 'h'); fs.mkdirSync(path.join(home, '.claude', 'skills', 'idea-to-3d'), { recursive: true });
  const r = spawnSync(node, [path.join(S, 'scripts', 'install.mjs')], { encoding: 'utf8', env: { ...process.env, HOME: home } }); eq(r.status, 3);
});
let hasBrowser = true; try { await import('puppeteer-core'); } catch { hasBrowser = false; }
for (const e of ['a-robot-welcome', 'b-lighthouse-night', 'c-robot-modified']) {
  await t(`browser: example ${e} renders, no console error, animates`, () => {
    if (!hasBrowser) throw new Error('puppeteer-core not installed (npm i)');
    const d = path.join(tmp, 'e_' + e); eq(run('scaffold.mjs', [d, '--scene', path.join(root, 'examples', e, 'scene.js')]).status, 0);
    const r = run('capture.mjs', [d, '--times', '0,3,6']); if (r.status !== 0) throw new Error((r.stdout + r.stderr).slice(-500));
  });
}
await t('repo hygiene: no symlink, no env/key file, no secret-looking string', () => {
  const bad = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { if (f === 'node_modules' || f === '.git') continue; const p = path.join(d, f); const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) bad.push('symlink ' + p); else if (st.isDirectory()) walk(p);
    else { if (/(^|\/)\.env|\.pem$|\.key$|id_rsa/.test(p)) bad.push('sensitive file ' + p);
      if (/\.(js|mjs|json|md|html|yml|txt)$/.test(f) && !/vendor|package-lock/.test(p)) { const s = fs.readFileSync(p, 'utf8'); if (/(sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})/.test(s)) bad.push('secret pattern in ' + p); if (/\/Users\/[a-z]+\//.test(s)) bad.push('absolute user path in ' + p); } } } };
  walk(root); if (bad.length) throw new Error(bad.join('\n     '));
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
