import { Request, Response, NextFunction } from 'express';
import ApiError from './apiError';
import logger from './logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message: string;
  errorCode: string;
}

// Rate limit configurations
const RATE_LIMITS: { [key: string]: RateLimitConfig } = {
  message: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 messages per minute
    message: 'Too many messages sent. Please wait before sending another message.',
    errorCode: 'MESSAGE_RATE_LIMIT_EXCEEDED'
  },
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 chat operations per minute
    message: 'Too many chat operations. Please wait before trying again.',
    errorCode: 'CHAT_RATE_LIMIT_EXCEEDED'
  }
};

// In-memory store for rate limiting (in production, use Redis)
const requestCounts: { [key: string]: { count: number; resetTime: number } } = {};

/**
 * Rate limiter middleware
 */
export const rateLimiter = (type: keyof typeof RATE_LIMITS) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = RATE_LIMITS[type];
    if (!config) {
      logger.error(`Unknown rate limit type: ${type}`);
      return next();
    }
    
    const userId = (req as any).user?.userId || req.ip;
    const key = `${type}:${userId}`;
    const now = Date.now();

    // Get or create rate limit data for this user
    let rateLimitData = requestCounts[key];
    
    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Reset or create new rate limit data
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs
      };
      requestCounts[key] = rateLimitData;
    }

    // Increment request count
    rateLimitData.count++;

    // Check if limit exceeded
    if (rateLimitData.count > config.maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId} on ${type}`);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
      });

      throw ApiError.badRequest(config.message, config.errorCode);
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': (config.maxRequests - rateLimitData.count).toString(),
      'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Clean up expired rate limit data
 */
export const cleanupRateLimits = () => {
  const now = Date.now();
  Object.keys(requestCounts).forEach(key => {
    const data = requestCounts[key];
    if (data && now > data.resetTime) {
      delete requestCounts[key];
    }
  });
};

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
