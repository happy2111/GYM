# Express Authentication Server

A professional Node.js Express server with comprehensive authentication features including JWT tokens, Google OAuth, PostgreSQL database integration, and role-based access control.

## Features

- 🔐 **Complete Authentication System**
    - User registration and login
    - JWT access tokens with refresh token rotation
    - Google OAuth integration
    - Secure password hashing with bcrypt
    - Role-based access control (Client, Trainer, Admin)

- 🛡️ **Security Features**
    - Rate limiting for authentication endpoints
    - Helmet.js security headers
    - CORS configuration
    - Input validation and sanitization
    - SQL injection protection

- 🗄️ **Database Integration**
    - PostgreSQL with Neon cloud database
    - Proper database migrations
    - Connection pooling
    - Optimized indexes

- 🏗️ **Professional Architecture**
    - Clean folder structure
    - Separation of concerns
    - Error handling middleware
    - Input validation middleware
    - Authentication middleware

## Project Structure

```
src/
├── config/
│   ├── database.js          # Database connection configuration
│   └── passport.js          # Passport.js Google OAuth strategy
├── controllers/
│   └── authController.js    # Authentication business logic
├── database/
│   └── migrate.js           # Database migration script
├── middleware/
│   ├── auth.js              # Authentication & authorization middleware
│   ├── errorHandler.js      # Global error handling
│   ├── security.js          # Security middleware (rate limiting, helmet)
│   └── validation.js        # Input validation middleware
├── models/
│   ├── User.js              # User model and database operations
│   └── RefreshToken.js      # Refresh token model
├── routes/
│   ├── auth.js              # Authentication routes
│   └── index.js             # Main router
├── utils/
│   └── jwt.js               # JWT utility functions
└── server.js                # Main application entry point
```

## Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd express-auth-server
npm install
```

2. **Environment Setup:**
```bash
cp .env.example .env
```

3. **Configure environment variables in `.env`:**
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URL
CLIENT_URL=http://localhost:3001
```

4. **Database Setup:**
```bash
npm run migrate
```

5. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Authentication | Body |
|--------|----------|-------------|----------------|------|
| POST | `/api/auth/register` | Register new user | None | `{name, email, password, phone?, role?}` |
| POST | `/api/auth/login` | User login | None | `{email, password}` |
| POST | `/api/auth/refresh` | Refresh access token | None | `{refreshToken}` |
| POST | `/api/auth/logout` | User logout | None | `{refreshToken?}` |
| GET | `/api/auth/google` | Initiate Google OAuth | None | None |
| GET | `/api/auth/google/callback` | Google OAuth callback | None | None |
| GET | `/api/auth/profile` | Get user profile | Bearer Token | None |

### Protected Routes Examples

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | Admin dashboard | Admin |
| GET | `/api/trainer/dashboard` | Trainer dashboard | Trainer, Admin |
| GET | `/api/client/profile` | Client profile | Client, Trainer, Admin |

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('client', 'trainer', 'admin')) DEFAULT 'client',
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "phone": "+1234567890",
    "role": "client"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Access protected route
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Google OAuth Setup

1. **Create Google OAuth Application:**
    - Go to [Google Cloud Console](https://console.cloud.google.com/)
    - Create a new project or select existing one
    - Enable Google+ API
    - Create OAuth 2.0 credentials

2. **Configure OAuth Settings:**
    - Authorized JavaScript origins: `http://localhost:3000`
    - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`

3. **Update environment variables:**
    - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## Security Features

- **Rate Limiting:** 5 requests per 15 minutes for auth endpoints
- **Password Security:** Bcrypt with salt rounds 12
- **JWT Security:** Separate secrets for access and refresh tokens
- **Input Validation:** Comprehensive validation using express-validator
- **SQL Injection Protection:** Parameterized queries with pg library
- **CORS Configuration:** Configurable origins
- **Helmet.js:** Security headers protection

## Error Handling

The API includes comprehensive error handling with appropriate HTTP status codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resources)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Development

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

### Environment Variables

All required environment variables are documented in `.env.example`.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique secrets for JWT and session
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Use a production-ready PostgreSQL database
6. Consider using Redis for session storage in scaled environments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.