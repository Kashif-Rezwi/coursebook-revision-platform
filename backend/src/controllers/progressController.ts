import { Request, Response } from 'express';
import progressService from '../services/progressService';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedRequest } from '../types/auth';
import { getUserId, createFilters, getQueryNumber } from '../utils/requestHelpers';

export const progressController = {
  getDashboard: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const dashboard = await progressService.getDashboard(getUserId(authReq));
    return success(res, { dashboard }, 'Dashboard data retrieved successfully');
  }),

  getOverallStats: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const stats = await progressService.getOverallStats(getUserId(authReq));
    return success(res, { stats }, 'Overall statistics retrieved successfully');
  }),

  getTopicPerformance: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const performance = await progressService.getTopicPerformance(getUserId(authReq));
    return success(res, performance, 'Topic performance retrieved successfully');
  }),

  getRecentActivity: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const limit = getQueryNumber(req, 'limit', 20) || 20;
    const activity = await progressService.getRecentActivity(getUserId(authReq), limit);
    return success(res, { activity }, 'Recent activity retrieved successfully');
  }),

  getQuizHistory: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const filters = createFilters(req);
    const history = await progressService.getQuizHistory(getUserId(authReq), filters);
    return success(res, history, 'Quiz history retrieved successfully');
  }),

  getPerformanceTrend: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const trend = await progressService.getPerformanceTrend(getUserId(authReq));
    return success(res, trend, 'Performance trend retrieved successfully');
  }),

  getWeakTopics: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const result = await progressService.getWeakTopics(getUserId(authReq));
    return success(res, result, 'Weak topics retrieved successfully');
  }),

  exportProgress: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await progressService.exportProgressData(getUserId(authReq));
    return success(res, data, 'Progress data exported successfully');
  })
};

export default progressController;
