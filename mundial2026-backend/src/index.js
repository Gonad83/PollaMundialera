require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const matchRoutes       = require('./routes/matches');
const predictionRoutes  = require('./routes/predictions');
const tournamentRoutes  = require('./routes/tournament');
const groupRoutes       = require('./routes/groups');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes       = require('./routes/admin');
const paymentRoutes     = require('./routes/payments');

const app = express();
const httpServer = createServer(app);

// ─── Orígenes Permitidos (CORS) ────────────────────────────────────────────────
const ALLOWED_EXACT = [
  process.env.FRONTEND_URL,
  'https://polla-mundialera-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
].filter(Boolean);

const originFn = (origin, callback) => {
  // Peticiones sin origin (curl, server-to-server, Postman)
  if (!origin) return callback(null, true);
  // Exactas
  if (ALLOWED_EXACT.includes(origin)) return callback(null, true);
  // Cualquier subdominio de vercel.app (previews automáticos)
  if (/^https:\/\/[^.]+\.vercel\.app$/.test(origin)) return callback(null, true);
  callback(new Error(`CORS: origen no permitido → ${origin}`));
};

const corsOptions = { origin: originFn, credentials: true };

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, { cors: corsOptions });

// Exponer io para usarlo en controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on('join:leaderboard', (groupId) => {
    const room = groupId ? `group:${groupId}` : 'global';
    socket.join(room);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// ─── Middlewares globales ─────────────────────────────────────────────────────

// Preflight explícito para todas las rutas (necesario para CORS con credentials)
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta en unos minutos.' },
});
app.use('/api', limiter);

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        /* authLimiter, */ authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/matches',     matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/tournament',  tournamentRoutes);
app.use('/api/groups',      groupRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/payments',    paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Sync ruta pública con secret key ────────────────────────────────────────
// POST /sync-matches?key=SYNC_SECRET  → sincroniza partidos desde football-data.org
const { syncMatches: syncUtil } = require('./utils/syncFootballData');
app.post('/sync-matches', async (req, res) => {
  const key = req.query.key || req.headers['x-sync-key'];
  if (!process.env.SYNC_SECRET || key !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: 'Clave inválida' });
  }
  try {
    const result = await syncUtil();
    // Reconstruir leaderboards cuando se finalizaron/puntuaron partidos en este sync.
    // syncUtil ya actualiza user.totalPoints y los puntos de cada predicción, pero el
    // ranking de grupo (LeaderboardEntry) quedaba congelado porque solo se reconstruía
    // en el sync de admin. Esto recalcula desde las predicciones existentes (no borra ni
    // modifica puntos ni pronósticos), manteniendo Ranking, Comparativa y header alineados.
    if ((result.created || 0) > 0 || (result.updated || 0) > 0 || (result.finished || 0) > 0 || (result.scoredPredictions || 0) > 0) {
      try {
        const { rebuildLeaderboard } = require('./controllers/adminController');
        await rebuildLeaderboard();
      } catch (e) {
        console.error('[sync-matches] rebuildLeaderboard falló:', e.message);
      }
    }
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;
  res.status(status).json({ error: message });
});

// ─── Arrancar ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const prisma = require('./utils/prisma');

async function startServer() {
  // Aplica migraciones pendientes antes de aceptar tráfico
  try {
    await prisma.$executeRaw`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "groupId" TEXT`;
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_groupId_fkey"
          FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;
    await prisma.$executeRaw`DROP INDEX IF EXISTS "Prediction_userId_matchId_key"`;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Prediction_userId_matchId_groupId_key"
        ON "Prediction"("userId", "matchId", "groupId")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Prediction_groupId_idx" ON "Prediction"("groupId")
    `;
    // Match.winnerId migration
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "winnerId" TEXT`;
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey"
          FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Match_winnerId_idx" ON "Match"("winnerId")
    `;
    // Match: marcador de prorroga/penales (separado del marcador de los 90 min)
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "extraTimeHome" INTEGER`;
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "extraTimeAway" INTEGER`;
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "penaltyHome" INTEGER`;
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "penaltyAway" INTEGER`;
    // TournamentPicks.groupId migration
    await prisma.$executeRaw`ALTER TABLE "TournamentPicks" ADD COLUMN IF NOT EXISTS "groupId" TEXT`;
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "TournamentPicks" ADD CONSTRAINT "TournamentPicks_groupId_fkey"
          FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;
    await prisma.$executeRaw`DROP INDEX IF EXISTS "TournamentPicks_userId_groupId_key"`;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "TournamentPicks_userId_groupId_key"
        ON "TournamentPicks"("userId", "groupId")
    `;
    // Group payment link settings
    await prisma.$executeRaw`ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "paymentLink" TEXT`;
    await prisma.$executeRaw`ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "paymentButtonEnabled" BOOLEAN NOT NULL DEFAULT false`;
    await prisma.$executeRaw`ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "paymentAmount" INTEGER NOT NULL DEFAULT 8000`;

    // Performance indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Match_status_idx" ON "Match"("status")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Match_dateUtc_idx" ON "Match"("dateUtc")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "LeaderboardEntry_userId_idx" ON "LeaderboardEntry"("userId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Prediction_userId_groupId_idx" ON "Prediction"("userId", "groupId")`;

    // Tabla de config global key/value (deadline del torneo persistente)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Schema migration OK');
  } catch (e) {
    console.error('⚠️  Schema migration warning (continuing):', e.message);
  }

  // Hidratar el deadline del torneo desde la BD: cierre durable que sobrevive
  // reinicios/deploys (antes vivía solo en memoria y se reabría en cada arranque).
  try {
    const { loadDeadlineFromDb } = require('./utils/tournamentDeadlineStore');
    await loadDeadlineFromDb();
  } catch (e) {
    console.error('⚠️  No se pudo cargar el deadline del torneo:', e.message);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 Socket.io listo`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);

    // ── Sincronización automática de partidos ───────────────────────────────
    // Al arrancar y cada N minutos: baja resultados y carga las rondas nuevas
    // (16avos, 8vos, 4tos, …) en cuanto la API las publica, sin apretar el botón.
    // Tras cada sync reconstruye los leaderboards. NO borra ni modifica pronósticos.
    const SYNC_INTERVAL_MIN = Number(process.env.SYNC_INTERVAL_MINUTES) || 15;
    const runAutoSync = async (label) => {
      try {
        const r = await syncUtil();
        console.log(`🔄 Sync (${label}): +${r.created || 0} nuevos · ${r.updated || 0} act. · ${r.finished || 0} fin.`);
      } catch (e) {
        console.error(`[sync ${label}] error:`, e.message);
      }
      // Reconstruir leaderboards siempre (haya cambiado algo o no) para mantener
      // ranking, comparativa y header alineados tras un deploy/sync.
      try {
        const { rebuildLeaderboard } = require('./controllers/adminController');
        await rebuildLeaderboard();
      } catch (e) {
        console.error(`[sync ${label}] rebuild error:`, e.message);
      }
    };
    // Primer sync poco después de arrancar (deja respirar al server) + periódico.
    setTimeout(() => runAutoSync('arranque'), 5000);
    setInterval(() => runAutoSync('periódico'), SYNC_INTERVAL_MIN * 60 * 1000);
    console.log(`🗓️  Auto-sync de partidos activado · cada ${SYNC_INTERVAL_MIN} min`);
  });
}

startServer();
