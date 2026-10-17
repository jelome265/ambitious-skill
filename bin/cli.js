#!/usr/bin/env node
'use strict';

// ambitious-skill installer. Zero dependencies. Node >= 22.
//
// Rules this installer follows:
//   1. Only files on the managed allowlist (the package payload) are ever written or removed.
//   2. Symlinks are never followed inside the skill directory. Any symlink on the path is refused.
//   3. The manifest (.ambitious-skill.json) records a SHA-256 per installed file. Entries must be
//      unique, allowlisted, and hash-checked before anything is changed.
//   4. Updates are staged, applied with a journal, and rolled back on failure. A crash leaves a
//      journal behind; the next run rolls it back before doing anything else.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SKILL_NAME = 'ambitious';
const MANIFEST = '.ambitious-skill.json';
const JOURNAL = '.ambitious-skill.journal.json';
const BACKUP_PREFIX = '.ambitious-skill-backup-';
const STAGING_PREFIX = '.ambitious-skill-staging-';
const PAYLOAD = ['SKILL.md', 'references'];

class InstallError extends Error {}
function fail(message) {
  throw new InstallError(message);
}

const PKG_ROOT = findPackageRoot(__dirname);
const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));

function findPackageRoot(start) {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('package.json not found');
    dir = parent;
  }
}

function help() {
  console.log(`ambitious-skill ${pkg.version}

Installs the "ambitious" Claude skill (a tutorial for being more ambitious
with models: Speed, Altitude, Depth, Range).

Usage:
  npx ambitious-skill [options]
  npx ambitious-skill uninstall [options]

Options:
  --project         Install into ./.claude/skills (project scope)
  --dir <path>      Install into <path>/${SKILL_NAME} (custom skills root)
  --force           Update an existing install made by this tool
  -h, --help        Show this help
  -v, --version     Show version
`);
}

function parse(argv) {
  const opts = { command: 'install', project: false, dir: null, force: false };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case 'install':
      case 'uninstall':
        opts.command = a;
        break;
      case '--project':
        opts.project = true;
        break;
      case '--dir':
        if (!args[i + 1] || args[i + 1].startsWith('-')) fail('--dir requires a path');
        opts.dir = args[++i];
        break;
      case '--force':
        opts.force = true;
        break;
      case '-h':
      case '--help':
        help();
        process.exit(0);
        break;
      case '-v':
      case '--version':
        console.log(pkg.version);
        process.exit(0);
        break;
      default:
        fail(`unknown argument: ${a} (see --help)`);
    }
  }
  if (opts.project && opts.dir) fail('use either --project or --dir, not both');
  return opts;
}

function skillsRoot(opts) {
  if (opts.dir) return path.resolve(opts.dir);
  if (opts.project) return path.resolve(process.cwd(), '.claude', 'skills');
  return path.join(os.homedir(), '.claude', 'skills');
}

function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// A relative path is safe only if it is POSIX-style, non-empty, and stays inside its root.
function isSafeRelative(rel) {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\\')) return false;
  if (path.posix.isAbsolute(rel) || path.win32.isAbsolute(rel)) return false;
  const normalized = path.posix.normalize(rel);
  if (normalized !== rel || normalized === '.' || normalized.startsWith('..')) return false;
  return true;
}

// Every regular file in the payload, as sorted POSIX-style relative paths.
function payloadFiles() {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(PKG_ROOT, rel);
    const st = lstatOrNull(abs);
    if (!st) fail(`package is missing ${rel}; reinstall ${pkg.name}`);
    if (st.isSymbolicLink()) fail(`package payload contains a symlink: ${rel}`);
    if (st.isDirectory()) {
      for (const entry of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, entry));
    } else if (st.isFile()) {
      out.push(rel);
    } else {
      fail(`package payload contains a non-regular file: ${rel}`);
    }
  };
  for (const item of PAYLOAD) walk(item);
  return out;
}

const ALLOWED = new Set(payloadFiles());

// Resolves rel under target, refusing any symlink or non-directory on the way.
// With create=true, missing parent directories are created.
function safeJoin(target, rel, { create = false } = {}) {
  if (!isSafeRelative(rel)) fail(`unsafe path in install record: ${rel}`);
  const top = lstatOrNull(target);
  if (top && (top.isSymbolicLink() || !top.isDirectory())) {
    fail(`${target} is a symlink or not a directory; refusing to change it.`);
  }
  const parts = rel.split('/');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = path.join(cur, parts[i]);
    const st = lstatOrNull(cur);
    if (!st) {
      if (!create) break;
      fs.mkdirSync(cur);
    } else if (st.isSymbolicLink() || !st.isDirectory()) {
      fail(`${cur} is a symlink or not a directory; refusing to change it.`);
    }
  }
  const full = path.join(target, rel);
  const st = lstatOrNull(full);
  if (st && (st.isSymbolicLink() || !st.isFile())) {
    fail(`${rel} is a symlink or not a regular file; refusing to change it.`);
  }
  return full;
}

// Reads and validates the manifest. Returns null when there is none; throws when it is invalid.
function readManifest(target) {
  const file = path.join(target, MANIFEST);
  const st = lstatOrNull(file);
  if (!st) return null;
  if (!st.isFile()) fail(`${MANIFEST} in ${target} is not a regular file; refusing to change it.`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail(`${MANIFEST} in ${target} is not valid JSON; refusing to change it.`);
  }
  if (!data || data.name !== pkg.name || typeof data.version !== 'string' || !Array.isArray(data.files)) {
    fail(`${MANIFEST} in ${target} does not match ${pkg.name}; refusing to change it.`);
  }
  const seen = new Set();
  for (const f of data.files) {
    const ok =
      f &&
      typeof f.path === 'string' &&
      ALLOWED.has(f.path) &&
      typeof f.sha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(f.sha256);
    if (!ok) fail(`${MANIFEST} lists an entry that is not part of ${pkg.name}; refusing to change it.`);
    if (seen.has(f.path)) fail(`${MANIFEST} lists ${f.path} twice; refusing to change it.`);
    seen.add(f.path);
  }
  return data;
}

// Reads the journal of an interrupted update. Returns null when there is none.
function readJournal(target) {
  const file = path.join(target, JOURNAL);
  const st = lstatOrNull(file);
  if (!st) return null;
  if (!st.isFile()) fail(`${JOURNAL} in ${target} is not a regular file; refusing to continue.`);
  let j;
  try {
    j = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail(`${JOURNAL} in ${target} is not valid JSON; refusing to continue.`);
  }
  const backupDir = j && j.backupDir;
  const backupOk =
    typeof backupDir === 'string' &&
    path.dirname(backupDir) === path.dirname(target) &&
    path.basename(backupDir).startsWith(BACKUP_PREFIX);
  const opsOk =
    j &&
    Array.isArray(j.ops) &&
    j.ops.every(
      (op) =>
        op &&
        isSafeRelative(op.rel) &&
        typeof op.placed === 'boolean' &&
        (op.backup === null || (typeof op.backup === 'string' && path.dirname(op.backup) === backupDir))
    );
  if (!backupOk || !opsOk) fail(`${JOURNAL} in ${target} does not match ${pkg.name}; refusing to continue.`);
  return j;
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

// Undoes a journal: removes placed files, restores backups, then removes the journal.
function rollback(target, journal) {
  for (const op of [...journal.ops].reverse()) {
    const full = safeJoin(target, op.rel, { create: true });
    if (op.placed) {
      const st = lstatOrNull(full);
      if (st && st.isFile()) fs.rmSync(full);
    }
    if (op.backup && lstatOrNull(op.backup)) {
      fs.renameSync(op.backup, full);
    }
  }
  fs.rmSync(journal.backupDir, { recursive: true, force: true });
  fs.rmSync(path.join(target, JOURNAL), { force: true });
}

function removeStagingLeftovers(root) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root)) {
    if (entry.startsWith(STAGING_PREFIX)) fs.rmSync(path.join(root, entry), { recursive: true, force: true });
  }
}

function removeEmptyDirs(dir, stopAt) {
  let current = dir;
  while (current !== stopAt && current.startsWith(stopAt + path.sep)) {
    const st = lstatOrNull(current);
    if (!st || !st.isDirectory() || fs.readdirSync(current).length > 0) break;
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function install(opts) {
  const root = skillsRoot(opts);
  const target = path.join(root, SKILL_NAME);
  const files = payloadFiles();

  const top = lstatOrNull(target);
  if (top && (top.isSymbolicLink() || !top.isDirectory())) {
    fail(`${target} is a symlink or not a directory; refusing to change it.`);
  }

  // A journal means an earlier update stopped partway. Roll it back first.
  if (top) {
    const journal = readJournal(target);
    if (journal) {
      if (!opts.force) fail(`an interrupted update was found in ${target}. Run again with --force to recover it.`);
      rollback(target, journal);
      removeStagingLeftovers(root);
      console.log('Recovered an interrupted update (rolled back to the previous state).');
    }
  }

  const liveTop = lstatOrNull(target);
  const isEmpty = liveTop && fs.readdirSync(target).length === 0;
  const existing = liveTop && !isEmpty ? readManifest(target) : null;
  if (liveTop && !isEmpty) {
    if (!existing) fail(`${target} exists and was not installed by ${pkg.name}; refusing to change it.`);
    if (!opts.force) fail(`${target} already exists. Re-run with --force to update it.`);
    for (const f of existing.files) {
      const full = safeJoin(target, f.path);
      if (lstatOrNull(full) && sha256(full) !== f.sha256) {
        fail(`${f.path} was modified after install; refusing to overwrite it.`);
      }
    }
  }
  const managed = new Set(existing ? existing.files.map((f) => f.path) : []);
  for (const rel of files) {
    if (!managed.has(rel) && lstatOrNull(safeJoin(target, rel))) {
      fail(`${rel} already exists and is not managed by ${pkg.name}; refusing to overwrite it.`);
    }
  }

  const stamp = `${process.pid}-${Date.now()}`;
  const staging = path.join(root, `${STAGING_PREFIX}${stamp}`);
  const backupDir = path.join(root, `${BACKUP_PREFIX}${stamp}`);
  const journalPath = path.join(target, JOURNAL);
  const manifestPath = path.join(target, MANIFEST);
  const createdTarget = !liveTop;
  let journal = null;

  try {
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(staging);
    const written = [];
    for (const rel of files) {
      const dst = path.join(staging, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(PKG_ROOT, rel), dst);
      written.push({ path: rel, sha256: sha256(dst), staged: dst });
    }

    fs.mkdirSync(target, { recursive: true });
    fs.mkdirSync(backupDir);
    journal = { backupDir, started: new Date().toISOString(), ops: [] };
    writeJsonAtomic(journalPath, journal);

    const obsolete = existing ? existing.files.map((f) => f.path).filter((p) => !files.includes(p)) : [];
    const plan = [
      ...written.map((w) => ({ rel: w.path, from: w.staged })),
      ...obsolete.map((rel) => ({ rel, from: null })),
    ];

    let placed = 0;
    for (const step of plan) {
      const full = safeJoin(target, step.rel, { create: true });
      const op = { rel: step.rel, placed: false, backup: null };
      journal.ops.push(op);
      writeJsonAtomic(journalPath, journal);

      if (lstatOrNull(full)) {
        const backup = path.join(backupDir, `${journal.ops.length}.bak`);
        fs.renameSync(full, backup);
        op.backup = backup;
        writeJsonAtomic(journalPath, journal);
      }
      if (step.from) {
        fs.renameSync(step.from, full);
        op.placed = true;
        writeJsonAtomic(journalPath, journal);
      }

      placed++;
      if (process.env.AMBITIOUS_SKILL_TEST_FAIL_AFTER && placed >= Number(process.env.AMBITIOUS_SKILL_TEST_FAIL_AFTER)) {
        throw new Error('test failure injected');
      }
      if (process.env.AMBITIOUS_SKILL_TEST_CRASH_AFTER && placed >= Number(process.env.AMBITIOUS_SKILL_TEST_CRASH_AFTER)) {
        process.exit(3); // simulates a hard kill: no cleanup, journal left behind
      }
    }

    writeJsonAtomic(manifestPath, {
      name: pkg.name,
      version: pkg.version,
      installedAt: new Date().toISOString(),
      files: written.map((w) => ({ path: w.path, sha256: w.sha256 })),
    });
    fs.rmSync(journalPath, { force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
    fs.rmSync(staging, { recursive: true, force: true });
  } catch (err) {
    if (journal) {
      try {
        rollback(target, journal);
      } catch (rbErr) {
        fail(`install failed and rollback also failed (${rbErr.message}). Run again with --force to recover.`);
      }
    }
    fs.rmSync(staging, { recursive: true, force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
    if (createdTarget && lstatOrNull(target) && fs.readdirSync(target).length === 0) fs.rmdirSync(target);
    if (err instanceof InstallError) throw err;
    fail(`install failed and was rolled back: ${err.message}`);
  }

  console.log(`Installed ${SKILL_NAME} ${pkg.version} to ${target}`);
  console.log('Start a new session so the skill loads.');
}

function uninstall(opts) {
  const root = skillsRoot(opts);
  const target = path.join(root, SKILL_NAME);
  const top = lstatOrNull(target);
  if (!top) fail(`nothing to remove at ${target}`);
  if (top.isSymbolicLink() || !top.isDirectory()) fail(`${target} is a symlink or not a directory; refusing to change it.`);
  if (readJournal(target)) {
    fail(`an interrupted update was found in ${target}. Run ${pkg.name} --force to recover it, then uninstall.`);
  }
  const manifest = readManifest(target);
  if (!manifest) fail(`${target} was not installed by ${pkg.name}; refusing to remove it.`);

  // Check every managed file before deleting anything.
  for (const f of manifest.files) {
    const full = safeJoin(target, f.path);
    if (lstatOrNull(full) && sha256(full) !== f.sha256) {
      fail(`${f.path} was modified after install; nothing was removed.`);
    }
  }

  for (const f of manifest.files) {
    const full = safeJoin(target, f.path);
    if (lstatOrNull(full)) fs.rmSync(full);
    removeEmptyDirs(path.dirname(full), target);
  }
  fs.rmSync(path.join(target, MANIFEST), { force: true });
  if (fs.readdirSync(target).length === 0) {
    fs.rmdirSync(target);
    console.log(`Removed ${SKILL_NAME} from ${target}`);
  } else {
    console.log(`Removed ${SKILL_NAME} from ${target}. Files you added there were kept.`);
  }
}

function main() {
  const opts = parse(process.argv);
  if (opts.command === 'uninstall') return uninstall(opts);
  return install(opts);
}

try {
  main();
} catch (err) {
  if (err instanceof InstallError) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
