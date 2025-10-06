import { Request } from 'express';

/**
 * JWT Token payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended Request interface with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * User registration data interface
 */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

/**
 * User login data interface
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * User profile update data interface
 */
export interface UpdateProfileData {
  name?: string;
}

/**
 * User response interface (what we return to clients)
 */
export interface UserResponse {
  _id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Login result interface
 */
export interface LoginResult {
  user: UserResponse;
  token: string;
}

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}