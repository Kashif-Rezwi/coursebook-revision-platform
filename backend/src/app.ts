import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/env';
import errorHandler from './middlewares/errorHandler';
import notFound from './middlewares/notFound';
import requestLogger from './middlewares/requestLogger';
import { successResponse } from './utils/apiResponse';

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

// Custom request logger
app.use(requestLogger);

// Health check route (temporary - will move to routes later)
app.get('/health', (_req, res) => {
  successResponse(res, 200, 'Server is healthy', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';

app.use('/api/auth', authRoutes);
app.use('/api', jobRoutes);

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;


