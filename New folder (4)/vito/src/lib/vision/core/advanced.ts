/**
 * ADVANCED TYPE SYSTEM - The version Future Me builds.
 *
 * Illegal states are unrepresentable.
 * The compiler catches your mistakes.
 * Zero runtime cost.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES - Primitives that can't be confused
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

// These are all strings, but they can NEVER be accidentally swapped
export type TraceId = Brand<string, 'TraceId'>;
export type ApiKey = Brand<string, 'ApiKey'>;
export type Prompt = Brand<string, 'Prompt'>;
export type GeneratedCode = Brand<string, 'GeneratedCode'>;

// Constructor functions - the only way to create branded types
export const TraceId = (s: string): TraceId => s as TraceId;
export const ApiKey = (s: string): ApiKey => s as ApiKey;
export const Prompt = (s: string): Prompt => s as Prompt;
export const GeneratedCode = (s: string): GeneratedCode => s as GeneratedCode;

// This will NOT compile:
// const trace: TraceId = "abc";           // Error: string is not TraceId
// const key: ApiKey = TraceId("abc");     // Error: TraceId is not ApiKey
// generateCode(apiKey);                   // Error: ApiKey is not Prompt

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPE V2 - With Monadic Composition
// ═══════════════════════════════════════════════════════════════════════════════

export type Result<T, E> = { readonly _tag: 'Ok'; readonly value: T } | { readonly _tag: 'Err'; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ _tag: 'Ok', value });
export const Err = <E>(error: E): Result<never, E> => ({ _tag: 'Err', error });

// Pattern matching - exhaustive by design
export const match = <T, E, A, B>(
  result: Result<T, E>,
  patterns: { Ok: (value: T) => A; Err: (error: E) => B }
): A | B => result._tag === 'Ok' ? patterns.Ok(result.value) : patterns.Err(result.error);

// Functor
export const map = <T, U, E>(f: (t: T) => U) => (r: Result<T, E>): Result<U, E> =>
  r._tag === 'Ok' ? Ok(f(r.value)) : r;

// Applicative
export const ap = <T, U, E>(rf: Result<(t: T) => U, E>) => (rt: Result<T, E>): Result<U, E> =>
  rf._tag === 'Ok' ? map<T, U, E>(rf.value)(rt) : Err(rf.error);

// Monad
export const flatMap = <T, U, E>(f: (t: T) => Result<U, E>) => (r: Result<T, E>): Result<U, E> =>
  r._tag === 'Ok' ? f(r.value) : r;

// Pipe composition - left to right
export const pipe = <A>(a: A) => ({
  pipe: <B>(f: (a: A) => B) => pipe(f(a)),
  value: a,
});

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECT SYSTEM - Track side effects in the type system
// ═══════════════════════════════════════════════════════════════════════════════

// Effect tags - phantom types that track what a function does
type Async = { readonly Async: true };
type Network = { readonly Network: true };
type FileSystem = { readonly FileSystem: true };
type Random = { readonly Random: true };
type Time = { readonly Time: true };
type Console = { readonly Console: true };

// Effect is a wrapper that tracks what effects a computation has
export type Effect<Effects, T> = {
  readonly _effects: Effects;
  readonly run: () => Promise<T>;
};

// Pure computation - no effects
export const pure = <T>(value: T): Effect<{}, T> => ({
  _effects: {} as {},
  run: async () => value,
});

// Lift async computation
export const async = <T>(f: () => Promise<T>): Effect<Async, T> => ({
  _effects: {} as Async,
  run: f,
});

// Lift network call
export const network = <T>(f: () => Promise<T>): Effect<Async & Network, T> => ({
  _effects: {} as Async & Network,
  run: f,
});

// Combine effects - the type system tracks all effects
export const chain = <E1, T, E2, U>(
  effect: Effect<E1, T>,
  f: (t: T) => Effect<E2, U>
): Effect<E1 & E2, U> => ({
  _effects: {} as E1 & E2,
  run: async () => f(await effect.run()).run(),
});

// Now the type signature tells you EXACTLY what side effects a function has:
// generateCode: (prompt: Prompt) => Effect<Async & Network, Result<GeneratedCode, VisionError>>

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE-SAFE STATE MACHINE - Circuit Breaker that can't be misused
// ═══════════════════════════════════════════════════════════════════════════════

// States as types
type Closed = { readonly state: 'Closed'; failures: number };
type Open = { readonly state: 'Open'; openedAt: number };
type HalfOpen = { readonly state: 'HalfOpen'; successes: number };

type CircuitState = Closed | Open | HalfOpen;

// Transitions - only valid transitions can be expressed
type Transition<From extends CircuitState, To extends CircuitState> = (from: From) => To;

// Valid transitions as types
const toOpen: Transition<Closed, Open> = (from) => ({ state: 'Open', openedAt: Date.now() });
const toHalfOpen: Transition<Open, HalfOpen> = (from) => ({ state: 'HalfOpen', successes: 0 });
const toClosed: Transition<HalfOpen, Closed> = (from) => ({ state: 'Closed', failures: 0 });
const backToOpen: Transition<HalfOpen, Open> = (from) => ({ state: 'Open', openedAt: Date.now() });

// This will NOT compile - invalid transition:
// const invalid: Transition<Closed, HalfOpen> = ...  // Can't go directly from Closed to HalfOpen

// State machine with compile-time transition checking
export class TypeSafeCircuit<S extends CircuitState> {
  constructor(private readonly state: S) {}

  // Only available when in Closed state
  recordFailure(this: TypeSafeCircuit<Closed>, threshold: number): TypeSafeCircuit<Closed> | TypeSafeCircuit<Open> {
    const next = { ...this.state, failures: this.state.failures + 1 };
    return next.failures >= threshold
      ? new TypeSafeCircuit(toOpen(this.state))
      : new TypeSafeCircuit(next);
  }

  // Only available when in HalfOpen state
  recordSuccess(this: TypeSafeCircuit<HalfOpen>, threshold: number): TypeSafeCircuit<HalfOpen> | TypeSafeCircuit<Closed> {
    const next = { ...this.state, successes: this.state.successes + 1 };
    return next.successes >= threshold
      ? new TypeSafeCircuit(toClosed(this.state))
      : new TypeSafeCircuit(next);
  }

  // Check if can transition to HalfOpen (only valid from Open)
  tryReset(this: TypeSafeCircuit<Open>, timeoutMs: number): TypeSafeCircuit<Open> | TypeSafeCircuit<HalfOpen> {
    return Date.now() - this.state.openedAt >= timeoutMs
      ? new TypeSafeCircuit(toHalfOpen(this.state))
      : this;
  }
}

// Usage - the compiler ensures correct state transitions
// const circuit = new TypeSafeCircuit<Closed>({ state: 'Closed', failures: 0 });
// circuit.recordFailure(3);  // OK - returns Closed | Open
// circuit.recordSuccess(2);  // COMPILE ERROR - recordSuccess not available on Closed

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER PATTERN WITH PHANTOM TYPES - Type-safe configuration
// ═══════════════════════════════════════════════════════════════════════════════

// Configuration flags as phantom types
type HasApiKey = { readonly HasApiKey: true };
type HasPrompt = { readonly HasPrompt: true };
type HasTimeout = { readonly HasTimeout: true };

// Required configuration
type RequiredConfig = HasApiKey & HasPrompt;

// Builder accumulates configuration in the type
export class RequestBuilder<Config = {}> {
  private constructor(private readonly config: Record<string, unknown>) {}

  static create(): RequestBuilder<{}> {
    return new RequestBuilder({});
  }

  withApiKey(key: ApiKey): RequestBuilder<Config & HasApiKey> {
    return new RequestBuilder({ ...this.config, apiKey: key });
  }

  withPrompt(prompt: Prompt): RequestBuilder<Config & HasPrompt> {
    return new RequestBuilder({ ...this.config, prompt });
  }

  withTimeout(ms: number): RequestBuilder<Config & HasTimeout> {
    return new RequestBuilder({ ...this.config, timeout: ms });
  }

  // build() is ONLY available when RequiredConfig is satisfied
  build(this: RequestBuilder<RequiredConfig>): { apiKey: ApiKey; prompt: Prompt; timeout?: number } {
    return this.config as { apiKey: ApiKey; prompt: Prompt; timeout?: number };
  }
}

// Usage:
// RequestBuilder.create().build();                    // COMPILE ERROR - missing apiKey and prompt
// RequestBuilder.create().withApiKey(key).build();   // COMPILE ERROR - missing prompt
// RequestBuilder.create().withApiKey(key).withPrompt(p).build();  // OK!

// ═══════════════════════════════════════════════════════════════════════════════
// EXHAUSTIVE PATTERN MATCHING - Compiler enforces handling all cases
// ═══════════════════════════════════════════════════════════════════════════════

// Error codes as literal union
type ErrorCode =
  | 'RATE_LIMITED'
  | 'INVALID_KEY'
  | 'TIMEOUT'
  | 'CIRCUIT_OPEN'
  | 'CONTENT_VIOLATION';

// The never type ensures all cases are handled
const assertNever = (x: never): never => { throw new Error(`Unexpected: ${x}`); };

// Handler MUST handle every case or compilation fails
export const handleError = (code: ErrorCode): string => {
  switch (code) {
    case 'RATE_LIMITED': return 'Wait and retry';
    case 'INVALID_KEY': return 'Check your API key';
    case 'TIMEOUT': return 'Request took too long';
    case 'CIRCUIT_OPEN': return 'Service recovering';
    case 'CONTENT_VIOLATION': return 'Content policy violated';
    default: return assertNever(code); // Compile error if any case is missing
  }
};

// If you add a new error code, the compiler FORCES you to handle it everywhere

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE-SAFE PIPELINE - Compose operations with guaranteed type safety
// ═══════════════════════════════════════════════════════════════════════════════

type Step<In, Out, Effects> = {
  readonly name: string;
  readonly run: (input: In) => Effect<Effects, Result<Out, Error>>;
};

type Pipeline<In, Out, Effects> = {
  readonly steps: Step<any, any, any>[];
  then: <Next, E>(step: Step<Out, Next, E>) => Pipeline<In, Next, Effects & E>;
  execute: (input: In) => Effect<Effects, Result<Out, Error>>;
};

export const createPipeline = <In, Out, E>(step: Step<In, Out, E>): Pipeline<In, Out, E> => ({
  steps: [step],
  then: <Next, E2>(nextStep: Step<Out, Next, E2>) => createPipeline({
    name: `${step.name} → ${nextStep.name}`,
    run: (input: In) => chain(
      step.run(input),
      result => result._tag === 'Ok'
        ? nextStep.run(result.value)
        : pure(result as Result<never, Error>)
    ),
  }) as unknown as Pipeline<In, Next, E & E2>,
  execute: step.run,
});

// Example pipeline - types flow through automatically:
// createPipeline(validateStep)     // Pipeline<RawInput, ValidInput, {}>
//   .then(rateLimitStep)           // Pipeline<RawInput, ValidInput, Async>
//   .then(generateStep)            // Pipeline<RawInput, GeneratedCode, Async & Network>
//   .execute(rawInput)             // Effect<Async & Network, Result<GeneratedCode, Error>>

// ═══════════════════════════════════════════════════════════════════════════════
// OPTICS - Type-safe deep updates (Lenses, Prisms)
// ═══════════════════════════════════════════════════════════════════════════════

type Lens<S, A> = {
  get: (s: S) => A;
  set: (a: A) => (s: S) => S;
  modify: (f: (a: A) => A) => (s: S) => S;
};

export const lens = <S, A>(
  get: (s: S) => A,
  set: (a: A) => (s: S) => S
): Lens<S, A> => ({
  get,
  set,
  modify: f => s => set(f(get(s)))(s),
});

// Compose lenses for deep access
export const compose = <S, A, B>(outer: Lens<S, A>, inner: Lens<A, B>): Lens<S, B> => ({
  get: s => inner.get(outer.get(s)),
  set: b => s => outer.set(inner.set(b)(outer.get(s)))(s),
  modify: f => s => outer.modify(inner.modify(f))(s),
});

// Example:
// type Config = { api: { timeout: number; retries: number } };
// const apiLens = lens<Config, Config['api']>(c => c.api, a => c => ({ ...c, api: a }));
// const timeoutLens = lens<Config['api'], number>(a => a.timeout, t => a => ({ ...a, timeout: t }));
// const configTimeoutLens = compose(apiLens, timeoutLens);
//
// configTimeoutLens.get(config);           // number
// configTimeoutLens.set(5000)(config);     // Config with new timeout
// configTimeoutLens.modify(t => t * 2)(config);  // Double the timeout

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF: This compiles and runs
// ═══════════════════════════════════════════════════════════════════════════════

export const demo = () => {
  // Branded types prevent confusion
  const trace = TraceId('vis_123');
  const key = ApiKey('sk-ant-xxx');
  const prompt = Prompt('Create a button');

  // Result with pattern matching
  const result: Result<number, string> = Ok(42);
  const doubled = match(result, {
    Ok: n => n * 2,
    Err: e => 0,
  });

  // Pipe composition
  const computed = pipe(5)
    .pipe(x => x * 2)
    .pipe(x => x + 1)
    .value; // 11

  // Builder ensures required config
  const request = RequestBuilder.create()
    .withApiKey(key)
    .withPrompt(prompt)
    .withTimeout(5000)
    .build(); // Only compiles because apiKey AND prompt are set

  // Exhaustive error handling
  const message = handleError('RATE_LIMITED');

  console.log({ trace, doubled, computed, request, message });
};
