# Module 8: Progress Tracking Service - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Provide comprehensive learning analytics and progress visualization through API endpoints.

**Responsibilities**:
- Expose user progress data via REST APIs
- Calculate overall learning statistics
- Provide topic-wise performance analytics
- Identify weak and strong topics
- Show recent learning activity
- Display quiz history with filters
- Calculate performance trends
- Provide dashboard-ready data structures
- Support data export for reports

**Success Criteria**:
- Dashboard displays accurate statistics
- Topic performance is correctly calculated
- Weak/strong topics are identified properly
- Recent activity is ordered chronologically
- Quiz history is filterable and sortable
- Performance trends show growth over time
- All data is properly aggregated
- APIs are efficient and fast

**Note**: Much of the business logic already exists in the Progress model from Module 2! This module focuses on exposing that data through well-designed APIs.

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── services/
│   │   └── progressService.js          # Progress business logic
│   │
│   ├── controllers/
│   │   └── progressController.js       # Progress route handlers
│   │
│   ├── routes/
│   │   └── progressRoutes.js           # Progress API routes
│   │
│   ├── utils/
│   │   ├── analyticsCalculator.js      # Analytics calculations
│   │   └── trendAnalyzer.js            # Performance trends
│   │
│   └── validators/
│       └── progressValidator.js        # Progress validation schemas
```

---

## 3. Technology Stack for Module 8

**Dependencies**: Already installed
- All required dependencies are already available
- No new packages needed

---

## 4. Detailed Component Design

### **A. Analytics Calculator (`utils/analyticsCalculator.js`)**

**Purpose**: Calculate various analytics metrics from progress data

**Functions**:
1. **`calculateOverallStats(progress)`** - Format overall statistics
2. **`calculateTopicAnalytics(topicPerformance)`** - Analyze topic data
3. **`identifyWeakTopics(topicPerformance, threshold)`** - Find weak areas
4. **`identifyStrongTopics(topicPerformance, threshold)`** - Find strong areas
5. **`calculateAverageAccuracy(topicPerformance)`** - Overall accuracy
6. **`calculateLearningStreak(recentActivity)`** - Calculate streak days

**Implementation Pattern**:
```javascript
const calculateOverallStats = (progress) => {
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

const calculateTopicAnalytics = (topicPerformance) => {
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
    lastAttemptedAt: topic.lastAttemptedAt,
    status: getTopicStatus(topic.accuracy)
  }));

  return {
    totalTopics: topicPerformance.length,
    averageAccuracy,
    topicBreakdown
  };
};

const getTopicStatus = (accuracy) => {
  if (accuracy >= 80) return 'strong';
  if (accuracy >= 60) return 'moderate';
  return 'weak';
};

const identifyWeakTopics = (topicPerformance, threshold = 60) => {
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

const identifyStrongTopics = (topicPerformance, threshold = 80) => {
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

const calculateAverageAccuracy = (topicPerformance) => {
  if (!topicPerformance || topicPerformance.length === 0) return 0;

  const totalAccuracy = topicPerformance.reduce((sum, topic) => sum + topic.accuracy, 0);
  return Math.round(totalAccuracy / topicPerformance.length);
};

const calculateLearningStreak = (recentActivity) => {
  if (!recentActivity || recentActivity.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Get unique dates from recent activity (quiz completions only)
  const quizDates = recentActivity
    .filter(activity => activity.type === 'quiz_completed')
    .map(activity => new Date(activity.timestamp).toDateString());

  const uniqueDates = [...new Set(quizDates)].sort((a, b) => new Date(b) - new Date(a));

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
      const currentDate = new Date(uniqueDates[i]);
      const previousDate = new Date(uniqueDates[i - 1]);
      const diffDays = Math.round((previousDate - currentDate) / 86400000);

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
    const currentDate = new Date(uniqueDates[i]);
    const previousDate = new Date(uniqueDates[i - 1]);
    const diffDays = Math.round((previousDate - currentDate) / 86400000);

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { currentStreak, longestStreak };
};

module.exports = {
  calculateOverallStats,
  calculateTopicAnalytics,
  identifyWeakTopics,
  identifyStrongTopics,
  calculateAverageAccuracy,
  calculateLearningStreak
};
```

---

### **B. Trend Analyzer (`utils/trendAnalyzer.js`)**

**Purpose**: Analyze performance trends over time

**Functions**:
1. **`calculatePerformanceTrend(attempts)`** - Calculate improvement trend
2. **`groupAttemptsByDate(attempts)`** - Group by date for visualization
3. **`calculateMovingAverage(data, window)`** - Smooth trend line
4. **`predictNextScore(attempts)`** - Simple prediction based on trend

**Implementation Pattern**:
```javascript
const calculatePerformanceTrend = (attempts) => {
  if (!attempts || attempts.length < 2) {
    return {
      trend: 'insufficient_data',
      direction: 'neutral',
      improvement: 0,
      message: 'Need more quiz attempts to calculate trend'
    };
  }

  // Sort by date (oldest to newest)
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.completedAt) - new Date(b.completedAt)
  );

  // Get first and last 3 attempts for comparison
  const firstAttempts = sortedAttempts.slice(0, Math.min(3, sortedAttempts.length));
  const lastAttempts = sortedAttempts.slice(-Math.min(3, sortedAttempts.length));

  const firstAvg = firstAttempts.reduce((sum, a) => sum + a.percentage, 0) / firstAttempts.length;
  const lastAvg = lastAttempts.reduce((sum, a) => sum + a.percentage, 0) / lastAttempts.length;

  const improvement = lastAvg - firstAvg;

  let trend, direction, message;

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

const groupAttemptsByDate = (attempts) => {
  if (!attempts || attempts.length === 0) return [];

  const grouped = {};

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
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
};

const calculateMovingAverage = (data, window = 3) => {
  if (!data || data.length < window) return data;

  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      const windowData = data.slice(i - window + 1, i + 1);
      const avg = windowData.reduce((sum, d) => sum + d.averageScore, 0) / window;
      result.push({
        ...data[i],
        movingAverage: Math.round(avg)
      });
    }
  }

  return result;
};

const predictNextScore = (attempts) => {
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

module.exports = {
  calculatePerformanceTrend,
  groupAttemptsByDate,
  calculateMovingAverage,
  predictNextScore
};
```

---

### **C. Progress Service (`services/progressService.js`)**

**Purpose**: Business logic for progress and analytics

**Functions**:
1. **`getDashboard(userId)`** - Get complete dashboard data
2. **`getOverallStats(userId)`** - Get overall statistics
3. **`getTopicPerformance(userId)`** - Get topic-wise performance
4. **`getRecentActivity(userId, limit)`** - Get recent activity
5. **`getQuizHistory(userId, filters)`** - Get quiz attempt history
6. **`getPerformanceTrend(userId)`** - Get performance trend analysis
7. **`getWeakTopics(userId)`** - Get weak topics for review
8. **`exportProgressData(userId)`** - Export all progress data

**Implementation Pattern**:
```javascript
const { Progress, QuizAttempt } = require('../models');
const {
  calculateOverallStats,
  calculateTopicAnalytics,
  identifyWeakTopics,
  identifyStrongTopics,
  calculateLearningStreak
} = require('../utils/analyticsCalculator');
const {
  calculatePerformanceTrend,
  groupAttemptsByDate,
  predictNextScore
} = require('../utils/trendAnalyzer');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class ProgressService {
  async getDashboard(userId) {
    try {
      // Get progress document
      let progress = await Progress.findOne({ userId });

      if (!progress) {
        // Create empty progress if doesn't exist
        progress = await Progress.create({ userId });
      }

      // Get recent quiz attempts for trend analysis
      const recentAttempts = await QuizAttempt.find({ userId })
        .sort('-completedAt')
        .limit(10)
        .populate('quizId', 'title pdfId');

      // Calculate various metrics
      const overallStats = calculateOverallStats(progress);
      const topicAnalytics = calculateTopicAnalytics(progress.topicPerformance);
      const weakTopics = identifyWeakTopics(progress.topicPerformance);
      const strongTopics = identifyStrongTopics(progress.topicPerformance);
      const streak = calculateLearningStreak(progress.recentActivity);
      const performanceTrend = calculatePerformanceTrend(recentAttempts);
      const prediction = predictNextScore(recentAttempts);

      logger.info(`Dashboard data retrieved for user ${userId}`);

      return {
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
    } catch (error) {
      logger.error('Failed to get dashboard:', error);
      throw ApiError.internal('Failed to retrieve dashboard', 'DASHBOARD_ERROR');
    }
  }

  async getOverallStats(userId) {
    try {
      const progress = await Progress.findOne({ userId });

      if (!progress) {
        return calculateOverallStats(null);
      }

      return calculateOverallStats(progress);
    } catch (error) {
      logger.error('Failed to get overall stats:', error);
      throw ApiError.internal('Failed to retrieve statistics', 'STATS_ERROR');
    }
  }

  async getTopicPerformance(userId) {
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

  async getRecentActivity(userId, limit = 20) {
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

  async getQuizHistory(userId, filters = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        sortBy = '-completedAt',
        fromDate,
        toDate,
        minScore,
        maxScore
      } = filters;

      const query = { userId };

      // Date range filter
      if (fromDate || toDate) {
        query.completedAt = {};
        if (fromDate) query.completedAt.$gte = new Date(fromDate);
        if (toDate) query.completedAt.$lte = new Date(toDate);
      }

      // Score range filter
      if (minScore !== undefined || maxScore !== undefined) {
        query.percentage = {};
        if (minScore !== undefined) query.percentage.$gte = parseInt(minScore);
        if (maxScore !== undefined) query.percentage.$lte = parseInt(maxScore);
      }

      const attempts = await QuizAttempt.find(query)
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('quizId', 'title pdfId totalQuestions totalPoints')
        .select('-answers'); // Don't include full answers

      const total = await QuizAttempt.countDocuments(query);

      // Group by date for visualization
      const groupedByDate = groupAttemptsByDate(attempts);

      return {
        attempts,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        groupedByDate
      };
    } catch (error) {
      logger.error('Failed to get quiz history:', error);
      throw ApiError.internal('Failed to retrieve quiz history', 'HISTORY_ERROR');
    }
  }

  async getPerformanceTrend(userId) {
    try {
      const attempts = await QuizAttempt.find({ userId })
        .sort('completedAt')
        .select('percentage completedAt score totalPoints');

      if (attempts.length === 0) {
        return {
          trend: calculatePerformanceTrend([]),
          chartData: [],
          prediction: null
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

  async getWeakTopics(userId) {
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

  async exportProgressData(userId) {
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
        overallStats: progress.overallStats,
        topicPerformance: progress.topicPerformance,
        weakTopics: progress.weakTopics,
        strongTopics: progress.strongTopics,
        recentActivity: progress.recentActivity,
        quizAttempts: attempts,
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
}

module.exports = new ProgressService();
```

---

### **D. Progress Validator (`validators/progressValidator.js`)**

**Purpose**: Joi validation schemas for progress operations

**Schemas**:
1. **`getQuizHistorySchema`** - Validate quiz history filters
2. **`getRecentActivitySchema`** - Validate activity limit

**Implementation Pattern**:
```javascript
const Joi = require('joi');

const getQuizHistorySchema = Joi.object({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('completedAt', '-completedAt', 'percentage', '-percentage').default('-completedAt'),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    minScore: Joi.number().integer().min(0).max(100).optional(),
    maxScore: Joi.number().integer().min(0).max(100).optional()
  })
});

const getRecentActivitySchema = Joi.object({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })
});

module.exports = {
  getQuizHistorySchema,
  getRecentActivitySchema
};
```

---

### **E. Progress Controller (`controllers/progressController.js`)**

**Purpose**: Handle HTTP requests for progress operations

**Functions**:
1. **`getDashboard(req, res)`** - Get complete dashboard
2. **`getOverallStats(req, res)`** - Get overall statistics
3. **`getTopicPerformance(req, res)`** - Get topic analytics
4. **`getRecentActivity(req, res)`** - Get recent activity
5. **`getQuizHistory(req, res)`** - Get quiz history
6. **`getPerformanceTrend(req, res)`** - Get performance trend
7. **`getWeakTopics(req, res)`** - Get weak topics
8. **`exportProgress(req, res)`** - Export progress data

**Implementation Pattern**:
```javascript
const progressService = require('../services/progressService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class ProgressController {
  getDashboard = asyncHandler(async (req, res) => {
    const dashboard = await progressService.getDashboard(req.user.userId);

    return successResponse(
      res,
      200,
      'Dashboard data retrieved successfully',
      { dashboard }
    );
  });

  getOverallStats = asyncHandler(async (req, res) => {
    const stats = await progressService.getOverallStats(req.user.userId);

    return successResponse(
      res,
      200,
      'Overall statistics retrieved successfully',
      { stats }
    );
  });

  getTopicPerformance = asyncHandler(async (req, res) => {
    const performance = await progressService.getTopicPerformance(req.user.userId);

    return successResponse(
      res,
      200,
      'Topic performance retrieved successfully',
      performance
    );
  });

  getRecentActivity = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const activity = await progressService.getRecentActivity(req.user.userId, limit);

    return successResponse(
      res,
      200,
      'Recent activity retrieved successfully',
      { activity }
    );
  });

  getQuizHistory = asyncHandler(async (req, res) => {
    const filters = {
      limit: req.query.limit,
      skip: req.query.skip,
      sortBy: req.query.sortBy,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      minScore: req.query.minScore,
      maxScore: req.query.maxScore
    };

    const history = await progressService.getQuizHistory(req.user.userId, filters);

    return successResponse(
      res,
      200,
      'Quiz history retrieved successfully',
      history
    );
  });

  getPerformanceTrend = asyncHandler(async (req, res) => {
    const trend = await progressService.getPerformanceTrend(req.user.userId);

    return successResponse(
      res,
      200,
      'Performance trend retrieved successfully',
      trend
    );
  });

  getWeakTopics = asyncHandler(async (req, res) => {
    const result = await progressService.getWeakTopics(req.user.userId);

    return successResponse(
      res,
      200,
      'Weak topics retrieved successfully',
      result
    );
  });

  exportProgress = asyncHandler(async (req, res) => {
    const data = await progressService.exportProgressData(req.user.userId);

    return successResponse(
      res,
      200,
      'Progress data exported successfully',
      data
    );
  });
}

module.exports = new ProgressController();
```

---

### **F. Progress Routes (`routes/progressRoutes.js`)**

**Purpose**: Define progress API endpoints

**Routes**:

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| GET | `/progress/dashboard` | authenticate | progressController.getDashboard | Get dashboard |
| GET | `/progress/stats` | authenticate | progressController.getOverallStats | Get statistics |
| GET | `/progress/topics` | authenticate | progressController.getTopicPerformance | Get topic performance |
| GET | `/progress/activity` | authenticate, validate | progressController.getRecentActivity | Get recent activity |
| GET | `/progress/history` | authenticate, validate | progressController.getQuizHistory | Get quiz history |
| GET | `/progress/trend` | authenticate | progressController.getPerformanceTrend | Get performance trend |
| GET | `/progress/weak-topics` | authenticate | progressController.getWeakTopics | Get weak topics |
| GET | `/progress/export` | authenticate | progressController.exportProgress | Export progress data |

**Implementation Pattern**:
```javascript
const express = require('express');
const progressController = require('../controllers/progressController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/requestValidator');
const {
  getQuizHistorySchema,
  getRecentActivitySchema
} = require('../validators/progressValidator');

const router = express.Router();

// All progress routes require authentication
router.use(authenticate);

// Dashboard and analytics
router.get('/progress/dashboard', progressController.getDashboard);
router.get('/progress/stats', progressController.getOverallStats);
router.get('/progress/topics', progressController.getTopicPerformance);
router.get('/progress/trend', progressController.getPerformanceTrend);
router.get('/progress/weak-topics', progressController.getWeakTopics);

// Activity and history
router.get('/progress/activity', validate(getRecentActivitySchema), progressController.getRecentActivity);
router.get('/progress/history', validate(getQuizHistorySchema), progressController.getQuizHistory);

// Export
router.get('/progress/export', progressController.exportProgress);

module.exports = router;
```

---

### **G. Update App.js to Include Progress Routes**

**Add to `src/app.js`** (after quiz routes):

```javascript
const progressRoutes = require('./routes/progressRoutes');

app.use('/api', progressRoutes);
```

---

## 5. Dashboard Data Structure

The dashboard endpoint returns a comprehensive data structure:

```json
{
  "overallStats": {
    "totalQuizzes": 15,
    "totalQuestions": 150,
    "correctAnswers": 120,
    "averageScore": 82,
    "totalTimeSpent": 4500,
    "accuracy": 80
  },
  "topicAnalytics": {
    "totalTopics": 5,
    "averageAccuracy": 78,
    "topicBreakdown": [
      {
        "topic": "Newton's Laws",
        "totalQuestions": 30,
        "correctAnswers": 25,
        "accuracy": 83,
        "status": "strong",
        "lastAttemptedAt": "2025-10-07T12:00:00.000Z"
      }
    ]
  },
  "weakTopics": [
    {
      "topic": "Thermodynamics",
      "accuracy": 55,
      "questionsAttempted": 10,
      "needsImprovement": true
    }
  ],
  "strongTopics": [
    {
      "topic": "Newton's Laws",
      "accuracy": 90,
      "questionsAttempted": 25,
      "mastered": true
    }
  ],
  "recentActivity": [
    {
      "type": "quiz_completed",
      "description": "Completed quiz: Physics Chapter 1",
      "timestamp": "2025-10-07T12:00:00.000Z"
    }
  ],
  "performanceTrend": {
    "trend": "strong_improvement",
    "direction": "up",
    "improvement": 15,
    "firstAverage": 70,
    "lastAverage": 85,
    "message": "Great progress! Your scores are improving significantly."
  },
  "prediction": {
    "predictedScore": 87,
    "confidence": "moderate",
    "message": "Based on your trend, you're likely to improve!"
  },
  "streak": {
    "currentStreak": 5,
    "longestStreak": 7
  },
  "lastUpdated": "2025-10-07T12:00:00.000Z"
}
```

---

## 6. API Request/Response Examples

### **Get Dashboard**
```bash
GET /api/progress/dashboard
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "dashboard": {
      "overallStats": {
        "totalQuizzes": 15,
        "totalQuestions": 150,
        "correctAnswers": 120,
        "averageScore": 82,
        "totalTimeSpent": 4500,
        "accuracy": 80
      },
      "topicAnalytics": {
        "totalTopics": 5,
        "averageAccuracy": 78,
        "topicBreakdown": [...]
      },
      "weakTopics": [...],
      "strongTopics": [...],
      "recentActivity": [...],
      "performanceTrend": {...},
      "prediction": {...},
      "streak": {
        "currentStreak": 5,
        "longestStreak": 7
      }
    }
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Get Overall Statistics**
```bash
GET /api/progress/stats
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Overall statistics retrieved successfully",
  "data": {
    "stats": {
      "totalQuizzes": 15,
      "totalQuestions": 150,
      "correctAnswers": 120,
      "averageScore": 82,
      "totalTimeSpent": 4500,
      "accuracy": 80
    }
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Get Topic Performance**
```bash
GET /api/progress/topics
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Topic performance retrieved successfully",
  "data": {
    "topics": [
      {
        "topic": "Newton's Laws",
        "totalQuestions": 30,
        "correctAnswers": 27,
        "accuracy": 90,
        "lastAttemptedAt": "2025-10-07T12:00:00.000Z"
      },
      {
        "topic": "Thermodynamics",
        "totalQuestions": 20,
        "correctAnswers": 11,
        "accuracy": 55,
        "lastAttemptedAt": "2025-10-06T10:00:00.000Z"
      }
    ],
    "weakTopics": [
      {
        "topic": "Thermodynamics",
        "accuracy": 55,
        "questionsAttempted": 20,
        "needsImprovement": true
      }
    ],
    "strongTopics": [
      {
        "topic": "Newton's Laws",
        "accuracy": 90,
        "questionsAttempted": 30,
        "mastered": true
      }
    ],
    "analytics": {
      "totalTopics": 2,
      "averageAccuracy": 73,
      "topicBreakdown": [...]
    }
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Get Recent Activity**
```bash
GET /api/progress/activity?limit=10
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Recent activity retrieved successfully",
  "data": {
    "activity": [
      {
        "type": "quiz_completed",
        "description": "Completed quiz: Physics Chapter 1 Quiz",
        "timestamp": "2025-10-07T12:00:00.000Z"
      },
      {
        "type": "pdf_uploaded",
        "description": "Uploaded PDF: Chemistry Notes.pdf",
        "timestamp": "2025-10-07T10:00:00.000Z"
      },
      {
        "type": "chat_session",
        "description": "Started chat session about Motion",
        "timestamp": "2025-10-07T09:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Get Quiz History with Filters**
```bash
GET /api/progress/history?limit=20&fromDate=2025-10-01&minScore=60
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quiz history retrieved successfully",
  "data": {
    "attempts": [
      {
        "_id": "507f1f77bcf86cd799439040",
        "quizId": {
          "_id": "507f1f77bcf86cd799439030",
          "title": "Physics Chapter 1 Quiz",
          "totalQuestions": 10,
          "totalPoints": 21
        },
        "score": 18,
        "totalPoints": 21,
        "percentage": 86,
        "timeTaken": 600,
        "completedAt": "2025-10-07T12:00:00.000Z"
      }
    ],
    "total": 15,
    "limit": 20,
    "skip": 0,
    "groupedByDate": [
      {
        "date": "Sun Oct 07 2025",
        "averageScore": 86,
        "attemptCount": 2,
        "attempts": [...]
      }
    ]
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Get Performance Trend**
```bash
GET /api/progress/trend
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Performance trend retrieved successfully",
  "data": {
    "trend": {
      "trend": "strong_improvement",
      "direction": "up",
      "improvement": 15,
      "firstAverage": 70,
      "lastAverage": 85,
      "message": "Great progress! Your scores are improving significantly."
    },
    "chartData": [
      {
        "date": "Sun Oct 01 2025",
        "averageScore": 70,
        "attemptCount": 2
      },
      {
        "date": "Mon Oct 02 2025",
        "averageScore": 75,
        "attemptCount": 1
      },
      {
        "date": "Sun Oct 07 2025",
        "averageScore": 85,
        "attemptCount": 3
      }
    ],
    "prediction": {
      "predictedScore": 87,
      "confidence": "moderate",
      "message": "Based on your trend, you're likely to improve!"
    },
    "totalAttempts": 15
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Get Weak Topics**
```bash
GET /api/progress/weak-topics
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Weak topics retrieved successfully",
  "data": {
    "weakTopics": [
      {
        "topic": "Thermodynamics",
        "accuracy": 55,
        "questionsAttempted": 20,
        "needsImprovement": true
      },
      {
        "topic": "Electromagnetism",
        "accuracy": 58,
        "questionsAttempted": 15,
        "needsImprovement": true
      }
    ],
    "recommendations": [
      {
        "topic": "Thermodynamics",
        "accuracy": 55,
        "recommendation": "Practice more questions on Thermodynamics. Current accuracy: 55%",
        "suggestedAction": "Take focused quizzes on this topic"
      },
      {
        "topic": "Electromagnetism",
        "accuracy": 58,
        "recommendation": "Practice more questions on Electromagnetism. Current accuracy: 58%",
        "suggestedAction": "Take focused quizzes on this topic"
      }
    ]
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

### **Export Progress Data**
```bash
GET /api/progress/export
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Progress data exported successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439013",
    "exportDate": "2025-10-07T15:00:00.000Z",
    "overallStats": {...},
    "topicPerformance": [...],
    "weakTopics": [...],
    "strongTopics": [...],
    "recentActivity": [...],
    "quizAttempts": [...],
    "summary": {
      "totalQuizzes": 15,
      "averageScore": 82,
      "totalTimeSpent": 4500,
      "topicsStudied": 5
    }
  },
  "timestamp": "2025-10-07T15:00:00.000Z"
}
```

---

## 7. Testing Checklist

After implementation:

- [ ] Can get dashboard with all metrics
- [ ] Overall stats are calculated correctly
- [ ] Topic performance shows all topics
- [ ] Weak topics are identified correctly
- [ ] Strong topics are identified correctly
- [ ] Recent activity is ordered chronologically
- [ ] Quiz history can be filtered by date
- [ ] Quiz history can be filtered by score
- [ ] Performance trend calculates improvement
- [ ] Prediction is generated for next score
- [ ] Learning streak is calculated correctly
- [ ] Can export all progress data
- [ ] All endpoints require authentication
- [ ] Data is properly formatted for frontend

---
