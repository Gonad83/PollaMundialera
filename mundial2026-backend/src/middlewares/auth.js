const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// Verifica el access token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, role: true, plan: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Verifica el token si viene presente; deja pasar requests publicos sin token.
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  return authenticate(req, res, next);
};

// Solo Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol Super Admin.' });
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate, requireAdmin };
