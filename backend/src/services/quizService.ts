import { Quiz, QuizAttempt, Progress } from '../models';
import { addQuizGenerationJob } from '../queues/quizGenerationQueue';
import evaluationService from './evaluationService';
import { calculateQuizScore } from '../utils/scoreCalculator';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';

class QuizService {
  async createQuiz(userId: string, pdfId: string, options: {
    title?: string;
    mcqCount?: number;
    saqCount?: number;
    laqCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  } = {}) {
    try {
      const {
        title = 'New Quiz',
        mcqCount = 5,
        saqCount = 3,
        laqCount = 2,
        difficulty = 'medium'
      } = options;

      const quiz = await Quiz.create({
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

      return { quiz, jobId: job.id };
    } catch (error) {
      logger.error('Quiz creation failed:', error);
      throw ApiError.internal('Failed to create quiz', 'QUIZ_CREATE_ERROR');
    }
  }

  async getQuizById(quizId: string, userId: string, includeAnswers: boolean = false) {
    try {
      const quiz = await Quiz.findOne({ _id: quizId, userId })
        .populate('pdfId', 'originalName pageCount status');

      if (!quiz) {
        throw ApiError.notFound('Quiz not found', 'QUIZ_NOT_FOUND');
      }

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
        throw ApiError.badRequest('Invalid quiz ID', 'INVALID_QUIZ_ID');
      }
      throw error;
    }
  }

  async getUserQuizzes(userId: string, filters: any = {}) {
    try {
      const { pdfId, status, limit = 50, skip = 0, sortBy = '-createdAt' } = filters;
      const query: any = { userId };
      if (pdfId) query.pdfId = pdfId;
      if (status) query.status = status;

      const quizzes = await Quiz.find(query)
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .select('-questions')
        .populate('pdfId', 'originalName pageCount status');

      const total = await Quiz.countDocuments(query);

      return { quizzes, total, limit: parseInt(limit), skip: parseInt(skip) };
    } catch (error) {
      logger.error('Failed to get user quizzes:', error);
      throw ApiError.internal('Failed to retrieve quizzes', 'QUIZ_RETRIEVAL_ERROR');
    }
  }

  async submitQuizAttempt(quizId: string, userId: string, answers: string[], timeTaken: number | null = null) {
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

  async updateUserProgress(userId: string, attempt: any, quiz: any) {
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

  async getQuizAttempts(quizId: string, userId: string) {
    try {
      const attempts = await QuizAttempt.find({ quizId, userId })
        .sort('-completedAt')
        .select('-answers');
      return attempts;
    } catch (error) {
      logger.error('Failed to get quiz attempts:', error);
      throw ApiError.internal('Failed to retrieve attempts', 'ATTEMPT_RETRIEVAL_ERROR');
    }
  }

  async deleteQuiz(quizId: string, userId: string) {
    try {
      const quiz = await Quiz.findOneAndDelete({ _id: quizId, userId });
      if (!quiz) {
        throw ApiError.notFound('Quiz not found', 'QUIZ_NOT_FOUND');
      }
      await QuizAttempt.deleteMany({ quizId });
      logger.info(`Quiz deleted: ${quizId} by user ${userId}`);
      return { message: 'Quiz deleted successfully', quizId };
    } catch (error) {
      logger.error('Quiz deletion failed:', error);
      throw error;
    }
  }
}

export default new QuizService();
