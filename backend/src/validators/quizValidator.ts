import Joi from 'joi';
import { 
  createRequestSchema, 
  createIdParamSchema, 
  createPaginationSchema, 
  objectIdSchema,
  optionalObjectIdSchema,
  titleSchema,
  difficultySchema,
  quizStatusSchema,
  sortBySchema,
  stringArraySchema
} from './common';

/**
 * Simplified quiz validation schemas
 * Uses common validation utilities for consistency
 */

export const createQuizSchema = createRequestSchema({
  body: Joi.object({
    pdfId: objectIdSchema,
    title: titleSchema.default('New Quiz'),
    mcqCount: Joi.number().integer().min(0).max(20).default(5).messages({
      'number.min': 'MCQ count must be at least 0',
      'number.max': 'MCQ count cannot exceed 20'
    }),
    saqCount: Joi.number().integer().min(0).max(10).default(3).messages({
      'number.min': 'SAQ count must be at least 0',
      'number.max': 'SAQ count cannot exceed 10'
    }),
    laqCount: Joi.number().integer().min(0).max(5).default(2).messages({
      'number.min': 'LAQ count must be at least 0',
      'number.max': 'LAQ count cannot exceed 5'
    }),
    difficulty: difficultySchema
  })
});

export const submitQuizSchema = createRequestSchema({
  body: Joi.object({
    answers: stringArraySchema(1, 50).required().messages({
      'any.required': 'Answers are required'
    }),
    timeTaken: Joi.number().integer().min(0).optional().messages({
      'number.min': 'Time taken must be at least 0'
    })
  }),
  params: Joi.object({
    quizId: objectIdSchema
  })
});

export const getQuizzesSchema = createPaginationSchema(
  Joi.object({
    pdfId: optionalObjectIdSchema,
    status: quizStatusSchema.optional(),
    sortBy: sortBySchema(['createdAt', 'title'])
  })
);

export const quizIdSchema = createIdParamSchema('quizId');

export default {
  createQuizSchema,
  submitQuizSchema,
  getQuizzesSchema,
  quizIdSchema
};
