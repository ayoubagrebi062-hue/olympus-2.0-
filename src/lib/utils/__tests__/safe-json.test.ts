/**
 * Safe JSON Utilities - Unit Tests
 * =================================
 * Tests for safe JSON parsing and stringifying with fallbacks.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeJsonParse,
  safeJsonStringify,
  safeJsonStringifyPretty,
  safeJsonParseValidated,
  safeJsonParseFile,
} from '../safe-json';

describe('safeJsonParse', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('valid JSON', () => {
    it('should parse valid JSON object', () => {
      const result = safeJsonParse('{"name":"test"}', {}, 'test-context');
      expect(result).toEqual({ name: 'test' });
    });

    it('should parse valid JSON array', () => {
      const result = safeJsonParse('[1,2,3]', [], 'test-context');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should parse valid JSON string', () => {
      const result = safeJsonParse('"hello"', '', 'test-context');
      expect(result).toBe('hello');
    });

    it('should parse valid JSON number', () => {
      const result = safeJsonParse('42', 0, 'test-context');
      expect(result).toBe(42);
    });

    it('should parse valid JSON boolean', () => {
      const result = safeJsonParse('true', false, 'test-context');
      expect(result).toBe(true);
    });

    it('should parse valid JSON null', () => {
      const result = safeJsonParse('null', 'fallback', 'test-context');
      expect(result).toBeNull();
    });

    it('should parse nested objects', () => {
      const json = '{"user":{"name":"test","age":25},"active":true}';
      const result = safeJsonParse(json, {}, 'test-context');
      expect(result).toEqual({ user: { name: 'test', age: 25 }, active: true });
    });
  });

  describe('invalid/empty input', () => {
    it('should return fallback for null input', () => {
      const fallback = { default: true };
      const result = safeJsonParse(null, fallback, 'null-test');
      expect(result).toBe(fallback);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Empty content in null-test')
      );
    });

    it('should return fallback for undefined input', () => {
      const fallback = { default: true };
      const result = safeJsonParse(undefined, fallback, 'undefined-test');
      expect(result).toBe(fallback);
    });

    it('should return fallback for empty string', () => {
      const fallback = { default: true };
      const result = safeJsonParse('', fallback, 'empty-test');
      expect(result).toBe(fallback);
    });

    it('should return fallback for whitespace-only string', () => {
      const fallback = { default: true };
      const result = safeJsonParse('   ', fallback, 'whitespace-test');
      expect(result).toBe(fallback);
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJsonParse('{invalid}', fallback, 'invalid-test');
      expect(result).toBe(fallback);
      expect(console.error).toHaveBeenCalled();
    });

    it('should return fallback for truncated JSON', () => {
      const fallback: unknown[] = [];
      const result = safeJsonParse('{"name":', fallback, 'truncated-test');
      expect(result).toBe(fallback);
    });

    it('should log preview for long invalid content', () => {
      const longContent = '{' + 'x'.repeat(300) + '}';
      safeJsonParse(longContent, {}, 'long-content-test');
      // Second call should be the preview with ellipsis
      expect(console.error).toHaveBeenCalledTimes(2);
      const errorCalls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
      const previewCall = errorCalls.find(
        call => typeof call[0] === 'string' && call[0].includes('Content preview')
      );
      expect(previewCall).toBeDefined();
      expect(previewCall?.[0]).toContain('...');
    });

    it('should not truncate short content preview', () => {
      const shortContent = '{invalid}';
      safeJsonParse(shortContent, {}, 'short-content-test');
      // The preview should not have ellipsis for content < 200 chars
      const errorCalls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
      const previewCall = errorCalls.find(
        call => typeof call[0] === 'string' && call[0].includes('Content preview')
      );
      expect(previewCall).toBeDefined();
      // Short content should NOT have ellipsis
      expect(previewCall?.[0]).not.toContain('...');
    });
  });

  describe('type inference', () => {
    interface User {
      name: string;
      age: number;
    }

    it('should return typed object', () => {
      const result = safeJsonParse<User>(
        '{"name":"John","age":30}',
        { name: '', age: 0 },
        'typed-test'
      );
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });
  });
});

describe('safeJsonStringify', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('valid data', () => {
    it('should stringify object', () => {
      const result = safeJsonStringify({ name: 'test' });
      expect(result).toBe('{"name":"test"}');
    });

    it('should stringify array', () => {
      const result = safeJsonStringify([1, 2, 3]);
      expect(result).toBe('[1,2,3]');
    });

    it('should stringify string', () => {
      const result = safeJsonStringify('hello');
      expect(result).toBe('"hello"');
    });

    it('should stringify number', () => {
      const result = safeJsonStringify(42);
      expect(result).toBe('42');
    });

    it('should stringify boolean', () => {
      const result = safeJsonStringify(true);
      expect(result).toBe('true');
    });

    it('should stringify null', () => {
      const result = safeJsonStringify(null);
      expect(result).toBe('null');
    });
  });

  describe('invalid/circular data', () => {
    it('should return fallback for circular reference', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // Create circular reference

      const result = safeJsonStringify(obj, '{"error":true}', 'circular-test');
      expect(result).toBe('{"error":true}');
      expect(console.error).toHaveBeenCalled();
    });

    it('should use default fallback when not provided', () => {
      const obj: Record<string, unknown> = {};
      obj.self = obj;

      const result = safeJsonStringify(obj);
      expect(result).toBe('{}');
    });

    it('should return fallback for BigInt', () => {
      const data = { value: BigInt(9007199254740991) };
      const result = safeJsonStringify(data, '{"fallback":true}', 'bigint-test');
      expect(result).toBe('{"fallback":true}');
    });
  });
});

describe('safeJsonStringifyPretty', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should stringify with 2-space indentation', () => {
    const result = safeJsonStringifyPretty({ name: 'test', value: 42 });
    expect(result).toBe('{\n  "name": "test",\n  "value": 42\n}');
  });

  it('should stringify arrays with indentation', () => {
    const result = safeJsonStringifyPretty([1, 2, 3]);
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('should return fallback for circular reference', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj.self = obj;

    const result = safeJsonStringifyPretty(obj, '{"pretty":"fallback"}', 'pretty-circular');
    expect(result).toBe('{"pretty":"fallback"}');
    expect(console.error).toHaveBeenCalled();
  });

  it('should use default fallback', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;

    const result = safeJsonStringifyPretty(obj);
    expect(result).toBe('{}');
  });
});

describe('safeJsonParseValidated', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  interface User {
    name: string;
    age: number;
  }

  const isUser = (data: unknown): data is User => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'name' in data &&
      'age' in data &&
      typeof (data as User).name === 'string' &&
      typeof (data as User).age === 'number'
    );
  };

  describe('valid data with passing validation', () => {
    it('should return parsed data when validation passes', () => {
      const json = '{"name":"John","age":30}';
      const fallback: User = { name: 'default', age: 0 };

      const result = safeJsonParseValidated(json, isUser, fallback, 'user-test');
      expect(result).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('validation failures', () => {
    it('should return fallback when validation fails', () => {
      const json = '{"name":"John"}'; // Missing age
      const fallback: User = { name: 'default', age: 0 };

      const result = safeJsonParseValidated(json, isUser, fallback, 'invalid-user');
      expect(result).toBe(fallback);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
    });

    it('should return fallback for wrong types', () => {
      const json = '{"name":123,"age":"thirty"}'; // Wrong types
      const fallback: User = { name: 'default', age: 0 };

      const result = safeJsonParseValidated(json, isUser, fallback, 'wrong-types');
      expect(result).toBe(fallback);
    });

    it('should return fallback for empty input', () => {
      const fallback: User = { name: 'default', age: 0 };

      const result = safeJsonParseValidated(null, isUser, fallback, 'null-input');
      expect(result).toBe(fallback);
    });

    it('should return fallback for invalid JSON', () => {
      const fallback: User = { name: 'default', age: 0 };

      const result = safeJsonParseValidated('{invalid}', isUser, fallback, 'invalid-json');
      expect(result).toBe(fallback);
    });
  });

  describe('edge cases', () => {
    it('should work with array validator', () => {
      const isStringArray = (data: unknown): data is string[] => {
        return Array.isArray(data) && data.every(item => typeof item === 'string');
      };

      const fallbackStrings: string[] = [];
      const result = safeJsonParseValidated(
        '["a","b","c"]',
        isStringArray,
        fallbackStrings,
        'array-test'
      );
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should work with primitive validator', () => {
      const isPositiveNumber = (data: unknown): data is number => {
        return typeof data === 'number' && data > 0;
      };

      const result = safeJsonParseValidated('42', isPositiveNumber, 0, 'number-test');
      expect(result).toBe(42);
    });

    it('should reject with primitive validator when invalid', () => {
      const isPositiveNumber = (data: unknown): data is number => {
        return typeof data === 'number' && data > 0;
      };

      const result = safeJsonParseValidated('-5', isPositiveNumber, 1, 'negative-test');
      expect(result).toBe(1);
    });
  });
});

describe('safeJsonParseFile', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return fallback for non-existent file', async () => {
    const fallback = { default: true };
    const result = await safeJsonParseFile('/non/existent/file.json', fallback, 'missing-file');
    expect(result).toBe(fallback);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('File not found'));
  });

  it('should handle fs import failure gracefully', async () => {
    // Mock fs module to throw
    vi.doMock('fs', () => {
      throw new Error('Module not found');
    });

    const fallback = { default: true };
    const result = await safeJsonParseFile('/some/file.json', fallback, 'fs-error');
    expect(result).toBe(fallback);
  });
});

describe('integration scenarios', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle API response parsing', () => {
    interface ApiResponse {
      data: unknown[];
      meta: { total: number };
    }

    const isApiResponse = (data: unknown): data is ApiResponse => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as ApiResponse).data) &&
        'meta' in data
      );
    };

    const response = '{"data":[1,2,3],"meta":{"total":3}}';
    const fallback: ApiResponse = { data: [], meta: { total: 0 } };

    const result = safeJsonParseValidated(response, isApiResponse, fallback, 'api-test');
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.meta.total).toBe(3);
  });

  it('should handle config file parsing', () => {
    const configJson = '{"debug":true,"maxRetries":3,"endpoints":["a","b"]}';
    const config = safeJsonParse(configJson, {}, 'config');

    expect(config).toHaveProperty('debug', true);
    expect(config).toHaveProperty('maxRetries', 3);
  });

  it('should round-trip complex data', () => {
    const original = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      settings: { theme: 'dark', notifications: true },
      timestamp: 1234567890,
    };

    const stringified = safeJsonStringify(original, '', 'roundtrip');
    const parsed = safeJsonParse(stringified, {}, 'roundtrip');

    expect(parsed).toEqual(original);
  });
});
