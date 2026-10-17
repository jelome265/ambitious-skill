'use strict';
// Checks the Claude plugin and marketplace layout against the documented rules,
// and that the plugin's copy of the skill matches the canonical root files.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const pkg = read('package.json');
const market = read('.claude-plugin/marketplace.json');
const RESERVED = [
  'claude-code-marketplace', 'claude-code-plugins', 'claude-plugins-official', 'anthropic-marketplace',
  'anthropic-plugins', 'agent-skills', 'anthropic-agent-skills', 'knowledge-work-plugins', 'life-sciences',
];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Marketplace rules
assert.ok(market.name && KEBAB.test(market.name), 'marketplace name must be kebab-case');
assert.ok(!RESERVED.includes(market.name), `marketplace name "${market.name}" is reserved`);
assert.ok(market.owner && market.owner.name, 'marketplace needs an owner name');
assert.ok(Array.isArray(market.plugins) && market.plugins.length > 0, 'marketplace needs plugins');

for (const entry of market.plugins) {
  assert.ok(KEBAB.test(entry.name), `plugin entry name "${entry.name}" must be kebab-case`);
  assert.ok(typeof entry.source === 'string' && entry.source.startsWith('./'), 'relative source must start with ./');
  assert.ok(!entry.source.includes('..'), 'relative source must not contain ..');
  const dir = path.join(ROOT, entry.source);
  assert.ok(fs.existsSync(dir), `source directory missing: ${entry.source}`);

  // Plugin rules
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.strictEqual(manifest.name, entry.name, 'entry name must equal the plugin manifest name');
  assert.ok(KEBAB.test(manifest.name), 'plugin name must be kebab-case');
  assert.strictEqual(manifest.version, pkg.version, 'plugin.json version must match package.json');
  assert.ok(manifest.description && manifest.description.length > 0, 'plugin needs a description');

  // Only plugin.json may live inside .claude-plugin/
  assert.deepStrictEqual(fs.readdirSync(path.join(dir, '.claude-plugin')), ['plugin.json']);

  // Skills live at the plugin root, one directory per skill, each with SKILL.md
  const skillsDir = path.join(dir, 'skills');
  assert.ok(fs.existsSync(skillsDir), 'plugin needs a skills/ directory');
  for (const skill of fs.readdirSync(skillsDir)) {
    assert.ok(fs.existsSync(path.join(skillsDir, skill, 'SKILL.md')), `skills/${skill} is missing SKILL.md`);
  }

  // The plugin's copy of the skill must match the canonical root files exactly.
  const copy = path.join(skillsDir, 'ambitious');
  assert.ok(
    fs.readFileSync(path.join(copy, 'SKILL.md')).equals(fs.readFileSync(path.join(ROOT, 'SKILL.md'))),
    'plugin SKILL.md differs from root SKILL.md; run node scripts/sync-plugin.js'
  );
  const compare = (rel) => {
    const a = fs.readdirSync(path.join(ROOT, rel)).sort();
    const b = fs.readdirSync(path.join(copy, rel)).sort();
    assert.deepStrictEqual(b, a, `plugin ${rel}/ differs from root; run node scripts/sync-plugin.js`);
    for (const f of a) {
      assert.ok(
        fs.readFileSync(path.join(copy, rel, f)).equals(fs.readFileSync(path.join(ROOT, rel, f))),
        `plugin ${rel}/${f} differs from root; run node scripts/sync-plugin.js`
      );
    }
  };
  compare('references');
}

console.log(`ok - marketplace "${market.name}" and ${market.plugins.length} plugin(s) follow the documented layout`);
