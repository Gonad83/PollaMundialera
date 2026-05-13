const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'garaosd@gmail.com';
  const password = '19520000';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      email,
      username: 'garaosd',
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log(`User ${user.email} updated/created and set to ADMIN.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
