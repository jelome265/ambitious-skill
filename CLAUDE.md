# CLAUDE.md

This file governs how Claude works in this repository.

## Source of truth

- `SKILL.md` is the authority for everything the skill says. Read it before changing any file in `references/`, `README.md`, or the installer.
- Every reference file must follow `SKILL.md` and `references/workflow.md`. Do not add content that SKILL.md does not call for.
- The skill instructs on how to do the work. It must not address the AI, assign roles, or describe the AI's behavior.

## Banned terms

These must not appear in `SKILL.md`, or in any file under `references/`:

- AI, model, LLM, agent, Claude, role, persona, assistant

The phrase "threat model" or "threat models" is allowed in `references/` only. Do not use it in `SKILL.md`.

`npm test` enforces these rules. Do not weaken or skip the check.

## Workflow

- Research, investigate, plan, then implement, in that order. Each phase needs its gate met before the next starts.
- Before claiming a change is correct, run `npm test` and report the result.
- Do not claim a push succeeded until `git ls-remote` shows the remote SHA matches local.
- Do not wait for CI results. Push, report the commit SHA, and move on. Check run status only when asked.

## Git and pull requests

- Work on a branch. Never push directly to `main`, and never force push.
- Open a pull request for every change. Never merge a pull request.
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`). release-please reads them to set the version and changelog.
- Never commit tokens, credentials, or secrets. If one is found in the working tree or in chat, do not write it to any file.

## Versioning and release

- Do not edit `package.json` version or `CHANGELOG.md` by hand. release-please owns both.
- Publishing happens only from a published `v*` release.

## Scope

- Make the smallest change that satisfies the request.
- Do not add files, features, or content outside what the request and SKILL.md require.
