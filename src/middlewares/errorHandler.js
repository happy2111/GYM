// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error stack:', err.stack);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
  };

  // Mongoose/MongoDB errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error.message = 'Resource already exists';
        error.status = 409;
        break;
      case '23503': // Foreign key violation
        error.message = 'Referenced resource does not exist';
        error.status = 400;
        break;
      case '23502': // Not null violation
        error.message = 'Required field is missing';
        error.status = 400;
        break;
      case '22P02': // Invalid text representation
        error.message = 'Invalid data format';
        error.status = 400;
        break;
      default:
        error.message = 'Database error';
        error.status = 500;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};