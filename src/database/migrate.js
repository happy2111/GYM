require('dotenv').config();
const pool = require('../config/database');

const createTables = async () => {
  try {
    // Create users table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users
        (
            id
            UUID
            PRIMARY
            KEY
            DEFAULT
            gen_random_uuid
        (
        ),
            name VARCHAR
        (
            255
        ) NOT NULL,
            phone VARCHAR
        (
            20
        ),
            email VARCHAR
        (
            255
        ) UNIQUE NOT NULL,
            role VARCHAR
        (
            20
        ) CHECK
        (
            role
            IN
        (
            'client',
            'trainer',
            'admin'
        )) DEFAULT 'client',
            password_hash VARCHAR
        (
            255
        ),
            google_id VARCHAR
        (
            255
        ) UNIQUE,
            is_verified BOOLEAN DEFAULT FALSE,
            gender VARCHAR
        (
            20
        ), -- новое поле
            date_of_birth DATE CHECK
        (
            date_of_birth
            <=
            CURRENT_DATE
        ), -- новое поле
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
    `);

    // Для уже существующей таблицы добавим колонки, если их нет
    await pool.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS gender VARCHAR (20);

        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS date_of_birth DATE;

        -- Добавим ограничение на дату рождения (не в будущем), если его ещё нет
        DO
        $$
        BEGIN
        IF
        NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_date_of_birth_not_future'
        ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_date_of_birth_not_future
                CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE);
        END IF;
      END$$;
    `);


    // Create refresh_tokens table
    await pool.query(`CREATE TABLE IF NOT EXISTS refresh_tokens
    (
        id
        UUID
        PRIMARY
        KEY
        DEFAULT
        gen_random_uuid
                      (
                      ),
        user_id UUID REFERENCES users
                      (
                          id
                      ) ON DELETE CASCADE,
        token VARCHAR
                      (
                          255
                      ) NOT NULL,
        ip VARCHAR
                      (
                          45
                      ), -- IPv4/IPv6
        user_agent TEXT, -- строка браузера
        device VARCHAR
                      (
                          100
                      ), -- опционально "iPhone 15", "Chrome on Linux"
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create indexes for better performance
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    `);

    console.log('Database tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
};



createTables();