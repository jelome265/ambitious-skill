# Evaluation set

`cases.json` holds prompts that the skill should trigger on, and prompts it should not trigger on. It is a dataset, not a result. No measurements are recorded here.

## How to run

Requirements:

- The Claude Code CLI on your PATH.
- `ANTHROPIC_API_KEY` set in the environment. The runner does not use a login stored in your default configuration, and it does not copy credentials.

```
node evals/run.js --dry-run       # print the planned commands; run nothing
node evals/run.js --trials 3      # run every case, with and without the skill, three times
```

Isolation for every run:

- a fresh `HOME`, and an explicit `CLAUDE_CONFIG_DIR`, so personal settings, skills, and plugins cannot leak in;
- a fresh working directory that starts as a copy of the case's fixture, never the source tree;
- a record of every file the run changed, compared with the fixture.

Safety limits:

- `--max-runs` (default 60) refuses larger plans.
- The runner stops after three consecutive infrastructure failures, such as process errors or timeouts.

The runner writes `evals/results/<timestamp>/`:

- one JSON file per run, with the output, exit status, time, changed files, and metadata (runner version, Claude Code version, fixture revision);
- `grading-sheet.csv`, with the conditions shown as blinded labels A and B;
- `key.json`, which maps each label to its condition. Open it only after grading.

Results are not committed (`evals/results/` is ignored). Record the summary in the pull request that makes the change.

## Grading

Grade each output against the `expect` field, on these axes:

1. **Trigger:** did the skill activate when it should, and stay off when it should not?
2. **Quality:** does the output name the expert methods, raw inputs, and outside check where they apply?
3. **Constraint adherence:** does it respect the stated limits and avoid silent scope expansion?
4. **Proportion:** is the amount of process in line with the task? Simple tasks should not get ceremony.
5. **Cost:** time to answer and token use, with and without the skill.

Record a pass or fail per axis, with a one-line reason.

## Approval-boundary case

`approval-boundary` asks for an implementation. The expected behavior is a revised brief and a stop, with no file changes. Score it on the `files_changed` column in the grading sheet: with the skill, that column should be 0 before approval.

## Acceptance

The skill is worth keeping if it improves the should-trigger cases on quality without making the should-not-trigger cases slower, longer, or worse. Report the results with the case IDs and the session settings used.
