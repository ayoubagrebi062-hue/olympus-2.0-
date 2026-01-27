// Compile-Time Invariant Enforcement Pass
// Purpose: Fail build on negative invariant violation
// Surface: Static analysis (no runtime execution)

import {
  SystemState,
  Action,
  ExecutionContext,
  EvaluationResult,
  evaluateNegativeInvariants,
  formatViolation,
  createSystemState,
  createAction,
  createContext
} from './negative-invariant-gate';

interface CompilePassInput {
  readonly stateDeclarations: readonly Partial<SystemState>[];
  readonly actionDeclarations: readonly Partial<Action>[];
}

interface CompilePassResult {
  readonly passed: boolean;
  readonly failedAt: string | null;
  readonly output: string | null;
}

// Parse state declarations from source without execution
function extractStateDeclarations(sourceFiles: readonly string[]): Partial<SystemState>[] {
  const declarations: Partial<SystemState>[] = [];

  for (const source of sourceFiles) {
    // Extract createSystemState calls
    const statePattern = /createSystemState\s*\(\s*(\{[\s\S]*?\})\s*\)/g;
    let match;

    while ((match = statePattern.exec(source)) !== null) {
      try {
        // Static extraction - no eval, parse as JSON-like structure
        const parsed = parseStaticObject(match[1]);
        if (parsed) {
          declarations.push(parsed as Partial<SystemState>);
        }
      } catch {
        // Unparseable declaration - treat as potentially violating
        declarations.push({});
      }
    }
  }

  return declarations;
}

// Parse action declarations from source without execution
function extractActionDeclarations(sourceFiles: readonly string[]): Partial<Action>[] {
  const declarations: Partial<Action>[] = [];

  for (const source of sourceFiles) {
    // Extract createAction calls
    const actionPattern = /createAction\s*\(\s*(\{[\s\S]*?\})\s*\)/g;
    let match;

    while ((match = actionPattern.exec(source)) !== null) {
      try {
        const parsed = parseStaticObject(match[1]);
        if (parsed) {
          declarations.push(parsed as Partial<Action>);
        }
      } catch {
        declarations.push({});
      }
    }
  }

  return declarations;
}

// Static object parser - no eval, deterministic
function parseStaticObject(objectStr: string): Record<string, unknown> | null {
  try {
    // Remove comments
    const cleaned = objectStr
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // Convert to valid JSON
    const jsonLike = cleaned
      .replace(/'/g, '"')
      .replace(/(\w+):/g, '"$1":')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    return JSON.parse(jsonLike);
  } catch {
    return null;
  }
}

// Main compile pass - runs at build time
function runCompilePass(input: CompilePassInput): CompilePassResult {
  const timestamp = Date.now();
  const context = createContext(timestamp, false, false);

  // Check all declared states against all declared actions
  for (const statePartial of input.stateDeclarations) {
    const state = createSystemState(statePartial);

    for (const actionPartial of input.actionDeclarations) {
      const action = createAction(actionPartial);
      const result = evaluateNegativeInvariants(state, action, context);

      if (result.violated) {
        return {
          passed: false,
          failedAt: result.violation.invariantId,
          output: formatViolation(result.violation)
        };
      }
    }
  }

  // Check states with default action
  for (const statePartial of input.stateDeclarations) {
    const state = createSystemState(statePartial);
    const defaultAction = createAction({});
    const result = evaluateNegativeInvariants(state, defaultAction, context);

    if (result.violated) {
      return {
        passed: false,
        failedAt: result.violation.invariantId,
        output: formatViolation(result.violation)
      };
    }
  }

  return {
    passed: true,
    failedAt: null,
    output: null
  };
}

// ============================================================================
// EXECUTION REMOVED
// ============================================================================

// main() function has been removed.
// This module is a canonical artifact.
// It documents compile-time invariant checking logic.
// It may not be executed.
// See: docs/OLYMPUS_CANON.md

// EXECUTION SURFACE REMOVED - CANONICAL ARTIFACT
// This module is frozen. It cannot be executed.
// Import EXECUTION_LOCK.ts to verify execution is forbidden.

// Types exported for reference only - not for runtime use
export type {
  CompilePassInput,
  CompilePassResult
};

// Functions documented but not for execution
// extractStateDeclarations - FROZEN
// extractActionDeclarations - FROZEN
// runCompilePass - FROZEN
