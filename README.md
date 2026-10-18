<p align="center">
  <img src="https://raw.githubusercontent.com/jelome265/ambitious-skill/main/assets/banner.jpg" alt="Francisco Goya, Modo de volar (A Way of Flying)" width="100%">
</p>

<h1 align="center">ambitious-skill</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/ambitious-skill"><img src="https://img.shields.io/npm/v/ambitious-skill?label=npm&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/ambitious-skill"><img src="https://img.shields.io/npm/dm/ambitious-skill?color=cb3837" alt="npm downloads"></a>
  <a href="https://github.com/jelome265/ambitious-skill/actions/workflows/ci.yml"><img src="https://github.com/jelome265/ambitious-skill/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/jelome265/ambitious-skill/releases"><img src="https://img.shields.io/github/v/release/jelome265/ambitious-skill?include_prereleases&label=release" alt="GitHub release"></a>
  <a href="https://github.com/jelome265/ambitious-skill/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jelome265/ambitious-skill" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/node/v/ambitious-skill?color=339933" alt="Node.js >= 22">
  <a href="https://github.com/jelome265/ambitious-skill/commits/main"><img src="https://img.shields.io/github/last-commit/jelome265/ambitious-skill" alt="Last commit"></a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome">
</p>

<p align="center">
  A skill that teaches how to do work at a higher level of ambition: <b>Speed</b>, <b>Altitude</b>, <b>Depth</b>, and <b>Range</b>.<br>
  Based on Felix Rieseberg's essay <a href="https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/"><i>How to be more ambitious: A tutorial for humans with models</i></a> (13 October 2026).
</p>

---

## Install

Requires Node.js 22 or later.

```sh
npx ambitious-skill                 # ~/.claude/skills/ambitious (all projects)
npx ambitious-skill --project       # ./.claude/skills/ambitious (this project only)
npx ambitious-skill --dir <path>    # <path>/ambitious (custom skills root)
npx ambitious-skill --force         # overwrite an existing install
npx ambitious-skill uninstall       # remove an install made by this tool
```

Start a new session after installing so the skill loads.

The installer copies `SKILL.md` and `references/` and writes a `.ambitious-skill.json` manifest. It records a hash for every file, so it only changes files it installed. It also records whether it created the `ambitious` directory. Uninstall removes that directory only if the installer created it.

**Project installs (`--project`)** go into the project root: the nearest ancestor directory with a `.git` entry, or the current directory if there is none. The installer prints the root it chose. Run it from anywhere inside the repository.

**Symlinks** are refused for the skill directory and everything inside it. A symlinked parent above it (for example `~/.claude` or the `--dir` root) is allowed, because that is a layout choice you make on purpose.

## Install as a Claude plugin

In Claude Code:

```
/plugin marketplace add jelome265/ambitious-skill
/plugin install ambitious@ambitious-skill-marketplace
```

To check the install:

```
claude plugin list                  # ambitious@ambitious-skill-marketplace should show enabled
claude plugin details ambitious     # the component inventory should list the ambitious skill
```

Install scope is chosen in the `/plugin` panel. A plugin installed at user scope applies to all your projects. If you also have the standalone skill installed, Claude Code may use one copy over the other. Keep one installation per machine to avoid confusion.

The plugin is in `plugins/ambitious/`. Its skill copy is generated from the root `SKILL.md` and `references/` with `npm run sync:plugin`. The test suite fails if the two differ.

## The four dimensions

| Dimension | What it means |
| --- | --- |
| **Speed** | The same work in less time. Covered by the essay in one line. |
| **Altitude** | Work at the level of the outcome, not the individual task. |
| **Depth** | Use the methods and raw data a field-leading expert would use. |
| **Range** | Draw on several fields, with tools and techniques the task does not obviously call for. |

## What is inside

```
SKILL.md                  The deeper-version questions (Question 0 and Questions 1-4)
assets/banner.jpg         Banner image (Francisco Goya, Modo de volar)
references/workflow.md    Research, investigate, plan, implement: suggested order
references/altitude.md    Question 0: the goal beyond the goal
references/depth.md       Questions 1-4 in detail
references/range.md       Other fields, mapped to Questions 1, 3, and 4
references/speed.md       Same work in less time, held to the four questions
references/background.md  Why the questions work, and the essay's examples
bin/cli.js                Zero-dependency installer
test/                     Installer tests and content rules (npm test)
```

## Development

```sh
npm test            # content rules + installer tests (temp directories only)
npm pack --dry-run  # inspect the published file list
```

## Credits

- Framework and examples: Felix Rieseberg, [*How to be more ambitious*](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/) (2026). The reference files restate the essay in close paraphrase. Read the original for the full argument.
- Banner: Francisco Goya, *Modo de volar* (A Way of Flying), as used in Felix's post.

## License

Apache-2.0. See [LICENSE](LICENSE).
