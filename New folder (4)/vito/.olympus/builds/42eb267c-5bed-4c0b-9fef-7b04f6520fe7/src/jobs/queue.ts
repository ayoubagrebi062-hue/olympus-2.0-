import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

export const jobQueue = new Queue('main', { connection });

export function registerWorker(name: string, handler: (job: Job) => Promise<void>) {
  return new Worker(name, handler, { connection, concurrency: 5 });
}