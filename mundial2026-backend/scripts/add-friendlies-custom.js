#!/usr/bin/env node

/**
 * Script para agregar amistosos específicos
 */

const prisma = require('../src/utils/prisma');

const FRIENDLY_MATCHES = [
  { home: 'Portugal', away: 'Nigeria', date: '2026-06-09T15:45:00Z', city: 'Lisboa', venue: 'Estádio da Luz' },
  { home: 'Inglaterra', away: 'Costa Rica', date: '2026-06-09T16:00:00Z', city: 'Londres', venue: 'Wembley' },
  { home: 'Bolivia', away: 'Argelia', date: '2026-06-09T20:00:00Z', city: 'La Paz', venue: 'Estadio Hernando Siles' },
];

async function addFriendlies() {
  try {
    console.log('🌍 Agregando amistosos personalizados...\n');

    // Obtener todos los equipos
    const teams = await prisma.team.findMany();
    const teamMap = Object.fromEntries(teams.map(t => [t.name, t.id]));

    let added = 0;
    let skipped = 0;

    for (const match of FRIENDLY_MATCHES) {
      const homeId = teamMap[match.home];
      const awayId = teamMap[match.away];

      if (!homeId || !awayId) {
        console.log(`⏭️  Saltando: ${match.home} vs ${match.away} (equipos no encontrados)`);
        skipped++;
        continue;
      }

      // Verificar si ya existe
      const existing = await prisma.match.findFirst({
        where: {
          AND: [
            { teamHomeId: homeId },
            { teamAwayId: awayId },
            { dateUtc: new Date(match.date) },
          ],
        },
      });

      if (existing) {
        console.log(`⏭️  Ya existe: ${match.home} vs ${match.away}`);
        skipped++;
        continue;
      }

      // Crear el amistoso
      await prisma.match.create({
        data: {
          phase: 'GROUP',
          groupLetter: 'F',
          teamHomeId: homeId,
          teamAwayId: awayId,
          dateUtc: new Date(match.date),
          venue: match.venue,
          city: match.city,
          status: 'SCHEDULED',
        },
      });

      console.log(`✅ Creado: ${match.home} vs ${match.away} (${match.date})`);
      added++;
    }

    console.log(`\n✨ Resumen:`);
    console.log(`  ✅ Amistosos creados: ${added}`);
    console.log(`  ⏭️  Saltados: ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFriendlies();
