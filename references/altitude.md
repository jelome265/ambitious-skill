# Question 0: what happens next?

Source: the essay's altitude section asks: what do you want to happen next? What is the goal beyond the goal?

## Answer it in writing

- The task: one sentence.
- The outcome the task serves: one sentence, measurable if possible.
- The decision or process that uses the outcome: one sentence.
- What success looks like: the check you would run to know.

If the outcome is not measurable, state the closest measurable proxy and say that it is a proxy.

## Worked example: a quarterly business review

Scenario: a company with a stack of data and a template for its quarterly review.

- Task: fill the review deck.
- Outcome: leadership catches problems early and moves money and people to the right places.
- Decision: which problems to act on this quarter.

Answer Questions 1 to 4 against that outcome, not against the template. Then rewrite the request. The rewritten request asks what changed this quarter, why it changed, and what should be done about it, using all the data available, not only the numbers already in the template.

## Ask whether the artifact should exist

If the artifact (the deck) exists only because the process needs it, ask whether a better way serves the purpose. Design that way. Test it against your own history to see whether it would have caught problems sooner. Run it beside the current method for one period.

## Durable workflows

When the outcome recurs, the task should stop needing manual steering. Build the conditions for that:

- The work can fetch its own inputs (for example, crash reports).
- Each version maps to its source commit.
- The work can reach the machines or environments needed to reproduce and verify results on its own.

Example: to keep an app crash-free, the work must be able to reproduce a crash on Windows, macOS, and Linux and verify the fix on each.

## Fit

Altitude fits concrete outcomes that would normally be discussed in meetings. It fits open creative work less well. "Make money" alone is not an outcome: name the measurable result first.

## Required phases

This dimension follows `references/workflow.md`. Its specific checks are:

- **Research:** the outcome, the decision it feeds, and the raw data that measures it. Name each source.
- **Investigate:** whether the current artifact serves the outcome. Test that belief against the history.
- **Plan:** the durable workflow, with each input, version mapping, and environment named.
- **Implement:** build the workflow and run it. Verify one recurrence by the outside check, not by the workflow's own report.

**Gate:** the outcome is measurable, and the outside check is recorded.
