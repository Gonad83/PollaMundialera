const { z } = require('zod');
const prisma = require('../utils/prisma');
const { calculatePredictionPoints } = require('./predictionController');

// ─── Schema ───────────────────────────────────────────────────────────────────

const matchResultSchema = z.object({
  scoreHome: z.number().int().min(0).max(20),
  scoreAway: z.number().int().min(0).max(20),
  firstScorerId: z.string().optional().nullable(),
  wentToPenalties: z.boolean().default(false),
  winnerId: z.string().optional().nullable(),
});

const STREAK_BONUS = 5;  // Puntos por racha de 3 exactos seguidos
const PERFECT_DAY_BONUS = 10; // Todos los partidos de una jornada

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

  const { scoreHome, scoreAway, firstScorerId, wentToPenalties, winnerId } = parsed.data;
  const isDraw = scoreHome === scoreAway;
  const resolvedWinnerId = isDraw
    ? (wentToPenalties ? winnerId : null)
    : (scoreHome > scoreAway ? match.teamHomeId : match.teamAwayId);

  if (wentToPenalties && isDraw && !resolvedWinnerId) {
    return res.status(400).json({ error: 'Selecciona el ganador por penales' });
  }

  // Enriquecer el match con el primer goleador para el cálculo
  const matchWithScorer = { ...match, firstScorerId, scoreHome, scoreAway, wentToPenalties, winnerId: resolvedWinnerId };

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
      const pts = calculatePredictionPoints(pred, matchWithScorer);
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

  // 5. Reconstruir el leaderboard
  await rebuildLeaderboard();

  // 6. Emitir actualización por Socket.io
  const io = req.app.get('io');
  if (io) {
    const topPlayers = await getTopN(10);
    io.to('global').emit('leaderboard:update', { matchId, topPlayers });
  }

  return res.json({
    message: `Resultado cargado: ${scoreHome}-${scoreAway}. Puntos calculados para ${match.predictions.length} pronósticos.`,
  });
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

const rebuildLeaderboard = async () => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: {
      id: true,
      totalPoints: true,
      predictions: {
        select: { pointsExact: true, pointsWinner: true, pointsBonus: true, pointsTotal: true },
      },
      tournamentPicks: {
        select: { pointsTotal: true },
      },
    },
  });

  // Calcular stats por usuario
  const stats = users.map((u) => {
    const matchPts = u.predictions.reduce((s, p) => s + p.pointsTotal, 0);
    const tournamentPts = u.tournamentPicks?.pointsTotal || 0;
    const bonusPts = u.totalPoints - matchPts - tournamentPts;
    return {
      userId: u.id,
      totalPoints: u.totalPoints,
      matchPoints: matchPts,
      tournamentPoints: tournamentPts,
      bonusPoints: Math.max(bonusPts, 0),
    };
  });

  // Ordenar y asignar rank
  stats.sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < stats.length; i++) {
    const existing = await prisma.leaderboardEntry.findFirst({
      where: { userId: stats[i].userId, groupId: null },
    });

    if (existing) {
      await prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: { ...stats[i], rank: i + 1, lastUpdated: new Date() },
      });
    } else {
      await prisma.leaderboardEntry.create({
        data: { ...stats[i], rank: i + 1, groupId: null },
      });
    }
  }

  // Recalcular rankings por grupo
  const groups = await prisma.group.findMany({ select: { id: true } });
  for (const group of groups) {
    await rebuildGroupLeaderboard(group.id);
  }
};

const rebuildGroupLeaderboard = async (groupId) => {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });

  const stats = [];
  for (const member of members) {
    const predictions = await prisma.prediction.findMany({
      where: { userId: member.userId, groupId },
      select: { pointsTotal: true },
    });
    const tournamentPicks = await prisma.tournamentPicks.findUnique({
      where: { userId_groupId: { userId: member.userId, groupId } },
      select: { pointsTotal: true },
    });

    const matchPoints = predictions.reduce((s, p) => s + p.pointsTotal, 0);
    const tournamentPoints = tournamentPicks?.pointsTotal || 0;
    const totalPoints = matchPoints + tournamentPoints;

    stats.push({ userId: member.userId, totalPoints, matchPoints, tournamentPoints });
  }

  const sorted = stats.sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < sorted.length; i++) {
    await prisma.leaderboardEntry.upsert({
      where: { userId_groupId: { userId: sorted[i].userId, groupId } },
      update: {
        totalPoints: sorted[i].totalPoints,
        matchPoints: sorted[i].matchPoints,
        tournamentPoints: sorted[i].tournamentPoints,
        rank: i + 1,
        lastUpdated: new Date(),
      },
      create: {
        userId: sorted[i].userId,
        groupId,
        totalPoints: sorted[i].totalPoints,
        matchPoints: sorted[i].matchPoints,
        tournamentPoints: sorted[i].tournamentPoints,
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
  const [users, matches, predictions, groups, planFree, planClasico, planPro, openPool] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.match.count(),
    prisma.prediction.count(),
    prisma.group.count({ where: { isPublic: false } }),
    prisma.user.count({ where: { plan: 'FREE' } }),
    prisma.user.count({ where: { plan: 'CLASICO' } }),
    prisma.user.count({ where: { plan: 'PRO' } }),
    prisma.group.findFirst({ where: { isPublic: true }, select: { id: true, name: true, _count: { select: { members: true } } } }),
  ]);

  const finished = await prisma.match.count({ where: { status: 'FINISHED' } });
  const scheduled = await prisma.match.count({ where: { status: 'SCHEDULED' } });

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
  const {
    championId,
    finalist1Id,
    finalist2Id,
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

    await prisma.tournamentPicks.update({
      where: { id: pick.id },
      data: pts,
    });

    await prisma.user.update({
      where: { id: pick.userId },
      data: { totalPoints: { increment: pts.pointsTotal } },
    });
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
    const { simulateFinished } = req.query;

    // 1. Obtener partidos no finalizados antes del sync
    const unfinishedMatches = await prisma.match.findMany({
      where: { status: { not: 'FINISHED' } },
      select: { id: true },
    });
    const unfinishedIds = unfinishedMatches.map((m) => m.id);

    // 2. Ejecutar la sincronización
    const result = await syncMatchesUtil({ simulateFinished: simulateFinished === 'true' });

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

    // 4. Procesar resultados y puntos para cada uno
    for (const match of newlyFinishedMatches) {
      const matchWithScorer = { ...match, firstScorerId: null };

      await prisma.$transaction(async (tx) => {
        for (const pred of match.predictions) {
          const pts = calculatePredictionPoints(pred, matchWithScorer);

          await tx.prediction.update({
            where: { id: pred.id },
            data: pts,
          });

          // Actualizar puntos totales del usuario
          await tx.user.update({
            where: { id: pred.userId },
            data: { totalPoints: { increment: pts.pointsTotal } },
          });
        }
      });

      // Procesar bonos/rachas
      await processBonuses(match.id);
    }

    // 5. Reconstruir el leaderboard si hubo cambios
    if (newlyFinishedMatches.length > 0) {
      await rebuildLeaderboard();

      // Emitir actualización por Socket.io si existe
      const io = req.app.get('io');
      if (io) {
        const topPlayers = await getTopN(10);
        io.to('global').emit('leaderboard:update', { topPlayers });
      }
    }

    return res.json({ message: `Sincronización completa`, ...result, newlyFinished: newlyFinishedMatches.length });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ error: err.message });
  }
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

// POST /api/admin/broadcast — Enviar mensaje a todos los conectados
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

module.exports = {
  setMatchResult,
  setMatchStatus,
  setTournamentAwards,
  getDashboard,
  rebuildLeaderboard,
  syncMatches,
  getUsers,
  setUserPlan,
  sendBroadcast,
};
