'use strict';
// Installer tests. Every case runs in a temp directory; the real home is never touched.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'cli.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-test-'));
const home = path.join(tmp, 'home');
const cwd = path.join(tmp, 'project');
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(cwd, { recursive: true });

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: 'utf8',
  });
}

const target = () => path.join(home, '.claude', 'skills', 'ambitious');
const manifestPath = () => path.join(target(), '.ambitious-skill.json');
const readManifest = () => JSON.parse(fs.readFileSync(manifestPath(), 'utf8'));
const pkgVersion = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')).version;

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

test('default install writes payload and a manifest with a hash per file', () => {
  const r = run([]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(target(), 'SKILL.md')));
  for (const f of ['altitude.md', 'depth.md', 'range.md', 'background.md', 'speed.md', 'workflow.md']) {
    assert.ok(fs.existsSync(path.join(target(), 'references', f)), f);
  }
  const m = readManifest();
  assert.strictEqual(m.name, 'ambitious-skill');
  assert.strictEqual(m.version, pkgVersion);
  assert.ok(m.files.some((f) => f.path === 'SKILL.md' && /^[0-9a-f]{64}$/.test(f.sha256)));
});

test('SKILL.md frontmatter has name ambitious and a description', () => {
  const head = fs.readFileSync(path.join(target(), 'SKILL.md'), 'utf8').split('\n');
  assert.strictEqual(head[0], '---');
  assert.strictEqual(head[1], 'name: ambitious');
  assert.ok(head.some((l) => l.startsWith('description: ')));
});

test('install over an existing install without --force is refused', () => {
  const r = run([]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /already exists/);
});

test('--force updates an install it owns and keeps files the user added', () => {
  fs.writeFileSync(path.join(target(), 'my-notes.md'), 'mine');
  const r = run(['--force']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(target(), 'my-notes.md'), 'utf8'), 'mine');
});

test('--force refuses a directory with no manifest and changes nothing', () => {
  const dir = path.join(tmp, 'foreign', 'ambitious');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'theirs');
  const r = run(['--force', '--dir', path.join(tmp, 'foreign')]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not installed by/);
  assert.deepStrictEqual(fs.readdirSync(dir), ['keep.txt']);
});

test('--force refuses a malformed manifest and changes nothing', () => {
  const original = fs.readFileSync(manifestPath(), 'utf8');
  fs.writeFileSync(manifestPath(), '{ not json');
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not valid JSON/);
  assert.strictEqual(fs.readFileSync(manifestPath(), 'utf8'), '{ not json');
  fs.writeFileSync(manifestPath(), original);
});

test('--force refuses a forged manifest that points outside the skill directory', () => {
  const original = fs.readFileSync(manifestPath(), 'utf8');
  const forged = { name: 'ambitious-skill', version: '0.0.0', files: [{ path: '../escape.txt', sha256: 'a'.repeat(64) }] };
  fs.writeFileSync(manifestPath(), JSON.stringify(forged));
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /does not match/);
  fs.writeFileSync(manifestPath(), original);
});

test('--force refuses to overwrite a managed file the user edited', () => {
  const file = path.join(target(), 'SKILL.md');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original + '\nmy edit\n');
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /modified after install/);
  assert.ok(fs.readFileSync(file, 'utf8').endsWith('my edit\n'));
  fs.writeFileSync(file, original);
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

test('uninstall removes managed files and keeps user files', () => {
  const r = run(['uninstall']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(target(), 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(target(), 'references')));
  assert.ok(fs.existsSync(path.join(target(), 'my-notes.md')));
  assert.ok(!fs.existsSync(manifestPath()));
  fs.rmSync(path.join(target(), 'my-notes.md'));
});

test('uninstall refuses a modified managed file and removes nothing', () => {
  const r0 = run([]);
  assert.strictEqual(r0.status, 0, r0.stderr);
  const file = path.join(target(), 'references', 'depth.md');
  fs.appendFileSync(file, '\nedit\n');
  const r = run(['uninstall']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /nothing was removed/);
  assert.ok(fs.existsSync(path.join(target(), 'SKILL.md')));
  assert.ok(fs.existsSync(file));
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('\nedit\n', ''));
  assert.strictEqual(run(['uninstall']).status, 0);
});

test('uninstall refuses a directory with no manifest', () => {
  const dir = path.join(tmp, 'unowned', 'ambitious');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'mine');
  const r = run(['uninstall', '--dir', path.join(tmp, 'unowned')]);
  assert.notStrictEqual(r.status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'keep.txt')));
});

test('uninstall refuses a malformed manifest', () => {
  const dir = path.join(tmp, 'bad', 'ambitious');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.ambitious-skill.json'), 'nope');
  const r = run(['uninstall', '--dir', path.join(tmp, 'bad')]);
  assert.notStrictEqual(r.status, 0);
  assert.ok(fs.existsSync(path.join(dir, '.ambitious-skill.json')));
});

test('unknown argument fails with a message', () => {
  const r = run(['--bogus']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /unknown argument/);
});

test('--version prints the package version', () => {
  const r = run(['--version']);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), pkgVersion);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} tests passed`);
