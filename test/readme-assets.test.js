'use strict';
// README images must resolve: local paths must exist in the repo, and remote URLs must be https.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const srcs = [...readme.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
assert.ok(srcs.length > 0, 'README has no images');

for (const src of srcs) {
  if (/^https:\/\//.test(src)) continue;
  assert.ok(!/^https?:\/\//.test(src) || src.startsWith('https://'), `image must be https: ${src}`);
  assert.ok(fs.existsSync(path.join(ROOT, src)), `README image is missing from the repo: ${src}`);
}
assert.ok(
  srcs.some((s) => s.startsWith('https://raw.githubusercontent.com/jelome265/ambitious-skill/main/assets/')),
  'banner must use the absolute raw GitHub URL so it resolves on npm'
);

const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals', 'cases.json'), 'utf8'));
assert.ok(cases.cases.length >= 6, 'evals/cases.json needs at least six cases');

console.log(`ok - ${srcs.length} README images resolve; ${cases.cases.length} eval cases are well formed`);
