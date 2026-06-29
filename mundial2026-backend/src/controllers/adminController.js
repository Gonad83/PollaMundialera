const { z } = require('zod');
const prisma = require('../utils/prisma');
const { calculatePredictionPoints } = require('./predictionController');
const {
  getDeadline,
  setDeadline,
  isLocked,
  isBracketReopen,
  getBracketReopenUntil,
  getBracketReopenAllowedEmails,
  getBracketReopenAllowedGroupNames,
  setBracketReopen,
} = require('../utils/tournamentDeadlineStore');

// ─── Schema ───────────────────────────────────────────────────────────────────

const matchResultSchema = z.object({
  scoreHome: z.number().int().min(0).max(20),
  scoreAway: z.number().int().min(0).max(20),
  wentToPenalties: z.boolean().default(false),
  winnerId: z.string().optional().nullable(),
});

const BRACKET_REOPEN_GROUP_NAMES = ['Real Ebolo'];

const STREAK_BONUS = 5;  // Puntos por racha de 3 exactos seguidos
const PERFECT_DAY_BONUS = 10; // Todos los partidos de una jornada

const TOURNAMENT_POINT_FIELDS = [
  'ptsChampion',
  'ptsFinalists',
  'ptsRound32',
  'ptsRound16',
  'ptsSemifinals',
  'ptsQuarters',
  'ptsGroups',
  'ptsTopScorer',
  'ptsBestPlayer',
  'ptsBestKeeper',
  'ptsBestYoung',
  'ptsTotalGoals',
  'ptsTeamStats',
  'ptsHostFurthest',
];

const unique = (items) => [...new Set((items || []).filter(Boolean))];
const countHits = (picked, actual) => {
  const actualSet = new Set(actual || []);
  return (picked || []).filter((id) => actualSet.has(id)).length;
};
const hasArray = (value) => Array.isArray(value);
const pointTotal = (pts) => TOURNAMENT_POINT_FIELDS.reduce((sum, field) => sum + (pts[field] || 0), 0);

const getWinnerIds = async (phase) => {
  const matches = await prisma.match.findMany({
    where: { phase, status: 'FINISHED', winnerId: { not: null } },
    select: { winnerId: true },
  });
  return unique(matches.map((m) => m.winnerId));
};

const getRound32TeamIds = async () => {
  const matches = await prisma.match.findMany({
    where: { phase: 'R32' },
    select: { teamHomeId: true, teamAwayId: true },
  });
  return unique(matches.flatMap((m) => [m.teamHomeId, m.teamAwayId]));
};

const getTournamentActuals = async (overrides = {}) => ({
  championId: overrides.championId ?? (await getWinnerIds('FINAL'))[0],
  finalistIds: hasArray(overrides.finalistIds)
    ? unique(overrides.finalistIds)
    : unique([overrides.finalist1Id, overrides.finalist2Id].filter(Boolean).length
        ? [overrides.finalist1Id, overrides.finalist2Id]
        : await getWinnerIds('SF')),
  semifinalistIds: hasArray(overrides.semifinalistIds) ? unique(overrides.semifinalistIds) : await getWinnerIds('QF'),
  quarterfinalistIds: hasArray(overrides.quarterfinalistIds) ? unique(overrides.quarterfinalistIds) : await getWinnerIds('R16'),
  round16TeamIds: hasArray(overrides.round16TeamIds) ? unique(overrides.round16TeamIds) : await getWinnerIds('R32'),
  round32TeamIds: hasArray(overrides.round32TeamIds) ? unique(overrides.round32TeamIds) : await getRound32TeamIds(),
  groupQualifierIds: hasArray(overrides.groupQualifierIds) ? unique(overrides.groupQualifierIds) : null,
  topScorerId: overrides.topScorerId,
  bestPlayerId: overrides.bestPlayerId,
  bestKeeperId: overrides.bestKeeperId,
  bestYoungId: overrides.bestYoungId,
  totalGoals: overrides.totalGoals,
  mostGoalsTeamId: overrides.mostGoalsTeamId,
  leastGoalsTeamId: overrides.leastGoalsTeamId,
  hostFurthestId: overrides.hostFurthestId,
});

const calculateTournamentPoints = async (pick, actuals) => {
  const pts = {};
  for (const field of TOURNAMENT_POINT_FIELDS) pts[field] = pick[field] || 0;

  if (actuals.championId) pts.ptsChampion = pick.champion === actuals.championId ? 30 : 0;
  if (actuals.finalistIds?.length) {
    pts.ptsFinalists = [pick.finalist1, pick.finalist2].filter((id) => actuals.finalistIds.includes(id)).length * 15;
  }
  if (actuals.semifinalistIds?.length) pts.ptsSemifinals = countHits(pick.semifinalists, actuals.semifinalistIds) * 8;
  if (actuals.quarterfinalistIds?.length) pts.ptsQuarters = countHits(pick.quarterfinalists, actuals.quarterfinalistIds) * 4;
  if (actuals.round16TeamIds?.length) pts.ptsRound16 = countHits(pick.round16Teams, actuals.round16TeamIds) * 2;
  if (actuals.round32TeamIds?.length) pts.ptsRound32 = countHits(pick.round32Teams, actuals.round32TeamIds) * 1;
  if (actuals.groupQualifierIds?.length) pts.ptsGroups = countHits(pick.groupQualifiers, actuals.groupQualifierIds) * 1;

  if (actuals.topScorerId) {
    pts.ptsTopScorer = pick.topScorerId === actuals.topScorerId ? 20
      : (await sameTeam(pick.topScorerId, actuals.topScorerId)) ? 3 : 0;
  }
  if (actuals.bestPlayerId) {
    pts.ptsBestPlayer = pick.bestPlayerId === actuals.bestPlayerId ? 15
      : (await sameTeam(pick.bestPlayerId, actuals.bestPlayerId)) ? 4 : 0;
  }
  if (actuals.bestKeeperId) {
    pts.ptsBestKeeper = pick.bestKeeperId === actuals.bestKeeperId ? 12
      : (await sameTeam(pick.bestKeeperId, actuals.bestKeeperId)) ? 3 : 0;
  }
  if (actuals.bestYoungId) {
    pts.ptsBestYoung = pick.bestYoungId === actuals.bestYoungId ? 10
      : (await sameTeam(pick.bestYoungId, actuals.bestYoungId)) ? 3 : 0;
  }
  if (actuals.totalGoals !== undefined && actuals.totalGoals !== null) {
    const goalDiff = Math.abs((pick.totalGoals || 0) - actuals.totalGoals);
    pts.ptsTotalGoals = goalDiff === 0 ? 8 : goalDiff <= 3 ? 4 : goalDiff <= 10 ? 1 : 0;
  }
  if (actuals.mostGoalsTeamId || actuals.leastGoalsTeamId) {
    pts.ptsTeamStats = (pick.mostGoalsTeamId === actuals.mostGoalsTeamId ? 6 : 0)
      + (pick.leastGoalsTeamId === actuals.leastGoalsTeamId ? 6 : 0);
  }
  if (actuals.hostFurthestId) pts.ptsHostFurthest = pick.hostFurthest === actuals.hostFurthestId ? 5 : 0;

  pts.pointsTotal = pointTotal(pts);
  return pts;
};

const recalculateTournamentPicks = async (overrides = {}) => {
  const actuals = await getTournamentActuals(overrides);
  const allPicks = await prisma.tournamentPicks.findMany();
  const userIds = unique(allPicks.map((pick) => pick.userId));
  const oldTournamentByUser = new Map();
  const newTournamentByUser = new Map();

  for (const pick of allPicks) {
    oldTournamentByUser.set(pick.userId, (oldTournamentByUser.get(pick.userId) || 0) + (pick.pointsTotal || 0));
  }

  for (const pick of allPicks) {
    const pts = await calculateTournamentPoints(pick, actuals);
    await prisma.tournamentPicks.update({ where: { id: pick.id }, data: pts });
    newTournamentByUser.set(pick.userId, (newTournamentByUser.get(pick.userId) || 0) + (pts.pointsTotal || 0));
  }

  for (const userId of userIds) {
    const [user, predictions] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }),
      prisma.prediction.aggregate({ where: { userId }, _sum: { pointsTotal: true } }),
    ]);
    const matchPoints = predictions._sum.pointsTotal || 0;
    const previousTournament = oldTournamentByUser.get(userId) || 0;
    const preservedBonus = Math.max((user?.totalPoints || 0) - matchPoints - previousTournament, 0);

    await prisma.user.update({
      where: { id: userId },
      data: { totalPoints: matchPoints + (newTournamentByUser.get(userId) || 0) + preservedBonus },
    });
  }

  return {
    picksUpdated: allPicks.length,
    actuals: {
      round32: actuals.round32TeamIds?.length || 0,
      round16: actuals.round16TeamIds?.length || 0,
      quarters: actuals.quarterfinalistIds?.length || 0,
      semis: actuals.semifinalistIds?.length || 0,
      finalists: actuals.finalistIds?.length || 0,
      champion: actuals.championId ? 1 : 0,
    },
  };
};

const recalculateUserTotals = async (tx, userIds) => {
  for (const userId of userIds) {
    const predictions = await tx.prediction.aggregate({
      where: { userId },
      _sum: { pointsTotal: true },
    });
    const tournamentPicks = await tx.tournamentPicks.aggregate({
      where: { userId },
      _sum: { pointsTotal: true },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        totalPoints: (predictions._sum.pointsTotal || 0) + (tournamentPicks._sum.pointsTotal || 0),
      },
    });
  }
};

// ─── Motor de puntos principal ────────────────────────────────────────────────

/**
 * POST /api/admin/matches/:matchId/result
 * Carga el resultado y dispara el cálculo de puntos para todos los participantes
 */
const setMatchResult = async (req, res) => {
  const { matchId } = req.params;
  const parsed = matchResultSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { predictions: true },
  });

  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const { scoreHome, scoreAway, wentToPenalties, winnerId } = parsed.data;
  const isDraw = scoreHome === scoreAway;
  const resolvedWinnerId = isDraw
    ? (wentToPenalties ? winnerId : null)
    : (scoreHome > scoreAway ? match.teamHomeId : match.teamAwayId);

  if (wentToPenalties && isDraw && !resolvedWinnerId) {
    return res.status(400).json({ error: 'Selecciona el ganador por penales' });
  }

  const matchForScoring = { ...match, scoreHome, scoreAway, wentToPenalties, winnerId: resolvedWinnerId };

  // ─── Transacción: actualizar partido + calcular todos los puntos ──────────
  await prisma.$transaction(async (tx) => {
    // 1. Actualizar el partido
    await tx.match.update({
      where: { id: matchId },
      data: { scoreHome, scoreAway, wentToPenalties, winnerId: resolvedWinnerId, status: 'FINISHED' },
    });

    // 2. Calcular puntos para cada predicción
    const affectedUserIds = new Set();
    for (const pred of match.predictions) {
      const pts = calculatePredictionPoints(pred, matchForScoring);
      affectedUserIds.add(pred.userId);

      await tx.prediction.update({
        where: { id: pred.id },
        data: pts,
      });
    }

    // 3. Recalcular totales para evitar duplicar puntos al editar resultados
    await recalculateUserTotals(tx, [...affectedUserIds]);
  });

  // 4. Verificar rachas y bonos (fuera de la transacción principal)
  await processBonuses(matchId);

  // 5. Responder de inmediato — el leaderboard se reconstruye en background
  const io = req.app.get('io');
  res.json({
    message: `Resultado cargado: ${scoreHome}-${scoreAway}. Puntos calculados para ${match.predictions.length} pronósticos.`,
  });

  // 6. Reconstruir leaderboard y emitir socket en background (no bloquea la respuesta)
  rebuildLeaderboard()
    .then(async () => {
      if (io) {
        const topPlayers = await getTopN(10);
        io.to('global').emit('leaderboard:update', { matchId, topPlayers });
      }
    })
    .catch((err) => console.error('[rebuildLeaderboard background]', err.message));
};

// ─── Bonos por racha y día perfecto ──────────────────────────────────────────

const processBonuses = async (matchId) => {
  // Obtener todas las predicciones del partido recién finalizado
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { userId: true, pointsExact: true },
  });

  for (const pred of predictions) {
    if (pred.pointsExact < 5) continue; // Solo si acertó exacto

    // Buscar sus últimas 3 predicciones con resultado
    const last3 = await prisma.prediction.findMany({
      where: {
        userId: pred.userId,
        match: { status: 'FINISHED' },
      },
      orderBy: { match: { dateUtc: 'desc' } },
      take: 3,
      select: { pointsExact: true },
    });

    // Racha de 3 exactos seguidos
    if (last3.length === 3 && last3.every((p) => p.pointsExact >= 5)) {
      await prisma.user.update({
        where: { id: pred.userId },
        data: { totalPoints: { increment: STREAK_BONUS } },
      });

      await prisma.leaderboardEntry.updateMany({
        where: { userId: pred.userId },
        data: {
          bonusPoints: { increment: STREAK_BONUS },
          streak: { increment: 1 },
        },
      });
    }
  }
};

// ─── Reconstruir leaderboard cache ───────────────────────────────────────────

const NO_PICK_BONUS = 1; // 1 punto por partido finalizado sin pronóstico

const rebuildLeaderboard = async ({ recalculateTournament = true } = {}) => {
  if (recalculateTournament) {
    await recalculateTournamentPicks();
  }

  // Contar partidos finalizados para calcular el bono por no-apuesta
  const finishedMatchCount = await prisma.match.count({ where: { status: 'FINISHED' } });

  const users = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: {
      id: true,
      totalPoints: true,
      predictions: {
        // Solo partidos finalizados: scheduled tienen 0 pts y no cuentan para no-pick
        where: { match: { status: 'FINISHED' } },
        select: { matchId: true, pointsExact: true, pointsWinner: true, pointsBonus: true, pointsTotal: true },
      },
      tournamentPicks: {
        select: { pointsTotal: true },
      },
    },
  });

  // Calcular stats por usuario
  const stats = users.map((u) => {
    const matchPts = u.predictions.reduce((s, p) => s + p.pointsTotal, 0);
    // tournamentPicks es array (uno por grupo) → sumar todos
    const tournamentPts = u.tournamentPicks.reduce((s, tp) => s + (tp.pointsTotal || 0), 0);
    const streakBonusPts = Math.max(u.totalPoints - matchPts - tournamentPts, 0);
    // 1 pto por cada partido finalizado que no apostó (matchIds únicos para evitar contar duplicados entre grupos)
    const predictedMatchIds = new Set(u.predictions.map(p => p.matchId));
    const noPickPts = Math.max(finishedMatchCount - predictedMatchIds.size, 0) * NO_PICK_BONUS;
    return {
      userId: u.id,
      totalPoints: u.totalPoints + noPickPts,
      matchPoints: matchPts,
      tournamentPoints: tournamentPts,
      bonusPoints: streakBonusPts + noPickPts,
    };
  });

  // Ordenar y asignar rank
  stats.sort((a, b) => b.totalPoints - a.totalPoints);

  // Ranking GLOBAL (groupId = null). Prisma no admite null en el selector único
  // compuesto userId_groupId de un upsert (lanza "Argument groupId must not be null"),
  // lo que abortaba toda la función y dejaba sin reconstruir los rankings por grupo.
  // Por eso usamos updateMany (acepta null en el filtro) + create si no existe.
  await Promise.all(stats.map(async (s, i) => {
    const { userId, ...points } = s;
    const updated = await prisma.leaderboardEntry.updateMany({
      where: { userId, groupId: null },
      data: { ...points, rank: i + 1, lastUpdated: new Date() },
    });
    if (updated.count === 0) {
      await prisma.leaderboardEntry.create({
        data: { userId, groupId: null, ...points, rank: i + 1 },
      });
    }
  }));

  // Recalcular rankings por grupo reutilizando finishedMatchCount ya calculado
  const groups = await prisma.group.findMany({ select: { id: true } });
  await Promise.all(groups.map((g) => rebuildGroupLeaderboard(g.id, finishedMatchCount)));
};

const rebuildGroupLeaderboard = async (groupId, finishedMatchCount) => {
  // Partidos finalizados: reutilizar si viene del rebuild global, si no calcular
  if (finishedMatchCount === undefined) {
    finishedMatchCount = await prisma.match.count({ where: { status: 'FINISHED' } });
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });

  const stats = [];
  for (const member of members) {
    const predictions = await prisma.prediction.findMany({
      where: { userId: member.userId, groupId, match: { status: 'FINISHED' } },
      select: { pointsTotal: true },
    });
    const tournamentPicks = await prisma.tournamentPicks.findUnique({
      where: { userId_groupId: { userId: member.userId, groupId } },
      select: { pointsTotal: true },
    });

    const matchPoints = predictions.reduce((s, p) => s + p.pointsTotal, 0);
    const tournamentPoints = tournamentPicks?.pointsTotal || 0;
    // 1 pto por cada partido finalizado sin pronóstico en este grupo
    const noPickPoints = Math.max(finishedMatchCount - predictions.length, 0) * NO_PICK_BONUS;
    const totalPoints = matchPoints + tournamentPoints + noPickPoints;

    stats.push({ userId: member.userId, totalPoints, matchPoints, tournamentPoints, bonusPoints: noPickPoints });
  }

  const sorted = stats.sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < sorted.length; i++) {
    await prisma.leaderboardEntry.upsert({
      where: { userId_groupId: { userId: sorted[i].userId, groupId } },
      update: {
        totalPoints: sorted[i].totalPoints,
        matchPoints: sorted[i].matchPoints,
        tournamentPoints: sorted[i].tournamentPoints,
        bonusPoints: sorted[i].bonusPoints,
        rank: i + 1,
        lastUpdated: new Date(),
      },
      create: {
        userId: sorted[i].userId,
        groupId,
        totalPoints: sorted[i].totalPoints,
        matchPoints: sorted[i].matchPoints,
        tournamentPoints: sorted[i].tournamentPoints,
        bonusPoints: sorted[i].bonusPoints,
        rank: i + 1,
      },
    });
  }
};

const getTopN = async (n = 10) => {
  return prisma.leaderboardEntry.findMany({
    where: { groupId: null },
    orderBy: { rank: 'asc' },
    take: n,
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });
};

// ─── Otros endpoints admin ────────────────────────────────────────────────────

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  const [users, matches, predictions, groups, planFree, planClasico, planPro, openPool, finished, scheduled] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.match.count(),
    prisma.prediction.count(),
    prisma.group.count({ where: { isPublic: false } }),
    prisma.user.count({ where: { plan: 'FREE' } }),
    prisma.user.count({ where: { plan: 'CLASICO' } }),
    prisma.user.count({ where: { plan: 'PRO' } }),
    prisma.group.findFirst({ where: { isPublic: true }, select: { id: true, name: true, _count: { select: { members: true } } } }),
    prisma.match.count({ where: { status: 'FINISHED' } }),
    prisma.match.count({ where: { status: 'SCHEDULED' } }),
  ]);

  return res.json({
    stats: {
      users, matches, predictions, groups,
      finishedMatches: finished, scheduledMatches: scheduled,
      plans: { free: planFree, clasico: planClasico, pro: planPro },
      openPool,
    },
  });
};

// PUT /api/admin/matches/:matchId/status — Cambiar status (LIVE, etc.)
const setMatchStatus = async (req, res) => {
  const { matchId } = req.params;
  const { status } = req.body;

  const valid = ['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status },
  });

  // Emitir via socket
  const io = req.app.get('io');
  if (io) io.emit('match:status', { matchId, status });

  return res.json(match);
};

// POST /api/admin/tournament/awards — Cargar premios especiales del torneo
const setTournamentAwards = async (req, res) => {
  const result = await recalculateTournamentPicks(req.body || {});
  await rebuildLeaderboard({ recalculateTournament: false });

  return res.json({
    message: `Premios del torneo calculados para ${result.picksUpdated} usuarios`,
    ...result,
  });

  const {
    championId,
    finalist1Id,
    finalist2Id,
    round32TeamIds,
    round16TeamIds,
    semifinalistIds,
    quarterfinalistIds,
    groupQualifierIds,
    topScorerId,
    bestPlayerId,
    bestKeeperId,
    bestYoungId,
    totalGoals,
    mostGoalsTeamId,
    leastGoalsTeamId,
    hostFurthestId,
  } = req.body;

  // Calcular puntos para todos los que hicieron picks del torneo
  const allPicks = await prisma.tournamentPicks.findMany();

  for (const pick of allPicks) {
    let pts = {};

    pts.ptsChampion     = pick.champion === championId ? 30 : 0;
    pts.ptsFinalists    = [pick.finalist1, pick.finalist2].filter(
      (id) => [finalist1Id, finalist2Id].includes(id)
    ).length * 15;

    pts.ptsRound32      = (pick.round32Teams || []).filter(
      (id) => (round32TeamIds || []).includes(id)
    ).length * 1;

    pts.ptsRound16      = (pick.round16Teams || []).filter(
      (id) => (round16TeamIds || []).includes(id)
    ).length * 2;

    pts.ptsSemifinals   = (pick.semifinalists || []).filter(
      (id) => (semifinalistIds || []).includes(id)
    ).length * 8;

    pts.ptsQuarters     = (pick.quarterfinalists || []).filter(
      (id) => (quarterfinalistIds || []).includes(id)
    ).length * 4;

    pts.ptsGroups       = (pick.groupQualifiers || []).filter(
      (id) => (groupQualifierIds || []).includes(id)
    ).length * 1;

    // Premios individuales
    pts.ptsTopScorer    = pick.topScorerId === topScorerId ? 20
                        : (await sameTeam(pick.topScorerId, topScorerId)) ? 3 : 0;
    pts.ptsBestPlayer   = pick.bestPlayerId === bestPlayerId ? 15
                        : (await sameTeam(pick.bestPlayerId, bestPlayerId)) ? 4 : 0;
    pts.ptsBestKeeper   = pick.bestKeeperId === bestKeeperId ? 12
                        : (await sameTeam(pick.bestKeeperId, bestKeeperId)) ? 3 : 0;
    pts.ptsBestYoung    = pick.bestYoungId === bestYoungId ? 10
                        : (await sameTeam(pick.bestYoungId, bestYoungId)) ? 3 : 0;

    // Estadísticas
    const goalDiff = Math.abs((pick.totalGoals || 0) - (totalGoals || 0));
    pts.ptsTotalGoals   = goalDiff === 0 ? 8 : goalDiff <= 3 ? 4 : goalDiff <= 10 ? 1 : 0;
    pts.ptsTeamStats    = (pick.mostGoalsTeamId === mostGoalsTeamId ? 6 : 0)
                        + (pick.leastGoalsTeamId === leastGoalsTeamId ? 6 : 0);
    pts.ptsHostFurthest = pick.hostFurthest === hostFurthestId ? 5 : 0;

    pts.pointsTotal = Object.values(pts).reduce((s, v) => s + v, 0);

    // Idempotente: aplicar solo la DIFERENCIA respecto al último cálculo de este pick.
    // Así re-ejecutar la carga de resultados no vuelve a sumar los puntos del torneo
    // (1ª corrida: prev = 0 → suma normal; re-corrida con los mismos datos → delta 0).
    const prevTournamentPts = pick.pointsTotal || 0;
    const delta = pts.pointsTotal - prevTournamentPts;

    await prisma.tournamentPicks.update({
      where: { id: pick.id },
      data: pts,
    });

    if (delta !== 0) {
      await prisma.user.update({
        where: { id: pick.userId },
        data: { totalPoints: { increment: delta } },
      });
    }
  }

  await rebuildLeaderboard();

  return res.json({ message: `Premios del torneo calculados para ${allPicks.length} usuarios` });
};

// Helper: verificar si dos jugadores son del mismo equipo
const sameTeam = async (playerId1, playerId2) => {
  if (!playerId1 || !playerId2) return false;
  const [p1, p2] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId1 }, select: { teamId: true } }),
    prisma.player.findUnique({ where: { id: playerId2 }, select: { teamId: true } }),
  ]);
  return p1?.teamId === p2?.teamId;
};

const { syncMatches: syncMatchesUtil } = require('../utils/syncFootballData');

// POST /api/admin/sync — Sincronizar partidos desde football-data.org
const syncMatches = async (req, res) => {
  try {
    // 1. Obtener partidos no finalizados antes del sync
    const unfinishedMatches = await prisma.match.findMany({
      where: { status: { not: 'FINISHED' } },
      select: { id: true },
    });
    const unfinishedIds = unfinishedMatches.map((m) => m.id);

    // 2. Ejecutar la sincronización
    const result = await syncMatchesUtil();

    // 3. Obtener los que ahora pasaron a FINISHED
    const newlyFinishedMatches = await prisma.match.findMany({
      where: {
        id: { in: unfinishedIds },
        status: 'FINISHED',
      },
      include: {
        predictions: true,
      },
    });

    // 4. Los puntos base ya los calcula syncFootballData.
    // Aqui solo se procesan bonos que dependen de rachas al finalizar.
    for (const match of newlyFinishedMatches) {
      await processBonuses(match.id);
    }

    // 5. Reconstruir el leaderboard si hubo cambios
    await rebuildLeaderboard();

      // Emitir actualización por Socket.io si existe
      const io = req.app.get('io');
      if (io) {
        const topPlayers = await getTopN(10);
        io.to('global').emit('leaderboard:update', { topPlayers });
      }

    return res.json({ message: `Sincronización completa`, ...result, newlyFinished: newlyFinishedMatches.length });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Los mismos 15 checks que usa el frontend (TournamentPage.jsx líneas 165-181)
const TOURNAMENT_FIELD_LABELS = [
  { key: 'champion',        label: 'Campeón',          check: (p) => !!p.champion },
  { key: 'finalist1',       label: 'Finalista 1',       check: (p) => !!p.finalist1 },
  { key: 'finalist2',       label: 'Finalista 2',       check: (p) => !!p.finalist2 },
  { key: 'semifinalists',   label: 'Semifinalistas',    check: (p) => (p.semifinalists?.length || 0) > 0 },
  { key: 'quarterfinalists',label: 'Cuartos de final',  check: (p) => (p.quarterfinalists?.length || 0) > 0 },
  { key: 'round16Teams',    label: '8vos de final',     check: (p) => (p.round16Teams?.length || 0) > 0 },
  { key: 'round32Teams',    label: '16avos de final',   check: (p) => (p.round32Teams?.length || 0) > 0 },
  { key: 'hostFurthest',    label: 'Anfitrión más lejos', check: (p) => !!p.hostFurthest },
  { key: 'topScorerId',     label: 'Bota de Oro',       check: (p) => !!p.topScorerId },
  { key: 'bestPlayerId',    label: 'Balón de Oro',      check: (p) => !!p.bestPlayerId },
  { key: 'bestKeeperId',    label: 'Guante de Oro',     check: (p) => !!p.bestKeeperId },
  { key: 'bestYoungId',     label: 'Mejor Joven',       check: (p) => !!p.bestYoungId },
  { key: 'totalGoals',      label: 'Total de goles',    check: (p) => p.totalGoals != null },
  { key: 'mostGoalsTeamId', label: 'Equipo más goleador', check: (p) => !!p.mostGoalsTeamId },
  { key: 'leastGoalsTeamId',label: 'Equipo menos goles', check: (p) => !!p.leastGoalsTeamId },
];

// GET /api/admin/tournament/completion — Estado del pronóstico de torneo por grupo
const getTournamentCompletion = async (req, res) => {
  const groups = await prisma.group.findMany({
    where: { isPublic: false },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: { select: { id: true, username: true, email: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const result = await Promise.all(groups.map(async (group) => {
    const members = await Promise.all(group.members.map(async ({ user }) => {
      const picks = await prisma.tournamentPicks.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
        select: {
          champion: true, finalist1: true, finalist2: true,
          round32Teams: true, round16Teams: true, semifinalists: true,
          quarterfinalists: true, groupQualifiers: true,
          topScorerId: true, bestPlayerId: true, bestKeeperId: true, bestYoungId: true,
          totalGoals: true, mostGoalsTeamId: true, leastGoalsTeamId: true, hostFurthest: true,
          updatedAt: true,
        },
      });

      const missing = picks
        ? TOURNAMENT_FIELD_LABELS.filter(f => !f.check(picks)).map(f => f.label)
        : TOURNAMENT_FIELD_LABELS.map(f => f.label);

      const completedCount = TOURNAMENT_FIELD_LABELS.length - missing.length;

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        completed: missing.length === 0,
        completedCount,
        totalCount: TOURNAMENT_FIELD_LABELS.length,
        missing,
        updatedAt: picks?.updatedAt ?? null,
      };
    }));

    const completed = members.filter(m => m.completed).length;
    return {
      groupId: group.id,
      groupName: group.name,
      total: members.length,
      completed,
      pending: members.length - completed,
      members,
    };
  }));

  return res.json(result);
};

// GET /api/admin/users — Listar todos los usuarios
const getUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      plan: true,
      planActivatedAt: true,
      planExpiresAt: true,
      totalPoints: true,
      createdAt: true,
      _count: {
        select: {
          predictions: true,
          groupMemberships: true,
        },
      },
    },
  });
  return res.json(users);
};

// PATCH /api/admin/users/:id/plan — Cambiar plan manualmente
const setUserPlan = async (req, res) => {
  const { plan } = req.body;
  const validPlans = ['FREE', 'CLASICO', 'DT', 'PRO'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      plan,
      planActivatedAt: plan !== 'FREE' ? new Date() : null,
      planExpiresAt: null,
    },
    select: { id: true, username: true, plan: true, planActivatedAt: true },
  });

  // Actualizar maxMembers de sus grupos si baja de plan
  if (plan === 'FREE') {
    await prisma.group.updateMany({
      where: { creatorId: req.params.id, isPublic: false },
      data: { maxMembers: 3 },
    });
  }

  return res.json({ message: `Plan actualizado a ${plan}`, user });
};

// POST /api/admin/leaderboard/rebuild — Forzar reconstrucción del leaderboard (aplica regla no-pick)
const manualRebuildLeaderboard = async (req, res) => {
  try {
    await rebuildLeaderboard();
    return res.json({ message: 'Leaderboard reconstruido con éxito (incluye puntos por no-apostados)' });
  } catch (err) {
    console.error('Rebuild error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/broadcast — Enviar mensaje a todos los conectados
const manualRecalculateTournament = async (req, res) => {
  try {
    const result = await recalculateTournamentPicks(req.body || {});
    await rebuildLeaderboard({ recalculateTournament: false });
    return res.json({
      message: `Puntaje de torneo recalculado para ${result.picksUpdated} pronosticos`,
      ...result,
    });
  } catch (err) {
    console.error('Tournament recalc error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

const sendBroadcast = async (req, res) => {
  const { message, type = 'info' } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

  const io = req.app.get('io');
  if (io) {
    io.emit('notification:global', {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  return res.json({ message: 'Broadcast enviado con éxito' });
};

// GET /api/admin/tournament/deadline
const getAdminDeadline = (req, res) => {
  const deadline = getDeadline();
  res.json({ deadline, locked: isLocked() });
};

// POST /api/admin/tournament/deadline — { deadline: ISO string | "now" | "open" }
const setAdminDeadline = async (req, res) => {
  const { deadline } = req.body;
  if (!deadline) return res.status(400).json({ error: 'Campo deadline requerido' });

  let iso;
  if (deadline === 'now') {
    iso = new Date().toISOString();
  } else if (deadline === 'open') {
    // Abrir por 99 años — efectivamente siempre abierto
    const far = new Date();
    far.setFullYear(far.getFullYear() + 99);
    iso = far.toISOString();
  } else {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Fecha inválida' });
    iso = d.toISOString();
  }

  await setDeadline(iso); // persiste en BD → el cierre sobrevive reinicios
  return res.json({ deadline: iso, locked: isLocked() });
};

// GET /api/admin/tournament/changes?since=ISO — Pronósticos de torneo modificados
// después de una fecha (por defecto, después del deadline). Detecta cambios post-cierre.
const getTournamentChanges = async (req, res) => {
  const sinceRaw = req.query.since || getDeadline();
  const since = new Date(sinceRaw);
  if (isNaN(since.getTime())) return res.status(400).json({ error: 'Fecha "since" inválida' });

  const picks = await prisma.tournamentPicks.findMany({
    where: { updatedAt: { gt: since } },
    select: {
      userId: true,
      groupId: true,
      createdAt: true,
      updatedAt: true,
      user:  { select: { username: true, email: true } },
      group: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return res.json({
    since: since.toISOString(),
    deadline: getDeadline(),
    locked: isLocked(),
    count: picks.length,
    picks: picks.map((p) => ({
      username:  p.user?.username,
      email:     p.user?.email,
      group:     p.group?.name,
      groupId:   p.groupId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      // editado tras crearse (no es solo el guardado inicial)
      editadoTrasCrear: new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime() > 1000,
    })),
  });
};

// GET /api/admin/tournament/bracket-reopen — estado de la reapertura acotada de cruces
const getBracketReopenStatus = (req, res) => {
  res.json({
    active: isBracketReopen(),
    until: getBracketReopenUntil(),
    allowedEmails: getBracketReopenAllowedEmails(),
    allowedGroupNames: getBracketReopenAllowedGroupNames(),
  });
};

// POST /api/admin/tournament/bracket-reopen — { action: 'open' | 'close', hours? }
// Abre SOLO la edición de 4tos/semis/finalistas por una ventana (default 24h, auto-expira).
const setBracketReopenStatus = async (req, res) => {
  const { action, hours, allowedEmails, allowedGroupNames } = req.body || {};
  if (action === 'close') {
    await setBracketReopen(null);
  } else if (action === 'open') {
    const h = Number(hours) > 0 ? Number(hours) : 24;
    const until = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
    await setBracketReopen(
      until,
      allowedEmails === undefined ? [] : allowedEmails,
      allowedGroupNames === undefined ? BRACKET_REOPEN_GROUP_NAMES : allowedGroupNames
    );
  } else {
    return res.status(400).json({ error: 'action debe ser "open" o "close"' });
  }
  return res.json({
    active: isBracketReopen(),
    until: getBracketReopenUntil(),
    allowedEmails: getBracketReopenAllowedEmails(),
    allowedGroupNames: getBracketReopenAllowedGroupNames(),
  });
};

module.exports = {
  setMatchResult,
  setMatchStatus,
  setTournamentAwards,
  getTournamentCompletion,
  getDashboard,
  rebuildLeaderboard,
  manualRebuildLeaderboard,
  manualRecalculateTournament,
  syncMatches,
  getUsers,
  setUserPlan,
  sendBroadcast,
  getAdminDeadline,
  setAdminDeadline,
  getTournamentChanges,
  getBracketReopenStatus,
  setBracketReopenStatus,
};
