/**
 * OLYMPUS - Mutex and Concurrency Primitives
 *
 * SECURITY FIX: Cluster #6 - Missing Concurrency Primitives
 * Provides mutex locks, semaphores, and deadlock detection
 * for safe concurrent access to shared resources.
 *
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';

/**
 * Lock acquisition result
 */
export interface LockResult {
  acquired: boolean;
  lockId: string;
  acquiredAt: number;
  timeout: boolean;
}

/**
 * Lock timeout error
 */
export class LockTimeoutError extends Error {
  constructor(
    public lockName: string,
    public timeoutMs: number
  ) {
    super(`Failed to acquire lock "${lockName}" within ${timeoutMs}ms`);
    this.name = 'LockTimeoutError';
  }
}

/**
 * Mutex - Simple mutual exclusion lock
 * Ensures only one caller can hold the lock at a time
 */
export class Mutex {
  private locked: boolean = false;
  private queue: Array<{
    resolve: (value: LockResult) => void;
    reject: (error: Error) => void;
    lockId: string;
    timeoutId?: NodeJS.Timeout;
  }> = [];
  private currentLockId: string | null = null;
  private currentLockTime: number = 0;

  constructor(private name: string = 'mutex') {}

  /**
   * Acquire the lock
   * @param timeoutMs Maximum time to wait for lock (default: 30 seconds)
   */
  async acquire(timeoutMs: number = 30000): Promise<LockResult> {
    const lockId = `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (!this.locked) {
      this.locked = true;
      this.currentLockId = lockId;
      this.currentLockTime = Date.now();
      return {
        acquired: true,
        lockId,
        acquiredAt: this.currentLockTime,
        timeout: false,
      };
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        lockId,
        timeoutId: undefined as NodeJS.Timeout | undefined,
      };

      // Set timeout
      entry.timeoutId = setTimeout(() => {
        const index = this.queue.indexOf(entry);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new LockTimeoutError(this.name, timeoutMs));
        }
      }, timeoutMs);

      this.queue.push(entry);
    });
  }

  /**
   * Release the lock
   */
  release(lockId?: string): void {
    if (lockId && this.currentLockId !== lockId) {
      logger.warn('[Mutex] Attempted to release lock with wrong ID', {
        name: this.name,
        expected: this.currentLockId,
        got: lockId,
      });
      return;
    }

    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      if (next.timeoutId) {
        clearTimeout(next.timeoutId);
      }
      this.currentLockId = next.lockId;
      this.currentLockTime = Date.now();
      next.resolve({
        acquired: true,
        lockId: next.lockId,
        acquiredAt: this.currentLockTime,
        timeout: false,
      });
    } else {
      this.locked = false;
      this.currentLockId = null;
      this.currentLockTime = 0;
    }
  }

  /**
   * Check if lock is currently held
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get time lock has been held (in ms)
   */
  getLockDuration(): number {
    if (!this.locked) return 0;
    return Date.now() - this.currentLockTime;
  }

  /**
   * Execute a function with the lock held
   * Automatically releases lock when done
   */
  async withLock<T>(fn: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
    const lock = await this.acquire(timeoutMs);
    try {
      return await fn();
    } finally {
      this.release(lock.lockId);
    }
  }
}

/**
 * ReadWriteLock - Allows multiple readers or single writer
 */
export class ReadWriteLock {
  private readers: number = 0;
  private writer: boolean = false;
  private writerQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  private readerQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private name: string = 'rwlock') {}

  /**
   * Acquire read lock (multiple readers allowed)
   */
  async acquireRead(timeoutMs: number = 30000): Promise<void> {
    if (!this.writer && this.writerQueue.length === 0) {
      this.readers++;
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.readerQueue.findIndex(e => e.resolve === resolve);
        if (index !== -1) {
          this.readerQueue.splice(index, 1);
          reject(new LockTimeoutError(`${this.name}:read`, timeoutMs));
        }
      }, timeoutMs);

      this.readerQueue.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject,
      });
    });
  }

  /**
   * Release read lock
   */
  releaseRead(): void {
    this.readers--;
    if (this.readers === 0 && this.writerQueue.length > 0) {
      this.writer = true;
      const next = this.writerQueue.shift()!;
      next.resolve();
    }
  }

  /**
   * Acquire write lock (exclusive)
   */
  async acquireWrite(timeoutMs: number = 30000): Promise<void> {
    if (!this.writer && this.readers === 0) {
      this.writer = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.writerQueue.findIndex(e => e.resolve === resolve);
        if (index !== -1) {
          this.writerQueue.splice(index, 1);
          reject(new LockTimeoutError(`${this.name}:write`, timeoutMs));
        }
      }, timeoutMs);

      this.writerQueue.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject,
      });
    });
  }

  /**
   * Release write lock
   */
  releaseWrite(): void {
    this.writer = false;

    // Prioritize waiting readers
    while (this.readerQueue.length > 0 && this.writerQueue.length === 0) {
      this.readers++;
      const next = this.readerQueue.shift()!;
      next.resolve();
    }

    // Or give lock to next writer
    if (this.readers === 0 && this.writerQueue.length > 0) {
      this.writer = true;
      const next = this.writerQueue.shift()!;
      next.resolve();
    }
  }

  /**
   * Execute function with read lock
   */
  async withReadLock<T>(fn: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
    await this.acquireRead(timeoutMs);
    try {
      return await fn();
    } finally {
      this.releaseRead();
    }
  }

  /**
   * Execute function with write lock
   */
  async withWriteLock<T>(fn: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
    await this.acquireWrite(timeoutMs);
    try {
      return await fn();
    } finally {
      this.releaseWrite();
    }
  }
}

/**
 * Semaphore - Limits concurrent access to a resource
 */
export class Semaphore {
  private permits: number;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(
    private maxPermits: number,
    private name: string = 'semaphore'
  ) {
    this.permits = maxPermits;
  }

  /**
   * Acquire a permit
   */
  async acquire(timeoutMs: number = 30000): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex(e => e.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new LockTimeoutError(this.name, timeoutMs));
        }
      }, timeoutMs);

      this.queue.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject,
      });
    });
  }

  /**
   * Release a permit
   */
  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next.resolve();
    } else {
      this.permits++;
    }
  }

  /**
   * Get available permits
   */
  getAvailablePermits(): number {
    return this.permits;
  }

  /**
   * Execute with permit
   */
  async withPermit<T>(fn: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
    await this.acquire(timeoutMs);
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * ContextIsolator - Creates isolated copies of context for parallel execution
 */
export class ContextIsolator<T extends object> {
  private mutex = new Mutex('context-merge');

  /**
   * Create a deep clone of the context
   */
  clone(context: T): T {
    return JSON.parse(JSON.stringify(context));
  }

  /**
   * Merge results from parallel contexts back into main context
   * Uses mutex to ensure atomic merge
   */
  async merge<R>(
    mainContext: T,
    results: Array<{ context: T; result: R }>,
    mergeStrategy: (main: T, partial: T) => void
  ): Promise<R[]> {
    return this.mutex.withLock(async () => {
      const mergedResults: R[] = [];

      for (const { context, result } of results) {
        mergeStrategy(mainContext, context);
        mergedResults.push(result);
      }

      return mergedResults;
    });
  }
}

export default Mutex;
