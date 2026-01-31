/**
 * OLYMPUS 2.0 - WIRE Agent Adapter for Stress Test
 *
 * Connects the stress test framework to the real WIRE agent via direct API calls.
 * Includes rate limiting to prevent API throttling.
 *
 * FIX 1.2 (Jan 31, 2026): Configuration externalized to wire.config.ts
 * - Removed hardcoded WIRE_CONFIG and RATE_LIMIT constants
 * - Now uses getWireConfig() for runtime-configurable settings
 * - Configuration can be overridden via environment variables
 * - See: src/lib/agents/config/wire.config.ts for all options
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { getRouter } from '../providers/router';
import { getWireConfig, type WireConfig } from '../config/wire.config';

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION (Externalized - FIX 1.2)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get the current WIRE configuration.
 * Configuration is loaded from environment variables with fallback to defaults.
 * See: src/lib/agents/config/wire.config.ts for full configuration options.
 */
function getConfig(): WireConfig {
  return getWireConfig();
}

// ════════════════════════════════════════════════════════════════════════════════
// RATE LIMITER CLASS (FIX A.3: Jan 31, 2026 - Commander Investigation)
// Replaces module-global state with class instance to prevent race conditions
// under concurrent load. Each instance maintains isolated state.
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Circuit breaker configuration interface.
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

/**
 * Rate limiter with integrated circuit breaker.
 * FIX A.3: Class-based to prevent race conditions from module-global state.
 *
 * @example
 * const limiter = new RateLimiter();
 * await limiter.waitForSlot();
 * try {
 *   const result = await apiCall();
 *   limiter.recordSuccess();
 * } catch (e) {
 *   limiter.recordFailure();
 *   throw e;
 * }
 */
export class RateLimiter {
  private lastRequestTime = 0;
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly config: CircuitBreakerConfig;
  private readonly instanceId: string;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 3,
      resetTimeoutMs: config?.resetTimeoutMs ?? 30000,
      halfOpenMaxAttempts: config?.halfOpenMaxAttempts ?? 1,
    };
    this.instanceId = Math.random().toString(36).substring(2, 8);
  }

  /**
   * Check if circuit breaker allows request.
   * @throws Error if circuit is OPEN and not ready for retry
   */
  private checkCircuitBreaker(): void {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now - this.lastFailure > this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log(`[CIRCUIT:${this.instanceId}] Transitioning to HALF_OPEN`);
      } else {
        const remainingMs = this.config.resetTimeoutMs - (now - this.lastFailure);
        throw new Error(
          `Circuit breaker OPEN - service unavailable. Retry in ${Math.ceil(remainingMs / 1000)}s`
        );
      }
    }
  }

  /**
   * Wait for rate limit slot and check circuit breaker.
   */
  async waitForSlot(): Promise<void> {
    this.checkCircuitBreaker();

    const wireConfig = getConfig();
    const minDelayMs = wireConfig.rateLimit.minDelayMs;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minDelayMs && this.lastRequestTime > 0) {
      const waitTime = minDelayMs - timeSinceLastRequest;
      if (wireConfig.debug) {
        console.log(`[RATE:${this.instanceId}] Waiting ${waitTime}ms...`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Record a successful request - resets circuit breaker.
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      console.log(`[CIRCUIT:${this.instanceId}] Success in HALF_OPEN - closing circuit`);
    }
    this.failures = 0;
    this.state = 'CLOSED';
  }

  /**
   * Record a failed request - may open circuit breaker.
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.error(
        `[CIRCUIT:${this.instanceId}] OPEN after ${this.failures} failures - ` +
          `blocking for ${this.config.resetTimeoutMs / 1000}s`
      );
    }
  }

  /**
   * Get current status for monitoring/debugging.
   */
  getStatus(): {
    instanceId: string;
    state: string;
    failures: number;
    canRequest: boolean;
    lastRequestTime: number;
  } {
    const now = Date.now();
    const canRequest = this.state !== 'OPEN' || now - this.lastFailure > this.config.resetTimeoutMs;

    return {
      instanceId: this.instanceId,
      state: this.state,
      failures: this.failures,
      canRequest,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Reset the rate limiter to initial state (for testing).
   */
  reset(): void {
    this.lastRequestTime = 0;
    this.failures = 0;
    this.lastFailure = 0;
    this.state = 'CLOSED';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT INSTANCE (backward compatibility)
// New code should create its own RateLimiter instance for isolation.
// ════════════════════════════════════════════════════════════════════════════════

const defaultRateLimiter = new RateLimiter();

/**
 * Get circuit breaker status (backward compatible).
 * @deprecated Use new RateLimiter().getStatus() for new code.
 */
export function getCircuitBreakerStatus(): {
  state: string;
  failures: number;
  canRequest: boolean;
} {
  const status = defaultRateLimiter.getStatus();
  return {
    state: status.state,
    failures: status.failures,
    canRequest: status.canRequest,
  };
}

// Legacy wrapper functions for backward compatibility
function recordSuccess(): void {
  defaultRateLimiter.recordSuccess();
}

function recordFailure(): void {
  defaultRateLimiter.recordFailure();
}

async function waitForRateLimit(): Promise<void> {
  await defaultRateLimiter.waitForSlot();
}

// ════════════════════════════════════════════════════════════════════════════════
// WIRE SYSTEM PROMPT (Simplified for stress test - focused on page generation)
// ════════════════════════════════════════════════════════════════════════════════

const WIRE_SYSTEM_PROMPT = `You are WIRE, a frontend code generation agent for OLYMPUS.

Your task is to generate complete, production-ready React/Next.js TypeScript code.

═══════════════════════════════════════════════════════════════════════════════
ANTI-STUB RULES (CRITICAL - ENFORCED BY VALIDATION)
═══════════════════════════════════════════════════════════════════════════════

You MUST generate complete, functional code. The following are FORBIDDEN and will cause validation failure:

❌ BANNED PATTERNS:
- // TODO comments
- Placeholder text or "Lorem ipsum"
- Empty function bodies: () => {}
- Components that return null
- Hardcoded hex colors (use theme tokens)
- Empty onClick handlers: onClick={() => {}}
- console.log-only handlers

✅ REQUIRED PATTERNS:
- Real data structures and mock data
- Actual event handlers with state changes
- Theme tokens for colors (bg-background, text-foreground, bg-primary, etc.)
- Complete loading states with Skeleton components
- Complete error states with retry buttons
- Complete empty states with CTAs

═══════════════════════════════════════════════════════════════════════════════
MINIMUM REQUIREMENTS BY PAGE TYPE
═══════════════════════════════════════════════════════════════════════════════

DASHBOARD (min 200 lines):
- Stats grid with at least 4 KPI cards showing real numbers
- At least one chart component (line, bar, or area)
- Activity feed or recent items list
- Loading skeletons that match content shape
- Error state with retry button
- Responsive grid: 4 cols → 2 cols → 1 col

LIST PAGE (min 150 lines):
- Search input with controlled state and filtering
- Data table or card grid with real items
- Empty state with call-to-action
- Pagination or load more
- Loading skeletons
- Error state with retry

KANBAN/BOARD (min 180 lines):
- At least 3 columns (Todo, In Progress, Done)
- Task cards with title, description, actions
- Add task functionality
- Delete task functionality
- Column task counts
- Loading and empty states

AUTH PAGE (min 100 lines):
- Form with controlled inputs
- Client-side validation
- Error message display
- Loading state on submit button
- Password visibility toggle (for login/signup)

SETTINGS PAGE (min 120 lines):
- Form sections for different settings
- Toggle switches for boolean settings
- Save button with loading state
- Success feedback (toast or message)
- Cancel/reset functionality

═══════════════════════════════════════════════════════════════════════════════
STATE HANDLING (MANDATORY FOR ALL PAGES)
═══════════════════════════════════════════════════════════════════════════════

Every page MUST implement these states:

1. LOADING STATE
   - Use Skeleton components that match content shape
   - Example: <Skeleton className="h-32 w-full" />

2. ERROR STATE
   - Show error message
   - Include retry button with onClick handler
   - Example: <Button onClick={() => refetch()}>Retry</Button>

3. EMPTY STATE (for lists)
   - Descriptive message
   - Call-to-action button
   - Example: <Button onClick={() => setIsCreateOpen(true)}>Create First Item</Button>

4. SUCCESS STATE
   - Toast notification for actions
   - Visual feedback for successful operations

═══════════════════════════════════════════════════════════════════════════════
RESPONSIVE DESIGN (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

Use Tailwind breakpoints consistently:
- sm:640px | md:768px | lg:1024px | xl:1280px

Grid patterns:
- Mobile: grid-cols-1
- Tablet: sm:grid-cols-2
- Desktop: lg:grid-cols-3 or lg:grid-cols-4

Navigation:
- Desktop: visible sidebar or navbar
- Mobile: hamburger menu or drawer

═══════════════════════════════════════════════════════════════════════════════
STYLING RULES
═══════════════════════════════════════════════════════════════════════════════

USE ONLY theme tokens:
- Backgrounds: bg-background, bg-card, bg-muted, bg-primary, bg-secondary
- Text: text-foreground, text-muted-foreground, text-primary
- Borders: border-border, border-input
- Accents: bg-accent, text-accent-foreground

NEVER use:
- Hardcoded colors: #7c3aed, rgb(124, 58, 237)
- Non-semantic utilities: bg-violet-600, text-gray-500

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return ONLY the TypeScript/React code.
- No markdown code blocks
- No explanations before or after
- No comments about what the code does
- Just the raw code starting with imports

The component should be a default export.
Include all necessary imports at the top.
Include mock data/state inline (don't import from external files).`;

// ════════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ════════════════════════════════════════════════════════════════════════════════

const anthropic = new Anthropic();

// ════════════════════════════════════════════════════════════════════════════════
// GENERATOR FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Router-based API call using fallback providers
 */
async function wireGeneratorDirect(prompt: string): Promise<string> {
  const startTime = Date.now();
  const config = getConfig();

  try {
    const router = getRouter();

    // Prepare AI request with system prompt
    const aiRequest = {
      messages: [
        { role: 'system' as const, content: WIRE_SYSTEM_PROMPT },
        { role: 'user' as const, content: prompt },
      ],
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };

    // Execute with router (handles provider selection and fallbacks automatically)
    const result = await router.execute('wire', aiRequest);

    if (!result.success || !result.response) {
      throw new Error('Router execution failed');
    }

    const code = result.response.content;
    const duration = Date.now() - startTime;

    if (config.debug) {
      console.log(`   [WIRE] Generated ${code.length} chars in ${duration}ms via router`);
    }

    // Clean up code - remove markdown code blocks if present
    // CIRCUIT BREAKER: Record success - resets failure count
    recordSuccess();
    return cleanCodeOutput(code);
  } catch (error) {
    // CIRCUIT BREAKER: Record failure - may open circuit after threshold
    recordFailure();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   [WIRE] Generation failed:`, errorMessage);
    throw error;
  }
}

/**
 * Clean markdown artifacts from generated code
 * HARDENED (FIX: WIRE Analysis Jan 31, 2026)
 * - Handles nested markdown blocks
 * - Handles multiple code fences
 * - Preserves internal code structure
 */
function cleanCodeOutput(code: string): string {
  let cleaned = code.trim();

  // Pattern 1: Full markdown wrapper (most common LLM output)
  // Matches: ```typescript\n...\n``` or ```tsx\n...\n```
  const fullBlockMatch = cleaned.match(
    /^```(?:typescript|tsx|javascript|jsx|ts|js)?\s*\n([\s\S]*?)\n```\s*$/i
  );
  if (fullBlockMatch) {
    cleaned = fullBlockMatch[1];
  } else {
    // Pattern 2: Opening fence at start (no closing or partial)
    cleaned = cleaned.replace(/^```(?:typescript|tsx|javascript|jsx|ts|js)?\s*\n?/i, '');

    // Pattern 3: Closing fence at end
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
  }

  // Pattern 4: Nested blocks - LLM sometimes wraps code in multiple layers
  // Check if result still starts with a code fence (nested case)
  let iterations = 0;
  const maxIterations = 3; // Prevent infinite loops
  while (
    iterations < maxIterations &&
    /^```(?:typescript|tsx|javascript|jsx|ts|js)?\s*\n/i.test(cleaned)
  ) {
    const nestedMatch = cleaned.match(
      /^```(?:typescript|tsx|javascript|jsx|ts|js)?\s*\n([\s\S]*?)\n```\s*$/i
    );
    if (nestedMatch) {
      cleaned = nestedMatch[1];
    } else {
      break;
    }
    iterations++;
  }

  // Pattern 5: Remove any markdown explanation text before actual code
  // LLM sometimes adds "Here's the code:" before the actual code
  const codeStartPatterns = [
    /^.*?(?:here'?s?\s+(?:the|your)\s+(?:code|component|implementation)[:\s]*)/i,
    /^.*?(?:below\s+is\s+(?:the|your)\s+(?:code|component)[:\s]*)/i,
  ];

  for (const pattern of codeStartPatterns) {
    if (pattern.test(cleaned) && cleaned.includes('import ')) {
      // Only strip if there's actual code after
      const importIndex = cleaned.indexOf('import ');
      if (importIndex > 0 && importIndex < 200) {
        cleaned = cleaned.substring(importIndex);
      }
    }
  }

  // Final trim
  return cleaned.trim();
}

/**
 * Rate-limited generator - the main export
 */
async function rateLimitedWireGenerator(prompt: string): Promise<string> {
  await waitForRateLimit();
  return wireGeneratorDirect(prompt);
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

// Default export: rate-limited generator
export const wireGenerator = rateLimitedWireGenerator;

// Named exports for specific use cases
export { wireGeneratorDirect, rateLimitedWireGenerator, cleanCodeOutput };

// Export system prompt for reference
export { WIRE_SYSTEM_PROMPT };

// Re-export config utilities from wire.config.ts
export { getWireConfig, type WireConfig } from '../config/wire.config';
