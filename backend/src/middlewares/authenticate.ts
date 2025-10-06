import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwtHelper';
import ApiError from '../utils/apiError';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Authentication middleware to verify JWT tokens
 * Attaches user data to req.user if token is valid
 */
const authenticate = asyncHandler(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  // Extract token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided', 'NO_TOKEN');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify token
  const decoded = verifyToken(token);

  // Attach user data to request
  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role
  };

  next();
});

export default authenticate;