# ⚽ Polla del Mundial 2026 — Backend API

API REST + WebSockets para la quiniela del Mundial FIFA 2026.

## Stack

- **Node.js + Express** — servidor HTTP
- **PostgreSQL + Prisma** — base de datos y ORM
- **Socket.io** — ranking en tiempo real
- **JWT + Refresh tokens** — autenticación segura
- **Zod** — validación de datos

---

## Setup rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tu DATABASE_URL y secrets
```

### 3. Inicializar la base de datos

```bash
# Generar cliente Prisma
npm run db:generate

# Crear tablas (desarrollo)
npm run db:push

# Cargar datos iniciales (48 equipos + admin)
npm run db:seed
```

### 4. Arrancar el servidor

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm start
```

El servidor corre en `http://localhost:3001`

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@localhost:5432/mundial2026` |
| `JWT_SECRET` | Secreto para access tokens | string largo y aleatorio |
| `JWT_EXPIRES_IN` | Duración del access token | `15m` |
| `REFRESH_TOKEN_SECRET` | Secreto para refresh tokens | otro string distinto |
| `REFRESH_TOKEN_EXPIRES_IN` | Duración del refresh token | `7d` |
| `PORT` | Puerto del servidor | `3001` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:5173` |
| `TOURNAMENT_DEADLINE` | Cierre de pronósticos globales | `2026-06-11T14:00:00Z` |

---

## Endpoints de la API

### Auth — `/api/auth`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/register` | Registrar nuevo usuario | — |
| POST | `/login` | Iniciar sesión | — |
| POST | `/refresh` | Renovar access token | — |
| POST | `/logout` | Cerrar sesión | — |
| GET | `/me` | Perfil del usuario autenticado | ✅ |

**Registro:**
```json
POST /api/auth/register
{
  "username": "juancho99",
  "email": "juan@email.com",
  "password": "MiPassword123"
}
```

**Respuesta:**
```json
{
  "user": { "id": "...", "username": "juancho99", "email": "...", "role": "USER" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### Partidos — `/api/matches`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista de partidos (filtros: `?phase=GROUP&status=SCHEDULED`) |
| GET | `/upcoming` | Próximos partidos (48hs) |
| GET | `/:id` | Detalle de un partido |
| GET | `/teams` | Lista de los 48 equipos |
| GET | `/teams/:id/players` | Jugadores de un equipo |

---

### Predicciones — `/api/predictions` (requiere auth)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/my` | Mis predicciones (filtros: `?phase=GROUP&status=FINISHED`) |
| GET | `/match/:matchId` | Mi predicción para un partido |
| POST | `/match/:matchId` | Crear predicción |
| PUT | `/match/:matchId` | Actualizar predicción |
| GET | `/match/:matchId/all` | Ver predicciones de todos (post-partido) |

**Crear predicción:**
```json
POST /api/predictions/match/{matchId}
{
  "predHome": 2,
  "predAway": 1,
  "predScorerId": "player-id-opcional",
  "predBtts": true,
  "predOverUnder": "over",
  "predPenalties": false
}
```

---

### Pronósticos del torneo — `/api/tournament` (requiere auth)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/picks` | Mis pronósticos globales |
| PUT | `/picks` | Guardar pronósticos globales |
| GET | `/picks/:userId` | Ver picks de otro usuario (post-cierre) |

**Guardar picks:**
```json
PUT /api/tournament/picks
{
  "champion": "team-id-arg",
  "finalist1": "team-id-bra",
  "finalist2": "team-id-fra",
  "semifinalists": ["team-id-arg", "team-id-bra", "team-id-fra", "team-id-eng"],
  "quarterfinalists": ["...", "...", "...", "...", "...", "...", "...", "..."],
  "groupQualifiers": ["...", "..."],
  "topScorerId": "player-id",
  "bestPlayerId": "player-id",
  "bestKeeperId": "player-id",
  "bestYoungId": "player-id",
  "totalGoals": 154,
  "mostGoalsTeamId": "team-id",
  "leastGoalsTeamId": "team-id",
  "hostFurthest": "team-id-usa"
}
```

---

### Grupos — `/api/groups` (requiere auth)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/` | Crear grupo |
| POST | `/join` | Unirse con código |
| GET | `/my` | Mis grupos |
| GET | `/:id` | Detalle del grupo + miembros |

---

### Leaderboard — `/api/leaderboard`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/global` | Ranking global paginado (`?page=1&limit=20`) | — |
| GET | `/me` | Mi posición en el ranking | ✅ |
| GET | `/group/:groupId` | Ranking de un grupo | ✅ |

---

### Admin — `/api/admin` (requiere auth + rol ADMIN)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard` | Estadísticas generales |
| POST | `/matches/:matchId/result` | Cargar resultado → dispara cálculo de puntos |
| PUT | `/matches/:matchId/status` | Cambiar estado del partido |
| POST | `/tournament/awards` | Cargar premios finales del torneo |

**Cargar resultado:**
```json
POST /api/admin/matches/{matchId}/result
{
  "scoreHome": 2,
  "scoreAway": 1,
  "firstScorerId": "player-id-opcional",
  "wentToPenalties": false
}
```

---

## Sistema de puntos

### Por partido

| Acierto | Puntos base |
|---|---|
| Resultado exacto (marcador preciso) | **5 pts** |
| Ganador + misma diferencia de goles | **3 pts** |
| Solo ganador / empate | **1 pt** |
| Primer goleador correcto | **+5 pts** (grupos) / **+7 pts** (eliminatoria) |
| Ambos anotan (BTTS) correcto | **+1 pt** |
| Over/Under 2.5 correcto | **+1 pt** |
| ¿Va a penales? correcto | **+3 pts** |

> Los puntos de partido en eliminatoria (R32 en adelante) se multiplican × 1.5

### Pronósticos del torneo

| Categoría | Puntos |
|---|---|
| Campeón | 30 pts |
| Finalistas | 15 pts c/u |
| Semifinalistas | 8 pts c/u |
| Cuartos de final | 4 pts c/u |
| Clasificados a 8vos | 1 pt c/u |
| Clasificados a 16avos | 1 pt c/u |
| Bota de Oro (exacto) | 20 pts |
| Balón de Oro (exacto) | 15 pts |
| Guante de Oro (exacto) | 12 pts |
| Mejor joven (exacto) | 10 pts |
| Total de goles (exacto) | 8 pts / ±3: 4 pts / ±10: 1 pt |
| Selección más goleadora | 6 pts |
| Selección menos goleada | 6 pts |
| País sede más lejos | 5 pts |

### Bonos

| Bono | Puntos |
|---|---|
| Racha de 3 resultados exactos seguidos | +5 pts |
| Jornada perfecta (todos los partidos de un día) | +10 pts |

---

## Socket.io — Eventos en tiempo real

```javascript
// Cliente se une al ranking global
socket.emit('join:leaderboard', null);

// Cliente se une al ranking de un grupo
socket.emit('join:leaderboard', 'group-id');

// Servidor emite cuando hay actualización del ranking
socket.on('leaderboard:update', ({ matchId, topPlayers }) => {
  // Actualizar UI con los nuevos datos
});

// Servidor emite cuando cambia el estado de un partido
socket.on('match:status', ({ matchId, status }) => {
  // 'LIVE' | 'FINISHED' | etc.
});
```

---

## Estructura del proyecto

```
mundial2026-backend/
├── prisma/
│   ├── schema.prisma     ← Modelo de datos completo
│   └── seed.js           ← 48 equipos + usuario admin
├── src/
│   ├── index.js          ← Entry point (Express + Socket.io)
│   ├── controllers/
│   │   ├── authController.js        ← Register, login, JWT
│   │   ├── predictionController.js  ← Pronósticos + motor de puntos
│   │   ├── adminController.js       ← Resultados + leaderboard
│   │   ├── tournamentController.js  ← Picks globales
│   │   ├── groupController.js       ← Grupos privados
│   │   ├── matchController.js       ← Partidos y equipos
│   │   └── leaderboardController.js ← Rankings
│   ├── middlewares/
│   │   └── auth.js       ← Verificación JWT + rol admin
│   ├── routes/
│   │   ├── all.js        ← Definición de todas las rutas
│   │   ├── auth.js
│   │   ├── matches.js
│   │   ├── predictions.js
│   │   ├── tournament.js
│   │   ├── groups.js
│   │   ├── leaderboard.js
│   │   ├── admin.js
│   │   └── users.js
│   └── utils/
│       └── prisma.js     ← Singleton del cliente Prisma
├── .env.example
├── package.json
└── README.md
```

---

## Próximos pasos

1. **Frontend** — React + Vite + TailwindCSS + React Query
2. **Notificaciones** — Recordatorios antes del cierre de apuestas (email o push)
3. **API de fútbol** — Integración con api-football.com para resultados automáticos
4. **Imágenes** — Subida de avatares (Cloudinary o S3)
