import * as os from 'os';
import config from '../config/env';

interface SystemInfo {
  node: {
    version: string;
    env: string;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  system: {
    platform: string;
    arch: string;
    cpus: number;
    totalMemory: number;
    freeMemory: number;
    hostname: string;
    uptime: number;
  };
  app: {
    name: string;
    version: string;
    environment: string;
  };
}

export const getSystemInfo = async (): Promise<SystemInfo> => {
  return {
    node: {
      version: process.version,
      env: config.env,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      hostname: os.hostname(),
      uptime: os.uptime()
    },
    app: {
      name: 'Learning Platform API',
      version: '1.0.0',
      environment: config.env
    }
  };
};

export const formatBytes = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};
