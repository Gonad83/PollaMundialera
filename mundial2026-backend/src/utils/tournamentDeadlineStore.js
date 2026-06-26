const prisma = require('./prisma');

// Fecha de cierre por defecto. Hoy ya está vencida → el torneo queda CERRADO
// salvo que el admin lo abra explícitamente (y ese cambio se persiste en BD).
const DEFAULT_DEADLINE = '2026-06-15T19:00:00.000Z';
const SETTING_KEY = 'tournament_deadline';

// Fuente de verdad en memoria para las lecturas síncronas (isLocked/getDeadline).
// Se hidrata desde la BD al arrancar el servidor.
let _deadline = DEFAULT_DEADLINE;

const getDeadline = () => _deadline;
const isLocked = () => new Date() > new Date(_deadline);

// Persistir el deadline en la tabla Setting para que sobreviva reinicios/deploys.
async function _persist(isoString) {
  await prisma.$executeRaw`
    INSERT INTO "Setting" ("key", "value", "updatedAt")
    VALUES (${SETTING_KEY}, ${isoString}, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = ${isoString}, "updatedAt" = now()
  `;
}

// Hidratar desde la BD al arrancar. Si no hay valor guardado, siembra el default
// (cerrado) y lo persiste. La BD tiene prioridad sobre cualquier variable de entorno,
// para que el estado de cierre NO se reabra solo en cada reinicio.
async function loadDeadlineFromDb() {
  try {
    const rows = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${SETTING_KEY} LIMIT 1`;
    if (Array.isArray(rows) && rows[0] && rows[0].value) {
      _deadline = rows[0].value;
    } else {
      _deadline = DEFAULT_DEADLINE;
      await _persist(_deadline);
    }
    console.log(`🔒 Deadline torneo: ${_deadline} · cerrado=${isLocked()}`);
  } catch (e) {
    console.error('[tournamentDeadline] loadFromDb error:', e.message);
  }
}

// Cambiar el deadline: efecto inmediato en memoria + persistencia durable en BD.
async function setDeadline(isoString) {
  _deadline = isoString;
  try {
    await _persist(isoString);
  } catch (e) {
    console.error('[tournamentDeadline] persist error:', e.message);
  }
}

module.exports = { getDeadline, setDeadline, isLocked, loadDeadlineFromDb };
