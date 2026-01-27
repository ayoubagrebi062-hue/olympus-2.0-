import { conductorRouter } from './conductor/router';
import { getAgentsByPhase, PHASE_ORDER } from './registry';
import { JudgeModule } from './conductor/judge';

/**
 * OLYMPUS 38-Agent Orchestration Logic
 *
 * How prompts are accepted and building is organized across all 38 agents
 */

interface OlympusPrompt {
  userPrompt: string;
  projectType?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  deadline?: Date;
  budget?: number;
  techPreferences?: string[];
}

interface BuildOrchestration {
  projectAnalysis: any;
  phaseSequence: string[];
  agentAssignments: Record<string, string[]>;
  parallelExecution: Record<string, boolean>;
  qualityGates: Record<string, any>;
  timeline: any;
}

class OlympusOrchestrator {
  /**
   * STEP 1: PROMPT ACCEPTANCE & ANALYSIS
   * How agents accept and analyze incoming prompts
   */
  async acceptPrompt(prompt: OlympusPrompt): Promise<BuildOrchestration> {
    console.log('🎯 OLYMPUS: Received prompt:', prompt.userPrompt);

    // Phase 1: Discovery Agents (5 agents - sequential)
    console.log('📊 Phase 1: DISCOVERY - Analyzing project requirements');

    const projectAnalysis = await this.runDiscoveryPhase(prompt);
    const phaseSequence = this.determinePhaseSequence(projectAnalysis);
    const agentAssignments = this.assignAgentsToPhases(phaseSequence, projectAnalysis);

    // Quality Gates Setup
    const qualityGates = this.setupQualityGates(phaseSequence);

    return {
      projectAnalysis,
      phaseSequence,
      agentAssignments,
      parallelExecution: this.getParallelConfig(phaseSequence),
      qualityGates,
      timeline: this.calculateTimeline(phaseSequence, projectAnalysis),
    };
  }

  /**
   * PHASE 1: DISCOVERY - 5 Agents Analyze & Plan
   */
  private async runDiscoveryPhase(prompt: OlympusPrompt) {
    const discoveryAgents = getAgentsByPhase('discovery'); // 5 agents

    console.log('🔍 Running Discovery Agents:');
    for (const agent of discoveryAgents) {
      console.log(`  - ${agent.name}: ${agent.description}`);
    }

    // 1. Oracle: Market research & opportunity analysis
    const oracleAnalysis = await this.runAgent('oracle', {
      task: 'Analyze market opportunity and competitive landscape',
      context: prompt.userPrompt,
    });

    // 2. Empathy: User persona & pain point analysis
    const userAnalysis = await this.runAgent('empathy', {
      task: 'Create detailed user personas and pain point mapping',
      context: oracleAnalysis,
    });

    // 3. Venture: Business model & monetization strategy
    const businessModel = await this.runAgent('venture', {
      task: 'Design business model and revenue streams',
      context: userAnalysis,
    });

    // 4. Strategos: Competitive analysis & positioning
    const strategy = await this.runAgent('strategos', {
      task: 'Develop competitive positioning and market strategy',
      context: businessModel,
    });

    // 5. Scope: Requirements definition & scope management
    const scope = await this.runAgent('scope', {
      task: 'Define detailed requirements and manage project scope',
      context: strategy,
    });

    return {
      oracle: oracleAnalysis,
      empathy: userAnalysis,
      venture: businessModel,
      strategos: strategy,
      scope: scope,
      projectType: conductorRouter.analyzeProjectType(prompt.userPrompt),
      complexity: this.assessComplexity(prompt.userPrompt),
      estimatedHours: this.estimateHours(scope),
    };
  }

  /**
   * PHASE 2: CONVERSION - 3 Agents Optimize for Users
   */
  private async runConversionPhase(analysis: any) {
    console.log('🎯 Phase 2: CONVERSION - Optimizing for user psychology');

    // 1. Psyche: Psychology analysis
    const psychology = await this.runAgent('psyche', {
      task: 'Analyze user psychology and identify conversion triggers',
      context: analysis.empathy,
    });

    // 2. Scribe: Copywriting & messaging
    const copy = await this.runAgent('scribe', {
      task: 'Create compelling copy and messaging strategy',
      context: { psychology, strategy: analysis.strategos },
    });

    // 3. Architect_Conversion: Conversion funnel design
    const funnel = await this.runAgent('architect_conversion', {
      task: 'Design conversion-optimized user flows and funnels',
      context: { copy, analysis },
    });

    return { psychology, copy, funnel };
  }

  /**
   * PHASE 3: DESIGN - 5 Agents Create Visual Experience
   */
  private async runDesignPhase(analysis: any, conversion: any) {
    console.log('🎨 Phase 3: DESIGN - Creating visual experience');

    // Parallel execution where possible
    const [palette, grid, blocks, cartographer, flow] = await Promise.all([
      this.runAgent('palette', { task: 'Design color scheme and branding', context: analysis }),
      this.runAgent('grid', { task: 'Create layout system and spacing', context: analysis }),
      this.runAgent('blocks', { task: 'Design component patterns', context: conversion.funnel }),
      this.runAgent('cartographer', {
        task: 'Map user flows and navigation',
        context: conversion.funnel,
      }),
      this.runAgent('flow', {
        task: 'Design interactions and animations',
        context: conversion.funnel,
      }),
    ]);

    return { palette, grid, blocks, cartographer, flow };
  }

  /**
   * PHASE EXECUTION LOGIC
   */
  private determinePhaseSequence(analysis: any): string[] {
    const basePhases = ['discovery', 'conversion', 'design', 'architecture', 'frontend'];

    // Add backend if needed
    if (analysis.complexity !== 'simple') {
      basePhases.push('backend');
    }

    // Add integration for complex projects
    if (analysis.complexity === 'complex' || analysis.projectType === 'saas-app') {
      basePhases.push('integration');
    }

    // Add testing for professional+ tiers
    if (analysis.complexity === 'complex') {
      basePhases.push('testing');
    }

    // Add deployment for enterprise/complex
    if (analysis.complexity === 'complex' || analysis.estimatedHours > 100) {
      basePhases.push('deployment');
    }

    return basePhases;
  }

  private assignAgentsToPhases(phases: string[], analysis: any): Record<string, string[]> {
    const assignments: Record<string, string[]> = {};

    for (const phase of phases) {
      assignments[phase] = getPhaseAgents(phase, analysis.complexity);
    }

    return assignments;
  }

  private getParallelConfig(phases: string[]): Record<string, boolean> {
    return {
      design: true, // 5 agents can work in parallel
      backend: true, // 4 agents can work in parallel
      integration: true, // 4 agents can work in parallel
      testing: true, // 4 agents can work in parallel
      deployment: true, // 4 agents can work in parallel
      // Discovery, conversion, architecture, frontend are sequential
    };
  }

  private setupQualityGates(phases: string[]): Record<string, any> {
    const gates: Record<string, any> = {};

    // Each phase has quality requirements
    phases.forEach(phase => {
      gates[phase] = {
        minScore: 85,
        requiredChecks: this.getPhaseChecks(phase),
        reviewAgent: 'sentinel', // Quality review agent
        maxRetries: 2,
      };
    });

    return gates;
  }

  private calculateTimeline(phases: string[], analysis: any): any {
    const phaseHours = {
      discovery: 8,
      conversion: 12,
      design: 20,
      architecture: 16,
      frontend: 24,
      backend: 32,
      integration: 16,
      testing: 12,
      deployment: 8,
    };

    const totalHours = phases.reduce((sum, phase) => sum + (phaseHours[phase] || 0), 0);
    const parallelReduction = phases.includes('design') ? 8 : 0; // Parallel work saves time

    return {
      totalHours: totalHours - parallelReduction,
      phases: phaseHours,
      criticalPath: phases,
      estimatedCompletion: new Date(Date.now() + (totalHours - parallelReduction) * 3600000),
    };
  }

  /**
   * AGENT EXECUTION ENGINE
   */
  private async runAgent(agentId: string, task: any): Promise<any> {
    console.log(`🤖 Executing ${agentId}...`);

    // Quality gate check
    const judge = new JudgeModule();
    const canProceed = await judge.evaluateTaskReadiness(agentId, task);

    if (!canProceed.approved) {
      throw new Error(`Quality gate failed for ${agentId}: ${canProceed.reason}`);
    }

    // Execute agent (simplified)
    const result = await this.executeAgentLogic(agentId, task);

    // Quality validation
    const qualityCheck = await judge.validateOutput(agentId, result, task);
    if (!qualityCheck.passed) {
      console.warn(`⚠️ Quality issues in ${agentId}, attempting fix...`);
      // Could trigger fixer agent here
    }

    return result;
  }

  private async executeAgentLogic(agentId: string, task: any): Promise<any> {
    // This would call the actual agent implementation
    // For demo, return mock results
    return {
      agentId,
      task: task.task,
      output: `Completed ${task.task}`,
      confidence: 0.95,
      metadata: { tokensUsed: 1500, processingTime: 5000 },
    };
  }

  private assessComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
    const complexityIndicators = {
      simple: ['basic', 'simple', 'minimal'],
      medium: ['moderate', 'standard', 'typical'],
      complex: ['advanced', 'enterprise', 'comprehensive', 'full-featured'],
    };

    // Analyze prompt for complexity keywords
    const prompt_lower = prompt.toLowerCase();

    if (complexityIndicators.complex.some(word => prompt_lower.includes(word))) return 'complex';
    if (complexityIndicators.medium.some(word => prompt_lower.includes(word))) return 'medium';
    return 'simple';
  }

  private estimateHours(scope: any): number {
    // Base estimation logic
    const baseHours = 40; // Minimum for any project
    const complexityMultiplier = { simple: 1, medium: 1.5, complex: 2.5 };
    return baseHours * complexityMultiplier[scope.complexity || 'medium'];
  }

  private getPhaseChecks(phase: string): string[] {
    const checks = {
      discovery: ['market-analysis', 'user-research', 'business-model'],
      conversion: ['psychology-triggers', 'copy-quality', 'funnel-logic'],
      design: ['visual-consistency', 'ux-flows', 'accessibility'],
      architecture: ['system-design', 'data-modeling', 'security'],
      frontend: ['responsive-design', 'performance', 'interactions'],
      backend: ['api-design', 'data-integrity', 'scalability'],
      integration: ['api-connections', 'data-sync', 'error-handling'],
      testing: ['unit-coverage', 'e2e-flows', 'performance'],
      deployment: ['infrastructure', 'monitoring', 'scaling'],
    };
    return checks[phase] || [];
  }
}

// Export for use
export { OlympusOrchestrator, type OlympusPrompt, type BuildOrchestration };
