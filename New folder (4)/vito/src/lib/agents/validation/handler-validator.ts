/**
 * HANDLER REALITY VALIDATOR
 * Ensures event handlers perform real operations, not fake stubs
 *
 * FAKE handlers (will be flagged):
 * - () => {}
 * - () => console.log('clicked')
 * - () => { // TODO }
 * - () => alert('clicked')
 *
 * REAL handlers (will pass):
 * - () => setOpen(true)
 * - () => mutation.mutate(data)
 * - async () => { await api.delete(id); refetch(); }
 */

export interface HandlerAnalysis {
  name: string;
  location: string; // e.g., "onClick", "onSubmit"
  body: string;
  isReal: boolean;
  reason: string;
}

export interface HandlerValidationResult {
  valid: boolean;
  totalHandlers: number;
  realHandlers: number;
  fakeHandlers: number;
  score: number; // Percentage of real handlers
  analysis: HandlerAnalysis[];
  fakeHandlerDetails: HandlerAnalysis[];
}

/**
 * Patterns that indicate a FAKE handler
 */
const FAKE_HANDLER_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Empty handlers
  { pattern: /^\s*\(\s*\)\s*=>\s*\{\s*\}\s*$/gm, reason: 'Empty handler body' },
  { pattern: /^\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*$/gm, reason: 'Empty handler body' },

  // Console.log only
  { pattern: /^\s*\(\s*\)\s*=>\s*console\.(log|info|warn|debug)\([^)]*\)\s*;?\s*$/gm, reason: 'Only console.log' },
  { pattern: /^\s*\(\s*\)\s*=>\s*\{\s*console\.(log|info|warn|debug)\([^)]*\)\s*;?\s*\}\s*$/gm, reason: 'Only console.log in body' },

  // Alert only
  { pattern: /^\s*\(\s*\)\s*=>\s*alert\([^)]*\)\s*$/gm, reason: 'Only alert()' },
  { pattern: /^\s*\(\s*\)\s*=>\s*\{\s*alert\([^)]*\)\s*;?\s*\}\s*$/gm, reason: 'Only alert() in body' },

  // TODO/FIXME only
  { pattern: /^\s*\([^)]*\)\s*=>\s*\{\s*\/\/\s*(TODO|FIXME|HACK)[^}]*\}\s*$/gim, reason: 'Only contains TODO comment' },
  { pattern: /^\s*\([^)]*\)\s*=>\s*\{\s*\/\*[\s\S]*?(TODO|FIXME)[\s\S]*?\*\/\s*\}\s*$/gim, reason: 'Only contains TODO comment' },

  // Placeholder functions
  { pattern: /^\s*\(\s*\)\s*=>\s*\{\s*return\s*;\s*\}\s*$/gm, reason: 'Empty return' },
  { pattern: /^\s*\(\s*\)\s*=>\s*null\s*$/gm, reason: 'Returns null' },
  { pattern: /^\s*\(\s*\)\s*=>\s*undefined\s*$/gm, reason: 'Returns undefined' },

  // Pass/noop
  { pattern: /^\s*\(\s*\)\s*=>\s*\{\s*\/\/\s*pass\s*\}\s*$/gim, reason: 'Pass/noop comment' },
  { pattern: /^\s*\(\s*\)\s*=>\s*\{\s*\/\/\s*noop\s*\}\s*$/gim, reason: 'Pass/noop comment' },
];

/**
 * Patterns that indicate a REAL handler
 *
 * CRITICAL FIX (Jan 2026): Added patterns for:
 * - Custom handle* function calls (handleDeleteTask, handleSubmit, etc.)
 * - on* function calls (onClose, onSubmit, etc.)
 * - Callback function calls
 */
const REAL_HANDLER_PATTERNS: RegExp[] = [
  // State setters
  /set\w+\(/,
  /setState\(/,
  /dispatch\(/,

  // CRITICAL FIX: Custom handler function calls
  // e.g., handleDeleteTask(id), handleSubmit(data), handleClose()
  /handle\w+\(/,
  // e.g., onClose(), onSubmit(), onClick()
  /on[A-Z]\w*\(/,

  // Mutations/API calls
  /mutation\./,
  /mutate\(/,
  /mutateAsync\(/,
  /api\./,
  /fetch\(/,
  /axios\./,

  // Navigation
  /router\.(push|replace|back)/,
  /navigate\(/,
  /redirect\(/,

  // Form operations
  /handleSubmit/,
  /reset\(/,
  /setValue\(/,

  // Modal/Dialog control
  /setOpen\(/,
  /setIsOpen\(/,
  /setShow\(/,
  /setVisible\(/,
  /onOpenChange\(/,
  /close\(/,
  /open\(/,

  // Data operations
  /refetch\(/,
  /invalidate/,
  /remove\(/,
  /delete\(/,
  /update\(/,
  /create\(/,
  /add\(/,

  // Event handling
  /preventDefault\(/,
  /stopPropagation\(/,

  // Toast/notifications
  /toast\(/,
  /notify\(/,
  /showNotification\(/,
  /showToast\(/,

  // Async operations
  /await\s+/,
  /\.then\(/,

  // Try-catch
  /try\s*\{/,

  // CRITICAL FIX: Callback invocations
  // e.g., callback(), onComplete(), props.onClick()
  /callback\(/,
  /props\.\w+\(/,
];

/**
 * Extract all handlers from code
 */
function extractHandlers(code: string): Array<{ location: string; body: string; fullMatch: string }> {
  const handlers: Array<{ location: string; body: string; fullMatch: string }> = [];

  // Match inline handlers: onClick={() => { ... }} or onClick={() => expr}
  const inlinePattern = /(on[A-Z]\w*)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match;

  while ((match = inlinePattern.exec(code)) !== null) {
    const body = match[2].trim();
    // Only include arrow functions
    if (body.includes('=>')) {
      handlers.push({
        location: match[1],
        body: body,
        fullMatch: match[0],
      });
    }
  }

  // Match standalone handler definitions: const handleClick = () => { ... }
  const standalonePattern = /const\s+(handle\w+|on\w+)\s*=\s*((?:async\s+)?\([^)]*\)\s*=>\s*(?:\{[\s\S]*?\}|[^;\n]+))/g;

  while ((match = standalonePattern.exec(code)) !== null) {
    handlers.push({
      location: match[1],
      body: match[2],
      fullMatch: match[0],
    });
  }

  return handlers;
}

/**
 * Analyze if a handler is real or fake
 */
function analyzeHandler(handler: { location: string; body: string }): HandlerAnalysis {
  const { location, body } = handler;

  // Check for fake patterns first
  for (const { pattern, reason } of FAKE_HANDLER_PATTERNS) {
    // Create fresh regex to avoid state issues
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(body)) {
      return {
        name: location,
        location,
        body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
        isReal: false,
        reason,
      };
    }
  }

  // Check for real patterns
  for (const pattern of REAL_HANDLER_PATTERNS) {
    if (pattern.test(body)) {
      return {
        name: location,
        location,
        body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
        isReal: true,
        reason: 'Contains real operation',
      };
    }
  }

  // If handler has meaningful content but no recognized pattern
  const trimmedBody = body.replace(/\s/g, '');
  if (trimmedBody.length > 30) {
    return {
      name: location,
      location,
      body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
      isReal: true,
      reason: 'Has substantial body content',
    };
  }

  // Default to fake if short and unrecognized
  return {
    name: location,
    location,
    body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
    isReal: false,
    reason: 'Handler body too short/simple',
  };
}

/**
 * Validate all handlers in code
 */
export function validateHandlers(code: string): HandlerValidationResult {
  const handlers = extractHandlers(code);
  const analysis: HandlerAnalysis[] = [];

  for (const handler of handlers) {
    analysis.push(analyzeHandler(handler));
  }

  const realHandlers = analysis.filter(a => a.isReal);
  const fakeHandlers = analysis.filter(a => !a.isReal);

  const totalHandlers = analysis.length;
  const score = totalHandlers > 0
    ? Math.round((realHandlers.length / totalHandlers) * 100)
    : 100;

  // CRITICAL FIX: Zero tolerance for fake handlers
  // Previous threshold of 70% allowed 3 fake handlers out of 10 - UNACCEPTABLE
  // Frontend code must have 0 fake handlers to pass
  return {
    valid: fakeHandlers.length === 0,
    totalHandlers,
    realHandlers: realHandlers.length,
    fakeHandlers: fakeHandlers.length,
    score,
    analysis,
    fakeHandlerDetails: fakeHandlers,
  };
}

/**
 * Generate handler validation report
 */
export function generateHandlerReport(result: HandlerValidationResult): string {
  const lines: string[] = [
    '## Handler Reality Report',
    '',
    `**Total Handlers:** ${result.totalHandlers}`,
    `**Real Handlers:** ${result.realHandlers}`,
    `**Fake Handlers:** ${result.fakeHandlers}`,
    `**Score:** ${result.score}%`,
    `**Status:** ${result.valid ? 'PASS' : 'FAIL'}`,
    '',
  ];

  if (result.fakeHandlerDetails.length > 0) {
    lines.push('### Fake Handlers Detected');
    lines.push('');
    for (const fake of result.fakeHandlerDetails) {
      lines.push(`- **${fake.location}**: ${fake.reason}`);
      lines.push(`  \`${fake.body.substring(0, 50)}...\``);
    }
  }

  return lines.join('\n');
}
