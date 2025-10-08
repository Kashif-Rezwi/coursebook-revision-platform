import quizService from '../services/quizService';
import { respondCreated, respondData } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/auth';
import { Response } from 'express';
import { getUserId, getParam, createFilters } from '../utils/requestHelpers';

export const quizController = {
  createQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pdfId, title, mcqCount, saqCount, laqCount, difficulty } = req.body as any;

    const result = await quizService.createQuiz(getUserId(req), pdfId, {
      title,
      mcqCount,
      saqCount,
      laqCount,
      difficulty
    });

    return respondCreated(res, result, 'Quiz created and generation started');
  }),

  getUserQuizzes: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = createFilters(req);
    const result = await quizService.getUserQuizzes(getUserId(req), filters);
    return respondData(res, result, 'Quizzes retrieved successfully');
  }),

  getQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = getParam(req, 'quizId');
    const quiz = await quizService.getQuizById(quizId, getUserId(req), false);
    return respondData(res, { quiz }, 'Quiz retrieved successfully');
  }),

  submitQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { answers, timeTaken } = req.body as any;
    const quizId = getParam(req, 'quizId');

    const attempt = await quizService.submitQuizAttempt(
      quizId,
      getUserId(req),
      answers,
      timeTaken
    );

    return respondData(res, { attempt }, 'Quiz submitted successfully');
  }),

  getQuizAttempts: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = getParam(req, 'quizId');
    const attempts = await quizService.getQuizAttempts(quizId, getUserId(req));
    return respondData(res, { attempts }, 'Quiz attempts retrieved successfully');
  }),

  deleteQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = getParam(req, 'quizId');
    const result = await quizService.deleteQuiz(quizId, getUserId(req));
    return respondData(res, result, 'Quiz deleted successfully');
  })
};

export default quizController;
