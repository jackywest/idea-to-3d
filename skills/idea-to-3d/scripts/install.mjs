#!/usr/bin/env node
// Install the skill by copying it into a Claude Code skills folder. Never overwrites without --force.
// Usage: node install.mjs [--project]   (default: ~/.claude/skills ; --project: ./.claude/skills)  [--force]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..');
const base = process.argv.includes('--project') ? path.resolve('.claude', 'skills') : path.join(os.homedir(), '.claude', 'skills');
const dest = path.join(base, 'idea-to-3d');
if (fs.existsSync(dest) && !process.argv.includes('--force')) { console.error(`${dest} already exists. Use --force to replace it.`); process.exit(3); }
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true, dereference: false, filter: s => !s.includes('node_modules') && !s.endsWith('.DS_Store') });
console.log(`Installed: ${dest}\nOpen Claude Code and say: "Use idea-to-3d: a small robot waving on a hill"`);
