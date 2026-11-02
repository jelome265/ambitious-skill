'use strict';
// Release workflow rules. A release made with GITHUB_TOKEN does not trigger other workflows,
// so publishing must be called from the release-please run. Publishing must verify the tag.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const rp = read('.github/workflows/release-please.yml');
const pub = read('.github/workflows/publish.yml');

// publish is called from the release-please run when a release was created
assert.ok(/publish:\s*\n\s+needs: release-please/.test(rp), 'publish job must depend on release-please');
assert.ok(rp.includes("needs.release-please.outputs.release_created == 'true'"), 'publish must run only when a release was created');
assert.ok(rp.includes('uses: ./.github/workflows/publish.yml'), 'release-please must call the publish workflow');

// publish accepts the call, a manual run, and a published release
assert.ok(pub.includes('workflow_call:'), 'publish must accept workflow_call');
assert.ok(pub.includes('workflow_dispatch:'), 'publish must allow a manual run');
assert.ok(pub.includes('types: [published]'), 'publish must also run for releases published by people');

// the tag must be checked against package.json before anything is published
assert.ok(pub.includes("require('./package.json').version"), 'publish must read the version from package.json');
assert.ok(pub.includes('does not end with'), 'publish must refuse a tag that does not match the version');

// publishing keeps provenance, and the old v-prefix condition is gone
assert.ok(pub.includes('npm publish --provenance --access public'), 'publish must use provenance');
assert.ok(!pub.includes("startsWith(github.event.release.tag_name, 'v')"), 'the old v-prefix condition must be gone');

// every third-party action stays pinned to a full commit SHA
for (const [name, text] of [['release-please.yml', rp], ['publish.yml', pub]]) {
  for (const m of text.matchAll(/uses: ([^\s@]+)@(\S+)/g)) {
    if (m[1].startsWith('./')) continue;
    assert.ok(/^[0-9a-f]{40}$/.test(m[2]), `${name}: ${m[1]} must be pinned to a full commit SHA`);
  }
}

console.log('ok - release workflows call publish after a release, verify the tag, and keep actions pinned');
