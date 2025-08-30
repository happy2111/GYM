const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({
                        name,
                        phone,
                        email,
                        role = 'client',
                        password,
                        googleId = null,
                        gender = null,
                        dateOfBirth = null
                      }) {
    try {
      const passwordHash = password ? await bcrypt.hash(password, 12) : null;

      const query = `
          INSERT INTO users (name, phone, email, role, password_hash, google_id,
                             is_verified, gender, date_of_birth)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                  $9) RETURNING id, name, phone, email, role, gender, date_of_birth, created_at
      `;

      const values = [
        name,
        phone,
        email,
        role,
        passwordHash,
        googleId,
        googleId ? true : false, // Автоверификация Google-пользователей
        gender,
        dateOfBirth
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }


  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }


  static async findById(id) {
    try {
      const query = `
          SELECT id,
                 name,
                 phone,
                 email,
                 role,
                 gender,
                 date_of_birth,
                 created_at
          FROM users
          WHERE id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }


  static async findByGoogleId(googleId) {
    try {
      const query = 'SELECT * FROM users WHERE google_id = $1';
      const result = await pool.query(query, [googleId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }


  static async updateById(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Преобразуем camelCase -> snake_case для dateOfBirth
      const normalizedUpdates = {...updates};
      if (Object.prototype.hasOwnProperty.call(updates, 'dateOfBirth')) {
        normalizedUpdates.date_of_birth = updates.dateOfBirth;
        delete normalizedUpdates.dateOfBirth;
      }

      Object.entries(normalizedUpdates).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
          UPDATE users
          SET ${fields.join(', ')}
          WHERE id = $${paramCount} RETURNING id, name, phone, email, role, gender, date_of_birth, created_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }


  static async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async deleteById(id) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;