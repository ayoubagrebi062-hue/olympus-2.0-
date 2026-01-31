/**
 * OLYMPUS 2.1 - Encrypted Configuration Storage
 *
 * SECURITY FIX: Cluster #4 Hardening - Data at Rest Encryption
 * Encrypts sensitive configuration values using AES-256-GCM.
 * Supports environment-based key management.
 *
 * @version 1.0.0
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from 'crypto';
import { logger } from '@/utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encrypted value format
 */
export interface EncryptedValue {
  /** Encrypted data (base64) */
  data: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Authentication tag (base64) */
  tag: string;
  /** Salt for key derivation (base64) */
  salt: string;
  /** Encryption version for future upgrades */
  version: '1.0';
  /** Key identifier (for key rotation) */
  keyId?: string;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Master key (from environment) */
  masterKey: string;
  /** Key identifier for rotation tracking */
  keyId?: string;
  /** Key derivation iterations (default: 100000) */
  iterations?: number;
}

/**
 * Sensitive config keys that should always be encrypted
 */
export const SENSITIVE_CONFIG_KEYS = [
  'apiKey',
  'apiSecret',
  'secretKey',
  'privateKey',
  'password',
  'token',
  'credential',
  'signing_key',
  'encryption_key',
  'database_url',
  'redis_url',
  'supabase_key',
  'jwt_secret',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const DEFAULT_ITERATIONS = 100000;

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTED CONFIG STORE
// ═══════════════════════════════════════════════════════════════════════════════

export class EncryptedConfigStore {
  private masterKey: Buffer;
  private keyId: string;
  private iterations: number;
  private derivedKeyCache: Map<string, Buffer> = new Map();

  constructor(config: EncryptionConfig) {
    if (!config.masterKey || config.masterKey.length < 32) {
      throw new Error(
        'Master key must be at least 32 characters. Set OLYMPUS_CONFIG_ENCRYPTION_KEY in environment.'
      );
    }

    this.masterKey = Buffer.from(config.masterKey, 'utf-8');
    this.keyId = config.keyId || this.generateKeyId();
    this.iterations = config.iterations ?? DEFAULT_ITERATIONS;

    logger.info('[EncryptedConfigStore] Initialized', { keyId: this.keyId });
  }

  /**
   * Encrypt a sensitive value
   */
  encrypt(plaintext: string): EncryptedValue {
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const derivedKey = this.deriveKey(salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

    // Encrypt
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);

    // Get auth tag
    const tag = cipher.getAuthTag();

    const result: EncryptedValue = {
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
      version: '1.0',
      keyId: this.keyId,
    };

    logger.debug('[EncryptedConfigStore] Value encrypted', { keyId: this.keyId });

    return result;
  }

  /**
   * Decrypt an encrypted value
   */
  decrypt(encrypted: EncryptedValue): string {
    // Validate version
    if (encrypted.version !== '1.0') {
      throw new Error(`Unsupported encryption version: ${encrypted.version}`);
    }

    // Decode components
    const data = Buffer.from(encrypted.data, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const salt = Buffer.from(encrypted.salt, 'base64');

    // Derive key
    const derivedKey = this.deriveKey(salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    try {
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (error) {
      logger.error('[EncryptedConfigStore] Decryption failed', {
        keyId: encrypted.keyId,
        error: (error as Error).message,
      });
      throw new Error('Decryption failed - invalid key or tampered data');
    }
  }

  /**
   * Check if a value is encrypted
   */
  isEncrypted(value: unknown): value is EncryptedValue {
    if (!value || typeof value !== 'object') return false;
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.data === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.tag === 'string' &&
      typeof obj.salt === 'string' &&
      obj.version === '1.0'
    );
  }

  /**
   * Encrypt sensitive keys in a config object
   */
  encryptConfig<T extends Record<string, unknown>>(config: T): T {
    const result = { ...config };

    for (const [key, value] of Object.entries(result)) {
      if (this.isSensitiveKey(key) && typeof value === 'string' && !this.isEncrypted(value)) {
        (result as Record<string, unknown>)[key] = this.encrypt(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        (result as Record<string, unknown>)[key] = this.encryptConfig(
          value as Record<string, unknown>
        );
      }
    }

    return result;
  }

  /**
   * Decrypt sensitive keys in a config object
   */
  decryptConfig<T extends Record<string, unknown>>(config: T): T {
    const result = { ...config };

    for (const [key, value] of Object.entries(result)) {
      if (this.isEncrypted(value)) {
        (result as Record<string, unknown>)[key] = this.decrypt(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        (result as Record<string, unknown>)[key] = this.decryptConfig(
          value as Record<string, unknown>
        );
      }
    }

    return result;
  }

  /**
   * Re-encrypt config with new key (for key rotation)
   */
  rotateKey<T extends Record<string, unknown>>(
    config: T,
    newStore: EncryptedConfigStore
  ): T {
    const decrypted = this.decryptConfig(config);
    return newStore.encryptConfig(decrypted);
  }

  /**
   * Get current key ID
   */
  getKeyId(): string {
    return this.keyId;
  }

  // ─────────────── PRIVATE ───────────────

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(salt: Buffer): Buffer {
    const cacheKey = salt.toString('base64');

    // Check cache
    const cached = this.derivedKeyCache.get(cacheKey);
    if (cached) return cached;

    // Derive using scrypt
    const derived = scryptSync(this.masterKey, salt, KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
    });

    // Cache (limit size)
    if (this.derivedKeyCache.size > 100) {
      const firstKey = this.derivedKeyCache.keys().next().value;
      if (firstKey) this.derivedKeyCache.delete(firstKey);
    }
    this.derivedKeyCache.set(cacheKey, derived);

    return derived;
  }

  /**
   * Generate key ID from master key hash
   */
  private generateKeyId(): string {
    const hash = createHash('sha256').update(this.masterKey).digest('hex');
    return hash.slice(0, 8);
  }

  /**
   * Check if a key name indicates sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_CONFIG_KEYS.some(
      sensitive => lowerKey.includes(sensitive.toLowerCase())
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let defaultStore: EncryptedConfigStore | null = null;

/**
 * Get default encrypted config store
 * Uses OLYMPUS_CONFIG_ENCRYPTION_KEY from environment
 *
 * SECURITY FIX (Jan 31, 2026): Now throws error in production if key is missing
 * to prevent silent security degradation.
 */
export function getEncryptedConfigStore(): EncryptedConfigStore {
  if (defaultStore) {
    return defaultStore;
  }

  const masterKey = process.env.OLYMPUS_CONFIG_ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!masterKey) {
    // SECURITY FIX: Fail fast in production
    if (isProduction) {
      const errorMessage =
        'FATAL SECURITY ERROR: OLYMPUS_CONFIG_ENCRYPTION_KEY is required in production.\n' +
        'Set this environment variable to a secure 32+ character secret.\n' +
        'Without this key, encrypted configuration values cannot be decrypted safely.\n' +
        'Refusing to start with insecure temporary key in production environment.';

      logger.error('[EncryptedConfigStore] ' + errorMessage);
      throw new Error(errorMessage);
    }

    // Development only: use deterministic key with prominent warning
    const devKey = 'OLYMPUS_DEV_ONLY_INSECURE_KEY_32CH';
    logger.warn(
      '[EncryptedConfigStore] DEVELOPMENT MODE: Using hardcoded dev key.\n' +
        '⚠️  DO NOT USE IN PRODUCTION - Set OLYMPUS_CONFIG_ENCRYPTION_KEY environment variable.'
    );
    defaultStore = new EncryptedConfigStore({ masterKey: devKey, keyId: 'dev-insecure' });
  } else {
    if (masterKey.length < 32) {
      const errorMessage =
        'SECURITY ERROR: OLYMPUS_CONFIG_ENCRYPTION_KEY must be at least 32 characters.\n' +
        `Current length: ${masterKey.length} characters.`;
      logger.error('[EncryptedConfigStore] ' + errorMessage);
      throw new Error(errorMessage);
    }
    defaultStore = new EncryptedConfigStore({ masterKey });
  }

  return defaultStore;
}

/**
 * Encrypt a single value
 */
export function encryptValue(plaintext: string): EncryptedValue {
  return getEncryptedConfigStore().encrypt(plaintext);
}

/**
 * Decrypt a single value
 */
export function decryptValue(encrypted: EncryptedValue): string {
  return getEncryptedConfigStore().decrypt(encrypted);
}

/**
 * Encrypt sensitive values in config object
 */
export function encryptSensitiveConfig<T extends Record<string, unknown>>(config: T): T {
  return getEncryptedConfigStore().encryptConfig(config);
}

/**
 * Decrypt sensitive values in config object
 */
export function decryptSensitiveConfig<T extends Record<string, unknown>>(config: T): T {
  return getEncryptedConfigStore().decryptConfig(config);
}

/**
 * Check if value is encrypted
 */
export function isEncryptedValue(value: unknown): value is EncryptedValue {
  return getEncryptedConfigStore().isEncrypted(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURE CONFIG LOADER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load and decrypt a config file
 */
export async function loadSecureConfig<T extends Record<string, unknown>>(
  loadFn: () => Promise<T>
): Promise<T> {
  const config = await loadFn();
  return decryptSensitiveConfig(config);
}

/**
 * Save encrypted config
 */
export async function saveSecureConfig<T extends Record<string, unknown>>(
  config: T,
  saveFn: (encrypted: T) => Promise<void>
): Promise<void> {
  const encrypted = encryptSensitiveConfig(config);
  await saveFn(encrypted);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default EncryptedConfigStore;
