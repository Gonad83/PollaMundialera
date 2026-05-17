const { z } = require('zod');
const prisma = require('../utils/prisma');

// ─── Sistema de puntos ────────────────────────────────────────────────────────

const POINTS = {
  EXACT_RESULT: 5,       // Marcador exacto
  CORRECT_DIFF: 3,       // Ganador + misma diferencia de goles
  CORRECT_WINNER: 1,     // Solo ganador / empate
  SCORER_BONUS: 5,       // Primer goleador correcto
  BTTS_BONUS: 1,         // Ambos anotan correcto
  OVER_UNDER_BONUS: 1,   // Over/Under correcto
  PENALTIES_BONUS: 3,    // ¿Va a penales? correcto (eliminatoria)
  SCORER_ELIMINATION: 7, // Goleador del partido en eliminatoria
};

// Multiplicadores por fase
const PHASE_MULTIPLIERS = {
  GROUP: 1,
  R32: 1.5,
  R16: 1.5,
  QF: 1.5,
  SF: 1.5,
  THIRD: 1.5,
  FINAL: 1.5,
};

/**
 * Calcula los puntos de una predicción dado el resultado real
 */
const calculatePredictionPoints = (prediction, match) => {
  const { predHome, predAway, predScorerId, predBtts, predOverUnder, predPenalties } = prediction;
  const { scoreHome, scoreAway, phase, wentToPenalties } = match;
  const multiplier = PHASE_MULTIPLIERS[phase] || 1;

  let pointsExact = 0;
  let pointsWinner = 0;
  let pointsBonus = 0;

  // 1. Resultado exacto
  if (predHome === scoreHome && predAway === scoreAway) {
    pointsExact = POINTS.EXACT_RESULT;
  } else {
    // 2. Ganador + misma diferencia de goles
    const predDiff = predHome - predAway;
    const realDiff = scoreHome - scoreAway;
    const sameSign = Math.sign(predDiff) === Math.sign(realDiff);

    if (sameSign && Math.abs(predDiff) === Math.abs(realDiff)) {
      pointsExact = POINTS.CORRECT_DIFF;
    } else if (sameSign) {
      // 3. Solo acertó ganador / empate
      pointsWinner = POINTS.CORRECT_WINNER;
    }
  }

  // 4. Bonus: primer goleador
  if (predScorerId && match.firstScorerId === predScorerId) {
    const scorerPts = phase === 'GROUP' ? POINTS.SCORER_BONUS : POINTS.SCORER_ELIMINATION;
    pointsBonus += scorerPts;
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
  const total = Math.round(base * multiplier) + pointsBonus;

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
    },
    orderBy: { match: { dateUtc: 'asc' } },
  });

  return res.json(predictions);
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
  calculatePredictionPoints,
};
