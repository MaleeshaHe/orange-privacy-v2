const rateLimit = require('express-rate-limit');

/**
 * Authentication Rate Limiters
 * Prevents brute force attacks on sensitive endpoints
 */

// Strict rate limit for login attempts (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store in memory (for production, use Redis store)
  // TODO: Implement Redis store for distributed rate limiting
});

// Rate limit for registration (prevent spam)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again after 1 hour',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for password change (prevent abuse)
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password changes per hour per IP
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many password change attempts',
    message: 'Please try again after 1 hour',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for OAuth initiation (prevent state overflow)
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 OAuth attempts per 15 minutes per IP
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many OAuth requests',
    message: 'Please try again after 15 minutes',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limit for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes per IP
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many upload requests',
    message: 'Please try again after 15 minutes',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for scan job creation (expensive operations)
const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 scans per hour per IP
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many scan requests',
    message: 'Please try again after 1 hour. Scans are resource-intensive operations.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit (applied globally)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Permissive rate limit for polling endpoints (GET requests for status checks)
// Frontend polls every 10 seconds, so we need to allow more frequent requests
const pollingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP (allows ~33 req/min or ~3 sec intervals)
  message: {
    error: 'Too many polling requests',
    message: 'Please slow down your refresh rate',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to GET requests
  skip: (req) => req.method !== 'GET',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordChangeLimiter,
  oauthLimiter,
  uploadLimiter,
  scanLimiter,
  apiLimiter,
  pollingLimiter
};
