const { z } = require('zod');
const prisma = require('../utils/prisma');
const {
  getDeadline,
  isLocked: isTournamentLocked,
  isBracketReopenForUser,
  getBracketReopenUntil,
  getBracketReopenAllowedEmails,
  getBracketReopenAllowedGroupNames,
} = require('../utils/tournamentDeadlineStore');
const { getTournamentStats: readTournamentStats } = require('../utils/tournamentStats');

// Únicos campos editables durante la reapertura acotada: de 4tos en adelante (nada más).
// Los 8vos (round16Teams) NO se pueden cambiar.
const BRACKET_REOPEN_FIELDS = ['finalist1', 'finalist2', 'semifinalists', 'quarterfinalists'];
const pickOnly = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));
const filterAllowed = (items, allowed) => {
  if (!Array.isArray(items)) return items;
  const allowedSet = new Set(Array.isArray(allowed) ? allowed : []);
  return items.filter(id => allowedSet.has(id));
};
const keepFinalistIfAllowed = (value, allowed) => {
  if (value == null) return value;
  const allowedSet = new Set(Array.isArray(allowed) ? allowed : []);
  return allowedSet.has(value) ? value : undefined;
};

const picksSchema = z.object({
  champion:           z.string().optional().nullable(),
  finalist1:          z.string().optional().nullable(),
  finalist2:          z.string().optional().nullable(),
  round32Teams:       z.array(z.string()).max(32).optional(),
  round16Teams:       z.array(z.string()).max(16).optional(),
  semifinalists:      z.array(z.string()).max(4).optional(),
  quarterfinalists:   z.array(z.string()).max(8).optional(),
  groupQualifiers:    z.array(z.string()).max(32).optional(),
  topScorerId:        z.string().optional().nullable(),
  bestPlayerId:       z.string().optional().nullable(),
  bestKeeperId:       z.string().optional().nullable(),
  bestYoungId:        z.string().optional().nullable(),
  // El input del frontend entrega string ("172" o "") — normalizar antes de validar
  totalGoals:         z.preprocess(
    (v) => (v === '' || v === null || v === undefined) ? null : Number(v),
    z.number().int().min(0).max(300).nullable()
  ).optional(),
  mostGoalsTeamId:    z.string().optional().nullable(),
  leastGoalsTeamId:   z.string().optional().nullable(),
  hostFurthest:       z.string().optional().nullable(),
}).partial();

// GET /api/tournament/picks — Mis picks del torneo
const getMyPicks = async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'groupId es requerido' });

  const picks = await prisma.tournamentPicks.findUnique({
    where: { userId_groupId: { userId: req.user.id, groupId } },
  });
  return res.json(picks || {});
};

// PUT /api/tournament/picks — Guardar/actualizar mis picks
const savePicks = async (req, res) => {
  const { groupId, ...bodyData } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId es requerido' });

  const locked = isTournamentLocked();
  const reopen = await isBracketReopenForUser(req.user, groupId);
  // Cerrado y sin reapertura → bloqueado del todo.
  if (locked && !reopen) {
    return res.status(403).json({
      error: 'El plazo para los pronósticos del torneo ha cerrado',
      deadline: getDeadline(),
    });
  }

  const parsed = picksSchema.safeParse(bodyData);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  // Proteger arrays existentes: no sobrescribir con array vacío si ya había datos.
  // Un array [] en el body significa "sin cambio", no "borrar todo".
  // El único camino para vaciar un array es desmarcar equipos uno a uno en la UI.
  const ARRAY_FIELDS = ['round32Teams', 'round16Teams', 'semifinalists', 'quarterfinalists', 'groupQualifiers'];
  const EXISTING_FIELDS = [...ARRAY_FIELDS, 'champion', 'finalist1', 'finalist2'];
  const existing = await prisma.tournamentPicks.findUnique({
    where: { userId_groupId: { userId: req.user.id, groupId } },
    select: Object.fromEntries(EXISTING_FIELDS.map(f => [f, true])),
  });

  const updateData = { ...parsed.data };
  if (existing) {
    for (const field of ARRAY_FIELDS) {
      const incoming = updateData[field];
      const stored   = existing[field];
      if (Array.isArray(incoming) && incoming.length === 0 &&
          Array.isArray(stored)   && stored.length > 0) {
        delete updateData[field]; // no pisar datos reales con array vacío
      }
    }
  }

  // Reapertura acotada: aunque el torneo esté cerrado, SOLO se aplican los campos de
  // cruces (8vos/4tos/semis/finalistas). El resto se ignora aquí, pase lo que pase en el front.
  let finalUpdate = updateData;
  let finalCreate = parsed.data;
  if (locked && reopen) {
    finalUpdate = pickOnly(updateData, BRACKET_REOPEN_FIELDS);
    finalCreate = pickOnly(parsed.data, BRACKET_REOPEN_FIELDS);

    if (existing) {
      // 8vos NO es editable: los 4tos deben salir de los 8vos ya guardados.
      const round16Base = existing.round16Teams;
      if (Array.isArray(finalUpdate.quarterfinalists)) {
        finalUpdate.quarterfinalists = filterAllowed(finalUpdate.quarterfinalists, round16Base);
      }

      const quarterfinalBase = Array.isArray(finalUpdate.quarterfinalists) ? finalUpdate.quarterfinalists : existing.quarterfinalists;
      if (Array.isArray(finalUpdate.semifinalists)) {
        finalUpdate.semifinalists = filterAllowed(finalUpdate.semifinalists, quarterfinalBase);
      }

      const semifinalBase = Array.isArray(finalUpdate.semifinalists) ? finalUpdate.semifinalists : existing.semifinalists;
      if ('finalist1' in finalUpdate) {
        const finalist = keepFinalistIfAllowed(finalUpdate.finalist1, semifinalBase);
        if (finalist === undefined) delete finalUpdate.finalist1;
        else finalUpdate.finalist1 = finalist;
      }
      if ('finalist2' in finalUpdate) {
        const finalist = keepFinalistIfAllowed(finalUpdate.finalist2, semifinalBase);
        if (finalist === undefined) delete finalUpdate.finalist2;
        else finalUpdate.finalist2 = finalist;
      }
    }

    if (existing?.champion) {
      if (existing.finalist1 === existing.champion) {
        finalUpdate.finalist1 = existing.champion;
      }
      if (existing.finalist2 === existing.champion) {
        finalUpdate.finalist2 = existing.champion;
      }
    }
  }

  const picks = await prisma.tournamentPicks.upsert({
    where: { userId_groupId: { userId: req.user.id, groupId } },
    update: finalUpdate,
    create: { userId: req.user.id, groupId, ...finalCreate },
  });

  return res.json(picks);
};

// GET /api/tournament/picks/:userId — Ver picks de otro usuario (post-cierre)
const getUserPicks = async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'groupId es requerido' });

  // Solo se revelan los picks de otros cuando el torneo ha comenzado
  if (!isTournamentLocked() && req.user.id !== req.params.userId) {
    return res.status(403).json({
      error: 'Los pronósticos se revelan cuando cierra el plazo de apuestas',
    });
  }

  const picks = await prisma.tournamentPicks.findUnique({
    where: { userId_groupId: { userId: req.params.userId, groupId } },
  });

  if (!picks) return res.status(404).json({ error: 'Usuario no encontró pronósticos para este grupo' });
  return res.json(picks);
};

// GET /api/tournament/deadline — Deadline actual (público)
const getDeadlineInfo = async (req, res) => {
  const { groupId } = req.query;
  const bracketReopen = await isBracketReopenForUser(req.user, groupId);
  res.json({
    deadline: getDeadline(),
    locked: isTournamentLocked(),
    bracketReopen,
    bracketReopenUntil: getBracketReopenUntil(),
    bracketReopenAllowedEmails: req.user?.role === 'SUPER_ADMIN' ? getBracketReopenAllowedEmails() : undefined,
    bracketReopenAllowedGroupNames: req.user?.role === 'SUPER_ADMIN' ? getBracketReopenAllowedGroupNames() : undefined,
  });
};

// GET /api/tournament/stats — Goles totales, equipo con mas/menos goles, top 5 goleadores (público)
const getTournamentStats = async (req, res) => {
  const stats = await readTournamentStats();
  return res.json(stats || { totalGoals: 0, mostGoalsTeam: null, leastGoalsTeam: null, topScorers: [], updatedAt: null });
};

module.exports = { getMyPicks, savePicks, getUserPicks, getDeadlineInfo, getTournamentStats };
