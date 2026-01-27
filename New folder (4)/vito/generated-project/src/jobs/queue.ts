// src/jobs/queue.ts
// Job queue setup using BullMQ and Redis

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Redis connection with proper fallback
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// Main job queue
export const jobQueue = new Queue('main', { connection });

// Worker factory - creates typed workers for job handlers
export function registerWorker<T = unknown>(
  name: string,
  handler: (job: Job<T>) => Promise<void>
) {
  return new Worker<T>(name, handler, {
    connection,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}

// Graceful shutdown
export async function closeQueue() {
  await jobQueue.close();
  await connection.quit();
}
