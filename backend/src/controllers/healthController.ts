import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { getCollection } from '../config/chromadb';
import { pdfQueue } from '../queues/pdfProcessingQueue';
import { quizQueue } from '../queues/quizGenerationQueue';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getSystemInfo } from '../utils/systemInfo';
import aiService from '../services/aiService';
import { TIMEOUTS } from '../config/timeouts';

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
    const [database, chromadb, redis, queues, aiService] = await Promise.all([
      checkDatabase(),
      checkChromaDB(),
      checkRedis(),
      checkQueues(),
      checkAIService()
    ]);

    const checks = {
      server: { status: 'ok' as const },
      database,
      chromadb,
      redis,
      queues,
      aiService
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
        TIMEOUTS.HEALTH_CHECK
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
      TIMEOUTS.HEALTH_CHECK
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
      TIMEOUTS.HEALTH_CHECK
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

async function checkAIService(): Promise<HealthCheck> {
  try {
    const healthStatus = aiService.getHealthStatus();
    
    if (healthStatus.status === 'healthy') {
      return {
        status: 'ok',
        message: 'AI Service operational',
        ...healthStatus.details
      };
    } else if (healthStatus.status === 'degraded') {
      return {
        status: 'warning',
        message: 'AI Service degraded - circuit breakers may be open',
        ...healthStatus.details
      };
    } else {
      return {
        status: 'error',
        message: 'AI Service unhealthy',
        ...healthStatus.details
      };
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: `AI Service error: ${error.message}`
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
