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
const REOPEN_ALLOWED_GROUP_NAMES_KEY = 'bracket_reopen_allowed_group_names';
const DEFAULT_BRACKET_REOPEN_EMAILS = ['garaosd@gmail.com'];
const DEFAULT_BRACKET_REOPEN_GROUP_NAMES = ['Real Ebolo'];
// Brasil vs Japón: 29/06/2026 13:00 hora Chile (UTC-4) = 17:00 UTC.
// La reapertura dura hasta el FIN de ese partido (~2h30: tiempo regular + alargue + penales).
// Si la BD trae el partido, se usa su fecha real + esa duración.
const MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000;
const BRAZIL_JAPAN_FALLBACK_CUTOFF = '2026-06-29T19:30:00.000Z';
let _bracketReopenUntil = null;
let _bracketReopenAllowedEmails = [];
let _bracketReopenAllowedGroupNames = [];

const getBracketReopenUntil = () => _bracketReopenUntil;
const isBracketReopen = () => !!_bracketReopenUntil && new Date() < new Date(_bracketReopenUntil);
const getBracketReopenAllowedEmails = () => [..._bracketReopenAllowedEmails];
const getBracketReopenAllowedGroupNames = () => [..._bracketReopenAllowedGroupNames];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeEmails = (emails) => {
  if (!Array.isArray(emails)) return [];
  return [...new Set(
    emails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean)
  )];
};

const normalizeGroupNames = (names) => {
  if (!Array.isArray(names)) return [];
  return [...new Set(names.map(normalizeText).filter(Boolean))];
};

const parseAllowedEmails = (raw) => {
  if (!raw) return [];
  try {
    return normalizeEmails(JSON.parse(raw));
  } catch {
    return normalizeEmails(String(raw).split(','));
  }
};

const parseAllowedGroupNames = (raw) => {
  if (!raw) return [];
  try {
    return normalizeGroupNames(JSON.parse(raw));
  } catch {
    return normalizeGroupNames(String(raw).split(','));
  }
};

const getBrazilJapanReopenCutoff = async () => {
  try {
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { teamHome: { code: 'BRA' }, teamAway: { code: 'JPN' } },
          { teamHome: { code: 'JPN' }, teamAway: { code: 'BRA' } },
        ],
      },
      select: { dateUtc: true },
      orderBy: { dateUtc: 'asc' },
    });

    if (match?.dateUtc) {
      return new Date(match.dateUtc.getTime() + MATCH_DURATION_MS).toISOString();
    }
  } catch (e) {
    console.error('[bracketReopen] cutoff lookup error:', e.message);
  }
  return BRAZIL_JAPAN_FALLBACK_CUTOFF;
};

// La reapertura, mientras esté activa, dura hasta el FIN del partido Brasil–Japón.
// Cualquier ventana activa se ancla a ese cierre (extiende la actual y limita futuras).
const clampBracketReopenUntil = async (untilIsoOrNull) => {
  if (!untilIsoOrNull) return null;
  return await getBrazilJapanReopenCutoff();
};

const isBracketReopenForUser = async (user, groupId = null) => {
  if (!isBracketReopen()) return false;
  if (_bracketReopenAllowedEmails.length === 0 && _bracketReopenAllowedGroupNames.length === 0) return true;

  const email = normalizeText(user?.email);
  if (email && _bracketReopenAllowedEmails.includes(email)) return true;

  if (user?.id && groupId && _bracketReopenAllowedGroupNames.length > 0) {
    const group = await prisma.group.findFirst({
      where: { id: groupId, members: { some: { userId: user.id } } },
      select: { name: true },
    });
    return !!group && _bracketReopenAllowedGroupNames.includes(normalizeText(group.name));
  }

  return false;
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
    const unclampedBracketReopenUntil = _bracketReopenUntil;
    _bracketReopenUntil = await clampBracketReopenUntil(_bracketReopenUntil);
    if (_bracketReopenUntil && _bracketReopenUntil !== unclampedBracketReopenUntil) {
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_KEY}, ${_bracketReopenUntil}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${_bracketReopenUntil}, "updatedAt" = now()
      `;
    }

    const allowed = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${REOPEN_ALLOWED_EMAILS_KEY} LIMIT 1`;
    const allowedRaw = Array.isArray(allowed) && allowed[0] ? allowed[0].value : null;
    _bracketReopenAllowedEmails = allowedRaw === null && _bracketReopenUntil
      ? DEFAULT_BRACKET_REOPEN_EMAILS
      : parseAllowedEmails(allowedRaw);

    const allowedGroups = await prisma.$queryRaw`SELECT "value" FROM "Setting" WHERE "key" = ${REOPEN_ALLOWED_GROUP_NAMES_KEY} LIMIT 1`;
    const allowedGroupsRaw = Array.isArray(allowedGroups) && allowedGroups[0] ? allowedGroups[0].value : null;
    _bracketReopenAllowedGroupNames = allowedGroupsRaw === null && _bracketReopenUntil
      ? normalizeGroupNames(DEFAULT_BRACKET_REOPEN_GROUP_NAMES)
      : parseAllowedGroupNames(allowedGroupsRaw);

    if (allowedRaw === null && _bracketReopenUntil) {
      const emailsJson = JSON.stringify(_bracketReopenAllowedEmails);
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_ALLOWED_EMAILS_KEY}, ${emailsJson}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${emailsJson}, "updatedAt" = now()
      `;
    }
    if (allowedGroupsRaw === null && _bracketReopenUntil) {
      const groupNamesJson = JSON.stringify(_bracketReopenAllowedGroupNames);
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_ALLOWED_GROUP_NAMES_KEY}, ${groupNamesJson}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${groupNamesJson}, "updatedAt" = now()
      `;
    }

    console.log(
      `Deadline torneo: ${_deadline} | cerrado=${isLocked()} | reaperturaCruces=${isBracketReopen()} | emails=${_bracketReopenAllowedEmails.join(',') || '-'} | grupos=${_bracketReopenAllowedGroupNames.join(',') || '-'}`
    );
  } catch (e) {
    console.error('[tournamentDeadline] loadFromDb error:', e.message);
  }
}

async function setBracketReopen(untilIsoOrNull, allowedEmails = [], allowedGroupNames = []) {
  _bracketReopenUntil = await clampBracketReopenUntil(untilIsoOrNull || null);
  _bracketReopenAllowedEmails = _bracketReopenUntil ? normalizeEmails(allowedEmails) : [];
  _bracketReopenAllowedGroupNames = _bracketReopenUntil ? normalizeGroupNames(allowedGroupNames) : [];

  try {
    if (_bracketReopenUntil) {
      const emailsJson = JSON.stringify(_bracketReopenAllowedEmails);
      const groupNamesJson = JSON.stringify(_bracketReopenAllowedGroupNames);
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
      await prisma.$executeRaw`
        INSERT INTO "Setting" ("key", "value", "updatedAt")
        VALUES (${REOPEN_ALLOWED_GROUP_NAMES_KEY}, ${groupNamesJson}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ${groupNamesJson}, "updatedAt" = now()
      `;
    } else {
      await prisma.$executeRaw`DELETE FROM "Setting" WHERE "key" = ${REOPEN_KEY}`;
      await prisma.$executeRaw`DELETE FROM "Setting" WHERE "key" = ${REOPEN_ALLOWED_EMAILS_KEY}`;
      await prisma.$executeRaw`DELETE FROM "Setting" WHERE "key" = ${REOPEN_ALLOWED_GROUP_NAMES_KEY}`;
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
  getBracketReopenAllowedGroupNames,
  setBracketReopen,
};
