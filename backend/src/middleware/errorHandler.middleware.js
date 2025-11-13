/**
 * Centralized Error Handler Middleware
 * Prevents leaking sensitive error details to clients
 */

/**
 * Application Error Class for controlled error responses
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational; // Expected errors vs programming errors
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error for debugging (server-side only)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: error.message,
      stack: err.stack,
      statusCode: error.statusCode
    });
  } else {
    // Production: Log only non-operational errors
    if (!err.isOperational) {
      console.error('UNEXPECTED ERROR:', {
        message: error.message,
        stack: err.stack
      });
    }
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const message = 'Validation failed';
    error = new AppError(message, 400);
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired';
    error = new AppError(message, 401);
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    }
    error = new AppError(message, 400);
  }

  // AWS SDK errors (don't expose AWS internals)
  if (err.code && err.code.startsWith('AWS')) {
    const message = 'Service temporarily unavailable';
    error = new AppError(message, 503);
  }

  // Build response object
  const response = {
    status: error.status || 'error',
    message: error.message || 'Something went wrong'
  };

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.error = err;
  }

  // In production, only send generic message for operational errors
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    response.message = 'Something went wrong. Please try again later.';
  }

  res.status(error.statusCode || 500).json(response);
};

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFound
};
