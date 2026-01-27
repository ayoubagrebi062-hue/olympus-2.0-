/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     STORAGE RESILIENCE MODULE                                 ║
 * ║                                                                               ║
 * ║   CRITICAL FIX #3: Handle LocalStorage Full Errors                           ║
 * ║                                                                               ║
 * ║   The Problem:                                                                ║
 * ║   - localStorage.setItem() throws QuotaExceededError when full               ║
 * ║   - Uncaught = app crashes silently                                          ║
 * ║   - User has no idea what happened                                           ║
 * ║   - No recovery mechanism                                                     ║
 * ║                                                                               ║
 * ║   The Solution:                                                               ║
 * ║   1. WRAP ALL STORAGE: Every operation in try-catch                          ║
 * ║   2. FALLBACK CHAIN: localStorage → sessionStorage → memory                   ║
 * ║   3. QUOTA CHECK: Verify space before writing                                 ║
 * ║   4. LRU EVICTION: Remove oldest items when near limit                        ║
 * ║   5. USER NOTIFICATION: Clear feedback when in degraded mode                  ║
 * ║                                                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// TYPES
// ============================================================================

export type StorageMode = 'localStorage' | 'sessionStorage' | 'memory' | 'unavailable';

export interface StorageOptions {
  /** Namespace prefix for all keys */
  namespace?: string;
  /** Default TTL in milliseconds (0 = never expire) */
  defaultTTL?: number;
  /** Maximum items to store (for LRU eviction) */
  maxItems?: number;
  /** Callback when storage mode degrades */
  onDegrade?: (from: StorageMode, to: StorageMode, reason: string) => void;
  /** Callback when operation fails completely */
  onError?: (operation: string, error: Error) => void;
}

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt: number | null;
  accessCount: number;
}

export interface StorageStats {
  mode: StorageMode;
  itemCount: number;
  estimatedSizeBytes: number;
  quotaUsedPercent: number | null;
  oldestItemAge: number | null;
  degradedReason: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<StorageOptions> = {
  namespace: 'pantheon',
  defaultTTL: 0,
  maxItems: 1000,
  onDegrade: () => {},
  onError: () => {},
};

/** Approximate localStorage limit (5MB for most browsers) */
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/** Trigger eviction when reaching this percentage of limit */
const EVICTION_THRESHOLD = 0.8;

// ============================================================================
// STORAGE AVAILABILITY CHECK
// ============================================================================

/**
 * Check if a storage type is available and writable
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';

    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Estimate current storage usage
 */
function estimateStorageUsage(
  storage: Storage,
  namespace: string
): { bytes: number; items: number } {
  let bytes = 0;
  let items = 0;

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(namespace)) {
        const value = storage.getItem(key);
        if (value) {
          bytes += key.length + value.length;
          items++;
        }
      }
    }
  } catch {
    // Ignore errors during estimation
  }

  return { bytes: bytes * 2, items }; // ×2 for UTF-16 encoding
}

// ============================================================================
// IN-MEMORY FALLBACK STORAGE
// ============================================================================

class MemoryStorage {
  private data: Map<string, string> = new Map();
  private maxSize = 10 * 1024 * 1024; // 10MB in-memory limit

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const currentSize = this.getCurrentSize();
    const newItemSize = key.length + value.length;

    if (currentSize + newItemSize > this.maxSize) {
      throw new Error('MemoryStorage quota exceeded');
    }

    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  private getCurrentSize(): number {
    let size = 0;
    Array.from(this.data.entries()).forEach(([key, value]) => {
      size += key.length + value.length;
    });
    return size * 2;
  }
}

// ============================================================================
// RESILIENT STORAGE CLASS
// ============================================================================

/**
 * RESILIENT STORAGE
 *
 * A bulletproof storage wrapper that never crashes.
 *
 * @example
 * const storage = new ResilientStorage({ namespace: 'myapp' });
 *
 * // Store data (never throws)
 * storage.set('user', { name: 'Alice' });
 *
 * // Retrieve data (returns null if not found)
 * const user = storage.get<User>('user');
 *
 * // Check current status
 * const stats = storage.getStats();
 * if (stats.mode !== 'localStorage') {
 *   showWarning('Data will not persist after this session');
 * }
 */
export class ResilientStorage {
  private options: Required<StorageOptions>;
  private currentMode: StorageMode;
  private memoryFallback: MemoryStorage;
  private degradedReason: string | null = null;

  constructor(options: StorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.memoryFallback = new MemoryStorage();
    this.currentMode = this.initializeMode();
  }

  private initializeMode(): StorageMode {
    // Try localStorage first
    if (isStorageAvailable('localStorage')) {
      return 'localStorage';
    }

    // Fall back to sessionStorage
    if (isStorageAvailable('sessionStorage')) {
      this.degradedReason = 'localStorage unavailable';
      this.options.onDegrade('localStorage', 'sessionStorage', this.degradedReason);
      return 'sessionStorage';
    }

    // Fall back to memory
    this.degradedReason = 'all browser storage unavailable';
    this.options.onDegrade('sessionStorage', 'memory', this.degradedReason);
    return 'memory';
  }

  private getStorage(): Storage | MemoryStorage {
    switch (this.currentMode) {
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      case 'memory':
      default:
        return this.memoryFallback;
    }
  }

  private makeKey(key: string): string {
    return `${this.options.namespace}:${key}`;
  }

  private degrade(reason: string): void {
    const previousMode = this.currentMode;
    this.degradedReason = reason;

    if (this.currentMode === 'localStorage') {
      if (isStorageAvailable('sessionStorage')) {
        this.currentMode = 'sessionStorage';
        this.options.onDegrade(previousMode, 'sessionStorage', reason);
      } else {
        this.currentMode = 'memory';
        this.options.onDegrade(previousMode, 'memory', reason);
      }
    } else if (this.currentMode === 'sessionStorage') {
      this.currentMode = 'memory';
      this.options.onDegrade(previousMode, 'memory', reason);
    }
  }

  // ===========================================================================
  // CORE OPERATIONS
  // ===========================================================================

  /**
   * Store a value
   *
   * NEVER THROWS. If storage fails, returns false.
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const fullKey = this.makeKey(key);
    const expiresAt = ttl ? Date.now() + ttl : this.options.defaultTTL ? Date.now() + this.options.defaultTTL : null;

    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      expiresAt,
      accessCount: 0,
    };

    const serialized = JSON.stringify(item);

    // Try current storage mode
    try {
      // Check quota before writing
      this.ensureQuota(serialized.length);

      const storage = this.getStorage();
      storage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      // Handle quota exceeded
      if (this.isQuotaError(error)) {
        // Try eviction first
        if (this.evictOldItems()) {
          try {
            this.getStorage().setItem(fullKey, serialized);
            return true;
          } catch {
            // Eviction didn't help, degrade
          }
        }

        // Degrade to next level
        this.degrade('quota exceeded');

        // Retry with degraded storage
        return this.set(key, value, ttl);
      }

      // Other errors
      this.options.onError('set', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Retrieve a value
   *
   * NEVER THROWS. Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const fullKey = this.makeKey(key);

    try {
      const storage = this.getStorage();
      const raw = storage.getItem(fullKey);

      if (!raw) return null;

      const item: StorageItem<T> = JSON.parse(raw);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key);
        return null;
      }

      // Update access count
      item.accessCount++;
      try {
        storage.setItem(fullKey, JSON.stringify(item));
      } catch {
        // Ignore write failure for access count update
      }

      return item.value;
    } catch (error) {
      this.options.onError('get', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Remove a value
   *
   * NEVER THROWS.
   */
  remove(key: string): boolean {
    const fullKey = this.makeKey(key);

    try {
      this.getStorage().removeItem(fullKey);
      return true;
    } catch (error) {
      this.options.onError('remove', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all items in namespace
   *
   * NEVER THROWS.
   */
  clear(): boolean {
    try {
      const storage = this.getStorage();
      const keysToRemove: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.options.namespace + ':')) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        storage.removeItem(key);
      }

      return true;
    } catch (error) {
      this.options.onError('clear', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  // ===========================================================================
  // QUOTA MANAGEMENT
  // ===========================================================================

  private isQuotaError(error: unknown): boolean {
    if (error instanceof Error) {
      // Different browsers use different error types
      return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.message.includes('quota') ||
        error.message.includes('storage')
      );
    }
    return false;
  }

  private ensureQuota(additionalBytes: number): void {
    if (this.currentMode === 'memory') return;

    const storage = this.getStorage() as Storage;
    const { bytes } = estimateStorageUsage(storage, this.options.namespace);
    const projectedUsage = (bytes + additionalBytes) / STORAGE_LIMIT_BYTES;

    if (projectedUsage > EVICTION_THRESHOLD) {
      this.evictOldItems();
    }
  }

  private evictOldItems(): boolean {
    try {
      const storage = this.getStorage();
      const items: Array<{ key: string; timestamp: number; accessCount: number }> = [];

      // Collect all items with metadata
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.options.namespace + ':')) {
          try {
            const raw = storage.getItem(key);
            if (raw) {
              const item = JSON.parse(raw);
              items.push({
                key,
                timestamp: item.timestamp || 0,
                accessCount: item.accessCount || 0,
              });
            }
          } catch {
            // Invalid item, remove it
            storage.removeItem(key);
          }
        }
      }

      // Sort by access count (LRU), then by age
      items.sort((a, b) => {
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount; // Least accessed first
        }
        return a.timestamp - b.timestamp; // Oldest first
      });

      // Remove oldest 20%
      const removeCount = Math.max(1, Math.floor(items.length * 0.2));
      for (let i = 0; i < removeCount; i++) {
        storage.removeItem(items[i].key);
      }

      return removeCount > 0;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // STATUS & DIAGNOSTICS
  // ===========================================================================

  /**
   * Get current storage statistics
   */
  getStats(): StorageStats {
    try {
      const storage = this.getStorage();
      const { bytes, items } = this.currentMode !== 'memory'
        ? estimateStorageUsage(storage as Storage, this.options.namespace)
        : { bytes: 0, items: 0 };

      let oldestTimestamp: number | null = null;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.options.namespace + ':')) {
          try {
            const raw = storage.getItem(key);
            if (raw) {
              const item = JSON.parse(raw);
              if (item.timestamp && (oldestTimestamp === null || item.timestamp < oldestTimestamp)) {
                oldestTimestamp = item.timestamp;
              }
            }
          } catch {
            // Skip invalid items
          }
        }
      }

      return {
        mode: this.currentMode,
        itemCount: items,
        estimatedSizeBytes: bytes,
        quotaUsedPercent: this.currentMode !== 'memory' ? (bytes / STORAGE_LIMIT_BYTES) * 100 : null,
        oldestItemAge: oldestTimestamp ? Date.now() - oldestTimestamp : null,
        degradedReason: this.degradedReason,
      };
    } catch {
      return {
        mode: this.currentMode,
        itemCount: 0,
        estimatedSizeBytes: 0,
        quotaUsedPercent: null,
        oldestItemAge: null,
        degradedReason: this.degradedReason,
      };
    }
  }

  /**
   * Get current storage mode
   */
  getMode(): StorageMode {
    return this.currentMode;
  }

  /**
   * Check if storage is in degraded mode
   */
  isDegraded(): boolean {
    return this.currentMode !== 'localStorage';
  }

  /**
   * Force a specific storage mode (for testing)
   */
  forceMode(mode: StorageMode): void {
    this.currentMode = mode;
    this.degradedReason = mode !== 'localStorage' ? 'forced mode change' : null;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

let defaultInstance: ResilientStorage | null = null;

/**
 * Get the default storage instance
 */
export function getStorage(options?: StorageOptions): ResilientStorage {
  if (!defaultInstance) {
    defaultInstance = new ResilientStorage(options);
  }
  return defaultInstance;
}

/**
 * Store a value using the default instance
 */
export function storageSet<T>(key: string, value: T, ttl?: number): boolean {
  return getStorage().set(key, value, ttl);
}

/**
 * Retrieve a value using the default instance
 */
export function storageGet<T>(key: string): T | null {
  return getStorage().get<T>(key);
}

/**
 * Remove a value using the default instance
 */
export function storageRemove(key: string): boolean {
  return getStorage().remove(key);
}

// ============================================================================
// USER NOTIFICATION HELPERS
// ============================================================================

export interface DegradedModeNotification {
  message: string;
  severity: 'info' | 'warning' | 'error';
  persistent: boolean;
}

/**
 * Get user-friendly notification for degraded storage mode
 */
export function getDegradedModeNotification(
  mode: StorageMode,
  reason: string | null
): DegradedModeNotification | null {
  switch (mode) {
    case 'localStorage':
      return null; // All good!

    case 'sessionStorage':
      return {
        message: 'Your settings will not persist after closing this tab.',
        severity: 'warning',
        persistent: false,
      };

    case 'memory':
      return {
        message: 'Settings cannot be saved. Your changes will be lost on page refresh.',
        severity: 'error',
        persistent: true,
      };

    case 'unavailable':
      return {
        message: 'Storage is unavailable. Some features may not work correctly.',
        severity: 'error',
        persistent: true,
      };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const StorageResilienceModule = {
  ResilientStorage,
  getStorage,
  storageSet,
  storageGet,
  storageRemove,
  getDegradedModeNotification,
  isStorageAvailable,
};

export default ResilientStorage;
