/**
 * VITO EXAMPLES
 *
 * This file is executable documentation.
 * Run with: npx tsx example.ts
 *
 * NOTE: These are aspirational API examples - the actual implementations
 * may differ. See the real exports in ./index.ts for current functionality.
 */

// Placeholder types for the desired API (not yet implemented)
interface Result {
  code: string;
  tokens: number;
  cost: number;
}
interface Options {
  context?: string;
}
interface BuildResult {
  files: Map<string, string>;
  review?: { score: number; issues: string[] };
  tests?: string;
}
interface BuildOptions {
  task: string;
  review?: boolean;
  test?: boolean;
}
interface ProOptions {
  maxRetries?: number;
  timeout?: number;
  onRequest?: (req: { id: string; task: string }) => void;
  onResponse?: (res: { id: string; latency: number; tokens: { output: number } }) => void;
  onError?: (err: { id: string; code: string; message: string }) => void;
  cache?: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl: number): Promise<void>;
  };
}

// Stub implementations (replace with real imports when available)
async function vito(_task: string, _context?: Options | string): Promise<Result> {
  throw new Error('Not implemented - see conductor/index.ts for actual API');
}
async function* vitoStream(_task: string): AsyncGenerator<string> {
  throw new Error('Not implemented');
}
async function vitoBuild(_options: BuildOptions): Promise<BuildResult> {
  throw new Error('Not implemented');
}
class VitoPro {
  constructor(_options: ProOptions) {}
  async build(_task: string): Promise<Result> {
    throw new Error('Not implemented');
  }
}

// ============================================================================
// SIMPLE - One line, get code
// ============================================================================

async function simple() {
  const result = await vito('Create a debounce function');

  console.log(result.code);
  // Output: TypeScript debounce implementation

  console.log(`Tokens: ${result.tokens}, Cost: $${result.cost.toFixed(4)}`);
}

// ============================================================================
// WITH CONTEXT - Provide existing code
// ============================================================================

async function withContext() {
  const existingCode = `
    interface User {
      id: string;
      email: string;
      createdAt: Date;
    }
  `;

  const result = await vito('Add a function to validate email format', { context: existingCode });

  console.log(result.code);
  // Output: validateEmail function that works with User interface
}

// ============================================================================
// STREAMING - Real-time output
// ============================================================================

async function streaming() {
  process.stdout.write('Generating: ');

  for await (const chunk of vitoStream('Create a React button component')) {
    process.stdout.write(chunk);
  }

  console.log('\nDone.');
}

// ============================================================================
// MULTI-FILE BUILD - With review and tests
// ============================================================================

async function multiBuild() {
  const result = await vitoBuild({
    task: 'Create a user authentication hook with login, logout, and session persistence',
    review: true,
    test: true,
  });

  // Generated code
  for (const [path, code] of result.files) {
    console.log(`\n--- ${path} ---`);
    console.log(code);
  }

  // Review results
  if (result.review) {
    console.log(`\nReview Score: ${result.review.score}/10`);
    result.review.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  // Generated tests
  if (result.tests) {
    console.log('\n--- Tests ---');
    console.log(result.tests);
  }
}

// ============================================================================
// PRODUCTION - With retries, caching, observability
// ============================================================================

async function production() {
  const vitoPro = new VitoPro({
    maxRetries: 3,
    timeout: 60000,

    // Observability hooks
    onRequest: req => {
      console.log(`[${req.id}] Starting: ${req.task.slice(0, 50)}...`);
    },
    onResponse: res => {
      console.log(`[${res.id}] Done in ${res.latency}ms, ${res.tokens.output} tokens`);
    },
    onError: err => {
      console.error(`[${err.id}] ${err.code}: ${err.message}`);
    },

    // Optional: Redis cache
    cache: {
      async get(key) {
        // return redis.get(key);
        return null;
      },
      async set(key, value, ttl) {
        // await redis.setex(key, ttl, value);
      },
    },
  });

  const result = await vitoPro.build('Create a rate limiter middleware for Express');

  console.log(result.code);
}

// ============================================================================
// RUN
// ============================================================================

const example = process.argv[2] || 'simple';

const examples: Record<string, () => Promise<void>> = {
  simple,
  context: withContext,
  stream: streaming,
  build: multiBuild,
  pro: production,
};

if (examples[example]) {
  examples[example]().catch(console.error);
} else {
  console.log('Available examples: simple, context, stream, build, pro');
}
