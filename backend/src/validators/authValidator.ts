import Joi from 'joi';

/**
 * Joi validation schemas for authentication endpoints
 */

export const registerSchema = Joi.object({
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'Password is required'
      }),
    name: Joi.string()
      .trim()
      .required()
      .messages({
        'any.required': 'Name is required'
      }),
    role: Joi.string()
      .valid('student', 'admin')
      .default('student')
  })
});

export const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  })
});