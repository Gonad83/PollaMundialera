const { z } = require('zod');
const prisma = require('../utils/prisma');

// ─── Sistema de puntos ────────────────────────────────────────────────────────

const POINTS = {
  EXACT_RESULT: 5,       // Marcador exacto
  CORRECT_WINNER: 2,     // Ganador / empate correcto
  BTTS_BONUS: 1,         // Ambos anotan correcto
  OVER_UNDER_BONUS: 1,   // Over/Under correcto
  PENALTIES_BONUS: 1,    // ¿Va a penales? correcto (eliminatoria)
};

/**
 * Calcula los puntos de una predicción dado el resultado real
 */
const calculatePredictionPoints = (prediction, match) => {
  const { predHome, predAway, predBtts, predOverUnder, predPenalties } = prediction;
  const { scoreHome, scoreAway, wentToPenalties } = match;

  let pointsExact = 0;
  let pointsWinner = 0;
  let pointsBonus = 0;

  // 1. Resultado exacto
  if (predHome === scoreHome && predAway === scoreAway) {
    pointsExact = POINTS.EXACT_RESULT;
  } else {
    const predDiff = predHome - predAway;
    const realDiff = scoreHome - scoreAway;
    const sameSign = Math.sign(predDiff) === Math.sign(realDiff);

    if (sameSign) {
      pointsWinner = POINTS.CORRECT_WINNER;
    }
  }

  // 5. Bonus: ambos anotan
  if (predBtts !== null && predBtts !== undefined) {
    const bttsReal = scoreHome > 0 && scoreAway > 0;
    if (predBtts === bttsReal) pointsBonus += POINTS.BTTS_BONUS;
  }

  // 6. Bonus: over/under 2.5
  if (predOverUnder) {
    const totalGoals = scoreHome + scoreAway;
    const realOverUnder = totalGoals > 2.5 ? 'over' : 'under';
    if (predOverUnder === realOverUnder) pointsBonus += POINTS.OVER_UNDER_BONUS;
  }

  // 7. Bonus: ¿va a penales?
  if (predPenalties !== null && predPenalties !== undefined) {
    if (predPenalties === wentToPenalties) pointsBonus += POINTS.PENALTIES_BONUS;
  }

  const base = pointsExact + pointsWinner;
  const total = base + pointsBonus;

  return { pointsExact, pointsWinner, pointsBonus, pointsTotal: total };
};

// ─── Schema de validación ─────────────────────────────────────────────────────

const predictionSchema = z.object({
  predHome: z.number().int().min(0).max(20),
  predAway: z.number().int().min(0).max(20),
  predScorerId: z.string().optional().nullable(),
  predBtts: z.boolean().optional().nullable(),
  predOverUnder: z.enum(['over', 'under']).optional().nullable(),
  predPenalties: z.boolean().optional().nullable(),
  predWinnerId: z.string().optional().nullable(),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /api/predictions/match/:matchId — Ver predicciones propias para un partido
const getForMatch = async (req, res) => {
  const { matchId } = req.params;
  const { groupId } = req.query;

  if (!groupId) return res.status(400).json({ error: 'groupId es requerido' });

  const prediction = await prisma.prediction.findUnique({
    where: { userId_matchId_groupId: { userId: req.user.id, matchId, groupId } },
    include: {
      match: {
        include: { teamHome: true, teamAway: true },
      },
      predWinner: true,
    },
  });

  if (!prediction) {
    return res.status(404).json({ error: 'No has hecho pronóstico para este partido' });
  }

  return res.json(prediction);
};

// POST /api/predictions/match/:matchId — Crear o actualizar predicción
const upsert = async (req, res) => {
  const { matchId } = req.params;
  const { groupId, ...bodyData } = req.body;

  if (!groupId) return res.status(400).json({ error: 'groupId es requerido' });

  const parsed = predictionSchema.safeParse(bodyData);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  // Verificar que el partido existe y no ha empezado
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  // Verificar deadline (5 minutos antes del partido)
  const deadline = new Date(match.dateUtc.getTime() - 5 * 60 * 1000);
  if (new Date() > deadline) {
    return res.status(403).json({ error: 'El plazo para apostar este partido ha cerrado' });
  }

  if (match.status !== 'SCHEDULED') {
    return res.status(403).json({ error: 'Este partido ya comenzó o finalizó' });
  }

  const data = {
    ...parsed.data,
    userId: req.user.id,
    matchId,
    groupId,
    lockedAt: null,
  };

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId_groupId: { userId: req.user.id, matchId, groupId } },
    update: parsed.data,
    create: data,
  });

  return res.json(prediction);
};

// GET /api/predictions/my — Todas mis predicciones
const getMyPredictions = async (req, res) => {
  const { phase, status, groupId } = req.query;

  const predictions = await prisma.prediction.findMany({
    where: {
      userId: req.user.id,
      ...(groupId && { groupId }),
      match: {
        ...(phase && { phase }),
        ...(status && { status }),
      },
    },
    include: {
      match: {
        include: { teamHome: true, teamAway: true },
      },
      predWinner: true,
    },
    orderBy: { match: { dateUtc: 'asc' } },
  });

  return res.json(predictions);
};

// GET /api/predictions/group/:groupId/compare — Tabla comparativa de todos los miembros
const getGroupCompare = async (req, res) => {
  const { groupId } = req.params;

  const membership = await prisma.groupMember.findFirst({
    where: { userId: req.user.id, groupId },
  });
  if (!membership) return res.status(403).json({ error: 'No eres miembro de este grupo' });

  // La apuesta se cierra 5 min antes del partido. Mostrar pronósticos de:
  //   - Partidos FINISHED (resultado final + puntos ya calculados)
  //   - Partidos LIVE (en juego, apuesta ya cerrada)
  //   - Partidos SCHEDULED cuya fecha ya pasó (apuesta cerrada, resultado pendiente)
  const lockCutoff = new Date(Date.now() - 5 * 60 * 1000); // hace 5 min

  const predictions = await prisma.prediction.findMany({
    where: {
      groupId,
      match: {
        OR: [
          { status: 'FINISHED' },
          { status: 'LIVE' },
          { status: 'SCHEDULED', dateUtc: { lte: lockCutoff } },
        ],
      },
    },
    select: {
      id: true,
      predHome: true,
      predAway: true,
      pointsTotal: true,
      pointsExact: true,
      pointsWinner: true,
      pointsBonus: true,
      userId: true,
      matchId: true,
      predBtts: true,
      predOverUnder: true,
      predPenalties: true,
      predWinnerId: true,
      user: { select: { id: true, username: true } },
      match: {
        select: {
          id: true,
          dateUtc: true,
          status: true,
          scoreHome: true,
          scoreAway: true,
          extraTimeHome: true,
          extraTimeAway: true,
          wentToPenalties: true,
          penaltyHome: true,
          penaltyAway: true,
          winnerId: true,
          groupLetter: true,
          phase: true,
          teamHome: { select: { id: true, name: true, flagUrl: true, code: true } },
          teamAway: { select: { id: true, name: true, flagUrl: true, code: true } },
        },
      },
    },
    orderBy: { match: { dateUtc: 'asc' } },
  });

  const finishedMatchCount = await prisma.match.count({ where: { status: 'FINISHED' } });

  return res.json({ predictions, finishedMatchCount });
};

// GET /api/predictions/match/:matchId/all — Ver predicciones de todos (solo post-partido)
const getAllForMatch = async (req, res) => {
  const { matchId } = req.params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  const { groupId } = req.query;

  // Solo mostrar predicciones de otros cuando el partido terminó
  if (match.status !== 'FINISHED') {
    return res.status(403).json({
      error: 'Las predicciones de otros jugadores se revelan cuando termina el partido',
    });
  }

  const whereClause = { matchId };
  if (groupId) whereClause.groupId = groupId;

  const predictions = await prisma.prediction.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      predWinner: true,
    },
    orderBy: { pointsTotal: 'desc' },
  });

  return res.json(predictions);
};

module.exports = {
  getForMatch,
  upsert,
  getMyPredictions,
  getAllForMatch,
  getGroupCompare,
  calculatePredictionPoints,
};
