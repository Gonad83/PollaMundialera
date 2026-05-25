const prisma = require('../utils/prisma');

// In-memory cache — teams never change during the tournament
let _teamsCache = null;

// GET /api/matches — Lista de partidos con filtros opcionales
const getMatches = async (req, res) => {
  const { phase, status, teamId } = req.query;

  const matches = await prisma.match.findMany({
    where: {
      ...(phase && { phase }),
      ...(status && { status }),
      ...(teamId && {
        OR: [{ teamHomeId: teamId }, { teamAwayId: teamId }],
      }),
    },
    include: {
      teamHome: { select: { id: true, name: true, code: true, flagUrl: true } },
      teamAway: { select: { id: true, name: true, code: true, flagUrl: true } },
    },
    orderBy: { dateUtc: 'asc' },
  });

  // Añadir si el usuario ya apostó (si está autenticado)
  return res.json(matches);
};

// GET /api/matches/:id — Detalle de un partido
const getMatch = async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      teamHome: true,
      teamAway: true,
    },
  });

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  return res.json(match);
};

// GET /api/matches/upcoming — Próximos partidos (para recordatorios)
const getUpcoming = async (req, res) => {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      dateUtc: { gte: now, lte: in48h },
    },
    include: {
      teamHome: { select: { id: true, name: true, code: true, flagUrl: true } },
      teamAway: { select: { id: true, name: true, code: true, flagUrl: true } },
    },
    orderBy: { dateUtc: 'asc' },
  });

  return res.json(matches);
};

// GET /api/teams — Lista de equipos (cached in memory, teams never change)
const getTeams = async (req, res) => {
  if (!_teamsCache) {
    _teamsCache = await prisma.team.findMany({
      orderBy: [{ confederation: 'asc' }, { name: 'asc' }],
    });
  }
  return res.json(_teamsCache);
};

// GET /api/teams/:id/players — Jugadores de un equipo
const getTeamPlayers = async (req, res) => {
  const players = await prisma.player.findMany({
    where: { teamId: req.params.id },
    orderBy: { name: 'asc' },
  });
  return res.json(players);
};

module.exports = { getMatches, getMatch, getUpcoming, getTeams, getTeamPlayers };
