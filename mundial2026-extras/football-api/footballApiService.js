// src/services/footballApiService.js
// Instalar: npm install axios node-cron
// API gratuita: https://www.api-football.com (100 req/día gratis)
// Alternativa gratuita: https://www.football-data.org (free tier)

const axios = require('axios')
const cron = require('node-cron')
const prisma = require('../utils/prisma')
const { setMatchResult } = require('../controllers/adminController')

// ─── Clientes de API ──────────────────────────────────────────────────────────

// Cliente para api-football.com (RapidAPI)
const apiFootball = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  },
})

// Cliente alternativo: football-data.org (sin RapidAPI, más simple)
const footballData = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {
    'X-Auth-Token': process.env.FOOTBALL_DATA_KEY,
  },
})

// ID del Mundial 2026 en api-football.com (se actualizará cuando esté disponible)
const WORLD_CUP_2026_ID = process.env.WC_2026_LEAGUE_ID || 1 // TBD

// ─── Mapeo de equipos ─────────────────────────────────────────────────────────
// Mapea el nombre de la API al código interno que usamos

const TEAM_MAP = {
  'Argentina':        'ARG', 'Brazil':          'BRA', 'Uruguay':      'URU',
  'Colombia':         'COL', 'Ecuador':          'ECU', 'Chile':        'CHI',
  'France':           'FRA', 'England':          'ENG', 'Spain':        'ESP',
  'Portugal':         'POR', 'Belgium':          'BEL', 'Germany':      'GER',
  'Netherlands':      'NED', 'Italy':            'ITA', 'Croatia':      'CRO',
  'Denmark':          'DEN', 'Switzerland':      'SUI', 'Austria':      'AUT',
  'Serbia':           'SRB', 'Poland':           'POL', 'Ukraine':      'UKR',
  'Turkey':           'TUR', 'United States':    'USA', 'Mexico':       'MEX',
  'Canada':           'CAN', 'Costa Rica':       'CRC', 'Jamaica':      'JAM',
  'Honduras':         'HON', 'Morocco':          'MAR', 'Senegal':      'SEN',
  'Egypt':            'EGY', 'Nigeria':          'NGA', 'Cameroon':     'CMR',
  'Algeria':          'ALG', "South Africa":     'RSA', "Côte d'Ivoire": 'CIV',
  'Ghana':            'GHA', 'Japan':            'JPN', 'South Korea':  'KOR',
  'Saudi Arabia':     'KSA', 'Iran':             'IRN', 'Australia':    'AUS',
  'Qatar':            'QAT', 'China':            'CHN', 'Iraq':         'IRQ',
  'New Zealand':      'NZL',
}

// ─── Funciones de sincronización ──────────────────────────────────────────────

/**
 * Obtiene los partidos en vivo o recién finalizados
 */
const getLiveMatches = async () => {
  try {
    const { data } = await apiFootball.get('/fixtures', {
      params: {
        league: WORLD_CUP_2026_ID,
        season: 2026,
        live: 'all',
      },
    })
    return data.response || []
  } catch (err) {
    console.error('Error fetching live matches:', err.message)
    return []
  }
}

/**
 * Obtiene los partidos del día
 */
const getTodayMatches = async () => {
  const today = new Date().toISOString().split('T')[0]
  try {
    const { data } = await apiFootball.get('/fixtures', {
      params: {
        league: WORLD_CUP_2026_ID,
        season: 2026,
        date: today,
      },
    })
    return data.response || []
  } catch (err) {
    console.error('Error fetching today matches:', err.message)
    return []
  }
}

/**
 * Obtiene la fixture completa del Mundial 2026 (para importación inicial)
 */
const importFullFixture = async () => {
  console.log('📥 Importando fixture completo del Mundial 2026...')
  try {
    const { data } = await apiFootball.get('/fixtures', {
      params: { league: WORLD_CUP_2026_ID, season: 2026 },
    })

    const fixtures = data.response || []
    console.log(`📋 ${fixtures.length} partidos encontrados`)

    let imported = 0
    let skipped = 0

    for (const fixture of fixtures) {
      const homeCode = TEAM_MAP[fixture.teams.home.name]
      const awayCode = TEAM_MAP[fixture.teams.away.name]

      if (!homeCode || !awayCode) {
        console.warn(`⚠️  Equipo no mapeado: ${fixture.teams.home.name} o ${fixture.teams.away.name}`)
        skipped++
        continue
      }

      const [teamHome, teamAway] = await Promise.all([
        prisma.team.findUnique({ where: { code: homeCode } }),
        prisma.team.findUnique({ where: { code: awayCode } }),
      ])

      if (!teamHome || !teamAway) { skipped++; continue }

      const phase = mapPhase(fixture.league.round)

      // Usar el ID externo como referencia para no duplicar
      const externalId = String(fixture.fixture.id)

      await prisma.match.upsert({
        where: { id: externalId },
        update: {
          dateUtc: new Date(fixture.fixture.date),
          venue: fixture.fixture.venue?.name,
          city: fixture.fixture.venue?.city,
          phase,
        },
        create: {
          id: externalId,
          teamHomeId: teamHome.id,
          teamAwayId: teamAway.id,
          dateUtc: new Date(fixture.fixture.date),
          venue: fixture.fixture.venue?.name,
          city: fixture.fixture.venue?.city,
          phase,
          status: 'SCHEDULED',
        },
      })
      imported++
    }

    console.log(`✅ Importados: ${imported} | Omitidos: ${skipped}`)
    return { imported, skipped }
  } catch (err) {
    console.error('❌ Error importando fixture:', err.message)
    throw err
  }
}

/**
 * Sincroniza los resultados de partidos finalizados
 * Esta función se llama desde el cron cada 5 minutos
 */
const syncFinishedMatches = async (io = null) => {
  const apiMatches = await getTodayMatches()
  const finishedInApi = apiMatches.filter(m =>
    ['FT', 'AET', 'PEN'].includes(m.fixture.status.short)
  )

  if (finishedInApi.length === 0) return

  for (const apiMatch of finishedInApi) {
    const externalId = String(apiMatch.fixture.id)

    // Verificar si ya lo tenemos como FINISHED
    const dbMatch = await prisma.match.findUnique({
      where: { id: externalId },
    })

    if (!dbMatch || dbMatch.status === 'FINISHED') continue

    const scoreHome = apiMatch.score.fulltime.home ?? 0
    const scoreAway = apiMatch.score.fulltime.away ?? 0
    const wentToPenalties = apiMatch.fixture.status.short === 'PEN'

    // Obtener el primer goleador del partido (si está disponible)
    let firstScorerId = null
    try {
      const { data: eventsData } = await apiFootball.get('/fixtures/events', {
        params: { fixture: apiMatch.fixture.id },
      })
      const firstGoal = eventsData.response?.find(e =>
        e.type === 'Goal' && e.detail !== 'Missed Penalty'
      )
      if (firstGoal) {
        // Buscar el jugador en nuestra DB por nombre
        const player = await prisma.player.findFirst({
          where: { name: { contains: firstGoal.player.name, mode: 'insensitive' } },
        })
        if (player) firstScorerId = player.id
      }
    } catch {
      // Los eventos son opcionales
    }

    console.log(`⚽ Sincronizando resultado: ${dbMatch.id} → ${scoreHome}-${scoreAway}`)

    // Reutilizar el motor de puntos del adminController
    // Simulamos el req/res para llamar la función existente
    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: dbMatch.id },
        data: { scoreHome, scoreAway, wentToPenalties, status: 'FINISHED' },
      })
    })

    // Llamar al calculador de puntos directamente
    const { calculatePredictionPoints } = require('../controllers/predictionController')
    const predictions = await prisma.prediction.findMany({ where: { matchId: dbMatch.id } })
    const matchWithScorer = { ...dbMatch, scoreHome, scoreAway, wentToPenalties, firstScorerId, phase: dbMatch.phase }

    for (const pred of predictions) {
      const pts = calculatePredictionPoints(pred, matchWithScorer)
      await prisma.prediction.update({ where: { id: pred.id }, data: pts })
      await prisma.user.update({
        where: { id: pred.userId },
        data: { totalPoints: { increment: pts.pointsTotal } },
      })
    }

    // Emitir actualización por socket si está disponible
    if (io) {
      io.emit('match:status', { matchId: dbMatch.id, status: 'FINISHED' })
      io.to('global').emit('leaderboard:update', { matchId: dbMatch.id })
    }
  }
}

/**
 * Actualiza el estado LIVE de los partidos en curso
 */
const syncLiveStatus = async (io = null) => {
  const liveMatches = await getLiveMatches()

  for (const apiMatch of liveMatches) {
    const externalId = String(apiMatch.fixture.id)
    const dbMatch = await prisma.match.findUnique({ where: { id: externalId } })
    if (!dbMatch || dbMatch.status === 'LIVE') continue

    await prisma.match.update({
      where: { id: externalId },
      data: { status: 'LIVE' },
    })

    if (io) {
      io.emit('match:status', { matchId: externalId, status: 'LIVE' })
    }
    console.log(`🟢 Partido en vivo: ${externalId}`)
  }
}

// ─── Mapeo de fases ───────────────────────────────────────────────────────────

const mapPhase = (round) => {
  if (!round) return 'GROUP'
  const r = round.toLowerCase()
  if (r.includes('group'))     return 'GROUP'
  if (r.includes('32') || r.includes('round of 32')) return 'R32'
  if (r.includes('16') || r.includes('round of 16')) return 'R16'
  if (r.includes('quarter'))   return 'QF'
  if (r.includes('semi'))      return 'SF'
  if (r.includes('3rd') || r.includes('third')) return 'THIRD'
  if (r.includes('final'))     return 'FINAL'
  return 'GROUP'
}

// ─── Cron jobs ────────────────────────────────────────────────────────────────

const startFootballApiCrons = (io = null) => {
  if (!process.env.FOOTBALL_API_KEY && !process.env.FOOTBALL_DATA_KEY) {
    console.log('⚠️  FOOTBALL_API_KEY no configurada. Sincronización automática desactivada.')
    return
  }

  console.log('⚽ Iniciando cron jobs de Football API...')

  // Cada 5 minutos: verificar partidos en vivo y resultados
  cron.schedule('*/5 * * * *', async () => {
    try {
      await syncLiveStatus(io)
      await syncFinishedMatches(io)
    } catch (err) {
      console.error('Error en sync cron:', err.message)
    }
  })

  // Cada día a las 06:00: importar fixture si hay partidos nuevos
  cron.schedule('0 6 * * *', async () => {
    try {
      await importFullFixture()
    } catch (err) {
      console.error('Error en daily fixture sync:', err.message)
    }
  })

  console.log('✅ Football API crons activos: sync cada 5min + fixture diario 06:00')
}

module.exports = {
  importFullFixture,
  syncFinishedMatches,
  syncLiveStatus,
  startFootballApiCrons,
}
