# ⚽ Polla Mundial 2026 — Frontend

App web React para la quiniela del Mundial FIFA 2026.

## Stack

- **React 18 + Vite** — framework y bundler
- **React Router v6** — navegación SPA
- **TanStack Query** — fetching, cache y sincronización de datos
- **Tailwind CSS** — estilos utilitarios
- **Socket.io Client** — ranking en tiempo real
- **Axios** — cliente HTTP con refresh automático de JWT
- **date-fns** — formateo de fechas en español

## Diseño

- Tema oscuro (`zinc-950`) con acentos verde cancha (`field-*`) y dorado (`gold-*`)
- Fuentes: **Bebas Neue** (display) + **DM Sans** (cuerpo) + **JetBrains Mono** (números)
- Animaciones CSS con Tailwind (`slide-up`, `fade-in`, `pulse-gold`)

---

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

### 3. Arrancar en desarrollo

```bash
# Asegúrate de que el backend esté corriendo en :3001
npm run dev
```

La app corre en `http://localhost:5173`

### 4. Build de producción

```bash
npm run build
# Output en ./dist/
```

---

## Páginas

| Ruta | Descripción | Auth |
|---|---|---|
| `/` | Landing con countdown al mundial | — |
| `/register` | Crear cuenta | — |
| `/login` | Iniciar sesión | — |
| `/matches` | Lista de partidos con filtros por fase | ✅ |
| `/matches/:id` | Detalle + formulario de apuesta | ✅ |
| `/tournament` | Pronósticos globales del torneo | ✅ |
| `/leaderboard` | Ranking global con tiempo real | ✅ |
| `/groups` | Mis grupos + crear/unirme | ✅ |
| `/groups/:id` | Ranking interno del grupo | ✅ |
| `/profile/:id` | Perfil y estadísticas | ✅ |
| `/admin` | Panel admin (solo ADMIN) | ✅ ADMIN |

---

## Estructura

```
src/
├── App.jsx                 ← Rutas + providers
├── main.jsx
├── index.css               ← Tailwind + clases custom
├── context/
│   ├── AuthContext.jsx     ← Estado de usuario + JWT
│   └── SocketContext.jsx   ← WebSocket para tiempo real
├── lib/
│   └── api.js              ← Cliente axios + helpers por recurso
├── components/
│   └── layout/
│       └── Layout.jsx      ← Navbar + outlet
└── pages/
    ├── LandingPage.jsx     ← Countdown + features
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── MatchesPage.jsx     ← Lista con agrupación por día
    ├── MatchDetailPage.jsx ← Formulario de apuesta + resultados
    ├── TournamentPage.jsx  ← Picks globales (campeón, premios, stats)
    ├── LeaderboardPage.jsx ← Ranking paginado + socket.io
    ├── GroupsPage.jsx      ← Crear/unirse a grupos
    ├── GroupDetailPage.jsx ← Ranking del grupo
    ├── ProfilePage.jsx     ← Estadísticas del usuario
    └── AdminPage.jsx       ← Cargar resultados + dashboard
```

---

## Flujo de auth

1. Usuario registra → recibe `accessToken` (15min) + `refreshToken` (7 días)
2. Axios interceptor adjunta el token en cada request
3. Si recibe `401 TOKEN_EXPIRED`, hace refresh automático y reintenta
4. Si el refresh falla, redirige a `/login`

---

## Tiempo real (Socket.io)

El `LeaderboardPage` escucha el evento `leaderboard:update` que emite el backend cada vez que se carga un resultado. Actualiza automáticamente el ranking sin necesidad de recargar.

```js
socket.on('leaderboard:update', () => {
  queryClient.invalidateQueries(['leaderboard'])
})
```

---

## Conectar con el backend

En desarrollo, Vite proxea `/api` → `http://localhost:3001` automáticamente (ver `vite.config.js`).

En producción, actualizar `baseURL` en `src/lib/api.js` con la URL del backend deployado.
