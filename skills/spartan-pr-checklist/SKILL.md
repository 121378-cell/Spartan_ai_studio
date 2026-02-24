---
name: "spartan-pr-checklist"
description: "Run a concise pre-merge checklist for Spartan Hub pull requests. Use when validating a PR before review/merge, confirming readiness after changes, or generating a go/no-go summary with required checks."
---

## Scope

Use from repository root `C:\Proyectos\Spartan hub 2.0 - codex`.

Primary purpose:
- provide fast PR readiness verification
- enforce consistent merge gate criteria
- output clear go/no-go decision.

## Checklist flow

1. Confirm branch and sync state.

```powershell
git branch --show-current
git status --short -b
```

2. Confirm PR metadata (if PR exists).

```powershell
cd spartan-hub
gh pr view <number-or-branch> --json title,state,isDraft,labels,assignees,reviewRequests,url
```

3. Run technical gates (prefer existing skills if available):
- `spartan-verify` for lint/type-check/tests/build
- `spartan-bundle-guard` for bundle regression
- `spartan-ci-parity` when strict workflow parity is required

4. Validate change hygiene.
- diff scope matches stated objective
- no unrelated files in final commit set
- no secret/material credential changes
- no temporary debug code left.

5. Confirm rollout safety.
- migration/compatibility risks noted
- known warnings documented
- rollback path stated when changes are high-impact.

## Decision policy

Mark `GO` only if all mandatory gates pass:
- lint/type-check/build pass
- tests pass (or justified skip)
- PR state is `OPEN` and `ready for review`
- no unresolved blocker found.

Otherwise mark `NO-GO` and list blocking items.

## Output format

```text
PR Checklist Result
- pr: <url or N/A>
- branch: <name>
- technical-gates: PASS|FAIL
- metadata-gates: PASS|FAIL
- risk-gates: PASS|FAIL
- decision: GO|NO-GO

Blockers
- <only blockers, if any>

Notes
- <short operational notes>
```

## Rules

- Keep output brief and decision-oriented.
- Never hide failed checks.
- If data is missing (for example no PR number), mark gate `INCOMPLETE` and explain exact next command.
- Do not merge/push unless user explicitly asks.

