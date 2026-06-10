#!/usr/bin/env node

/**
 * Corrige PSG vs Arsenal: el partido termino 1-1 y PSG gano 5-4 en penales.
 * Los penales no se suman al marcador; solo definen winnerId.
 */

const prisma = require('../src/utils/prisma');
const { calculatePredictionPoints } = require('../src/controllers/predictionController');

async function recalculateUserTotals(userIds) {
  for (const userId of userIds) {
    const [predictions, tournamentPicks] = await Promise.all([
      prisma.prediction.aggregate({
        where: { userId },
        _sum: { pointsTotal: true },
      }),
      prisma.tournamentPicks.aggregate({
        where: { userId },
        _sum: { pointsTotal: true },
      }),
    ]);

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: (predictions._sum.pointsTotal || 0) + (tournamentPicks._sum.pointsTotal || 0),
      },
    });
  }
}

async function rebuildGroupLeaderboards(groupIds) {
  for (const groupId of groupIds) {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const rows = [];
    for (const member of members) {
      const [predictions, tournamentPicks] = await Promise.all([
        prisma.prediction.aggregate({
          where: { userId: member.userId, groupId },
          _sum: { pointsTotal: true },
        }),
        prisma.tournamentPicks.findUnique({
          where: { userId_groupId: { userId: member.userId, groupId } },
          select: { pointsTotal: true },
        }),
      ]);

      const matchPoints = predictions._sum.pointsTotal || 0;
      const tournamentPoints = tournamentPicks?.pointsTotal || 0;
      rows.push({
        userId: member.userId,
        totalPoints: matchPoints + tournamentPoints,
        matchPoints,
        tournamentPoints,
      });
    }

    rows.sort((a, b) => b.totalPoints - a.totalPoints);
    for (let i = 0; i < rows.length; i++) {
      await prisma.leaderboardEntry.upsert({
        where: { userId_groupId: { userId: rows[i].userId, groupId } },
        update: { ...rows[i], rank: i + 1, lastUpdated: new Date() },
        create: { ...rows[i], rank: i + 1, groupId },
      });
    }
  }
}

async function rebuildGlobalLeaderboard() {
  const users = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: {
      id: true,
      predictions: { select: { pointsTotal: true } },
      tournamentPicks: { select: { pointsTotal: true } },
    },
  });

  const rows = users.map((user) => {
    const matchPoints = user.predictions.reduce((sum, pred) => sum + pred.pointsTotal, 0);
    const tournamentPoints = user.tournamentPicks.reduce((sum, picks) => sum + picks.pointsTotal, 0);
    return {
      userId: user.id,
      totalPoints: matchPoints + tournamentPoints,
      matchPoints,
      tournamentPoints,
      bonusPoints: 0,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < rows.length; i++) {
    const existing = await prisma.leaderboardEntry.findFirst({
      where: { userId: rows[i].userId, groupId: null },
    });

    if (existing) {
      await prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: { ...rows[i], rank: i + 1, lastUpdated: new Date() },
      });
    } else {
      await prisma.leaderboardEntry.create({
        data: { ...rows[i], rank: i + 1, groupId: null },
      });
    }
  }
}

async function main() {
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { teamHome: { code: 'PSG' }, teamAway: { code: 'ARS' } },
        { teamHome: { name: { contains: 'Paris' } }, teamAway: { code: 'ARS' } },
      ],
    },
    include: {
      teamHome: true,
      teamAway: true,
      predictions: true,
    },
    orderBy: { dateUtc: 'desc' },
  });

  if (!match) throw new Error('No encontre PSG vs Arsenal');

  const psg = match.teamHome?.code === 'PSG' || match.teamHome?.name?.toLowerCase().includes('paris')
    ? match.teamHome
    : match.teamAway;

  if (!psg) throw new Error('No pude identificar PSG');

  const fixedMatch = {
    ...match,
    scoreHome: 1,
    scoreAway: 1,
    wentToPenalties: true,
    winnerId: psg.id,
    status: 'FINISHED',
  };

  const affectedUserIds = new Set();
  const affectedGroupIds = new Set();

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        scoreHome: 1,
        scoreAway: 1,
        wentToPenalties: true,
        winnerId: psg.id,
        status: 'FINISHED',
      },
    });

    for (const pred of match.predictions) {
      const points = calculatePredictionPoints(pred, fixedMatch);
      affectedUserIds.add(pred.userId);
      affectedGroupIds.add(pred.groupId);
      await tx.prediction.update({
        where: { id: pred.id },
        data: points,
      });
    }
  });

  await recalculateUserTotals([...affectedUserIds]);
  await rebuildGroupLeaderboards([...affectedGroupIds]);
  await rebuildGlobalLeaderboard();

  console.log('PSG vs Arsenal corregido a 1-1, penales: PSG 5-4.');
  console.log(`Predicciones recalculadas: ${match.predictions.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
