const prisma = require('./src/utils/prisma');
prisma.refreshToken.deleteMany()
  .then(r => { console.log('Tokens borrados:', r.count); })
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
