import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withGuard } from '../api-guard';

// Helper to create a mock request
function mockRequest(
  options: {
    url?: string;
    headers?: Record<string, string>;
  } = {}
): Request {
  const headers = new Headers(options.headers ?? {});
  return new Request(options.url ?? 'http://localhost:3000/api/sentinel/test', {
    headers,
  });
}

describe('API Guard', () => {
  const originalEnv = process.env.SENTINEL_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SENTINEL_API_KEY;
    } else {
      process.env.SENTINEL_API_KEY = originalEnv;
    }
  });

  describe('authentication', () => {
    test('allows requests when no API key is configured', async () => {
      delete process.env.SENTINEL_API_KEY;

      const handler = withGuard(async () => NextResponse.json({ ok: true }));
      const res = await handler(mockRequest());
      const data = await res.json();

      expect(data.ok).toBe(true);
    });

    test('rejects requests without auth header when API key is set', async () => {
      process.env.SENTINEL_API_KEY = 'test-secret-key-123';

      const handler = withGuard(async () => NextResponse.json({ ok: true }));
      const res = await handler(mockRequest());

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('rejects requests with wrong token', async () => {
      process.env.SENTINEL_API_KEY = 'test-secret-key-123';

      const handler = withGuard(async () => NextResponse.json({ ok: true }));
      const res = await handler(
        mockRequest({
          headers: { authorization: 'Bearer wrong-token-value' },
        })
      );

      expect(res.status).toBe(401);
    });

    test('accepts requests with correct token', async () => {
      process.env.SENTINEL_API_KEY = 'test-secret-key-123';

      const handler = withGuard(async () => NextResponse.json({ ok: true }));
      const res = await handler(
        mockRequest({
          headers: { authorization: 'Bearer test-secret-key-123' },
        })
      );

      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    test('rejects non-Bearer auth schemes', async () => {
      process.env.SENTINEL_API_KEY = 'test-secret-key-123';

      const handler = withGuard(async () => NextResponse.json({ ok: true }));
      const res = await handler(
        mockRequest({
          headers: { authorization: 'Basic dGVzdDp0ZXN0' },
        })
      );

      expect(res.status).toBe(401);
    });
  });

  describe('rate limiting', () => {
    test('includes rate limit headers on successful response', async () => {
      delete process.env.SENTINEL_API_KEY;

      const handler = withGuard(async () => NextResponse.json({ ok: true }));
      const res = await handler(mockRequest());

      expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    test('returns 429 when rate limit is exceeded', async () => {
      delete process.env.SENTINEL_API_KEY;

      const handler = withGuard(async () => NextResponse.json({ ok: true }));

      // Use a unique IP per test to avoid cross-test pollution
      const uniqueIp = `rate-limit-test-${Date.now()}`;

      // Exhaust the bucket
      for (let i = 0; i < 30; i++) {
        await handler(mockRequest({ headers: { 'x-real-ip': uniqueIp } }));
      }

      // 31st request should be rate limited
      const res = await handler(mockRequest({ headers: { 'x-real-ip': uniqueIp } }));
      expect(res.status).toBe(429);

      const data = await res.json();
      expect(data.error).toBe('Rate limit exceeded');
      expect(res.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('handler execution', () => {
    test('passes request through to handler', async () => {
      delete process.env.SENTINEL_API_KEY;

      const handler = withGuard(async req => {
        const url = new URL(req.url);
        return NextResponse.json({ path: url.pathname });
      });

      const res = await handler(mockRequest({ url: 'http://localhost:3000/api/test' }));
      const data = await res.json();
      expect(data.path).toBe('/api/test');
    });
  });
});
