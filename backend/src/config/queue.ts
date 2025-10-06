import Queue from 'bull';
import config from './env';
import logger from '../utils/logger';

const redisConfig = {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    ...(config.redis.password && { password: config.redis.password }),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  }
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000
  },
  removeOnComplete: 100,
  removeOnFail: 500
};

const createQueue = (queueName: string): Queue.Queue => {
  const queue = new Queue(queueName, {
    ...redisConfig,
    defaultJobOptions: defaultJobOptions
  });

  // Event listeners
  queue.on('error', (error: Error) => {
    logger.error(`Queue ${queueName} error:`, error);
  });

  queue.on('waiting', (jobId: string | number) => {
    logger.debug(`Job ${jobId} waiting in ${queueName}`);
  });

  queue.on('active', (job: Queue.Job) => {
    logger.info(`Job ${job.id} started in ${queueName}`);
  });

  queue.on('completed', (job: Queue.Job) => {
    logger.info(`Job ${job.id} completed in ${queueName}`);
  });

  queue.on('failed', (job: Queue.Job, err: Error) => {
    logger.error(`Job ${job.id} failed in ${queueName}:`, err);
  });

  return queue;
};

export {
  createQueue,
  redisConfig,
  defaultJobOptions
};
