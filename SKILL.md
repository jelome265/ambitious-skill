---
name: ambitious
description: A tutorial for being more ambitious with models across four types - Speed, Altitude, Depth, and Range. Use this skill whenever the user wants to get more out of an AI model, says they are not being ambitious enough, wants bigger or deeper results instead of fill-in-the-template output, asks for help with a recurring business or engineering process, wants a model to work at the level of an outcome rather than a single task, or asks how to use models with more expert methods or cross-disciplinary perspective. Also use when a model's output feels generic, shallow, or limited to the obvious field. Do not use for simple one-step questions or small edits.
---

# Being More Ambitious

Models are astounding in some directions and inadequate in others. Many people never get past simple tasks, so this skill walks through ways to be more ambitious. There are four types of ambition: Speed, Altitude, Depth, and Range.

- **Speed**: the same work in less time. This is the bread and butter of AI's value, and it needs little creativity in how you approach the model, so this skill does not cover it further.
- **Altitude**: going up in abstraction, and considering the outcome rather than the individual task.
- **Depth**: considering a task the way a field-leading expert would. Instead of working at the task's layer, go one level deeper and touch the underlying data, tools, and problems.
- **Range**: drawing on multiple fields rather than only the one the task appears to need, using knowledge, tools, and techniques you would not normally reach for.

The method is not specific to one model.

## Altitude: find the goal beyond the goal

When you give a model a task, it executes your best guess at how to reach the outcome you want. To be more ambitious in altitude, ask: what do you want to happen next? What is the goal beyond the goal?

Work through a task in steps, getting more ambitious at each step. Read `references/altitude.md` for the full worked example.

- Give the model as much data as you can, so it understands your business, rather than letting it only update the numbers in a template. Ask what changed, why, and what to do about it.
- If the meeting should end with decisions, ask the model to work out the most urgent decisions and begin working on directions for and against each.
- If the artifact exists to achieve a purpose, ask the model to design a better way to achieve that purpose, show from your own history that it would have caught problems sooner, and run it alongside the current approach for a period.

Altitude works best when you are after a concrete ultimate outcome, and less well for creative work. A good sign that altitude applies is that you would normally hold meetings about the work. Models can operate at higher levels of abstraction as they become more capable, though some goals are still out of reach: "make money" by itself does not work for most businesses yet.

Altitude also produces durable workflows that take the human out of the loop. Doing this often means changing the workflow itself. For example, to keep an app crash-free, the model first needs to fetch crash reports, map app versions to commits, and have access to the platforms it must test on, so it can reproduce and verify fixes on its own.

## Depth: use what the best professionals use

Sometimes you want a task executed really well. Being ambitious in depth means pushing the model to use the tools, techniques, media, and knowledge of the best professionals in the field, and continuing to push until those professionals might learn something from your work. Read `references/depth.md` for the full techniques and prompt.

- **Use the same instruments as the best in the industry.** Prompting a model to act like a professional often changes vocabulary without changing method. Insist on the methods real experts use, such as databases and statistical models rather than markdown tables. You do not need to know which instruments they are; the model usually does.
- **Pick unreasonable goals, and state that they are reasonable.** If a page should load in 5 seconds instead of 10, ask for 200 milliseconds. If the model thinks something is impossible, state that it is solvable and to keep going.
- **Challenge what you know.** Many business beliefs are rough approximations. Give the model the raw data and ask it to check your assumptions adversarially.
- **Produce new knowledge.** Once the model is inside the data, ask it to find blind spots. Have it predict on data it has not seen.
- **Use an outside judge.** Do not ask the model to judge itself. Insist on outside validation, ideally a tool the model can run to get feedback immediately.

When you are unsure how to start, use the deeper-version prompt in `references/depth.md`. It asks for a deeper version of the task rather than a bigger one.

## Range: bring in other fields

Being ambitious in range means considering your work from the perspective of more fields than would have been economical before. Models make multi-agent systems easy to run, with multiple threads, orchestrators, or subagents, and bringing in additional fields can produce unexpectedly good results. This takes creativity. Read `references/range.md` for the full techniques.

- **Replace nouns with verbs.** A quarterly review is not "a deck". It is getting busy people to believe a story about cause and effect, and to decide under uncertainty, in thirty minutes. Verbs make it easier to see which fields offer a useful perspective.
- **Assemble the crew.** Ask who a strong team for this deliverable would include, such as an analyst, a journalist, an editor, a motion or audio designer, and an adversarial red team like a short seller or a forensic accountant.
- **Avoid role-play.** Role-play makes the transcript stranger without improving the result. Use the crew to find fields and techniques. Ask the model to do what the short seller does to research a position, not to write like one.

Range depends on tooling. The model needs a computer on which it can install software, and access to relevant data, through MCP connectors or other means.

## Background

Humans have always been held back by what they believe possible, and tend to trust themselves only within narrow disciplines. Psychology calls this self-efficacy, and research suggests it can be raised. Read `references/background.md` for the examples behind this.
