# ⚠️ CHECKLIST URGENTE - Acción Inmediata

**Fecha:** Diciembre 2024  
**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 4-8 horas

---

## 🚨 PROBLEMAS CRÍTICOS - ACTUAR HOY

### ☐ 1. ROTAR SECRETOS (2 horas)

**Problema:** Secretos débiles y expuestos en el repositorio

#### Pasos:

```bash
# 1. Generar nuevos secretos
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('POSTGRES_PASSWORD=' + require('crypto').randomBytes(24).toString('base64'))"

# 2. Actualizar backend/.env con los nuevos secretos
# IMPORTANTE: NO COMMITEAR este archivo

# 3. Eliminar backend/.env del repositorio
git rm --cached backend/.env
git commit -m "security: Remove .env from repository"

# 4. Asegurar que esté en .gitignore
echo "backend/.env" >> .gitignore
```

**Verificación:**
- [ ] Nuevos secretos generados (≥32 caracteres)
- [ ] backend/.env actualizado localmente
- [ ] backend/.env eliminado del repo
- [ ] .gitignore actualizado

---

### ☐ 2. ACTUALIZAR DEPENDENCIAS VULNERABLES (30 minutos)

**Problema:** Vulnerabilidades en jws (<3.2.3) y pkg

#### Pasos:

```bash
# En el directorio raíz
cd /home/engine/project
npm audit
npm audit fix

# Verificar
npm audit
```

**Verificación:**
- [ ] `npm audit fix` ejecutado
- [ ] Vulnerabilidades reducidas
- [ ] Tests pasando después de actualización

---

### ☐ 3. CREAR ARCHIVOS DE SECRETOS (30 minutos)

**Problema:** Docker Compose falla por archivos secretos faltantes

#### Pasos:

```bash
# Crear directorio
mkdir -p backend/secrets

# Crear archivos de ejemplo
cat > backend/secrets/api_key.txt.example << 'EOF'
your_api_key_here
EOF

cat > backend/secrets/db_password.txt.example << 'EOF'
your_database_password_here
EOF

cat > backend/secrets/ollama_api_key.txt.example << 'EOF'
your_ollama_api_key_here
EOF

# Actualizar .gitignore
cat >> .gitignore << 'EOF'

# Backend secrets
backend/secrets/*.txt
!backend/secrets/*.txt.example
EOF

# Crear archivos reales (NO COMMITEAR)
cp backend/secrets/api_key.txt.example backend/secrets/api_key.txt
cp backend/secrets/db_password.txt.example backend/secrets/db_password.txt
cp backend/secrets/ollama_api_key.txt.example backend/secrets/ollama_api_key.txt

# Editar con valores reales
# nano backend/secrets/api_key.txt
# nano backend/secrets/db_password.txt
# nano backend/secrets/ollama_api_key.txt
```

**Verificación:**
- [ ] Directorio `backend/secrets/` creado
- [ ] Archivos `.example` creados
- [ ] Archivos reales creados (no versionados)
- [ ] .gitignore actualizado

---

### ☐ 4. REEMPLAZAR CONSOLE.LOG EN database.ts (1 hora)

**Problema:** Console.log en producción, sin trazabilidad

#### Pasos:

1. Abrir `backend/src/config/database.ts`

2. Agregar import del logger:
```typescript
import { logger } from '../utils/logger';
```

3. Reemplazar todos los console.log/error/warn:

```typescript
// ANTES → DESPUÉS

console.log('💾 Using SQLite database')
→ logger.info('Using SQLite database', { context: 'database', type: 'sqlite' })

console.log('✅ Database directory is writable: ${dbDir}')
→ logger.info('Database directory is writable', { context: 'database', path: dbDir })

console.warn('⚠️ Database directory is not writable')
→ logger.warn('Database directory is not writable', { context: 'database', path: dbDir })

console.error('❌ Failed to load better-sqlite3:', error)
→ logger.error('Failed to load better-sqlite3', { context: 'database', error })

// ... etc (ver PLAN_REMEDIACION.md para lista completa)
```

**Verificación:**
- [ ] Logger importado
- [ ] Todos los console.* reemplazados
- [ ] Código compila sin errores
- [ ] Logs funcionando correctamente

---

### ☐ 5. ACTUALIZAR DOCKER-COMPOSE.YML (1 hora)

**Problema:** Contraseñas hardcodeadas en docker-compose

#### Pasos:

1. Crear archivo `.env.docker` (no existe aún):

```bash
cat > .env.docker << 'EOF'
# PostgreSQL
POSTGRES_PASSWORD=<GENERATED_PASSWORD>
POSTGRES_REPLICATION_PASSWORD=<GENERATED_REPLICATION_PASSWORD>

# JWT
JWT_SECRET=<GENERATED_JWT_SECRET>
SESSION_SECRET=<GENERATED_SESSION_SECRET>

# AI Service
AI_SERVICE_URL=http://ai_microservice:8000
OLLAMA_HOST=http://ollama:11434
EOF
```

2. Actualizar `docker-compose.yml`:

```yaml
# Reemplazar líneas hardcodeadas:
services:
  postgres-primary:
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD}
  
  synergycoach_backend_1:
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
```

**Verificación:**
- [ ] `.env.docker` creado con secretos fuertes
- [ ] `docker-compose.yml` actualizado
- [ ] `.env.docker` en .gitignore
- [ ] Docker Compose funciona: `docker-compose config`

---

## ✅ VERIFICACIÓN FINAL

Después de completar los 5 pasos:

```bash
# 1. Verificar que no hay secretos en el repo
git status

# 2. Verificar que .env está ignorado
git check-ignore backend/.env
# Debería retornar: backend/.env

# 3. Verificar dependencias
npm audit

# 4. Verificar que el backend compila
cd backend
npm run build

# 5. Verificar tests
npm test

# 6. Verificar docker-compose (opcional)
docker-compose config
```

### Checklist Final:

- [ ] ✅ Backend/.env eliminado del repo
- [ ] ✅ Nuevos secretos generados y seguros
- [ ] ✅ Dependencias actualizadas
- [ ] ✅ Archivos secretos creados
- [ ] ✅ Console.log reemplazados
- [ ] ✅ Docker-compose actualizado
- [ ] ✅ .gitignore actualizado
- [ ] ✅ Código compila sin errores
- [ ] ✅ Tests pasan

---

## 📝 COMMIT RECOMENDADO

```bash
git add .
git commit -m "security: Fix critical security issues

- Remove backend/.env from repository
- Update vulnerable dependencies (jws, pkg)
- Create secrets example files
- Replace console.log with structured logger in database.ts
- Update docker-compose.yml to use environment variables
- Update .gitignore to exclude sensitive files

Fixes critical security vulnerabilities identified in audit.
See AUDITORIA_PROFUNDA.md for details."
```

---

## 🔄 PRÓXIMOS PASOS (Esta Semana)

Una vez completado este checklist urgente, continuar con:

### Esta Semana (Alta Prioridad):

1. **Implementar validación Zod** (1 día)
   - Ver PLAN_REMEDIACION.md → Sección #3

2. **TypeScript strict mode** (1 día)
   - Ver PLAN_REMEDIACION.md → Sección #6

3. **Eliminar tipos 'any'** (2 días)
   - Ver PLAN_REMEDIACION.md → Sección #7

4. **Configurar límites de payload** (2 horas)
   - Ver PLAN_REMEDIACION.md → Sección #8

5. **Proteger endpoint /metrics** (30 minutos)
   - Ver PLAN_REMEDIACION.md → Sección #11

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- **Vista general:** [README_AUDITORIA.md](README_AUDITORIA.md)
- **Navegación:** [INDICE_AUDITORIA.md](INDICE_AUDITORIA.md)
- **Resumen ejecutivo:** [RESUMEN_AUDITORIA.md](RESUMEN_AUDITORIA.md)
- **Análisis completo:** [AUDITORIA_PROFUNDA.md](AUDITORIA_PROFUNDA.md)
- **Código para fixes:** [PLAN_REMEDIACION.md](PLAN_REMEDIACION.md)
- **Arquitectura:** [ANALISIS_ARQUITECTURA.md](ANALISIS_ARQUITECTURA.md)

---

## ⏰ TIEMPO TOTAL ESTIMADO

```
☐ Rotar secretos:                2 horas
☐ Actualizar dependencias:       30 minutos
☐ Crear archivos secretos:       30 minutos
☐ Reemplazar console.log:        1 hora
☐ Actualizar docker-compose:     1 hora
──────────────────────────────────────────
   TOTAL:                        5 horas
```

---

## 🚨 IMPORTANTE

**NO DESPLEGAR A PRODUCCIÓN** hasta completar al menos este checklist urgente.

**Riesgo si no se hace:**
- Compromiso de datos de usuarios
- Acceso no autorizado a la base de datos
- Bypass de autenticación
- Pérdida de trazabilidad en producción

---

## 📞 AYUDA

Si tienes dudas durante la implementación:

1. **Código específico:** Ver [PLAN_REMEDIACION.md](PLAN_REMEDIACION.md)
2. **Contexto del problema:** Ver [AUDITORIA_PROFUNDA.md](AUDITORIA_PROFUNDA.md)
3. **Navegación:** Ver [INDICE_AUDITORIA.md](INDICE_AUDITORIA.md)

---

**¡COMIENZA AHORA!** ⏰

La seguridad de tus usuarios depende de ello.

---

**Última actualización:** Diciembre 2024  
**Prioridad:** 🔴 CRÍTICA  
**Deadline recomendado:** 24-48 horas
