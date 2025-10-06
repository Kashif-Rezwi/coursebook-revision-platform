import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError';
import { NotFoundHandler } from '../types';

/**
 * 404 handler for undefined routes.
 */
const notFound: NotFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND');
  next(error);
};

export default notFound;


