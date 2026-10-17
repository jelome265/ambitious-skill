# Evaluation set

`cases.json` holds prompts that the skill should trigger on, and prompts it should not trigger on. It is a dataset, not a result. No measurements are recorded here.

## How to run

For each case, start two fresh sessions: one with the skill enabled and one with it disabled. Use the same prompt, and keep any attached materials the same.

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
