/**
 * OLYMPUS 3.0 - Mock Services for Failure Testing
 * ================================================
 */

import { vi } from 'vitest';

export function createMockNeo4j(config: { shouldFail: boolean } = { shouldFail: false }) {
  return {
    session: vi.fn(() => ({
      run: vi.fn(async (_query?: string, _params?: Record<string, unknown>) => {
        if (config.shouldFail) throw new Error('Neo4j connection failed');
        return { records: [] };
      }),
      close: vi.fn(),
    })),
  };
}

export function createMockRedis(config: { shouldFail: boolean } = { shouldFail: false }) {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => {
      if (config.shouldFail) throw new Error('Redis connection refused');
      return store.get(key) || null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      if (config.shouldFail) throw new Error('Redis connection refused');
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async () => {
      if (config.shouldFail) throw new Error('Redis connection refused');
      return 1;
    }),
  };
}

export function createMockQdrant(config: { shouldFail: boolean } = { shouldFail: false }) {
  return {
    search: vi.fn(async () => {
      if (config.shouldFail) throw new Error('Qdrant unavailable');
      return [];
    }),
    upsert: vi.fn(async () => {
      if (config.shouldFail) throw new Error('Qdrant unavailable');
      return { status: 'completed' };
    }),
  };
}

export function createMockMongoDB(config: { shouldFail: boolean } = { shouldFail: false }) {
  const collections = new Map<string, unknown[]>();
  return {
    collection: vi.fn((name: string) => ({
      findOne: vi.fn(async () => {
        if (config.shouldFail) throw new Error('MongoDB connection lost');
        return null;
      }),
      insertOne: vi.fn(async () => {
        if (config.shouldFail) throw new Error('MongoDB connection lost');
        return { insertedId: 'mock-id' };
      }),
      updateOne: vi.fn(async () => {
        if (config.shouldFail) throw new Error('MongoDB connection lost');
        return { modifiedCount: 1 };
      }),
    })),
  };
}

export function createMockAIProvider(config: {
  shouldFail: boolean;
  failureType?: 'timeout' | 'malformed' | 'error' | 'rate_limit';
} = { shouldFail: false }) {
  return {
    complete: vi.fn(async (prompt: string) => {
      if (config.shouldFail) {
        switch (config.failureType) {
          case 'malformed':
            return 'aslkdjf not valid code }{][';
          case 'timeout':
            await new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timed out')), 100)
            );
            break;
          case 'rate_limit':
            throw new Error('Rate limit exceeded. Try again in 60 seconds.');
          default:
            throw new Error('AI provider error');
        }
      }
      return `export function Component() { return <div>Hello</div>; }`;
    }),
    chat: vi.fn(async () => {
      if (config.shouldFail) throw new Error('Chat failed');
      return { message: 'Hello!' };
    }),
  };
}

export function createMockSupabase(config: { shouldFail: boolean } = { shouldFail: false }) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => {
            if (config.shouldFail) return { data: null, error: new Error('Supabase error') };
            return { data: { id: '1' }, error: null };
          }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            if (config.shouldFail) return { data: null, error: new Error('Insert failed') };
            return { data: { id: '1' }, error: null };
          }),
        })),
      })),
    })),
  };
}
