import Joi from 'joi';

export const getQuizHistorySchema = Joi.object({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('completedAt', '-completedAt', 'percentage', '-percentage').default('-completedAt'),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    minScore: Joi.number().integer().min(0).max(100).optional(),
    maxScore: Joi.number().integer().min(0).max(100).optional()
  })
});

export const getRecentActivitySchema = Joi.object({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })
});
