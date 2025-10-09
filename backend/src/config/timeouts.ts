/**
 * Centralized timeout configuration for all external services
 * Provides consistent timeout values across the application
 */
export const TIMEOUTS = {
  // HTTP request timeouts
  HTTP_REQUEST: 30000,        // 30 seconds for external API calls
  
  // Circuit breaker timeouts
  CIRCUIT_BREAKER: 60000,     // 1 minute for circuit breaker recovery
  
  // Database timeouts
  DATABASE_SOCKET: 45000,     // 45 seconds for database operations
  DATABASE_SELECTION: 5000,   // 5 seconds for database connection selection
  
  // Queue timeouts
  QUEUE_JOB_TIMEOUT: 300000,  // 5 minutes for background job processing
  
  // Health check timeouts
  HEALTH_CHECK: 10000,        // 10 seconds for health check operations
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;
