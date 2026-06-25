/**
 * Reconstruye el leaderboard completo (global + todos los grupos)
 * usando la misma lógica que el backend (incluyendo puntos no-pick, rank, etc.)
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const NO_PICK_BONUS = 1

const rebuildGroupLeaderboard = async (groupId, finishedMatchCount) => {
  if (finishedMatchCount === undefined) {
    finishedMatchCount = await prisma.match.count({ where: { status: 'FINISHED' } })
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true, user: { select: { username: true } } },
  })

  const stats = []
  for (const member of members) {
    const predictions = await prisma.prediction.findMany({
      where: { userId: member.userId, groupId, match: { status: 'FINISHED' } },
      select: { pointsTotal: true },
    })
    const tournamentPicks = await prisma.tournamentPicks.findUnique({
      where: { userId_groupId: { userId: member.userId, groupId } },
      select: { pointsTotal: true },
    })

    const matchPoints     = predictions.reduce((s, p) => s + p.pointsTotal, 0)
    const tournamentPoints = tournamentPicks?.pointsTotal || 0
    const noPickPoints    = Math.max(finishedMatchCount - predictions.length, 0) * NO_PICK_BONUS
    const totalPoints     = matchPoints + tournamentPoints + noPickPoints

    stats.push({
      userId: member.userId,
      username: member.user.username,
      totalPoints,
      matchPoints,
      tournamentPoints,
      bonusPoints: noPickPoints,
    })
  }

  const sorted = stats.sort((a, b) => b.totalPoints - a.totalPoints)

  for (let i = 0; i < sorted.length; i++) {
    const { username, ...data } = sorted[i]
    await prisma.leaderboardEntry.upsert({
      where: { userId_groupId: { userId: data.userId, groupId } },
      update:  { ...data, rank: i + 1, lastUpdated: new Date() },
      create:  { ...data, groupId, rank: i + 1 },
    })
    console.log(`  #${i + 1} ${username}: ${data.totalPoints} pts (match: ${data.matchPoints} + torneo: ${data.tournamentPoints} + no-pick: ${data.bonusPoints})`)
  }
}

async function main() {
  const finishedMatchCount = await prisma.match.count({ where: { status: 'FINISHED' } })
  console.log(`\n⚽ Partidos finalizados: ${finishedMatchCount}\n`)

  const groups = await prisma.group.findMany({ select: { id: true, name: true } })

  for (const group of groups) {
    console.log(`🏟️  Reconstruyendo ranking del grupo "${group.name}"...`)
    await rebuildGroupLeaderboard(group.id, finishedMatchCount)
    console.log()
  }

  // Global (groupId: null)
  console.log('🌍 Reconstruyendo ranking global...')
  const users = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: {
      id: true, username: true, totalPoints: true,
      predictions: {
        where: { match: { status: 'FINISHED' } },
        select: { matchId: true, pointsTotal: true },
      },
      tournamentPicks: { select: { pointsTotal: true } },
    },
  })

  const globalStats = users.map(u => {
    const matchPts       = u.predictions.reduce((s, p) => s + p.pointsTotal, 0)
    const tournamentPts  = u.tournamentPicks.reduce((s, tp) => s + (tp.pointsTotal || 0), 0)
    const predictedIds   = new Set(u.predictions.map(p => p.matchId))
    const noPickPts      = Math.max(finishedMatchCount - predictedIds.size, 0) * NO_PICK_BONUS
    return {
      userId: u.id,
      username: u.username,
      totalPoints:     u.totalPoints + noPickPts,
      matchPoints:     matchPts,
      tournamentPoints: tournamentPts,
      bonusPoints:     noPickPts,
    }
  }).sort((a, b) => b.totalPoints - a.totalPoints)

  // Para el ranking global (groupId: null) Prisma no acepta null en el where del upsert
  // → borrar y recrear
  const globalUserIds = globalStats.map(s => s.userId)
  await prisma.leaderboardEntry.deleteMany({ where: { groupId: null, userId: { in: globalUserIds } } })
  for (let i = 0; i < globalStats.length; i++) {
    const { username, ...data } = globalStats[i]
    await prisma.leaderboardEntry.create({ data: { ...data, groupId: null, rank: i + 1 } })
    console.log(`  #${i + 1} ${username}: ${data.totalPoints} pts`)
  }

  console.log('\n✅ Ranking reconstruido completamente.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
