/**
 * sync-wc2026.js
 * Sincroniza equipos y partidos del Mundial 2026 desde football-data.org
 *
 * Uso:
 *   FOOTBALL_DATA_API_KEY=tu_key node scripts/sync-wc2026.js
 *
 * API key gratis en: https://www.football-data.org/client/register
 */

require('dotenv').config();
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta FOOTBALL_DATA_API_KEY en .env');
  process.exit(1);
}

// ─── Mapeo fase API → enum Prisma ────────────────────────────────────────────
const PHASE_MAP = {
  'GROUP_STAGE':    'GROUP',
  'LAST_32':        'R32',
  'ROUND_OF_16':    'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS':    'SF',
  'THIRD_PLACE':    'THIRD',
  'FINAL':          'FINAL',
};

// ─── Mapeo status API → enum Prisma ──────────────────────────────────────────
const STATUS_MAP = {
  'SCHEDULED':  'SCHEDULED',
  'TIMED':      'SCHEDULED',
  'IN_PLAY':    'LIVE',
  'PAUSED':     'LIVE',
  'FINISHED':   'FINISHED',
  'AWARDED':    'FINISHED',
  'POSTPONED':  'CANCELLED',
  'SUSPENDED':  'CANCELLED',
  'CANCELLED':  'CANCELLED',
};

// ─── Flag URLs por código FIFA (3 letras) → ISO 2 letras ──────────────────────
const FLAG_MAP = {
  ARG:'ar', BRA:'br', URU:'uy', COL:'co', ECU:'ec', CHI:'cl',
  PAR:'py', PER:'pe', VEN:'ve', BOL:'bo',
  FRA:'fr', ENG:'gb-eng', ESP:'es', POR:'pt', BEL:'be', GER:'de',
  NED:'nl', ITA:'it', CRO:'hr', DEN:'dk', SUI:'ch', AUT:'at',
  SRB:'rs', POL:'pl', UKR:'ua', TUR:'tr', WAL:'gb-wls', SCO:'gb-sct',
  SVK:'sk', SVN:'si', ALB:'al', ROU:'ro', HUN:'hu', CZE:'cz',
  GRE:'gr', FIN:'fi', NOR:'no', ISL:'is',
  USA:'us', MEX:'mx', CAN:'ca', CRC:'cr', JAM:'jm', HON:'hn',
  PAN:'pa', TRI:'tt', GUA:'gt', SLV:'sv',
  MAR:'ma', SEN:'sn', EGY:'eg', NGA:'ng', CMR:'cm', ALG:'dz',
  RSA:'za', CIV:'ci', GHA:'gh', TUN:'tn', MLI:'ml', COD:'cd',
  JPN:'jp', KOR:'kr', KSA:'sa', IRN:'ir', AUS:'au', QAT:'qa',
  CHN:'cn', IRQ:'iq', JOR:'jo', UZB:'uz', OMN:'om',
  NZL:'nz', PHI:'ph',
};

function flagUrl(isoCode) {
  if (!isoCode) return null;
  return `https://flagcdn.com/w80/${isoCode}.png`;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.football-data.org',
      path,
      headers: { 'X-Auth-Token': API_KEY },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌍 Iniciando sincronización Mundial 2026...\n');

  // 1. Obtener equipos del torneo
  console.log('📋 Obteniendo equipos...');
  const teamsData = await apiGet('/v4/competitions/WC/teams?season=2026');

  if (!teamsData.teams) {
    console.error('❌ Error al obtener equipos:', JSON.stringify(teamsData));
    process.exit(1);
  }

  let teamsCreated = 0, teamsUpdated = 0;
  for (const t of teamsData.teams) {
    const code = t.tla || t.shortName?.toUpperCase().slice(0, 3) || t.id.toString();
    const iso2 = FLAG_MAP[code];
    const data = {
      name: t.name,
      code,
      flagUrl: flagUrl(iso2),
      confederation: t.area?.name || 'UNKNOWN',
    };
    const existing = await prisma.team.findUnique({ where: { code } });
    if (existing) {
      await prisma.team.update({ where: { code }, data });
      teamsUpdated++;
    } else {
      await prisma.team.create({ data }).catch(() => {});
      teamsCreated++;
    }
  }
  console.log(`  ✅ ${teamsCreated} equipos creados, ${teamsUpdated} actualizados\n`);

  // 2. Obtener todos los partidos
  console.log('⚽ Obteniendo partidos...');
  const matchesData = await apiGet('/v4/competitions/WC/matches?season=2026');

  if (!matchesData.matches) {
    console.error('❌ Error al obtener partidos:', JSON.stringify(matchesData));
    process.exit(1);
  }

  console.log(`  📅 ${matchesData.matches.length} partidos encontrados\n`);

  let created = 0, updated = 0, skipped = 0;

  for (const m of matchesData.matches) {
    const phase = PHASE_MAP[m.stage];
    if (!phase) { skipped++; continue; }

    const homeCode = m.homeTeam?.tla;
    const awayCode = m.awayTeam?.tla;

    if (!homeCode || !awayCode) { skipped++; continue; }

    const teamHome = await prisma.team.findUnique({ where: { code: homeCode } });
    const teamAway = await prisma.team.findUnique({ where: { code: awayCode } });

    if (!teamHome || !teamAway) {
      console.warn(`  ⚠️  Equipos no encontrados: ${homeCode} vs ${awayCode}`);
      skipped++;
      continue;
    }

    const status = STATUS_MAP[m.status] || 'SCHEDULED';
    const externalId = `fd_${m.id}`;

    const scoreHome = m.score?.regularTime?.home ?? m.score?.fullTime?.home ?? null;
    const scoreAway = m.score?.regularTime?.away ?? m.score?.fullTime?.away ?? null;

    const matchData = {
      phase,
      groupLetter: m.group?.replace('GROUP_', '').replace('Group ', '') || null,
      teamHomeId: teamHome.id,
      teamAwayId: teamAway.id,
      scoreHome,
      scoreAway,
      venue: m.venue || null,
      city: null,
      dateUtc: new Date(m.utcDate),
      status,
    };

    // Buscar partido existente por ID externo en venue (workaround sin campo externalId)
    // Usamos teamHome+teamAway+date como clave única natural
    const existing = await prisma.match.findFirst({
      where: {
        teamHomeId: teamHome.id,
        teamAwayId: teamAway.id,
        dateUtc: matchData.dateUtc,
      }
    });

    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data: matchData });
      updated++;
    } else {
      await prisma.match.create({ data: matchData });
      created++;
    }
  }

  console.log(`  ✅ ${created} partidos creados`);
  console.log(`  🔄 ${updated} partidos actualizados`);
  if (skipped > 0) console.log(`  ⏭️  ${skipped} partidos omitidos (equipo TBD)`);
  console.log('\n🏆 Sincronización completada!');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
