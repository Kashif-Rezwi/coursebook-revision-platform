import { Response } from 'express';
import authService from '../services/authService';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest, RegisterData, LoginData, UpdateProfileData } from '../types/auth';
import { getUserId } from '../utils/requestHelpers';

/**
 * Authentication controller for handling auth-related HTTP requests
 */
export const authController = {
  /**
   * Register a new user
   */
  register: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.register(req.body as RegisterData);
    return success(res, result, 'User registered successfully');
  }),

  /**
   * Authenticate user login
   */
  login: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body as LoginData;
    const result = await authService.login(email, password);
    return success(res, result, 'Login successful');
  }),

  /**
   * Get user profile
   */
  getProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getUserById(getUserId(req));
    return success(res, { user }, 'Profile retrieved successfully');
  }),

  /**
   * Update user profile
   */
  updateProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.updateProfile(getUserId(req), req.body as UpdateProfileData);
    return success(res, { user }, 'Profile updated successfully');
  }),

  /**
   * Logout user (client-side token removal)
   */
  logout: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    // JWT is stateless, so just return success
    // Client should delete token from storage
    return success(res, null, 'Logout successful');
  })
};

export default authController;