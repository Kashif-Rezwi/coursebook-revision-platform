import quizService from '../services/quizService';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/auth';
import { Response } from 'express';

class QuizController {
  createQuiz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pdfId, title, mcqCount, saqCount, laqCount, difficulty } = req.body as any;

    const result = await quizService.createQuiz(req.user!.userId, pdfId, {
      title,
      mcqCount,
      saqCount,
      laqCount,
      difficulty
    });

    return successResponse(res, 201, 'Quiz created and generation started', result);
  });

  getUserQuizzes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      pdfId: req.query['pdfId'] as string | undefined,
      status: req.query['status'] as string | undefined,
      limit: req.query['limit'] as string | undefined,
      skip: req.query['skip'] as string | undefined,
      sortBy: req.query['sortBy'] as string | undefined
    };

    const result = await quizService.getUserQuizzes(req.user!.userId, filters);

    return successResponse(res, 200, 'Quizzes retrieved successfully', result);
  });

  getQuiz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = String(req.params['quizId']);
    const quiz = await quizService.getQuizById(quizId, req.user!.userId, false);
    return successResponse(res, 200, 'Quiz retrieved successfully', { quiz });
  });

  submitQuiz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { answers, timeTaken } = req.body as any;
    const quizId = String(req.params['quizId']);

    const attempt = await quizService.submitQuizAttempt(
      quizId,
      req.user!.userId,
      answers,
      timeTaken
    );

    return successResponse(res, 200, 'Quiz submitted successfully', { attempt });
  });

  getQuizAttempts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = String(req.params['quizId']);
    const attempts = await quizService.getQuizAttempts(quizId, req.user!.userId);
    return successResponse(res, 200, 'Quiz attempts retrieved successfully', { attempts });
  });

  deleteQuiz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = String(req.params['quizId']);
    const result = await quizService.deleteQuiz(quizId, req.user!.userId);
    return successResponse(res, 200, 'Quiz deleted successfully', result);
  });
}

export default new QuizController();
