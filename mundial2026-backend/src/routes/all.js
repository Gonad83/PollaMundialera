// ─── matches ──────────────────────────────────────────────────────────────────
const matchRouter = require('express').Router();
const mc = require('../controllers/matchController');

matchRouter.get('/',                  mc.getMatches);
matchRouter.get('/upcoming',          mc.getUpcoming);
matchRouter.get('/teams',             mc.getTeams);
matchRouter.get('/teams/:id/players', mc.getTeamPlayers);
matchRouter.get('/:id',               mc.getMatch);

module.exports.matchRouter = matchRouter;

// ─── predictions ──────────────────────────────────────────────────────────────
const predRouter = require('express').Router();
const pc = require('../controllers/predictionController');
const { authenticate, optionalAuthenticate } = require('../middlewares/auth');

predRouter.use(authenticate);
predRouter.get('/my',                      pc.getMyPredictions);
predRouter.get('/group/:groupId/compare',  pc.getGroupCompare);
predRouter.get('/match/:matchId',          pc.getForMatch);
predRouter.post('/match/:matchId',         pc.upsert);
predRouter.put('/match/:matchId',          pc.upsert);
predRouter.get('/match/:matchId/all',      pc.getAllForMatch);

module.exports.predRouter = predRouter;

// ─── tournament ───────────────────────────────────────────────────────────────
const tournRouter = require('express').Router();
const tc = require('../controllers/tournamentController');

tournRouter.get('/deadline',        optionalAuthenticate, tc.getDeadlineInfo);
tournRouter.get('/stats',           tc.getTournamentStats);
tournRouter.use(authenticate);
tournRouter.get('/picks',          tc.getMyPicks);
tournRouter.put('/picks',          tc.savePicks);
tournRouter.get('/picks/:userId',  tc.getUserPicks);

module.exports.tournRouter = tournRouter;

// ─── groups ───────────────────────────────────────────────────────────────────
const groupRouter = require('express').Router();
const gc = require('../controllers/groupController');

groupRouter.get('/token/:token',            gc.getGroupByToken);
groupRouter.use(authenticate);
groupRouter.get('/',                        gc.listAllGroups);
groupRouter.post('/',                       gc.createGroup);
groupRouter.post('/join',                   gc.joinGroup);
groupRouter.get('/my',                      gc.getMyGroups);
groupRouter.post('/join/:token',            gc.joinByToken);
groupRouter.patch('/:id/invite',            gc.toggleInviteLink);
groupRouter.patch('/:id',                   gc.updateGroup);          // admin: renombrar/config
groupRouter.delete('/:id/members/:userId',  gc.removeMember);         // admin: expulsar miembro
groupRouter.get('/:id/messages',            gc.getGroupMessages);     // miembros: ver mensajes
groupRouter.post('/:id/messages',           gc.sendGroupMessage);     // admin: enviar mensaje
groupRouter.get('/:id',                     gc.getGroup);

module.exports.groupRouter = groupRouter;

// ─── leaderboard ──────────────────────────────────────────────────────────────
const lbRouter = require('express').Router();
const lc = require('../controllers/leaderboardController');

lbRouter.get('/global',           lc.getGlobal);
lbRouter.get('/me',               authenticate, lc.getMyRank);
lbRouter.get('/group/:groupId',   authenticate, lc.getGroup);

module.exports.lbRouter = lbRouter;

// ─── admin ────────────────────────────────────────────────────────────────────
const adminRouter = require('express').Router();
const { authenticate: auth, requireAdmin } = require('../middlewares/auth');
const ac = require('../controllers/adminController');

adminRouter.use(auth, requireAdmin);
adminRouter.get('/dashboard',                    ac.getDashboard);
adminRouter.post('/matches/:matchId/result',     ac.setMatchResult);
adminRouter.put('/matches/:matchId/status',      ac.setMatchStatus);
adminRouter.post('/tournament/awards',           ac.setTournamentAwards);
adminRouter.post('/tournament/recalculate',      ac.manualRecalculateTournament);
adminRouter.post('/sync',                        ac.syncMatches);
adminRouter.post('/leaderboard/rebuild',         ac.manualRebuildLeaderboard);
adminRouter.get('/tournament/completion',        ac.getTournamentCompletion);
adminRouter.get('/tournament/deadline',          ac.getAdminDeadline);
adminRouter.post('/tournament/deadline',         ac.setAdminDeadline);
adminRouter.get('/tournament/changes',           ac.getTournamentChanges);
adminRouter.get('/tournament/bracket-reopen',    ac.getBracketReopenStatus);
adminRouter.post('/tournament/bracket-reopen',   ac.setBracketReopenStatus);
adminRouter.get('/users',                        ac.getUsers);
adminRouter.post('/broadcast',                   ac.sendBroadcast);
adminRouter.patch('/users/:id/plan',             ac.setUserPlan);

// Grupos
adminRouter.patch('/groups/:id/premium',         gc.updateGroupPremium);
adminRouter.delete('/groups/:id',                gc.deleteGroup);
adminRouter.post('/open-pool',                   gc.createOpenPool);

module.exports.adminRouter = adminRouter;

// ─── payments ─────────────────────────────────────────────────────────────────
const paymentRouter = require('express').Router();
const payc = require('../controllers/paymentController');

paymentRouter.post('/create-preference',          auth, payc.createPreference);
paymentRouter.post('/webhooks/mercadopago',        payc.handleWebhook);

module.exports.paymentRouter = paymentRouter;

// ─── users ────────────────────────────────────────────────────────────────────
const userRouter = require('express').Router();
const prisma = require('../utils/prisma');

userRouter.get('/:id/profile', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, username: true, avatarUrl: true, totalPoints: true, createdAt: true, plan: true,
      predictions: {
        select: { pointsTotal: true, pointsExact: true, pointsWinner: true },
        where: { match: { status: 'FINISHED' } },
      },
    },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const played      = user.predictions.length;
  const exactHits   = user.predictions.filter(p => p.pointsExact >= 5).length;
  const winnerHits  = user.predictions.filter(p => p.pointsExact > 0 || p.pointsWinner > 0).length;
  return res.json({ ...user, predictions: undefined, played, exactHits, winnerHits });
});

module.exports.userRouter = userRouter;
