const https = require('https');
const prisma = require('./prisma');
const { calculatePredictionPoints } = require('../controllers/predictionController');

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

async function syncMatches(options = {}) {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    throw new Error('FOOTBALL_DATA_API_KEY no configurada en .env');
  }

  console.log('🔄 Descargando partidos del Mundial 2026 desde football-data.org...');
  let wcMatches = [];
  try {
    const wcData = await fetchFromApi('/v4/competitions/WC/matches');
    wcMatches = wcData.matches || [];
  } catch (e) {
    console.error('Error fetching WC matches:', e.message);
  }

  console.log('🔄 Descargando partidos de la Champions League desde football-data.org...');
  let clMatches = [];
  try {
    const clData = await fetchFromApi('/v4/competitions/CL/matches');
    clMatches = (clData.matches || []).filter(m => m.stage === 'FINAL');
  } catch (e) {
    console.error('Error fetching CL matches:', e.message);
  }

  const matches = [...wcMatches, ...clMatches];

  if (options.simulateFinished) {
    for (const m of matches) {
      if (m.competition?.code === 'CL' && m.stage === 'FINAL') {
        m.status = 'FINISHED';
        m.score = {
          winner: 'HOME_TEAM',
          duration: 'REGULAR',
          fullTime: { home: 3, away: 2 }
        };
        console.log('ℹ️ Simulación activa: Forzando estado FINISHED (PSG 3 - 2 ARS) para la final de CL.');
      }
    }
  }

  if (matches.length === 0) {
    throw new Error('No se recibieron partidos de la API');
  }

  console.log(`📦 ${matches.length} partidos recibidos. Sincronizando...`);
  // Debug: log first group-stage match to verify field names
  const sampleGroup = matches.find(m => m.stage === 'GROUP_STAGE');
  if (sampleGroup) console.log(`🔍 Sample group match — stage:"${sampleGroup.stage}" group:"${sampleGroup.group}" id:${sampleGroup.id}`);

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
    // Normalize group: "GROUP_A" → "A", "Group A" → "A", "A" → "A"
    const rawGroup      = m.group || null;
    const groupLetter   = rawGroup
      ? (rawGroup.replace(/^GROUP_/i, '').replace(/^Group\s*/i, '').trim().charAt(0) || null)
      : null;
    const dateUtc       = new Date(m.utcDate);
    const scoreHome     = m.score?.fullTime?.home ?? null;
    const scoreAway     = m.score?.fullTime?.away ?? null;
    const externalId    = String(m.id); // guardamos el ID externo en venue como fallback

    let winnerId = null;
    if (status === 'FINISHED' && m.score?.winner) {
      if (m.score.winner === 'HOME_TEAM') {
        winnerId = homeTeam.id;
      } else if (m.score.winner === 'AWAY_TEAM') {
        winnerId = awayTeam.id;
      }
    }

    const wentToPenalties = m.score?.duration === 'PENALTY_SHOOTOUT' || m.score?.penalties !== undefined || false;

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
      wentToPenalties,
      winnerId,
    };

    if (existing) {
      const wasFinished = existing.status === 'FINISHED';
      const nowFinished = status === 'FINISHED';
      const updatedMatch = await prisma.match.update({ where: { id: existing.id }, data });
      updated++;

      // Si el partido acaba de terminar (o ya estaba terminado con resultado),
      // recalcular puntos de todas las predicciones de este partido
      if (nowFinished && scoreHome !== null && scoreAway !== null) {
        if (!wasFinished) {
          console.log(`⚽ Partido finalizado: ${homeTeam.name} ${scoreHome}-${scoreAway} ${awayTeam.name} — calculando puntos...`);
        }
        await scorePredictionsForMatch(updatedMatch);
      }
    } else {
      await prisma.match.create({ data });
      created++;
    }
  }

  const summary = `✅ Sincronización completa: ${created} creados, ${updated} actualizados, ${skipped} omitidos`;
  console.log(summary);
  return { created, updated, skipped, total: matches.length };
}

/**
 * Recalcula y guarda los puntos de todas las predicciones de un partido finalizado
 */
async function scorePredictionsForMatch(match) {
  try {
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
    });

    if (predictions.length === 0) return;

    for (const pred of predictions) {
      const points = calculatePredictionPoints(pred, match);
      await prisma.prediction.update({
        where: { id: pred.id },
        data: {
          pointsExact:  points.pointsExact,
          pointsWinner: points.pointsWinner,
          pointsBonus:  points.pointsBonus,
          pointsTotal:  points.pointsTotal,
        },
      });
    }

    // Actualizar totalPoints del usuario sumando todas sus predicciones
    const userIds = [...new Set(predictions.map(p => p.userId))];
    for (const userId of userIds) {
      const agg = await prisma.prediction.aggregate({
        where: { userId },
        _sum: { pointsTotal: true },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { totalPoints: agg._sum.pointsTotal || 0 },
      });
    }

    console.log(`✅ Puntos calculados para ${predictions.length} predicciones del partido ${match.id}`);
  } catch (err) {
    console.error(`⚠️  Error calculando puntos para partido ${match.id}:`, err.message);
  }
}

module.exports = { syncMatches };
