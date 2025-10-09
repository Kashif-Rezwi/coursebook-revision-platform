import Joi from 'joi';
import { 
  createIdParamSchema, 
  createPaginationSchema, 
  pdfStatusSchema,
  sortBySchema 
} from './common';

/**
 * Simplified PDF validation schemas
 * Uses common validation utilities for consistency
 */

export const getPDFsSchema = createPaginationSchema(
  Joi.object({
    status: pdfStatusSchema.optional(),
    sortBy: sortBySchema(['createdAt', 'originalName'])
  })
);

export const pdfIdSchema = createIdParamSchema('pdfId');
