const { z } = require('zod');
const prisma = require('../utils/prisma');

// Domingo 15 de junio de 2026, 15:00 hora chilena (CLT, UTC-4).
// Puede sobreescribirse con TOURNAMENT_DEADLINE si hiciera falta.
const DEFAULT_TOURNAMENT_DEADLINE = '2026-06-15T19:00:00.000Z';
const TOURNAMENT_DEADLINE_ENV = process.env.TOURNAMENT_DEADLINE || DEFAULT_TOURNAMENT_DEADLINE;

const isTournamentLocked = () => {
  return new Date() > new Date(TOURNAMENT_DEADLINE_ENV);
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

  if (isTournamentLocked()) {
    return res.status(403).json({
      error: 'El plazo para los pronósticos del torneo ha cerrado',
      deadline: TOURNAMENT_DEADLINE_ENV,
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
  const existing = await prisma.tournamentPicks.findUnique({
    where: { userId_groupId: { userId: req.user.id, groupId } },
    select: Object.fromEntries(ARRAY_FIELDS.map(f => [f, true])),
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

  const picks = await prisma.tournamentPicks.upsert({
    where: { userId_groupId: { userId: req.user.id, groupId } },
    update: updateData,
    create: { userId: req.user.id, groupId, ...parsed.data },
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

module.exports = { getMyPicks, savePicks, getUserPicks };
