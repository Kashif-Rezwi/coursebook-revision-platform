import quizService from '../services/quizService';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
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

    return success(res, result, 'Quiz created and generation started');
  }),

  getUserQuizzes: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = createFilters(req);
    const result = await quizService.getUserQuizzes(getUserId(req), filters);
    return success(res, result, 'Quizzes retrieved successfully');
  }),

  getQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = getParam(req, 'quizId');
    const quiz = await quizService.getQuizById(quizId, getUserId(req), false);
    return success(res, { quiz }, 'Quiz retrieved successfully');
  }),

  submitQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { answers, timeTaken } = req.body as any;
    const quizId = getParam(req, 'quizId');

    const attempt = await quizService.submitAttempt(
      quizId,
      getUserId(req),
      answers,
      timeTaken
    );

    return success(res, { attempt }, 'Quiz submitted successfully');
  }),

  getQuizAttempts: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = getParam(req, 'quizId');
    const attempts = await quizService.getAttempts(quizId, getUserId(req));
    return success(res, { attempts }, 'Quiz attempts retrieved successfully');
  }),

  deleteQuiz: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = getParam(req, 'quizId');
    const result = await quizService.remove(quizId, getUserId(req));
    return success(res, result, 'Quiz deleted successfully');
  })
};

export default quizController;
