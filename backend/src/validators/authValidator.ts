import Joi from 'joi';
import { createRequestSchema, emailSchema, passwordSchema, nameSchema, userRoleSchema } from './common';

/**
 * Simplified authentication validation schemas
 * Uses common validation utilities for consistency
 */

export const registerSchema = createRequestSchema({
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
    role: userRoleSchema
  })
});

export const loginSchema = createRequestSchema({
  body: Joi.object({
    email: emailSchema,
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  })
});