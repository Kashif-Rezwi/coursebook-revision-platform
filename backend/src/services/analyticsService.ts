import { IProgress } from '../models/Progress';
import { 
  TopicPerformance, 
  RecentActivity, 
  OverallStats as BaseOverallStats,
  WeakTopic as BaseWeakTopic,
  StrongTopic as BaseStrongTopic
} from '../types/progress';

// Extended interfaces with additional fields
export interface OverallStats extends BaseOverallStats {
  accuracy: number;
}

export interface WeakTopic extends BaseWeakTopic {
  questionsAttempted: number;
  needsImprovement: boolean;
}

export interface StrongTopic extends BaseStrongTopic {
  questionsAttempted: number;
  mastered: boolean;
}

export interface TopicAnalytics {
  totalTopics: number;
  averageAccuracy: number;
  topicBreakdown: TopicBreakdown[];
}

export interface TopicBreakdown {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  lastAttemptedAt: Date;
  status: 'strong' | 'moderate' | 'weak';
}

export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
}

export const calculateOverallStats = (progress: IProgress | null): OverallStats => {
  if (!progress) {
    return {
      totalQuizzes: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      accuracy: 0
    };
  }

  const { overallStats } = progress;
  const accuracy = overallStats.totalQuestions > 0
    ? Math.round((overallStats.correctAnswers / overallStats.totalQuestions) * 100)
    : 0;

  return {
    totalQuizzes: overallStats.totalQuizzes || 0,
    totalQuestions: overallStats.totalQuestions || 0,
    correctAnswers: overallStats.correctAnswers || 0,
    averageScore: Math.round(overallStats.averageScore || 0),
    totalTimeSpent: overallStats.totalTimeSpent || 0,
    accuracy
  };
};

export const calculateTopicAnalytics = (topicPerformance: TopicPerformance[]): TopicAnalytics => {
  if (!topicPerformance || topicPerformance.length === 0) {
    return {
      totalTopics: 0,
      averageAccuracy: 0,
      topicBreakdown: []
    };
  }

  const totalAccuracy = topicPerformance.reduce((sum, topic) => sum + topic.accuracy, 0);
  const averageAccuracy = Math.round(totalAccuracy / topicPerformance.length);

  const topicBreakdown = topicPerformance.map(topic => ({
    topic: topic.topic,
    totalQuestions: topic.totalQuestions,
    correctAnswers: topic.correctAnswers,
    accuracy: Math.round(topic.accuracy),
    lastAttemptedAt: topic.lastAttemptedAt || new Date(),
    status: getTopicStatus(topic.accuracy)
  }));

  return {
    totalTopics: topicPerformance.length,
    averageAccuracy,
    topicBreakdown
  };
};

export const getTopicStatus = (accuracy: number): 'strong' | 'moderate' | 'weak' => {
  if (accuracy >= 80) return 'strong';
  if (accuracy >= 60) return 'moderate';
  return 'weak';
};

export const identifyWeakTopics = (topicPerformance: TopicPerformance[], threshold: number = 60): WeakTopic[] => {
  if (!topicPerformance) return [];

  return topicPerformance
    .filter(topic => topic.accuracy < threshold && topic.totalQuestions >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)
    .map(topic => ({
      topic: topic.topic,
      accuracy: Math.round(topic.accuracy),
      questionsAttempted: topic.totalQuestions,
      needsImprovement: true
    }));
};

export const identifyStrongTopics = (topicPerformance: TopicPerformance[], threshold: number = 80): StrongTopic[] => {
  if (!topicPerformance) return [];

  return topicPerformance
    .filter(topic => topic.accuracy >= threshold && topic.totalQuestions >= 3)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5)
    .map(topic => ({
      topic: topic.topic,
      accuracy: Math.round(topic.accuracy),
      questionsAttempted: topic.totalQuestions,
      mastered: true
    }));
};

export const calculateAverageAccuracy = (topicPerformance: TopicPerformance[]): number => {
  if (!topicPerformance || topicPerformance.length === 0) return 0;

  const totalAccuracy = topicPerformance.reduce((sum, topic) => sum + topic.accuracy, 0);
  return Math.round(totalAccuracy / topicPerformance.length);
};

export const calculateLearningStreak = (recentActivity: RecentActivity[]): LearningStreak => {
  if (!recentActivity || recentActivity.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Get unique dates from recent activity (quiz completions only)
  const quizDates = recentActivity
    .filter(activity => activity.type === 'quiz_completed')
    .map(activity => new Date(activity.timestamp).toDateString());

  const uniqueDates = [...new Set(quizDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i] || '');
      const previousDate = new Date(uniqueDates[i - 1] || '');
      const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / 86400000);

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i] || '');
    const previousDate = new Date(uniqueDates[i - 1] || '');
    const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / 86400000);

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { currentStreak, longestStreak };
};
