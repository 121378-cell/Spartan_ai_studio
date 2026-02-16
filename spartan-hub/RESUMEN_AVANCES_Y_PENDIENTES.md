# Resumen de avances y pendientes (feb 2026)

## Rama
`hotfix/critical-stability-issues`

## Avances completados
- CSRF end-to-end: cookie HttpOnly/SameSite, endpoint `/api/csrf-token`, frontend envía `X-CSRF-Token` en login/logout. (commit 6ded260)
- Refresh tokens: ahora se almacenan hasheados y con test dedicado (`tokenService.test.ts`). (commit 5371f80)
- Terra webhook: validación sobre raw body, HMAC SHA-256 en tiempo constante, timestamp ±5 min, 401 en firma inválida. (commit f3978b6)
- Mensajes de auth normalizados (“Session expired”, “Access denied”) y tests ajustados. (commits 143bb5e, 28a4824)
- Validación: `validate` corta la cadena tras error 400; coerce de paginación en fitness/plan; coerce numérico en campos de `userSchema`; timeouts relajados en `load.test.ts`; `jest.unmock('uuid')` ya presente.
- CI: `ci.yml` actualizado a la estructura real (`spartan-hub/`, `backend/`), jobs para frontend (test:components), backend (npm test), lint/type-check y build:all. (commit ae8794e)
- Refresh tokens hasheados + test, CSRF, Terra hardening y ajustes varios de seguridad ya integrados.

## Pendientes
1) Suites largas de auth/e2e no ejecutadas aquí por límites de tiempo/heap. Ejecutar en runner con más recursos:
   ```
   cd spartan-hub/backend
   set SKIP_HEAVY_TESTS=true
   node --max-old-space-size=4096 node_modules\jest\bin\jest.js --runInBand src\__tests__\auth.test.ts --testTimeout=300000
   ```
   Filtrar con `--testNamePattern` si es necesario.
2) Revisar otros workflows (`comprehensive-cicd.yml`, etc.) para alinear rutas/comandos como en `ci.yml`.
3) Verificar que no falten `z.coerce.number()` en otros schemas y que emails inválidos se rechacen según expectativas en tests (re-ejecutar suites cuando haya runner amplio).

## Commits relevantes
- 6ded260 (CSRF + frontend header)
- 5371f80 (refresh tokens hash + test)
- f3978b6 (Terra webhook hardening)
- 143bb5e / 28a4824 (mensajes auth y tests)
- 6218881 (load tests timeouts + pagination schema base)
- 5d66865 (stop middleware chain on validation error)
- ffdfec1 (pagination coerce fitness/plan)
- 8630ac4 (coerce numérico en user schema)
- ae8794e (CI workflow paths/scripts)
