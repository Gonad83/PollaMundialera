const prisma = require('../utils/prisma');

const isRound16ScoringOpen = async () => {
  const r32Matches = await prisma.match.findMany({
    where: { phase: 'R32' },
    select: { status: true, winnerId: true },
  });

  return r32Matches.length >= 16 && r32Matches.every((match) => match.status === 'FINISHED' && match.winnerId);
};

const applyTournamentScoreGate = async (entries, groupId = null, rerank = false) => {
  if (await isRound16ScoringOpen()) return entries;

  const userIds = entries.map((entry) => entry.userId);
  if (userIds.length === 0) return entries;

  const picks = await prisma.tournamentPicks.findMany({
    where: {
      userId: { in: userIds },
      ...(groupId ? { groupId } : {}),
    },
    select: { userId: true, ptsRound16: true },
  });

  const blockedByUser = new Map();
  for (const pick of picks) {
    blockedByUser.set(pick.userId, (blockedByUser.get(pick.userId) || 0) + (pick.ptsRound16 || 0));
  }

  const effectiveEntries = entries.map((entry) => {
      const blocked = blockedByUser.get(entry.userId) || 0;
      if (!blocked) return entry;

      return {
        ...entry,
        totalPoints: Math.max((entry.totalPoints || 0) - blocked, 0),
        tournamentPoints: Math.max((entry.tournamentPoints || 0) - blocked, 0),
      };
    });

  if (!rerank) return effectiveEntries;

  return effectiveEntries
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

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

  const effectiveEntries = await applyTournamentScoreGate(entries, null);

  return res.json({
    entries: effectiveEntries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

const getGroup = async (req, res) => {
  const { groupId } = req.params;

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

  const effectiveEntries = await applyTournamentScoreGate(entries, groupId, true);

  return res.json(effectiveEntries);
};

const getMyRank = async (req, res) => {
  const entry = await prisma.leaderboardEntry.findFirst({
    where: { userId: req.user.id, groupId: null },
  });

  if (!entry) return res.status(404).json({ error: 'Sin posicion en el ranking' });

  const total = await prisma.leaderboardEntry.count({ where: { groupId: null } });
  const [effectiveEntry] = await applyTournamentScoreGate([entry], null);

  return res.json({ ...effectiveEntry, totalPlayers: total });
};

module.exports = { getGlobal, getGroup, getMyRank };
