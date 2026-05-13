const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'gonaraos@gmail.com';
  const username = 'Gonzalo';
  const password = '19520000'; // Defaulting to the same for convenience or let user reset
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email,
      username,
      passwordHash: hashedPassword,
    }
  });

  // Global Leaderboard
  const lb = await prisma.leaderboardEntry.findFirst({
    where: { userId: user.id, groupId: null }
  });
  if (!lb) {
    await prisma.leaderboardEntry.create({
      data: { userId: user.id, groupId: null, rank: 0 }
    });
  }

  console.log(`User ${user.email} manual registration SUCCESS.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
