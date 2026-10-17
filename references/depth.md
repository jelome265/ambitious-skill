# Depth: the four questions in detail

The essay's depth prompt has four questions. Each section below takes one question and lists what to do with it. The essay's techniques are placed under the question they serve.

## Question 1: what would a top professional do that you are not asking for?

Expert steps the request usually leaves out:

- **Set demanding targets.** An expert aims high and treats the target as achievable. A page that loads in 10 seconds should aim for 200 milliseconds. If the target looks impossible, state that it is solvable and keep working toward it.
- **List the alternative explanations.** For a churn review, an expert does not accept "customers leave because of onboarding." They list the other explanations and test each.
- **Keep going past the first result.** Look for the blind spots that no one has checked yet.

## Question 2: what is the rawest material they would start from?

Start from the raw data: event logs, account records, support tickets, original measurements. Summaries and dashboards are interpretations. Use them to check your work, not as the starting point.

- **Challenge what you know.** Take each belief about the business or system and test it against the raw data. Example belief: churn is an onboarding problem. Reproduce that from the raw data. Record where it fails.
- **Produce new knowledge.** Build a simulation of customers that reproduces the last year from the logs. Find the earliest signal of churn you do not yet monitor. Confirm it predicts on data you did not use to find it.

## Question 3: which specific methods and tools would they use?

Use the instruments the best practitioners use: databases, statistical tests, simulations, reproduction scripts, load tests. The essay's point is about method, not vocabulary. A report written in a professional tone that uses markdown tables has not used a professional method.

- Use the instruments the field uses: for security, a threat model and a reproduction; for statistics, a held-out test. Find out which instruments experts use, then use them.
- Insist on the real method when a shortcut appears.

## Question 4: what, other than you or me, would show the result is right?

- **Use an outside judge.** Do not treat the work as its own check. Use a test suite, a held-out dataset, a tool that gives immediate feedback, or a reviewer who did not produce the work.
- If no outside check exists, build the smallest check that could catch a wrong result, and write down what it cannot catch.
- Confirm predictions on data that was not used to produce them.

## Suggested order

- **Research:** Question 1 (expert steps) and Question 2 (raw sources), each with a source named.
- **Investigate:** test each belief from Question 1 against the raw data from Question 2. Note each failure.
- **Plan:** rewrite the request to ask for the expert steps, raw inputs, methods, and outside check. Name the check that decides the result.
- **Implement:** run the methods from Question 3 and the check from Question 4. Note the result.
