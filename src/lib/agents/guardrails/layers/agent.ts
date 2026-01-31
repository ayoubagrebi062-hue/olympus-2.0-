/**
 * OLYMPUS 10X - Agent Guardrail Layer
 *
 * Fourth line of defense: Per-agent validation rules,
 * capability checks, resource limits.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { GUARDRAIL_LAYERS, LIMITS } from '@/lib/core';
import type { GuardrailInput } from '@/lib/core';
import type {
  GuardrailLayerHandler,
  GuardrailContext,
  AgentLayerConfig,
  LayerValidationResult,
  AgentRuleSet,
  AgentResourceLimits,
} from '../types';

// ============================================================================
// DEFAULT AGENT RULES
// ============================================================================

/**
 * Default resource limits for all agents.
 */
const DEFAULT_RESOURCE_LIMITS: AgentResourceLimits = {
  maxConcurrent: 5,
  maxExecutionTimeMs: 300_000, // 5 minutes
  maxMemoryBytes: 512 * 1024 * 1024, // 512 MB
  maxOutputSizeBytes: 10 * 1024 * 1024, // 10 MB
};

/**
 * Built-in rules for known agent types.
 */
const BUILTIN_AGENT_RULES: Record<string, AgentRuleSet> = {
  'code-generator': {
    allowedCapabilities: ['generate_code', 'read_files', 'write_files'],
    blockedPatterns: [
      /rm\s+-rf\s+\//i, // Prevent destructive commands
      /format\s+c:/i,
    ],
    maxInputSize: 500_000,
  },
  'security-scanner': {
    allowedCapabilities: ['scan_files', 'read_files', 'generate_report'],
    blockedCapabilities: ['write_files', 'execute_commands'],
    maxInputSize: 1_000_000,
  },
  'documentation-writer': {
    allowedCapabilities: ['read_files', 'write_files', 'generate_content'],
    maxInputSize: 200_000,
  },
  'test-generator': {
    allowedCapabilities: ['read_files', 'write_files', 'execute_tests'],
    maxInputSize: 500_000,
  },
  'deployment-agent': {
    allowedCapabilities: ['read_config', 'execute_deploy', 'manage_infra'],
    blockedPatterns: [/delete\s+production/i, /drop\s+database/i],
  },
};

// ============================================================================
// AGENT LAYER IMPLEMENTATION
// ============================================================================

export class AgentLayer implements GuardrailLayerHandler {
  readonly layer = GUARDRAIL_LAYERS.AGENT;
  readonly name = 'Agent Layer';

  private agentRules: Map<string, AgentRuleSet>;
  private defaultCapabilities: Set<string>;
  private resourceLimits: AgentResourceLimits;
  private bypassRoles: Set<string>;

  constructor(
    customRules: Record<string, AgentRuleSet> = {},
    resourceLimits: AgentResourceLimits = DEFAULT_RESOURCE_LIMITS,
    bypassRoles: string[] = ['admin', 'system']
  ) {
    // Merge built-in rules with custom rules
    this.agentRules = new Map([
      ...Object.entries(BUILTIN_AGENT_RULES),
      ...Object.entries(customRules),
    ]);

    this.defaultCapabilities = new Set(['read_files', 'generate_content', 'analyze_data']);

    this.resourceLimits = resourceLimits;
    this.bypassRoles = new Set(bypassRoles);
  }

  async validate(
    context: GuardrailContext,
    input: GuardrailInput,
    config: AgentLayerConfig
  ): Promise<LayerValidationResult> {
    const startTime = Date.now();
    const options = config.options || {};
    const targetAgent = context.targetAgent || input.agentId;

    try {
      // If no target agent specified, skip agent-specific checks
      if (!targetAgent) {
        return this.createResult(
          {
            action: 'allow',
            confidence: 1.0,
            reason: 'No target agent specified, skipping agent-specific validation',
          },
          startTime
        );
      }

      // Get rules for this agent
      const rules = this.getAgentRules(targetAgent, options.agentRules);

      // 1. Check input size
      const sizeResult = this.checkInputSize(input, rules, targetAgent);
      if (sizeResult) {
        return this.createResult(sizeResult, startTime);
      }

      // 2. Check blocked patterns
      const patternResult = this.checkBlockedPatterns(input, rules, targetAgent);
      if (patternResult) {
        return this.createResult(patternResult, startTime);
      }

      // 3. Check allowed patterns (if defined)
      const allowedResult = this.checkAllowedPatterns(input, rules, targetAgent);
      if (allowedResult) {
        return this.createResult(allowedResult, startTime);
      }

      // 4. Check capabilities
      const capabilityResult = this.checkCapabilities(input, rules, targetAgent);
      if (capabilityResult) {
        return this.createResult(capabilityResult, startTime);
      }

      // 5. Run custom validator if defined
      if (rules.customValidator) {
        try {
          const isValid = await rules.customValidator(input);
          if (!isValid) {
            return this.createResult(
              {
                action: 'block',
                confidence: 0.8,
                reason: `Agent '${targetAgent}' custom validation failed`,
              },
              startTime
            );
          }
        } catch (error) {
          return this.createResult(
            {
              action: 'warn',
              confidence: 0.5,
              reason: `Agent '${targetAgent}' custom validator error: ${error instanceof Error ? error.message : String(error)}`,
            },
            startTime
          );
        }
      }

      // All checks passed
      return this.createResult(
        {
          action: 'allow',
          confidence: 1.0,
          reason: `Input valid for agent '${targetAgent}'`,
          metadata: {
            agent: targetAgent,
            rulesApplied: true,
          },
        },
        startTime
      );
    } catch (error) {
      if (!config.continueOnError) {
        return this.createResult(
          {
            action: 'warn',
            confidence: 0.5,
            reason: `Agent layer error: ${error instanceof Error ? error.message : String(error)}`,
          },
          startTime
        );
      }

      return this.createResult(
        {
          action: 'allow',
          confidence: 0.5,
          reason: `Agent layer error (continuing): ${error instanceof Error ? error.message : String(error)}`,
        },
        startTime
      );
    }
  }

  shouldBypass(context: GuardrailContext): boolean {
    if (!context.userRoles) return false;
    return context.userRoles.some(role => this.bypassRoles.has(role));
  }

  // ===========================================================================
  // VALIDATION CHECKS
  // ===========================================================================

  private getAgentRules(agentId: string, customRules?: Record<string, AgentRuleSet>): AgentRuleSet {
    // Check custom rules first
    if (customRules && customRules[agentId]) {
      return customRules[agentId];
    }

    // Check registered rules
    if (this.agentRules.has(agentId)) {
      return this.agentRules.get(agentId)!;
    }

    // Return empty rules (no restrictions)
    return {};
  }

  private checkInputSize(
    input: GuardrailInput,
    rules: AgentRuleSet,
    agentId: string
  ): Partial<LayerValidationResult> | null {
    const maxSize = rules.maxInputSize || LIMITS.MAX_INPUT_SIZE_BYTES;
    const inputSize = this.calculateInputSize(input);

    if (inputSize > maxSize) {
      return {
        action: 'block',
        confidence: 1.0,
        reason: `Input size ${this.formatBytes(inputSize)} exceeds limit for agent '${agentId}' (max: ${this.formatBytes(maxSize)})`,
        metadata: {
          agent: agentId,
          inputSize,
          maxSize,
        },
      };
    }

    return null;
  }

  private checkBlockedPatterns(
    input: GuardrailInput,
    rules: AgentRuleSet,
    agentId: string
  ): Partial<LayerValidationResult> | null {
    if (!rules.blockedPatterns || rules.blockedPatterns.length === 0) {
      return null;
    }

    const prompt = input.prompt || '';

    for (const pattern of rules.blockedPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        return {
          action: 'block',
          confidence: 0.9,
          reason: `Input matches blocked pattern for agent '${agentId}'`,
          metadata: {
            agent: agentId,
            blockedPattern: pattern.source,
            matchedText: match[0].substring(0, 50),
          },
        };
      }
    }

    return null;
  }

  private checkAllowedPatterns(
    input: GuardrailInput,
    rules: AgentRuleSet,
    agentId: string
  ): Partial<LayerValidationResult> | null {
    if (!rules.allowedPatterns || rules.allowedPatterns.length === 0) {
      return null;
    }

    const prompt = input.prompt || '';

    // Check if at least one allowed pattern matches
    const hasMatch = rules.allowedPatterns.some(pattern => pattern.test(prompt));

    if (!hasMatch) {
      return {
        action: 'warn',
        confidence: 0.7,
        reason: `Input does not match any allowed pattern for agent '${agentId}'`,
        metadata: {
          agent: agentId,
          allowedPatternsCount: rules.allowedPatterns.length,
        },
      };
    }

    return null;
  }

  private checkCapabilities(
    input: GuardrailInput,
    rules: AgentRuleSet,
    agentId: string
  ): Partial<LayerValidationResult> | null {
    // Check for capability-related keywords in the input
    const requestedCapabilities = this.extractRequestedCapabilities(input.prompt || '');

    if (requestedCapabilities.length === 0) {
      return null;
    }

    // Check against blocked capabilities
    if (rules.blockedCapabilities) {
      const blocked = requestedCapabilities.filter(cap => rules.blockedCapabilities!.includes(cap));

      if (blocked.length > 0) {
        return {
          action: 'block',
          confidence: 0.85,
          reason: `Requested capabilities blocked for agent '${agentId}': ${blocked.join(', ')}`,
          metadata: {
            agent: agentId,
            blockedCapabilities: blocked,
            requested: requestedCapabilities,
          },
        };
      }
    }

    // Check against allowed capabilities (if specified)
    if (rules.allowedCapabilities) {
      const notAllowed = requestedCapabilities.filter(
        cap => !rules.allowedCapabilities!.includes(cap)
      );

      if (notAllowed.length > 0) {
        return {
          action: 'warn',
          confidence: 0.7,
          reason: `Requested capabilities not in allowed list for agent '${agentId}': ${notAllowed.join(', ')}`,
          metadata: {
            agent: agentId,
            notAllowedCapabilities: notAllowed,
            allowed: rules.allowedCapabilities,
          },
        };
      }
    }

    return null;
  }

  private extractRequestedCapabilities(prompt: string): string[] {
    const capabilities: string[] = [];

    const capabilityPatterns: Record<string, RegExp> = {
      read_files: /\b(read|open|view|show|get|load)\s*(file|code|content)/i,
      write_files: /\b(write|save|create|modify|edit|update)\s*(file|code)/i,
      execute_commands: /\b(run|execute|shell|terminal|command|bash|cmd)/i,
      generate_code: /\b(generate|create|write|build)\s*(code|function|class|component)/i,
      generate_content: /\b(generate|create|write)\s*(content|text|documentation|readme)/i,
      analyze_data: /\b(analyze|examine|review|check)\s*(data|code|logs)/i,
      scan_files: /\b(scan|search|find|grep)\s*(file|code|pattern)/i,
      execute_tests: /\b(test|run\s*tests|jest|pytest|vitest)/i,
      execute_deploy: /\b(deploy|release|publish|push\s*to\s*production)/i,
      manage_infra: /\b(server|database|infrastructure|container|docker|kubernetes)/i,
    };

    for (const [capability, pattern] of Object.entries(capabilityPatterns)) {
      if (pattern.test(prompt)) {
        capabilities.push(capability);
      }
    }

    return capabilities;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private calculateInputSize(input: GuardrailInput): number {
    try {
      return new Blob([JSON.stringify(input)]).size;
    } catch {
      return JSON.stringify(input).length * 2;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private createResult(
    partial: Partial<LayerValidationResult>,
    startTime: number
  ): LayerValidationResult {
    return {
      layer: this.layer,
      action: partial.action || 'allow',
      confidence: partial.confidence || 1.0,
      reason: partial.reason || 'Validation complete',
      durationMs: Date.now() - startTime,
      metadata: partial.metadata,
    };
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  /**
   * Register rules for an agent.
   */
  registerAgentRules(agentId: string, rules: AgentRuleSet): void {
    this.agentRules.set(agentId, rules);
  }

  /**
   * Get rules for an agent.
   */
  getRegisteredRules(agentId: string): AgentRuleSet | undefined {
    return this.agentRules.get(agentId);
  }

  /**
   * Update resource limits.
   */
  updateResourceLimits(limits: Partial<AgentResourceLimits>): void {
    this.resourceLimits = { ...this.resourceLimits, ...limits };
  }

  /**
   * Get current resource limits.
   */
  getResourceLimits(): AgentResourceLimits {
    return { ...this.resourceLimits };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Agent layer instance.
 */
export function createAgentLayer(
  customRules?: Record<string, AgentRuleSet>,
  resourceLimits?: AgentResourceLimits,
  bypassRoles?: string[]
): AgentLayer {
  return new AgentLayer(customRules, resourceLimits, bypassRoles);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { BUILTIN_AGENT_RULES, DEFAULT_RESOURCE_LIMITS };
