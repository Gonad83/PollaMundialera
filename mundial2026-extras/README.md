# ⚽ Mundial 2026 — Extras de integración

---

## 📧 Email — Recordatorios automáticos

### Instalación

```bash
cd mundial2026-backend
npm install nodemailer node-cron
```

### Configuración

1. **Copiar** `emailService.js` → `src/services/emailService.js`
2. **Agregar** a `.env`:

```env
# Opción recomendada: Resend (3000 emails/mes gratis)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@tupolla.com
```

3. **Integrar** en `src/index.js`:

```js
const { startEmailCrons } = require('./services/emailService')
// dentro del httpServer.listen callback:
startEmailCrons()
```

4. **Email de bienvenida** en `authController.js` después de crear el usuario:

```js
const { sendWelcomeEmail } = require('../services/emailService')
await sendWelcomeEmail(user).catch(console.error)
```

### Qué envía

| Cuándo | Email |
|---|---|
| Registro | Bienvenida con links a pronósticos |
| 24h antes del partido | Recordatorio si no apostaste |
| 1h antes del partido | Recordatorio urgente |
| 23:00 cada día | Resumen de puntos ganados |

---

## 🤖 Football API — Resultados automáticos

### Opciones de API

| API | Plan gratuito | Link |
|---|---|---|
| **api-football.com** (recomendada) | 100 req/día | [dashboard.api-football.com](https://dashboard.api-football.com/register) |
| football-data.org | 10 req/min | [football-data.org](https://www.football-data.org/client/register) |

### Instalación

```bash
cd mundial2026-backend
# (axios ya está instalado)
```

### Configuración

1. **Copiar** `footballApiService.js` → `src/services/footballApiService.js`
2. **Agregar** a `.env`:

```env
FOOTBALL_API_KEY=tu_api_key_aqui
WC_2026_LEAGUE_ID=1   # Se actualizará cuando esté disponible el Mundial 2026
```

3. **Integrar** en `src/index.js`:

```js
const { startFootballApiCrons } = require('./services/footballApiService')
// dentro del httpServer.listen callback:
startFootballApiCrons(io)  // pasa io para notificaciones en tiempo real
```

4. **Importar el fixture** (una sola vez, antes del torneo):

```bash
# Endpoint de admin para importar todos los partidos
POST /api/admin/football/import-fixture
```

O ejecutar directamente:

```js
const { importFullFixture } = require('./src/services/footballApiService')
importFullFixture()
```

### Qué hace automáticamente

- Cada **5 minutos**: detecta partidos en VIVO y FINALIZADOS
- Al finalizar: **calcula puntos** para todos los participantes automáticamente
- Emite eventos **Socket.io** para actualizar el ranking en tiempo real
- Cada **06:00 AM**: sincroniza el fixture por si hay cambios de horario

---

## 🐳 Docker — Un comando para todo

### Setup

```bash
# 1. Estructura de carpetas (el docker-compose.yml va en la raíz)
mkdir mundial2026
cd mundial2026
# Copiar las carpetas mundial2026-backend/ y mundial2026-frontend/ aquí

# 2. Copiar los Dockerfiles donde corresponde
cp backend.Dockerfile ./mundial2026-backend/Dockerfile
cp frontend.Dockerfile ./mundial2026-frontend/Dockerfile
cp nginx.conf ./mundial2026-frontend/nginx.conf
cp docker-entrypoint.sh ./mundial2026-backend/docker-entrypoint.sh
chmod +x ./mundial2026-backend/docker-entrypoint.sh

# 3. Configurar variables de entorno
cp .env.docker .env
# Editar .env con tus valores
nano .env

# 4. ¡Levantar todo!
docker compose up -d
```

### Comandos útiles

```bash
# Levantar todo en background
docker compose up -d

# Levantar con Adminer (DB visual en :8080)
docker compose --profile dev up -d

# Ver logs en tiempo real
docker compose logs -f backend

# Reiniciar solo el backend
docker compose restart backend

# Parar todo
docker compose down

# Parar y borrar base de datos (CUIDADO)
docker compose down -v

# Ejecutar seed manualmente
docker compose exec backend node prisma/seed.js

# Ver el estado de los contenedores
docker compose ps
```

### Estructura de carpetas para Docker

```
mundial2026/                    ← Raíz del proyecto
├── docker-compose.yml
├── .env                        ← Variables (gitignore)
├── mundial2026-backend/
│   ├── Dockerfile              ← Copiar de backend.Dockerfile
│   ├── docker-entrypoint.sh
│   └── ...
└── mundial2026-frontend/
    ├── Dockerfile              ← Copiar de frontend.Dockerfile
    ├── nginx.conf
    └── ...
```

### URLs con Docker

| Servicio | URL |
|---|---|
| App web | http://localhost |
| Backend API | http://localhost:3001 |
| Adminer (DB) | http://localhost:8080 (solo --profile dev) |

---

## 📱 PWA — Instalar como app

### Instalación

```bash
cd mundial2026-frontend
npm install -D vite-plugin-pwa
```

### Setup

1. **Reemplazar** `vite.config.js` con el contenido de `vite.config.pwa.js`
2. **Copiar** `usePWA.js` → `src/hooks/usePWA.js`
3. **Agregar** en `Layout.jsx`:

```jsx
import { PWAInstallBanner } from '../hooks/usePWA'

// En el JSX del Layout, antes del </div> final:
<PWAInstallBanner />
```

4. **Agregar** iconos en `public/icons/` (192x192 y 512x512 mínimo)
   - Usar [realfavicongenerator.net](https://realfavicongenerator.net) para generarlos
   - O [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator)

5. **Agregar** en `index.html` dentro de `<head>`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#16a34a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

### Qué hace la PWA

- **Instalable** como app en iOS y Android
- **Offline**: muestra los últimos datos cacheados si no hay red
- **Banner de instalación** automático en mobile
- **Push notifications** (cuando el usuario las acepta)
- Cache inteligente: API de partidos (5 min), assets (1 año)

---

## 🚀 Deploy en producción (Railway / Render)

### Railway (recomendado, gratis)

1. Crear proyecto en [railway.app](https://railway.app)
2. Agregar servicio PostgreSQL
3. Agregar servicio desde GitHub (backend)
4. Agregar servicio desde GitHub (frontend)
5. Configurar las variables de entorno

### Variables de entorno en producción

```env
DATABASE_URL=        # Lo da Railway automáticamente
JWT_SECRET=          # openssl rand -base64 64
REFRESH_TOKEN_SECRET= # openssl rand -base64 64
FRONTEND_URL=        # URL de tu frontend deployado
NODE_ENV=production
TOURNAMENT_DEADLINE=2026-06-11T14:00:00Z
```
