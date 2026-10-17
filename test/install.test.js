'use strict';
// Integration tests for the installer. Uses temp dirs; never touches the real home.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'cli.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-test-'));
const home = path.join(tmp, 'home');
const cwd = path.join(tmp, 'project');
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(cwd, { recursive: true });

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: 'utf8',
    ...opts,
  });
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

test('default install goes to ~/.claude/skills/ambitious with payload and marker', () => {
  const r = run([]);
  assert.strictEqual(r.status, 0, r.stderr);
  const target = path.join(home, '.claude', 'skills', 'ambitious');
  assert.ok(fs.existsSync(path.join(target, 'SKILL.md')));
  for (const f of ['altitude.md', 'depth.md', 'range.md', 'background.md']) {
    assert.ok(fs.existsSync(path.join(target, 'references', f)), f);
  }
  assert.ok(fs.existsSync(path.join(target, '.ambitious-skill.json')));
});

test('SKILL.md frontmatter name is ambitious', () => {
  const head = fs.readFileSync(path.join(home, '.claude/skills/ambitious/SKILL.md'), 'utf8').split('\n');
  assert.strictEqual(head[0], '---');
  assert.strictEqual(head[1], 'name: ambitious');
});

test('second install without --force is refused', () => {
  const r = run([]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /already exists/);
});

test('--force overwrites an install it owns', () => {
  const r = run(['--force']);
  assert.strictEqual(r.status, 0, r.stderr);
});

test('--force refuses to overwrite a directory it did not create', () => {
  const foreign = path.join(home, '.claude', 'skills', 'ambitious');
  fs.rmSync(path.join(foreign, '.ambitious-skill.json'));
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /refusing to overwrite/);
  fs.writeFileSync(path.join(foreign, '.ambitious-skill.json'), '{}');
});

test('--project installs under ./.claude/skills', () => {
  const r = run(['--project']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(cwd, '.claude', 'skills', 'ambitious', 'SKILL.md')));
});

test('--dir installs under the given root', () => {
  const custom = path.join(tmp, 'custom-skills');
  const r = run(['--dir', custom]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(custom, 'ambitious', 'SKILL.md')));
});

test('--project and --dir together are rejected', () => {
  const r = run(['--project', '--dir', tmp]);
  assert.notStrictEqual(r.status, 0);
});

test('uninstall removes only an install it owns', () => {
  const r = run(['uninstall']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'skills', 'ambitious')));
});

test('uninstall refuses a directory without the marker', () => {
  const dir = path.join(tmp, 'unowned', 'ambitious');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'mine');
  const r = run(['uninstall', '--dir', path.join(tmp, 'unowned')]);
  assert.notStrictEqual(r.status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'keep.txt')));
});

test('unknown argument fails with a message', () => {
  const r = run(['--bogus']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /unknown argument/);
});

test('--version prints the package version', () => {
  const r = run(['--version']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} tests passed`);
