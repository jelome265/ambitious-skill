'use strict';
// Eval runner tests. The end-to-end tests use a fake claude binary, so no model calls are made
// and nothing is charged.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNNER = path.join(ROOT, 'evals', 'run.js');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals', 'cases.json'), 'utf8')).cases;
const runner = require(RUNNER);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-test-'));
const fakeHome = path.join(tmp, 'home');
fs.mkdirSync(fakeHome, { recursive: true });

// A stand-in for the claude CLI. It records the working directory and writes a file when the
// skill is loaded, so change detection can be checked. FAKE_CLAUDE_MODE=fail simulates a login failure.
const fake = path.join(tmp, 'fake-claude.js');
fs.writeFileSync(
  fake,
  `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('fake-claude 0.0.0'); process.exit(0); }
if (args[0] === 'plugin') { process.exit(0); }
if (process.env.FAKE_CLAUDE_MODE === 'fail') { console.error('not logged in'); process.exit(1); }
if (args.includes('--plugin-dir')) fs.writeFileSync('CHANGED.txt', 'written with the skill');
console.log(JSON.stringify({ result: 'ok' }));
`
);
fs.chmodSync(fake, 0o755);

function runCli(args, { home = fakeHome, env = {} } = {}) {
  const base = { ...process.env, HOME: home, USERPROFILE: home, ...env };
  return spawnSync(process.execPath, [RUNNER, ...args], { encoding: 'utf8', env: base });
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

test('dry run plans one command per case and condition and runs nothing', () => {
  const r = runCli(['--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n').filter((l) => / (A|B): /.test(l));
  assert.strictEqual(lines.length, cases.length * 2);
  assert.ok(lines.some((l) => l.includes('--plugin-dir')), 'with-skill runs load the plugin');
  assert.ok(lines.some((l) => !l.includes('--plugin-dir')), 'without-skill runs do not load the plugin');
});

test('dry run does not require ANTHROPIC_API_KEY and does not set it', () => {
  const r = runCli(['--dry-run'], { env: { ANTHROPIC_API_KEY: '' } });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!/ANTHROPIC_API_KEY/.test(r.stdout + r.stderr));
});

test('plans above --max-runs are refused', () => {
  const r = runCli(['--dry-run', '--trials', '100']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /above --max-runs/);
});

test('a skill installed in the home directory blocks a real run before anything executes', () => {
  const home = path.join(tmp, 'home-with-skill');
  fs.mkdirSync(path.join(home, '.claude', 'skills', 'ambitious'), { recursive: true });
  const results = path.join(tmp, 'blocked-results');
  const r = runCli(['--claude', fake, '--results-dir', results], { home });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /is installed at/);
  assert.ok(!fs.existsSync(results), 'no results may be written when the baseline is contaminated');
});

test('every case with a fixture points at an existing fixture directory; approval-boundary exists', () => {
  for (const c of cases) {
    if (c.fixture === null) continue;
    assert.ok(fs.existsSync(path.join(ROOT, 'evals', 'fixtures', c.fixture)), `fixture missing for ${c.id}`);
  }
  assert.ok(cases.some((c) => c.id === 'approval-boundary' && c.fixture), 'approval-boundary case needs a fixture');
});

test('case ids are unique and loadCases accepts the shipped file', () => {
  const loaded = runner.loadCases();
  assert.strictEqual(loaded.length, cases.length);
  assert.strictEqual(new Set(loaded.map((c) => c.id)).size, loaded.length);
});

test('planRuns gives each case and trial one A and one B with different conditions', () => {
  const plan = runner.planRuns(cases, 2);
  assert.strictEqual(plan.length, cases.length * 2 * 2);
  for (let i = 0; i < plan.length; i += 2) {
    assert.strictEqual(plan[i].case.id, plan[i + 1].case.id);
    assert.notStrictEqual(plan[i].condition, plan[i + 1].condition);
    assert.deepStrictEqual([plan[i].label, plan[i + 1].label].sort(), ['A', 'B']);
  }
});

test('diffTrees reports added, changed, and removed files, and ignores unchanged ones', () => {
  const before = new Map([['keep.txt', 'h1'], ['edit.txt', 'h2'], ['gone.txt', 'h3']]);
  const after = new Map([['keep.txt', 'h1'], ['edit.txt', 'hX'], ['new.txt', 'h4']]);
  assert.deepStrictEqual(runner.diffTrees(before, after), [
    { path: 'edit.txt', status: 'changed' },
    { path: 'gone.txt', status: 'removed' },
    { path: 'new.txt', status: 'added' },
  ].sort((a, b) => a.path.localeCompare(b.path)));
});

test('fixture revisions are stable and differ between fixtures', () => {
  const a = runner.fixtureRevision('small-edit');
  assert.strictEqual(a, runner.fixtureRevision('small-edit'));
  assert.notStrictEqual(a, runner.fixtureRevision('technical-audit'));
  assert.strictEqual(runner.fixtureRevision(null), 'none');
});

test('end to end with a fake claude: results record file changes; the fixture is never modified', () => {
  const home = path.join(tmp, 'home-e2e');
  fs.mkdirSync(home, { recursive: true });
  const results = path.join(tmp, 'e2e-results');
  const fixtureBefore = runner.walk(path.join(ROOT, 'evals', 'fixtures', 'approval-boundary'));
  const r = runCli(['--claude', fake, '--results-dir', results], { home });
  assert.strictEqual(r.status, 0, r.stderr);

  const files = fs.readdirSync(results);
  assert.ok(files.includes('grading-sheet.csv') && files.includes('key.json'));
  const withSkill = JSON.parse(fs.readFileSync(path.join(results, 'approval-boundary-1-A.json'), 'utf8'));
  const without = JSON.parse(fs.readFileSync(path.join(results, 'approval-boundary-1-B.json'), 'utf8'));
  const sideA = withSkill.meta.condition;
  const skilled = sideA === 'with-skill' ? withSkill : without;
  const bare = sideA === 'with-skill' ? without : withSkill;
  assert.strictEqual(skilled.filesChanged.length, 1, 'the skill-enabled run wrote one file in its working copy');
  assert.strictEqual(bare.filesChanged.length, 0, 'the baseline wrote nothing');
  assert.deepStrictEqual(runner.walk(path.join(ROOT, 'evals', 'fixtures', 'approval-boundary')), fixtureBefore, 'fixture must be untouched');
  assert.ok(!fs.existsSync(path.join(ROOT, 'evals', 'fixtures', 'approval-boundary', 'CHANGED.txt')));
});

test('the runner stops at once when the first run fails, and writes no grading sheet', () => {
  const home = path.join(tmp, 'home-fail');
  fs.mkdirSync(home, { recursive: true });
  const results = path.join(tmp, 'fail-results');
  const r = runCli(['--claude', fake, '--results-dir', results], { home, env: { FAKE_CLAUDE_MODE: 'fail' } });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /the first run failed/);
  assert.ok(!fs.existsSync(path.join(results, 'grading-sheet.csv')));
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} eval runner tests passed`);
