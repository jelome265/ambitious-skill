#!/usr/bin/env node
'use strict';

// ambitious-skill installer. Zero dependencies. Node >= 22.
//
// Ownership model: the installer records every file it writes, with a SHA-256
// hash, in a manifest (.ambitious-skill.json). It only touches files that a
// valid manifest lists. Anything else in the target directory is left alone.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SKILL_NAME = 'ambitious';
const MANIFEST = '.ambitious-skill.json';
const PAYLOAD = ['SKILL.md', 'references'];

const PKG_ROOT = findPackageRoot(__dirname);
const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));

class InstallError extends Error {}

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
        if (!args[i + 1] || args[i + 1].startsWith('-')) throw new InstallError('--dir requires a path');
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
        throw new InstallError(`unknown argument: ${a} (see --help)`);
    }
  }
  if (opts.project && opts.dir) throw new InstallError('use either --project or --dir, not both');
  return opts;
}

function skillsRoot(opts) {
  if (opts.dir) return path.resolve(opts.dir);
  if (opts.project) return path.resolve(process.cwd(), '.claude', 'skills');
  return path.join(os.homedir(), '.claude', 'skills');
}

// All files in the payload as POSIX-style relative paths, sorted.
function payloadFiles() {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(PKG_ROOT, rel);
    const stat = fs.lstatSync(abs);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, entry));
    } else if (stat.isFile()) {
      out.push(rel);
    } else {
      throw new InstallError(`payload contains a non-regular file: ${rel}`);
    }
  };
  for (const item of PAYLOAD) {
    if (!fs.existsSync(path.join(PKG_ROOT, item))) {
      throw new InstallError(`package is missing ${item}; reinstall ${pkg.name}`);
    }
    walk(item);
  }
  return out;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// A relative path from the manifest is safe only if it stays inside the skill directory.
function isSafeRelative(rel) {
  if (typeof rel !== 'string' || rel.length === 0) return false;
  if (path.posix.isAbsolute(rel) || path.win32.isAbsolute(rel)) return false;
  const normalized = path.posix.normalize(rel);
  if (normalized.startsWith('../') || normalized === '..' || normalized === '.') return false;
  return normalized === rel && !rel.includes('\\');
}

// Reads and validates the manifest. Returns null if there is none, throws if it is invalid.
function readManifest(target) {
  const file = path.join(target, MANIFEST);
  if (!fs.existsSync(file)) return null;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new InstallError(`${MANIFEST} in ${target} is not valid JSON; refusing to change it`);
  }
  const valid =
    data &&
    data.name === pkg.name &&
    typeof data.version === 'string' &&
    Array.isArray(data.files) &&
    data.files.every(
      (f) => f && isSafeRelative(f.path) && typeof f.sha256 === 'string' && /^[0-9a-f]{64}$/.test(f.sha256)
    );
  if (!valid) {
    throw new InstallError(`${MANIFEST} in ${target} does not match ${pkg.name}; refusing to change it`);
  }
  return data;
}

function removeEmptyDirs(dir, stopAt) {
  let current = dir;
  while (current !== stopAt && current.startsWith(stopAt + path.sep)) {
    if (fs.readdirSync(current).length > 0) break;
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function install(opts) {
  const files = payloadFiles();
  const target = path.join(skillsRoot(opts), SKILL_NAME);
  const manifest = fs.existsSync(target) ? readManifest(target) : null;

  const isEmptyDir = fs.existsSync(target) && fs.readdirSync(target).length === 0;
  if (fs.existsSync(target) && !isEmptyDir) {
    if (!manifest) {
      throw new InstallError(`${target} exists and was not installed by ${pkg.name}; refusing to change it.`);
    }
    if (!opts.force) {
      throw new InstallError(`${target} already exists. Re-run with --force to update it.`);
    }
    // Refuse to replace any managed file the user has edited.
    for (const f of manifest.files) {
      const abs = path.join(target, f.path);
      if (fs.existsSync(abs) && sha256(abs) !== f.sha256) {
        throw new InstallError(`${f.path} was modified after install; refusing to overwrite it.`);
      }
    }
  }

  // Stage the new payload next to the target, then copy file by file.
  fs.mkdirSync(target, { recursive: true });
  const written = [];
  for (const rel of files) {
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(PKG_ROOT, rel), dest);
    written.push({ path: rel, sha256: sha256(dest) });
  }

  // Remove managed files from the previous version that are no longer shipped.
  if (manifest) {
    const keep = new Set(written.map((f) => f.path));
    for (const f of manifest.files) {
      if (!keep.has(f.path)) {
        const abs = path.join(target, f.path);
        if (fs.existsSync(abs)) fs.rmSync(abs);
        removeEmptyDirs(path.dirname(abs), target);
      }
    }
  }

  fs.writeFileSync(
    path.join(target, MANIFEST),
    JSON.stringify(
      { name: pkg.name, version: pkg.version, installedAt: new Date().toISOString(), files: written },
      null,
      2
    ) + '\n'
  );

  console.log(`Installed ${SKILL_NAME} ${pkg.version} to ${target}`);
  console.log('Start a new session so the skill loads.');
}

function uninstall(opts) {
  const target = path.join(skillsRoot(opts), SKILL_NAME);
  if (!fs.existsSync(target)) throw new InstallError(`nothing to remove at ${target}`);
  const manifest = readManifest(target);
  if (!manifest) {
    throw new InstallError(`${target} was not installed by ${pkg.name}; refusing to remove it.`);
  }

  // Check every managed file before deleting anything.
  for (const f of manifest.files) {
    const abs = path.join(target, f.path);
    if (fs.existsSync(abs) && sha256(abs) !== f.sha256) {
      throw new InstallError(`${f.path} was modified after install; nothing was removed.`);
    }
  }

  for (const f of manifest.files) {
    const abs = path.join(target, f.path);
    if (fs.existsSync(abs)) fs.rmSync(abs);
    removeEmptyDirs(path.dirname(abs), target);
  }
  fs.rmSync(path.join(target, MANIFEST), { force: true });
  // Remove the skill directory only if nothing else was placed in it.
  if (fs.existsSync(target) && fs.readdirSync(target).length === 0) fs.rmdirSync(target);

  console.log(`Removed ${SKILL_NAME} from ${target}`);
  if (fs.existsSync(target)) console.log('Files you added there were kept.');
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
