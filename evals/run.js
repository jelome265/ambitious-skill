#!/usr/bin/env node
'use strict';
// Runs evals/cases.json with and without the skill, then writes a blinded grading sheet.
//
// Usage:
//   node evals/run.js --dry-run                 print the planned commands; run nothing
//   node evals/run.js --trials 3                run each case and condition three times
//   node evals/run.js --claude <binary>         claude binary to use (default: claude)
//   node evals/run.js --max-runs 60             refuse larger plans (default: 60)
//   node evals/run.js --timeout-seconds 300     per-run time limit (default: 300)
//   node evals/run.js --results-dir <dir>       where to write results (default: evals/results/<time>)
//
// Authentication: the runner uses the existing Claude Code authentication. It does not set or
// require ANTHROPIC_API_KEY. Note that an ANTHROPIC_API_KEY already in your environment takes
// precedence over a subscription login in Claude Code, and then runs are billed to that key.
//
// Working directories: each run starts from a fresh copy of its case's fixture, in a temporary
// directory. The original project is never used as a working directory. Files the run changes are
// recorded against the fixture.
//
// Baseline: personal settings and installed skills are not removed. Before a real run, the runner
// refuses to start if the ambitious skill is installed in ~/.claude/skills or enabled as a plugin,
// because the without-skill runs would load it.
//
// Limits: --max-runs caps the plan, and --timeout-seconds caps each run. The runner stops at once
// if the first run fails, and after three consecutive failures later on. A limit on tool turns is
// not enforced, because its CLI flag has not been verified.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CASES_FILE = path.join(__dirname, 'cases.json');
const FIXTURES = path.join(__dirname, 'fixtures');
const MAX_CONSECUTIVE_FAILURES = 3;
const CONDITIONS = {
  'with-skill': ['--plugin-dir', path.join(ROOT, 'plugins', 'ambitious')],
  'without-skill': [],
};

class RunnerError extends Error {}

function parseArgs(argv) {
  const get = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  const num = (flag, fallback) => {
    const n = Number(get(flag, String(fallback)));
    if (!Number.isInteger(n) || n < 1) throw new RunnerError(`${flag} must be a positive integer`);
    return n;
  };
  return {
    dryRun: argv.includes('--dry-run'),
    trials: num('--trials', 1),
    maxRuns: num('--max-runs', 60),
    timeoutSeconds: num('--timeout-seconds', 300),
    claudeBin: get('--claude', 'claude'),
    resultsDir: get('--results-dir', null),
  };
}

function loadCases() {
  const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8')).cases;
  const ids = new Set();
  for (const c of cases) {
    if (!c.id || !c.prompt) throw new RunnerError(`case is missing id or prompt: ${JSON.stringify(c).slice(0, 80)}`);
    if (ids.has(c.id)) throw new RunnerError(`duplicate case id: ${c.id}`);
    ids.add(c.id);
    if (c.fixture !== null && !fs.existsSync(path.join(FIXTURES, c.fixture))) {
      throw new RunnerError(`fixture missing for ${c.id}: ${c.fixture}`);
    }
  }
  return cases;
}

// Every planned run. Labels A and B are randomized per case and trial, so grading is blind.
function planRuns(cases, trials) {
  const runs = [];
  for (const c of cases) {
    for (let trial = 1; trial <= trials; trial++) {
      const order = crypto.randomInt(2) === 0 ? ['with-skill', 'without-skill'] : ['without-skill', 'with-skill'];
      order.forEach((condition, i) => runs.push({ case: c, trial, label: i === 0 ? 'A' : 'B', condition }));
    }
  }
  return runs;
}

function walk(root, rel = '', out = new Map()) {
  if (!fs.existsSync(path.join(root, rel))) return out;
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(root, childRel, out);
    else if (entry.isFile()) {
      out.set(childRel, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, childRel))).digest('hex'));
    }
  }
  return out;
}

// Files added, changed, or removed between the fixture and the run's working directory.
function diffTrees(before, after) {
  const changes = [];
  for (const [p, hash] of after) {
    if (!before.has(p)) changes.push({ path: p, status: 'added' });
    else if (before.get(p) !== hash) changes.push({ path: p, status: 'changed' });
  }
  for (const p of before.keys()) if (!after.has(p)) changes.push({ path: p, status: 'removed' });
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

// A short hash of the fixture's file list and contents, so results name the exact inputs.
function fixtureRevision(fixture) {
  if (fixture === null) return 'none';
  const files = walk(path.join(FIXTURES, fixture));
  const h = crypto.createHash('sha256');
  for (const [p, hash] of [...files.entries()].sort()) h.update(`${p}\0${hash}\n`);
  return h.digest('hex').slice(0, 16);
}

function commandFor(claudeBin, prompt, condition) {
  return [claudeBin, '-p', prompt, '--output-format', 'json', ...CONDITIONS[condition]];
}

// Stops before any run if the skill is installed where the baseline would pick it up.
function checkBaseline(claudeBin) {
  const installed = path.join(os.homedir(), '.claude', 'skills', 'ambitious');
  if (fs.existsSync(installed)) {
    throw new RunnerError(
      `the ambitious skill is installed at ${installed}, so the without-skill runs would load it. ` +
        'Uninstall it (npx ambitious-skill uninstall) and run again.'
    );
  }
  const list = spawnSync(claudeBin, ['plugin', 'list'], { encoding: 'utf8' });
  if (list.status === 0 && /ambitious@/.test(list.stdout)) {
    throw new RunnerError('the ambitious plugin is enabled, so the without-skill runs would load it. Disable it and run again.');
  }
  if (list.status !== 0) console.warn('warning: could not list plugins; check manually that the ambitious plugin is disabled.');
}

function preflight(claudeBin) {
  const v = spawnSync(claudeBin, ['--version'], { encoding: 'utf8' });
  if (v.error || v.status !== 0) throw new RunnerError(`claude CLI not found or not working: ${claudeBin}`);
  checkBaseline(claudeBin);
  return v.stdout.trim();
}

function executeRun(run, claudeBin, timeoutMs, claudeVersion, outDir) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-work-'));
  try {
    const fixtureDir = run.case.fixture === null ? null : path.join(FIXTURES, run.case.fixture);
    if (fixtureDir) copyTree(fixtureDir, workdir);
    const before = fixtureDir ? walk(fixtureDir) : new Map();
    const argv = commandFor(claudeBin, run.case.prompt, run.condition);
    const started = Date.now();
    const r = spawnSync(argv[0], argv.slice(1), { cwd: workdir, encoding: 'utf8', timeout: timeoutMs });
    const result = {
      case: run.case.id,
      trial: run.trial,
      label: run.label,
      seconds: (Date.now() - started) / 1000,
      exitStatus: r.status,
      signal: r.signal,
      infrastructureFailure: Boolean(r.error) || r.status !== 0,
      filesChanged: diffTrees(before, walk(workdir)),
      stdout: r.stdout,
      stderr: r.stderr,
      meta: {
        runnerPackageVersion: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version,
        claudeVersion,
        condition: run.condition,
        fixture: run.case.fixture,
        fixtureRevision: fixtureRevision(run.case.fixture),
        node: process.version,
        startedAt: new Date(started).toISOString(),
      },
    };
    fs.writeFileSync(path.join(outDir, `${run.case.id}-${run.trial}-${run.label}.json`), JSON.stringify(result, null, 2));
    return result;
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = loadCases();
  const runs = planRuns(cases, args.trials);
  if (runs.length > args.maxRuns) {
    throw new RunnerError(`plan has ${runs.length} runs, above --max-runs ${args.maxRuns}. Lower --trials or raise --max-runs.`);
  }

  if (args.dryRun) {
    for (const run of runs) {
      const argv = commandFor(args.claudeBin, run.case.prompt, run.condition);
      console.log(`${run.case.id} #${run.trial} ${run.label}: ${argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
    }
    console.log(`\n${runs.length} runs planned. Nothing was executed.`);
    return;
  }

  const claudeVersion = preflight(args.claudeBin);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = args.resultsDir ? path.resolve(args.resultsDir) : path.join(__dirname, 'results', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const sheet = [['case', 'trial', 'label', 'trigger', 'quality', 'constraints', 'proportion', 'files_changed', 'notes'].join(',')];
  const key = {};
  let consecutive = 0;
  for (const [i, run] of runs.entries()) {
    key[`${run.case.id}#${run.trial}#${run.label}`] = run.condition;
    const result = executeRun(run, args.claudeBin, args.timeoutSeconds * 1000, claudeVersion, outDir);
    sheet.push([run.case.id, run.trial, run.label, '', '', '', '', result.filesChanged.length, ''].join(','));
    console.log(`${run.case.id} #${run.trial} ${run.label}: exit ${result.exitStatus}, ${result.filesChanged.length} file change(s)`);
    if (result.infrastructureFailure) {
      consecutive += 1;
      if (i === 0) {
        throw new RunnerError(`the first run failed (exit ${result.exitStatus}). Check that \`claude -p\` works and that you are logged in. See ${path.relative(ROOT, outDir)}.`);
      }
      if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
        throw new RunnerError(`stopped after ${consecutive} consecutive failures. See ${path.relative(ROOT, outDir)}.`);
      }
    } else {
      consecutive = 0;
    }
  }
  fs.writeFileSync(path.join(outDir, 'grading-sheet.csv'), sheet.join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'key.json'), JSON.stringify(key, null, 2) + '\n');
  console.log(`Results in ${path.relative(ROOT, outDir)}. Grade grading-sheet.csv before opening key.json.`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    if (err instanceof RunnerError) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
} else {
  module.exports = { parseArgs, loadCases, planRuns, diffTrees, walk, fixtureRevision, commandFor, RunnerError };
}
