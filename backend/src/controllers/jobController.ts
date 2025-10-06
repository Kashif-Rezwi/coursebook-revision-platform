import { Request, Response } from 'express';
import jobService from '../services/jobService';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/apiError';

class JobController {
  getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const { queueType } = req.query;

    if (!queueType) {
      throw ApiError.badRequest('Queue type is required', 'MISSING_QUEUE_TYPE');
    }

    const status = await jobService.getJobStatus(jobId as string, queueType as string);

    return successResponse(
      res,
      200,
      'Job status retrieved successfully',
      { job: status }
    );
  });

  getQueueStats = asyncHandler(async (req: Request, res: Response) => {
    const { queueType } = req.params;

    if (!queueType) {
      throw ApiError.badRequest('Queue type is required', 'MISSING_QUEUE_TYPE');
    }

    const stats = await jobService.getQueueStats(queueType);

    return successResponse(
      res,
      200,
      'Queue statistics retrieved successfully',
      { stats }
    );
  });

  retryJob = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const { queueType } = req.body;

    if (!queueType) {
      throw ApiError.badRequest('Queue type is required', 'MISSING_QUEUE_TYPE');
    }

    const result = await jobService.retryFailedJob(jobId as string, queueType);

    return successResponse(
      res,
      200,
      'Job retry initiated',
      result
    );
  });
}

export default new JobController();
