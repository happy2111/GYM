require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { generalLimiter, helmetConfig, authLimiter } = require('./middlewares/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmetConfig);
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for Google OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Apply auth rate limiting to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Authentication API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      health: '/api/health'
    },
    documentation: 'See README.md for API documentation'
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Cleanup expired tokens periodically
const RefreshToken = require('./models/RefreshToken');
setInterval(async () => {
  try {
    const deletedCount = await RefreshToken.deleteExpired();
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired refresh tokens`);
    }
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Auth endpoints: http://localhost:${PORT}/api/auth`);
});

module.exports = app;