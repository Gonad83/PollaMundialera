#!/usr/bin/env node

/**
 * Corrige Belgica vs Senegal:
 * - marcador valido para puntaje: 2-2 en los 90 min
 * - marcador tras prorroga: Belgica 3-2 Senegal
 *
 * El calculo de puntos usa scoreHome/scoreAway. extraTimeHome/extraTimeAway
 * solo explica quien avanzo.
 */

const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

async function main() {
  const match = await prisma.match.findFirst({
    where: {
      phase: 'R32',
      OR: [
        { teamHome: { code: 'BEL' }, teamAway: { code: 'SEN' } },
        { teamHome: { code: 'SEN' }, teamAway: { code: 'BEL' } },
      ],
    },
    include: {
      teamHome: true,
      teamAway: true,
      predictions: true,
    },
    orderBy: { dateUtc: 'desc' },
  });

  if (!match) throw new Error('No encontre Belgica vs Senegal en 16avos');

  const belgium = match.teamHome?.code === 'BEL' ? match.teamHome : match.teamAway;
  if (!belgium) throw new Error('No pude identificar Belgica');

  const belIsHome = match.teamHome?.code === 'BEL';
  const fixedMatch = {
    ...match,
    scoreHome: 2,
    scoreAway: 2,
    extraTimeHome: belIsHome ? 3 : 2,
    extraTimeAway: belIsHome ? 2 : 3,
    wentToPenalties: false,
    penaltyHome: null,
    penaltyAway: null,
    winnerId: belgium.id,
    status: 'FINISHED',
  };

  const affectedUserIds = new Set();

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        scoreHome: fixedMatch.scoreHome,
        scoreAway: fixedMatch.scoreAway,
        extraTimeHome: fixedMatch.extraTimeHome,
        extraTimeAway: fixedMatch.extraTimeAway,
        wentToPenalties: false,
        penaltyHome: null,
        penaltyAway: null,
        winnerId: belgium.id,
        status: 'FINISHED',
      },
    });

    for (const pred of match.predictions) {
      const points = calculatePredictionPoints(pred, fixedMatch);
      affectedUserIds.add(pred.userId);
      await tx.prediction.update({
        where: { id: pred.id },
        data: points,
      });
    }
  });

  await recalculateUserTotals([...affectedUserIds]);
  await prisma.$disconnect();

  execFileSync(process.execPath, [path.join(__dirname, 'rebuild-leaderboard.js')], { stdio: 'inherit' });

  console.log('Belgica vs Senegal corregido: 2-2 en 90 min, Belgica 3-2 en prorroga.');
  console.log(`Predicciones recalculadas: ${match.predictions.length}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
