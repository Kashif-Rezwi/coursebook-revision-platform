import express from 'express';
import authRoutes from './authRoutes';
import pdfRoutes from './pdfRoutes';
import chatRoutes from './chatRoutes';
import quizRoutes from './quizRoutes';
import progressRoutes from './progressRoutes';
import jobRoutes from './jobRoutes';
import embeddingRoutes from './embeddingRoutes';
import healthController from '../controllers/healthController';
import { standardLimiter, readLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

// Health check routes (no rate limiting)
router.get('/health', healthController.healthCheck);
router.get('/health/detailed', healthController.detailedHealth);
router.get('/health/system', healthController.systemInfo);

// API v1 routes
const v1Router = express.Router();

// Mount all routes with appropriate rate limiters
v1Router.use('/auth', authRoutes);  // Has its own auth limiter applied in authRoutes.ts
v1Router.use('/pdfs', standardLimiter, pdfRoutes);
v1Router.use('/chats', standardLimiter, chatRoutes);
v1Router.use('/quizzes', standardLimiter, quizRoutes);
v1Router.use('/progress', readLimiter, progressRoutes);
v1Router.use('/jobs', standardLimiter, jobRoutes);
v1Router.use('/embeddings', standardLimiter, embeddingRoutes);

// Mount v1 router
router.use('/v1', v1Router);

// API information endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'API information retrieved',
    data: {
      name: 'Learning Platform API',
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/api/health',
      endpoints: {
        auth: '/api/v1/auth',
        pdfs: '/api/v1/pdfs',
        chats: '/api/v1/chats',
        quizzes: '/api/v1/quizzes',
        progress: '/api/v1/progress',
        jobs: '/api/v1/jobs',
        embeddings: '/api/v1/embeddings'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
