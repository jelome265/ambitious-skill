'use strict';
// Validates SKILL.md frontmatter against the limits the skill validator enforces:
// required fields, name format, and a description of at most 1024 characters.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
const match = text.match(/^---\n([\s\S]*?)\n---\n/);
assert.ok(match, 'SKILL.md must start with a YAML frontmatter block');

const fields = {};
for (const line of match[1].split('\n')) {
  const m = line.match(/^([a-z-]+):\s*(.*)$/);
  if (m) fields[m[1]] = m[2];
}

assert.ok(fields.name, 'frontmatter needs a name');
assert.match(fields.name, /^[a-z0-9-]{1,64}$/, 'name must be lowercase letters, digits, and hyphens');
assert.strictEqual(fields.name, 'ambitious', 'name must be "ambitious"');
assert.ok(fields.description && fields.description.length > 0, 'frontmatter needs a description');
assert.ok(fields.description.length <= 1024, `description is ${fields.description.length} characters; limit is 1024`);

console.log(`ok - frontmatter valid (name "${fields.name}", description ${fields.description.length} chars)`);
