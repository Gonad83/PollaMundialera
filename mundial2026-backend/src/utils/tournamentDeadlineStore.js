const prisma = require('./prisma');

// Fecha de cierre real: 15/06/2026 18:00 hora Chile (UTC-4) = 22:00 UTC.
// Hoy ya está vencida → el torneo queda CERRADO salvo que el admin lo abra
// explícitamente (y ese cambio se persiste en BD).
const DEFAULT_DEADLINE = '2026-06-15T22:00:00.000Z';
// Valor que se auto-sembró por error (15:00 Chile en vez de 18:00). Se corrige solo.
const OLD_SEEDED_DEADLINE = '2026-06-15T19:00:00.000Z';
const SETTING_KEY = 'tournament_deadline';

// Fuente de verdad en memoria para las lecturas síncronas (isLocked/getDeadline).
// Se hidrata desde la BD al arrancar el servidor.
let _deadline = DEFAULT_DEADLINE;

const getDeadline = () => _deadline;
const isLocked = () => new Date() > new Date(_deadline);

// ── Reapertura ACOTADA de cruces (4tos/semis/finalistas) ──────────────────────
// Ventana temporal donde se permite editar SOLO esos campos aunque el torneo esté
// cerrado (para rectificar tras el error del simulador). Auto-expira por seguridad.
const REOPEN_KEY = 'bracket_reopen_until';
let _bracketReopenUntil = null; // ISO string o null
const getBracketReopenUntil = () => _bracketReopenUntil;
const isBracketReopen = () => !!_bracketReopenUntil && new Date() < new Date(_bracketReopenUntil);

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
      // Corregir una sola vez el valor mal sembrado (15:00 → 18:00 hora Chile).
      if (_deadline === OLD_SEEDED_DEADLINE) {
        _deadline = DEFAULT_DEADLINE;
        await _persist(_deadline);
        console.log('🔧 Deadline corregido de 15:00 a 18:00 hora Chile');
      }
    } else {
      _deadline = DEFAULT_DEADLINE;
      await _persist(_deadline);
    }
    // Cargar ventana de reapertura de cruces (si existe)
    const rr = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${REOPEN_KEY} LIMIT 1`;
    _bracketReopenUntil = (Array.isArray(rr) && rr[0] && rr[0].value) ? rr[0].value : null;
    console.log(`🔒 Deadline torneo: ${_deadline} · cerrado=${isLocked()} · reaperturaCruces=${isBracketReopen()}`);
  } catch (e) {
    console.error('[tournamentDeadline] loadFromDb error:', e.message);
  }
}

// Abrir/cerrar la ventana de reapertura de cruces (persistente).
async function setBracketReopen(untilIsoOrNull) {
  _bracketReopenUntil = untilIsoOrNull || null;
  try {
    if (_bracketReopenUntil) {
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_KEY}, ${_bracketReopenUntil}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${_bracketReopenUntil}, "updatedAt" = now()
      `;
    } else {
      await prisma.$executeRaw`DELETE FROM "Setting" WHERE "key" = ${REOPEN_KEY}`;
    }
  } catch (e) {
    console.error('[bracketReopen] persist error:', e.message);
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

module.exports = {
  getDeadline, setDeadline, isLocked, loadDeadlineFromDb,
  isBracketReopen, getBracketReopenUntil, setBracketReopen,
};
