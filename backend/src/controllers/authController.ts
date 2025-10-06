import { Response } from 'express';
import authService from '../services/authService';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest, RegisterData, LoginData, UpdateProfileData } from '../types/auth';

/**
 * Authentication controller for handling auth-related HTTP requests
 */
class AuthController {
  /**
   * Register a new user
   */
  register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.register(req.body as RegisterData);

    return successResponse(
      res,
      201,
      'User registered successfully',
      result
    );
  });

  /**
   * Authenticate user login
   */
  login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body as LoginData;
    const result = await authService.login(email, password);

    return successResponse(
      res,
      200,
      'Login successful',
      result
    );
  });

  /**
   * Get user profile
   */
  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.userId);

    return successResponse(
      res,
      200,
      'Profile retrieved successfully',
      { user }
    );
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.updateProfile(req.user!.userId, req.body as UpdateProfileData);

    return successResponse(
      res,
      200,
      'Profile updated successfully',
      { user }
    );
  });

  /**
   * Logout user (client-side token removal)
   */
  logout = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    // JWT is stateless, so just return success
    // Client should delete token from storage
    return successResponse(
      res,
      200,
      'Logout successful',
      null
    );
  });
}

export default new AuthController();