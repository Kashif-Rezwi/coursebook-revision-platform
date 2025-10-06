const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const requestLogger = require('./middlewares/requestLogger');

const app = express();

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
app.get('/health', (req, res) => {
  const { successResponse } = require('./utils/apiResponse');
  successResponse(res, 200, 'Server is healthy', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes placeholder
// app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;


