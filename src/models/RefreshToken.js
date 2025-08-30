const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RefreshToken {
  static async create(userId, token, ip, userAgent, device, expiresIn = '15d') {
    try {
      const expiresAt = new Date();
      const days = parseInt(expiresIn.replace('d', ''));
      expiresAt.setDate(expiresAt.getDate() + days);

      const query = `
          INSERT INTO refresh_tokens (user_id, token, ip, user_agent, device, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, token, expires_at, ip, user_agent, device
      `;

      const result = await pool.query(query, [
        userId,
        token,
        ip,
        userAgent,
        device,
        expiresAt
      ]);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }



  static async findByToken(token) {
    try {
      const query = `
        SELECT rt.*, u.id as user_id, u.name, u.email, u.role
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = $1 AND rt.expires_at > NOW()
      `;

      const result = await pool.query(query, [token]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async deleteByToken(token) {
    try {
      const query = 'DELETE FROM refresh_tokens WHERE token = $1 RETURNING id';
      const result = await pool.query(query, [token]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const query = 'DELETE FROM refresh_tokens WHERE user_id = $1';
      await pool.query(query, [userId]);
    } catch (error) {
      throw error;
    }
  }

  static async deleteExpired() {
    try {
      const query = 'DELETE FROM refresh_tokens WHERE expires_at <= NOW()';
      const result = await pool.query(query);
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = RefreshToken;