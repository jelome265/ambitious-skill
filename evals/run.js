#!/usr/bin/env node
'use strict';
// Runs evals/cases.json with and without the skill, then writes a blinded grading sheet.
//
// Usage:
//   node evals/run.js --dry-run              print the commands; run nothing (default in tests)
//   node evals/run.js --trials 3            run each case and condition three times
//   node evals/run.js --claude <binary>      use a different claude binary (default: claude)
//
// Each run uses a clean HOME so that personal skills and plugins cannot leak into the baseline.
// Results are kept in evals/results/<timestamp>/. Grading labels are randomized per case; the
// key that maps labels to conditions is written to a separate file and should be opened only
// after grading.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const trialsIdx = args.indexOf('--trials');
const trials = trialsIdx >= 0 ? Number(args[trialsIdx + 1]) : 1;
const claudeIdx = args.indexOf('--claude');
const claudeBin = claudeIdx >= 0 ? args[claudeIdx + 1] : 'claude';
const TIMEOUT_MS = 5 * 60 * 1000;

if (!Number.isInteger(trials) || trials < 1) throw new Error('--trials must be a positive integer');

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')).cases;
const CONDITIONS = {
  'with-skill': ['--plugin-dir', path.join(ROOT, 'plugins', 'ambitious')],
  'without-skill': [],
};

function commandFor(testCase, condition) {
  return [claudeBin, '-p', testCase.prompt, '--output-format', 'json', ...CONDITIONS[condition]];
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(__dirname, 'results', stamp);
const sheet = [['case', 'trial', 'label', 'trigger', 'quality', 'constraints', 'proportion', 'notes'].join(',')];
const key = {};

for (const testCase of cases) {
  for (let trial = 1; trial <= trials; trial++) {
    // Randomize which condition is shown as A and which as B, so grading is blind.
    const order = crypto.randomInt(2) === 0 ? ['with-skill', 'without-skill'] : ['without-skill', 'with-skill'];
    order.forEach((condition, i) => {
      const label = i === 0 ? 'A' : 'B';
      key[`${testCase.id}#${trial}#${label}`] = condition;
      sheet.push([testCase.id, trial, label, '', '', '', '', ''].join(','));

      const argv = commandFor(testCase, condition);
      if (dryRun) {
        console.log(argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' '));
        return;
      }
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ambitious-eval-'));
      const started = Date.now();
      const r = spawnSync(argv[0], argv.slice(1), {
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
        env: { ...process.env, HOME: home, USERPROFILE: home },
      });
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${testCase.id}-${trial}-${label}.json`);
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            case: testCase.id,
            trial,
            label,
            seconds: (Date.now() - started) / 1000,
            exitStatus: r.status,
            signal: r.signal,
            stdout: r.stdout,
            stderr: r.stderr,
          },
          null,
          2
        )
      );
      fs.rmSync(home, { recursive: true, force: true });
      console.log(`${testCase.id} trial ${trial} ${label}: exit ${r.status}`);
    });
  }
}

if (!dryRun) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'grading-sheet.csv'), sheet.join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'key.json'), JSON.stringify(key, null, 2) + '\n');
  console.log(`Results in ${path.relative(ROOT, outDir)}. Grade grading-sheet.csv before opening key.json.`);
}
