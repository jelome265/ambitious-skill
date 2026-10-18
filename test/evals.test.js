'use strict';
// Eval runner tests. None of these run Claude; they check planning, safety gates, fixtures,
// and change detection.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNNER = path.join(ROOT, 'evals', 'run.js');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals', 'cases.json'), 'utf8')).cases;
const runner = require(RUNNER);

function run(args, env = {}) {
  const base = { ...process.env, ...env };
  delete base.ANTHROPIC_API_KEY;
  return spawnSync(process.execPath, [RUNNER, ...args], { encoding: 'utf8', env: { ...base, ...env } });
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

test('dry run plans one command per case and condition, and runs nothing', () => {
  const r = run(['--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n').filter((l) => / (A|B): /.test(l));
  assert.strictEqual(lines.length, cases.length * 2);
  assert.ok(lines.some((l) => l.includes('--plugin-dir')), 'with-skill runs must load the plugin');
  assert.ok(lines.some((l) => !l.includes('--plugin-dir')), 'without-skill runs must not load the plugin');
  assert.ok(!fs.existsSync(path.join(ROOT, 'evals', 'results')), 'dry run must not write results');
});

test('a real run stops before executing anything when ANTHROPIC_API_KEY is missing', () => {
  const r = run(['--trials', '1']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /ANTHROPIC_API_KEY is not set/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'evals', 'results')), 'no results may be written before preflight');
});

test('plans above --max-runs are refused', () => {
  const r = run(['--dry-run', '--trials', '100']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /above --max-runs/);
});

test('every case with a fixture points at an existing fixture directory', () => {
  for (const c of cases) {
    if (c.fixture === null) continue;
    assert.ok(fs.existsSync(path.join(ROOT, 'evals', 'fixtures', c.fixture)), `fixture missing for ${c.id}`);
  }
  assert.ok(cases.some((c) => c.id === 'approval-boundary' && c.fixture), 'approval-boundary case must exist with a fixture');
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

test('diffTrees reports added, changed, and removed files and ignores unchanged ones', () => {
  const before = new Map([['keep.txt', 'h1'], ['edit.txt', 'h2'], ['gone.txt', 'h3']]);
  const after = new Map([['keep.txt', 'h1'], ['edit.txt', 'hX'], ['new.txt', 'h4']]);
  const changes = runner.diffTrees(before, after);
  assert.deepStrictEqual(changes, [
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

test('walk and diffTrees detect a real edit to a fixture copy', () => {
  const src = path.join(ROOT, 'evals', 'fixtures', 'small-edit');
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-test-'));
  fs.cpSync(src, dst, { recursive: true });
  const before = runner.walk(src);
  fs.writeFileSync(path.join(dst, 'src', 'format.js'), 'changed');
  const changes = runner.diffTrees(before, runner.walk(dst));
  assert.deepStrictEqual(changes, [{ path: 'src/format.js', status: 'changed' }]);
  fs.rmSync(dst, { recursive: true, force: true });
});

console.log(`\n${passed} eval runner tests passed`);
