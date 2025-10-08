import { Quiz, QuizAttempt } from '../models';
import { BaseRepository } from './BaseRepository';

export interface QuizFilters {
  pdfId?: string;
  status?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
}

export interface QuizListResult {
  quizzes: any[];
  total: number;
  limit: number;
  skip: number;
}

class QuizRepository extends BaseRepository<any> {
  constructor() {
    super(Quiz, 'Quiz');
  }

  /**
   * Get user's quizzes with filtering
   */
  async getUserQuizzes(userId: string, filters: QuizFilters = {}): Promise<QuizListResult> {
    const { pdfId, status, ...otherFilters } = filters;
    
    const queryFilters: any = { ...otherFilters };
    if (pdfId) queryFilters.pdfId = pdfId;
    if (status) queryFilters.status = status;

    const result = await this.findMany(userId, {
      ...queryFilters,
      select: '-questions' // Don't include questions in list
    });

    // Populate PDF references
    const quizzes = await Quiz.populate(result.items, {
      path: 'pdfId',
      select: 'originalName pageCount status'
    });

    return {
      quizzes,
      total: result.total,
      limit: result.limit,
      skip: result.skip
    };
  }

  /**
   * Get quiz by ID with optional answers
   */
  async getQuizById(quizId: string, userId: string, includeAnswers: boolean = false): Promise<any> {
    try {
      const quiz = await Quiz.findOne({ _id: quizId, userId })
        .populate('pdfId', 'originalName pageCount status');

      if (!quiz) return null;

      if (!includeAnswers && quiz.status === 'ready') {
        const quizObj = quiz.toObject();
        quizObj.questions = quizObj.questions.map((q: any) => {
          const { correctAnswer, ...rest } = q;
          return rest;
        });
        return quizObj;
      }

      return quiz;
    } catch (error: any) {
      if (error?.name === 'CastError') {
        throw new Error('Invalid quiz ID');
      }
      throw error;
    }
  }

  /**
   * Get quiz attempts for a quiz
   */
  async getQuizAttempts(quizId: string, userId: string): Promise<any[]> {
    try {
      return await QuizAttempt.find({ quizId, userId })
        .sort('-completedAt')
        .select('-answers');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete quiz and all its attempts
   */
  async deleteQuizAndAttempts(quizId: string, userId: string): Promise<any> {
    try {
      const quiz = await this.deleteById(quizId, userId);
      if (quiz) {
        await QuizAttempt.deleteMany({ quizId });
      }
      return quiz;
    } catch (error) {
      throw error;
    }
  }
}

export default new QuizRepository();
