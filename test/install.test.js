'use strict';
// Installer tests. Every case runs in a temp directory; the real home is never touched.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'cli.js');
const PKG = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-test-'));
const home = path.join(tmp, 'home');
const cwd = path.join(tmp, 'project');
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(cwd, { recursive: true });

function run(args, env = {}, dir = cwd) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: dir,
    env: { ...process.env, HOME: home, USERPROFILE: home, ...env },
    encoding: 'utf8',
  });
}
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const skillsDir = () => path.join(home, '.claude', 'skills');
const target = () => path.join(skillsDir(), 'ambitious');
const manifestPath = () => path.join(target(), '.ambitious-skill.json');
const readManifest = () => JSON.parse(fs.readFileSync(manifestPath(), 'utf8'));
const writeManifest = (m) => fs.writeFileSync(manifestPath(), JSON.stringify(m));
const wipe = () => fs.rmSync(skillsDir(), { recursive: true, force: true });

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

// ---- basic install and update ----

test('default install writes payload and a manifest with a hash per file', () => {
  wipe();
  const r = run([]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(target(), 'SKILL.md')));
  for (const f of ['altitude.md', 'depth.md', 'range.md', 'background.md', 'speed.md', 'workflow.md']) {
    assert.ok(fs.existsSync(path.join(target(), 'references', f)), f);
  }
  const m = readManifest();
  assert.strictEqual(m.name, 'ambitious-skill');
  assert.strictEqual(m.version, PKG.version);
  assert.ok(m.files.some((f) => f.path === 'SKILL.md' && f.sha256 === sha(path.join(target(), 'SKILL.md'))));
  assert.deepStrictEqual(fs.readdirSync(skillsDir()).sort(), ['ambitious']);
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
  assert.deepStrictEqual(fs.readdirSync(skillsDir()).sort(), ['ambitious']);
});

// ---- ownership and manifest validation ----

test('--force refuses a directory with no manifest and changes nothing', () => {
  wipe();
  fs.mkdirSync(target(), { recursive: true });
  fs.writeFileSync(path.join(target(), 'keep.txt'), 'theirs');
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not installed by/);
  assert.deepStrictEqual(fs.readdirSync(target()), ['keep.txt']);
});

test('--force refuses a malformed manifest and changes nothing', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  const original = fs.readFileSync(manifestPath(), 'utf8');
  fs.writeFileSync(manifestPath(), '{ not json');
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not valid JSON/);
  assert.strictEqual(fs.readFileSync(manifestPath(), 'utf8'), '{ not json');
  fs.writeFileSync(manifestPath(), original);
});

test('a manifest entry pointing outside the skill directory is refused', () => {
  const m = readManifest();
  writeManifest({ ...m, files: [...m.files, { path: '../escape.txt', sha256: 'a'.repeat(64) }] });
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not part of/);
  writeManifest(m);
});

test('a forged in-target entry for a user file is refused and the user file survives uninstall', () => {
  const userFile = path.join(target(), 'my-notes.md');
  fs.writeFileSync(userFile, 'mine');
  const m = readManifest();
  writeManifest({ ...m, files: [...m.files, { path: 'my-notes.md', sha256: sha(userFile) }] });
  const f = run(['--force']);
  assert.notStrictEqual(f.status, 0);
  assert.match(f.stderr, /not part of/);
  const u = run(['uninstall']);
  assert.notStrictEqual(u.status, 0);
  assert.strictEqual(fs.readFileSync(userFile, 'utf8'), 'mine');
  writeManifest(m);
  fs.rmSync(userFile);
});

test('a manifest that lists the same file twice is refused', () => {
  const m = readManifest();
  writeManifest({ ...m, files: [...m.files, m.files[0]] });
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /twice/);
  writeManifest(m);
});

test('a payload file the user created in place of a managed one is refused, not overwritten', () => {
  const m = readManifest();
  const dropped = m.files.find((f) => f.path === 'SKILL.md');
  writeManifest({ ...m, files: m.files.filter((f) => f !== dropped) });
  const file = path.join(target(), 'SKILL.md');
  const original = fs.readFileSync(file);
  fs.writeFileSync(file, 'user content');
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not managed/);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), 'user content');
  fs.writeFileSync(file, original);
  writeManifest(m);
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

// ---- symlinks ----

test('a symlinked references directory is refused by --force and uninstall, and external files are untouched', () => {
  const external = path.join(tmp, 'external-refs');
  fs.mkdirSync(external, { recursive: true });
  const victim = path.join(external, 'depth.md');
  fs.writeFileSync(victim, 'external content');
  const refs = path.join(target(), 'references');
  fs.renameSync(refs, path.join(tmp, 'refs-backup'));
  fs.symlinkSync(external, refs, 'dir');

  const f = run(['--force']);
  assert.notStrictEqual(f.status, 0);
  assert.match(f.stderr, /symlink/);
  const u = run(['uninstall']);
  assert.notStrictEqual(u.status, 0);
  assert.match(u.stderr, /symlink|modified|refusing/);
  assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'external content');

  fs.unlinkSync(refs);
  fs.renameSync(path.join(tmp, 'refs-backup'), refs);
  fs.rmSync(external, { recursive: true, force: true });
});

test('a symlinked skill directory is refused', () => {
  wipe();
  const elsewhere = path.join(tmp, 'elsewhere');
  fs.mkdirSync(elsewhere, { recursive: true });
  fs.mkdirSync(skillsDir(), { recursive: true });
  fs.symlinkSync(elsewhere, target(), 'dir');
  const r = run([]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /symlink/);
  assert.deepStrictEqual(fs.readdirSync(elsewhere), []);
});

// ---- atomic update: rollback and crash recovery ----

test('an update that fails midway rolls back to the previous install', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  const before = fs.readFileSync(path.join(target(), 'SKILL.md'), 'utf8');
  const beforeManifest = fs.readFileSync(manifestPath(), 'utf8');
  const r = run(['--force'], { AMBITIOUS_SKILL_TEST_FAIL_AFTER: '2' });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /rolled back/);
  assert.strictEqual(fs.readFileSync(path.join(target(), 'SKILL.md'), 'utf8'), before);
  assert.strictEqual(fs.readFileSync(manifestPath(), 'utf8'), beforeManifest);
  assert.ok(!fs.existsSync(path.join(target(), '.ambitious-skill.journal.json')));
  assert.deepStrictEqual(fs.readdirSync(skillsDir()).sort(), ['ambitious']);
  assert.strictEqual(run(['--force']).status, 0);
});

test('a hard crash mid-update leaves a journal; uninstall refuses; --force rolls back and completes', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  const before = fs.readFileSync(path.join(target(), 'SKILL.md'), 'utf8');
  const crashed = run(['--force'], { AMBITIOUS_SKILL_TEST_CRASH_AFTER: '3' });
  assert.strictEqual(crashed.status, 3);
  assert.ok(fs.existsSync(path.join(target(), '.ambitious-skill.journal.json')));

  const u = run(['uninstall']);
  assert.notStrictEqual(u.status, 0);
  assert.match(u.stderr, /interrupted update/);

  const plain = run([]);
  assert.notStrictEqual(plain.status, 0);
  assert.match(plain.stderr, /interrupted update/);

  const recovered = run(['--force']);
  assert.strictEqual(recovered.status, 0, recovered.stderr);
  assert.match(recovered.stdout, /Recovered an interrupted update/);
  assert.ok(!fs.existsSync(path.join(target(), '.ambitious-skill.journal.json')));
  assert.strictEqual(fs.readFileSync(path.join(target(), 'SKILL.md'), 'utf8'), before);
  assert.deepStrictEqual(fs.readdirSync(skillsDir()).sort(), ['ambitious']);
});

// ---- scopes and uninstall ----

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
  assert.notStrictEqual(run(['--project', '--dir', tmp]).status, 0);
});

test('uninstall removes managed files and keeps user files', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  fs.writeFileSync(path.join(target(), 'my-notes.md'), 'mine');
  const r = run(['uninstall']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(target(), 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(target(), 'references')));
  assert.ok(!fs.existsSync(manifestPath()));
  assert.strictEqual(fs.readFileSync(path.join(target(), 'my-notes.md'), 'utf8'), 'mine');
  fs.rmSync(path.join(target(), 'my-notes.md'));
});

test('uninstall refuses a modified managed file and removes nothing', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
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

test('unknown argument fails with a message', () => {
  const r = run(['--bogus']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /unknown argument/);
});

test('--version prints the package version', () => {
  const r = run(['--version']);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), PKG.version);
});

// ---- directory ownership, symlink policy, project root ----

test('an existing empty target directory is kept on uninstall (not created by the installer)', () => {
  wipe();
  fs.mkdirSync(target(), { recursive: true });
  const r = run([]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(readManifest().ownsDirectory, false);
  const u = run(['uninstall']);
  assert.strictEqual(u.status, 0, u.stderr);
  assert.ok(fs.existsSync(target()), 'pre-existing directory must survive uninstall');
  assert.deepStrictEqual(fs.readdirSync(target()), []);
  assert.match(u.stdout, /was not created by/);
});

test('a directory the installer created is removed on uninstall', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  assert.strictEqual(readManifest().ownsDirectory, true);
  assert.strictEqual(run(['uninstall']).status, 0);
  assert.ok(!fs.existsSync(target()));
});

test('an update keeps the ownership recorded at install', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  assert.strictEqual(run(['--force']).status, 0);
  assert.strictEqual(readManifest().ownsDirectory, true);
});

test('an older manifest without ownsDirectory is treated as not owned', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  const m = readManifest();
  delete m.ownsDirectory;
  writeManifest(m);
  assert.strictEqual(run(['uninstall']).status, 0);
  assert.ok(fs.existsSync(target()));
});

test('a non-boolean ownsDirectory is refused', () => {
  wipe();
  assert.strictEqual(run([]).status, 0);
  const m = readManifest();
  writeManifest({ ...m, ownsDirectory: 'yes' });
  const r = run(['--force']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /invalid ownsDirectory/);
  writeManifest(m);
  fs.rmSync(target(), { recursive: true, force: true });
});

test('a symlinked parent above the skill directory is allowed (user layout choice)', () => {
  wipe();
  const real = path.join(tmp, 'real-skills');
  fs.mkdirSync(real, { recursive: true });
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.symlinkSync(real, path.join(home, '.claude', 'skills'), 'dir');
  const r = run([]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(real, 'ambitious', 'SKILL.md')));
  assert.strictEqual(run(['uninstall']).status, 0);
  assert.ok(!fs.existsSync(path.join(real, 'ambitious')));
  fs.rmSync(real, { recursive: true, force: true });
  fs.unlinkSync(path.join(home, '.claude', 'skills'));
});

test('--project from a nested directory installs at the git project root', () => {
  wipe();
  const repo = path.join(tmp, 'repo');
  const nested = path.join(repo, 'packages', 'app');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(nested, { recursive: true });
  const r = run(['--project'], {}, nested);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Project root: /);
  assert.ok(fs.existsSync(path.join(repo, '.claude', 'skills', 'ambitious', 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(nested, '.claude')));
  fs.rmSync(repo, { recursive: true, force: true });
});

test('--project outside any git repository uses the current directory', () => {
  const plain = path.join(tmp, 'plain', 'sub');
  fs.mkdirSync(plain, { recursive: true });
  const r = run(['--project'], {}, plain);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(plain, '.claude', 'skills', 'ambitious', 'SKILL.md')));
  fs.rmSync(path.join(tmp, 'plain'), { recursive: true, force: true });
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} tests passed`);
