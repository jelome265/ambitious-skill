#!/usr/bin/env node
'use strict';
// Runs evals/cases.json with and without the skill, then writes a blinded grading sheet.
//
// Usage:
//   node evals/run.js --dry-run              print the planned commands; run nothing
//   node evals/run.js --trials 3             run each case and condition three times
//   node evals/run.js --claude <binary>      use a different claude binary (default: claude)
//   node evals/run.js --max-runs 60          refuse plans larger than this (default: 60)
//
// Isolation and authentication:
//   - Authentication uses ANTHROPIC_API_KEY from the environment. The runner never copies
//     credentials from a configuration directory. A runner without a key stops before any run.
//   - Every run gets a fresh HOME and an explicit CLAUDE_CONFIG_DIR, so personal settings,
//     skills, plugins, and any inherited CLAUDE_CONFIG_DIR cannot leak into the run.
//   - Every run starts from a fresh copy of its case's fixture, in a fresh working directory.
//     The source tree is never used as a working directory. Changed files are recorded.
//
// Safety:
//   - The plan is capped by --max-runs. The runner stops after three consecutive infrastructure
//     failures (process errors or timeouts), so a broken setup does not burn the whole plan.
//
// Results go to evals/results/<timestamp>/. Grading labels are randomized per case. The key that
// maps labels to conditions is written separately and should be opened only after grading.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CASES_FILE = path.join(__dirname, 'cases.json');
const FIXTURES = path.join(__dirname, 'fixtures');
const TIMEOUT_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_INFRA_FAILURES = 3;
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
  const trials = Number(get('--trials', '1'));
  const maxRuns = Number(get('--max-runs', '60'));
  if (!Number.isInteger(trials) || trials < 1) throw new RunnerError('--trials must be a positive integer');
  if (!Number.isInteger(maxRuns) || maxRuns < 1) throw new RunnerError('--max-runs must be a positive integer');
  return {
    dryRun: argv.includes('--dry-run'),
    trials,
    maxRuns,
    claudeBin: get('--claude', 'claude'),
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

// Every planned run, with randomized A/B labels per case and trial, so grading is blind.
function planRuns(cases, trials) {
  const runs = [];
  for (const c of cases) {
    for (let trial = 1; trial <= trials; trial++) {
      const order = crypto.randomInt(2) === 0 ? ['with-skill', 'without-skill'] : ['without-skill', 'with-skill'];
      order.forEach((condition, i) => {
        runs.push({ case: c, trial, label: i === 0 ? 'A' : 'B', condition });
      });
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

// Changes between the fixture and the run's working directory: added, removed, or changed files.
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

// The fixture revision is a hash of its file list and contents, so results name exactly what ran.
function fixtureRevision(fixture) {
  if (fixture === null) return 'none';
  const files = walk(path.join(FIXTURES, fixture));
  const h = crypto.createHash('sha256');
  for (const [p, hash] of [...files.entries()].sort()) h.update(`${p}\0${hash}\n`);
  return h.digest('hex').slice(0, 16);
}

function isolatedEnv(home) {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  env.CLAUDE_CONFIG_DIR = path.join(home, 'claude-config');
  fs.mkdirSync(env.CLAUDE_CONFIG_DIR, { recursive: true });
  return env;
}

function commandFor(claudeBin, prompt, condition) {
  return [claudeBin, '-p', prompt, '--output-format', 'json', ...CONDITIONS[condition]];
}

function preflight(claudeBin) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new RunnerError(
      'ANTHROPIC_API_KEY is not set. The runner isolates configuration, so a login stored in your ' +
        'default Claude Code configuration is not used. Set the key, or use --dry-run.'
    );
  }
  const v = spawnSync(claudeBin, ['--version'], { encoding: 'utf8' });
  if (v.error || v.status !== 0) throw new RunnerError(`claude CLI not found or not working: ${claudeBin}`);
  return v.stdout.trim();
}

function executeRun(run, claudeBin, claudeVersion, outDir) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-work-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-home-'));
  const fixtureDir = run.case.fixture === null ? null : path.join(FIXTURES, run.case.fixture);
  try {
    if (fixtureDir) copyTree(fixtureDir, workdir);
    const before = fixtureDir ? walk(fixtureDir) : new Map();
    const argv = commandFor(claudeBin, run.case.prompt, run.condition);
    const started = Date.now();
    const r = spawnSync(argv[0], argv.slice(1), {
      cwd: workdir,
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
      env: isolatedEnv(home),
    });
    const infraFailure = Boolean(r.error) || r.status !== 0;
    const changes = diffTrees(before, walk(workdir));
    const result = {
      case: run.case.id,
      trial: run.trial,
      label: run.label,
      seconds: (Date.now() - started) / 1000,
      exitStatus: r.status,
      signal: r.signal,
      infrastructureFailure: infraFailure,
      filesChanged: changes,
      stdout: r.stdout,
      stderr: r.stderr,
      meta: {
        runnerPackageVersion: require(path.join(ROOT, 'package.json')).version,
        claudeVersion,
        condition: run.condition,
        fixture: run.case.fixture,
        fixtureRevision: fixtureRevision(run.case.fixture),
        node: process.version,
        startedAt: new Date(started).toISOString(),
      },
    };
    const file = path.join(outDir, `${run.case.id}-${run.trial}-${run.label}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
    return result;
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
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
  const outDir = path.join(__dirname, 'results', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const sheet = [['case', 'trial', 'label', 'trigger', 'quality', 'constraints', 'proportion', 'files_changed', 'notes'].join(',')];
  const key = {};
  let consecutive = 0;
  for (const run of runs) {
    key[`${run.case.id}#${run.trial}#${run.label}`] = run.condition;
    const result = executeRun(run, args.claudeBin, claudeVersion, outDir);
    sheet.push([run.case.id, run.trial, run.label, '', '', '', '', result.filesChanged.length, ''].join(','));
    console.log(`${run.case.id} #${run.trial} ${run.label}: exit ${result.exitStatus}, ${result.filesChanged.length} file change(s)`);
    consecutive = result.infrastructureFailure ? consecutive + 1 : 0;
    if (consecutive >= MAX_CONSECUTIVE_INFRA_FAILURES) {
      throw new RunnerError(`stopped after ${consecutive} consecutive infrastructure failures; check the setup in ${path.relative(ROOT, outDir)}`);
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
