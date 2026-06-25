const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'zolon', mode: 'insensitive' } },
        { username: { contains: 'zolo', mode: 'insensitive' } },
      ]
    },
    select: { id: true, username: true, email: true, totalPoints: true, createdAt: true }
  })
  console.log('Usuarios encontrados:')
  users.forEach(u => console.log(`  id: ${u.id} | username: ${u.username} | email: ${u.email} | pts: ${u.totalPoints} | creado: ${u.createdAt.toISOString()}`))

  // Mostrar todos los usuarios para referencia
  const all = await prisma.user.findMany({ select: { id: true, username: true, totalPoints: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
  console.log('\nTodos los usuarios:')
  all.forEach(u => console.log(`  username: ${u.username} | pts: ${u.totalPoints} | creado: ${u.createdAt.toISOString()}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
