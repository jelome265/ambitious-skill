# Prompt Patterns

Reusable patterns for each axis. Replace bracketed placeholders. Each pattern is written in our own words.

## Altitude

**Outcome first**
> Before doing [task], state the outcome it serves, the decision or process it feeds, and how we would know it succeeded. Then propose the smallest workflow that would let you produce and verify this outcome repeatedly without new instructions.

**Decision-oriented synthesis**
> Using [raw data sources], identify what changed since [baseline], why it changed, and which [N] actions are most urgent. For each action, give the evidence for and against it.

**Replace the artifact**
> The purpose of [current artifact] is [purpose]. Propose a better way to achieve that purpose. Show, using our historical data, whether it would have surfaced [known past event] earlier. Do not replace the current artifact until we have compared both for [period].

**Workflow prerequisites**
> To run this workflow autonomously, list the access, data, and reproduction environments you would need. For each, say whether it is available now, and what would be needed to provide it.

## Depth

**Deeper, not bigger** (from the source; paraphrased)
> I want a deeper version of this task, not a larger one. Before rewriting my request: (1) state what a top practitioner in this field would do that I am not asking for; (2) name the rawest material they would start from; (3) name the specific methods and tools they would use; (4) state what other than your own judgment would show the result is correct. Then rewrite my request to ask for exactly that.

**Adversarial assumption check**
> We believe [assumption]. Using only the raw data at [location], try to reproduce this belief. Report where it holds, where it fails, and what the data cannot tell us.

**Blind-spot search with holdout**
> Build [model or analysis] that reproduces [known period] from [source]. Then identify the earliest signal of [outcome] not currently monitored. Validate the signal on [held-out period] that was not used to find it. Report the false-positive rate.

**Stated target with measurement**
> The requirement is [requirement, e.g. p95 page load under X on a Y connection]. Measure the current value using [method]. State the gap, the likely causes ranked by evidence, and how you will re-measure after each change.

**External judge**
> Do not evaluate your own output as the final check. Run [test suite / validator / reproduction script] and report its results. If no such check exists, propose the smallest one that would be meaningful and say what it cannot catch.

## Range

**Nouns to verbs**
> Our deliverable is [noun]. Restate it as the set of things it must accomplish for its audience, using verbs. Then list the disciplines whose methods would most change how we do each of those things.

**Assemble the review group**
> For [deliverable], select [2-4] perspectives that would each change the outcome: for example [analyst / editor / adversarial reviewer / domain specialist]. For each, state the specific action it takes, not the tone it adopts. Run each and report where they disagree.

**Adversarial review**
> Act as a reviewer whose job is to find the strongest reason [deliverable] is wrong or would fail in production. Use the methods such a reviewer would use: [threat model / statistical test / red-team scenario]. List findings ranked by severity, with evidence.

## Combined

**Full pass, bounded**
> Apply altitude, depth, and range to [task], in that order. For each, state what you changed and why. Keep the total scope to [boundary]. End with: the verified facts, the assumptions, the checks run, and the checks that could not be run.
