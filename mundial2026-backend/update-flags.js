require('dotenv').config();
const prisma = require('./src/utils/prisma');
const https = require('https');

function fetchApi(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'api.football-data.org', path, headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); }
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const data = await fetchApi('/v4/competitions/WC/teams');
  const teams = data.teams || [];
  console.log('Equipos desde API:', teams.length);
  
  let updated = 0;
  for (const t of teams) {
    if (!t.tla || !t.crest) continue;
    const r = await prisma.team.updateMany({ where: { code: t.tla }, data: { flagUrl: t.crest } });
    if (r.count > 0) updated++;
  }
  console.log('Escudos actualizados:', updated);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
