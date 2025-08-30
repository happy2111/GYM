const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {generateTokens} = require('../utils/jwt');

class AuthController {
  // Regular registration
  static async register(req, res) {
    try {
      const {
        name,
        phone,
        email,
        role,
        password,
        gender,
        dateOfBirth
      } = req.body;

      // Проверяем, существует ли пользователь
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: "User with this email already exists"
        });
      }

      // Создаём пользователя
      const user = await User.create({
        name,
        phone,
        email,
        role,
        password,
        gender: gender ?? null,
        dateOfBirth: dateOfBirth ?? null
      });

      // Генерируем токены
      const {accessToken, refreshToken} = await generateTokens(user);

      // Удаляем старые refresh токены (на всякий случай)
      await RefreshToken.deleteByUserId(user.id);

      // Сохраняем новый refresh в базе
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';
      const device = req.body.device || null; // можно присылать с фронта

      // Сохраняем новый refresh в базе
      await RefreshToken.create(user.id, refreshToken, ip, userAgent, device);

      // Устанавливаем refresh в HttpOnly cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
      });

      // Возвращаем только accessToken + данные пользователя
      return res.status(201).json({
        success: true,
        message: "Registration successful",
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        },
        accessToken
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({error: "Registration failed"});
    }
  }


  // Regular login
  static async login(req, res) {
    try {
      const {email, password} = req.body;

      // Найти юзера
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({error: "Invalid email or password"});
      }

      // Проверка, что у юзера есть пароль (а не Google-only аккаунт)
      if (!user.password_hash) {
        return res.status(401).json({
          error: "This account was created with Google. Please use Google sign-in."
        });
      }

      // Проверить пароль
      const isValidPassword = await User.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({error: "Invalid email or password"});
      }

      // Генерация токенов
      const {accessToken, refreshToken} = await generateTokens(user);

      // Удаляем старые refresh для этого юзера
      await RefreshToken.deleteByUserId(user.id);

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';
      const device = req.body.device || null; // можно присылать с фронта

      // Сохраняем новый refresh в базе
      await RefreshToken.create(user.id, refreshToken, ip, userAgent, device);

      // Устанавливаем refresh в HttpOnly куку
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true если https
        sameSite: "lax", // можно "strict" если только один домен
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
      });

      // Возвращаем только access + user
      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role
        },
        accessToken // refresh уже в куке
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({error: "Internal server error"});
    }
  }


  // Refresh access token
  static async refresh(req, res) {
    try {
      const refreshToken = req.refreshToken; // берём из middleware

      const tokenData = await RefreshToken.findByToken(refreshToken);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      const user = {
        id: tokenData.user_id,
        name: tokenData.name,
        email: tokenData.email,
        role: tokenData.role,
      };

      const {
        accessToken,
        refreshToken: newRefreshToken
      } = await generateTokens(user);

      // Удаляем старый
      await RefreshToken.deleteByToken(refreshToken);

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';
      const device = req.body.device || null;

      // Сохраняем новый refresh в базе
      await RefreshToken.create(user.id, newRefreshToken, ip, userAgent, device);

      // Ставим новый refresh cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      });

      res.json({ accessToken, user });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }


  // Logout
  static async logout(req, res) {
    try {
      const {refreshToken} = req.body;

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
      const {accessToken, refreshToken} = await generateTokens(user);

      // Clean up old refresh tokens
      await RefreshToken.deleteByUserId(user.id);
      // Save refresh token
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';
      const device = req.body.device || null; // можно присылать с фронта

      // Сохраняем новый refresh в базе
      await RefreshToken.create(user.id, refreshToken, ip, userAgent, device);

      // Set refresh token in HttpOnly cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      // Redirect to frontend (no token in URL!)
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}/auth/callback`);
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

  // Check email
  static async checkEmail(req, res) {
    try {
      const {email} = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        return res.json({exists: false});
      }
      res.json({
        exists: true,
        // hasPassword: !!user.password_hash
      });
    } catch (error) {
      console.error('Check email error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;