'use strict';
// After the first release, release-please must compute the next version from history.
// The release-as pin must not come back, and the manifest must match package.json.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const config = read('release-please-config.json');
const manifest = read('.release-please-manifest.json');
const pkg = read('package.json');

assert.ok(!('release-as' in config.packages['.']), 'release-as must not be set after the first release');
assert.strictEqual(manifest['.'], pkg.version, 'the release manifest must match package.json');

console.log(`ok - release config has no release-as; manifest and package.json are both ${pkg.version}`);
