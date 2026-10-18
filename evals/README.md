# Evaluation set

`cases.json` holds prompts that the skill should trigger on, and prompts it should not trigger on. It is a dataset, not a result. No measurements are recorded here.

## How to run

Requires the Claude Code CLI with an authenticated account. Each run uses a clean `HOME`, so personal skills and plugins cannot leak into the baseline.

```
node evals/run.js --dry-run       # print the commands, run nothing
node evals/run.js --trials 3      # run every case, with and without the skill, three times
```

The runner writes `evals/results/<timestamp>/`:

- one JSON file per run, with the output, exit status, and time;
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

## Acceptance

The skill is worth keeping if it improves the should-trigger cases on quality without making the should-not-trigger cases slower, longer, or worse. Report the results with the case IDs and the session settings used.
