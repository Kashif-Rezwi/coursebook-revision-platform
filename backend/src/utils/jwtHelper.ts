import jwt from 'jsonwebtoken';
import config from '../config/env';
import ApiError from './apiError';
import { JWTPayload } from '../types/auth';

/**
 * JWT Helper utilities for token operations
 */

/**
 * Generate JWT access token with user data
 * @param payload - User data to include in token
 * @returns Signed JWT token string
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire
  } as jwt.SignOptions);
};

/**
 * Verify JWT token and return decoded payload
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws ApiError for invalid or expired tokens
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
    }
    throw error;
  }
};

/**
 * Decode JWT token without verification (for inspection)
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export const decodeToken = (token: string): JWTPayload | null => {
  return jwt.decode(token) as JWTPayload | null;
};