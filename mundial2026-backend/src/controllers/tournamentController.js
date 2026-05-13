const { z } = require('zod');
const prisma = require('../utils/prisma');

const TOURNAMENT_DEADLINE_ENV = process.env.TOURNAMENT_DEADLINE;

const isTournamentLocked = () => {
  if (!TOURNAMENT_DEADLINE_ENV) return false;
  return new Date() > new Date(TOURNAMENT_DEADLINE_ENV);
};

const picksSchema = z.object({
  champion:           z.string().optional().nullable(),
  finalist1:          z.string().optional().nullable(),
  finalist2:          z.string().optional().nullable(),
  semifinalists:      z.array(z.string()).max(4).optional(),
  quarterfinalists:   z.array(z.string()).max(8).optional(),
  groupQualifiers:    z.array(z.string()).max(32).optional(),
  topScorerId:        z.string().optional().nullable(),
  bestPlayerId:       z.string().optional().nullable(),
  bestKeeperId:       z.string().optional().nullable(),
  bestYoungId:        z.string().optional().nullable(),
  totalGoals:         z.number().int().min(0).max(300).optional().nullable(),
  mostGoalsTeamId:    z.string().optional().nullable(),
  leastGoalsTeamId:   z.string().optional().nullable(),
  hostFurthest:       z.string().optional().nullable(),
}).partial();

// GET /api/tournament/picks — Mis picks del torneo
const getMyPicks = async (req, res) => {
  const picks = await prisma.tournamentPicks.findUnique({
    where: { userId: req.user.id },
  });
  return res.json(picks || {});
};

// PUT /api/tournament/picks — Guardar/actualizar mis picks
const savePicks = async (req, res) => {
  if (isTournamentLocked()) {
    return res.status(403).json({
      error: 'El plazo para los pronósticos del torneo ha cerrado',
    });
  }

  const parsed = picksSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const picks = await prisma.tournamentPicks.upsert({
    where: { userId: req.user.id },
    update: parsed.data,
    create: { userId: req.user.id, ...parsed.data },
  });

  return res.json(picks);
};

// GET /api/tournament/picks/:userId — Ver picks de otro usuario (post-cierre)
const getUserPicks = async (req, res) => {
  // Solo se revelan los picks de otros cuando el torneo ha comenzado
  if (!isTournamentLocked() && req.user.id !== req.params.userId) {
    return res.status(403).json({
      error: 'Los pronósticos se revelan cuando cierra el plazo de apuestas',
    });
  }

  const picks = await prisma.tournamentPicks.findUnique({
    where: { userId: req.params.userId },
  });

  if (!picks) return res.status(404).json({ error: 'Usuario no encontró pronósticos' });
  return res.json(picks);
};

module.exports = { getMyPicks, savePicks, getUserPicks };
