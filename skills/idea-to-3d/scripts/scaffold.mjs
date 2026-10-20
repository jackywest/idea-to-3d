#!/usr/bin/env node
// Copy the scene template into a NEW folder. Never overwrites existing files unless --force.
// Usage: node scaffold.mjs <target-dir> [--scene path/to/scene.js] [--no-assets] [--force]
// Also copies the bundled CC0 asset pack (skills/idea-to-3d/assets) into <target>/assets unless --no-assets.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tpl = path.resolve(here, '..', 'template');
const args = process.argv.slice(2);
const force = args.includes('--force'), noAssets = args.includes('--no-assets');
const si = args.indexOf('--scene');
const scenePath = si >= 0 ? args[si + 1] : null;
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--scene');
if (!target) { console.error('usage: node scaffold.mjs <target-dir> [--scene scene.js] [--force]'); process.exit(2); }

const dest = path.resolve(target);
if (dest === path.parse(dest).root || dest === process.env.HOME) { console.error('refusing to write to a root or home directory'); process.exit(2); }
if (fs.existsSync(dest) && fs.readdirSync(dest).length && !force) { console.error(`${dest} is not empty. Pick a new folder or pass --force.`); process.exit(3); }

function copy(src, dst) {
  const st = fs.lstatSync(src);
  if (st.isSymbolicLink()) return;                 // never follow links
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); }
  else fs.copyFileSync(src, dst);
}
copy(tpl, dest);
const pack = path.resolve(here, '..', 'assets');
if (!noAssets && fs.existsSync(pack)) copy(pack, path.join(dest, 'assets'));
if (scenePath) {
  const s = path.resolve(scenePath);
  if (!fs.existsSync(s)) { console.error('scene file not found: ' + s); process.exit(4); }
  fs.copyFileSync(s, path.join(dest, 'src', 'scene.js'));
}
console.log(`Scene project created: ${dest}\nNext: cd "${dest}" && node serve.mjs   then open http://127.0.0.1:5173/`);
