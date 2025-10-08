import { Quiz, QuizAttempt, Progress } from '../models';
import { addQuizGenerationJob } from '../queues/quizGenerationQueue';
import evaluationService from './evaluationService';
// Score calculation functions moved from utils/scoreCalculator
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

// Score calculation interfaces and functions
export interface EvaluatedAnswerSummary {
  isCorrect: boolean;
  pointsEarned: number;
}

export interface QuestionSummary {
  points?: number;
  topic?: string;
}

export const calculatePercentage = (score: number, totalPoints: number): number => {
  if (totalPoints === 0) return 0;
  return Math.round((score / totalPoints) * 100);
};

export const determineGrade = (percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

export const calculateQuizScore = (
  answers: EvaluatedAnswerSummary[],
  questions: QuestionSummary[]
): { score: number; totalPoints: number; percentage: number } => {
  let totalScore = 0;
  let totalPoints = 0;

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question) {
      totalPoints += question.points || 1;
      totalScore += answer.pointsEarned || 0;
    }
  });

  return {
    score: totalScore,
    totalPoints,
    percentage: calculatePercentage(totalScore, totalPoints)
  };
};

export const calculateTopicWiseScore = (
  answers: Array<EvaluatedAnswerSummary & { isCorrect: boolean }>,
  questions: Array<QuestionSummary & { topic?: string }>
) => {
  const topicScores: Record<string, {
    topic: string;
    totalQuestions: number;
    correctAnswers: number;
    totalPoints: number;
    earnedPoints: number;
    accuracy?: number;
  }> = {};

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question && question.topic) {
      if (!topicScores[question.topic]) {
        topicScores[question.topic] = {
          topic: question.topic,
          totalQuestions: 0,
          correctAnswers: 0,
          totalPoints: 0,
          earnedPoints: 0
        };
      }

      const topicData = topicScores[question.topic];
      if (topicData) {
        topicData.totalQuestions++;
        topicData.totalPoints += question.points || 1;
        topicData.earnedPoints += answer.pointsEarned || 0;

        if (answer.isCorrect) {
          topicData.correctAnswers++;
        }
      }
    }
  });

  Object.keys(topicScores).forEach(topic => {
    const data = topicScores[topic];
    if (data) {
      data.accuracy = calculatePercentage(data.correctAnswers, data.totalQuestions);
    }
  });

  return Object.values(topicScores);
};

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

class QuizService {

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
    const { pdfId, status, limit = 50, skip = 0, sortBy = '-createdAt', ...otherFilters } = filters;
    
    const queryFilters: any = { ...otherFilters };
    if (pdfId) queryFilters.pdfId = pdfId;
    if (status) queryFilters.status = status;

    // Optimized field selection for list view
    const selectFields = 'title pdfId totalQuestions totalPoints status createdAt updatedAt';
    
    const [quizzes, total] = await Promise.all([
      Quiz.find({ userId, ...queryFilters })
        .select(selectFields)
        .sort(sortBy)
        .limit(limit)
        .skip(skip)
        .populate('pdfId', 'originalName pageCount status')
        .lean(), // Use lean() for better performance
      Quiz.countDocuments({ userId, ...queryFilters })
    ]);

    return {
      quizzes,
      total,
      limit,
      skip
    };
  }

  /**
   * Get quiz by ID with optional answers
   */
  async getQuizById(quizId: string, userId: string, includeAnswers: boolean = false): Promise<any> {
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
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid quiz ID', 'INVALID_ID');
      }
      throw error;
    }
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
    try {
      return await QuizAttempt.find({ quizId, userId })
        .sort('-completedAt')
        .select('-answers');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete quiz and all attempts
   */
  async remove(quizId: string, userId: string): Promise<{message: string, id: string}> {
    try {
      const quiz = await Quiz.findOneAndDelete({ _id: quizId, userId });
      if (!quiz) {
        throw ApiError.notFound('Quiz not found', 'QUIZ_NOT_FOUND');
      }

      // Delete all attempts for this quiz
      await QuizAttempt.deleteMany({ quizId });

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

      await this.updateAfterQuiz(progress, attempt, quiz);
      logger.info(`Progress updated for user ${userId}`);
    } catch (error) {
      logger.error('Progress update failed:', error);
    }
  }

  /**
   * Update progress after quiz completion (moved from model)
   */
  private async updateAfterQuiz(progress: any, quizAttempt: any, quiz: any): Promise<any> {
    // Update overall stats
    progress.overallStats.totalQuizzes += 1;
    progress.overallStats.totalQuestions += quizAttempt.answers.length;
    progress.overallStats.correctAnswers += quizAttempt.answers.filter((a: any) => a.isCorrect).length;
    progress.overallStats.averageScore = 
      ((progress.overallStats.averageScore * (progress.overallStats.totalQuizzes - 1)) + quizAttempt.percentage) / 
      progress.overallStats.totalQuizzes;
    
    if (quizAttempt.timeTaken) {
      progress.overallStats.totalTimeSpent += quizAttempt.timeTaken;
    }

    // Update topic performance
    quiz.questions.forEach((question: any, index: number) => {
      const answer = quizAttempt.answers[index];
      const topicIndex = progress.topicPerformance.findIndex((t: any) => t.topic === question.topic);

      if (topicIndex === -1) {
        // New topic
        progress.topicPerformance.push({
          topic: question.topic,
          totalQuestions: 1,
          correctAnswers: answer.isCorrect ? 1 : 0,
          accuracy: answer.isCorrect ? 100 : 0,
          lastAttemptedAt: new Date()
        });
      } else {
        // Existing topic
        const topic = progress.topicPerformance[topicIndex];
        topic.totalQuestions += 1;
        if (answer.isCorrect) {
          topic.correctAnswers += 1;
        }
        topic.accuracy = (topic.correctAnswers / topic.totalQuestions) * 100;
        topic.lastAttemptedAt = new Date();
      }
    });

    // Calculate weak and strong topics
    this.calculateWeakAndStrongTopics(progress);

    // Add recent activity
    progress.recentActivity.unshift({
      type: 'quiz_completed',
      description: `Completed quiz: ${quiz.title}`,
      timestamp: new Date()
    });

    // Keep only last 20 activities
    if (progress.recentActivity.length > 20) {
      progress.recentActivity = progress.recentActivity.slice(0, 20);
    }

    progress.lastUpdated = new Date();
    return progress.save();
  }

  /**
   * Calculate weak and strong topics (moved from model)
   */
  private calculateWeakAndStrongTopics(progress: any): void {
    const sortedTopics = [...progress.topicPerformance]
      .filter((t: any) => t.totalQuestions >= 3) // Only consider topics with at least 3 questions
      .sort((a: any, b: any) => a.accuracy - b.accuracy);

    // Weak topics (accuracy < 60%)
    progress.weakTopics = sortedTopics
      .filter((t: any) => t.accuracy < 60)
      .slice(0, 5)
      .map((t: any) => ({ topic: t.topic, accuracy: t.accuracy }));

    // Strong topics (accuracy >= 80%)
    progress.strongTopics = sortedTopics
      .filter((t: any) => t.accuracy >= 80)
      .slice(-5)
      .reverse()
      .map((t: any) => ({ topic: t.topic, accuracy: t.accuracy }));
  }

}

export default new QuizService();
