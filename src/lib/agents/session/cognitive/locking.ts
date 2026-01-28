/**
 * OLYMPUS 2.0 - Session Locking (Optimistic & Pessimistic)
 *
 * Prevents race conditions in concurrent session access.
 * PATCH 6: Critical security for Week 2.
 */

import type { CognitiveSession } from './types';

/**
 * Session version for optimistic locking
 */
export interface VersionedSession {
  session: CognitiveSession;
  version: number;
  lastModified: Date;
}

/**
 * Optimistic locking error
 */
export class OptimisticLockError extends Error {
  public readonly userId: string;
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(userId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Optimistic lock failed for session ${userId}: ` +
        `expected version ${expectedVersion}, got ${actualVersion}`
    );
    this.name = 'OptimisticLockError';
    this.userId = userId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Lock acquisition timeout error
 */
export class LockTimeoutError extends Error {
  public readonly userId: string;
  public readonly holder: string;

  constructor(userId: string, holder: string) {
    super(`Failed to acquire lock for session ${userId}: held by ${holder}`);
    this.name = 'LockTimeoutError';
    this.userId = userId;
    this.holder = holder;
  }
}

/**
 * Lock entry
 */
interface LockEntry {
  holder: string;
  expiresAt: Date;
  acquiredAt: Date;
}

/**
 * Session lock manager
 */
export class SessionLockManager {
  private versions: Map<string, number> = new Map();
  private locks: Map<string, LockEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup expired locks every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 30000);
  }

  /**
   * Get current version
   */
  getVersion(userId: string): number {
    return this.versions.get(userId) ?? 0;
  }

  /**
   * Increment version (on save)
   */
  incrementVersion(userId: string): number {
    const current = this.getVersion(userId);
    const next = current + 1;
    this.versions.set(userId, next);
    return next;
  }

  /**
   * Check version matches expected
   */
  checkVersion(userId: string, expectedVersion: number): boolean {
    return this.getVersion(userId) === expectedVersion;
  }

  /**
   * Validate version and throw if mismatch
   */
  validateVersion(userId: string, expectedVersion: number): void {
    const actual = this.getVersion(userId);
    if (actual !== expectedVersion) {
      throw new OptimisticLockError(userId, expectedVersion, actual);
    }
  }

  /**
   * Acquire exclusive lock (for critical operations)
   */
  async acquireLock(
    userId: string,
    holderId: string,
    timeoutMs: number = 5000,
    retryMs: number = 100,
    maxRetries: number = 50
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let retries = 0;

    while (Date.now() < deadline && retries < maxRetries) {
      const existing = this.locks.get(userId);

      // Check if lock exists and is not expired
      if (existing && existing.expiresAt > new Date()) {
        if (existing.holder === holderId) {
          // Renew existing lock
          existing.expiresAt = new Date(Date.now() + timeoutMs);
          return true;
        }

        // Lock held by someone else - wait and retry
        await this.sleep(retryMs);
        retries++;
        continue;
      }

      // Acquire lock
      this.locks.set(userId, {
        holder: holderId,
        expiresAt: new Date(Date.now() + timeoutMs),
        acquiredAt: new Date(),
      });

      return true;
    }

    // Failed to acquire
    const existing = this.locks.get(userId);
    if (existing) {
      throw new LockTimeoutError(userId, existing.holder);
    }

    return false;
  }

  /**
   * Try to acquire lock without waiting
   */
  tryAcquireLock(userId: string, holderId: string, durationMs: number = 5000): boolean {
    const existing = this.locks.get(userId);

    // Check if lock exists and is not expired
    if (existing && existing.expiresAt > new Date()) {
      if (existing.holder === holderId) {
        // Renew existing lock
        existing.expiresAt = new Date(Date.now() + durationMs);
        return true;
      }
      return false; // Lock held by someone else
    }

    // Acquire lock
    this.locks.set(userId, {
      holder: holderId,
      expiresAt: new Date(Date.now() + durationMs),
      acquiredAt: new Date(),
    });

    return true;
  }

  /**
   * Release lock
   */
  releaseLock(userId: string, holderId: string): boolean {
    const existing = this.locks.get(userId);

    if (existing?.holder === holderId) {
      this.locks.delete(userId);
      return true;
    }

    return false;
  }

  /**
   * Check if lock is held
   */
  isLocked(userId: string): boolean {
    const existing = this.locks.get(userId);
    return existing !== undefined && existing.expiresAt > new Date();
  }

  /**
   * Get lock holder
   */
  getLockHolder(userId: string): string | null {
    const existing = this.locks.get(userId);
    if (existing && existing.expiresAt > new Date()) {
      return existing.holder;
    }
    return null;
  }

  /**
   * Execute with lock
   */
  async withLock<T>(
    userId: string,
    holderId: string,
    fn: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    const acquired = await this.acquireLock(userId, holderId, timeoutMs);
    if (!acquired) {
      throw new LockTimeoutError(userId, this.getLockHolder(userId) ?? 'unknown');
    }

    try {
      return await fn();
    } finally {
      this.releaseLock(userId, holderId);
    }
  }

  /**
   * Cleanup expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = new Date();
    for (const [userId, lock] of this.locks) {
      if (lock.expiresAt <= now) {
        this.locks.delete(userId);
      }
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown - cleanup interval
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    activeLocks: number;
    trackedVersions: number;
  } {
    // Count non-expired locks
    const now = new Date();
    let activeLocks = 0;
    for (const lock of this.locks.values()) {
      if (lock.expiresAt > now) {
        activeLocks++;
      }
    }

    return {
      activeLocks,
      trackedVersions: this.versions.size,
    };
  }

  /**
   * Clear all (for testing)
   */
  clear(): void {
    this.locks.clear();
    this.versions.clear();
  }
}

// Export singleton
export const sessionLockManager = new SessionLockManager();
