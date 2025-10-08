import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { getCollection } from '../config/chromadb';
import { pdfQueue } from '../queues/pdfProcessingQueue';
import { quizQueue } from '../queues/quizGenerationQueue';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getSystemInfo } from '../utils/systemInfo';

/**
 * Utility function to add timeout to promises
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

interface HealthCheck {
  status: 'ok' | 'error' | 'warning';
  message: string;
  readyState?: string;
  pdf?: any;
  quiz?: any;
}

export const healthController = {
  // Basic health check
  healthCheck: asyncHandler(async (_req: Request, res: Response) => {
    return success(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }, 'Server is healthy');
  }),

  // Detailed health check with all services
  detailedHealth: asyncHandler(async (_req: Request, res: Response) => {
    // Run independent checks in parallel for better performance
    const [database, chromadb, redis, queues] = await Promise.all([
      checkDatabase(),
      checkChromaDB(),
      checkRedis(),
      checkQueues()
    ]);

    const checks = {
      server: { status: 'ok' as const },
      database,
      chromadb,
      redis,
      queues
    };

    const allHealthy = Object.values(checks).every(
      check => check.status === 'ok'
    );

    const statusCode = allHealthy ? 200 : 503;

    return res.status(statusCode).json({
      success: allHealthy,
      message: allHealthy ? 'All systems operational' : 'Some systems unhealthy',
      data: {
        checks,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  }),

  // System information
  systemInfo: asyncHandler(async (_req: Request, res: Response) => {
    const info = await getSystemInfo();
    return success(res, info, 'System information retrieved');
  })
};

// Helper functions moved outside the controller
async function checkDatabase(): Promise<HealthCheck> {
  try {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    
    if (state === 1) {
      await withTimeout(
        (mongoose.connection.db?.admin().ping() || Promise.resolve()) as Promise<void>,
        5000 // 5 second timeout
      );
      return {
        status: 'ok',
        message: 'MongoDB connected',
        readyState: 'connected'
      };
    }
    
    return {
      status: 'error',
      message: 'MongoDB not connected',
      readyState: getReadyStateString(state)
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

async function checkChromaDB(): Promise<HealthCheck> {
  try {
    const collection = await withTimeout(
      getCollection(),
      3000 // 3 second timeout
    );
    if (collection) {
      return {
        status: 'ok',
        message: 'ChromaDB connected'
      };
    }
    return {
      status: 'warning',
      message: 'ChromaDB not initialized'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  try {
    // Check if PDF queue can connect to Redis
    const client = (pdfQueue as any).client;
    if (client && client.status === 'ready') {
      return {
        status: 'ok',
        message: 'Redis connected'
      };
    }
    return {
      status: 'error',
      message: 'Redis not connected'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

async function checkQueues(): Promise<HealthCheck> {
  try {
    const [pdfCounts, quizCounts] = await withTimeout(
      Promise.all([
        pdfQueue.getJobCounts(),
        quizQueue.getJobCounts()
      ]),
      2000 // 2 second timeout
    );

    return {
      status: 'ok',
      message: 'Queues operational',
      pdf: pdfCounts,
      quiz: quizCounts
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

function getReadyStateString(state: number): string {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state as keyof typeof states] || 'unknown';
}

export default healthController;
