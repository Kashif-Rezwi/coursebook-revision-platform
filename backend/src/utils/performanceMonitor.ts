import logger from './logger';

export interface PerformanceMetrics {
  operation: string;
  userId?: string | undefined;
  startTime: number;
  endTime?: number | undefined;
  duration?: number | undefined;
  success: boolean;
  error?: string | undefined;
  cacheHit?: boolean | undefined;
  recordCount?: number | undefined;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  startOperation(operation: string, userId?: string): PerformanceMetrics {
    const metric: PerformanceMetrics = {
      operation,
      userId,
      startTime: Date.now(),
      success: false
    };
    
    this.metrics.push(metric);
    
    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    return metric;
  }

  endOperation(metric: PerformanceMetrics, success: boolean, error?: string, additionalData?: Partial<PerformanceMetrics>): void {
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    
    if (error) {
      metric.error = error;
    }
    
    if (additionalData) {
      Object.assign(metric, additionalData);
    }

    // Log performance metrics
    this.logPerformance(metric);
  }

  private logPerformance(metric: PerformanceMetrics): void {
    const { operation, userId, duration, success, cacheHit, recordCount, error } = metric;
    
    const logData = {
      operation,
      userId,
      duration: `${duration}ms`,
      success,
      cacheHit,
      recordCount,
      error
    };

    if (success) {
      if (duration && duration > 5000) {
        // Log slow operations as warnings
        logger.warn(`Slow operation detected:`, logData);
      } else if (duration && duration > 1000) {
        // Log medium operations as info
        logger.info(`Operation completed:`, logData);
      } else {
        // Log fast operations as debug
        logger.debug(`Operation completed:`, logData);
      }
    } else {
      logger.error(`Operation failed:`, logData);
    }
  }

  getMetrics(operation?: string, userId?: string): PerformanceMetrics[] {
    let filtered = this.metrics;
    
    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }
    
    if (userId) {
      filtered = filtered.filter(m => m.userId === userId);
    }
    
    return filtered;
  }

  getAverageDuration(operation: string): number {
    const operationMetrics = this.metrics.filter(m => 
      m.operation === operation && 
      m.duration !== undefined && 
      m.success
    );
    
    if (operationMetrics.length === 0) return 0;
    
    const totalDuration = operationMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return Math.round(totalDuration / operationMetrics.length);
  }

  getSuccessRate(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    
    if (operationMetrics.length === 0) return 0;
    
    const successCount = operationMetrics.filter(m => m.success).length;
    return Math.round((successCount / operationMetrics.length) * 100);
  }

  getCacheHitRate(operation: string): number {
    const operationMetrics = this.metrics.filter(m => 
      m.operation === operation && 
      m.cacheHit !== undefined
    );
    
    if (operationMetrics.length === 0) return 0;
    
    const cacheHits = operationMetrics.filter(m => m.cacheHit).length;
    return Math.round((cacheHits / operationMetrics.length) * 100);
  }

  getSlowOperations(threshold: number = 2000): PerformanceMetrics[] {
    return this.metrics.filter(m => 
      m.duration !== undefined && 
      m.duration > threshold && 
      m.success
    );
  }

  getErrorRate(operation?: string): number {
    let filtered = this.metrics;
    
    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }
    
    if (filtered.length === 0) return 0;
    
    const errorCount = filtered.filter(m => !m.success).length;
    return Math.round((errorCount / filtered.length) * 100);
  }

  clearMetrics(): void {
    this.metrics = [];
    logger.info('Performance metrics cleared');
  }

  getSummary(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    errorRate: number;
    slowOperations: number;
    cacheHitRate: number;
  } {
    const totalOperations = this.metrics.length;
    const successfulOperations = this.metrics.filter(m => m.success && m.duration !== undefined);
    const averageDuration = successfulOperations.length > 0 
      ? Math.round(successfulOperations.reduce((sum, m) => sum + (m.duration || 0), 0) / successfulOperations.length)
      : 0;
    const successRate = totalOperations > 0 
      ? Math.round((this.metrics.filter(m => m.success).length / totalOperations) * 100)
      : 0;
    const errorRate = 100 - successRate;
    const slowOperations = this.getSlowOperations().length;
    const cacheHitRate = this.metrics.filter(m => m.cacheHit !== undefined).length > 0
      ? Math.round((this.metrics.filter(m => m.cacheHit).length / this.metrics.filter(m => m.cacheHit !== undefined).length) * 100)
      : 0;

    return {
      totalOperations,
      averageDuration,
      successRate,
      errorRate,
      slowOperations,
      cacheHitRate
    };
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Decorator for automatic performance monitoring
export function monitorPerformance(operation: string) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const userId = args[0]; // Assume first argument is userId
      const metric = performanceMonitor.startOperation(operation, userId);

      try {
        const result = await method.apply(this, args);
        const recordCount = Array.isArray(result) ? result.length : undefined;
        performanceMonitor.endOperation(metric, true, undefined, { recordCount });
        return result;
      } catch (error) {
        performanceMonitor.endOperation(metric, false, error instanceof Error ? error.message : String(error));
        throw error;
      }
    };
  };
}

export default performanceMonitor;
