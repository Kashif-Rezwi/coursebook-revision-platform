import Joi from 'joi';
import { createPaginationSchema, sortBySchema } from './common';

/**
 * Simplified progress validation schemas
 * Uses common validation utilities for consistency
 */

export const getQuizHistorySchema = createPaginationSchema(
  Joi.object({
    sortBy: sortBySchema(['completedAt', 'percentage']),
    fromDate: Joi.date().iso().optional().messages({
      'date.format': 'From date must be in ISO format'
    }),
    toDate: Joi.date().iso().optional().messages({
      'date.format': 'To date must be in ISO format'
    }),
    minScore: Joi.number().integer().min(0).max(100).optional().messages({
      'number.min': 'Minimum score must be at least 0',
      'number.max': 'Minimum score cannot exceed 100'
    }),
    maxScore: Joi.number().integer().min(0).max(100).optional().messages({
      'number.min': 'Maximum score must be at least 0',
      'number.max': 'Maximum score cannot exceed 100'
    })
  })
);

export const getRecentActivitySchema = createPaginationSchema(
  Joi.object({})
).keys({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
  })
});
