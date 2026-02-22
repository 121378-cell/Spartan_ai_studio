# Guía de Infraestructura CI/CD y Docker

Esta guía describe la configuración de Integración Continua (CI), Despliegue Continuo (CD) y Dockerización implementada en Spartan Hub.

## 1. Validación de Código (Pre-commit)

Utilizamos **Husky** y **lint-staged** para asegurar la calidad del código antes de cada commit.

### ¿Qué sucede al hacer commit?
Cuando ejecutas `git commit`, automáticamente se disparan las siguientes acciones en los archivos que has modificado (staged):
*   **ESLint**: Verifica errores de linting y estilo. Intenta corregirlos automáticamente (`--fix`).
*   **Prettier**: Formatea el código para mantener un estilo consistente.

### Configuración
*   `package.json`: Contiene la configuración de `lint-staged`.
*   `.husky/pre-commit`: El hook de git que invoca `lint-staged`.

## 2. Docker y Docker Compose

Hemos unificado la orquestación de contenedores en la raíz del proyecto.

### Archivos
*   `Dockerfile` (raíz): Construye la imagen del Frontend (Vite + Nginx).
*   `backend/Dockerfile`: Construye la imagen del Backend (Node.js).
*   `docker-compose.yml` (raíz): Orquesta ambos servicios.

### Comandos Docker

Levantar todo el entorno (Frontend + Backend):
```bash
docker-compose up --build
```

Esto levantará:
*   **Frontend**: http://localhost:5173 (o puerto configurado)
*   **Backend**: http://localhost:3001

## 3. GitHub Actions (CI)

El archivo `.github/workflows/ci.yml` automatiza las pruebas en cada Push o Pull Request a `main` o `develop`.

### Pasos del Pipeline:
1.  **Frontend Test**: Ejecuta `npm run test:components`.
2.  **Backend Test**: Ejecuta `npm test` en el backend.
3.  **Lint & Type-check**: Verifica reglas de estilo y tipos TypeScript.
4.  **Build Validation**: Asegura que el proyecto compila correctamente (`npm run build:all`).
5.  **E2E Test**: Ejecuta pruebas Cypress (si el entorno lo permite).
