'use strict';
// Documentation checks: the claims in the docs must match the code they describe.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readme = read('README.md');
const evalsReadme = read('evals/README.md');
const skill = read('SKILL.md');
const pkg = JSON.parse(read('package.json'));
const cli = read('bin/cli.js');
const runner = read('evals/run.js');

// Node version: README, package engines, and CI must agree.
assert.ok(readme.includes('Requires Node.js 22 or later.'), 'README must state the Node.js requirement');
assert.strictEqual(pkg.engines.node, '>=22', 'package engines must match the README');
assert.ok(read('.github/workflows/ci.yml').includes('node: [22, 24]'), 'CI must test Node 22 and 24');

// Every installer flag shown in the README exists in the CLI.
const installLines = readme.split('\n').filter((l) => l.startsWith('npx ambitious-skill'));
assert.ok(installLines.length >= 4, 'README must show the install commands');
for (const line of installLines) {
  for (const flag of line.match(/--[a-z-]+/g) || []) {
    assert.ok(cli.includes(`'${flag}'`), `README shows ${flag}, which the installer does not accept`);
  }
}

// Every runner flag shown in the eval README exists in the runner.
for (const flag of new Set(evalsReadme.match(/--[a-z-]+/g) || [])) {
  if (flag === '--plugin-dir') continue;
  assert.ok(runner.includes(`'${flag}'`), `evals/README.md shows ${flag}, which the runner does not accept`);
}

// Every path in the README's "What is inside" tree exists.
const tree = readme.split('## What is inside')[1].split('```')[1];
// Each entry starts at column 0 and ends at a run of two or more spaces; continuation lines are indented.
const paths = [];
for (const line of tree.split('\n')) {
  if (!line || /^\s/.test(line)) continue;
  const entry = line.split(/\s{2,}/)[0];
  for (const piece of entry.split(',')) {
    const token = piece.trim();
    if (/^[\w./-]+$/.test(token)) paths.push(token);
  }
}
assert.ok(paths.length >= 8, 'the README file tree should list the repository layout');
for (const p of paths) {
  assert.ok(fs.existsSync(path.join(ROOT, p)), `README lists a path that does not exist: ${p}`);
}

// The skill describes the altitude question and the four depth questions, and the body has both.
assert.ok(skill.includes('## Question 0: what happens next?'), 'SKILL.md must contain Question 0');
assert.ok(/altitude question and the four depth questions/.test(skill.split('\n').slice(0, 4).join('\n')), 'SKILL.md description must name both question sets');
assert.ok(skill.includes('## Approval before implementation'), 'SKILL.md must contain the approval section');

// Plugin and marketplace descriptions use the same wording as the skill.
for (const rel of ['plugins/ambitious/.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
  assert.ok(read(rel).includes('altitude question and the four depth questions'), `${rel} must describe the same questions`);
}

console.log('ok - README, evals README, skill, and plugin descriptions agree with the code');
