import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to add unique request ID for tracing and debugging
 */
const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Generate or use existing request ID
  req.id = req.id || uuidv4();
  
  // Set request ID in response headers for client tracing
  res.set('X-Request-ID', req.id);
  
  next();
};

export default requestId;
