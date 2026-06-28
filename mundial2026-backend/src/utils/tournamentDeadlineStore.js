const prisma = require('./prisma');

// Cierre real: 15/06/2026 18:00 hora Chile (UTC-4) = 22:00 UTC.
// La BD es la fuente durable para que el cierre sobreviva reinicios/deploys.
const DEFAULT_DEADLINE = '2026-06-15T22:00:00.000Z';
const OLD_SEEDED_DEADLINE = '2026-06-15T19:00:00.000Z';
const SETTING_KEY = 'tournament_deadline';

let _deadline = DEFAULT_DEADLINE;

const getDeadline = () => _deadline;
const isLocked = () => new Date() > new Date(_deadline);

// Reapertura acotada de cruces: 4tos/semis/finalistas solamente.
const REOPEN_KEY = 'bracket_reopen_until';
const REOPEN_ALLOWED_EMAILS_KEY = 'bracket_reopen_allowed_emails';
const DEFAULT_BRACKET_REOPEN_EMAILS = ['garaosd@gmail.com'];
let _bracketReopenUntil = null;
let _bracketReopenAllowedEmails = [];

const getBracketReopenUntil = () => _bracketReopenUntil;
const isBracketReopen = () => !!_bracketReopenUntil && new Date() < new Date(_bracketReopenUntil);
const getBracketReopenAllowedEmails = () => [..._bracketReopenAllowedEmails];

const normalizeEmails = (emails) => {
  if (!Array.isArray(emails)) return [];
  return [...new Set(
    emails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean)
  )];
};

const parseAllowedEmails = (raw) => {
  if (!raw) return [];
  try {
    return normalizeEmails(JSON.parse(raw));
  } catch {
    return normalizeEmails(String(raw).split(','));
  }
};

const isBracketReopenForUser = (user) => {
  if (!isBracketReopen()) return false;
  if (_bracketReopenAllowedEmails.length === 0) return true;
  const email = String(user?.email || '').trim().toLowerCase();
  return !!email && _bracketReopenAllowedEmails.includes(email);
};

async function persistDeadline(isoString) {
  await prisma.$executeRaw`
    INSERT INTO "Setting" ("key", "value", "updatedAt")
    VALUES (${SETTING_KEY}, ${isoString}, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = ${isoString}, "updatedAt" = now()
  `;
}

async function loadDeadlineFromDb() {
  try {
    const rows = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${SETTING_KEY} LIMIT 1`;
    if (Array.isArray(rows) && rows[0] && rows[0].value) {
      _deadline = rows[0].value;
      if (_deadline === OLD_SEEDED_DEADLINE) {
        _deadline = DEFAULT_DEADLINE;
        await persistDeadline(_deadline);
        console.log('Deadline corregido de 15:00 a 18:00 hora Chile');
      }
    } else {
      _deadline = DEFAULT_DEADLINE;
      await persistDeadline(_deadline);
    }

    const rr = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${REOPEN_KEY} LIMIT 1`;
    _bracketReopenUntil = (Array.isArray(rr) && rr[0] && rr[0].value) ? rr[0].value : null;

    const allowed = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${REOPEN_ALLOWED_EMAILS_KEY} LIMIT 1`;
    const allowedRaw = Array.isArray(allowed) && allowed[0] ? allowed[0].value : null;
    _bracketReopenAllowedEmails = allowedRaw === null && _bracketReopenUntil
      ? DEFAULT_BRACKET_REOPEN_EMAILS
      : parseAllowedEmails(allowedRaw);

    if (allowedRaw === null && _bracketReopenUntil) {
      const emailsJson = JSON.stringify(_bracketReopenAllowedEmails);
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_ALLOWED_EMAILS_KEY}, ${emailsJson}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${emailsJson}, "updatedAt" = now()
      `;
    }

    console.log(
      `Deadline torneo: ${_deadline} | cerrado=${isLocked()} | reaperturaCruces=${isBracketReopen()} | permitidos=${_bracketReopenAllowedEmails.join(',') || 'todos'}`
    );
  } catch (e) {
    console.error('[tournamentDeadline] loadFromDb error:', e.message);
  }
}

async function setBracketReopen(untilIsoOrNull, allowedEmails = []) {
  _bracketReopenUntil = untilIsoOrNull || null;
  _bracketReopenAllowedEmails = _bracketReopenUntil ? normalizeEmails(allowedEmails) : [];

  try {
    if (_bracketReopenUntil) {
      const emailsJson = JSON.stringify(_bracketReopenAllowedEmails);
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_KEY}, ${_bracketReopenUntil}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${_bracketReopenUntil}, "updatedAt" = now()
      `;
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_ALLOWED_EMAILS_KEY}, ${emailsJson}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${emailsJson}, "updatedAt" = now()
      `;
    } else {
      await prisma.$executeRaw`DELETE FROM "Setting" WHERE "key" = ${REOPEN_KEY}`;
      await prisma.$executeRaw`DELETE FROM "Setting" WHERE "key" = ${REOPEN_ALLOWED_EMAILS_KEY}`;
    }
  } catch (e) {
    console.error('[bracketReopen] persist error:', e.message);
  }
}

async function setDeadline(isoString) {
  _deadline = isoString;
  try {
    await persistDeadline(isoString);
  } catch (e) {
    console.error('[tournamentDeadline] persist error:', e.message);
  }
}

module.exports = {
  getDeadline,
  setDeadline,
  isLocked,
  loadDeadlineFromDb,
  isBracketReopen,
  isBracketReopenForUser,
  getBracketReopenUntil,
  getBracketReopenAllowedEmails,
  setBracketReopen,
};
