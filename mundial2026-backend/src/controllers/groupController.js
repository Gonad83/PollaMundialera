const { z } = require('zod');
const crypto = require('crypto');
const prisma = require('../utils/prisma');

const createGroupSchema = z.object({
  name: z.string().min(3).max(50),
  ruleSet: z.enum(['BASIC', 'COMPLETE', 'CUSTOM']).default('BASIC'),
});

const generateCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();
const generateToken = () => crypto.randomBytes(16).toString('hex');

// Límites por plan
const PLAN_LIMITS = {
  FREE:    { maxGroups: 1,  maxMembers: 5,   allowedRules: ['BASIC'] },
  CLASICO: { maxGroups: 1,  maxMembers: 15,  allowedRules: ['BASIC', 'COMPLETE'] },
  DT:      { maxGroups: 3,  maxMembers: 50,  allowedRules: ['BASIC', 'COMPLETE'] },
  PRO:     { maxGroups: 99, maxMembers: 150, allowedRules: ['BASIC', 'COMPLETE', 'CUSTOM'] },
};

// POST /api/groups — Crear grupo
const createGroup = async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const plan = req.user.plan || 'FREE';
  const limits = PLAN_LIMITS[plan];

  // Validar ruleSet según plan
  if (!limits.allowedRules.includes(parsed.data.ruleSet)) {
    return res.status(403).json({
      error: `El set de reglas "${parsed.data.ruleSet}" requiere un plan superior.`,
      code: 'PLAN_REQUIRED',
      requiredPlan: parsed.data.ruleSet === 'CUSTOM' ? 'PRO' : 'CLASICO',
    });
  }

  // Contar grupos que ya creó
  const ownedGroups = await prisma.group.count({ where: { creatorId: req.user.id } });
  if (ownedGroups >= limits.maxGroups) {
    return res.status(403).json({
      error: `Tu plan ${plan} permite crear hasta ${limits.maxGroups} grupo(s). Actualiza tu plan para crear más.`,
      code: 'PLAN_REQUIRED',
      requiredPlan: plan === 'FREE' ? 'CLASICO' : 'PRO',
    });
  }

  let inviteCode, attempts = 0;
  do {
    inviteCode = generateCode();
    attempts++;
  } while (await prisma.group.findUnique({ where: { inviteCode } }) && attempts < 10);

  let inviteToken, tokenAttempts = 0;
  do {
    inviteToken = generateToken();
    tokenAttempts++;
  } while (await prisma.group.findUnique({ where: { inviteToken } }) && tokenAttempts < 10);

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      maxMembers: limits.maxMembers,
      inviteCode,
      inviteToken,
      ruleSet: parsed.data.ruleSet,
      creatorId: req.user.id,
      members: {
        create: { userId: req.user.id },
      },
    },
    include: {
      _count: { select: { members: true } },
      members: { include: { user: { select: { id: true, username: true } } } },
    },
  });

  await prisma.leaderboardEntry.create({
    data: { userId: req.user.id, groupId: group.id, rank: 1 },
  });

  return res.status(201).json(group);
};

// POST /api/groups/join — Unirse con código
const joinGroup = async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: 'Código de invitación requerido' });
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    include: { _count: { select: { members: true } } },
  });

  if (!group) return res.status(404).json({ error: 'Código inválido o grupo no encontrado' });

  if (!group.inviteActive) {
    return res.status(403).json({ error: 'El link de invitación está desactivado' });
  }

  if (group._count.members >= group.maxMembers) {
    return res.status(409).json({
      error: `El grupo "${group.name}" ha alcanzado su límite de ${group.maxMembers} personas.`,
    });
  }

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.user.id, groupId: group.id } },
  });

  if (alreadyMember) return res.status(409).json({ error: 'Ya eres miembro de este grupo' });

  await prisma.groupMember.create({
    data: { userId: req.user.id, groupId: group.id },
  });

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  await prisma.leaderboardEntry.upsert({
    where: { userId_groupId: { userId: req.user.id, groupId: group.id } },
    update: { rank: memberCount },
    create: { userId: req.user.id, groupId: group.id, rank: memberCount },
  });

  return res.json({ message: `Te uniste a "${group.name}"`, group });
};

// GET /api/groups/join/:token — Unirse por link
const joinByToken = async (req, res) => {
  const { token } = req.params;

  const group = await prisma.group.findUnique({
    where: { inviteToken: token },
    include: {
      _count: { select: { members: true } },
      creator: { select: { id: true, username: true } },
    },
  });

  if (!group) return res.status(404).json({ error: 'Link de invitación inválido' });
  if (!group.inviteActive) return res.status(403).json({ error: 'Este link de invitación fue desactivado' });

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.user.id, groupId: group.id } },
  });

  if (alreadyMember) {
    return res.json({ message: 'Ya eres miembro', group, alreadyMember: true });
  }

  if (group._count.members >= group.maxMembers) {
    return res.status(409).json({ error: `El grupo "${group.name}" ya está lleno` });
  }

  await prisma.groupMember.create({
    data: { userId: req.user.id, groupId: group.id },
  });

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  await prisma.leaderboardEntry.upsert({
    where: { userId_groupId: { userId: req.user.id, groupId: group.id } },
    update: { rank: memberCount },
    create: { userId: req.user.id, groupId: group.id, rank: memberCount },
  });

  return res.json({ message: `Te uniste a "${group.name}"`, group });
};

// GET /api/groups/token/:token — Info del grupo por token (para preview antes de unirse)
const getGroupByToken = async (req, res) => {
  const { token } = req.params;
  const group = await prisma.group.findUnique({
    where: { inviteToken: token },
    select: {
      id: true, name: true, inviteActive: true,
      _count: { select: { members: true } },
      maxMembers: true,
      creator: { select: { username: true } },
    },
  });

  if (!group) return res.status(404).json({ error: 'Link inválido' });
  return res.json(group);
};

// PATCH /api/groups/:id/invite — Activar/desactivar link de invitación
const toggleInviteLink = async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  if (group.creatorId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Solo el administrador del grupo puede hacer esto' });
  }

  const updated = await prisma.group.update({
    where: { id: req.params.id },
    data: { inviteActive: !group.inviteActive },
  });

  return res.json({ inviteActive: updated.inviteActive });
};

// GET /api/groups/my — Mis grupos
const getMyGroups = async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user.id },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          creator: { select: { id: true, username: true } },
        },
      },
    },
  });

  return res.json(memberships.map((m) => m.group));
};

// GET /api/groups/:id — Info del grupo
const getGroup = async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, avatarUrl: true, totalPoints: true } } },
        orderBy: { user: { totalPoints: 'desc' } },
      },
      creator: { select: { id: true, username: true } },
    },
  });

  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });

  if (req.user.role !== 'SUPER_ADMIN') {
    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'No eres miembro de este grupo' });
  }

  return res.json(group);
};

// GET /api/groups — Todos los grupos (admin o públicos)
const listAllGroups = async (req, res) => {
  const isAdmin = req.user.role === 'SUPER_ADMIN';

  const groups = await prisma.group.findMany({
    where: isAdmin ? undefined : { isPublic: true },
    include: {
      _count: { select: { members: true } },
      creator: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(groups.map(g => {
    if (isAdmin) return g;
    const { inviteCode, inviteToken, paymentId, paymentStatus, ...rest } = g;
    return rest;
  }));
};

// [ADMIN] PATCH /api/admin/groups/:id/premium
const updateGroupPremium = async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Prohibido' });

  const { isPremium, maxMembers, activePlan } = req.body;

  const group = await prisma.group.update({
    where: { id: req.params.id },
    data: {
      isPremium: !!isPremium,
      maxMembers: maxMembers || (isPremium ? 999 : 3),
      activePlan: activePlan || null,
    },
  });

  return res.json({ message: 'Grupo actualizado', group });
};

// [ADMIN] DELETE /api/admin/groups/:id
const deleteGroup = async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Prohibido' });

  const { confirm } = req.query; // ?confirm=true requerido para borrar con picks activos

  // Advertir si el grupo tiene pronósticos del torneo guardados
  const picksCount = await prisma.tournamentPicks.count({ where: { groupId: req.params.id } });
  if (picksCount > 0 && confirm !== 'true') {
    return res.status(409).json({
      error: `Este grupo tiene ${picksCount} pronóstico(s) de torneo. Agrega ?confirm=true para confirmar el borrado.`,
      picksCount,
    });
  }

  await prisma.group.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Grupo eliminado', picksDeleted: picksCount });
};

// [ADMIN] POST /api/admin/open-pool — Crear o activar Polla Abierta
const createOpenPool = async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Prohibido' });

  const existing = await prisma.group.findFirst({ where: { isPublic: true } });
  if (existing) {
    return res.json({ message: 'La Polla Abierta ya existe', group: existing });
  }

  let inviteCode, attempts = 0;
  do {
    inviteCode = generateCode();
    attempts++;
  } while (await prisma.group.findUnique({ where: { inviteCode } }) && attempts < 10);

  const inviteToken = generateToken();

  const group = await prisma.group.create({
    data: {
      name: 'Polla Mundial 2026 — Abierta',
      inviteCode,
      inviteToken,
      isPublic: true,
      maxMembers: 999999,
      ruleSet: 'COMPLETE',
      creatorId: req.user.id,
    },
  });

  return res.status(201).json({ message: 'Polla Abierta creada', group });
};

// GET /api/groups/:id/messages — Obtener mensajes del grupo
const getGroupMessages = async (req, res) => {
  const { id } = req.params;
  const group = await prisma.group.findUnique({
    where: { id },
    select: { announcements: true, creatorId: true, members: { select: { userId: true } } },
  });
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });

  const isMember = group.members.some(m => m.userId === req.user.id) || req.user.role === 'SUPER_ADMIN';
  if (!isMember) return res.status(403).json({ error: 'No eres miembro de este grupo' });

  return res.json(group.announcements || []);
};

// POST /api/groups/:id/messages — Admin envía mensaje a todos los miembros del grupo
const sendGroupMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

  const group = await prisma.group.findUnique({
    where: { id },
    select: { creatorId: true, name: true, announcements: true },
  });
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });

  if (group.creatorId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Solo el administrador puede enviar mensajes' });
  }

  const newMsg = {
    id: Date.now().toString(),
    message: message.trim(),
    sentBy: req.user.username || req.user.id,
    sentAt: new Date().toISOString(),
  };

  const current = Array.isArray(group.announcements) ? group.announcements : [];
  // Mantener últimos 50 mensajes
  const updated = [...current, newMsg].slice(-50);

  await prisma.group.update({
    where: { id },
    data: { announcements: updated },
  });

  // Emitir en tiempo real a la sala del grupo via Socket.io
  // El req.app.get('io') solo está disponible si pasamos el request al controller
  // Lo hacemos via el router — ver route handler más abajo
  return res.json({ message: 'Mensaje enviado', announcement: newMsg });
};

// DELETE /api/groups/:id/members/:userId — El admin expulsa a un miembro
const removeMember = async (req, res) => {
  const { id, userId } = req.params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });

  // Solo el creador o un SUPER_ADMIN puede expulsar
  if (group.creatorId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Solo el administrador puede expulsar miembros' });
  }

  // No puede expulsarse a sí mismo como creador
  if (userId === group.creatorId) {
    return res.status(400).json({ error: 'El administrador no puede ser expulsado' });
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: id } },
  });
  if (!member) return res.status(404).json({ error: 'El usuario no es miembro del grupo' });

  // Eliminar membresía, predicciones del grupo y entrada en leaderboard
  await prisma.$transaction([
    prisma.groupMember.delete({ where: { userId_groupId: { userId, groupId: id } } }),
    prisma.leaderboardEntry.deleteMany({ where: { userId, groupId: id } }),
  ]);

  return res.json({ message: 'Miembro eliminado del grupo' });
};

// PATCH /api/groups/:id — El admin actualiza nombre/estado del grupo
const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, inviteActive, paymentLink, paymentButtonEnabled, paymentAmount } = req.body;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });

  if (group.creatorId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Solo el administrador puede editar el grupo' });
  }

  const data = {};
  if (name && name.trim().length >= 3) data.name = name.trim();
  if (typeof inviteActive === 'boolean') data.inviteActive = inviteActive;
  if (typeof paymentButtonEnabled === 'boolean') data.paymentButtonEnabled = paymentButtonEnabled;
  if (typeof paymentLink === 'string') {
    const cleanPaymentLink = paymentLink.trim();
    if (cleanPaymentLink && !/^https?:\/\//i.test(cleanPaymentLink)) {
      return res.status(400).json({ error: 'El link de pago debe comenzar con http:// o https://' });
    }
    data.paymentLink = cleanPaymentLink || null;
  }
  if (paymentAmount !== undefined) {
    const amount = Number(paymentAmount);
    if (!Number.isInteger(amount) || amount < 0) {
      return res.status(400).json({ error: 'El monto de la cuota debe ser un numero valido' });
    }
    data.paymentAmount = amount;
  }

  const updated = await prisma.group.update({ where: { id }, data });
  return res.json(updated);
};

module.exports = {
  createGroup,
  joinGroup,
  joinByToken,
  getGroupByToken,
  toggleInviteLink,
  getMyGroups,
  getGroup,
  listAllGroups,
  updateGroupPremium,
  deleteGroup,
  createOpenPool,
  removeMember,
  updateGroup,
  getGroupMessages,
  sendGroupMessage,
};
