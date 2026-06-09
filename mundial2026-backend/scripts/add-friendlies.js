#!/usr/bin/env node

/**
 * Script para agregar amistosos internacionales (friendly matches)
 * Partidos de práctica con equipos que juegan el Mundial 2026
 * Fechas: Junio - Agosto 2026 (antes del Mundial en septiembre)
 */

const prisma = require('../src/utils/prisma');

const FRIENDLY_MATCHES = [
  // JUNIO 2026
  { home: 'España', away: 'Portugal', date: '2026-06-05T19:00:00Z', city: 'Santiago', venue: 'Estadio Monumental' },
  { home: 'Francia', away: 'Brasil', date: '2026-06-05T20:00:00Z', city: 'París', venue: 'Parc des Princes' },
  { home: 'Argentina', away: 'Uruguay', date: '2026-06-07T19:00:00Z', city: 'Buenos Aires', venue: 'La Bombonera' },
  { home: 'Alemania', away: 'Países Bajos', date: '2026-06-07T20:00:00Z', city: 'Berlín', venue: 'Allianz Arena' },
  { home: 'Inglaterra', away: 'Croacia', date: '2026-06-09T19:30:00Z', city: 'Londres', venue: 'Wembley' },
  { home: 'Italia', away: 'Suiza', date: '2026-06-09T20:00:00Z', city: 'Roma', venue: 'Olimpico' },

  // JULIO 2026
  { home: 'México', away: 'Colombia', date: '2026-07-02T18:00:00Z', city: 'Ciudad de México', venue: 'Azteca' },
  { home: 'USA', away: 'Canadá', date: '2026-07-02T19:00:00Z', city: 'Nueva York', venue: 'MetLife Stadium' },
  { home: 'Japón', away: 'Corea del Sur', date: '2026-07-04T19:00:00Z', city: 'Tokio', venue: 'National Stadium' },
  { home: 'Australia', away: 'Nueva Zelanda', date: '2026-07-04T20:00:00Z', city: 'Sídney', venue: 'ANZ Stadium' },
  { home: 'Senegal', away: 'Costa de Marfil', date: '2026-07-06T17:00:00Z', city: 'Dakar', venue: 'Amadou Diallo' },
  { home: 'Marruecos', away: 'Egipto', date: '2026-07-06T18:00:00Z', city: 'Casablanca', venue: 'Mohamed V' },
  { home: 'Turquía', away: 'Bosnia y Herz.', date: '2026-07-08T19:00:00Z', city: 'Estambul', venue: 'Fenerbahçe' },
  { home: 'Suecia', away: 'Noruega', date: '2026-07-08T19:00:00Z', city: 'Estocolmo', venue: 'Friends Arena' },
  { home: 'Rep. Checa', away: 'Polonia', date: '2026-07-10T19:00:00Z', city: 'Praga', venue: 'Generali Arena' },
  { home: 'Austria', away: 'Hungría', date: '2026-07-10T19:30:00Z', city: 'Viena', venue: 'Ernst-Happel' },
  { home: 'Ecuador', away: 'Paraguay', date: '2026-07-12T18:00:00Z', city: 'Quito', venue: 'Atahualpa' },
  { home: 'Bélgica', away: 'Escocia', date: '2026-07-12T19:00:00Z', city: 'Bruselas', venue: 'Rey Balduino' },

  // AGOSTO 2026
  { home: 'Irán', away: 'Irak', date: '2026-08-01T18:00:00Z', city: 'Teherán', venue: 'Azadi Stadium' },
  { home: 'Qatá', away: 'Arabia Saudita', date: '2026-08-01T19:00:00Z', city: 'Doha', venue: 'Lusail' },
  { home: 'Jordania', away: 'Palestina', date: '2026-08-03T18:00:00Z', city: 'Amán', venue: 'Amman International' },
  { home: 'Uzbekistán', away: 'Kirguistán', date: '2026-08-03T19:00:00Z', city: 'Tashkent', venue: 'Pakhtakor' },
  { home: 'Ghana', away: 'Costa de Marfil', date: '2026-08-05T16:00:00Z', city: 'Accra', venue: 'Accra Sports Stadium' },
  { home: 'Sudáfrica', away: 'Nigeria', date: '2026-08-05T17:00:00Z', city: 'Johannesburgo', venue: 'FNB Stadium' },
  { home: 'Panamá', away: 'Jamaica', date: '2026-08-07T19:00:00Z', city: 'Ciudad de Panamá', venue: 'Rommel Fernández' },
  { home: 'Honduras', away: 'Guatemala', date: '2026-08-07T19:00:00Z', city: 'Tegucigalpa', venue: 'Estadio Nacional' },
  { home: 'Haití', away: 'Trinidad y Tobago', date: '2026-08-09T19:00:00Z', city: 'Puerto Príncipe', venue: 'Sylvio Cator' },
  { home: 'Perú', away: 'Bolivia', date: '2026-08-09T20:00:00Z', city: 'Lima', venue: 'Nacional' },
  { home: 'Chile', away: 'Venezuela', date: '2026-08-11T19:00:00Z', city: 'Santiago', venue: 'Monumental' },
  { home: 'Dinamarca', away: 'Gales', date: '2026-08-11T19:00:00Z', city: 'Copenhague', venue: 'Parken' },

  // Más amistosos globales
  { home: 'Portugal', away: 'Serbia', date: '2026-08-13T19:00:00Z', city: 'Lisboa', venue: 'Da Luz' },
  { home: 'Rumania', away: 'Albania', date: '2026-08-13T19:00:00Z', city: 'Bucarest', venue: 'Nicolae Gelru' },
  { home: 'Grecia', away: 'Ucrania', date: '2026-08-15T19:00:00Z', city: 'Atenas', venue: 'OAKA' },
  { home: 'Israel', away: 'Líbano', date: '2026-08-15T19:00:00Z', city: 'Tel Aviv', venue: 'Bloomfield' },
  { home: 'Tailandia', away: 'Vietnam', date: '2026-08-17T18:00:00Z', city: 'Bangkok', venue: 'Rajamangala' },
  { home: 'Indonesia', away: 'Malasia', date: '2026-08-17T19:00:00Z', city: 'Yakarta', venue: 'Gelora Bung Karno' },
];

async function addFriendlies() {
  try {
    console.log('🌍 Agregando amistosos internacionales...\n');

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
          phase: 'GROUP', // Usar GROUP como placeholder (podrías crear una nueva phase FRIENDLY si quieres)
          groupLetter: 'F', // F de "Friendly"
          teamHomeId: homeId,
          teamAwayId: awayId,
          dateUtc: new Date(match.date),
          venue: match.venue,
          city: match.city,
          status: 'SCHEDULED',
        },
      });

      console.log(`✅ Creado: ${match.home} (${match.city}) vs ${match.away}`);
      added++;
    }

    console.log(`\n✨ Resumen:`);
    console.log(`  ✅ Amistosos creados: ${added}`);
    console.log(`  ⏭️  Ya existían o saltados: ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFriendlies();
