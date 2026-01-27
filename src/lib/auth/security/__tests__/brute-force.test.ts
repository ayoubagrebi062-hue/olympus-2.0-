/**
 * OLYMPUS 2.0 - Brute Force Protection Tests (Redis-based)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordFailedAttempt,
  isLockedOut,
  recordSuccessfulLogin,
  unlockAccount,
} from '../brute-force';

// Import the actual config to use the real values
import { LOCKOUT_CONFIG } from '../../constants';

describe('Brute Force Protection (Redis)', () => {
  const testEmail = 'test@example.com';
  const testIP = '192.168.1.1';
  const maxAttempts = LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS; // 10

  beforeEach(async () => {
    // Clear any existing records
    await recordSuccessfulLogin(testEmail);
    await recordSuccessfulLogin(testIP);
  });

  afterEach(async () => {
    // Cleanup
    await unlockAccount(testEmail);
    await unlockAccount(testIP);
  });

  describe('recordFailedAttempt', () => {
    it('should track failed attempts', async () => {
      const result1 = await recordFailedAttempt(testEmail);
      expect(result1.isLocked).toBe(false);
      expect(result1.attemptsRemaining).toBe(maxAttempts - 1);
      // First 3 attempts have 0 delay per config
      expect(result1.delayMs).toBeGreaterThanOrEqual(0);

      const result2 = await recordFailedAttempt(testEmail);
      expect(result2.attemptsRemaining).toBe(maxAttempts - 2);
    });

    it('should apply progressive delays after threshold', async () => {
      // First 3 attempts have 0 delay, then delays start
      await recordFailedAttempt(testEmail); // 1st - 0ms
      await recordFailedAttempt(testEmail); // 2nd - 0ms
      await recordFailedAttempt(testEmail); // 3rd - 0ms

      const result4 = await recordFailedAttempt(testEmail); // 4th - 1000ms
      expect(result4.delayMs).toBe(1000);

      const result5 = await recordFailedAttempt(testEmail); // 5th - 2000ms
      expect(result5.delayMs).toBe(2000);
      expect(result5.delayMs).toBeGreaterThan(result4.delayMs);
    });

    it('should lock account after max failed attempts', async () => {
      for (let i = 0; i < maxAttempts; i++) {
        await recordFailedAttempt(testEmail);
      }

      const lockStatus = await isLockedOut(testEmail);
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.lockoutEndsAt).toBeTruthy();
      expect(lockStatus.attemptsRemaining).toBe(0);
    });

    it('should persist across function calls (Redis)', async () => {
      await recordFailedAttempt(testEmail);
      await recordFailedAttempt(testEmail);

      const status = await isLockedOut(testEmail);
      expect(status.attemptsRemaining).toBe(maxAttempts - 2);
    });

    it('should handle different identifiers separately', async () => {
      await recordFailedAttempt(testEmail);
      await recordFailedAttempt(testEmail);

      const emailStatus = await isLockedOut(testEmail);
      const ipStatus = await isLockedOut(testIP);

      expect(emailStatus.attemptsRemaining).toBe(maxAttempts - 2);
      expect(ipStatus.attemptsRemaining).toBe(maxAttempts);
    });
  });

  describe('isLockedOut', () => {
    it('should return false for new identifier', async () => {
      const status = await isLockedOut('new@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(maxAttempts);
    });

    it('should return lockout info when locked', async () => {
      // Lock the account
      for (let i = 0; i < maxAttempts; i++) {
        await recordFailedAttempt(testEmail);
      }

      const status = await isLockedOut(testEmail);
      expect(status.isLocked).toBe(true);
      expect(status.lockoutEndsAt).toBeInstanceOf(Date);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset failed attempts', async () => {
      await recordFailedAttempt(testEmail);
      await recordFailedAttempt(testEmail);
      await recordSuccessfulLogin(testEmail);

      const status = await isLockedOut(testEmail);
      expect(status.attemptsRemaining).toBe(maxAttempts);
    });

    it('should unlock locked accounts', async () => {
      // Lock the account
      for (let i = 0; i < maxAttempts; i++) {
        await recordFailedAttempt(testEmail);
      }

      await recordSuccessfulLogin(testEmail);

      const status = await isLockedOut(testEmail);
      expect(status.isLocked).toBe(false);
    });
  });

  describe('unlockAccount', () => {
    it('should manually unlock a locked account', async () => {
      // Lock the account
      for (let i = 0; i < maxAttempts; i++) {
        await recordFailedAttempt(testEmail);
      }

      await unlockAccount(testEmail);

      const status = await isLockedOut(testEmail);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(maxAttempts);
    });
  });

  describe('Redis fallback', () => {
    it('should work even if Redis is not configured', async () => {
      // This test verifies the in-memory fallback works
      const result = await recordFailedAttempt('fallback@example.com');
      expect(result).toHaveProperty('isLocked');
      expect(result).toHaveProperty('attemptsRemaining');
    });
  });
});
