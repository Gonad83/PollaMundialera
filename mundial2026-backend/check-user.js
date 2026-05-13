const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'gonaraos@gmail.com';
  const username = 'Gonzalo';
  
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    console.log('CONFLICT FOUND:', {
      username: existing.username,
      email: existing.email
    });
  } else {
    console.log('NO CONFLICT FOUND');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
