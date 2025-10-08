import { Quiz, QuizAttempt, Progress } from '../models';
import { BaseService, DeleteResult } from './BaseService';
import quizRepository from '../repositories/QuizRepository';
import { addQuizGenerationJob } from '../queues/quizGenerationQueue';
import evaluationService from './evaluationService';
import { calculateQuizScore } from '../utils/scoreCalculator';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';

export interface QuizCreateOptions {
  title?: string;
  mcqCount?: number;
  saqCount?: number;
  laqCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizFilters {
  pdfId?: string;
  status?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
}

class QuizService extends BaseService<any> {
  constructor() {
    super(Quiz, 'Quiz');
  }

  /**
   * Create quiz and start generation job
   */
  async createQuiz(userId: string, pdfId: string, options: QuizCreateOptions = {}): Promise<{quiz: any, jobId: string}> {
    try {
      const {
        title = 'New Quiz',
        mcqCount = 5,
        saqCount = 3,
        laqCount = 2,
        difficulty = 'medium'
      } = options;

      const quiz = await this.model.create({
        userId,
        pdfId,
        title,
        status: 'generating'
      });

      logger.info(`Quiz created: ${quiz._id} by user ${userId}`);

      const job = await addQuizGenerationJob({
        quizId: String(quiz._id),
        userId: String(userId),
        pdfId: String(pdfId),
        options: {
          mcqCount,
          saqCount,
          laqCount,
          difficulty
        }
      });

      logger.info(`Quiz generation job created: ${job.id} for quiz ${(quiz as any)._id}`);

      return { quiz, jobId: String(job.id) };
    } catch (error) {
      logger.error('Quiz creation failed:', error);
      throw ApiError.internal('Failed to create quiz', 'QUIZ_CREATE_ERROR');
    }
  }

  /**
   * Get user's quizzes with filtering
   */
  async getUserQuizzes(userId: string, filters: QuizFilters = {}): Promise<any> {
    return quizRepository.getUserQuizzes(userId, filters);
  }

  /**
   * Get quiz by ID with optional answers
   */
  async getQuizById(quizId: string, userId: string, includeAnswers: boolean = false): Promise<any> {
    const quiz = await quizRepository.getQuizById(quizId, userId, includeAnswers);
    if (!quiz) {
      throw this.createNotFoundError();
    }
    return quiz;
  }

  /**
   * Submit quiz attempt
   */
  async submitAttempt(quizId: string, userId: string, answers: string[], timeTaken: number | null = null): Promise<any> {
    try {
      const quiz: any = await this.getQuizById(quizId, userId, true);

      if (quiz.status !== 'ready') {
        throw ApiError.badRequest('Quiz is not ready', 'QUIZ_NOT_READY');
      }

      if (answers.length !== quiz.questions.length) {
        throw ApiError.badRequest('Answer count does not match question count', 'INVALID_ANSWER_COUNT');
      }

      logger.info(`Evaluating quiz attempt for quiz ${quizId}`);

      const evaluatedAnswers: any[] = [];
      for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i];
        const userAnswer = String(answers[i] ?? '');
        const evaluation = await evaluationService.evaluateAnswer({
          type: question.type,
          question: question.question,
          correctAnswer: question.correctAnswer,
          points: question.points || 1
        }, userAnswer);

        evaluatedAnswers.push({
          questionId: question._id,
          userAnswer,
          isCorrect: evaluation.isCorrect,
          pointsEarned: evaluation.pointsEarned,
          feedback: evaluation.feedback
        });
      }

      const scoreData = calculateQuizScore(evaluatedAnswers, quiz.questions);

      const attempt = await QuizAttempt.create({
        userId,
        quizId,
        answers: evaluatedAnswers,
        score: scoreData.score,
        totalPoints: scoreData.totalPoints,
        percentage: scoreData.percentage,
        timeTaken
      });

      logger.info(`Quiz attempt created: ${attempt._id} - Score: ${scoreData.score}/${scoreData.totalPoints}`);

      await this.updateUserProgress(userId, attempt, quiz);

      return attempt;
    } catch (error) {
      logger.error('Quiz submission failed:', error);
      throw error;
    }
  }

  /**
   * Get quiz attempts
   */
  async getAttempts(quizId: string, userId: string): Promise<any[]> {
    return quizRepository.getQuizAttempts(quizId, userId);
  }

  /**
   * Delete quiz and all attempts
   */
  override async remove(quizId: string, userId: string): Promise<DeleteResult> {
    try {
      const quiz = await quizRepository.deleteQuizAndAttempts(quizId, userId);
      if (!quiz) {
        throw this.createNotFoundError();
      }

      logger.info(`Quiz deleted: ${quizId} by user ${userId}`);
      return { message: 'Quiz deleted successfully', id: quizId };
    } catch (error) {
      logger.error('Quiz deletion failed:', error);
      throw error;
    }
  }

  /**
   * Update user progress after quiz attempt
   */
  private async updateUserProgress(userId: string, attempt: any, quiz: any): Promise<void> {
    try {
      let progress = await Progress.findOne({ userId });
      if (!progress) {
        progress = await Progress.create({ userId });
      }
      await (progress as any).updateAfterQuiz(attempt, quiz);
      logger.info(`Progress updated for user ${userId}`);
    } catch (error) {
      logger.error('Progress update failed:', error);
    }
  }

  /**
   * Create standardized not found error
   */
  private createNotFoundError() {
    return ApiError.notFound('Quiz not found', 'QUIZ_NOT_FOUND');
  }
}

export default new QuizService();
