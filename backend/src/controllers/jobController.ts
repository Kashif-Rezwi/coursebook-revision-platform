import { Request, Response } from 'express';
import jobService from '../services/jobService';
import { respondData } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/apiError';
import { getParam, getQuery } from '../utils/requestHelpers';

export const jobController = {
  getJobStatus: asyncHandler(async (req: Request, res: Response) => {
    const jobId = getParam(req, 'jobId');
    const queueType = getQuery(req, 'queueType');

    if (!queueType) {
      throw ApiError.badRequest('Queue type is required', 'MISSING_QUEUE_TYPE');
    }

    const status = await jobService.getJobStatus(jobId, queueType);
    return respondData(res, { job: status }, 'Job status retrieved successfully');
  }),

  getQueueStats: asyncHandler(async (req: Request, res: Response) => {
    const queueType = getParam(req, 'queueType');

    if (!queueType) {
      throw ApiError.badRequest('Queue type is required', 'MISSING_QUEUE_TYPE');
    }

    const stats = await jobService.getQueueStats(queueType);
    return respondData(res, { stats }, 'Queue statistics retrieved successfully');
  }),

  retryJob: asyncHandler(async (req: Request, res: Response) => {
    const jobId = getParam(req, 'jobId');
    const { queueType } = req.body;

    if (!queueType) {
      throw ApiError.badRequest('Queue type is required', 'MISSING_QUEUE_TYPE');
    }

    const result = await jobService.retryFailedJob(jobId, queueType);
    return respondData(res, result, 'Job retry initiated');
  })
};

export default jobController;
