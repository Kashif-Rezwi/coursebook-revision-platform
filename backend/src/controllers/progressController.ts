import { Request, Response } from 'express';
import progressService from '../services/progressService';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
    name?: string;
  };
}

class ProgressController {
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const dashboard = await progressService.getDashboard(authReq.user.userId);

    return successResponse(
      res,
      200,
      'Dashboard data retrieved successfully',
      { dashboard }
    );
  });

  getOverallStats = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const stats = await progressService.getOverallStats(authReq.user.userId);

    return successResponse(
      res,
      200,
      'Overall statistics retrieved successfully',
      { stats }
    );
  });

  getTopicPerformance = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const performance = await progressService.getTopicPerformance(authReq.user.userId);

    return successResponse(
      res,
      200,
      'Topic performance retrieved successfully',
      performance
    );
  });

  getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const activity = await progressService.getRecentActivity(authReq.user.userId, limit);

    return successResponse(
      res,
      200,
      'Recent activity retrieved successfully',
      { activity }
    );
  });

  getQuizHistory = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const filters = {
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
      skip: req.query['skip'] ? parseInt(req.query['skip'] as string) : undefined,
      sortBy: req.query['sortBy'] as string,
      fromDate: req.query['fromDate'] as string,
      toDate: req.query['toDate'] as string,
      minScore: req.query['minScore'] ? parseInt(req.query['minScore'] as string) : undefined,
      maxScore: req.query['maxScore'] ? parseInt(req.query['maxScore'] as string) : undefined
    };

    const history = await progressService.getQuizHistory(authReq.user.userId, filters);

    return successResponse(
      res,
      200,
      'Quiz history retrieved successfully',
      history
    );
  });

  getPerformanceTrend = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const trend = await progressService.getPerformanceTrend(authReq.user.userId);

    return successResponse(
      res,
      200,
      'Performance trend retrieved successfully',
      trend
    );
  });

  getWeakTopics = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const result = await progressService.getWeakTopics(authReq.user.userId);

    return successResponse(
      res,
      200,
      'Weak topics retrieved successfully',
      result
    );
  });

  exportProgress = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await progressService.exportProgressData(authReq.user.userId);

    return successResponse(
      res,
      200,
      'Progress data exported successfully',
      data
    );
  });
}

export default new ProgressController();
