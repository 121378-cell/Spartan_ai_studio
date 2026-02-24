---
name: "spartan-verify"
description: "Run deterministic project verification for Spartan Hub: lint, type-check, tests, and build with EPERM-safe fallbacks and a compact report."
---

## When to use

Use this skill when the user asks for:
- "verifica todo"
- "pásale checks antes de commit/push"
- "estado de salud técnico"
- release-readiness or pre-PR validation.

## Scope

This skill is optimized for the Spartan Hub workspace layout:
- Frontend root: `spartan-hub/`
- Backend root: `spartan-hub/backend/`

## Verification contract

Always run checks in this order:
1. `lint`
2. `type-check`
3. `tests`
4. `build`

Stop only on hard blockers, but always provide a final summary with:
- command
- status (`PASS`/`FAIL`)
- key failure reason
- whether fallback path was used.

## Baseline commands

Run from `spartan-hub/`:

```powershell
npm run lint
npm run type-check
npm run test:all
npm run build:all
```

## EPERM fallback policy (required)

If `test:all` fails with worker/process spawn errors (for example `spawn EPERM`), rerun tests in serial:

```powershell
npm run test:node -- --runInBand
npm run test:components -- --runInBand
```

If `build:all` fails due process spawn restrictions in sandbox (for example Vite/esbuild `spawn EPERM`), rerun the same build command outside sandbox restrictions (with escalation).

## Output format

Return this exact compact structure:

```text
Verification Summary
- lint: PASS|FAIL
- type-check: PASS|FAIL
- tests: PASS|FAIL (normal|fallback-runInBand)
- build: PASS|FAIL (normal|escalated)
- overall: PASS|FAIL

Notes
- <only critical findings or warnings>
```

## Failure handling rules

- Do not hide failing commands.
- Include the first actionable error line.
- If fallback succeeds, mark original failure cause and fallback success.
- If any stage fails, set `overall: FAIL`.

## Optional fast mode

If user explicitly asks for a fast check, run only:

```powershell
npm run lint
npm run type-check
```

and clearly label output as `partial verification`.

## Git hygiene

- Never reset/revert unrelated local changes.
- Do not commit automatically unless user asks.
- If user asks to commit after verification, only include intended files.

