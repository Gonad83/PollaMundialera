const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../utils/prisma');

const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '90d';

const refreshTokenDays = () => {
  const match = String(refreshTokenExpiresIn).match(/^(\d+)d$/);
  return match ? Number(match[1]) : 90;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  // Añadimos un jti (JWT ID) aleatorio para asegurar que el token sea único incluso dentro del mismo segundo
  const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const refreshToken = jwt.sign(
    { userId, jti },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: refreshTokenExpiresIn }
  );

  return { accessToken, refreshToken };
};

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + refreshTokenDays() * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
};

// ─── Schemas de validación ────────────────────────────────────────────────────

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Solo letras, números y guión bajo',
  }),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { username, email, password } = parsed.data;

    // Verificar duplicados
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      const field = existing.email === email ? 'email' : 'nombre de usuario';
      return res.status(409).json({ error: `El ${field} ya está registrado` });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { username, email, passwordHash },
      select: { id: true, username: true, email: true, role: true, plan: true, createdAt: true },
    });

    // Crear entrada en leaderboard global
    try {
      await prisma.leaderboardEntry.create({
        data: { userId: user.id, groupId: null, rank: 0 },
      });
    } catch (lbErr) {
      console.error('Leaderboard error:', lbErr);
      require('fs').appendFileSync('debug.log', `Leaderboard error: ${lbErr.message}\n`);
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await saveRefreshToken(user.id, refreshToken);

    return res.status(201).json({
      user: {
        ...user,
        groupCount: 0,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Full register error:', err);
    require('fs').appendFileSync('debug.log', `Register error: ${err.message}\nStack: ${err.stack}\n`);
    return res.status(500).json({ error: 'Error interno del servidor en registro: ' + err.message });
  }
};

const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email o contraseña inválidos' });
    }

    const { email, password } = parsed.data;
    const log = `LOGIN ATTEMPT: ${email} | DATA: ${JSON.stringify(req.body)}\n`;
    require('fs').appendFileSync('debug_login.log', log);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        _count: {
          select: { groupMemberships: true }
        }
      }
    });

    if (!user) {
      require('fs').appendFileSync('debug.log', `User not found: ${email}\n`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    require('fs').appendFileSync('debug.log', `Password valid: ${valid}\n`);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await saveRefreshToken(user.id, refreshToken);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        totalPoints: user.totalPoints,
        groupCount: user._count.groupMemberships,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    require('fs').appendFileSync('debug.log', `Login error: ${err.message}\n`);
    return res.status(500).json({ error: 'Error interno en login' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token requerido' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }

  // Verificar que el token existe en DB (y no fue revocado)
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token revocado o expirado' });
  }

  // Rotar el refresh token (invalidar el anterior) — ignorar si ya no existe
  try {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
  } catch (e) {
    // El token ya fue eliminado o no existe, no es un error crítico
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.userId);
  await saveRefreshToken(payload.userId, newRefreshToken);

  return res.json({ accessToken, refreshToken: newRefreshToken });
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  return res.json({ message: 'Sesión cerrada' });
};

const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      _count: {
        select: { groupMemberships: true }
      }
    }
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    plan: user.plan,
    totalPoints: user.totalPoints,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    groupCount: user._count.groupMemberships,
  });
};

const updateMe = async (req, res) => {
  try {
    const { username, avatarUrl } = req.body;
    const data = {};

    if (username !== undefined) {
      const result = z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, {
        message: 'Solo letras, números y guión bajo (3-20 caracteres)',
      }).safeParse(username);
      if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });

      const taken = await prisma.user.findFirst({ where: { username, NOT: { id: req.user.id } } });
      if (taken) return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });
      data.username = username;
    }

    if (avatarUrl !== undefined) {
      data.avatarUrl = avatarUrl || null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, email: true, avatarUrl: true, role: true, plan: true, totalPoints: true },
    });

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

module.exports = { register, login, refresh, logout, me, updateMe };
