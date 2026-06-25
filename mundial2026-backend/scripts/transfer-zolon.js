/**
 * Script: transfer-zolon.js
 * Transfiere predicciones de "zolon" (cuenta sin acceso) a "zolon2" (nueva cuenta).
 * Solo transfiere predicciones hasta el partido IRAN vs NEW ZEALAND (inclusive).
 *
 * Uso:
 *   node scripts/transfer-zolon.js --dry-run   (solo muestra qué haría)
 *   node scripts/transfer-zolon.js              (ejecuta la transferencia)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(DRY_RUN ? '\n⚠️  MODO DRY-RUN — no se escribe nada\n' : '\n🚀 MODO REAL — ejecutando cambios\n')

  // ── 1. Buscar ambos usuarios ────────────────────────────────────────────────
  const zolon  = await prisma.user.findFirst({ where: { username: { contains: 'zolon',  mode: 'insensitive' } } })
  const zolon2 = await prisma.user.findFirst({ where: { username: { contains: 'zolon2', mode: 'insensitive' } } })

  if (!zolon)  return console.error('❌ No se encontró usuario "zolon"')
  if (!zolon2) return console.error('❌ No se encontró usuario "zolon2"')

  console.log(`✅ zolon  → id: ${zolon.id}  username: ${zolon.username}  email: ${zolon.email}`)
  console.log(`✅ zolon2 → id: ${zolon2.id}  username: ${zolon2.username}  email: ${zolon2.email}`)
  console.log()

  // ── 2. Buscar partido IRAN vs NEW ZEALAND ──────────────────────────────────
  const iranMatch = await prisma.match.findFirst({
    where: {
      OR: [
        {
          teamHome: { code: { in: ['IRN', 'IRI', 'IRAN'] } },
          teamAway: { code: { in: ['NZL', 'NZE', 'NED', 'NEZ'] } },
        },
        {
          teamHome: { code: { in: ['NZL', 'NZE'] } },
          teamAway: { code: { in: ['IRN', 'IRI', 'IRAN'] } },
        },
        {
          teamHome: { name: { contains: 'Iran', mode: 'insensitive' } },
          teamAway: { name: { contains: 'Zealand', mode: 'insensitive' } },
        },
        {
          teamHome: { name: { contains: 'Zealand', mode: 'insensitive' } },
          teamAway: { name: { contains: 'Iran', mode: 'insensitive' } },
        },
      ],
    },
    include: { teamHome: true, teamAway: true },
    orderBy: { dateUtc: 'asc' },
  })

  if (!iranMatch) {
    console.log('⚠️  No se encontró el partido IRAN vs NEW ZEALAND')
    console.log('    Buscando partidos que contengan Iran o Nueva Zelanda...')
    const related = await prisma.match.findMany({
      where: {
        OR: [
          { teamHome: { name: { contains: 'Iran', mode: 'insensitive' } } },
          { teamAway: { name: { contains: 'Iran', mode: 'insensitive' } } },
          { teamHome: { name: { contains: 'Zealand', mode: 'insensitive' } } },
          { teamAway: { name: { contains: 'Zealand', mode: 'insensitive' } } },
        ],
      },
      include: { teamHome: true, teamAway: true },
      orderBy: { dateUtc: 'asc' },
    })
    related.forEach(m => console.log(`   ${m.dateUtc.toISOString()} | ${m.teamHome.name} vs ${m.teamAway.name} | status: ${m.status}`))
    return
  }

  console.log(`⚽ Partido límite: ${iranMatch.teamHome.name} vs ${iranMatch.teamAway.name}`)
  console.log(`   Fecha: ${iranMatch.dateUtc.toISOString()} | Status: ${iranMatch.status}\n`)

  // ── 3. Predicciones de zolon hasta ese partido (inclusive) ─────────────────
  const zolonPreds = await prisma.prediction.findMany({
    where: {
      userId: zolon.id,
      match: { dateUtc: { lte: iranMatch.dateUtc } },
    },
    include: {
      match: { include: { teamHome: true, teamAway: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { match: { dateUtc: 'asc' } },
  })

  console.log(`📋 Predicciones de ${zolon.username} (hasta ${iranMatch.teamHome.name} vs ${iranMatch.teamAway.name}): ${zolonPreds.length}`)
  for (const p of zolonPreds) {
    const g = p.group ? `[${p.group.name}]` : '[sin grupo]'
    console.log(`   ${g} ${p.match.teamHome.name} vs ${p.match.teamAway.name}: ${p.predHome}-${p.predAway} | pts: ${p.pointsTotal} | locked: ${p.lockedAt ? 'sí' : 'no'}`)
  }
  console.log()

  // ── 4. Predicciones que zolon2 YA tiene (para saber conflictos) ────────────
  const zolon2Preds = await prisma.prediction.findMany({
    where: { userId: zolon2.id },
    include: { match: { include: { teamHome: true, teamAway: true } } },
  })

  const zolon2PredSet = new Set(zolon2Preds.map(p => `${p.matchId}__${p.groupId ?? 'null'}`))

  console.log(`📋 Predicciones que zolon2 YA tiene: ${zolon2Preds.length}`)

  const toTransfer = zolonPreds.filter(p => !zolon2PredSet.has(`${p.matchId}__${p.groupId ?? 'null'}`))
  const conflicts  = zolonPreds.filter(p =>  zolon2PredSet.has(`${p.matchId}__${p.groupId ?? 'null'}`))

  console.log(`\n✅ Para transferir (zolon2 NO tiene predicción): ${toTransfer.length}`)
  console.log(`⚠️  Conflictos (zolon2 YA apostó ese partido):   ${conflicts.length}`)

  if (conflicts.length > 0) {
    console.log('\n   Conflictos (se mantiene la apuesta de zolon2):')
    conflicts.forEach(p => {
      const z2 = zolon2Preds.find(q => q.matchId === p.matchId && q.groupId === p.groupId)
      console.log(`   - ${p.match.teamHome.name} vs ${p.match.teamAway.name}`)
      console.log(`     zolon:  ${p.predHome}-${p.predAway} (${p.pointsTotal} pts)`)
      console.log(`     zolon2: ${z2.predHome}-${z2.predAway} (${z2.pointsTotal} pts)`)
    })
  }

  // ── 5. Grupos donde zolon está pero zolon2 no ──────────────────────────────
  const zolonGroups  = await prisma.groupMember.findMany({ where: { userId: zolon.id  }, include: { group: true } })
  const zolon2Groups = await prisma.groupMember.findMany({ where: { userId: zolon2.id }, include: { group: true } })
  const zolon2GroupIds = new Set(zolon2Groups.map(m => m.groupId))
  const groupsToAdd  = zolonGroups.filter(m => !zolon2GroupIds.has(m.groupId))

  console.log(`\n🏟️  Grupos de zolon:  ${zolonGroups.map(m => m.group.name).join(', ') || '(ninguno)'}`)
  console.log(`🏟️  Grupos de zolon2: ${zolon2Groups.map(m => m.group.name).join(', ') || '(ninguno)'}`)

  if (groupsToAdd.length > 0) {
    console.log(`\n   Grupos donde se agregará zolon2: ${groupsToAdd.map(m => m.group.name).join(', ')}`)
  }

  // ── 6. Puntos a transferir ─────────────────────────────────────────────────
  const totalPtsToTransfer = toTransfer.reduce((s, p) => s + p.pointsTotal, 0)
  console.log(`\n💰 Puntos totales a transferir: ${totalPtsToTransfer}`)
  console.log(`   (zolon2 tiene actualmente ${zolon2.totalPoints} pts en User.totalPoints)`)

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Nada fue modificado. Corre sin --dry-run para aplicar los cambios.')
    return
  }

  // ── 7. EJECUTAR TRANSFERENCIA ──────────────────────────────────────────────
  console.log('\n⚙️  Ejecutando transferencia...\n')

  // 7a. Agregar zolon2 a grupos donde no está
  for (const membership of groupsToAdd) {
    await prisma.groupMember.create({
      data: { userId: zolon2.id, groupId: membership.groupId }
    })
    console.log(`✅ zolon2 agregado al grupo "${membership.group.name}"`)
  }

  // 7b. Transferir predicciones (las que no tienen conflicto)
  let transferred = 0
  for (const pred of toTransfer) {
    await prisma.prediction.create({
      data: {
        userId:        zolon2.id,
        matchId:       pred.matchId,
        groupId:       pred.groupId,
        predHome:      pred.predHome,
        predAway:      pred.predAway,
        predScorerId:  pred.predScorerId,
        predBtts:      pred.predBtts,
        predOverUnder: pred.predOverUnder,
        predPenalties: pred.predPenalties,
        predWinnerId:  pred.predWinnerId,
        pointsExact:   pred.pointsExact,
        pointsWinner:  pred.pointsWinner,
        pointsBonus:   pred.pointsBonus,
        pointsTotal:   pred.pointsTotal,
        lockedAt:      pred.lockedAt,
        createdAt:     pred.createdAt,
      }
    })
    transferred++
    const g = pred.group ? `[${pred.group.name}]` : '[sin grupo]'
    console.log(`✅ ${g} ${pred.match.teamHome.name} vs ${pred.match.teamAway.name}: ${pred.predHome}-${pred.predAway} → ${pred.pointsTotal} pts`)
  }

  // 7c. Recalcular totalPoints de zolon2 en User
  const allZolon2Preds = await prisma.prediction.findMany({ where: { userId: zolon2.id } })
  const newTotalPts = allZolon2Preds.reduce((s, p) => s + p.pointsTotal, 0)
  await prisma.user.update({ where: { id: zolon2.id }, data: { totalPoints: newTotalPts } })

  // 7d. Actualizar LeaderboardEntry para todos los grupos de zolon2
  const allZolon2Groups = await prisma.groupMember.findMany({ where: { userId: zolon2.id } })
  for (const membership of allZolon2Groups) {
    const groupPreds = allZolon2Preds.filter(p => p.groupId === membership.groupId)
    const groupMatchPts = groupPreds.reduce((s, p) => s + p.pointsTotal, 0)
    await prisma.leaderboardEntry.upsert({
      where: { userId_groupId: { userId: zolon2.id, groupId: membership.groupId } },
      update: { matchPoints: groupMatchPts, totalPoints: groupMatchPts, lastUpdated: new Date() },
      create: {
        userId:       zolon2.id,
        groupId:      membership.groupId,
        rank:         999,
        totalPoints:  groupMatchPts,
        matchPoints:  groupMatchPts,
        tournamentPoints: 0,
        bonusPoints:  0,
        streak:       0,
        lastUpdated:  new Date(),
      }
    })
    console.log(`📊 Leaderboard grupo "${membership.groupId}": ${groupMatchPts} pts actualizados`)
  }

  console.log(`\n🎉 Transferencia completa!`)
  console.log(`   Predicciones transferidas: ${transferred}`)
  console.log(`   totalPoints de zolon2 actualizado a: ${newTotalPts}`)
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
