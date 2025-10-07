import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  errorCode: string;
  logMessage?: string;
}

/**
 * Factory function to create rate limiters with consistent configuration
 */
const createRateLimiter = (config: RateLimitConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: config.message,
      error: { code: config.errorCode }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const logMessage = config.logMessage || `Rate limit exceeded for IP: ${req.ip} on ${req.path}`;
      logger.warn(logMessage);
      res.status(429).json({
        success: false,
        message: config.message,
        error: { code: config.errorCode }
      });
    }
  });
};

// Rate limiter configurations with environment variable support
const RATE_LIMIT_WINDOW_MS = parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'); // 15 minutes default
const AUTH_MAX_REQUESTS = parseInt(process.env['AUTH_MAX_REQUESTS'] || '5');
const STANDARD_MAX_REQUESTS = parseInt(process.env['STANDARD_MAX_REQUESTS'] || '100');
const READ_MAX_REQUESTS = parseInt(process.env['READ_MAX_REQUESTS'] || '200');
const UPLOAD_WINDOW_MS = parseInt(process.env['UPLOAD_WINDOW_MS'] || '3600000'); // 1 hour default
const UPLOAD_MAX_REQUESTS = parseInt(process.env['UPLOAD_MAX_REQUESTS'] || '10');

// Strict rate limiter for authentication endpoints
export const authLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again later',
  errorCode: 'RATE_LIMIT_EXCEEDED',
  logMessage: 'Authentication rate limit exceeded'
});

// Standard rate limiter for most endpoints
export const standardLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: STANDARD_MAX_REQUESTS,
  message: 'Too many requests, please try again later',
  errorCode: 'RATE_LIMIT_EXCEEDED',
  logMessage: 'Standard rate limit exceeded'
});

// Generous rate limiter for read-only endpoints
export const readLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: READ_MAX_REQUESTS,
  message: 'Too many requests, please try again later',
  errorCode: 'RATE_LIMIT_EXCEEDED',
  logMessage: 'Read-only rate limit exceeded'
});

// File upload limiter
export const uploadLimiter = createRateLimiter({
  windowMs: UPLOAD_WINDOW_MS,
  max: UPLOAD_MAX_REQUESTS,
  message: 'Upload limit exceeded, please try again later',
  errorCode: 'UPLOAD_LIMIT_EXCEEDED',
  logMessage: 'Upload rate limit exceeded'
});
