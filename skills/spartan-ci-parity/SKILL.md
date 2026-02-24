---
name: "spartan-ci-parity"
description: "Reproduce Spartan Hub CI checks locally with command parity and deterministic reporting. Use when a user asks to run the same checks as GitHub Actions, investigate CI-only failures, or verify readiness before push/PR."
---

## Scope

Primary CI reference:
- `spartan-hub/.github/workflows/ci.yml`

Secondary PR hardening reference (when requested):
- `spartan-hub/.github/workflows/pr-automated-checks.yml`

Always state which workflow(s) you are mirroring.

## Baseline parity flow (ci.yml)

Run in this order:

1. Frontend deps and tests

```powershell
cd spartan-hub
npm ci
npm run test:components
```

2. Backend deps and tests

```powershell
cd spartan-hub/backend
npm ci
npm test
```

3. Lint + type-check (frontend)

```powershell
cd spartan-hub
npm run lint
npm run type-check
```

4. Build validation

```powershell
cd spartan-hub
npm run build:all
```

5. Build outputs existence

```powershell
cd spartan-hub
if (!(Test-Path dist)) { throw 'dist missing' }
if (!(Test-Path backend/dist)) { throw 'backend/dist missing' }
```

## Environment parity notes

- CI uses Node 18.x.
- If local Node differs, report version mismatch explicitly before results.
- If command fails due sandbox/process restrictions (`spawn EPERM`), rerun with escalation and mark `escalated`.

## Optional PR-hardening flow (pr-automated-checks.yml)

Only run when user asks for full PR parity:
- backend security audit: `cd spartan-hub/backend; npm audit --audit-level high`
- backend lint: `cd spartan-hub/backend; npx eslint . --ext .ts,.tsx --max-warnings 0`
- backend tsc: `cd spartan-hub/backend; npx tsc --noEmit`
- backend unit tests: `cd spartan-hub/backend; npm test`
- static grep validations for rate-limit and zod patterns.

## Output format

```text
CI Parity Summary
- workflow: <ci.yml | ci.yml + pr-automated-checks.yml>
- node: <local version> (match|mismatch)
- frontend-tests: PASS|FAIL
- backend-tests: PASS|FAIL
- lint-typecheck: PASS|FAIL
- build-validation: PASS|FAIL
- artifacts-check: PASS|FAIL
- overall: PASS|FAIL

Failures
- <first actionable error per failed stage>
```

## Rules

- Do not skip failed stages silently.
- Keep command order aligned with selected workflow.
- If a stage is intentionally skipped, mark it `SKIPPED` and explain why.
- Do not commit or push unless user explicitly requests it.

