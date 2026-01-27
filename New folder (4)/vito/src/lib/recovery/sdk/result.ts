/**
 * Result Type - Rust-inspired error handling for TypeScript
 *
 * Instead of throwing exceptions, return typed results.
 * This makes error handling explicit and type-safe.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, 'DIVISION_BY_ZERO'> {
 *   if (b === 0) return Err('DIVISION_BY_ZERO');
 *   return Ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log(result.value); // 5
 * } else {
 *   console.log(result.error); // Type: 'DIVISION_BY_ZERO'
 * }
 * ```
 */

// ============================================================================
// CORE RESULT TYPE
// ============================================================================

/**
 * A discriminated union representing either success (Ok) or failure (Err).
 * The `ok` property serves as the discriminant.
 */
export type Result<T, E> = OkResult<T> | ErrResult<E>;

/**
 * Represents a successful result containing a value.
 */
export interface OkResult<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Represents a failed result containing an error.
 */
export interface ErrResult<E> {
  readonly ok: false;
  readonly error: E;
}

// ============================================================================
// CONSTRUCTORS
// ============================================================================

/**
 * Creates a successful Result containing the given value.
 *
 * @param value - The success value
 * @returns An OkResult containing the value
 *
 * @example
 * ```typescript
 * const result = Ok(42);
 * // result.ok === true
 * // result.value === 42
 * ```
 */
export function Ok<T>(value: T): OkResult<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result containing the given error.
 *
 * @param error - The error value
 * @returns An ErrResult containing the error
 *
 * @example
 * ```typescript
 * const result = Err('NOT_FOUND');
 * // result.ok === false
 * // result.error === 'NOT_FOUND'
 * ```
 */
export function Err<E>(error: E): ErrResult<E> {
  return { ok: false, error };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard that narrows a Result to OkResult.
 *
 * @param result - The result to check
 * @returns true if the result is Ok, false otherwise
 *
 * @example
 * ```typescript
 * const result = fetchUser(id);
 * if (isOk(result)) {
 *   // TypeScript knows result.value exists here
 *   console.log(result.value.name);
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is OkResult<T> {
  return result.ok === true;
}

/**
 * Type guard that narrows a Result to ErrResult.
 *
 * @param result - The result to check
 * @returns true if the result is Err, false otherwise
 */
export function isErr<T, E>(result: Result<T, E>): result is ErrResult<E> {
  return result.ok === false;
}

// ============================================================================
// COMBINATORS
// ============================================================================

/**
 * Transforms the value inside an Ok result.
 * If the result is Err, returns the error unchanged.
 *
 * @param result - The result to transform
 * @param fn - The transformation function
 * @returns A new Result with the transformed value
 *
 * @example
 * ```typescript
 * const result = Ok(5);
 * const doubled = map(result, x => x * 2);
 * // doubled.value === 10
 * ```
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return Ok(fn(result.value));
  }
  return result;
}

/**
 * Transforms the error inside an Err result.
 * If the result is Ok, returns the value unchanged.
 *
 * @param result - The result to transform
 * @param fn - The transformation function
 * @returns A new Result with the transformed error
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return Err(fn(result.error));
  }
  return result;
}

/**
 * Chains Result-returning functions together.
 * If the result is Ok, applies fn to the value.
 * If the result is Err, returns the error unchanged.
 *
 * @param result - The result to chain
 * @param fn - A function that returns a Result
 * @returns The result of applying fn, or the original error
 *
 * @example
 * ```typescript
 * const parseNumber = (s: string): Result<number, 'PARSE_ERROR'> => {
 *   const n = parseInt(s);
 *   return isNaN(n) ? Err('PARSE_ERROR') : Ok(n);
 * };
 *
 * const result = flatMap(Ok('42'), parseNumber);
 * // result.value === 42
 * ```
 */
export function flatMap<T, U, E, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>
): Result<U, E | F> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Extracts the value from a Result, or returns a default.
 *
 * @param result - The result to unwrap
 * @param defaultValue - The value to return if result is Err
 * @returns The value if Ok, otherwise defaultValue
 *
 * @example
 * ```typescript
 * const result = Err('NOT_FOUND');
 * const value = unwrapOr(result, 0); // 0
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Extracts the value from a Result, or computes a default.
 *
 * @param result - The result to unwrap
 * @param fn - A function that computes the default from the error
 * @returns The value if Ok, otherwise fn(error)
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result.error);
}

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

/**
 * Wraps a Promise in a Result, catching any thrown errors.
 *
 * @param promise - The promise to wrap
 * @returns A Promise that resolves to a Result
 *
 * @example
 * ```typescript
 * const result = await fromPromise(fetch('/api/data'));
 * if (isOk(result)) {
 *   console.log(result.value);
 * } else {
 *   console.error('Fetch failed:', result.error);
 * }
 * ```
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Wraps a synchronous function in a Result, catching any thrown errors.
 *
 * @param fn - The function to wrap
 * @returns A Result containing the return value or the caught error
 *
 * @example
 * ```typescript
 * const result = fromTry(() => JSON.parse(maybeJson));
 * if (isOk(result)) {
 *   console.log(result.value);
 * }
 * ```
 */
export function fromTry<T>(fn: () => T): Result<T, Error> {
  try {
    return Ok(fn());
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// COLLECTION UTILITIES
// ============================================================================

/**
 * Converts an array of Results into a Result of an array.
 * If any Result is Err, returns the first error.
 * If all are Ok, returns an array of all values.
 *
 * @param results - Array of Results
 * @returns Result containing array of values, or first error
 *
 * @example
 * ```typescript
 * const results = [Ok(1), Ok(2), Ok(3)];
 * const combined = all(results);
 * // combined.value === [1, 2, 3]
 * ```
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }

  return Ok(values);
}

/**
 * Returns the first Ok result, or an array of all errors.
 *
 * @param results - Array of Results
 * @returns First Ok result, or Err with all errors
 */
export function any<T, E>(results: Result<T, E>[]): Result<T, E[]> {
  const errors: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      return result;
    }
    errors.push(result.error);
  }

  return Err(errors);
}
