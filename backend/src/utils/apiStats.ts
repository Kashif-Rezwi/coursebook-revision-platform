interface APIStatsData {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  errorCount: number;
  averageResponseTime: number;
  startTime: number;
}

interface APIStatsResult extends APIStatsData {
  uptime: number;
  requestsPerMinute: string;
  errorRate: string;
}

class APIStats {
  private stats: APIStatsData;

  constructor() {
    this.stats = {
      totalRequests: 0,
      requestsByEndpoint: {},
      requestsByMethod: {},
      errorCount: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    };
  }

  recordRequest(method: string, endpoint: string, responseTime: number, statusCode: number): void {
    this.stats.totalRequests++;

    // Track by endpoint
    if (!this.stats.requestsByEndpoint[endpoint]) {
      this.stats.requestsByEndpoint[endpoint] = 0;
    }
    this.stats.requestsByEndpoint[endpoint]++;

    // Track by method
    if (!this.stats.requestsByMethod[method]) {
      this.stats.requestsByMethod[method] = 0;
    }
    this.stats.requestsByMethod[method]++;

    // Track errors
    if (statusCode >= 400) {
      this.stats.errorCount++;
    }

    // Update average response time
    const previousAvg = this.stats.averageResponseTime;
    const count = this.stats.totalRequests;
    this.stats.averageResponseTime = 
      (previousAvg * (count - 1) + responseTime) / count;
  }

  getStats(): APIStatsResult {
    const uptime = Date.now() - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime,
      requestsPerMinute: (this.stats.totalRequests / (uptime / 60000)).toFixed(2),
      errorRate: this.stats.totalRequests > 0 
        ? ((this.stats.errorCount / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0.00%'
    };
  }

  reset(): void {
    this.stats = {
      totalRequests: 0,
      requestsByEndpoint: {},
      requestsByMethod: {},
      errorCount: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    };
  }
}

export default new APIStats();
