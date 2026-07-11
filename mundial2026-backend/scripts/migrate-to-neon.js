/**
 * Copia todos los datos de la BD actual (Railway) a una BD nueva (Neon u otra Postgres).
 * El schema debe existir ya en destino (correr `npx prisma db push` ahí antes).
 *
 * Uso:
 *   SOURCE_DATABASE_URL="postgres://...railway..." TARGET_DATABASE_URL="postgres://...neon..." node scripts/migrate-to-neon.js
 */
const { PrismaClient } = require('@prisma/client');

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DATABASE_URL || !TARGET_DATABASE_URL) {
  console.error('Faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL en el entorno.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_DATABASE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: TARGET_DATABASE_URL } } });

// Orden que respeta las foreign keys (padres antes que hijos).
const MODELS_IN_ORDER = [
  'team',
  'player',
  'user',
  'group',
  'groupMember',
  'match',
  'prediction',
  'tournamentPicks',
  'leaderboardEntry',
  'refreshToken',
  'setting',
];

async function copyModel(name) {
  const rows = await source[name].findMany();
  if (rows.length === 0) {
    console.log(`  ${name}: 0 filas, salto`);
    return;
  }
  const result = await target[name].createMany({ data: rows, skipDuplicates: true });
  console.log(`  ${name}: ${rows.length} leídas, ${result.count} insertadas`);
}

async function main() {
  console.log('Iniciando migración de datos...\n');
  for (const model of MODELS_IN_ORDER) {
    console.log(`→ ${model}`);
    await copyModel(model);
  }
  console.log('\nVerificando conteos finales...');
  for (const model of MODELS_IN_ORDER) {
    const [srcCount, dstCount] = await Promise.all([
      source[model].count(),
      target[model].count(),
    ]);
    const flag = srcCount === dstCount ? 'OK' : '⚠️ DIFERENTE';
    console.log(`  ${model}: origen=${srcCount} destino=${dstCount} ${flag}`);
  }
  console.log('\nMigración completada.');
}

main()
  .catch((e) => {
    console.error('Error en la migración:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
