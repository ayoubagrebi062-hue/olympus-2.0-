/**
 * COMPLETENESS GATE
 *
 * Blocks builds that fail to meet spec requirements.
 * Prevents "false success" where builds claim 100% but only generate 3 pages.
 */

import type {
  SpecRequirements,
  CompletenessGateConfig,
  CompletenessGateResult,
  MissingRequirements,
  RegenerationInstruction,
  PageRequirement,
  ComponentRequirement,
} from './types';
import { DEFAULT_GATE_CONFIG } from './types';
import { RequirementsTracker } from './requirements-tracker';

// ============================================================================
// COMPLETENESS GATE CLASS
// ============================================================================

export class CompletenessGate {
  private config: CompletenessGateConfig;

  constructor(config: Partial<CompletenessGateConfig> = {}) {
    this.config = { ...DEFAULT_GATE_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN GATE CHECK
  // ==========================================================================

  /**
   * Run the completeness gate check
   */
  check(tracker: RequirementsTracker): CompletenessGateResult {
    if (!tracker.isInitialized()) {
      return this.createFailedResult(
        'RequirementsTracker not initialized',
        ['Gate check failed: no spec loaded']
      );
    }

    // Get completion metrics
    const pageCompletion = tracker.getPageCompletion().percentage;
    const componentCompletion = tracker.getComponentCompletion().percentage;
    const criticalCompletion = tracker.getCriticalCompletion();
    const designSystemCompletion = tracker.getDesignSystemCompletion();

    // Get missing requirements
    const missing = tracker.getMissingRequirements();

    // Check gate conditions
    const failureReasons: string[] = [];

    // Check page completion
    if (pageCompletion < this.config.minPageCompletion) {
      failureReasons.push(
        `Page completion ${pageCompletion}% below minimum ${this.config.minPageCompletion}%`
      );
    }

    // Check component completion
    if (componentCompletion < this.config.minComponentCompletion) {
      failureReasons.push(
        `Component completion ${componentCompletion}% below minimum ${this.config.minComponentCompletion}%`
      );
    }

    // Check critical completion
    if (criticalCompletion < this.config.minCriticalCompletion) {
      failureReasons.push(
        `Critical items ${criticalCompletion}% below minimum ${this.config.minCriticalCompletion}%`
      );
    }

    // Check design system completion
    if (designSystemCompletion < this.config.minDesignSystemCompletion) {
      failureReasons.push(
        `Design system ${designSystemCompletion}% below minimum ${this.config.minDesignSystemCompletion}%`
      );
    }

    // Determine if gate passed
    const passed = failureReasons.length === 0;

    // Generate regeneration instructions if enabled
    let regenerationInstructions: RegenerationInstruction[] | undefined;
    if (!passed && this.config.generateRegenInstructions) {
      regenerationInstructions = this.generateRegenerationInstructions(missing);
    }

    // Create summary
    const summary = passed
      ? this.createPassedSummary(pageCompletion, componentCompletion, criticalCompletion)
      : this.createFailedSummary(failureReasons, missing);

    return {
      passed,
      pageCompletion,
      componentCompletion,
      criticalCompletion,
      designSystemCompletion,
      missing,
      regenerationInstructions,
      summary,
      failureReasons,
    };
  }

  /**
   * Quick pass/fail check without full details
   */
  quickCheck(tracker: RequirementsTracker): boolean {
    if (!tracker.isInitialized()) return false;

    const pageCompletion = tracker.getPageCompletion().percentage;
    const componentCompletion = tracker.getComponentCompletion().percentage;
    const criticalCompletion = tracker.getCriticalCompletion();

    return (
      pageCompletion >= this.config.minPageCompletion &&
      componentCompletion >= this.config.minComponentCompletion &&
      criticalCompletion >= this.config.minCriticalCompletion
    );
  }

  // ==========================================================================
  // REGENERATION INSTRUCTIONS
  // ==========================================================================

  /**
   * Generate instructions for regenerating missing items
   */
  private generateRegenerationInstructions(
    missing: MissingRequirements
  ): RegenerationInstruction[] {
    const instructions: RegenerationInstruction[] = [];

    // Critical pages first (highest priority)
    for (const page of missing.criticalPages) {
      instructions.push({
        type: 'page',
        requirement: page,
        suggestedPrompt: this.generatePagePrompt(page),
        priority: 1, // Highest priority
        complexity: this.estimatePageComplexity(page),
      });
    }

    // Critical components second
    for (const component of missing.criticalComponents) {
      instructions.push({
        type: 'component',
        requirement: component,
        suggestedPrompt: this.generateComponentPrompt(component),
        priority: 2,
        complexity: this.estimateComponentComplexity(component),
      });
    }

    // Non-critical pages
    for (const page of missing.otherPages) {
      instructions.push({
        type: 'page',
        requirement: page,
        suggestedPrompt: this.generatePagePrompt(page),
        priority: 3,
        complexity: this.estimatePageComplexity(page),
      });
    }

    // Non-critical components
    for (const component of missing.otherComponents) {
      instructions.push({
        type: 'component',
        requirement: component,
        suggestedPrompt: this.generateComponentPrompt(component),
        priority: 4,
        complexity: this.estimateComponentComplexity(component),
      });
    }

    // Design tokens
    for (const token of missing.missingDesignTokens) {
      instructions.push({
        type: 'design-token',
        requirement: token,
        suggestedPrompt: `Add design token: ${token} to the design system`,
        priority: 5,
        complexity: 'low',
      });
    }

    // Sort by priority
    return instructions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate prompt for a missing page
   */
  private generatePagePrompt(page: PageRequirement): string {
    const sections = page.sections.length > 0
      ? `\nInclude sections: ${page.sections.join(', ')}`
      : '';
    const components = page.components.length > 0
      ? `\nUse components: ${page.components.join(', ')}`
      : '';
    const auth = page.authRequired
      ? '\nRequires authentication.'
      : '';

    return `Generate page: ${page.name}
Route: ${page.path}
File: ${page.expectedFilePath}
Priority: ${page.priority}
Category: ${page.category}${sections}${components}${auth}`;
  }

  /**
   * Generate prompt for a missing component
   */
  private generateComponentPrompt(component: ComponentRequirement): string {
    const variants = component.variants.length > 0
      ? `\nVariants: ${component.variants.join(', ')}`
      : '';
    const props = component.props.length > 0
      ? `\nProps: ${component.props.map(p => `${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join(', ')}`
      : '';
    const critical = component.critical
      ? '\n⚠️ CRITICAL: Must be implemented'
      : '';

    return `Generate component: ${component.name}
File: ${component.path}
Category: ${component.category}${critical}${variants}${props}
${component.description || ''}`;
  }

  /**
   * Estimate complexity for a page
   */
  private estimatePageComplexity(page: PageRequirement): 'low' | 'medium' | 'high' {
    const sectionCount = page.sections.length;
    const componentCount = page.components.length;

    if (page.priority === 'P0' || sectionCount > 5 || componentCount > 5) {
      return 'high';
    }
    if (sectionCount > 2 || componentCount > 2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Estimate complexity for a component
   */
  private estimateComponentComplexity(component: ComponentRequirement): 'low' | 'medium' | 'high' {
    const variantCount = component.variants.length;
    const propCount = component.props.length;

    if (component.critical || variantCount > 3 || propCount > 5) {
      return 'high';
    }
    if (variantCount > 1 || propCount > 2) {
      return 'medium';
    }
    return 'low';
  }

  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================

  /**
   * Create passed summary
   */
  private createPassedSummary(
    pageCompletion: number,
    componentCompletion: number,
    criticalCompletion: number
  ): string {
    return `✅ COMPLETENESS GATE PASSED

Pages:      ${pageCompletion}% (min: ${this.config.minPageCompletion}%)
Components: ${componentCompletion}% (min: ${this.config.minComponentCompletion}%)
Critical:   ${criticalCompletion}% (min: ${this.config.minCriticalCompletion}%)

Build meets all spec requirements.`;
  }

  /**
   * Create failed summary
   */
  private createFailedSummary(
    failureReasons: string[],
    missing: MissingRequirements
  ): string {
    const missingCount =
      missing.criticalPages.length +
      missing.criticalComponents.length +
      missing.otherPages.length +
      missing.otherComponents.length;

    const criticalCount =
      missing.criticalPages.length +
      missing.criticalComponents.length;

    return `❌ COMPLETENESS GATE FAILED

${failureReasons.map(r => `• ${r}`).join('\n')}

Missing Items: ${missingCount} total
  - Critical: ${criticalCount} (MUST FIX)
  - Pages: ${missing.criticalPages.length + missing.otherPages.length}
  - Components: ${missing.criticalComponents.length + missing.otherComponents.length}

${criticalCount > 0 ? '⚠️ CRITICAL ITEMS MISSING - BUILD BLOCKED' : ''}

${this.config.blockOnFailure ? 'Build cannot proceed until requirements are met.' : 'Warning only - build will continue.'}`;
  }

  /**
   * Create failed result helper
   */
  private createFailedResult(
    summary: string,
    failureReasons: string[]
  ): CompletenessGateResult {
    return {
      passed: false,
      pageCompletion: 0,
      componentCompletion: 0,
      criticalCompletion: 0,
      designSystemCompletion: 0,
      missing: {
        criticalPages: [],
        criticalComponents: [],
        otherPages: [],
        otherComponents: [],
        missingDesignTokens: [],
      },
      summary,
      failureReasons,
    };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Update gate configuration
   */
  updateConfig(config: Partial<CompletenessGateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CompletenessGateConfig {
    return { ...this.config };
  }

  /**
   * Check if gate would block the build
   */
  wouldBlock(): boolean {
    return this.config.blockOnFailure;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Run completeness gate with default configuration
 */
export function runCompletenessGate(
  tracker: RequirementsTracker,
  config?: Partial<CompletenessGateConfig>
): CompletenessGateResult {
  const gate = new CompletenessGate(config);
  return gate.check(tracker);
}

/**
 * Quick pass/fail check
 */
export function passesCompletenessGate(
  tracker: RequirementsTracker,
  config?: Partial<CompletenessGateConfig>
): boolean {
  const gate = new CompletenessGate(config);
  return gate.quickCheck(tracker);
}

/**
 * Get regeneration instructions for missing items
 */
export function getRegenerationInstructions(
  tracker: RequirementsTracker
): RegenerationInstruction[] {
  const result = runCompletenessGate(tracker, { generateRegenInstructions: true });
  return result.regenerationInstructions || [];
}

/**
 * Format gate result for display
 */
export function formatGateResult(result: CompletenessGateResult): string {
  let output = result.summary;

  if (!result.passed && result.regenerationInstructions && result.regenerationInstructions.length > 0) {
    output += '\n\n--- REGENERATION INSTRUCTIONS ---\n';

    const critical = result.regenerationInstructions.filter(i => i.priority <= 2);
    const other = result.regenerationInstructions.filter(i => i.priority > 2);

    if (critical.length > 0) {
      output += '\n🔴 CRITICAL (Must Fix):\n';
      for (const instr of critical) {
        const req = instr.requirement;
        const label = typeof req === 'string' ? req :
          ('path' in req ? (req as PageRequirement).path : (req as ComponentRequirement).name);
        output += `  ${instr.type}: ${label}\n`;
      }
    }

    if (other.length > 0) {
      output += '\n🟡 Other Missing:\n';
      for (const instr of other.slice(0, 10)) {
        const req = instr.requirement;
        const label = typeof req === 'string' ? req :
          ('path' in req ? (req as PageRequirement).path : (req as ComponentRequirement).name);
        output += `  ${instr.type}: ${label}\n`;
      }
      if (other.length > 10) {
        output += `  ... and ${other.length - 10} more\n`;
      }
    }
  }

  return output;
}
