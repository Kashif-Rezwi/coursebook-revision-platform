import express from 'express';
import progressController from '../controllers/progressController';
import authenticate from '../middlewares/authenticate';
import validate from '../middlewares/requestValidator';
import {
  getQuizHistorySchema,
  getRecentActivitySchema
} from '../validators/progressValidator';

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

export default router;
