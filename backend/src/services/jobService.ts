import Queue from 'bull';
import { pdfQueue } from '../queues/pdfProcessingQueue';
import { quizQueue } from '../queues/quizGenerationQueue';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

class JobService {
  getQueue(queueType: string): Queue.Queue {
    switch (queueType) {
      case 'pdf':
        return pdfQueue;
      case 'quiz':
        return quizQueue;
      default:
        throw ApiError.badRequest('Invalid queue type', 'INVALID_QUEUE_TYPE');
    }
  }

  async getJobStatus(jobId: string | number, queueType: string) {
    const queue = this.getQueue(queueType);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw ApiError.notFound('Job not found', 'JOB_NOT_FOUND');
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp
    };
  }

  async getQueueStats(queueType: string) {
    const queue = this.getQueue(queueType);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      queueType,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  async retryFailedJob(jobId: string | number, queueType: string) {
    const queue = this.getQueue(queueType);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw ApiError.notFound('Job not found', 'JOB_NOT_FOUND');
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw ApiError.badRequest('Only failed jobs can be retried', 'JOB_NOT_FAILED');
    }

    await job.retry();
    logger.info(`Job ${jobId} retried in ${queueType} queue`);

    return {
      message: 'Job retried successfully',
      jobId,
      queueType
    };
  }

  async cleanQueue(queueType: string, grace: number = 86400000) {
    // grace = 24 hours in milliseconds
    const queue = this.getQueue(queueType);

    const result = await queue.clean(grace, 'completed');
    const failedResult = await queue.clean(grace, 'failed');

    logger.info(`Cleaned ${queueType} queue: ${result.length} completed, ${failedResult.length} failed`);

    return {
      queueType,
      completedCleaned: result.length,
      failedCleaned: failedResult.length
    };
  }
}

export default new JobService();
