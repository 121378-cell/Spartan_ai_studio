# Spartan Hub Sandbox 🛠️

Este directorio contiene una configuración de **Docker Sandbox** para Spartan Hub 2.0. Permite ejecutar los componentes principales del backend en un entorno aislado y controlado.

## Componentes Incluidos

- **Backend API**: Node.js/Express (Puerto 3001)
- **PostgreSQL**: Base de datos principal (Puerto 5432)
- **Redis**: Sistema de cache y rate limiting (Puerto 6379)
- **AI Microservice**: Servicio de inferencia IA (Puerto 9000)
- **Ollama**: Motor de modelos LLM (Puerto 11434)

## Cómo empezar

1. Asegúrate de tener **Docker Desktop** instalado y funcionando.
2. Desde la raíz del proyecto, ejecuta:
   ```powershell
   ./start-sandbox.ps1
   ```
3. Para ver los logs:
   ```bash
   cd sandbox
   docker-compose logs -f
   ```
4. Para detener todo:
   ```powershell
   ./stop-sandbox.ps1
   ```

## Notas Técnicas

- El backend está configurado para usar **PostgreSQL** en este sandbox.
- Los secretos de desarrollo se encuentran en `sandbox/secrets/`.
- Los datos de la base de datos y de Ollama persisten en volúmenes de Docker.
- El frontend no está incluido en este docker-compose para facilitar el desarrollo rápido desde el host (`npm run dev` en `spartan-hub/`).

## Desarrollo con el Sandbox

Si quieres ejecutar el frontend localmente mientras usas el backend del sandbox:
1. Asegúrate de que el sandbox esté corriendo.
2. En `spartan-hub/.env`, configura `VITE_API_URL=http://localhost:3001`.
3. Ejecuta `npm run dev` en la carpeta `spartan-hub/`.
