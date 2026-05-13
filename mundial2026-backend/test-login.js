const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'garaosd@gmail.com';
  const password = '19520000';
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('USER NOT FOUND');
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  console.log('User details:', {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    passwordHash: user.passwordHash ? 'EXISTS' : 'EMPTY'
  });
  console.log('Is password valid (19520000)?', valid);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
