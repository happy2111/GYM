const express = require('express');
const authRoutes = require('./auth');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// API health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Protected routes examples
router.get('/admin/users',
  authenticateToken,
  authorizeRoles('admin'),
  (req, res) => {
    res.json({
      message: 'Admin access granted',
      user: req.user
    });
  }
);

router.get('/trainer/dashboard',
  authenticateToken,
  authorizeRoles('trainer', 'admin'),
  (req, res) => {
    res.json({
      message: 'Trainer dashboard access',
      user: req.user
    });
  }
);

router.get('/client/profile',
  authenticateToken,
  authorizeRoles('client', 'trainer', 'admin'),
  (req, res) => {
    res.json({
      message: 'Client profile access',
      user: req.user
    });
  }
);

module.exports = router;