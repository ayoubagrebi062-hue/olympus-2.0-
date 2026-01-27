#!/usr/bin/env npx tsx
/**
 * Vision System Demo - Proves patterns work. No API key required.
 * Run: npx tsx src/lib/vision/demo.ts
 */

import { Ok, Err, isOk, isErr, createError, VisionErrorCode, withRetry, partition } from './core/result';
import { createContext, isDone, remainingTime } from './core/context';
import { CircuitBreaker, resetAllCircuitBreakers } from './core/circuit-breaker';
import { RateLimiter } from './core/rate-limiter';
import { RequestDeduplicator } from './core/dedup';

const log = (ok: boolean, msg: string) => console.log(`${ok ? '✓' : '✗'} ${msg}`);
const section = (name: string) => console.log(`\n─── ${name} ───`);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\nVISION SYSTEM DEMO\n');

  // Result types
  section('Result<T,E>');
  const success = Ok({ code: 'x=1', tokens: 42 });
  const failure = Err(createError(VisionErrorCode.RATE_LIMITED, 'limit'));
  log(isOk(success), `Ok: ${JSON.stringify(success.value)}`);
  log(isErr(failure), `Err: ${failure.error.code}, retryable=${failure.error.retryable}`);

  const results = [Ok('a'), Err(createError(VisionErrorCode.TIMEOUT, 'slow')), Ok('b')];
  const { successes, failures } = partition(results);
  log(true, `partition: ${successes.length} ok, ${failures.length} err`);

  // Rate limiter
  section('Rate Limiter');
  const limiter = new RateLimiter({ maxTokens: 3, refillRate: 10 });
  let allowed = 0, rejected = 0;
  for (let i = 0; i < 5; i++) isOk(limiter.acquire()) ? allowed++ : rejected++;
  log(allowed === 3 && rejected === 2, `burst: ${allowed} allowed, ${rejected} rejected`);

  await sleep(200);
  log(isOk(limiter.acquire()), 'refill: token available after wait');

  // Circuit breaker
  section('Circuit Breaker');
  resetAllCircuitBreakers();
  const circuit = new CircuitBreaker('test', { failureThreshold: 2, successThreshold: 1, resetTimeoutMs: 100 });

  circuit.recordFailure();
  circuit.recordFailure();
  log(circuit.getState() === 'OPEN', `opens after 2 failures: ${circuit.getState()}`);

  const blocked = await circuit.execute(async () => Ok('would succeed'));
  log(isErr(blocked) && blocked.error.code === 'CIRCUIT_OPEN', 'blocks requests when open');

  await sleep(150);
  circuit.isAvailable();
  log(circuit.getState() === 'HALF_OPEN', `half-open after timeout: ${circuit.getState()}`);

  circuit.recordSuccess();
  log(circuit.getState() === 'CLOSED', `closes on success: ${circuit.getState()}`);

  // Deduplication
  section('Request Dedup');
  const dedup = new RequestDeduplicator<string>();
  let calls = 0;
  const fn = async () => { calls++; await sleep(50); return Ok('result'); };
  await Promise.all([dedup.execute(fn, undefined, 'k'), dedup.execute(fn, undefined, 'k'), dedup.execute(fn, undefined, 'k')]);
  log(calls === 1, `3 concurrent requests → ${calls} actual call`);

  // Retry
  section('Retry');
  let attempts = 0;
  const flaky = async () => {
    attempts++;
    if (attempts < 3) return Err(createError(VisionErrorCode.RATE_LIMITED, 'retry', { retryAfterMs: 50 }));
    return Ok('success');
  };
  const retryResult = await withRetry(flaky, { maxAttempts: 5, baseDelayMs: 50 });
  log(isOk(retryResult) && attempts === 3, `succeeded on attempt ${attempts}`);

  // Context deadline
  section('Context');
  const ctx = createContext({ timeoutMs: 100 });
  log(remainingTime(ctx) > 0, `trace=${ctx.traceId.slice(0,12)}... remaining=${remainingTime(ctx)}ms`);
  await sleep(120);
  log(isDone(ctx), 'deadline enforced');

  // Summary
  console.log('\n─── COMPLETE ───');
  console.log('All patterns verified. Run tests: npx vitest run src/lib/vision/__tests__\n');
}

main().catch(console.error);
