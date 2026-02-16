# Arquitectura de Pruebas E2E

Esta guía describe la configuración de la base de datos y la arquitectura para las pruebas End-to-End (E2E) en Spartan Hub.

## Visión General

El objetivo de la arquitectura de pruebas E2E es garantizar la persistencia de datos (especialmente sesiones) a lo largo de flujos de prueba complejos, manteniendo al mismo tiempo un entorno aislado y reproducible.

### Componentes Clave

1.  **Base de Datos Dedicada (`test_e2e.db`)**:
    *   Ubicación: `backend/data/test_e2e.db`
    *   Tipo: SQLite (configurada para modo WAL para concurrencia)
    *   Persistencia: El archivo se mantiene durante la ejecución de la suite de pruebas, permitiendo compartir estado entre pasos.

2.  **Gestor de Base de Datos (`E2ETestManager`)**:
    *   Ubicación: `backend/src/__tests__/e2eTestManager.ts`
    *   Responsabilidad: Crear, inicializar, limpiar y sembrar datos.
    *   Métodos principales:
        *   `setupDatabase()`: Crea el esquema si no existe.
        *   `cleanDatabase()`: Trunca las tablas (sin borrar el esquema) para un inicio limpio.
        *   `seedUser()`, `seedSession()`: Inyecta datos iniciales conocidos.

3.  **Scripts de Automatización**:
    *   `npm run test:e2e:setup`: Ejecuta `backend/src/scripts/setupE2eDb.ts` para preparar el entorno.
    *   `npm run test:e2e`: Ejecuta la suite completa configurando las variables de entorno necesarias (`NODE_ENV=test`, `DB_PATH=...`).

4.  **Configuración de Jest (`jest.e2e.config.js`)**:
    *   Configuración específica que evita el borrado automático de la base de datos después de cada test (comportamiento por defecto en tests unitarios).
    *   Utiliza `backend/src/__tests__/setupE2E.ts` para conectar la base de datos sin destruirla al finalizar.

## Flujo de Ejecución

1.  **Setup Global**:
    *   Se ejecuta `npm run test:e2e:setup`.
    *   Se crea/limpia `test_e2e.db`.
    *   Se crean las tablas necesarias.

2.  **Ejecución de Tests**:
    *   Jest inicia con `jest.e2e.config.js`.
    *   `setupE2E.ts` conecta a la DB existente.
    *   Los tests se ejecutan secuencialmente (`maxWorkers: 1`).
    *   Los datos persisten entre bloques `test()` dentro de un archivo, y entre archivos si no se invoca limpieza explícita.

3.  **Teardown**:
    *   Al finalizar, la conexión se cierra, pero el archivo `.db` permanece para inspección post-mortem si es necesario (se limpiará al inicio de la siguiente ejecución).

## Uso

Para ejecutar las pruebas E2E:

```bash
cd backend
npm run test:e2e
```

Para resetear manualmente la base de datos E2E:

```bash
ts-node src/scripts/resetE2eDb.ts
```

## Persistencia de Sesiones

La configuración actual garantiza que si un test crea una sesión (login), los tests subsiguientes pueden utilizar ese token para realizar peticiones autenticadas, simulando el comportamiento real de un usuario navegando por la aplicación.
