/**
 * ensure-schema.js
 * Adds missing columns to the DB without touching existing data.
 * Runs before the server starts on Railway.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🔧 Verificando schema...');

  // Add groupId to Prediction if the column doesn't exist yet
  await prisma.$executeRaw`
    ALTER TABLE "Prediction"
    ADD COLUMN IF NOT EXISTS "groupId" TEXT
  `;

  // Add foreign key (ignore if already exists)
  await prisma.$executeRaw`
    DO $$ BEGIN
      ALTER TABLE "Prediction"
        ADD CONSTRAINT "Prediction_groupId_fkey"
        FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  // Drop old unique index if it exists (userId+matchId without groupId)
  await prisma.$executeRaw`
    DROP INDEX IF EXISTS "Prediction_userId_matchId_key"
  `;

  // Add new unique index (userId+matchId+groupId)
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "Prediction_userId_matchId_groupId_key"
      ON "Prediction"("userId", "matchId", "groupId")
  `;

  // Add index on groupId
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "Prediction_groupId_idx"
      ON "Prediction"("groupId")
  `;

  console.log('✅ Schema OK');
}

run()
  .catch(e => {
    console.error('❌ Error en ensure-schema:', e.message);
    // Don't exit with error — let the server start anyway
  })
  .finally(() => prisma.$disconnect());
