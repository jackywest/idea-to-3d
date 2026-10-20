#!/usr/bin/env node
// Static safety/contract check for a generated scene.js (no browser needed).
// Usage: node lint-scene.mjs <scene.js>
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const f = process.argv[2];
if (!f || !fs.existsSync(f)) { console.error('usage: node lint-scene.mjs <scene.js>'); process.exit(2); }
const src = fs.readFileSync(f, 'utf8');
const problems = [];
try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { problems.push('syntax error: ' + String(e.stderr).split('\n')[0]); }
const banned = [[/\bfetch\s*\(/, 'network call (fetch)'], [/XMLHttpRequest|WebSocket|sendBeacon/, 'network API'], [/\beval\s*\(|new Function\s*\(/, 'dynamic code'], [/document\.cookie|localStorage|sessionStorage/, 'storage access'], [/https?:\/\//, 'external URL'], [/\bimport\s*\(/, 'dynamic import']];
for (const [re, why] of banned) if (re.test(src)) problems.push('forbidden: ' + why);
if (!/export\s+default/.test(src)) problems.push('missing `export default { build, update }`');
if (!/\bbuild\s*\(/.test(src)) problems.push('missing build(ctx)');
if (/Math\.random\s*\(/.test(src)) problems.push('Math.random() breaks reproducibility: use kit.rng(seed)');
if (/Date\.now\s*\(|performance\.now\s*\(/.test(src)) problems.push('wall-clock time breaks reproducibility: use the t argument of update(t)');
console.log(problems.length ? 'FAIL\n- ' + problems.join('\n- ') : 'OK: scene contract respected');
process.exit(problems.length ? 1 : 0);
