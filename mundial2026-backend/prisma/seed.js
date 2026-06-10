const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CODE_TO_FLAG_ISO = {
  ARG: 'ar', BRA: 'br', URU: 'uy', COL: 'co', ECU: 'ec', CHI: 'cl',
  FRA: 'fr', ENG: 'gb-eng', ESP: 'es', POR: 'pt', BEL: 'be', GER: 'de',
  NED: 'nl', ITA: 'it', CRO: 'hr', DEN: 'dk', SUI: 'ch', AUT: 'at',
  SRB: 'rs', POL: 'pl', UKR: 'ua', TUR: 'tr',
  USA: 'us', MEX: 'mx', CAN: 'ca', CRC: 'cr', JAM: 'jm', HON: 'hn',
  MAR: 'ma', SEN: 'sn', EGY: 'eg', NGA: 'ng', CMR: 'cm', ALG: 'dz',
  RSA: 'za', CIV: 'ci', GHA: 'gh', BOL: 'bo',
  JPN: 'jp', KOR: 'kr', KSA: 'sa', IRN: 'ir', AUS: 'au', QAT: 'qa',
  CHN: 'cn', IRQ: 'iq', NZL: 'nz',
};

const withFlag = (team) => {
  const iso = CODE_TO_FLAG_ISO[team.code];
  return iso ? { ...team, flagUrl: `https://flagcdn.com/w80/${iso}.png` } : team;
};

// ─── 48 equipos clasificados al Mundial 2026 (proyección) ─────────────────────
const teams = [
  // CONMEBOL (6)
  { name: 'Argentina',  code: 'ARG', confederation: 'CONMEBOL', fifaRanking: 1  },
  { name: 'Brasil',     code: 'BRA', confederation: 'CONMEBOL', fifaRanking: 5  },
  { name: 'Uruguay',    code: 'URU', confederation: 'CONMEBOL', fifaRanking: 14 },
  { name: 'Colombia',   code: 'COL', confederation: 'CONMEBOL', fifaRanking: 11 },
  { name: 'Ecuador',    code: 'ECU', confederation: 'CONMEBOL', fifaRanking: 44 },
  { name: 'Chile',      code: 'CHI', confederation: 'CONMEBOL', fifaRanking: 33 },

  // UEFA (16)
  { name: 'Francia',    code: 'FRA', confederation: 'UEFA',     fifaRanking: 2  },
  { name: 'Inglaterra', code: 'ENG', confederation: 'UEFA',     fifaRanking: 4  },
  { name: 'España',     code: 'ESP', confederation: 'UEFA',     fifaRanking: 8  },
  { name: 'Portugal',   code: 'POR', confederation: 'UEFA',     fifaRanking: 6  },
  { name: 'Bélgica',    code: 'BEL', confederation: 'UEFA',     fifaRanking: 3  },
  { name: 'Alemania',   code: 'GER', confederation: 'UEFA',     fifaRanking: 12 },
  { name: 'Países Bajos', code: 'NED', confederation: 'UEFA',   fifaRanking: 7  },
  { name: 'Italia',     code: 'ITA', confederation: 'UEFA',     fifaRanking: 9  },
  { name: 'Croacia',    code: 'CRO', confederation: 'UEFA',     fifaRanking: 10 },
  { name: 'Dinamarca',  code: 'DEN', confederation: 'UEFA',     fifaRanking: 21 },
  { name: 'Suiza',      code: 'SUI', confederation: 'UEFA',     fifaRanking: 19 },
  { name: 'Austria',    code: 'AUT', confederation: 'UEFA',     fifaRanking: 25 },
  { name: 'Serbia',     code: 'SRB', confederation: 'UEFA',     fifaRanking: 33 },
  { name: 'Polonia',    code: 'POL', confederation: 'UEFA',     fifaRanking: 30 },
  { name: 'Ucrania',    code: 'UKR', confederation: 'UEFA',     fifaRanking: 22 },
  { name: 'Turquía',    code: 'TUR', confederation: 'UEFA',     fifaRanking: 38 },

  // CONCACAF (6 + 3 sedes)
  { name: 'Estados Unidos', code: 'USA', confederation: 'CONCACAF', fifaRanking: 13 },
  { name: 'México',     code: 'MEX', confederation: 'CONCACAF', fifaRanking: 15 },
  { name: 'Canadá',     code: 'CAN', confederation: 'CONCACAF', fifaRanking: 41 },
  { name: 'Costa Rica', code: 'CRC', confederation: 'CONCACAF', fifaRanking: 51 },
  { name: 'Jamaica',    code: 'JAM', confederation: 'CONCACAF', fifaRanking: 56 },
  { name: 'Honduras',   code: 'HON', confederation: 'CONCACAF', fifaRanking: 80 },

  // CAF (9)
  { name: 'Marruecos',  code: 'MAR', confederation: 'CAF',      fifaRanking: 16 },
  { name: 'Senegal',    code: 'SEN', confederation: 'CAF',      fifaRanking: 18 },
  { name: 'Egipto',     code: 'EGY', confederation: 'CAF',      fifaRanking: 36 },
  { name: 'Nigeria',    code: 'NGA', confederation: 'CAF',      fifaRanking: 37 },
  { name: 'Camerún',    code: 'CMR', confederation: 'CAF',      fifaRanking: 42 },
  { name: 'Argelia',    code: 'ALG', confederation: 'CAF',      fifaRanking: 48 },
  { name: 'Sudáfrica',  code: 'RSA', confederation: 'CAF',      fifaRanking: 61 },
  { name: 'Costa de Marfil', code: 'CIV', confederation: 'CAF', fifaRanking: 55 },
  { name: 'Ghana',      code: 'GHA', confederation: 'CAF',      fifaRanking: 60 },

  // AFC (8)
  { name: 'Japón',      code: 'JPN', confederation: 'AFC',      fifaRanking: 17 },
  { name: 'Corea del Sur', code: 'KOR', confederation: 'AFC',   fifaRanking: 24 },
  { name: 'Arabia Saudita', code: 'KSA', confederation: 'AFC',  fifaRanking: 58 },
  { name: 'Irán',       code: 'IRN', confederation: 'AFC',      fifaRanking: 22 },
  { name: 'Australia',  code: 'AUS', confederation: 'AFC',      fifaRanking: 26 },
  { name: 'Qatar',      code: 'QAT', confederation: 'AFC',      fifaRanking: 37 },
  { name: 'China',      code: 'CHN', confederation: 'AFC',      fifaRanking: 88 },
  { name: 'Iraq',       code: 'IRQ', confederation: 'AFC',      fifaRanking: 55 },

  // OFC (1)
  { name: 'Nueva Zelanda', code: 'NZL', confederation: 'OFC',   fifaRanking: 92 },

  // Repechaje (2 spots — TBD)
  { name: 'Interconfederal 1', code: 'IC1', confederation: 'TBD', fifaRanking: null },
  { name: 'Interconfederal 2', code: 'IC2', confederation: 'TBD', fifaRanking: null },
];

async function main() {
  console.log('🌱 Iniciando seed del Mundial 2026...');

  // Limpiar datos existentes (orden por FK)
  await prisma.leaderboardEntry.deleteMany();
  await prisma.tournamentPicks.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();

  // Insertar equipos
  console.log(`🏴 Insertando ${teams.length} equipos...`);
  for (const t of teams) {
    const data = withFlag(t);
    await prisma.team.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
  }

  // Crear usuario admin de prueba
  const bcrypt = require('bcryptjs');
  const adminPass = await bcrypt.hash('Admin2026!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@polla2026.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@polla2026.com',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  console.log('✅ Seed completado!');
  console.log('   Admin: admin@polla2026.com / Admin2026!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
