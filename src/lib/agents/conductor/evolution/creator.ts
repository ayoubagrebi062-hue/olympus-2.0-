/**
 * AGENT CREATOR
 * Phase 7 of OLYMPUS 50X - CRITICAL for Level 5 (AUTONOMOUS)
 *
 * Creates new agents when capability gaps are detected.
 * Handles the full lifecycle: design, test, deploy.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type {
  AgentProposal,
  TestCase,
  AgentSuccessCriteria,
  TestResult,
  EvolutionConfig,
} from './types';
import { DEFAULT_EVOLUTION_CONFIG } from './types';
import type { PromptService } from '../prompts';
import type { AgentDefinition, OutputSchema } from '../../types';
import { safeJsonParse } from '@/lib/core/safe-json';

// ============================================================================
// TYPES
// ============================================================================

interface LLMProvider {
  complete(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<string>;
}

interface AgentDesign {
  name: string;
  description: string;
  phase: string;
  tier: 'opus' | 'sonnet' | 'haiku';
  systemPrompt: string;
  outputSchema: Record<string, unknown>;
  dependencies: string[];
  capabilities: string[];
  expectedValue: string;
}

// ============================================================================
// AGENT CREATOR CLASS
// ============================================================================

export class AgentCreator {
  private llmProvider: LLMProvider;
  private promptService: PromptService;
  private config: EvolutionConfig;

  constructor(
    llmProvider: LLMProvider,
    promptService: PromptService,
    config?: Partial<EvolutionConfig>
  ) {
    this.llmProvider = llmProvider;
    this.promptService = promptService;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Propose a new agent based on detected capability gap
   */
  async proposeAgent(
    gap: string,
    context: {
      userRequests: string[];
      relatedAgents: string[];
      failedBuilds?: string[];
    }
  ): Promise<AgentProposal> {
    console.log(`[AgentCreator] Proposing agent for gap: ${gap}`);

    // 1. Generate agent design using LLM
    const design = await this.generateAgentDesign(gap, context);

    // 2. Create test cases based on user requests and gap
    const testCases = await this.generateTestCases(design, context.userRequests, gap);

    // 3. Build proposal
    const proposal: AgentProposal = {
      id: `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      identity: {
        name: design.name,
        description: design.description,
        phase: design.phase,
        tier: design.tier,
      },
      justification: {
        gapDetected: gap,
        userRequests: context.userRequests,
        relatedAgents: context.relatedAgents,
        expectedValue: design.expectedValue,
      },
      definition: {
        systemPrompt: design.systemPrompt,
        outputSchema: design.outputSchema,
        dependencies: design.dependencies,
        capabilities: design.capabilities,
      },
      testing: {
        testCases,
        benchmarkAgents: context.relatedAgents,
        successCriteria: this.getDefaultSuccessCriteria(),
      },
      status: 'proposed',
      createdAt: new Date(),
    };

    console.log(`[AgentCreator] Created proposal ${proposal.id} for agent ${design.name}`);
    return proposal;
  }

  /**
   * Test a proposed agent in sandbox environment
   */
  async testAgent(proposal: AgentProposal): Promise<{
    passed: boolean;
    results: TestResult[];
    recommendation: string;
    metrics: {
      passRate: number;
      avgQuality: number;
      avgLatency: number;
    };
  }> {
    console.log(`[AgentCreator] Testing proposal ${proposal.id}`);

    const results: TestResult[] = [];

    // Run each test case
    for (const testCase of proposal.testing.testCases) {
      const result = await this.runTestCase(proposal, testCase);
      results.push(result);
    }

    // Calculate metrics
    const passedTests = results.filter(r => r.passed).length;
    const passRate = results.length > 0 ? passedTests / results.length : 0;
    const avgQuality =
      results.length > 0 ? results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length : 0;
    const avgLatency =
      results.length > 0 ? results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length : 0;

    // Evaluate against criteria
    const criteria = proposal.testing.successCriteria;
    const passed =
      passRate >= 0.8 && // At least 80% of tests pass
      avgQuality >= criteria.minQualityScore &&
      results.every(r => !r.error || r.passed); // No critical failures

    const recommendation = this.generateRecommendation(passed, {
      passRate,
      avgQuality,
      avgLatency,
      criteria,
      results,
    });

    console.log(
      `[AgentCreator] Test results for ${proposal.id}: passed=${passed}, passRate=${(passRate * 100).toFixed(1)}%, avgQuality=${avgQuality.toFixed(1)}`
    );

    return {
      passed,
      results,
      recommendation,
      metrics: {
        passRate,
        avgQuality,
        avgLatency,
      },
    };
  }

  /**
   * Deploy an approved agent to the system
   */
  async deployAgent(proposal: AgentProposal): Promise<{
    success: boolean;
    agentId: string;
    promptId: string;
  }> {
    console.log(`[AgentCreator] Deploying agent from proposal ${proposal.id}`);

    // 1. Generate agent ID from name
    const agentId = this.generateAgentId(proposal.identity.name);

    // 2. Create prompt in database
    const prompt = await this.promptService.createPrompt({
      agentId,
      systemPrompt: proposal.definition.systemPrompt,
      name: `${proposal.identity.name} v1.0`,
      outputSchema: proposal.definition.outputSchema,
      changeNotes: `New agent created for: ${proposal.justification.gapDetected}`,
      metadata: {
        proposal_id: proposal.id,
        capabilities: proposal.definition.capabilities,
        dependencies: proposal.definition.dependencies,
        phase: proposal.identity.phase,
        tier: proposal.identity.tier,
        created_by: 'evolution_engine',
      },
    });

    // 3. Activate the prompt
    await this.promptService.activatePrompt(prompt.id, 'evolution_engine');

    // 4. Update proposal status
    proposal.status = 'deployed';
    proposal.updatedAt = new Date();

    console.log(`[AgentCreator] Deployed agent ${agentId} with prompt ${prompt.id}`);

    return {
      success: true,
      agentId,
      promptId: prompt.id,
    };
  }

  /**
   * Get the agent definition for registry integration
   */
  getAgentDefinition(proposal: AgentProposal): Partial<AgentDefinition> {
    return {
      id: this.generateAgentId(proposal.identity.name) as any,
      name: proposal.identity.name,
      description: proposal.identity.description,
      phase: proposal.identity.phase as any,
      tier: proposal.identity.tier,
      systemPrompt: proposal.definition.systemPrompt,
      outputSchema: proposal.definition.outputSchema as unknown as OutputSchema,
      dependencies: proposal.definition.dependencies as any[],
      optional: true, // New agents start as optional
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - AGENT DESIGN
  // ==========================================================================

  private async generateAgentDesign(
    gap: string,
    context: { userRequests: string[]; relatedAgents: string[]; failedBuilds?: string[] }
  ): Promise<AgentDesign> {
    const prompt = this.buildDesignPrompt(gap, context);

    const response = await this.llmProvider.complete({
      model: 'opus', // Use best model for agent design
      messages: [
        { role: 'system', content: AGENT_DESIGN_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    return this.parseAgentDesign(response, gap);
  }

  private buildDesignPrompt(
    gap: string,
    context: { userRequests: string[]; relatedAgents: string[]; failedBuilds?: string[] }
  ): string {
    return `
## Task: Design a New AI Agent for OLYMPUS

### Capability Gap Detected
${gap}

### User Requests That Couldn't Be Handled
${context.userRequests.length > 0 ? context.userRequests.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'No specific requests recorded'}

### Related Existing Agents
${context.relatedAgents.length > 0 ? context.relatedAgents.join(', ') : 'None identified'}

${context.failedBuilds?.length ? `### Failed Build Examples\n${context.failedBuilds.slice(0, 3).join('\n')}` : ''}

### Available Phases
- discovery: Initial analysis and planning
- design: UI/UX and visual design
- architecture: System and data architecture
- frontend: Frontend implementation
- backend: Backend implementation
- integration: External integrations
- testing: Quality assurance
- deployment: Build and deploy

### Tier Guidelines
- opus: Complex reasoning, critical decisions, system design
- sonnet: Balanced quality/speed, most agents
- haiku: Fast execution, simple tasks, validation

### Instructions

Design a new agent to fill this capability gap. Respond with valid JSON:

\`\`\`json
{
  "name": "AGENT_NAME",
  "description": "Clear description of what this agent does",
  "phase": "integration",
  "tier": "sonnet",
  "systemPrompt": "You are AGENT_NAME, a specialized agent in the OLYMPUS system...",
  "outputSchema": {
    "type": "object",
    "required": ["result"],
    "properties": {
      "result": { "type": "string" },
      "metadata": { "type": "object" }
    }
  },
  "dependencies": ["gateway"],
  "capabilities": ["capability1", "capability2"],
  "expectedValue": "How this agent will help users"
}
\`\`\`

Requirements:
- The name should be descriptive but concise (e.g., PAYMENTS, VIDEO_PROCESSOR)
- The system prompt should be comprehensive (500-1000 words)
- Include specific instructions for the agent's domain
- Define a clear output schema
- List any agent dependencies (agents that must run before this one)
`;
  }

  private parseAgentDesign(response: string, gap: string): AgentDesign {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        // FIX 3.3: Use safeJsonParse to prevent prototype pollution
        return safeJsonParse<AgentDesign>(jsonMatch[1]);
      }

      // Try to find raw JSON
      const rawJsonMatch = response.match(/\{[\s\S]*"name"[\s\S]*"systemPrompt"[\s\S]*\}/);
      if (rawJsonMatch) {
        // FIX 3.3: Use safeJsonParse to prevent prototype pollution
        return safeJsonParse<AgentDesign>(rawJsonMatch[0]);
      }

      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('[AgentCreator] Failed to parse agent design:', error);

      // Return a fallback design
      return this.createFallbackDesign(gap);
    }
  }

  private createFallbackDesign(gap: string): AgentDesign {
    const name = gap
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .substring(0, 20);

    return {
      name,
      description: `Agent to handle: ${gap}`,
      phase: 'integration',
      tier: 'sonnet',
      systemPrompt: `You are ${name}, a specialized agent in the OLYMPUS system.

Your purpose is to handle: ${gap}

Instructions:
1. Analyze the user's request carefully
2. Provide a structured response
3. Include relevant details and recommendations

Always output valid JSON matching the schema.`,
      outputSchema: {
        type: 'object',
        required: ['result', 'success'],
        properties: {
          result: { type: 'string', description: 'The main output' },
          success: { type: 'boolean' },
          details: { type: 'object' },
        },
      },
      dependencies: [],
      capabilities: [gap],
      expectedValue: `Enables handling of ${gap} requests`,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - TEST GENERATION
  // ==========================================================================

  private async generateTestCases(
    design: AgentDesign,
    userRequests: string[],
    gap: string
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Create test cases from user requests
    for (const request of userRequests.slice(0, 3)) {
      const capability = design.capabilities?.[0] ?? 'output';
      testCases.push({
        input: request,
        expectedOutputPattern: `Should produce valid ${capability} related to the request`,
        qualityThreshold: 7,
      });
    }

    // Add generic capability test
    testCases.push({
      input: `Test the ${design.name} agent's core capability: ${gap}`,
      expectedOutputPattern: 'Should produce valid structured output matching the schema',
      qualityThreshold: 6,
    });

    // Add edge case test
    testCases.push({
      input: `Handle an edge case for ${design.name}: minimal input with unusual requirements`,
      expectedOutputPattern: 'Should handle gracefully without errors',
      qualityThreshold: 5,
    });

    return testCases;
  }

  // ==========================================================================
  // PRIVATE METHODS - TEST EXECUTION
  // ==========================================================================

  private async runTestCase(proposal: AgentProposal, testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await this.llmProvider.complete({
        model: proposal.identity.tier,
        messages: [
          { role: 'system', content: proposal.definition.systemPrompt },
          { role: 'user', content: testCase.input },
        ],
        temperature: 0.3, // Lower temperature for testing
      });

      const latencyMs = Date.now() - startTime;

      // Evaluate output quality
      const qualityScore = this.evaluateOutput(response, testCase, proposal);
      const passed = qualityScore >= testCase.qualityThreshold;

      return {
        testCase,
        passed,
        qualityScore,
        output: response.substring(0, 1000), // Truncate for storage
        error: null,
        latencyMs,
      };
    } catch (error: any) {
      return {
        testCase,
        passed: false,
        qualityScore: 0,
        output: null,
        error: error.message,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private evaluateOutput(response: string, testCase: TestCase, proposal: AgentProposal): number {
    let score = 5; // Base score

    // Check if output exists and has content
    if (!response || response.length < 50) {
      return 2;
    }

    // Check for valid JSON if schema requires it
    if (proposal.definition.outputSchema) {
      try {
        JSON.parse(response);
        score += 2; // Valid JSON
      } catch {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[0]);
            score += 1; // JSON found but not clean
          } catch {
            score -= 1; // No valid JSON
          }
        }
      }
    }

    // Check for expected patterns
    const expectedWords = testCase.expectedOutputPattern.toLowerCase().split(' ');
    const responseWords = response.toLowerCase();
    const matchedWords = expectedWords.filter(
      w => w.length > 3 && responseWords.includes(w)
    ).length;
    const matchRatio = matchedWords / expectedWords.length;

    if (matchRatio > 0.5) score += 2;
    else if (matchRatio > 0.25) score += 1;

    // Check response completeness
    if (response.length > 200) score += 0.5;
    if (response.length > 500) score += 0.5;

    return Math.min(10, Math.max(0, score));
  }

  // ==========================================================================
  // PRIVATE METHODS - HELPERS
  // ==========================================================================

  private generateAgentId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private getDefaultSuccessCriteria(): AgentSuccessCriteria {
    return {
      minQualityScore: 6.5,
      maxFailureRate: 0.2,
      uniqueValueDemonstrated: true,
    };
  }

  private generateRecommendation(
    passed: boolean,
    metrics: {
      passRate: number;
      avgQuality: number;
      avgLatency: number;
      criteria: AgentSuccessCriteria;
      results: TestResult[];
    }
  ): string {
    if (passed) {
      return `Agent meets quality standards.
- Pass rate: ${(metrics.passRate * 100).toFixed(1)}% (threshold: 80%)
- Average quality: ${metrics.avgQuality.toFixed(1)}/10 (threshold: ${metrics.criteria.minQualityScore})
- Average latency: ${metrics.avgLatency.toFixed(0)}ms
Recommendation: DEPLOY`;
    }

    const issues: string[] = [];

    if (metrics.passRate < 0.8) {
      issues.push(`Low pass rate: ${(metrics.passRate * 100).toFixed(1)}% (need 80%)`);
    }

    if (metrics.avgQuality < metrics.criteria.minQualityScore) {
      issues.push(
        `Low quality: ${metrics.avgQuality.toFixed(1)}/10 (need ${metrics.criteria.minQualityScore})`
      );
    }

    const errors = metrics.results.filter(r => r.error);
    if (errors.length > 0) {
      issues.push(`${errors.length} test(s) had errors`);
    }

    return `Agent needs improvement before deployment.
Issues:
${issues.map(i => `- ${i}`).join('\n')}
Recommendation: REVISE system prompt and re-test`;
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const AGENT_DESIGN_SYSTEM_PROMPT = `You are an expert AI system architect designing new agents for the OLYMPUS code generation system.

OLYMPUS uses specialized agents organized into phases:
- Discovery: Analyze requirements and plan
- Design: UI/UX and visual design
- Architecture: System design and data modeling
- Frontend: React/Next.js implementation
- Backend: API and server implementation
- Integration: External services and APIs
- Testing: Quality assurance
- Deployment: Build and deploy

Each agent has:
- A clear, focused purpose
- A comprehensive system prompt
- A structured output schema
- Dependencies on other agents

Design Principles:
1. SINGLE RESPONSIBILITY - Each agent does one thing well
2. CLEAR OUTPUT - Structured, predictable responses
3. COMPOSABLE - Works with other agents
4. ROBUST - Handles edge cases gracefully
5. EFFICIENT - Appropriate complexity for the task

When designing an agent:
- Be specific about its capabilities
- Define clear input/output contracts
- Consider failure modes
- Think about how it fits with existing agents`;
