'use strict';
// Checks the eval runner without running Claude: it must print one command per case and condition,
// and every case must be runnable with and without the skill.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals', 'cases.json'), 'utf8')).cases;

const r = spawnSync(process.execPath, [path.join(ROOT, 'evals', 'run.js'), '--dry-run'], { encoding: 'utf8' });
assert.strictEqual(r.status, 0, r.stderr);
const lines = r.stdout.trim().split('\n');
assert.strictEqual(lines.length, cases.length * 2, 'expected one command per case per condition');
assert.ok(lines.some((l) => l.includes('--plugin-dir')), 'with-skill runs must load the plugin');
assert.ok(lines.some((l) => !l.includes('--plugin-dir')), 'without-skill runs must not load the plugin');
assert.ok(!fs.existsSync(path.join(ROOT, 'evals', 'results')), 'dry run must not write results');

console.log(`ok - eval runner prints ${lines.length} commands for ${cases.length} cases (dry run)`);
