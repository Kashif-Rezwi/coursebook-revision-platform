import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extend Request interface to include id property
interface RequestWithId extends Request {
  id?: string;
}

interface LogData {
  requestId: string | undefined;
  method: string;
  url: string;
  status: number;
  responseTime: string;
  ip: string;
  userAgent: string;
  userId?: string;
}

/**
 * Request logging middleware with response time tracking
 * Logs request details and response time for all requests
 */
const requestLogger = (req: RequestWithId, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData: LogData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    };

    // Add user ID if authenticated
    if (req.user?.userId) {
      logData.userId = req.user.userId;
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('API Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API Warning', logData);
    } else {
      logger.info('API Request', logData);
    }
  });

  next();
};

export default requestLogger;
