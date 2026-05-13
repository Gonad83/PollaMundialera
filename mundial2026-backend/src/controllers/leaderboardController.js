const prisma = require('../utils/prisma');

// GET /api/leaderboard/global — Ranking global paginado
const getGlobal = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { groupId: null },
      orderBy: { rank: 'asc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    }),
    prisma.leaderboardEntry.count({ where: { groupId: null } }),
  ]);

  return res.json({
    entries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// GET /api/leaderboard/group/:groupId — Ranking de un grupo
const getGroup = async (req, res) => {
  const { groupId } = req.params;

  // Verificar que el usuario es miembro
  const isMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.user.id, groupId } },
  });
  if (!isMember) {
    return res.status(403).json({ error: 'No eres miembro de este grupo' });
  }

  const entries = await prisma.leaderboardEntry.findMany({
    where: { groupId },
    orderBy: { rank: 'asc' },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return res.json(entries);
};

// GET /api/leaderboard/me — Mi posición en el ranking global
const getMyRank = async (req, res) => {
  const entry = await prisma.leaderboardEntry.findFirst({
    where: { userId: req.user.id, groupId: null },
  });

  if (!entry) return res.status(404).json({ error: 'Sin posición en el ranking' });

  const total = await prisma.leaderboardEntry.count({ where: { groupId: null } });

  return res.json({ ...entry, totalPlayers: total });
};

module.exports = { getGlobal, getGroup, getMyRank };
