# Depth: techniques and prompt

Sometimes you want a task executed really well. Being ambitious in depth means pushing the model to use the tools, techniques, media, and knowledge employed by the best professionals in the field, and continuing to push until those professionals might learn something new from your work.

Worked example: the Acme Inc QBR deck, where the company has some user churn (customers lost over time).

## Techniques

**Insist on the same instruments used by the best in the industry.** When prompted to act like a professional, models often switch vocabulary without switching methods. To work with depth, use the same tools as the best data scientists and statisticians. When the model reaches for markdown tables, insist on databases and statistical models. You do not need to know what the experts use; the model usually does.

**Pick unreasonable goals and say they are very reasonable.** If a website should load in 5 seconds instead of 10, ask for 200 milliseconds. If the model thinks something is impossible, say it is solvable and it just needs to keep going.

**Challenge what you know.** In business, many beliefs are rough approximations of reality. Give the model the raw information and data, and ask it to adversarially check assumptions.

> We believe churn is an onboarding problem. Try to reproduce that from the raw data.

**Produce new knowledge.** Once the model is deep inside the data, ask it to find blind spots.

> Build a simulation of our customers that reproduces the last year from our logs. Then find the earliest signal of churn we don't know about yet, and show it predicts on data it has not seen.

**Use an outside judge.** Do not ask the model to judge itself. The essay expects this to be solved eventually with more capable models, but as of October 2026 it insists on outside validation, ideally a tool the model can run to get feedback immediately.

## The deeper-version prompt

Use this when you are unsure how to begin. It asks for a deeper version of the task rather than a bigger one. Paraphrased from the essay:

> I want a deeper version of this task, not a bigger one. Before rewriting it: (1) say what a top professional in this field would do here that I'm not asking for; (2) name the rawest material they would start from instead of what has already been digested for me; (3) name the specific methods and tools they would use; (4) say what, other than you or me, would show the result is right. Then rewrite my prompt to ask for exactly that.
