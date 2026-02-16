# Spartan Hub - Modo Local

## Requisitos

- Node.js v18 o superior
- Python 3.10 o superior
- PowerShell 7.0 o superior
- Git (opcional)

## Configuración Inicial

1. Clona o descarga este repositorio
2. Abre una terminal PowerShell en la carpeta del proyecto

### Modo Desarrollo (Local)

Para desarrollar localmente sin Docker:

```powershell
.\dev.ps1
```

Este script:
- Instala Ollama si no está presente
- Descarga los modelos de IA necesarios
- Inicia el frontend en modo desarrollo
- Inicia el backend en modo desarrollo
- Inicia Ollama localmente

Accede a:
- Frontend: http://localhost:3002
- Backend: http://localhost:3001
- Ollama: http://localhost:11434

### Modo Producción (Docker)

Para ejecutar con Docker:

```powershell
.\setup.ps1  # Solo la primera vez
.\start.ps1
```

## Estructura del Proyecto

```
spartan-hub/
├── AI/                 # Componentes de IA y modelos
├── backend/           # API y lógica de negocio
├── components/        # Componentes React
├── services/         # Servicios compartidos
├── data/             # Datos y recursos
└── nginx/            # Configuración de proxy
```

## Desarrollo

- `npm run dev`: Inicia el entorno de desarrollo
- `npm test`: Ejecuta las pruebas
- `npm run build`: Construye la aplicación

## Troubleshooting

### Problemas comunes

1. **Ollama no inicia**
   ```powershell
   ollama serve
   ```

2. **Errores de puerto**
   - Frontend: Cambia el puerto en `vite.config.ts`
   - Backend: Cambia el puerto en `backend/.env`

3. **Modelos de IA**
   ```powershell
   ollama pull mistral
   ```

## Notas

- La aplicación está configurada para funcionar completamente offline
- Los modelos de IA se ejecutan localmente a través de Ollama
- No se requieren claves API externas