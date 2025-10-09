import Queue from 'bull';
import mongoose from 'mongoose';
import fs from 'fs';
import { createQueue } from '../config/queue';
import pdfProcessor from '../workers/pdfProcessor';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

const PDF_PROCESSING_QUEUE = 'pdf-processing';
const pdfQueue = createQueue(PDF_PROCESSING_QUEUE);

// File size thresholds for job priority
const FILE_SIZE_THRESHOLDS = {
  HIGH_PRIORITY: 1000000,    // 1MB
  MEDIUM_PRIORITY: 5000000,  // 5MB
  LOW_PRIORITY: 10000000     // 10MB
};

// Get job priority based on file size
const getJobPriority = (fileSize: number): number => {
  // Smaller files get higher priority (lower number = higher priority)
  if (fileSize < FILE_SIZE_THRESHOLDS.HIGH_PRIORITY) return 1;
  if (fileSize < FILE_SIZE_THRESHOLDS.MEDIUM_PRIORITY) return 2;
  if (fileSize < FILE_SIZE_THRESHOLDS.LOW_PRIORITY) return 3;
  return 4;
};

// Process jobs
pdfQueue.process(async (job: Queue.Job) => {
  logger.info(`Processing PDF job ${job.id}`, job.data);
  return await pdfProcessor.processPDF(job);
});

// Add job to queue
export const addPDFProcessingJob = async (pdfData: {
  pdfId: string;
  userId: string;
  filePath: string;
  fileSize?: number;
}) => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(pdfData.pdfId)) {
    throw ApiError.badRequest('Invalid PDF ID format', 'INVALID_PDF_ID');
  }
  
  if (!mongoose.Types.ObjectId.isValid(pdfData.userId)) {
    throw ApiError.badRequest('Invalid User ID format', 'INVALID_USER_ID');
  }

  // Validate file exists
  if (!fs.existsSync(pdfData.filePath)) {
    throw ApiError.badRequest('File does not exist', 'FILE_NOT_FOUND');
  }

  // Validate file size if provided
  if (pdfData.fileSize && pdfData.fileSize <= 0) {
    throw ApiError.badRequest('Invalid file size', 'INVALID_FILE_SIZE');
  }

  const job = await pdfQueue.add(pdfData, {
    priority: getJobPriority(pdfData.fileSize || 0)
  });

  logger.info(`Added PDF processing job: ${job.id}`);
  return job;
};

// Get job status
export const getPDFJobStatus = async (jobId: string | number) => {
  const job = await pdfQueue.getJob(jobId);
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

export { pdfQueue };
