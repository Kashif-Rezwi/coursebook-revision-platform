import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import config from '../config/env';

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

// Rate limiter configurations using consolidated config

// Strict rate limiter for authentication endpoints
export const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: 'Too many authentication attempts, please try again later',
  errorCode: 'RATE_LIMIT_EXCEEDED',
  logMessage: 'Authentication rate limit exceeded'
});

// Standard rate limiter for most endpoints
export const standardLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.standardMax,
  message: 'Too many requests, please try again later',
  errorCode: 'RATE_LIMIT_EXCEEDED',
  logMessage: 'Standard rate limit exceeded'
});

// Generous rate limiter for read-only endpoints
export const readLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.readMax,
  message: 'Too many requests, please try again later',
  errorCode: 'RATE_LIMIT_EXCEEDED',
  logMessage: 'Read-only rate limit exceeded'
});

// File upload limiter
export const uploadLimiter = createRateLimiter({
  windowMs: config.rateLimit.uploadWindowMs,
  max: config.rateLimit.uploadMax,
  message: 'Upload limit exceeded, please try again later',
  errorCode: 'UPLOAD_LIMIT_EXCEEDED',
  logMessage: 'Upload rate limit exceeded'
});
