/**
 * OLYMPUS 3.0 - Infrastructure Failure Mode Tests
 * ================================================
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createMockNeo4j,
  createMockRedis,
  createMockQdrant,
  createMockMongoDB,
} from './helpers/mock-services';
import { createCircuitBreaker } from './helpers/chaos-utils';

describe('Infrastructure Failure Modes', () => {

  describe('Neo4j', () => {
    it('handles connection loss', async () => {
      const mockNeo4j = createMockNeo4j({ shouldFail: true });
      const session = mockNeo4j.session();

      await expect(session.run('MATCH (n) RETURN n'))
        .rejects.toThrow('Neo4j connection failed');
    });

    it('recovers after service restoration', async () => {
      let shouldFail = true;
      const mockNeo4j = {
        session: () => ({
          run: vi.fn(async () => {
            if (shouldFail) throw new Error('Failed');
            return { records: [] };
          }),
          close: vi.fn(),
        }),
      };

      // First call fails
      await expect(mockNeo4j.session().run()).rejects.toThrow();

      // Service restored
      shouldFail = false;

      // Second call succeeds
      const result = await mockNeo4j.session().run();
      expect(result.records).toBeDefined();
    });
  });

  describe('Redis', () => {
    it('handles connection refused', async () => {
      const mockRedis = createMockRedis({ shouldFail: true });

      await expect(mockRedis.get('key'))
        .rejects.toThrow('Redis connection refused');
    });

    it('handles set failure', async () => {
      const mockRedis = createMockRedis({ shouldFail: true });

      await expect(mockRedis.set('key', 'value'))
        .rejects.toThrow('Redis connection refused');
    });

    it('works normally when healthy', async () => {
      const mockRedis = createMockRedis({ shouldFail: false });

      await mockRedis.set('key', 'value');
      const result = await mockRedis.get('key');
      expect(result).toBe('value');
    });
  });

  describe('Qdrant', () => {
    it('handles unavailability', async () => {
      const mockQdrant = createMockQdrant({ shouldFail: true });

      await expect(mockQdrant.search())
        .rejects.toThrow('Qdrant unavailable');
    });

    it('handles upsert failure', async () => {
      const mockQdrant = createMockQdrant({ shouldFail: true });

      await expect(mockQdrant.upsert())
        .rejects.toThrow('Qdrant unavailable');
    });
  });

  describe('MongoDB', () => {
    it('handles connection loss', async () => {
      const mockMongo = createMockMongoDB({ shouldFail: true });
      const collection = mockMongo.collection('test');

      await expect(collection.findOne())
        .rejects.toThrow('MongoDB connection lost');
    });

    it('handles insert failure', async () => {
      const mockMongo = createMockMongoDB({ shouldFail: true });
      const collection = mockMongo.collection('test');

      await expect(collection.insertOne())
        .rejects.toThrow('MongoDB connection lost');
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('opens after threshold failures', async () => {
      const breaker = createCircuitBreaker(3, 1000);
      const failingFn = async () => { throw new Error('fail'); };

      // First 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow('fail');
      }

      // Circuit should now be open
      expect(breaker.getState()).toBe('open');

      // Next call should fail immediately
      await expect(breaker.execute(failingFn))
        .rejects.toThrow('Circuit breaker is open');
    });

    it('resets after successful call in half-open state', async () => {
      const breaker = createCircuitBreaker(2, 10); // 10ms reset timeout
      const failingFn = async () => { throw new Error('fail'); };
      const successFn = async () => 'success';

      // Fail twice to open circuit
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await expect(breaker.execute(failingFn)).rejects.toThrow();

      expect(breaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 15));

      // Next call should succeed and close circuit
      const result = await breaker.execute(successFn);
      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
    });
  });
});
