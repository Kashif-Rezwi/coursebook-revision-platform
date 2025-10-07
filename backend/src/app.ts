import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import config from './config/env';
import errorHandler from './middlewares/errorHandler';
import notFound from './middlewares/notFound';
import requestLogger from './middlewares/requestLogger';
import requestId from './middlewares/requestId';
import apiLogger from './middlewares/apiLogger';
import apiStats from './utils/apiStats';
import swaggerSpec from './docs/swagger';
import apiRoutes from './routes';
import logger from './utils/logger';
// import { successResponse } from './utils/apiResponse';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true
  })
);

// HTTP request logging (Morgan)
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware (must be early)
app.use(requestId);

// Custom request logger
app.use(requestLogger);

// Add response time tracking
app.use(apiLogger);

// Track API statistics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    try {
      const duration = Date.now() - start;
      apiStats.recordRequest(req.method, req.path, duration, res.statusCode);
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to record API statistics', {
        requestId: (req as any).id,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: req.method,
        path: req.path
      });
    }
  });
  next();
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Learning Platform API Docs'
}));

// Mount all API routes
app.use('/api', apiRoutes);

// API stats endpoint
app.get('/api/stats', (_req, res) => {
  res.json({
    success: true,
    data: apiStats.getStats()
  });
});

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;


