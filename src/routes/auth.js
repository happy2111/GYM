const express = require('express');
const passport = require('../config/passport');
const AuthController = require('../controllers/authController');
const {
  validateRegister,
  validateLogin,
  validateRefreshToken
} = require('../middleware/validation');
const {authenticateToken} = require('../middleware/auth');

const router = express.Router();

// Regular authentication routes
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/refresh', validateRefreshToken, AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/check-email', AuthController.checkEmail);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.birthday.read',
      'https://www.googleapis.com/auth/user.gender.read'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3001'}/auth/error`,
    session: false,
  }),
  AuthController.googleCallback
);

// Protected routesfa
router.get('/profile', authenticateToken, AuthController.getProfile);

// Health check for auth servi
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Authentication Service',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;