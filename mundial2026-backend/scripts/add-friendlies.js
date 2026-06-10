#!/usr/bin/env node

/**
 * Mantiene solo los amistosos internacionales del 10 de junio de 2026.
 *
 * Nota: este script es idempotente. Los amistosos se guardan como GROUP con
 * groupLetter null para no requerir una migracion de enum ni contaminar grupos.
 */

const prisma = require('../src/utils/prisma');

const TARGET_START = new Date('2026-06-10T00:00:00Z');
const TARGET_END = new Date('2026-06-11T00:00:00Z');

const FRIENDLY_MATCHES = [
  { home: 'Portugal', away: 'Nigeria', date: '2026-06-10T15:45:00Z', city: 'Lisboa', venue: 'Estadio da Luz' },
  { home: 'Inglaterra', away: 'Costa Rica', date: '2026-06-10T16:00:00Z', city: 'Londres', venue: 'Wembley' },
  { home: 'Bolivia', away: 'Argelia', date: '2026-06-10T20:00:00Z', city: 'La Paz', venue: 'Estadio Hernando Siles' },
];

const flagUrl = (isoCode) => `https://flagcdn.com/w80/${isoCode}.png`;

const TEAM_META = {
  Portugal: { code: 'POR', confederation: 'UEFA', flagUrl: flagUrl('pt') },
  Nigeria: { code: 'NGA', confederation: 'CAF', flagUrl: flagUrl('ng') },
  Inglaterra: { code: 'ENG', confederation: 'UEFA', flagUrl: flagUrl('gb-eng') },
  'Costa Rica': { code: 'CRC', confederation: 'CONCACAF', flagUrl: flagUrl('cr') },
  Bolivia: { code: 'BOL', confederation: 'CONMEBOL', flagUrl: flagUrl('bo') },
  Argelia: { code: 'ALG', confederation: 'CAF', flagUrl: flagUrl('dz') },
};

async function ensureTeam(name, teamsByName, teamsByCode) {
  const meta = TEAM_META[name];
  if (!meta) throw new Error(`Faltan metadatos del equipo: ${name}`);

  const existing = teamsByName.get(name) || teamsByCode.get(meta.code);
  if (existing) {
    const needsUpdate =
      existing.name !== name ||
      existing.code !== meta.code ||
      existing.confederation !== meta.confederation ||
      existing.flagUrl !== meta.flagUrl;

    const team = needsUpdate
      ? await prisma.team.update({
          where: { id: existing.id },
          data: {
            name,
            code: meta.code,
            confederation: meta.confederation,
            flagUrl: meta.flagUrl,
          },
        })
      : existing;

    teamsByName.set(name, team);
    teamsByCode.set(team.code, team);
    return team.id;
  }

  const created = await prisma.team.create({
    data: {
      name,
      code: meta.code,
      confederation: meta.confederation,
      flagUrl: meta.flagUrl,
    },
  });

  teamsByName.set(created.name, created);
  teamsByCode.set(created.code, created);
  console.log(`Equipo creado: ${created.name} (${created.code})`);
  return created.id;
}

async function addFriendlies() {
  try {
    console.log('Agregando amistosos del 10 de junio de 2026...\n');

    const removedOldFriendlies = await prisma.$executeRaw`
      DELETE FROM "Match"
      WHERE "phase"::text = 'FRIENDLY'
         OR (
          "phase"::text = 'GROUP'
          AND "groupLetter" IS NULL
          AND "city" <> 'World'
          AND ("dateUtc" < ${TARGET_START} OR "dateUtc" >= ${TARGET_END})
        )
    `;

    const removedGroupFContamination = await prisma.match.deleteMany({
      where: {
        phase: 'GROUP',
        groupLetter: 'F',
        city: { not: 'World' },
      },
    });

    const teams = await prisma.team.findMany();
    const teamsByName = new Map(teams.map(t => [t.name, t]));
    const teamsByCode = new Map(teams.map(t => [t.code, t]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const match of FRIENDLY_MATCHES) {
      const homeId = await ensureTeam(match.home, teamsByName, teamsByCode);
      const awayId = await ensureTeam(match.away, teamsByName, teamsByCode);

      const existing = await prisma.match.findFirst({
        where: {
          teamHomeId: homeId,
          teamAwayId: awayId,
          dateUtc: new Date(match.date),
        },
      });

      if (existing) {
        await prisma.match.update({
          where: { id: existing.id },
          data: {
            phase: 'GROUP',
            groupLetter: null,
            venue: match.venue,
            city: match.city,
            status: 'SCHEDULED',
          },
        });
        console.log(`Actualizado: ${match.home} vs ${match.away}`);
        updated++;
        continue;
      }

      await prisma.match.create({
        data: {
          phase: 'GROUP',
          groupLetter: null,
          teamHomeId: homeId,
          teamAwayId: awayId,
          dateUtc: new Date(match.date),
          venue: match.venue,
          city: match.city,
          status: 'SCHEDULED',
        },
      });

      console.log(`Creado: ${match.home} vs ${match.away}`);
      added++;
    }

    console.log('\nResumen:');
    console.log(`  Limpieza de amistosos antiguos ejecutada: ${removedOldFriendlies !== undefined ? removedOldFriendlies : 'ok'}`);
    console.log(`  Amistosos limpiados del Grupo F: ${removedGroupFContamination.count}`);
    console.log(`  Amistosos creados: ${added}`);
    console.log(`  Amistosos actualizados: ${updated}`);
    console.log(`  Saltados: ${skipped}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFriendlies();
