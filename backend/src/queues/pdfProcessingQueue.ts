import Queue from 'bull';
import mongoose from 'mongoose';
import fs from 'fs';
import { createQueue } from '../config/queue';
import pdfProcessor from '../workers/pdfProcessor';
import logger from '../utils/logger';
import { getJobStatus, getJobPriority } from '../utils/jobHelper';
import ApiError from '../utils/apiError';

const PDF_PROCESSING_QUEUE = 'pdf-processing';
const pdfQueue = createQueue(PDF_PROCESSING_QUEUE);

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
  return await getJobStatus(pdfQueue, jobId);
};

export { pdfQueue };
