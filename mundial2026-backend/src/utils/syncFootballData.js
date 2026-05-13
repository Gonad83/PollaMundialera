const https = require('https');
const prisma = require('./prisma');

// Mapeo de stage de football-data.org a nuestro enum MatchPhase
const STAGE_MAP = {
  GROUP_STAGE:         'GROUP',
  LAST_32:             'R32',
  LAST_16:             'R16',
  QUARTER_FINALS:      'QF',
  SEMI_FINALS:         'SF',
  THIRD_PLACE:         'THIRD',
  FINAL:               'FINAL',
};

// Mapeo de status de football-data.org a nuestro enum MatchStatus
const STATUS_MAP = {
  SCHEDULED: 'SCHEDULED',
  TIMED:     'SCHEDULED',
  IN_PLAY:   'LIVE',
  PAUSED:    'LIVE',
  FINISHED:  'FINISHED',
  SUSPENDED: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  POSTPONED: 'CANCELLED',
};

function fetchFromApi(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.football-data.org',
      path,
      method: 'GET',
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Error parsing API response: ' + data)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function syncMatches() {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    throw new Error('FOOTBALL_DATA_API_KEY no configurada en .env');
  }

  console.log('🔄 Descargando partidos del Mundial 2026 desde football-data.org...');
  const { matches } = await fetchFromApi('/v4/competitions/WC/matches');

  if (!matches || matches.length === 0) {
    throw new Error('No se recibieron partidos de la API');
  }

  console.log(`📦 ${matches.length} partidos recibidos. Sincronizando...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const m of matches) {
    // Helper: nombre del equipo con fallbacks (la API a veces devuelve null en shortName)
    const teamName = (t) => t.name || t.shortName || t.tla || 'Unknown';

    // Saltar partidos donde los equipos aún no están definidos (ej: rondas eliminatorias TBD)
    if (!m.homeTeam?.tla || !m.awayTeam?.tla) { skipped++; continue; }

    // Buscar o crear el equipo local
    let homeTeam = await prisma.team.findUnique({ where: { code: m.homeTeam.tla } });
    if (!homeTeam) {
      homeTeam = await prisma.team.upsert({
        where:  { code: m.homeTeam.tla },
        update: { name: teamName(m.homeTeam), flagUrl: m.homeTeam.crest },
        create: { name: teamName(m.homeTeam), code: m.homeTeam.tla, flagUrl: m.homeTeam.crest, confederation: 'TBD' },
      });
    }

    // Buscar o crear el equipo visitante
    let awayTeam = await prisma.team.findUnique({ where: { code: m.awayTeam.tla } });
    if (!awayTeam) {
      awayTeam = await prisma.team.upsert({
        where:  { code: m.awayTeam.tla },
        update: { name: teamName(m.awayTeam), flagUrl: m.awayTeam.crest },
        create: { name: teamName(m.awayTeam), code: m.awayTeam.tla, flagUrl: m.awayTeam.crest, confederation: 'TBD' },
      });
    }

    if (!homeTeam?.id || !awayTeam?.id) { skipped++; continue; }

    const phase         = STAGE_MAP[m.stage] || 'GROUP';
    const status        = STATUS_MAP[m.status] || 'SCHEDULED';
    const groupLetter   = m.group ? m.group.replace('GROUP_', '') : null;
    const dateUtc       = new Date(m.utcDate);
    const scoreHome     = m.score?.fullTime?.home ?? null;
    const scoreAway     = m.score?.fullTime?.away ?? null;
    const externalId    = String(m.id); // guardamos el ID externo en venue como fallback

    // Buscar si ya existe por externalId guardado en el venue field
    const existing = await prisma.match.findFirst({ where: { venue: externalId } });

    const data = {
      phase,
      groupLetter,
      teamHomeId: homeTeam.id,
      teamAwayId: awayTeam.id,
      dateUtc,
      status,
      venue: externalId,
      city: m.venue || m.area?.name || null,
      scoreHome,
      scoreAway,
    };

    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.match.create({ data });
      created++;
    }
  }

  const summary = `✅ Sincronización completa: ${created} creados, ${updated} actualizados, ${skipped} omitidos`;
  console.log(summary);
  return { created, updated, skipped, total: matches.length };
}

module.exports = { syncMatches };
