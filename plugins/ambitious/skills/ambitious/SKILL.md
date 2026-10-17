---
name: ambitious
description: How to do work that is deeper, not just bigger. Use this skill whenever a task should go beyond its immediate request, whenever a result is generic, shallow, or limited to the obvious field, whenever a recurring process should run with less manual steering, or whenever someone asks for more ambitious, deeper, or higher-leverage work. Before starting, answer the four depth questions in writing and rewrite the request to match them. Do not use for simple questions or small edits.
---

# Ambitious Work: A Deeper Version, Not a Bigger One

Every ambitious task starts with the same question and the same four questions. Answer them in writing. Then rewrite the request so it asks for exactly what the answers name.

> I want a deeper version of this task, not a bigger one. Before rewriting it:
> 1. Say what a top professional in this field would do here that I'm not asking for.
> 2. Name the rawest material they would start from instead of what has already been digested for me.
> 3. Name the specific methods and tools they would use.
> 4. Say what, other than you or me, would show the result is right.
>
> Then rewrite my prompt to ask for exactly that.

## Question 0: what happens next?

Before the four questions, answer the altitude question: what do I want to happen next? What is the goal beyond the goal? Name the outcome the task serves and the decision or process it feeds. Naming a measurable result helps. If you cannot, name the closest proxy and say that it is a proxy. See `references/altitude.md`.

## Question 1: what would a top professional do that you are not asking for?

List the steps an expert would take that the request leaves out. Keep the ones that change the outcome. Ask the expert's question too: what would they aim for, and what would they refuse to accept? See `references/depth.md` (Question 1) and `references/range.md` (other fields).

## Question 2: what is the rawest material they would start from?

Name the source data, logs, original documents, or measurements. Work from those, not from summaries or dashboards that have already interpreted them. If only a summary is available, write down the raw source you still need. See `references/depth.md` (Question 2).

## Question 3: which specific methods and tools would they use?

Name the instruments of the field: databases, statistical tests, simulations, load tests, threat assessments, reproduction scripts. Use the real method. A table that looks professional is not a method. Find out which instruments experts use if you do not know. See `references/depth.md` (Question 3) and `references/range.md` (tools).

## Question 4: what, other than you or me, would show the result is right?

Name an outside check that does not depend on the work's own judgment: a test suite, a held-out dataset, a tool that gives immediate feedback, or a reviewer who did not produce the work. If no such check exists, build the smallest one that could catch a wrong result, and write down what it cannot catch. See `references/depth.md` (Question 4).

## Working through the phases

For larger or riskier work, research, investigate, plan, and implement is a suggested order. See `references/workflow.md`.

## Rewriting the request

When the five answers are written, rewrite the request so it asks for them. Keep the original goal. Add the expert steps, the raw inputs, the methods, and the outside check. Add nothing the answers do not require.

## Scope and authority

- Keep the user's constraints, non-goals, budget, privacy limits, and authorized actions. They outrank any improvement.
- Propose improvements that fit the request. Do not silently widen the task or change the stated goal.
- Ask before using new access or permissions, spending money, causing external effects (sending, publishing, deleting, paying), making irreversible changes, or changing the goal.

## Speed

Do the same work in less time, held to the same four answers. See `references/speed.md`.


## Background

Why these questions work, and what the essay says about human limits: `references/background.md`.
