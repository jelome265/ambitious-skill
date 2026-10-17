# ambitious-skill

A Claude skill based on Felix Rieseberg's essay ["How to be more ambitious: A tutorial for humans with models"](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/) (13 October 2026). It covers four types of ambition: **Speed**, **Altitude**, **Depth**, and **Range**.

## Install

Requires Node.js 18 or later.

```sh
npx ambitious-skill                 # ~/.claude/skills/ambitious (all projects)
npx ambitious-skill --project       # ./.claude/skills/ambitious (this project only)
npx ambitious-skill --dir <path>    # <path>/ambitious (custom skills root)
npx ambitious-skill --force         # overwrite an existing install
npx ambitious-skill uninstall       # remove an install made by this tool
```

Start a new Claude Code session after installing so the skill loads.

The installer copies `SKILL.md` and `references/` and writes a `.ambitious-skill.json` marker. It never overwrites or deletes a directory it did not create.

## What is inside

```
SKILL.md              Workflow and the four types of ambition
references/altitude.md   QBR worked example and altitude prompts
references/depth.md      Depth techniques and the deeper-version prompt
references/range.md      Replacing nouns with verbs, assembling the crew, avoiding role-play
references/background.md Self-efficacy and the examples from the essay
bin/cli.js            Zero-dependency installer
test/install.test.js  Installer integration tests (npm test)
```

## Scope

The skill follows the essay's framework. The reference files restate the essay in close paraphrase, keeping its prompts nearly verbatim. Read the original for the full argument.

## Development

```sh
npm test          # installer tests, uses temp directories only
npm pack --dry-run
```

## License

Apache-2.0. See [LICENSE](LICENSE).
