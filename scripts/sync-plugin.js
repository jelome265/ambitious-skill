#!/usr/bin/env node
'use strict';
// Copies the canonical skill (SKILL.md and references/) into the plugin directory.
// The root files are the source of truth. test/plugin.test.js fails if the copies drift.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'plugins', 'ambitious', 'skills', 'ambitious');

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
    else throw new Error(`unexpected entry in skill: ${s}`);
  }
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'SKILL.md'), path.join(DEST, 'SKILL.md'));
copyTree(path.join(ROOT, 'references'), path.join(DEST, 'references'));
console.log(`Synced SKILL.md and references/ into ${path.relative(ROOT, DEST)}`);
