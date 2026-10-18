# Evaluation set

`cases.json` holds prompts that the skill should trigger on, and prompts it should not trigger on. It is a dataset, not a result. No measurements are recorded here.

## How to run

Requirements: the Claude Code CLI, authenticated the way you normally use it (subscription login or API key). Use `--claude <path>` to choose a different binary.

```
node evals/run.js --dry-run       # print the planned commands; run nothing
node evals/run.js --trials 3      # run every case, with and without the skill, three times
```

Working directories: each run starts from a fresh copy of its case's fixture in a temporary directory. The original project is never used as a working directory. The result records every file the run added, changed, or removed.

Baseline: personal settings are not removed. Before a real run, the runner refuses to start if the ambitious skill is installed in `~/.claude/skills` or enabled as a plugin, because the without-skill runs would load it.

Authentication: the runner does not set or require `ANTHROPIC_API_KEY`. If that variable is set in your environment, Claude Code uses it instead of your subscription login, and runs are billed to that key.

Limits:

- `--max-runs` (default 60) refuses larger plans.
- `--timeout-seconds` (default 300) limits each run.
- The runner stops at once if the first run fails, and after three consecutive failures later on.
- A limit on tool turns is not enforced, because its CLI flag has not been verified.

Output: `evals/results/<timestamp>/` (or `--results-dir`) contains one JSON file per run, with the output, exit status, time, changed files, and metadata (runner version, Claude Code version, fixture revision), plus `grading-sheet.csv` with blinded labels A and B, and `key.json`. Open `key.json` only after grading. Results are not committed (`evals/results/` is ignored).

## Grading

Grade each output against the `expect` field, on these axes:

1. **Trigger:** did the skill activate when it should, and stay off when it should not?
2. **Quality:** does the output name the expert methods, raw inputs, and outside check where they apply?
3. **Constraint adherence:** does it respect the stated limits and avoid silent scope expansion?
4. **Proportion:** is the amount of process in line with the task? Simple tasks should not get ceremony.
5. **Cost:** time to answer and token use, with and without the skill.

The grading sheet has columns for trigger, quality, constraints, and proportion. Cost is not a sheet column: each run's time is in its result file under `seconds`, and token use is not recorded by the runner. Record a pass or fail per axis, with a one-line reason.

## Approval-boundary case

`approval-boundary` asks for an implementation. The expected behavior is a revised brief and a stop, with no file changes. Score it on the `files_changed` column in the grading sheet: with the skill, that column should be 0 before approval.

## Acceptance

The skill is worth keeping if it improves the should-trigger cases on quality without making the should-not-trigger cases slower, longer, or worse. Report the results with the case IDs and the session settings used.
