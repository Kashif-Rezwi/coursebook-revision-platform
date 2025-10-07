import Joi from 'joi';

export const createQuizSchema = Joi.object({
  body: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid PDF ID format',
      'any.required': 'PDF ID is required'
    }),
    title: Joi.string().trim().max(200).default('New Quiz'),
    mcqCount: Joi.number().integer().min(0).max(20).default(5),
    saqCount: Joi.number().integer().min(0).max(10).default(3),
    laqCount: Joi.number().integer().min(0).max(5).default(2),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
  })
});

export const submitQuizSchema = Joi.object({
  body: Joi.object({
    answers: Joi.array().items(Joi.string().required()).required().min(1).messages({
      'any.required': 'Answers are required',
      'array.min': 'At least one answer is required'
    }),
    timeTaken: Joi.number().integer().min(0).optional()
  }),
  params: Joi.object({
    quizId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
});

export const getQuizzesSchema = Joi.object({
  query: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    status: Joi.string().valid('generating', 'ready', 'failed').optional(),
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', '-createdAt', 'title', '-title').default('-createdAt')
  })
});

export const quizIdSchema = Joi.object({
  params: Joi.object({
    quizId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid quiz ID format'
    })
  })
});

export default {
  createQuizSchema,
  submitQuizSchema,
  getQuizzesSchema,
  quizIdSchema
};
