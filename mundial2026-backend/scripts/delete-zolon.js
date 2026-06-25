const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const zolon = await prisma.user.findFirst({
    where: { username: { equals: 'Zolon', mode: 'insensitive' } },
    include: {
      predictions: true,
      groupMemberships: { include: { group: true } },
      tournamentPicks: true,
    }
  })

  if (!zolon) return console.log('❌ No se encontró usuario Zolon')

  console.log(`🗑️  Eliminando usuario: ${zolon.username} (${zolon.email})`)
  console.log(`   Predicciones propias:   ${zolon.predictions.length}`)
  console.log(`   Membresías de grupos:   ${zolon.groupMemberships.map(m => m.group.name).join(', ')}`)
  console.log(`   Tournament picks:       ${zolon.tournamentPicks.length}`)

  // Prisma cascade borra automáticamente: predictions, groupMemberships, tournamentPicks, leaderboardEntries, refreshTokens
  await prisma.user.delete({ where: { id: zolon.id } })

  console.log('\n✅ Usuario Zolon eliminado correctamente.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
