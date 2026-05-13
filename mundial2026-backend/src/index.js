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

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

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
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
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
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Socket.io listo`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);
});
