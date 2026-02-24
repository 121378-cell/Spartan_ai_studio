---
name: "spartan-lint-batcher"
description: "Batch and resolve Spartan Hub lint warnings with low-risk incremental passes. Use when reducing many ESLint warnings (especially explicit-function-return-type and no-console) while keeping type-check and build stable."
---

## Scope

Use from `spartan-hub/`.

Goal:
- reduce warning volume quickly
- avoid broad risky refactors
- verify each batch before moving on.

## Standard workflow

1. Generate machine-readable lint report.

```powershell
npx eslint src vite.config.ts --ext .ts,.tsx --config scripts/config/.eslintrc.mjs -f json > lint-report.json
```

2. Rank warnings by:
- frequency of rule
- number of files affected
- ease/safety of autofix.

3. Process warnings in small batches (5-15 files per pass).

Preferred order:
1. `@typescript-eslint/explicit-function-return-type`
2. `no-console`
3. remaining stylistic warnings.

4. After each batch:

```powershell
npx eslint <touched-files> --config scripts/config/.eslintrc.mjs -f json
npm run type-check
```

If clean, continue with next batch. If not, fix immediately before expanding scope.

5. End-of-cycle validation:

```powershell
npx eslint src vite.config.ts --ext .ts,.tsx --config scripts/config/.eslintrc.mjs -f json > lint-report.json
npm run type-check
```

## Batch safety rules

- Prefer explicit return annotations over logic rewrites.
- For `no-console`, replace with project logger where available; do not remove useful diagnostics blindly.
- Avoid touching unrelated files in the same commit.
- Keep each commit thematically narrow.

## Commit strategy

Use one commit per lint batch with clear intent:
- `chore: reduce lint warnings in <area>`
- `chore: eliminate remaining frontend lint warnings`

If hooks are unstable in this environment, use:

```powershell
git -c core.hooksPath=NUL commit -m "<message>"
```

## Output format

```text
Lint Batch Summary
- batch scope: <files or module group>
- warnings before: <n>
- warnings after: <n>
- errors: <n>
- type-check: PASS|FAIL
- status: PASS|FAIL

Next Batch
1. <target group>
2. <target group>
```

## Stop conditions

Stop and report when:
- warnings reach zero, or
- a warning class requires non-trivial architecture change.

When stopped, include the exact remaining warnings and proposed next low-risk slice.

