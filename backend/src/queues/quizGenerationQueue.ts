import Queue from 'bull';
import mongoose from 'mongoose';
import { createQueue } from '../config/queue';
import quizGenerator from '../workers/quizGenerator';
import logger from '../utils/logger';
import { getJobStatus } from '../utils/jobHelper';
import ApiError from '../utils/apiError';

const QUIZ_GENERATION_QUEUE = 'quiz-generation';
const quizQueue = createQueue(QUIZ_GENERATION_QUEUE);

// Process jobs
quizQueue.process(async (job: Queue.Job) => {
  logger.info(`Processing quiz generation job ${job.id}`, job.data);
  return await quizGenerator.generateQuiz(job);
});

// Add job to queue
export const addQuizGenerationJob = async (quizData: {
  quizId: string;
  userId: string;
  pdfId: string;
  options: {
    mcqCount: number;
    saqCount: number;
    laqCount: number;
    difficulty: string;
  };
}) => {
  // Validate ObjectId formats
  if (!mongoose.Types.ObjectId.isValid(quizData.quizId)) {
    throw ApiError.badRequest('Invalid Quiz ID format', 'INVALID_QUIZ_ID');
  }
  
  if (!mongoose.Types.ObjectId.isValid(quizData.userId)) {
    throw ApiError.badRequest('Invalid User ID format', 'INVALID_USER_ID');
  }
  
  if (!mongoose.Types.ObjectId.isValid(quizData.pdfId)) {
    throw ApiError.badRequest('Invalid PDF ID format', 'INVALID_PDF_ID');
  }

  // Validate options
  const { mcqCount, saqCount, laqCount, difficulty } = quizData.options;
  
  if (mcqCount < 0 || saqCount < 0 || laqCount < 0) {
    throw ApiError.badRequest('Question counts must be non-negative', 'INVALID_QUESTION_COUNT');
  }
  
  if (mcqCount + saqCount + laqCount === 0) {
    throw ApiError.badRequest('At least one question type must be specified', 'NO_QUESTIONS_SPECIFIED');
  }
  
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    throw ApiError.badRequest('Invalid difficulty level', 'INVALID_DIFFICULTY');
  }

  const job = await quizQueue.add(quizData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  });
  logger.info(`Added quiz generation job: ${job.id}`);
  return job;
};

// Get job status
export const getQuizJobStatus = async (jobId: string | number) => {
  return await getJobStatus(quizQueue, jobId);
};

export { quizQueue };
