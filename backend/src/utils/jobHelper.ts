import Queue from 'bull';

// Constants for job processing
export const QUEUE_CONSTANTS = {
  FILE_SIZE_THRESHOLDS: {
    HIGH_PRIORITY: 1000000,    // 1MB
    MEDIUM_PRIORITY: 5000000,  // 5MB
    LOW_PRIORITY: 10000000     // 10MB
  },
  SIMULATION_DELAYS: {
    PDF_PROCESSING: 2000,      // 2 seconds
    QUIZ_GENERATION: 2000      // 2 seconds
  }
};

// Utility functions for future use
const createJobId = (prefix: string = 'job'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

const calculateProgress = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

const getJobPriority = (fileSize: number): number => {
  // Smaller files get higher priority (lower number = higher priority)
  if (fileSize < QUEUE_CONSTANTS.FILE_SIZE_THRESHOLDS.HIGH_PRIORITY) return 1;
  if (fileSize < QUEUE_CONSTANTS.FILE_SIZE_THRESHOLDS.MEDIUM_PRIORITY) return 2;
  if (fileSize < QUEUE_CONSTANTS.FILE_SIZE_THRESHOLDS.LOW_PRIORITY) return 3;
  return 4;
};

// Generic job status getter to eliminate duplication
export const getJobStatus = async (queue: Queue.Queue, jobId: string | number) => {
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress(),
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn
  };
};

export {
  createJobId,
  calculateProgress,
  getJobPriority
};
