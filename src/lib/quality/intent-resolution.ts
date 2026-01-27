/**
 * OLYMPUS 2.0 - Intent Resolution Engine (IRE)
 *
 * Deterministic resolution of IRCL clarification requirements.
 * Applies human or policy answers to mutate intents.
 *
 * Rules:
 * - No free-text answers
 * - One clarification → one mutation
 * - All changes must be traceable
 * - No heuristics, no auto-filling
 */

import { IntentSpec, IntentCausalChain, IntentCategory } from './intent-graph';
import {
  RequiredClarification,
  IntentImpossibility,
  IntentImpossibilityType,
} from './intent-contradictions';
import { getIntentStore, VersionedIntentGraph } from './intent-store';
import * as crypto from 'crypto';

// ============================================
// CLARIFICATION SCHEMA
// ============================================

/**
 * Which axis the clarification targets
 */
export type ClarificationAxis =
  | 'trigger'
  | 'state'
  | 'effect'
  | 'outcome'
  | 'external'
  | 'requirement'; // The requirement text itself

/**
 * Type of mutation to apply
 */
export type MutationType =
  | 'ADD' // Add new expected element
  | 'REPLACE' // Replace existing expected element
  | 'REMOVE' // Remove an expectation
  | 'CONSTRAIN' // Add constraint to existing
  | 'CLARIFY'; // Clarify ambiguous text

/**
 * Types of allowed answers (no free-text)
 */
export type AnswerType =
  | 'ENUM' // Select from predefined options
  | 'BOOLEAN' // Yes/No
  | 'NUMBER' // Numeric value within range
  | 'SCHEMA'; // Structured object matching schema

/**
 * Schema definition for SCHEMA type answers
 */
export interface AnswerSchema {
  type: 'object';
  required: string[];
  properties: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array';
      enum?: (string | number | boolean)[];
      minimum?: number;
      maximum?: number;
      items?: { type: string; enum?: string[] };
    }
  >;
}

/**
 * A clarification requirement with allowed answers
 */
export interface IntentClarification {
  clarificationId: string;
  intentId: string;

  // What needs clarification
  axis: ClarificationAxis;
  question: string;
  context: string;

  // What mutation will be applied
  mutationType: MutationType;

  // Allowed answers (NO free-text)
  answerType: AnswerType;
  allowedValues?: (string | number | boolean)[]; // For ENUM
  valueRange?: { min: number; max: number }; // For NUMBER
  schema?: AnswerSchema; // For SCHEMA

  // Priority for resolution order
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  // Related to impossibility?
  impossibilityType?: IntentImpossibilityType;

  // Created at
  createdAt: Date;
}

/**
 * An answer to a clarification
 */
export interface IntentAnswer {
  clarificationId: string;
  value: string | number | boolean | Record<string, any>;
  source: 'human' | 'policy';

  // Traceability
  answeredAt: Date;
  answeredBy?: string; // User ID or policy name
}

/**
 * Result of applying an answer
 */
export interface AnswerApplicationResult {
  clarificationId: string;
  intentId: string;
  applied: boolean;
  mutation: MutationType;
  axis: ClarificationAxis;

  // What changed
  previousValue?: any;
  newValue?: any;

  // If not applied, why
  rejectionReason?: string;
}

/**
 * Full resolution report
 */
export interface IntentResolutionReport {
  buildId: string;
  resolvedAt: Date;

  // Input
  clarificationsReceived: number;
  answersProvided: number;

  // Results
  answersApplied: number;
  answersRejected: number;
  applicationResults: AnswerApplicationResult[];

  // New intent version
  previousIntentVersion: number;
  newIntentVersion: number;

  // Summary
  deltaSummary: IntentDeltaSummary;

  // Revalidation needed?
  revalidationRequired: boolean;
}

/**
 * Summary of changes made
 */
export interface IntentDeltaSummary {
  intentsModified: number;
  triggersChanged: number;
  statesChanged: number;
  effectsChanged: number;
  outcomesChanged: number;
  requirementsChanged: number;
  mutations: Array<{
    intentId: string;
    axis: ClarificationAxis;
    type: MutationType;
    description: string;
  }>;
}

// ============================================
// CLARIFICATION GENERATION
// ============================================

let clarificationIdCounter = 0;

function generateClarificationId(): string {
  return `clarification-${Date.now()}-${++clarificationIdCounter}`;
}

/**
 * Convert IRCL RequiredClarification to IntentClarification
 * with strict answer schemas
 */
export function generateClarifications(
  requiredClarifications: RequiredClarification[],
  impossibilities: IntentImpossibility[]
): IntentClarification[] {
  const clarifications: IntentClarification[] = [];

  for (const req of requiredClarifications) {
    const impossibility = impossibilities.find(i => i.intentId === req.intentId);

    // Determine axis and mutation type from context
    const { axis, mutationType } = inferAxisAndMutation(req, impossibility);

    // Generate allowed values from suggested options
    const { answerType, allowedValues, schema } = generateAnswerSpec(req);

    clarifications.push({
      clarificationId: generateClarificationId(),
      intentId: req.intentId,
      axis,
      question: req.question,
      context: req.context,
      mutationType,
      answerType,
      allowedValues,
      schema,
      priority: req.priority,
      impossibilityType: impossibility?.type,
      createdAt: new Date(),
    });
  }

  return clarifications;
}

/**
 * Infer which axis and mutation type from the clarification
 */
function inferAxisAndMutation(
  req: RequiredClarification,
  impossibility?: IntentImpossibility
): { axis: ClarificationAxis; mutationType: MutationType } {
  const questionLower = req.question.toLowerCase();
  const contextLower = req.context.toLowerCase();

  // Check for trigger-related
  if (
    questionLower.includes('trigger') ||
    questionLower.includes('click') ||
    questionLower.includes('action') ||
    contextLower.includes('trigger')
  ) {
    return { axis: 'trigger', mutationType: 'REPLACE' };
  }

  // Check for state-related
  if (
    questionLower.includes('state') ||
    questionLower.includes('manage') ||
    questionLower.includes('store') ||
    contextLower.includes('state')
  ) {
    return { axis: 'state', mutationType: 'REPLACE' };
  }

  // Check for outcome-related
  if (
    questionLower.includes('display') ||
    questionLower.includes('show') ||
    questionLower.includes('visible') ||
    questionLower.includes('outcome') ||
    contextLower.includes('outcome')
  ) {
    return { axis: 'outcome', mutationType: 'REPLACE' };
  }

  // Check for external-related
  if (
    questionLower.includes('api') ||
    questionLower.includes('external') ||
    questionLower.includes('service') ||
    questionLower.includes('endpoint') ||
    contextLower.includes('external')
  ) {
    return { axis: 'external', mutationType: 'ADD' };
  }

  // Check for effect-related
  if (
    questionLower.includes('connect') ||
    questionLower.includes('update') ||
    questionLower.includes('modify') ||
    contextLower.includes('effect')
  ) {
    return { axis: 'effect', mutationType: 'ADD' };
  }

  // Based on impossibility type
  if (impossibility) {
    switch (impossibility.type) {
      case 'MISSING_EXTERNAL_DEPENDENCY':
        return { axis: 'external', mutationType: 'ADD' };
      case 'LOGICAL_CONTRADICTION':
        return { axis: 'requirement', mutationType: 'REPLACE' };
      case 'UNSATISFIABLE_CONSTRAINT':
        return { axis: 'requirement', mutationType: 'CONSTRAIN' };
      case 'UNDER_SPECIFIED_INTENT':
        return { axis: 'requirement', mutationType: 'CLARIFY' };
    }
  }

  // Default to requirement clarification
  return { axis: 'requirement', mutationType: 'CLARIFY' };
}

/**
 * Generate answer specification from suggested options
 */
function generateAnswerSpec(req: RequiredClarification): {
  answerType: AnswerType;
  allowedValues?: (string | number | boolean)[];
  schema?: AnswerSchema;
} {
  // If we have suggested options, use ENUM
  if (req.suggestedOptions && req.suggestedOptions.length > 0) {
    return {
      answerType: 'ENUM',
      allowedValues: req.suggestedOptions,
    };
  }

  // Check if it's a yes/no question
  const questionLower = req.question.toLowerCase();
  if (
    questionLower.includes('should') ||
    questionLower.includes('do you want') ||
    questionLower.includes('is this') ||
    questionLower.includes('can you')
  ) {
    return {
      answerType: 'BOOLEAN',
      allowedValues: [true, false],
    };
  }

  // Default to structured schema for complex answers
  return {
    answerType: 'SCHEMA',
    schema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['KEEP', 'MODIFY', 'REMOVE'],
        },
        newValue: {
          type: 'string',
        },
        reason: {
          type: 'string',
          enum: ['UNNECESSARY', 'DIFFERENT_APPROACH', 'CLARIFIED', 'CONSTRAINED'],
        },
      },
    },
  };
}

// ============================================
// ANSWER VALIDATION
// ============================================

/**
 * Validate an answer against its clarification schema
 */
export function validateAnswer(
  answer: IntentAnswer,
  clarification: IntentClarification
): { valid: boolean; error?: string } {
  const { value } = answer;

  switch (clarification.answerType) {
    case 'ENUM':
      if (!clarification.allowedValues?.includes(value as any)) {
        return {
          valid: false,
          error: `Value "${value}" not in allowed values: [${clarification.allowedValues?.join(', ')}]`,
        };
      }
      return { valid: true };

    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        return {
          valid: false,
          error: `Expected boolean, got ${typeof value}`,
        };
      }
      return { valid: true };

    case 'NUMBER':
      if (typeof value !== 'number') {
        return {
          valid: false,
          error: `Expected number, got ${typeof value}`,
        };
      }
      if (clarification.valueRange) {
        if (value < clarification.valueRange.min || value > clarification.valueRange.max) {
          return {
            valid: false,
            error: `Value ${value} outside range [${clarification.valueRange.min}, ${clarification.valueRange.max}]`,
          };
        }
      }
      return { valid: true };

    case 'SCHEMA':
      return validateSchemaAnswer(value, clarification.schema!);

    default:
      return { valid: false, error: `Unknown answer type: ${clarification.answerType}` };
  }
}

/**
 * Validate answer against JSON schema
 */
function validateSchemaAnswer(
  value: any,
  schema: AnswerSchema
): { valid: boolean; error?: string } {
  if (typeof value !== 'object' || value === null) {
    return { valid: false, error: 'Expected object' };
  }

  // Check required fields
  for (const required of schema.required) {
    if (!(required in value)) {
      return { valid: false, error: `Missing required field: ${required}` };
    }
  }

  // Validate each property
  for (const [key, propValue] of Object.entries(value) as [string, any][]) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      return { valid: false, error: `Unknown property: ${key}` };
    }

    // Check type
    const actualType = Array.isArray(propValue) ? 'array' : typeof propValue;
    if (actualType !== propSchema.type) {
      return {
        valid: false,
        error: `Property ${key}: expected ${propSchema.type}, got ${actualType}`,
      };
    }

    // Check enum
    if (propSchema.enum && !propSchema.enum.includes(propValue as any)) {
      return { valid: false, error: `Property ${key}: value not in enum` };
    }

    // Check number range
    if (propSchema.type === 'number') {
      if (propSchema.minimum !== undefined && (propValue as number) < propSchema.minimum) {
        return { valid: false, error: `Property ${key}: below minimum ${propSchema.minimum}` };
      }
      if (propSchema.maximum !== undefined && (propValue as number) > propSchema.maximum) {
        return { valid: false, error: `Property ${key}: above maximum ${propSchema.maximum}` };
      }
    }
  }

  return { valid: true };
}

// ============================================
// ANSWER APPLICATION
// ============================================

/**
 * Apply validated answers to mutate intents
 * Returns new intent graph version
 */
export function applyIntentAnswers(
  buildId: string,
  fsOutputDir: string,
  chains: IntentCausalChain[],
  clarifications: IntentClarification[],
  answers: IntentAnswer[]
): {
  updatedChains: IntentCausalChain[];
  report: IntentResolutionReport;
} {
  console.log('[IRE] ==========================================');
  console.log('[IRE] INTENT RESOLUTION ENGINE');
  console.log('[IRE] ==========================================');
  console.log(`[IRE] Build: ${buildId}`);
  console.log(`[IRE] Clarifications: ${clarifications.length}`);
  console.log(`[IRE] Answers: ${answers.length}`);

  const intentStore = getIntentStore(fsOutputDir);
  const previousVersion = intentStore.loadLatest()?.meta.version ?? 0;

  const applicationResults: AnswerApplicationResult[] = [];
  const updatedChains = chains.map(chain => ({ ...chain, intent: { ...chain.intent } }));
  const deltaMutations: IntentDeltaSummary['mutations'] = [];

  let answersApplied = 0;
  let answersRejected = 0;

  // Build clarification lookup
  const clarificationMap = new Map<string, IntentClarification>();
  for (const c of clarifications) {
    clarificationMap.set(c.clarificationId, c);
  }

  // Sort answers by clarification priority
  const sortedAnswers = [...answers].sort((a, b) => {
    const cA = clarificationMap.get(a.clarificationId);
    const cB = clarificationMap.get(b.clarificationId);
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return priorityOrder[cA?.priority ?? 'LOW'] - priorityOrder[cB?.priority ?? 'LOW'];
  });

  // Apply each answer
  for (const answer of sortedAnswers) {
    const clarification = clarificationMap.get(answer.clarificationId);

    if (!clarification) {
      applicationResults.push({
        clarificationId: answer.clarificationId,
        intentId: '',
        applied: false,
        mutation: 'CLARIFY',
        axis: 'requirement',
        rejectionReason: 'Clarification not found',
      });
      answersRejected++;
      console.log(`[IRE] ✗ ${answer.clarificationId}: Clarification not found`);
      continue;
    }

    // Validate answer
    const validation = validateAnswer(answer, clarification);
    if (!validation.valid) {
      applicationResults.push({
        clarificationId: answer.clarificationId,
        intentId: clarification.intentId,
        applied: false,
        mutation: clarification.mutationType,
        axis: clarification.axis,
        rejectionReason: validation.error,
      });
      answersRejected++;
      console.log(`[IRE] ✗ ${answer.clarificationId}: ${validation.error}`);
      continue;
    }

    // Find the intent to mutate
    const chainIndex = updatedChains.findIndex(c => c.intent.id === clarification.intentId);
    if (chainIndex === -1) {
      applicationResults.push({
        clarificationId: answer.clarificationId,
        intentId: clarification.intentId,
        applied: false,
        mutation: clarification.mutationType,
        axis: clarification.axis,
        rejectionReason: 'Intent not found in graph',
      });
      answersRejected++;
      console.log(`[IRE] ✗ ${answer.clarificationId}: Intent ${clarification.intentId} not found`);
      continue;
    }

    // Apply the mutation
    const result = applyMutation(updatedChains[chainIndex], clarification, answer);

    if (result.applied) {
      updatedChains[chainIndex] = result.updatedChain!;
      deltaMutations.push({
        intentId: clarification.intentId,
        axis: clarification.axis,
        type: clarification.mutationType,
        description: `${clarification.mutationType} on ${clarification.axis}: ${JSON.stringify(answer.value).slice(0, 50)}`,
      });
      answersApplied++;
      console.log(
        `[IRE] ✓ ${answer.clarificationId}: Applied ${clarification.mutationType} on ${clarification.axis}`
      );
    } else {
      answersRejected++;
      console.log(`[IRE] ✗ ${answer.clarificationId}: ${result.rejectionReason}`);
    }

    applicationResults.push({
      clarificationId: answer.clarificationId,
      intentId: clarification.intentId,
      applied: result.applied,
      mutation: clarification.mutationType,
      axis: clarification.axis,
      previousValue: result.previousValue,
      newValue: result.newValue,
      rejectionReason: result.rejectionReason,
    });
  }

  // Calculate delta summary
  const deltaSummary: IntentDeltaSummary = {
    intentsModified: new Set(deltaMutations.map(m => m.intentId)).size,
    triggersChanged: deltaMutations.filter(m => m.axis === 'trigger').length,
    statesChanged: deltaMutations.filter(m => m.axis === 'state').length,
    effectsChanged: deltaMutations.filter(m => m.axis === 'effect').length,
    outcomesChanged: deltaMutations.filter(m => m.axis === 'outcome').length,
    requirementsChanged: deltaMutations.filter(m => m.axis === 'requirement').length,
    mutations: deltaMutations,
  };

  // New version number
  const newVersion = previousVersion + 1;

  const report: IntentResolutionReport = {
    buildId,
    resolvedAt: new Date(),
    clarificationsReceived: clarifications.length,
    answersProvided: answers.length,
    answersApplied,
    answersRejected,
    applicationResults,
    previousIntentVersion: previousVersion,
    newIntentVersion: newVersion,
    deltaSummary,
    revalidationRequired: answersApplied > 0,
  };

  console.log('[IRE] ------------------------------------------');
  console.log(`[IRE] Applied: ${answersApplied}/${answers.length}`);
  console.log(`[IRE] Rejected: ${answersRejected}`);
  console.log(`[IRE] New Version: ${newVersion}`);
  console.log(`[IRE] Revalidation: ${report.revalidationRequired ? 'REQUIRED' : 'NOT NEEDED'}`);
  console.log('[IRE] ==========================================');

  return { updatedChains, report };
}

/**
 * Apply a single mutation to an intent chain
 */
function applyMutation(
  chain: IntentCausalChain,
  clarification: IntentClarification,
  answer: IntentAnswer
): {
  applied: boolean;
  updatedChain?: IntentCausalChain;
  previousValue?: any;
  newValue?: any;
  rejectionReason?: string;
} {
  const intent = { ...chain.intent };
  const value = answer.value;

  switch (clarification.axis) {
    case 'trigger':
      return applyTriggerMutation(chain, intent, clarification.mutationType, value);

    case 'state':
      return applyStateMutation(chain, intent, clarification.mutationType, value);

    case 'effect':
      return applyEffectMutation(chain, intent, clarification.mutationType, value);

    case 'outcome':
      return applyOutcomeMutation(chain, intent, clarification.mutationType, value);

    case 'external':
      return applyExternalMutation(chain, intent, clarification.mutationType, value);

    case 'requirement':
      return applyRequirementMutation(chain, intent, clarification.mutationType, value);

    default:
      return { applied: false, rejectionReason: `Unknown axis: ${clarification.axis}` };
  }
}

/**
 * Apply trigger mutation
 */
function applyTriggerMutation(
  chain: IntentCausalChain,
  intent: IntentSpec,
  mutationType: MutationType,
  value: any
): ReturnType<typeof applyMutation> {
  const previousValue = intent.expectedTrigger;

  switch (mutationType) {
    case 'ADD':
    case 'REPLACE':
      if (typeof value === 'object' && value.action === 'REMOVE') {
        intent.expectedTrigger = undefined;
        return {
          applied: true,
          updatedChain: { ...chain, intent },
          previousValue,
          newValue: undefined,
        };
      }
      if (typeof value === 'string') {
        // Enum selection - use as target name
        intent.expectedTrigger = {
          type: 'click',
          target: value,
        };
      } else if (typeof value === 'object' && value.newValue) {
        intent.expectedTrigger = {
          type: 'click',
          target: value.newValue,
        };
      }
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: intent.expectedTrigger,
      };

    case 'REMOVE':
      intent.expectedTrigger = undefined;
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: undefined,
      };

    default:
      return {
        applied: false,
        rejectionReason: `Unsupported mutation: ${mutationType} for trigger`,
      };
  }
}

/**
 * Apply state mutation
 */
function applyStateMutation(
  chain: IntentCausalChain,
  intent: IntentSpec,
  mutationType: MutationType,
  value: any
): ReturnType<typeof applyMutation> {
  const previousValue = intent.expectedState;

  switch (mutationType) {
    case 'ADD':
    case 'REPLACE':
      if (typeof value === 'object' && value.action === 'REMOVE') {
        intent.expectedState = undefined;
        return {
          applied: true,
          updatedChain: { ...chain, intent },
          previousValue,
          newValue: undefined,
        };
      }
      if (typeof value === 'string') {
        intent.expectedState = {
          stateName: value,
        };
      } else if (typeof value === 'object' && value.newValue) {
        intent.expectedState = {
          stateName: value.newValue,
        };
      }
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: intent.expectedState,
      };

    case 'REMOVE':
      intent.expectedState = undefined;
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: undefined,
      };

    default:
      return { applied: false, rejectionReason: `Unsupported mutation: ${mutationType} for state` };
  }
}

/**
 * Apply effect mutation
 */
function applyEffectMutation(
  chain: IntentCausalChain,
  intent: IntentSpec,
  mutationType: MutationType,
  value: any
): ReturnType<typeof applyMutation> {
  // Effects are derived from trigger-state connection
  // This mutation marks the intent as expecting an effect
  const previousValue = { hasEffect: chain.axisScores.effect > 0 };

  if (typeof value === 'boolean') {
    // Boolean: should there be an effect?
    return {
      applied: true,
      updatedChain: {
        ...chain,
        intent,
        // Mark that effect is expected
      },
      previousValue,
      newValue: { expectsEffect: value },
    };
  }

  if (typeof value === 'object' && value.action) {
    return {
      applied: true,
      updatedChain: { ...chain, intent },
      previousValue,
      newValue: value,
    };
  }

  return { applied: false, rejectionReason: 'Invalid effect value' };
}

/**
 * Apply outcome mutation
 */
function applyOutcomeMutation(
  chain: IntentCausalChain,
  intent: IntentSpec,
  mutationType: MutationType,
  value: any
): ReturnType<typeof applyMutation> {
  const previousValue = intent.expectedOutcome;

  switch (mutationType) {
    case 'ADD':
    case 'REPLACE':
      if (typeof value === 'object' && value.action === 'REMOVE') {
        intent.expectedOutcome = undefined;
        return {
          applied: true,
          updatedChain: { ...chain, intent },
          previousValue,
          newValue: undefined,
        };
      }
      if (typeof value === 'string') {
        intent.expectedOutcome = {
          type: 'visibility_toggle',
          target: value,
          description: `${value} is visible`,
          assertion: { type: 'appears' },
        };
      } else if (typeof value === 'object' && value.newValue) {
        intent.expectedOutcome = {
          type: 'visibility_toggle',
          target: value.newValue,
          description: `${value.newValue} is visible`,
          assertion: { type: 'appears' },
        };
      }
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: intent.expectedOutcome,
      };

    case 'REMOVE':
      intent.expectedOutcome = undefined;
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: undefined,
      };

    default:
      return {
        applied: false,
        rejectionReason: `Unsupported mutation: ${mutationType} for outcome`,
      };
  }
}

/**
 * Apply external mutation (ERA configuration)
 */
function applyExternalMutation(
  chain: IntentCausalChain,
  intent: IntentSpec,
  mutationType: MutationType,
  value: any
): ReturnType<typeof applyMutation> {
  // External mutations affect how ERA validates this intent
  // Store as metadata on the intent
  const previousValue = (intent as any).externalConfig;

  if (typeof value === 'string') {
    // Enum selection for external handling
    (intent as any).externalConfig = {
      mode: value, // e.g., 'mock', 'skip', 'required'
    };
  } else if (typeof value === 'object') {
    (intent as any).externalConfig = value;
  } else if (typeof value === 'boolean') {
    (intent as any).externalConfig = {
      required: value,
    };
  }

  return {
    applied: true,
    updatedChain: { ...chain, intent },
    previousValue,
    newValue: (intent as any).externalConfig,
  };
}

/**
 * Apply requirement mutation
 */
function applyRequirementMutation(
  chain: IntentCausalChain,
  intent: IntentSpec,
  mutationType: MutationType,
  value: any
): ReturnType<typeof applyMutation> {
  const previousValue = intent.requirement;

  switch (mutationType) {
    case 'CLARIFY':
    case 'REPLACE':
      if (typeof value === 'string') {
        // Direct replacement with selected option
        intent.requirement = value;
      } else if (typeof value === 'object') {
        if (value.action === 'REMOVE') {
          // Mark intent for removal (can't actually remove from graph here)
          (intent as any).markedForRemoval = true;
          return {
            applied: true,
            updatedChain: { ...chain, intent },
            previousValue,
            newValue: 'MARKED_FOR_REMOVAL',
          };
        }
        if (value.action === 'MODIFY' && value.newValue) {
          intent.requirement = value.newValue;
        }
      }
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: intent.requirement,
      };

    case 'CONSTRAIN':
      if (typeof value === 'string') {
        intent.requirement = `${intent.requirement} (constrained: ${value})`;
      } else if (typeof value === 'object' && value.constraint) {
        intent.requirement = `${intent.requirement} (${value.constraint})`;
      }
      return {
        applied: true,
        updatedChain: { ...chain, intent },
        previousValue,
        newValue: intent.requirement,
      };

    default:
      return {
        applied: false,
        rejectionReason: `Unsupported mutation: ${mutationType} for requirement`,
      };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Check if all required clarifications have answers
 */
export function hasPendingClarifications(
  clarifications: IntentClarification[],
  answers: IntentAnswer[]
): boolean {
  const answeredIds = new Set(answers.map(a => a.clarificationId));
  const criticalClarifications = clarifications.filter(c => c.priority === 'CRITICAL');

  for (const c of criticalClarifications) {
    if (!answeredIds.has(c.clarificationId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get unanswered clarifications
 */
export function getUnansweredClarifications(
  clarifications: IntentClarification[],
  answers: IntentAnswer[]
): IntentClarification[] {
  const answeredIds = new Set(answers.map(a => a.clarificationId));
  return clarifications.filter(c => !answeredIds.has(c.clarificationId));
}

// ============================================
// LOGGING
// ============================================

export function logResolutionReport(report: IntentResolutionReport): void {
  console.log('[IRE] ==========================================');
  console.log('[IRE] INTENT RESOLUTION REPORT');
  console.log('[IRE] ==========================================');
  console.log(`[IRE] Build: ${report.buildId}`);
  console.log(`[IRE] Resolved: ${report.resolvedAt.toISOString()}`);
  console.log(`[IRE] Clarifications: ${report.clarificationsReceived}`);
  console.log(`[IRE] Answers: ${report.answersProvided}`);
  console.log(`[IRE] Applied: ${report.answersApplied}`);
  console.log(`[IRE] Rejected: ${report.answersRejected}`);
  console.log(`[IRE] Version: ${report.previousIntentVersion} → ${report.newIntentVersion}`);
  console.log('[IRE] ------------------------------------------');
  console.log('[IRE] DELTA SUMMARY:');
  console.log(`[IRE]   Intents modified: ${report.deltaSummary.intentsModified}`);
  console.log(`[IRE]   Triggers changed: ${report.deltaSummary.triggersChanged}`);
  console.log(`[IRE]   States changed: ${report.deltaSummary.statesChanged}`);
  console.log(`[IRE]   Effects changed: ${report.deltaSummary.effectsChanged}`);
  console.log(`[IRE]   Outcomes changed: ${report.deltaSummary.outcomesChanged}`);
  console.log(`[IRE]   Requirements changed: ${report.deltaSummary.requirementsChanged}`);

  if (report.deltaSummary.mutations.length > 0) {
    console.log('[IRE] Mutations:');
    for (const m of report.deltaSummary.mutations.slice(0, 5)) {
      console.log(`[IRE]   - ${m.intentId}: ${m.type} on ${m.axis}`);
    }
  }

  console.log('[IRE] ==========================================');
}

export function logClarifications(clarifications: IntentClarification[]): void {
  console.log('[IRE] ==========================================');
  console.log('[IRE] PENDING CLARIFICATIONS');
  console.log('[IRE] ==========================================');
  console.log(`[IRE] Total: ${clarifications.length}`);

  for (const c of clarifications) {
    const icon = c.priority === 'CRITICAL' ? '!' : c.priority === 'HIGH' ? '*' : '-';
    console.log(`[IRE] ${icon} [${c.priority}] ${c.clarificationId}`);
    console.log(`[IRE]   Intent: ${c.intentId}`);
    console.log(`[IRE]   Axis: ${c.axis}`);
    console.log(`[IRE]   Question: ${c.question.slice(0, 60)}...`);
    console.log(`[IRE]   Answer type: ${c.answerType}`);
    if (c.allowedValues) {
      console.log(
        `[IRE]   Options: ${c.allowedValues.slice(0, 3).join(', ')}${c.allowedValues.length > 3 ? '...' : ''}`
      );
    }
  }

  console.log('[IRE] ==========================================');
}
