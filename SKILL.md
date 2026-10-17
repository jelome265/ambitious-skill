---
name: ambitious
description: Raise the ambition of AI-assisted work along four axes - Altitude (optimize for the outcome beyond the task), Depth (use the methods and raw data a top practitioner would use), Range (bring in perspectives from other fields), and Speed. Use this skill whenever the user asks to "be more ambitious", "think bigger", "go deeper", wants a higher-leverage approach to a task, is stuck with shallow or generic model output, is planning a multi-step AI-driven project, asks how to get more out of Claude or another model, or wants a task turned into a durable workflow the model can run and verify itself. Also use when the user says a result "feels generic", "isn't good enough", or "just fills in the template". Do not use for simple one-step lookups or trivial edits where scope expansion would be unwanted.
---

# Ambitious

This skill helps turn a narrow request into a higher-leverage piece of work. It is based on the four-axis framework in Felix Rieseberg's "How to be more ambitious: A tutorial for humans with models" (October 2026). Read `references/framework.md` for the full model and `references/prompts.md` for reusable prompt patterns.

The core rule: **ambition must not reduce correctness, safety, or verifiability.** Expanding scope without an external check is a failure mode, not an improvement.

## Step 1: Classify the request

Before doing anything, decide which axes apply. Ask at most one clarifying question if the goal is unclear; otherwise proceed and state assumptions.

| Axis | Question it answers | Signal that it applies |
|------|--------------------|-----------------------|
| Altitude | What outcome is this for? | The task is one of many in a recurring process, or feeds a decision |
| Depth | What would a top expert start from? | The output is analytical, technical, or high-stakes |
| Range | Which other fields have a useful perspective? | The problem is cross-functional, or current output is one-dimensional |
| Speed | Can the same work be done faster? | Usually already covered; do not dwell on it |

Name the axes you are using in one line before starting.

## Step 2: Altitude - find the goal beyond the goal

1. State the immediate task in one sentence.
2. State the outcome the task serves in one sentence. Ask: what happens after this is done?
3. If the outcome is recurring or measurable, propose a workflow that lets the model fetch its own inputs, check results, and report status without re-prompting for each task.
4. Identify what the workflow needs in order to run: data access, a way to reproduce results, a way to verify them. List missing access explicitly rather than assuming it.

Do not invent an outcome the user did not signal. If the outcome is unclear, state your inferred version and mark it as an assumption.

## Step 3: Depth - work from the rawest material

1. Name what a top practitioner in this field would do that the current request does not ask for.
2. Identify the rawest input available (raw logs, source data, original documents) rather than summaries of it.
3. Name the specific methods and tools that field uses. Prefer the real instrument (a statistical test, a schema validator, a threat-modeling method such as STRIDE, a load test) over a markdown table with a professional tone.
4. Challenge assumptions adversarially using the raw data. Report the assumptions that did not survive.
5. Define at least one check that does not depend on the model's own judgment: a test suite, a validator, a reproduction, a human reviewer, or an independent data source.

Stated goals should be verifiable requirements. Replace "make it fast" with a measurable target tied to a stated constraint, and state how it will be measured. Do not set aggressive numbers merely to provoke a better answer.

## Step 4: Range - bring in other disciplines

1. Convert the nouns in the task into verbs describing what the output must accomplish. For example, "a report" becomes "persuading a decision-maker of a cause-and-effect claim under uncertainty."
2. From those verbs, select 2 to 4 relevant disciplines or roles. Good candidates include: an analyst, an editor, a red team, a forensic accountant, a compliance reviewer, a site reliability engineer, a threat modeler.
3. Use each perspective to do its work, not to imitate its voice. Ask for the actions a short seller would take to research a position, not for text written "in the style of" one.
4. Keep the number of perspectives proportionate. More roles add cost and contradiction; use only those that change the outcome.

## Step 5: Verify before reporting

Before presenting any result under this skill:

- Confirm the outcome from Step 2 is actually addressed, not just the immediate task.
- Confirm at least one check from Step 3.5 was run, or state explicitly that none was possible and why.
- Separate in the response: facts (verified or sourced), assumptions, and open risks.
- Do not claim a result is correct because the model produced it. Say what would show it is correct.

## Output format

Unless the user asks for something else, respond with:

1. **Axes used** - one line.
2. **Goal beyond the goal** - one or two sentences (Altitude).
3. **Work** - the deliverable, produced at the depth from Step 3.
4. **Verification** - the checks run, and the checks that could not be run.
5. **Assumptions and risks** - short bullets.

For large deliverables, write them as files and present them, rather than inlining them.

## Guardrails

- Do not roleplay personas as a substitute for doing the work. Ask for actions, not voices.
- Do not expand scope into areas the user did not ask about without saying so and offering the option.
- Do not present unsourced figures, names, or events as fact. Verify or flag them.
- Do not let the model grade its own output as the only check.
- For security, compliance, financial, or medical content, prefer the verifiable path over the ambitious one, and state the risk.
- If the user only wants a quick answer, skip the framework and answer directly.
