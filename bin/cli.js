#!/usr/bin/env node
'use strict';

// ambitious-skill installer. Zero dependencies. Node >= 18.
// Usage:
//   npx ambitious-skill                 install to ~/.claude/skills/ambitious
//   npx ambitious-skill --project       install to ./.claude/skills/ambitious
//   npx ambitious-skill --dir <skills>  install to <skills>/ambitious
//   npx ambitious-skill --force         overwrite an existing install
//   npx ambitious-skill uninstall       remove an install made by this tool

const fs = require('fs');
const os = require('os');
const path = require('path');

const SKILL_NAME = 'ambitious';
const MARKER = '.ambitious-skill.json';
const PKG_ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));

// Files copied into the installed skill. Anything else in the package is ignored.
const PAYLOAD = ['SKILL.md', 'references'];

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
  --force           Overwrite an existing install
  -h, --help        Show this help
  -v, --version     Show version
`);
}

function fail(msg, code = 1) {
  console.error(`error: ${msg}`);
  process.exit(code);
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

function verifyPayload() {
  for (const item of PAYLOAD) {
    if (!fs.existsSync(path.join(PKG_ROOT, item))) {
      fail(`package is missing ${item}; reinstall ${pkg.name}`, 2);
    }
  }
}

function install(opts) {
  verifyPayload();
  const target = path.join(skillsRoot(opts), SKILL_NAME);

  if (fs.existsSync(target)) {
    const isOurs = fs.existsSync(path.join(target, MARKER));
    if (!opts.force) {
      fail(`${target} already exists. Re-run with --force to overwrite.`);
    }
    if (!isOurs) {
      fail(`${target} exists but was not installed by ${pkg.name}; refusing to overwrite it.`);
    }
    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.mkdirSync(target, { recursive: true });
  for (const item of PAYLOAD) {
    const src = path.join(PKG_ROOT, item);
    const dest = path.join(target, item);
    fs.cpSync(src, dest, { recursive: true });
  }
  fs.writeFileSync(
    path.join(target, MARKER),
    JSON.stringify({ name: pkg.name, version: pkg.version, installedAt: new Date().toISOString() }, null, 2) + '\n'
  );

  console.log(`Installed ${SKILL_NAME} ${pkg.version} to ${target}`);
  console.log('Restart Claude Code (or start a new session) to load the skill.');
}

function uninstall(opts) {
  const target = path.join(skillsRoot(opts), SKILL_NAME);
  if (!fs.existsSync(target)) fail(`nothing to remove at ${target}`, 0);
  if (!fs.existsSync(path.join(target, MARKER))) {
    fail(`${target} was not installed by ${pkg.name}; refusing to remove it.`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
}

function main() {
  const opts = parse(process.argv);
  if (opts.command === 'uninstall') return uninstall(opts);
  return install(opts);
}

main();
