import responseTime from 'response-time';
import logger from '../utils/logger';
import { Request, Response } from 'express';

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

const apiLogger = responseTime((req: Request, res: Response, time: number) => {
  const logData: LogData = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${time.toFixed(2)}ms`,
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

export default apiLogger;
