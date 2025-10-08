import { User, Progress } from '../models';
import { generateAccessToken } from '../utils/jwtHelper';
import { validatePasswordStrength } from '../validators/passwordValidator';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { RegisterData, UpdateProfileData, LoginResult, UserResponse } from '../types/auth';

/**
 * Authentication service for user management and authentication
 */
class AuthService {
  /**
   * Convert Mongoose user document to UserResponse
   * @param user - Mongoose user document
   * @returns UserResponse object
   */
  private toUserResponse(user: any): UserResponse {
    return {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Created user object and JWT token
   */
  async register(userData: RegisterData): Promise<LoginResult> {
    const { email, password, name, role } = userData;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw ApiError.badRequest(
        passwordValidation.errors.join(', '),
        'WEAK_PASSWORD'
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('Email already registered', 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'student'
    });

    // Create progress document
    await Progress.create({
      userId: user._id,
      recentActivity: [{
        type: 'account_created',
        description: 'Account created successfully',
        timestamp: new Date()
      }]
    });

    logger.info(`New user registered: ${email}`);

    // Generate token for immediate login
    const token = generateAccessToken({
      userId: (user as any)._id.toString(),
      email: user.email,
      role: user.role
    });

    // Convert to UserResponse
    const userResponse = this.toUserResponse(user);

    return {
      user: userResponse,
      token
    };
  }

  /**
   * Authenticate user login
   * @param email - User email
   * @param password - User password
   * @returns User object and JWT token
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = generateAccessToken({
      userId: (user as any)._id.toString(),
      email: user.email,
      role: user.role
    });

    logger.info(`User logged in: ${email}`);

    // Convert to UserResponse
    const userResponse = this.toUserResponse(user);

    return {
      user: userResponse,
      token
    };
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @returns UserResponse object
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    return this.toUserResponse(user);
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updateData - Data to update
   * @returns Updated UserResponse object
   */
  async updateProfile(userId: string, updateData: UpdateProfileData): Promise<UserResponse> {
    const allowedUpdates = ['name'];
    const updates: any = {};

    // Filter only allowed fields
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = (updateData as any)[key] as string;
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    logger.info(`User profile updated: ${user.email}`);

    return this.toUserResponse(user);
  }
}

export default new AuthService();