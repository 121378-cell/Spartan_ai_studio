#!/bin/bash

# Script para generar secretos seguros para Spartan Hub
# Uso: ./generate_secrets.sh [tipo]
# Tipos: api, db, jwt, session, all

set -e

echo "🔐 Generador de Secretos Seguros - Spartan Hub"
echo "============================================="

# Función para generar secreto aleatorio
generate_secret() {
    local length=${1:-32}
    openssl rand -hex $length
}

# Función para generar secreto base64
generate_secret_base64() {
    local length=${1:-24}
    openssl rand -base64 $length
}

case "${1:-all}" in
    "api")
        echo "Generando API key..."
        generate_secret > backend/secrets/api_key.txt
        chmod 600 backend/secrets/api_key.txt
        echo "✅ API key generada en backend/secrets/api_key.txt"
        ;;
    "db")
        echo "Generando contraseña de base de datos..."
        generate_secret_base64 > backend/secrets/db_password.txt
        chmod 600 backend/secrets/db_password.txt
        echo "✅ Contraseña de DB generada en backend/secrets/db_password.txt"
        ;;
    "jwt")
        echo "Generando JWT secret..."
        generate_secret > jwt_secret.txt
        echo "✅ JWT secret generado en jwt_secret.txt"
        ;;
    "session")
        echo "Generando session secret..."
        generate_secret > session_secret.txt
        echo "✅ Session secret generado en session_secret.txt"
        ;;
    "all")
        echo "Generando todos los secretos..."
        
        # API Key
        generate_secret > backend/secrets/api_key.txt
        chmod 600 backend/secrets/api_key.txt
        echo "✅ API key generada"
        
        # Database Password
        generate_secret_base64 > backend/secrets/db_password.txt
        chmod 600 backend/secrets/db_password.txt
        echo "✅ Contraseña de DB generada"
        
        # Ollama API Key (placeholder)
        echo "local_dev_placeholder_$(generate_secret 8)" > backend/secrets/ollama_api_key.txt
        chmod 600 backend/secrets/ollama_api_key.txt
        echo "✅ Ollama API key generada"
        
        # JWT Secret
        generate_secret > jwt_secret.txt
        echo "✅ JWT secret generado"
        
        # Session Secret
        generate_secret > session_secret.txt
        echo "✅ Session secret generado"
        
        echo ""
        echo "🎉 Todos los secretos han sido generados!"
        echo "📁 Ubicación: backend/secrets/"
        echo "🔒 Permisos: 600 (solo propietario)"
        echo ""
        echo "⚠️  IMPORTANTE:"
        echo "   - Revisa y actualiza los valores en .env"
        echo "   - NO commitear estos archivos al repositorio"
        echo "   - Usa valores diferentes para producción"
        ;;
    *)
        echo "❌ Tipo de secreto no válido: $1"
        echo "Tipos disponibles: api, db, jwt, session, all"
        exit 1
        ;;
esac