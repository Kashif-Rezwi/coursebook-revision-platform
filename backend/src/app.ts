import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import config from './config/env';
import errorHandler from './middlewares/errorHandler';
import notFound from './middlewares/notFound';
import requestId from './middlewares/requestId';
import requestLogger from './middlewares/requestLogger';
import swaggerSpec from './docs/swagger';
import apiRoutes from './routes';
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


// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware (must be early)
app.use(requestId);

// Request logging with response time tracking
app.use(requestLogger);

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Learning Platform API Docs'
}));

// Mount all API routes
app.use('/api', apiRoutes);


// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;


