import { Document } from 'mongoose';

export interface OverallStats {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  totalTimeSpent: number;
}

export interface TopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  lastAttemptedAt?: Date;
}

export interface WeakTopic {
  topic: string;
  accuracy: number;
}

export interface StrongTopic {
  topic: string;
  accuracy: number;
}

export interface RecentActivity {
  type: 'quiz_completed' | 'pdf_uploaded' | 'chat_session' | 'account_created';
  description: string;
  timestamp: Date;
}

export interface Progress extends Document {
  userId: string;
  overallStats: OverallStats;
  topicPerformance: TopicPerformance[];
  weakTopics: WeakTopic[];
  strongTopics: StrongTopic[];
  recentActivity: RecentActivity[];
  lastUpdated: Date;
  createdAt: Date;
}

export interface QuizAttempt {
  _id: string;
  userId: string;
  quizId: {
    _id: string;
    title: string;
    pdfId?: string;
    totalQuestions?: number;
    totalPoints?: number;
  };
  answers: any[];
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken?: number;
  completedAt: Date;
  createdAt: Date;
}
