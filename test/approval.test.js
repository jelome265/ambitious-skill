'use strict';
// The skill must stop for user approval before implementation, and no instruction may contradict that.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const skill = read('SKILL.md');
const workflow = read('references/workflow.md');
const claudeMd = read('CLAUDE.md');

const start = skill.indexOf('## Approval before implementation');
assert.ok(start >= 0, 'SKILL.md needs an "Approval before implementation" section');
const end = skill.indexOf('\n## ', start + 1);
const section = skill.slice(start, end === -1 ? undefined : end).toLowerCase();

for (const phrase of [
  'approve',
  'do not implement',
  'silence',
  'before approval',
  'show it to the user',
  'baseline',
  'veto',
  'cheapest experiment',
  'review and time cost',
  'record',
]) {
  assert.ok(section.includes(phrase), `approval section must mention "${phrase}"`);
}

assert.ok(workflow.includes('approve a rewritten request before you implement it'), 'workflow must state the approval boundary');
assert.ok(claudeMd.includes('do not implement a rewritten request until the user approves it'), 'CLAUDE.md must state the approval boundary');

// Contradictory wording that would tell the model the approval stop is optional.
const CONTRADICTIONS = [/not a checkpoint/i, /guidance, not checkpoints/i, /nothing here is a checkpoint/i, /do not stop work/i];
for (const [name, text] of [['SKILL.md', skill], ['references/workflow.md', workflow], ['CLAUDE.md', claudeMd]]) {
  for (const re of CONTRADICTIONS) {
    assert.ok(!re.test(text), `${name} contains contradictory wording: ${re}`);
  }
}

console.log('ok - approval boundary is stated consistently in SKILL.md, the workflow, and CLAUDE.md');
