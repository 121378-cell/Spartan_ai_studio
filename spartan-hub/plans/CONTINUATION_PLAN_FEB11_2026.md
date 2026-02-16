# Plan de continuación – 11 Feb 2026

**Rama de trabajo:** `hotfix/critical-stability-issues`  
**Contexto:** Limpieza de artefactos E2E ya realizada; pendientes correcciones de seguridad (CSRF, XSS chat, secretos) y robustez de tokens/webhooks.

## Objetivos inmediatos (24-48h)
1) **CSRF correcto y usable**  
   - Ajustar `backend/src/middleware/csrfProtection.ts` para emitir token vía `req.csrfToken()` y cookie HttpOnly.  
   - Excluir rutas webhook/health de CSRF (middleware `unless`).  
   - Actualizar frontend (`src/hooks/useAuth.ts` y fetch utilitario) para enviar `X-CSRF-Token` en POST/PUT/DELETE.

2) **Eliminar fuga de secretos/tokens en logs**  
   - Quitar logs de secret/payload en `backend/src/middleware/auth.ts` y `sqliteDatabaseService.ts`; asegurar logger redaction.

3) **Refactor de refresh tokens**  
   - Persistir y hashear refresh tokens en DB (SQLite/Postgres) con expiración y revocación por sesión.  
   - Añadir migración y tests (`backend/src/models/RefreshToken.ts`, `tokenService.test.ts`).

4) **Endurecer webhook Terra**  
   - Verificación HMAC sobre raw body con comparación en tiempo constante y ventana de timestamp.  
   - Responder 4xx en firma inválida; excluir de CSRF; pruebas en `integration/terraWebhook.e2e.test.ts`.

5) **XSS en chat IA**  
   - Sanitizar respuestas antes de `dangerouslySetInnerHTML` (DOMPurify) o renderizar texto plano.  
   - Añadir test de regresión en `src/__tests__/AiChat.test.tsx`.

6) **CI funcional**  
   - Arreglar workflows para usar rutas reales (`spartan-hub/backend`, `npm run test`, `npm run lint`, `npm run type-check`).  
   - Confirmar que los artefactos de logs queden ignorados.

## Secuencia sugerida
1. CSRF + frontend token header (bloqueante para auth/webhooks).  
2. Logs sensibles y XSS (riesgo alto).  
3. Refresh tokens con persistencia.  
4. Hardening Terra webhook.  
5. Ajustes CI.  
6. Barrido final de tests y verificación manual de login + webhook mock.

## Riesgos y mitigación
- **Ruptura de auth por CSRF:** validar en entorno local con tests `csrf.test.ts` y flujos login/register.  
- **Compatibilidad BD:** migración de refresh tokens debe ser idempotente y con fallback a SQLite/Postgres.  
- **Reprocesado de webhooks:** permitir reintentos seguros con nonce/timestamp.

## Checkpoints
- PR 1: CSRF + header frontend + tests pasan.  
- PR 2: Redacción de logs + XSS fix + refresh tokens persistentes.  
- PR 3: Terra webhook hardening + CI workflows corregidos.

## Notas rápidas
- Mantener `.gitignore` actualizado para artefactos de pruebas.  
- Ejecutar `npm run test` (root) y `cd backend && npm test -- --runInBand` tras cambios de seguridad.
