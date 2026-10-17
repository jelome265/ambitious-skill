'use strict';
// Content rules for the skill. The skill instructs on how to do the work.
// It must not address the AI itself, and must not assign roles.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['SKILL.md', ...fs.readdirSync(path.join(ROOT, 'references')).map(f => path.join('references', f))];

const BANNED = [
  [/\bAI\b/, 'AI'],
  [/model/i, 'model'],
  [/\bLLM/i, 'LLM'],
  [/agent/i, 'agent'],
  [/claude/i, 'Claude'],
  [/\brole/i, 'role'],
  [/persona/i, 'persona'],
  [/assistant/i, 'assistant'],
];

let failures = [];
for (const rel of FILES) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const [re, label] of BANNED) {
    const m = text.match(re);
    if (m) {
      const line = text.split('\n').findIndex(l => re.test(l)) + 1;
      failures.push(`${rel}:${line} contains banned term "${label}"`);
    }
  }
}

assert.deepStrictEqual(failures, [], failures.join('\n'));
console.log(`ok - skill content has no banned terms (${FILES.length} files checked)`);
