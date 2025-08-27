const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokens } = require('../utils/jwt');

class AuthController {
  // Regular registration
  static async register(req, res) {
    try {
      const { name, phone, email, role, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }

      // Create new user
      const user = await User.create({
        name,
        phone,
        email,
        role,
        password
      });

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user);

      // Save refresh token to database
      await RefreshToken.create(user.id, refreshToken);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          createdAt: user.created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Registration error:', error);

      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }

      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Regular login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Check if user has a password (not a Google-only account)
      if (!user.password_hash) {
        return res.status(401).json({
          error: 'This account was created with Google. Please use Google sign-in.'
        });
      }

      // Validate password
      const isValidPassword = await User.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user);

      // Clean up old refresh tokens for this user
      await RefreshToken.deleteByUserId(user.id);

      // Save new refresh token
      await RefreshToken.create(user.id, refreshToken);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Refresh access token
  static async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      // Find refresh token in database
      const tokenData = await RefreshToken.findByToken(refreshToken);
      if (!tokenData) {
        return res.status(401).json({
          error: 'Invalid or expired refresh token'
        });
      }

      // Generate new tokens
      const user = {
        id: tokenData.user_id,
        name: tokenData.name,
        email: tokenData.email,
        role: tokenData.role
      };

      const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

      // Delete old refresh token
      await RefreshToken.deleteByToken(refreshToken);

      // Save new refresh token
      await RefreshToken.create(user.id, newRefreshToken);

      res.json({
        message: 'Tokens refreshed successfully',
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await RefreshToken.deleteByToken(refreshToken);
      }

      // Also logout from session (for Google OAuth)
      req.logout((err) => {
        if (err) {
          console.error('Session logout error:', err);
        }
      });

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Google OAuth success callback
  static async googleCallback(req, res) {
    try {
      const user = req.user;

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user);

      // Clean up old refresh tokens
      await RefreshToken.deleteByUserId(user.id);

      // Save refresh token
      await RefreshToken.create(user.id, refreshToken);

      // Redirect to frontend with tokens
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
      res.redirect(`${clientUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Google callback error:', error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
      res.redirect(`${clientUrl}/auth/error`);
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      res.json({
        user: {
          id: req.user.id,
          name: req.user.name,
          phone: req.user.phone,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.created_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;