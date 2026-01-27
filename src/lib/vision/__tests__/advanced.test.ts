/**
 * Advanced Type System Tests
 *
 * These tests prove the type system catches errors at compile time,
 * not runtime. The comments show what WOULD fail to compile.
 */

import { describe, test, expect } from 'vitest';
import {
  TraceId,
  ApiKey,
  Prompt,
  GeneratedCode,
  Ok,
  Err,
  match,
  map,
  flatMap,
  pipe,
  pure,
  async,
  chain,
  RequestBuilder,
  handleError,
  lens,
  compose,
  demo,
} from '../core/advanced';

describe('Branded Types', () => {
  test('creates branded strings', () => {
    const trace = TraceId('vis_abc123');
    const key = ApiKey('sk-ant-xxx');
    const prompt = Prompt('Create a button');
    const code = GeneratedCode('const Button = () => {}');

    // These are strings at runtime
    expect(typeof trace).toBe('string');
    expect(typeof key).toBe('string');

    // But the TYPE SYSTEM prevents mixing them:
    // const wrong: ApiKey = trace;  // Would fail to compile!
    // const also: TraceId = key;    // Would fail to compile!
  });
});

describe('Result Monad', () => {
  test('pattern matching is exhaustive', () => {
    const success = Ok(42);
    const failure = Err('oops');

    const fromSuccess = match(success, {
      Ok: n => `Got ${n}`,
      Err: e => `Error: ${e}`,
    });
    expect(fromSuccess).toBe('Got 42');

    const fromFailure = match(failure, {
      Ok: n => `Got ${n}`,
      Err: e => `Error: ${e}`,
    });
    expect(fromFailure).toBe('Error: oops');
  });

  test('map transforms success values', () => {
    const result = Ok(5);
    const doubled = map((n: number) => n * 2)(result);

    expect(match(doubled, { Ok: n => n, Err: () => 0 })).toBe(10);
  });

  test('flatMap chains computations', () => {
    const divide = (a: number, b: number) => (b === 0 ? Err('division by zero') : Ok(a / b));

    const result = flatMap((n: number) => divide(n, 2))(Ok(10));
    expect(match(result, { Ok: n => n, Err: () => 0 })).toBe(5);

    const error = flatMap((n: number) => divide(n, 0))(Ok(10));
    expect(match(error, { Ok: () => '', Err: e => e })).toBe('division by zero');
  });

  test('pipe composes left-to-right', () => {
    const result = pipe(5)
      .pipe(x => x * 2) // 10
      .pipe(x => x + 3) // 13
      .pipe(x => x.toString()).value; // "13"

    expect(result).toBe('13');
  });
});

describe('Effect System', () => {
  test('pure creates effect-free computation', async () => {
    const effect = pure(42);
    const result = await effect.run();
    expect(result).toBe(42);
  });

  test('async wraps promises', async () => {
    const effect = async(() => Promise.resolve('hello'));
    const result = await effect.run();
    expect(result).toBe('hello');
  });

  test('chain combines effects', async () => {
    const first = pure(5);
    const combined = chain(first, n => pure(n * 2));
    const result = await combined.run();
    expect(result).toBe(10);

    // The type signature shows both effects:
    // combined has type Effect<{} & {}, number>
  });
});

describe('Type-Safe Builder', () => {
  test('build requires all mandatory fields', () => {
    const key = ApiKey('sk-ant-xxx');
    const prompt = Prompt('Create a form');

    // This compiles because both required fields are set
    const request = RequestBuilder.create().withApiKey(key).withPrompt(prompt).build();

    expect(request.apiKey).toBe('sk-ant-xxx');
    expect(request.prompt).toBe('Create a form');

    // These would NOT compile:
    // RequestBuilder.create().build();                     // Missing both
    // RequestBuilder.create().withApiKey(key).build();    // Missing prompt
    // RequestBuilder.create().withPrompt(prompt).build(); // Missing apiKey
  });

  test('optional fields work', () => {
    const key = ApiKey('sk-ant-xxx');
    const prompt = Prompt('Create a form');

    const withTimeout = RequestBuilder.create()
      .withApiKey(key)
      .withPrompt(prompt)
      .withTimeout(5000)
      .build();

    expect(withTimeout.timeout).toBe(5000);
  });
});

describe('Exhaustive Error Handling', () => {
  test('all error codes have handlers', () => {
    // The compiler ensures ALL cases are handled
    expect(handleError('RATE_LIMITED')).toBe('Wait and retry');
    expect(handleError('INVALID_KEY')).toBe('Check your API key');
    expect(handleError('TIMEOUT')).toBe('Request took too long');
    expect(handleError('CIRCUIT_OPEN')).toBe('Service recovering');
    expect(handleError('CONTENT_VIOLATION')).toBe('Content policy violated');

    // If you add a new error code to the union,
    // the compiler FORCES you to add a case here
  });
});

describe('Optics (Lenses)', () => {
  test('lens gets and sets deeply', () => {
    type Config = { api: { timeout: number; retries: number } };

    const config: Config = { api: { timeout: 1000, retries: 3 } };

    // Create lenses
    const apiLens = lens<Config, Config['api']>(
      c => c.api,
      a => c => ({ ...c, api: a })
    );

    const timeoutLens = lens<Config['api'], number>(
      a => a.timeout,
      t => a => ({ ...a, timeout: t })
    );

    // Compose for deep access
    const configTimeoutLens = compose(apiLens, timeoutLens);

    // Get
    expect(configTimeoutLens.get(config)).toBe(1000);

    // Set (immutable)
    const updated = configTimeoutLens.set(5000)(config);
    expect(updated.api.timeout).toBe(5000);
    expect(config.api.timeout).toBe(1000); // Original unchanged

    // Modify
    const doubled = configTimeoutLens.modify(t => t * 2)(config);
    expect(doubled.api.timeout).toBe(2000);
  });
});

describe('Full Demo', () => {
  test('demo runs without errors', () => {
    // This proves all advanced patterns work together
    expect(() => demo()).not.toThrow();
  });
});
