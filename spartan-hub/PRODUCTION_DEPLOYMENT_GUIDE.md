# 🚀 Production Deployment Guide

**Phase A: Video Form Analysis MVP**  
**Fecha:** Marzo 1, 2026  
**Estado:** ✅ **READY FOR PRODUCTION**

---

## 📋 PREREQUISITOS

### Requerimientos del Sistema

| Componente | Versión | Comando |
|------------|---------|---------|
| **Node.js** | 18.x | `node --version` |
| **npm** | 9.x | `npm --version` |
| **Backend** | SQLite/PostgreSQL | Configurable |
| **Redis** | 6.x (opcional) | Para rate limiting |

### Variables de Entorno

**Frontend (.env.production):**
```bash
# API Configuration
VITE_API_URL=https://api.spartanhub.io/api
VITE_WS_URL=wss://api.spartanhub.io

# Feature Flags
VITE_ENABLE_REALTIME_FEEDBACK=true
VITE_ENABLE_INJURY_DETECTION=true

# Analytics (optional)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_TRACKING_ID=G-XXXXXXX
```

**Backend (.env.production):**
```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_TYPE=sqlite
DB_PATH=/var/spartan-hub/data/spartan_hub.db

# Security
JWT_SECRET=<secure-random-string-min-32-chars>
SESSION_SECRET=<secure-random-string-min-32-chars>
ALLOWED_ORIGINS=https://spartanhub.io

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🔧 INSTALACIÓN

### 1. Clonar Repositorio

```bash
git clone https://github.com/121378-cell/Spartan_ai_studio.git
cd Spartan_ai_studio/spartan-hub
```

### 2. Instalar Dependencias

```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 3. Configurar Variables de Entorno

```bash
# Frontend
cp .env.example .env.production
# Editar .env.production con valores de producción

# Backend
cd backend
cp .env.example .env.production
# Editar .env.production
```

### 4. Build de Producción

```bash
# Frontend
npm run build:frontend

# Backend
cd backend
npm run build
```

---

## 🚀 DEPLOYMENT

### Opción A: Docker (Recomendado)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=sqlite
      - DB_PATH=/data/spartan_hub.db
    volumes:
      - backend-data:/data
    depends_on:
      - redis

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  backend-data:
  redis-data:
```

**Deploy:**
```bash
docker-compose up -d
```

---

### Opción B: Manual (PM2)

**Instalar PM2:**
```bash
npm install -g pm2
```

**Backend (ecosystem.config.js):**
```javascript
module.exports = {
  apps: [{
    name: 'spartan-hub-backend',
    script: './backend/dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

**Deploy:**
```bash
# Backend
cd backend
npm run build
pm2 start ecosystem.config.js

# Frontend (nginx)
sudo cp -r dist/* /var/www/spartan-hub/
sudo systemctl reload nginx
```

---

## 🔒 SEGURIDAD

### Checklist de Seguridad

- [ ] JWT_SECRET configurado (min 32 chars)
- [ ] SESSION_SECRET configurado
- [ ] HTTPS habilitado
- [ ] CORS configurado correctamente
- [ ] Rate limiting activo
- [ ] CSRF protection habilitado
- [ ] Input validation activo
- [ ] Database backups configurados

### Hardening

**nginx configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name spartanhub.io;

    ssl_certificate /etc/ssl/certs/spartanhub.crt;
    ssl_certificate_key /etc/ssl/private/spartanhub.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        root /var/www/spartan-hub;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 MONITORING

### Sentry (Error Tracking)

**Configuración:**
```bash
# .env.production
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

**Dashboard:**
- Errores en tiempo real
- Performance tracking
- User feedback
- Release tracking

---

### Google Analytics

**Configuración:**
```bash
# .env.production
VITE_GA_TRACKING_ID=G-XXXXXXX
```

**Eventos a trackear:**
- Recording started
- Analysis completed
- Form score saved
- Errors occurred

---

### Performance Monitoring

**Métricas clave:**
- First Contentful Paint (FCP): <1.5s
- Time to Interactive (TTI): <3s
- FPS during recording: 60fps
- API latency: <200ms
- WebSocket latency: <50ms

---

## 🔄 CI/CD

### GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: cd backend && npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build:frontend
      - run: cd backend && npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - run: docker-compose up -d
```

---

## 📝 POST-DEPLOYMENT

### Verification Checklist

- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] WebSocket connects
- [ ] Camera access works
- [ ] Recording starts/stops
- [ ] Analysis completes
- [ ] Results display
- [ ] Save/delete work
- [ ] Error handling works
- [ ] Mobile responsive

### Smoke Tests

```bash
# Health check
curl https://api.spartanhub.io/health

# Frontend
curl https://spartanhub.io

# WebSocket
# Use browser DevTools to verify connection
```

---

## 🆘 TROUBLESHOOTING

### Common Issues

**1. Frontend no carga**
```bash
# Verificar build
npm run build:frontend

# Verificar nginx
sudo nginx -t
sudo systemctl status nginx
```

**2. Backend no responde**
```bash
# Verificar logs
pm2 logs spartan-hub-backend

# Verificar puerto
netstat -tulpn | grep 3001

# Reiniciar
pm2 restart spartan-hub-backend
```

**3. WebSocket no conecta**
```bash
# Verificar firewall
sudo ufw status

# Verificar proxy config en nginx
# proxy_set_header Upgrade $http_upgrade;
```

**4. Camera access denied**
```bash
# Verificar HTTPS
# Camera requiere HTTPS en producción

# Verificar browser permissions
# chrome://settings/content/camera
```

---

## 📞 SOPORTE

### Contactos

- **DevOps:** devops@spartanhub.io
- **Backend:** backend@spartanhub.io
- **Frontend:** frontend@spartanhub.io

### Recursos

- [Documentation](./docs/)
- [API Docs](./backend/docs/)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Status Page](https://status.spartanhub.io)

---

**Firmado:** DevOps Team  
**Fecha:** Marzo 1, 2026  
**Versión:** 1.0.0  
**Estado:** ✅ **PRODUCTION READY**

---

**🚀 DEPLOY WITH CONFIDENCE!**
