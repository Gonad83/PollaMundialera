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

function applyOfficialResultOverride(data, homeTeam, awayTeam) {
  const homeCode = homeTeam?.code;
  const awayCode = awayTeam?.code;

  // BEL-SEN se definio 3-2 en prorroga, pero el calculo usa 2-2 en 90 min.
  if (data.phase === 'R32' &&
      ((homeCode === 'BEL' && awayCode === 'SEN') || (homeCode === 'SEN' && awayCode === 'BEL'))) {
    const belgiumIsHome = homeCode === 'BEL';
    return {
      ...data,
      scoreHome: 2,
      scoreAway: 2,
      extraTimeHome: belgiumIsHome ? 3 : 2,
      extraTimeAway: belgiumIsHome ? 2 : 3,
      wentToPenalties: false,
      penaltyHome: null,
      penaltyAway: null,
      winnerId: belgiumIsHome ? homeTeam.id : awayTeam.id,
    };
  }

  // NOR-ENG (QF) se definio 1-2 en prorroga, pero el calculo usa 1-1 en 90 min.
  if (data.phase === 'QF' &&
      ((homeCode === 'NOR' && awayCode === 'ENG') || (homeCode === 'ENG' && awayCode === 'NOR'))) {
    const englandIsHome = homeCode === 'ENG';
    return {
      ...data,
      scoreHome: 1,
      scoreAway: 1,
      extraTimeHome: englandIsHome ? 2 : 1,
      extraTimeAway: englandIsHome ? 1 : 2,
      wentToPenalties: false,
      penaltyHome: null,
      penaltyAway: null,
      winnerId: englandIsHome ? homeTeam.id : awayTeam.id,
    };
  }

  // ESP-ARG (FINAL) se definio 1-0 en prorroga (0-0 en los 90 min), pero la API
  // devuelve regularTime null y fullTime=extraTime=1-0, asi que el calculo
  // usaba por error 1-0 tambien en los 90 min.
  if (data.phase === 'FINAL' &&
      ((homeCode === 'ESP' && awayCode === 'ARG') || (homeCode === 'ARG' && awayCode === 'ESP'))) {
    const spainIsHome = homeCode === 'ESP';
    return {
      ...data,
      scoreHome: 0,
      scoreAway: 0,
      extraTimeHome: spainIsHome ? 1 : 0,
      extraTimeAway: spainIsHome ? 0 : 1,
      wentToPenalties: false,
      penaltyHome: null,
      penaltyAway: null,
      winnerId: spainIsHome ? homeTeam.id : awayTeam.id,
    };
  }

  return data;
}

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
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || parsed.error || `football-data.org HTTP ${res.statusCode}`));
            return;
          }
          resolve(parsed);
        }
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
  let wcMatches = [];
  const warnings = [];
  try {
    const wcData = await fetchFromApi('/v4/competitions/WC/matches?season=2026');
    wcMatches = wcData.matches || [];
  } catch (e) {
    console.error('Error fetching WC matches:', e.message);
    warnings.push(`Mundial 2026: ${e.message}`);
  }

  const matches = wcMatches;

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
  let finished = 0;
  let scoredPredictions = 0;

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

    const externalId    = String(m.id); // guardamos el ID externo en venue como fallback
    const existing = await prisma.match.findFirst({ where: { venue: externalId } });

    const phase         = STAGE_MAP[m.stage] || 'GROUP';
    // Nunca "des-finalizar" un partido: si la API devuelve un status inesperado
    // o ausente en algún ciclo (glitch puntual), no debe pisar un FINISHED ya guardado.
    const status        = existing?.status === 'FINISHED' ? 'FINISHED' : (STATUS_MAP[m.status] || 'SCHEDULED');
    // Normalize group: "GROUP_A" → "A", "Group A" → "A", "A" → "A"
    const rawGroup      = m.group || null;
    const groupLetter   = rawGroup
      ? (rawGroup.replace(/^GROUP_/i, '').replace(/^Group\s*/i, '').trim().charAt(0) || null)
      : null;
    const dateUtc       = new Date(m.utcDate);
    const isShootout    = m.score?.duration === 'PENALTY_SHOOTOUT';

    // El marcador que PUNTUA es el de los 90 minutos. Alargue y penales no suman
    // al scoreHome/scoreAway: solo definen el winnerId si corresponde.
    let scoreHome, scoreAway;
    if (m.score?.regularTime?.home != null && m.score?.regularTime?.away != null) {
      scoreHome = m.score.regularTime.home;
      scoreAway = m.score.regularTime.away;
    } else {
      scoreHome = m.score?.fullTime?.home ?? null;
      scoreAway = m.score?.fullTime?.away ?? null;
    }

    let extraTimeHome = null, extraTimeAway = null;
    if (m.score?.regularTime?.home != null && m.score?.regularTime?.away != null &&
        m.score?.extraTime?.home != null && m.score?.extraTime?.away != null) {
      extraTimeHome = m.score.regularTime.home + m.score.extraTime.home;
      extraTimeAway = m.score.regularTime.away + m.score.extraTime.away;
    } else if (!isShootout && m.score?.duration === 'EXTRA_TIME' &&
               m.score?.fullTime?.home != null && m.score?.fullTime?.away != null) {
      extraTimeHome = m.score.fullTime.home;
      extraTimeAway = m.score.fullTime.away;
    }

    // Definición por penales: usar el campo 'penalties' si trae ganador; si viene roto
    // (empate o ausente), caer al fullTime, que en esta data trae el resultado del shootout.
    let penaltyHome = null, penaltyAway = null;
    if (isShootout) {
      const ph = m.score?.penalties?.home, pa = m.score?.penalties?.away;
      if (ph != null && pa != null && ph !== pa) {
        penaltyHome = ph; penaltyAway = pa;
      } else {
        penaltyHome = m.score?.fullTime?.home ?? null;
        penaltyAway = m.score?.fullTime?.away ?? null;
      }
    }

    let winnerId = null;
    if (status === 'FINISHED') {
      if (isShootout && penaltyHome != null && penaltyAway != null && penaltyHome !== penaltyAway) {
        winnerId = penaltyHome > penaltyAway ? homeTeam.id : awayTeam.id; // ganador por penales
      } else if (m.score?.winner === 'HOME_TEAM') {
        winnerId = homeTeam.id;
      } else if (m.score?.winner === 'AWAY_TEAM') {
        winnerId = awayTeam.id;
      } else if (scoreHome !== null && scoreAway !== null && scoreHome !== scoreAway) {
        // Inferir ganador del marcador cuando la API no devuelve el campo winner
        winnerId = scoreHome > scoreAway ? homeTeam.id : awayTeam.id;
      } else if (extraTimeHome !== null && extraTimeAway !== null && extraTimeHome !== extraTimeAway) {
        winnerId = extraTimeHome > extraTimeAway ? homeTeam.id : awayTeam.id;
      }
    }
    // Si el status se mantuvo FINISHED por la guarda de arriba pero este ciclo no
    // trajo winner (glitch de la API), no perder el winnerId ya guardado.
    if (status === 'FINISHED' && winnerId === null && existing?.winnerId) {
      winnerId = existing.winnerId;
    }

    const wentToPenalties = isShootout;

    const data = applyOfficialResultOverride({
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
      extraTimeHome,
      extraTimeAway,
      wentToPenalties,
      penaltyHome,
      penaltyAway,
      winnerId,
    }, homeTeam, awayTeam);

    if (existing) {
      const wasFinished = existing.status === 'FINISHED';
      const nowFinished = status === 'FINISHED';
      const updatedMatch = await prisma.match.update({ where: { id: existing.id }, data });
      updated++;

      // Si el partido acaba de terminar (o ya estaba terminado con resultado),
      // recalcular puntos de todas las predicciones de este partido
      if (nowFinished && scoreHome !== null && scoreAway !== null) {
        finished++;
        if (!wasFinished) {
          console.log(`⚽ Partido finalizado: ${homeTeam.name} ${scoreHome}-${scoreAway} ${awayTeam.name} — calculando puntos...`);
        }
        scoredPredictions += await scorePredictionsForMatch(updatedMatch);
      }
    } else {
      await prisma.match.create({ data });
      created++;
    }
  }

  const summary = `✅ Sincronización completa: ${created} creados, ${updated} actualizados, ${skipped} omitidos`;
  console.log(summary);
  return { created, updated, skipped, finished, scoredPredictions, warnings, total: matches.length };
}

/**
 * Recalcula y guarda los puntos de todas las predicciones de un partido finalizado
 */
async function scorePredictionsForMatch(match) {
  try {
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
    });

    if (predictions.length === 0) return 0;

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
      const tournamentAgg = await prisma.tournamentPicks.aggregate({
        where: { userId },
        _sum: { pointsTotal: true },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { totalPoints: (agg._sum.pointsTotal || 0) + (tournamentAgg._sum.pointsTotal || 0) },
      });
    }

    console.log(`✅ Puntos calculados para ${predictions.length} predicciones del partido ${match.id}`);
    return predictions.length;
  } catch (err) {
    console.error(`⚠️  Error calculando puntos para partido ${match.id}:`, err.message);
    return 0;
  }
}

module.exports = { syncMatches };
