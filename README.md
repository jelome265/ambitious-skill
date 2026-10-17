# ambitious

A Claude skill that raises the ambition of AI-assisted work across four axes: Altitude, Depth, Range, and Speed. Based on Felix Rieseberg's October 2026 essay "How to be more ambitious: A tutorial for humans with models", restated in our own words with added verification guardrails.

## Layout

```
ambitious/
├── SKILL.md                  # Triggering metadata and workflow (loaded when skill triggers)
├── references/
│   ├── framework.md          # The four axes, source notes, guardrails
│   └── prompts.md            # Reusable prompt patterns per axis
├── README.md
└── CHANGELOG.md
```

## Design decisions

- **Ambition never overrides verifiability.** Every workflow must include at least one check that does not rely on the model's own judgment.
- **Targets must be requirements.** Aggressive numbers are allowed only when tied to a real constraint and a measurement method.
- **No persona roleplay.** Roles are used for the actions they take, not the voice they adopt.
- **Progressive disclosure.** SKILL.md holds the workflow; the references are read only when needed.

## Installing

Package the folder as `ambitious.skill` (a zip of this directory) and install through the Claude skill settings, or place the folder in a skills directory that Claude reads.

## Scope

Not for simple lookups, one-line edits, or tasks where the user has asked for a direct answer. The skill is opt-in in practice: it triggers on requests for bigger thinking, deeper work, or workflow design.

## Source attribution

The framework is from Felix Rieseberg's essay (felixrieseberg.com, 13 Oct 2026). This skill does not reproduce the essay's text. Source anecdotes are not treated as verified facts.
