import { Progress, QuizAttempt } from '../models';
import { IProgress } from '../models/Progress';
import { TopicPerformance, RecentActivity } from '../types/progress';
import {
  calculateOverallStats,
  calculateTopicAnalytics,
  identifyWeakTopics,
  identifyStrongTopics,
  calculateLearningStreak,
  OverallStats,
  TopicAnalytics,
  WeakTopic,
  StrongTopic,
  LearningStreak
} from '../utils/analyticsCalculator';
import {
  calculatePerformanceTrend,
  groupAttemptsByDate,
  predictNextScore,
  PerformanceTrend,
  GroupedAttempt,
  ScorePrediction
} from '../utils/trendAnalyzer';
import { IQuizAttempt } from '../models/QuizAttempt';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';
import {
  handleProgressError,
  validateUserId,
  validateDateRange,
  validateScoreRange,
  validatePagination,
  ProgressCalculationError
} from '../utils/progressErrors';
import performanceMonitor from '../utils/performanceMonitor';

// Simple in-memory cache for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ProgressCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  clearUserData(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

const progressCache = new ProgressCache();

export interface DashboardData {
  overallStats: OverallStats;
  topicAnalytics: TopicAnalytics;
  weakTopics: WeakTopic[];
  strongTopics: StrongTopic[];
  recentActivity: RecentActivity[];
  performanceTrend: PerformanceTrend;
  prediction: ScorePrediction | null;
  streak: LearningStreak;
  lastUpdated: Date;
}

export interface QuizHistoryFilters {
  limit?: number | undefined;
  skip?: number | undefined;
  sortBy?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  minScore?: number | undefined;
  maxScore?: number | undefined;
}

export interface QuizHistoryResult {
  attempts: IQuizAttempt[];
  total: number;
  limit: number;
  skip: number;
  groupedByDate: GroupedAttempt[];
}

export interface WeakTopicsResult {
  weakTopics: WeakTopic[];
  recommendations: Array<{
    topic: string;
    accuracy: number;
    recommendation: string;
    suggestedAction: string;
  }>;
}

export interface PerformanceTrendResult {
  trend: PerformanceTrend;
  chartData: GroupedAttempt[];
  prediction: ScorePrediction | null;
  totalAttempts: number;
}

export interface ExportData {
  userId: string;
  exportDate: Date;
  overallStats: OverallStats;
  topicPerformance: TopicPerformance[];
  weakTopics: WeakTopic[];
  strongTopics: StrongTopic[];
  recentActivity: RecentActivity[];
  quizAttempts: IQuizAttempt[];
  summary: {
    totalQuizzes: number;
    averageScore: number;
    totalTimeSpent: number;
    topicsStudied: number;
  };
}

class ProgressService {
  async getDashboard(userId: string): Promise<DashboardData> {
    const metric = performanceMonitor.startOperation('getDashboard', userId);
    
    try {
      // Validate input
      validateUserId(userId);

      const cacheKey = `dashboard:${userId}`;
      
      // Check cache first
      try {
        const cachedData = progressCache.get<DashboardData>(cacheKey);
        if (cachedData) {
          logger.info(`Dashboard data served from cache for user ${userId}`);
          performanceMonitor.endOperation(metric, true, undefined, { cacheHit: true });
          return cachedData;
        }
      } catch (cacheError) {
        logger.warn(`Cache error for user ${userId}:`, cacheError);
        // Continue without cache
      }

      // Get progress document
      let progress = await Progress.findOne({ userId });

      if (!progress) {
        // Create empty progress if doesn't exist
        progress = await Progress.create({ userId });
        logger.info(`Created new progress document for user ${userId}`);
      }

      // Get recent quiz attempts for trend analysis
      const recentAttempts = await QuizAttempt.find({ userId })
        .sort('-completedAt')
        .limit(10)
        .populate('quizId', 'title pdfId');

      // Calculate various metrics with error handling
      let overallStats, topicAnalytics, weakTopics, strongTopics, streak, performanceTrend, prediction;
      
      try {
        overallStats = calculateOverallStats(progress as IProgress);
        topicAnalytics = calculateTopicAnalytics(progress.topicPerformance);
        weakTopics = identifyWeakTopics(progress.topicPerformance);
        strongTopics = identifyStrongTopics(progress.topicPerformance);
        streak = calculateLearningStreak(progress.recentActivity);
        performanceTrend = calculatePerformanceTrend(recentAttempts);
        prediction = predictNextScore(recentAttempts);
      } catch (calcError) {
        logger.error(`Calculation error for user ${userId}:`, calcError);
        const errorMessage = calcError instanceof Error ? calcError.message : String(calcError);
        throw new ProgressCalculationError('dashboard metrics', errorMessage);
      }

      const dashboardData: DashboardData = {
        overallStats,
        topicAnalytics,
        weakTopics,
        strongTopics,
        recentActivity: progress.recentActivity.slice(0, 10),
        performanceTrend,
        prediction,
        streak,
        lastUpdated: progress.lastUpdated
      };

      // Cache the result for 2 minutes (shorter TTL for dashboard data)
      try {
        progressCache.set(cacheKey, dashboardData, 2 * 60 * 1000);
      } catch (cacheError) {
        logger.warn(`Failed to cache dashboard data for user ${userId}:`, cacheError);
        // Continue without caching
      }

      logger.info(`Dashboard data retrieved for user ${userId}`);
      performanceMonitor.endOperation(metric, true, undefined, { cacheHit: false });
      return dashboardData;
    } catch (error) {
      logger.error('Failed to get dashboard:', error);
      performanceMonitor.endOperation(metric, false, error instanceof Error ? error.message : String(error));
      return handleProgressError(error, 'getDashboard', userId);
    }
  }

  async getOverallStats(userId: string): Promise<OverallStats> {
    try {
      const cacheKey = `stats:${userId}`;
      
      // Check cache first
      const cachedStats = progressCache.get<OverallStats>(cacheKey);
      if (cachedStats) {
        logger.info(`Overall stats served from cache for user ${userId}`);
        return cachedStats;
      }

      const progress = await Progress.findOne({ userId });

      let stats: OverallStats;
      if (!progress) {
        stats = calculateOverallStats(null);
      } else {
        stats = calculateOverallStats(progress as IProgress);
      }

      // Cache the result for 5 minutes
      progressCache.set(cacheKey, stats, 5 * 60 * 1000);

      logger.info(`Overall stats retrieved for user ${userId}`);
      return stats;
    } catch (error) {
      logger.error('Failed to get overall stats:', error);
      throw ApiError.internal('Failed to retrieve statistics', 'STATS_ERROR');
    }
  }

  async getTopicPerformance(userId: string): Promise<{
    topics: TopicPerformance[];
    weakTopics: WeakTopic[];
    strongTopics: StrongTopic[];
    analytics: TopicAnalytics;
  }> {
    try {
      const progress = await Progress.findOne({ userId });

      if (!progress) {
        return {
          topics: [],
          weakTopics: [],
          strongTopics: [],
          analytics: calculateTopicAnalytics([])
        };
      }

      const analytics = calculateTopicAnalytics(progress.topicPerformance);
      const weakTopics = identifyWeakTopics(progress.topicPerformance);
      const strongTopics = identifyStrongTopics(progress.topicPerformance);

      return {
        topics: progress.topicPerformance,
        weakTopics,
        strongTopics,
        analytics
      };
    } catch (error) {
      logger.error('Failed to get topic performance:', error);
      throw ApiError.internal('Failed to retrieve topic performance', 'TOPIC_ERROR');
    }
  }

  async getRecentActivity(userId: string, limit: number = 20): Promise<RecentActivity[]> {
    try {
      const progress = await Progress.findOne({ userId });

      if (!progress) {
        return [];
      }

      return progress.recentActivity.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      throw ApiError.internal('Failed to retrieve activity', 'ACTIVITY_ERROR');
    }
  }

  async getQuizHistory(userId: string, filters: QuizHistoryFilters = {}): Promise<QuizHistoryResult> {
    const metric = performanceMonitor.startOperation('getQuizHistory', userId);
    
    try {
      // Validate input
      validateUserId(userId);
      
      const {
        limit = 50,
        skip = 0,
        sortBy = '-completedAt',
        fromDate,
        toDate,
        minScore,
        maxScore
      } = filters;

      // Validate filters
      validatePagination(limit, skip);
      validateDateRange(fromDate, toDate);
      validateScoreRange(minScore, maxScore);

      const query: any = { userId };

      // Date range filter
      if (fromDate || toDate) {
        query.completedAt = {};
        if (fromDate) query.completedAt.$gte = new Date(fromDate);
        if (toDate) query.completedAt.$lte = new Date(toDate);
      }

      // Score range filter
      if (minScore !== undefined || maxScore !== undefined) {
        query.percentage = {};
        if (minScore !== undefined) query.percentage.$gte = parseInt(minScore.toString());
        if (maxScore !== undefined) query.percentage.$lte = parseInt(maxScore.toString());
      }

      const attempts = await QuizAttempt.find(query)
        .sort(sortBy)
        .limit(parseInt(limit.toString()))
        .skip(parseInt(skip.toString()))
        .populate('quizId', 'title pdfId totalQuestions totalPoints')
        .select('-answers'); // Don't include full answers

      const total = await QuizAttempt.countDocuments(query);

      // Group by date for visualization
      const groupedByDate = groupAttemptsByDate(attempts);

      logger.info(`Quiz history retrieved for user ${userId}: ${attempts.length} attempts`);

      const result = {
        attempts,
        total,
        limit: parseInt(limit.toString()),
        skip: parseInt(skip.toString()),
        groupedByDate
      };

      performanceMonitor.endOperation(metric, true, undefined, { recordCount: attempts.length });
      return result;
    } catch (error) {
      logger.error('Failed to get quiz history:', error);
      performanceMonitor.endOperation(metric, false, error instanceof Error ? error.message : String(error));
      return handleProgressError(error, 'getQuizHistory', userId);
    }
  }

  async getPerformanceTrend(userId: string): Promise<PerformanceTrendResult> {
    try {
      const attempts = await QuizAttempt.find({ userId })
        .sort('completedAt')
        .select('percentage completedAt score totalPoints');

      if (attempts.length === 0) {
        return {
          trend: calculatePerformanceTrend([]),
          chartData: [],
          prediction: null,
          totalAttempts: 0
        };
      }

      const trend = calculatePerformanceTrend(attempts);
      const chartData = groupAttemptsByDate(attempts);
      const prediction = predictNextScore(attempts);

      return {
        trend,
        chartData,
        prediction,
        totalAttempts: attempts.length
      };
    } catch (error) {
      logger.error('Failed to get performance trend:', error);
      throw ApiError.internal('Failed to retrieve performance trend', 'TREND_ERROR');
    }
  }

  async getWeakTopics(userId: string): Promise<WeakTopicsResult> {
    try {
      const progress = await Progress.findOne({ userId });

      if (!progress) {
        return {
          weakTopics: [],
          recommendations: []
        };
      }

      const weakTopics = identifyWeakTopics(progress.topicPerformance);

      // Generate recommendations
      const recommendations = weakTopics.map(topic => ({
        topic: topic.topic,
        accuracy: topic.accuracy,
        recommendation: `Practice more questions on ${topic.topic}. Current accuracy: ${topic.accuracy}%`,
        suggestedAction: 'Take focused quizzes on this topic'
      }));

      return {
        weakTopics,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get weak topics:', error);
      throw ApiError.internal('Failed to retrieve weak topics', 'WEAK_TOPICS_ERROR');
    }
  }

  async exportProgressData(userId: string): Promise<ExportData> {
    try {
      const progress = await Progress.findOne({ userId }).lean();
      const attempts = await QuizAttempt.find({ userId })
        .populate('quizId', 'title')
        .lean();

      if (!progress) {
        throw ApiError.notFound('No progress data found', 'NO_PROGRESS_DATA');
      }

      return {
        userId,
        exportDate: new Date(),
        overallStats: {
          ...progress.overallStats,
          accuracy: progress.overallStats.totalQuestions > 0 
            ? Math.round((progress.overallStats.correctAnswers / progress.overallStats.totalQuestions) * 100)
            : 0
        },
        topicPerformance: progress.topicPerformance,
        weakTopics: progress.weakTopics.map(wt => ({
          ...wt,
          questionsAttempted: 0,
          needsImprovement: true
        })),
        strongTopics: progress.strongTopics.map(st => ({
          ...st,
          questionsAttempted: 0,
          mastered: true
        })),
        recentActivity: progress.recentActivity,
        quizAttempts: attempts as unknown as IQuizAttempt[],
        summary: {
          totalQuizzes: progress.overallStats.totalQuizzes,
          averageScore: progress.overallStats.averageScore,
          totalTimeSpent: progress.overallStats.totalTimeSpent,
          topicsStudied: progress.topicPerformance.length
        }
      };
    } catch (error) {
      logger.error('Failed to export progress data:', error);
      throw error;
    }
  }

  // Method to clear cache when progress is updated
  clearUserCache(userId: string): void {
    progressCache.clearUserData(userId);
    logger.info(`Cache cleared for user ${userId}`);
  }

  // Method to clear all cache (useful for testing or maintenance)
  clearAllCache(): void {
    progressCache.clear();
    logger.info('All progress cache cleared');
  }

  // Method to get performance metrics
  getPerformanceMetrics(operation?: string, userId?: string) {
    return {
      metrics: performanceMonitor.getMetrics(operation, userId),
      summary: performanceMonitor.getSummary(),
      averageDuration: operation ? performanceMonitor.getAverageDuration(operation) : null,
      successRate: operation ? performanceMonitor.getSuccessRate(operation) : null,
      cacheHitRate: operation ? performanceMonitor.getCacheHitRate(operation) : null,
      errorRate: performanceMonitor.getErrorRate(operation),
      slowOperations: performanceMonitor.getSlowOperations()
    };
  }

  // Method to clear performance metrics
  clearPerformanceMetrics(): void {
    performanceMonitor.clearMetrics();
  }
}

export default new ProgressService();
