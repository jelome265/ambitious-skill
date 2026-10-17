'use strict';
// Enforces that every dimension reference names the four phases as a suggested
// order (guidance, not gates), and that SKILL.md links to each reference and to the workflow.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIMENSIONS = ['altitude.md', 'depth.md', 'range.md', 'speed.md'];
const PHASES = ['Research', 'Investigate', 'Plan', 'Implement'];

const skill = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');

for (const file of DIMENSIONS) {
  const text = fs.readFileSync(path.join(ROOT, 'references', file), 'utf8');
  for (const phase of PHASES) {
    assert.ok(
      new RegExp(`\\*\\*${phase}|###? \\d?\\.? ?${phase}|${phase}:`, 'i').test(text),
      `references/${file} is missing the ${phase} phase`
    );
  }
  assert.ok(/suggested order/i.test(text), `references/${file} has no "Suggested order" section`);
  assert.ok(!/\bgates?\b/i.test(text), `references/${file} must not use gate language`);
  assert.ok(!/required phases|stop rules?/i.test(text), `references/${file} must not force phases`);
  assert.ok(skill.includes(`references/${file}`), `SKILL.md does not link references/${file}`);
}

assert.ok(skill.includes('references/workflow.md'), 'SKILL.md does not link workflow.md');
assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'banner.jpg')), 'assets/banner.jpg is missing');

console.log(`ok - ${DIMENSIONS.length} dimension references follow the four phases and are linked`);
