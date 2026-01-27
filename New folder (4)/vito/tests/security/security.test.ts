/**
 * OLYMPUS 3.0 - Security Tests
 * OWASP Top 10 and security vulnerability testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasSqlInjection,
  hasXss,
  sanitizeHtml,
  sanitizeObject,
  isValidEmail,
  isValidUuid,
  passwordSchema,
} from '@/lib/security/input-validator';
import { securityCheck } from '@/lib/security';

// ============================================================================
// SQL INJECTION TESTS
// ============================================================================

describe('SQL Injection Prevention', () => {
  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1'; DELETE FROM users WHERE '1'='1",
    "admin'--",
    "1 UNION SELECT * FROM users",
    "' OR 1=1--",
    "'; EXEC xp_cmdshell('dir'); --",
    "1; UPDATE users SET password='hacked'",
    "' OR ''='",
    "'; INSERT INTO users VALUES('hacker', 'hacked'); --",
  ];

  it.each(sqlInjectionPayloads)(
    'should detect SQL injection: %s',
    (payload) => {
      expect(hasSqlInjection(payload)).toBe(true);
    }
  );

  it('should allow safe inputs', () => {
    const safeInputs = [
      'John Doe',
      'john@example.com',
      'Hello, World!',
      '123 Main Street',
      'Product description with numbers 123',
    ];

    safeInputs.forEach((input) => {
      expect(hasSqlInjection(input)).toBe(false);
    });
  });
});

// ============================================================================
// XSS PREVENTION TESTS
// ============================================================================

describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert(1)',
    '<a href="javascript:alert(1)">click</a>',
    '<svg onload="alert(1)">',
    '<body onload="alert(1)">',
    '<iframe src="javascript:alert(1)">',
    'data:text/html,<script>alert(1)</script>',
    '<div onclick="alert(1)">',
    'vbscript:msgbox("XSS")',
  ];

  it.each(xssPayloads)('should detect XSS: %s', (payload) => {
    expect(hasXss(payload)).toBe(true);
  });

  it('should sanitize HTML correctly', () => {
    const input = '<script>alert("XSS")</script><p>Hello</p>';
    const sanitized = sanitizeHtml(input);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('should preserve safe text', () => {
    const safeText = 'Hello, World! This is a test.';
    expect(sanitizeHtml(safeText)).toBe(safeText);
  });
});

// ============================================================================
// INPUT VALIDATION TESTS
// ============================================================================

describe('Input Validation', () => {
  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'valid123@test.io',
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'not-an-email',
        '@nodomain.com',
        'spaces in@email.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('UUID Validation', () => {
    it('should accept valid UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUuids.forEach((uuid) => {
        expect(isValidUuid(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '550e8400e29b41d4a716446655440000',
        '',
      ];

      invalidUuids.forEach((uuid) => {
        expect(isValidUuid(uuid)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Password123',
        'SecureP@ss1',
        'MyStr0ngPassword!',
      ];

      strongPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',           // Too short
        'nouppercase1',    // No uppercase
        'NOLOWERCASE1',    // No lowercase
        'NoNumbersHere',   // No numbers
        '12345678',        // No letters
      ];

      weakPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
      });
    });
  });
});

// ============================================================================
// OBJECT SANITIZATION TESTS
// ============================================================================

describe('Object Sanitization', () => {
  it('should sanitize nested objects', () => {
    const input = {
      name: '<script>alert("xss")</script>John',
      profile: {
        bio: 'Hello <img src="x" onerror="alert(1)">',
        location: 'New York',
      },
      tags: ['<script>tag1</script>', 'tag2'],
    };

    const sanitized = sanitizeObject(input);

    expect(sanitized.name).not.toContain('<script>');
    expect(sanitized.profile.bio).not.toContain('<img');
    expect(sanitized.profile.location).toBe('New York');
    expect(sanitized.tags[0]).not.toContain('<script>');
  });

  it('should handle control characters', () => {
    const input = {
      text: 'Hello\x00World\x0BTest',
    };

    const sanitized = sanitizeObject(input);

    expect(sanitized.text).not.toContain('\x00');
    expect(sanitized.text).not.toContain('\x0B');
  });

  it('should normalize whitespace', () => {
    const input = {
      text: '  Multiple   spaces   here  ',
    };

    const sanitized = sanitizeObject(input);

    expect(sanitized.text).toBe('Multiple spaces here');
  });
});

// ============================================================================
// SECURITY CHECK FUNCTION TESTS
// ============================================================================

describe('Security Check Function', () => {
  it('should return safe for clean input', () => {
    const result = securityCheck('Hello, this is a normal message.');
    expect(result.safe).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect SQL injection', () => {
    const result = securityCheck("'; DROP TABLE users; --");
    expect(result.safe).toBe(false);
    expect(result.issues).toContain('Potential SQL injection detected');
  });

  it('should detect XSS', () => {
    const result = securityCheck('<script>alert("xss")</script>');
    expect(result.safe).toBe(false);
    expect(result.issues).toContain('Potential XSS detected');
  });
});

// ============================================================================
// AUTHENTICATION SECURITY TESTS
// ============================================================================

describe('Authentication Security', () => {
  it('should not expose password in error messages', () => {
    const password = 'SecretPassword123!';
    const result = passwordSchema.safeParse('weak');

    // Error message should not contain any reference to actual passwords
    if (!result.success) {
      const errorMessages = result.error.errors.map((e) => e.message).join(' ');
      expect(errorMessages).not.toContain(password);
    }
  });

  it('should enforce minimum password length', () => {
    const result = passwordSchema.safeParse('Ab1');
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('8 characters'))).toBe(true);
    }
  });

  it('should enforce maximum password length', () => {
    const longPassword = 'A'.repeat(200) + '1a';
    const result = passwordSchema.safeParse(longPassword);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// HEADER SECURITY TESTS
// ============================================================================

describe('Security Headers', () => {
  it('should have correct CSP directives', async () => {
    const { buildCsp } = await import('@/lib/security/headers');
    const csp = buildCsp();

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('should have correct permissions policy', async () => {
    const { buildPermissionsPolicy } = await import('@/lib/security/headers');
    const policy = buildPermissionsPolicy();

    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=()');
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
  it('should create rate limiter with correct config', async () => {
    const { createRateLimiter } = await import('@/lib/security/rate-limiter');

    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      keyPrefix: `rl:test:${Date.now()}`, // Unique prefix per test run
    });

    const userId = `test-user-${Date.now()}`;

    // First 5 requests should be allowed
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(userId);
      expect(result.allowed).toBe(true);
    }

    // 6th request should be denied
    const result = await limiter.check(userId);
    expect(result.allowed).toBe(false);
  });

  it('should reset rate limit for user', async () => {
    const { createRateLimiter } = await import('@/lib/security/rate-limiter');

    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      keyPrefix: `rl:reset:${Date.now()}`, // Unique prefix per test run
    });

    const userId = `reset-test-${Date.now()}`;

    // Use up the limit
    await limiter.check(userId);
    await limiter.check(userId);

    const blocked = await limiter.check(userId);
    expect(blocked.allowed).toBe(false);

    // Reset
    await limiter.reset(userId);

    // Should be allowed again
    const afterReset = await limiter.check(userId);
    expect(afterReset.allowed).toBe(true);
  });
});

// ============================================================================
// AUDIT LOGGING TESTS
// ============================================================================

describe('Audit Logging', () => {
  it('should log security events correctly', async () => {
    const { auditLog, getAuditLogs } = await import('@/lib/security/audit-log');

    const eventId = auditLog('user.login', {
      method: 'email',
    }, {
      userId: 'test-user',
      ipAddress: '127.0.0.1',
    });

    expect(eventId).toMatch(/^aud_/);

    const logsResult = await getAuditLogs({ userId: 'test-user' });
    expect(logsResult.logs.some((log: any) => log.id === eventId)).toBe(true);
  });

  it('should mark critical events correctly', async () => {
    const { auditLog, getAuditStats } = await import('@/lib/security/audit-log');

    auditLog('user.password_change', {}, { userId: 'test-user' });

    const stats = getAuditStats();
    expect(stats.bySeverity['critical']).toBeGreaterThan(0);
  });
});
