'use strict';
// The skill must instruct a stop for user approval before implementation.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const skill = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
const workflow = fs.readFileSync(path.join(ROOT, 'references', 'workflow.md'), 'utf8');

const start = skill.indexOf('## Approval before implementation');
assert.ok(start >= 0, 'SKILL.md needs an "Approval before implementation" section');
const end = skill.indexOf('\n## ', start + 1);
const section = skill.slice(start, end === -1 ? undefined : end);

for (const phrase of [
  'approve',
  'Do not implement',
  'Silence',
  'before approval',
  'show it to the user',
]) {
  assert.ok(section.toLowerCase().includes(phrase.toLowerCase()), `approval section must mention "${phrase}"`);
}
assert.ok(workflow.includes('for approval'), 'workflow Plan step must require approval before Implement');

console.log('ok - approval boundary is stated in SKILL.md and the workflow');
