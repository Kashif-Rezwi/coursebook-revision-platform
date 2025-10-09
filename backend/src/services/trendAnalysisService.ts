import { IQuizAttempt } from '../models/QuizAttempt';

export interface PerformanceTrend {
  trend: 'strong_improvement' | 'moderate_improvement' | 'stable' | 'slight_decline' | 'declining' | 'insufficient_data';
  direction: 'up' | 'down' | 'neutral';
  improvement: number;
  firstAverage: number;
  lastAverage: number;
  message: string;
}

export interface GroupedAttempt {
  date: string;
  averageScore: number;
  attemptCount: number;
  attempts: IQuizAttempt[];
}

export interface MovingAverageData extends GroupedAttempt {
  movingAverage?: number;
}

export interface ScorePrediction {
  predictedScore: number;
  confidence: 'low' | 'moderate' | 'high';
  message: string;
}

export const calculatePerformanceTrend = (attempts: IQuizAttempt[]): PerformanceTrend => {
  if (!attempts || attempts.length < 2) {
    return {
      trend: 'insufficient_data',
      direction: 'neutral',
      improvement: 0,
      firstAverage: 0,
      lastAverage: 0,
      message: 'Need more quiz attempts to calculate trend'
    };
  }

  // Sort by date (oldest to newest)
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  // Get first and last 3 attempts for comparison
  const firstAttempts = sortedAttempts.slice(0, Math.min(3, sortedAttempts.length));
  const lastAttempts = sortedAttempts.slice(-Math.min(3, sortedAttempts.length));

  const firstAvg = firstAttempts.reduce((sum, a) => sum + a.percentage, 0) / firstAttempts.length;
  const lastAvg = lastAttempts.reduce((sum, a) => sum + a.percentage, 0) / lastAttempts.length;

  const improvement = lastAvg - firstAvg;

  let trend: PerformanceTrend['trend'];
  let direction: PerformanceTrend['direction'];
  let message: string;

  if (improvement > 10) {
    trend = 'strong_improvement';
    direction = 'up';
    message = 'Great progress! Your scores are improving significantly.';
  } else if (improvement > 5) {
    trend = 'moderate_improvement';
    direction = 'up';
    message = 'Good job! You\'re showing steady improvement.';
  } else if (improvement < -10) {
    trend = 'declining';
    direction = 'down';
    message = 'Your recent scores have declined. Consider reviewing weak topics.';
  } else if (improvement < -5) {
    trend = 'slight_decline';
    direction = 'down';
    message = 'Slight decline in recent scores. Stay focused!';
  } else {
    trend = 'stable';
    direction = 'neutral';
    message = 'Your performance is stable. Keep practicing!';
  }

  return {
    trend,
    direction,
    improvement: Math.round(improvement),
    firstAverage: Math.round(firstAvg),
    lastAverage: Math.round(lastAvg),
    message
  };
};

export const groupAttemptsByDate = (attempts: IQuizAttempt[]): GroupedAttempt[] => {
  if (!attempts || attempts.length === 0) return [];

  const grouped: { [key: string]: { date: string; attempts: IQuizAttempt[]; totalScore: number; count: number } } = {};

  attempts.forEach(attempt => {
    const date = new Date(attempt.completedAt).toDateString();
    if (!grouped[date]) {
      grouped[date] = {
        date,
        attempts: [],
        totalScore: 0,
        count: 0
      };
    }

    grouped[date].attempts.push(attempt);
    grouped[date].totalScore += attempt.percentage;
    grouped[date].count++;
  });

  // Convert to array and calculate averages
  return Object.values(grouped).map(group => ({
    date: group.date,
    averageScore: Math.round(group.totalScore / group.count),
    attemptCount: group.count,
    attempts: group.attempts
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const calculateMovingAverage = (data: GroupedAttempt[], window: number = 3): MovingAverageData[] => {
  if (!data || data.length < window) return data;

  const result: MovingAverageData[] = [];
  for (let i = 0; i < data.length; i++) {
    const currentData = data[i];
    if (!currentData) continue;
    
    if (i < window - 1) {
      result.push({ 
        date: currentData.date,
        averageScore: currentData.averageScore,
        attemptCount: currentData.attemptCount,
        attempts: currentData.attempts
      });
    } else {
      const windowData = data.slice(i - window + 1, i + 1);
      const avg = windowData.reduce((sum, d) => sum + d.averageScore, 0) / window;
      result.push({
        date: currentData.date,
        averageScore: currentData.averageScore,
        attemptCount: currentData.attemptCount,
        attempts: currentData.attempts,
        movingAverage: Math.round(avg)
      });
    }
  }

  return result;
};

export const predictNextScore = (attempts: IQuizAttempt[]): ScorePrediction | null => {
  if (!attempts || attempts.length < 3) {
    return null;
  }

  // Simple linear regression on last 5 attempts
  const recentAttempts = attempts.slice(-5);
  const n = recentAttempts.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  recentAttempts.forEach((attempt, i) => {
    const x = i;
    const y = attempt.percentage;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const predictedScore = slope * n + intercept;

  return {
    predictedScore: Math.round(Math.max(0, Math.min(100, predictedScore))),
    confidence: n >= 5 ? 'moderate' : 'low',
    message: slope > 0
      ? 'Based on your trend, you\'re likely to improve!'
      : 'Consider reviewing topics to improve your next score.'
  };
};
