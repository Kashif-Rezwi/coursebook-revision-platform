import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { RequestLogger } from '../types';

/**
 * Log request method, URL, status code, and response time.
 */
const requestLogger: RequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(logMessage);
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  next();
};

export default requestLogger;


