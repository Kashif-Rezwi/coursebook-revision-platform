import express from 'express';
import jobController from '../controllers/jobController';
import authenticate from '../middlewares/authenticate';

const router = express.Router();

// All job routes require authentication
router.use(authenticate);

// Job management
router.get('/jobs/:jobId', jobController.getJobStatus);
router.post('/jobs/:jobId/retry', jobController.retryJob);

// Queue statistics
router.get('/queues/:queueType/stats', jobController.getQueueStats);

export default router;
