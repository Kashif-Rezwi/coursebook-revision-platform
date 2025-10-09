import Joi from 'joi';
import { ApiError } from '../utils/apiError';

/**
 * Password validation utilities
 * Consolidated password validation logic with Joi integration
 */

/**
 * Password strength validation schema
 */
export const passwordStrengthSchema = Joi.string()
  .min(8)
  .pattern(/[A-Z]/)
  .pattern(/[a-z]/)
  .pattern(/[0-9]/)
  .pattern(/[!@#$%^&*]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
    'any.required': 'Password is required'
  });

/**
 * Simple password validation (just length)
 */
export const simplePasswordSchema = Joi.string()
  .min(8)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  });

/**
 * Validate password strength and return detailed errors
 * This replaces the custom passwordHelper validation
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate password using Joi schema
 * Throws ApiError if validation fails
 */
export const validatePassword = (password: string, requireStrength: boolean = true): void => {
  const schema = requireStrength ? passwordStrengthSchema : simplePasswordSchema;
  const { error } = schema.validate(password);
  
  if (error) {
    const details = error.details.map(detail => ({
      field: 'password',
      message: detail.message
    }));
    throw new ApiError(400, 'Password validation failed', 'PASSWORD_VALIDATION_ERROR', true, '', details);
  }
};
