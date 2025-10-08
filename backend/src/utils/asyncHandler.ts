import { Request, Response, NextFunction } from 'express';
import { AsyncHandler } from '../types';

/**
 * Wrap an async Express route handler to forward rejections to next().
 */
const asyncHandler: AsyncHandler = (fn) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { asyncHandler };


