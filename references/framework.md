# The Four-Axis Framework

Source: Felix Rieseberg, "How to be more ambitious: A tutorial for humans with models", 13 October 2026. This document restates the framework in our own words and adds engineering guardrails. It is not a substitute for the original.

## Axes

**Speed** - Doing the same work in less time. This is the most common form of AI value and needs little method. It is included for completeness.

**Altitude** - Working at the level of the outcome instead of the individual task. The useful question is what should happen after this task is complete. Over time this favors durable workflows: the model can fetch data, understand how artifacts map to each other (for example, app version to source commit), access the environments needed to reproduce a problem, and verify its own fixes. Altitude works best when the outcome is concrete and measurable. It works less well for open creative work.

**Depth** - Using the instruments, data, and methods of a top practitioner. Two common failures:
- Asking the model to "act like a professional" changes vocabulary without changing method.
- Summaries are already interpretations. Starting from raw data gives the model a chance to find what the summary omitted.

Depth techniques the source describes:
- Use the field's real methods (databases, statistical models, established test procedures).
- Set demanding targets, and frame them as achievable only if they are actually constraints you can verify.
- Test existing beliefs against raw data, adversarially.
- Ask for blind spots: what signal is not yet known, and whether it holds on data not used to find it.
- Use an external judge. The source is explicit that a model should not be asked to judge its own output.

**Range** - Drawing on other fields. Techniques the source describes:
- Replace nouns with verbs to find the real function of the work.
- Assemble a set of roles relevant to the outcome, including an adversarial reviewer.
- Avoid roleplay. Request the actions a role would take.

Range depends on tooling. The source assumes the model can install software and reach relevant data through connectors or equivalent means.

**Speed** - See above.

## Supporting ideas

The source cites goal-setting research (specific, hard goals tend to outperform "do your best") and self-efficacy research. These concern human motivation. They do not establish that more aggressive prompts produce better engineering output. Treat them as motivation, not method.

## Guardrails added in this skill

- A higher-ambition framing must not weaken correctness, security, or verifiability.
- Stated targets must trace to a real requirement and a measurement method.
- Outside validation is required for any claim that matters.
- Source claims (figures, anecdotes, attributions) should be verified before reuse. The source is written by a person working on Claude products and is persuasive by design; its anecdotes are not measured results.
