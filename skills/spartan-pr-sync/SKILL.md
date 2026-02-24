---
name: "spartan-pr-sync"
description: "Synchronize Spartan Hub pull requests with a repeatable flow: verify git state, commit intended changes, push branch, create or update a GitHub PR, and manage PR state and metadata. Use when the user asks to push, open/update a PR, mark ready, or set labels/assignees/reviewers."
---

## Prerequisites

- Work inside `spartan-hub/` unless the user explicitly asks otherwise.
- Check `gh --version`.
- Check `gh auth status`.
- If auth is invalid, stop and ask the user to run `gh auth login -h github.com`.

## Workflow

1. Inspect repository state.

```powershell
git branch --show-current
git status --short
git log --oneline -n 10
```

2. Commit only when requested.

- Stage only intended files.
- Commit with local hook bypass if this repository needs it:

```powershell
git -c core.hooksPath=NUL commit -m "<message>"
```

3. Push current branch.

```powershell
git push -u origin <current-branch>
```

4. Create or update PR.

- Detect if PR already exists for current branch.
- If PR exists, update title/body as needed.
- If PR does not exist, create draft PR to `master` unless user specifies another base.

```powershell
gh pr create --draft --base master --head <current-branch> --title "<title>" --body-file "<path>"
```

5. Sync PR metadata.

- Add `codex` label unless user asks otherwise.
- Assign `@me` unless user asks otherwise.
- Request reviewers only if there are other collaborators.
- If only one collaborator exists, skip reviewer assignment and state why.

6. Change PR state when requested.

```powershell
gh pr ready <number>
```

## Failure handling

- If command fails due sandbox/network restrictions, rerun with escalation.
- If GitHub API returns auth error, stop and request re-login.
- Never hide failures. Report the first actionable error line.

## Response format

Use a compact summary:

```text
PR Sync Summary
- branch: <name>
- commits: <hashes or count>
- push: PASS|FAIL
- pr: created|updated|unchanged|failed
- state: draft|ready
- labels: <list>
- assignees: <list>
- reviewers: <list or skipped reason>
```
