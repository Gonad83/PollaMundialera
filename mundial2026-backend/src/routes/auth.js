const router = require('express').Router();
const { register, login, refresh, logout, me, updateMe } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

router.post('/register',  register);
router.post('/login',     login);
router.post('/refresh',   refresh);
router.post('/logout',    logout);
router.get('/me',         authenticate, me);
router.patch('/me',       authenticate, updateMe);

module.exports = router;
