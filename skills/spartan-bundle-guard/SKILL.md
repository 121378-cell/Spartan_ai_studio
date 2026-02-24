---
name: "spartan-bundle-guard"
description: "Guard frontend bundle size for Spartan Hub. Use when checking build output size, enforcing chunk thresholds, comparing against baseline, or preventing bundle regressions before merge/release."
---

## Scope

Use from `spartan-hub/`.

Primary objective:
- detect bundle regressions early
- keep entry and vendor chunks under explicit limits
- return a compact pass/fail report.

## Standard flow

1. Build frontend.

```powershell
npm run build:frontend
```

If build fails with process restrictions (`spawn EPERM`), rerun outside sandbox restrictions.

2. Parse emitted chunk sizes from build output or `dist/assets`.

Track at minimum:
- `index-*.js` (entry chunk)
- `vendor-react-*.js`
- `vendor-ml-*.js` (if present)
- top 5 largest js chunks.

3. Apply default limits (can be overridden by user).

Default thresholds:
- entry chunk (`index-*.js`) <= 400 kB
- `vendor-react` <= 450 kB
- `vendor-ml` <= 800 kB
- any non-vendor lazy chunk <= 150 kB

4. Compare to baseline when available.

Baseline file (optional):
- `spartan-hub/.bundle-baseline.json`

If missing, create it only when user explicitly asks to establish a baseline.

5. Return strict result.

- `PASS`: all limits satisfied and no regression above baseline tolerance.
- `FAIL`: any limit exceeded or regression beyond tolerance.

## Baseline comparison policy

When baseline exists:
- flag regression if any tracked chunk grows >10% and >20 kB absolute.
- report both absolute and percentage delta.

## Output format

```text
Bundle Guard Summary
- build: PASS|FAIL (normal|escalated)
- thresholds: PASS|FAIL
- baseline: PASS|FAIL|SKIPPED
- overall: PASS|FAIL

Largest Chunks
- <chunk-name>: <size-kB> (delta vs baseline if available)

Actions
1. <only if needed>
2. <only if needed>
```

## Common remediation guidance

Use only when `overall: FAIL`:
- lazy-load page or modal modules from `App.tsx`
- move heavy libraries to dedicated `manualChunks` in `vite.config.ts`
- remove dead imports and large unused dependencies
- split ML or visualization paths from first-load routes.

