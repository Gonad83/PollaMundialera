#!/usr/bin/env node

/**
 * Limpieza de datos de prueba:
 * - Borra la final PSG vs Arsenal usada como prueba de Champions.
 * - Borra amistosos del 10 de junio de 2026 en horario de Chile.
 * - Reinicia todos los puntajes calculados y caches de ranking.
 *
 * Ejecutar en Railway desde /app:
 *   node scripts/cleanup-test-data.js
 */

const { Prisma } = require('@prisma/client');
const prisma = require('../src/utils/prisma');

const CHILE_OFFSET = '-04:00';
const FRIENDLIES_START = new Date(`2026-06-10T00:00:00${CHILE_OFFSET}`);
const FRIENDLIES_END = new Date(`2026-06-11T00:00:00${CHILE_OFFSET}`);

async function findMatchesToDelete() {
  return prisma.$queryRaw`
    SELECT DISTINCT m."id"
    FROM "Match" m
    JOIN "Team" home ON home."id" = m."teamHomeId"
    JOIN "Team" away ON away."id" = m."teamAwayId"
    WHERE
      (
        (home."code" = 'PSG' AND away."code" = 'ARS')
        OR (away."code" = 'PSG' AND home."code" = 'ARS')
        OR (LOWER(home."name") LIKE '%paris%' AND away."code" = 'ARS')
        OR (LOWER(away."name") LIKE '%paris%' AND home."code" = 'ARS')
      )
      OR (
        m."phase"::text = 'FRIENDLY'
      )
      OR (
        m."phase"::text = 'GROUP'
        AND m."groupLetter" IS NULL
        AND COALESCE(m."city", '') <> 'World'
        AND m."dateUtc" >= ${FRIENDLIES_START}
        AND m."dateUtc" < ${FRIENDLIES_END}
      )
  `;
}

async function main() {
  const matches = await findMatchesToDelete();
  const matchIds = matches.map((m) => m.id);

  const summary = await prisma.$transaction(async (tx) => {
    let deletedPredictions = 0;
    let deletedMatches = 0;

    if (matchIds.length > 0) {
      deletedPredictions = await tx.$executeRaw`
        DELETE FROM "Prediction"
        WHERE "matchId" IN (${Prisma.join(matchIds)})
      `;

      deletedMatches = await tx.$executeRaw`
        DELETE FROM "Match"
        WHERE "id" IN (${Prisma.join(matchIds)})
      `;
    }

    const resetPredictions = await tx.prediction.updateMany({
      data: {
        pointsExact: 0,
        pointsWinner: 0,
        pointsBonus: 0,
        pointsTotal: 0,
      },
    });

    const resetTournamentPicks = await tx.tournamentPicks.updateMany({
      data: {
        ptsChampion: 0,
        ptsFinalists: 0,
        ptsSemifinals: 0,
        ptsQuarters: 0,
        ptsGroups: 0,
        ptsTopScorer: 0,
        ptsBestPlayer: 0,
        ptsBestKeeper: 0,
        ptsBestYoung: 0,
        ptsTotalGoals: 0,
        ptsTeamStats: 0,
        ptsHostFurthest: 0,
        pointsTotal: 0,
      },
    });

    const resetUsers = await tx.user.updateMany({
      data: { totalPoints: 0 },
    });

    const resetLeaderboards = await tx.leaderboardEntry.updateMany({
      data: {
        totalPoints: 0,
        matchPoints: 0,
        tournamentPoints: 0,
        bonusPoints: 0,
        streak: 0,
        lastUpdated: new Date(),
      },
    });

    return {
      matchesFound: matchIds.length,
      deletedMatches: Number(deletedMatches),
      deletedPredictions: Number(deletedPredictions),
      resetPredictions: resetPredictions.count,
      resetTournamentPicks: resetTournamentPicks.count,
      resetUsers: resetUsers.count,
      resetLeaderboards: resetLeaderboards.count,
    };
  });

  console.log('Limpieza completada:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error('Error limpiando datos de prueba:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
