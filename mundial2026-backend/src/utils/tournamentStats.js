const https = require('https');
const prisma = require('./prisma');

const STATS_KEY = 'tournament_stats';

function fetchScorers(limit = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.football-data.org',
      path: `/v4/competitions/WC/scorers?season=2026&limit=${limit}`,
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
            reject(new Error(parsed.message || parsed.error || `scorers HTTP ${res.statusCode}`));
            return;
          }
          resolve(parsed.scorers || []);
        } catch (e) { reject(new Error('Error parsing scorers response: ' + data)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Goles que cuentan: 90 min + alargue si lo hubo. Los penales de la definición
// NUNCA suman (mismo criterio que la puntuación de pronósticos).
async function computeGoalStats() {
  const matches = await prisma.match.findMany({
    where: { status: 'FINISHED' },
    include: { teamHome: true, teamAway: true },
  });

  let totalGoals = 0;
  const perTeam = new Map();

  const addGoals = (team, goals) => {
    if (!perTeam.has(team.id)) {
      perTeam.set(team.id, { id: team.id, name: team.name, code: team.code, flagUrl: team.flagUrl, goalsFor: 0 });
    }
    perTeam.get(team.id).goalsFor += goals;
  };

  for (const m of matches) {
    const home = m.extraTimeHome ?? m.scoreHome;
    const away = m.extraTimeAway ?? m.scoreAway;
    if (home == null || away == null) continue;
    totalGoals += home + away;
    addGoals(m.teamHome, home);
    addGoals(m.teamAway, away);
  }

  const teams = [...perTeam.values()].sort((a, b) => b.goalsFor - a.goalsFor);
  const mostGoalsTeam = teams[0] || null;
  const leastGoalsTeam = teams.length ? teams[teams.length - 1] : null;

  return { totalGoals, mostGoalsTeam, leastGoalsTeam };
}

async function syncTournamentStats() {
  const goalStats = await computeGoalStats();

  let topScorers = [];
  try {
    const raw = await fetchScorers(5);
    topScorers = raw.map(s => ({
      name: s.player?.name || 'Desconocido',
      team: s.team?.name || '',
      code: s.team?.tla || '',
      flagUrl: s.team?.crest || null,
      goals: s.goals || 0,
    }));
  } catch (e) {
    console.error('[tournamentStats] scorers fetch error:', e.message);
  }

  const payload = {
    totalGoals: goalStats.totalGoals,
    mostGoalsTeam: goalStats.mostGoalsTeam,
    leastGoalsTeam: goalStats.leastGoalsTeam,
    topScorers,
    updatedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(payload);
  await prisma.$executeRaw`
    INSERT INTO "Setting" ("key", "value", "updatedAt")
    VALUES (${STATS_KEY}, ${json}, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = ${json}, "updatedAt" = now()
  `;

  return payload;
}

async function getTournamentStats() {
  const rows = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${STATS_KEY} LIMIT 1`;
  if (Array.isArray(rows) && rows[0] && rows[0].value) {
    try { return JSON.parse(rows[0].value); } catch { return null; }
  }
  return null;
}

module.exports = { syncTournamentStats, getTournamentStats };
