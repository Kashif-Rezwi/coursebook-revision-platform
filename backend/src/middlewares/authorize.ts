import { Response, NextFunction } from 'express';
import ApiError from '../utils/apiError';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Authorization middleware for role-based access control
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Middleware function
 */
const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      throw ApiError.forbidden(
        'You do not have permission to perform this action',
        'FORBIDDEN'
      );
    }

    next();
  };
};

export default authorize;