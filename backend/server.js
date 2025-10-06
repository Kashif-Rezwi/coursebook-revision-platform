// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const mongoose = require('mongoose');

const app = express();

// Initialize DB Connection
connectDB();

// Initialize Middlewares
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : '*';
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Dev-only minimal request logger
if ((process.env.NODE_ENV || 'development') === 'development') {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const durationMs = Date.now() - start;
            console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs}ms`);
        });
        next();
    });
}

// Basic health check route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Backend server is running.' });
});

// Server Configuration 
const PORT = process.env.PORT || 3001;
const ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
    console.log(`Environment: ${ENV} | Server is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
        mongoose.connection.close(false).then(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
