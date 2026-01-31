/**
 * SPEC COMPLIANCE VALIDATOR
 *
 * Validates agent output against spec requirements.
 * Integrates with the JUDGE module to ensure generated code matches the spec.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type {
  SpecRequirements,
  PageRequirement,
  ComponentRequirement,
  SpecComplianceResult,
  ComplianceIssue,
  CompletionReport,
  MissingRequirements,
} from '../../spec/types';

// ============================================================================
// SPEC COMPLIANCE VALIDATOR CLASS
// ============================================================================

export class SpecComplianceValidator {
  private spec: SpecRequirements | null = null;

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize with spec requirements
   */
  initialize(spec: SpecRequirements): void {
    this.spec = spec;
  }

  /**
   * Check if validator is ready
   */
  isInitialized(): boolean {
    return this.spec !== null;
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate output against spec requirements
   */
  validate(generatedFiles: Map<string, string>, agentId?: string): SpecComplianceResult {
    if (!this.spec) {
      throw new Error('SpecComplianceValidator not initialized. Call initialize() first.');
    }

    const pageCompliance = this.validatePages(generatedFiles);
    const componentCompliance = this.validateComponents(generatedFiles);
    const designSystemCompliance = this.validateDesignSystem(generatedFiles);

    const allCriticalPresent = this.checkAllCriticalPresent(generatedFiles);
    const missing = this.getMissingRequirements(generatedFiles);
    const issues = this.collectIssues(pageCompliance, componentCompliance, missing, agentId);

    // Calculate overall compliance
    const overallCompliance = Math.round(
      pageCompliance.percentage * 0.4 +
        componentCompliance.percentage * 0.4 +
        designSystemCompliance * 0.2
    );

    return {
      overallCompliance,
      pageCompliance,
      componentCompliance,
      designSystemCompliance,
      allCriticalPresent,
      missing,
      issues,
    };
  }

  /**
   * Quick validation for a single output
   */
  validateSingleOutput(
    filePath: string,
    content: string,
    expectedType: 'page' | 'component'
  ): { valid: boolean; issues: ComplianceIssue[] } {
    if (!this.spec) {
      return {
        valid: false,
        issues: [
          { type: 'incomplete', severity: 'critical', message: 'Validator not initialized' },
        ],
      };
    }

    const issues: ComplianceIssue[] = [];

    if (expectedType === 'page') {
      const matchedPage = this.findMatchingPage(filePath);
      if (!matchedPage) {
        issues.push({
          type: 'wrong-structure',
          severity: 'major',
          message: `Page ${filePath} does not match any spec requirement`,
        });
      } else {
        const pageIssues = this.validatePageContent(matchedPage, content);
        issues.push(...pageIssues);
      }
    } else {
      const matchedComponent = this.findMatchingComponent(filePath, content);
      if (!matchedComponent) {
        issues.push({
          type: 'wrong-structure',
          severity: 'major',
          message: `Component ${filePath} does not match any spec requirement`,
        });
      } else {
        const componentIssues = this.validateComponentContent(matchedComponent, content);
        issues.push(...componentIssues);
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
    };
  }

  // ==========================================================================
  // PAGE VALIDATION
  // ==========================================================================

  /**
   * Validate all pages against spec
   */
  private validatePages(generatedFiles: Map<string, string>): CompletionReport {
    if (!this.spec) {
      return this.createEmptyReport();
    }

    let completed = 0;
    let partial = 0;
    let missing = 0;
    const details: any[] = [];

    for (const page of this.spec.pages) {
      const generatedPath = this.findGeneratedFile(
        generatedFiles,
        page.expectedFilePath,
        page.path
      );

      if (generatedPath) {
        const content = generatedFiles.get(generatedPath)!;
        const issues = this.validatePageContent(page, content);

        if (issues.length === 0) {
          completed++;
          details.push({
            requirement: page,
            status: 'completed',
            generatedPath,
            confidence: 1,
            issues: [],
          });
        } else {
          partial++;
          details.push({
            requirement: page,
            status: 'partial',
            generatedPath,
            confidence: 0.7,
            issues: issues.map(i => i.message),
          });
        }
      } else {
        missing++;
        details.push({
          requirement: page,
          status: 'missing',
          confidence: 0,
          issues: ['Page not generated'],
        });
      }
    }

    const total = this.spec.pages.length;
    const percentage = total > 0 ? Math.round(((completed + partial * 0.5) / total) * 100) : 0;

    return { total, completed, partial, missing, percentage, details };
  }

  /**
   * Validate page content
   */
  private validatePageContent(page: PageRequirement, content: string): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Check for required sections
    for (const section of page.sections) {
      const sectionLower = section.toLowerCase().replace(/[-_\s]/g, '');
      const contentLower = content.toLowerCase().replace(/[-_\s]/g, '');

      if (!contentLower.includes(sectionLower)) {
        issues.push({
          type: 'incomplete',
          severity: 'major',
          message: `Page ${page.name} missing section: ${section}`,
          requirement: page,
          suggestedFix: `Add ${section} section to the page`,
        });
      }
    }

    // Check for client directive if needed
    if (this.needsClientDirective(content) && !content.includes("'use client'")) {
      issues.push({
        type: 'wrong-structure',
        severity: 'major',
        message: `Page ${page.name} missing 'use client' directive`,
        requirement: page,
        suggestedFix: "Add 'use client' at the top of the file",
      });
    }

    // Check for placeholder content
    if (content.includes('TODO:') || content.includes('FIXME:')) {
      issues.push({
        type: 'incomplete',
        severity: 'minor',
        message: `Page ${page.name} contains placeholder content`,
        requirement: page,
      });
    }

    // Check for required components
    for (const componentName of page.components) {
      if (!content.includes(componentName)) {
        issues.push({
          type: 'incomplete',
          severity: 'major',
          message: `Page ${page.name} missing required component: ${componentName}`,
          requirement: page,
          suggestedFix: `Import and use the ${componentName} component`,
        });
      }
    }

    return issues;
  }

  // ==========================================================================
  // COMPONENT VALIDATION
  // ==========================================================================

  /**
   * Validate all components against spec
   */
  private validateComponents(generatedFiles: Map<string, string>): CompletionReport {
    if (!this.spec) {
      return this.createEmptyReport();
    }

    let completed = 0;
    let partial = 0;
    let missing = 0;
    const details: any[] = [];
    const fileEntries = Array.from(generatedFiles.entries());

    for (const component of this.spec.components) {
      let found = false;
      let generatedPath = '';
      let content = '';

      // Search by path
      for (const [path, fileContent] of fileEntries) {
        if (
          this.pathMatches(path, component.path) ||
          this.componentNameInFile(component.name, fileContent)
        ) {
          found = true;
          generatedPath = path;
          content = fileContent;
          break;
        }
      }

      if (found) {
        const issues = this.validateComponentContent(component, content);

        if (issues.length === 0) {
          completed++;
          details.push({
            requirement: component,
            status: 'completed',
            generatedPath,
            confidence: 1,
            issues: [],
          });
        } else {
          partial++;
          details.push({
            requirement: component,
            status: 'partial',
            generatedPath,
            confidence: 0.7,
            issues: issues.map(i => i.message),
          });
        }
      } else {
        missing++;
        details.push({
          requirement: component,
          status: 'missing',
          confidence: 0,
          issues: ['Component not generated'],
        });
      }
    }

    const total = this.spec.components.length;
    const percentage = total > 0 ? Math.round(((completed + partial * 0.5) / total) * 100) : 0;

    return { total, completed, partial, missing, percentage, details };
  }

  /**
   * Validate component content
   */
  private validateComponentContent(
    component: ComponentRequirement,
    content: string
  ): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Check for component export
    const exportPattern = new RegExp(
      `export\\s+(?:default\\s+)?(?:function|const)\\s+${component.name}\\b`
    );
    if (!exportPattern.test(content)) {
      issues.push({
        type: 'wrong-structure',
        severity: 'critical',
        message: `Component ${component.name} not properly exported`,
        requirement: component,
        suggestedFix: `Export the component as ${component.name}`,
      });
    }

    // Check for required variants
    for (const variant of component.variants) {
      const variantLower = variant.toLowerCase();
      if (!content.toLowerCase().includes(variantLower)) {
        issues.push({
          type: 'incomplete',
          severity: 'major',
          message: `Component ${component.name} missing variant: ${variant}`,
          requirement: component,
          suggestedFix: `Add ${variant} variant to the component`,
        });
      }
    }

    // Check for required props
    for (const prop of component.props.filter(p => p.required)) {
      if (!content.includes(prop.name)) {
        issues.push({
          type: 'incomplete',
          severity: 'major',
          message: `Component ${component.name} missing required prop: ${prop.name}`,
          requirement: component,
          suggestedFix: `Add ${prop.name}: ${prop.type} prop`,
        });
      }
    }

    // Check for client directive if needed
    if (this.needsClientDirective(content) && !content.includes("'use client'")) {
      issues.push({
        type: 'wrong-structure',
        severity: 'major',
        message: `Component ${component.name} missing 'use client' directive`,
        requirement: component,
      });
    }

    return issues;
  }

  // ==========================================================================
  // DESIGN SYSTEM VALIDATION
  // ==========================================================================

  /**
   * Validate design system usage
   */
  private validateDesignSystem(generatedFiles: Map<string, string>): number {
    if (!this.spec) return 0;

    const { designSystem } = this.spec;
    let totalTokens = 0;
    let foundTokens = 0;
    const fileContents = Array.from(generatedFiles.values());

    // Check colors
    const colorKeys = Object.keys(designSystem.colors);
    totalTokens += colorKeys.length;

    for (const colorKey of colorKeys) {
      const colorValue = designSystem.colors[colorKey];
      for (const content of fileContents) {
        if (content.includes(colorValue) || content.includes(colorKey)) {
          foundTokens++;
          break;
        }
      }
    }

    // Check glassmorphism
    if (designSystem.glassmorphism) {
      totalTokens++;
      for (const content of fileContents) {
        if (
          content.includes('backdrop-filter') ||
          content.includes('backdrop-blur') ||
          content.includes('glass')
        ) {
          foundTokens++;
          break;
        }
      }
    }

    // Check gradients
    for (const gradient of designSystem.gradients) {
      totalTokens++;
      for (const content of fileContents) {
        if (content.includes(gradient) || content.includes('gradient')) {
          foundTokens++;
          break;
        }
      }
    }

    return totalTokens > 0 ? Math.round((foundTokens / totalTokens) * 100) : 100;
  }

  // ==========================================================================
  // CRITICAL ITEMS CHECK
  // ==========================================================================

  /**
   * Check if all critical items are present
   */
  private checkAllCriticalPresent(generatedFiles: Map<string, string>): boolean {
    if (!this.spec) return false;

    // Check critical pages
    const criticalPages = this.spec.pages.filter(p => p.priority === 'P0');
    for (const page of criticalPages) {
      const found = this.findGeneratedFile(generatedFiles, page.expectedFilePath, page.path);
      if (!found) return false;
    }

    // Check critical components
    const criticalComponents = this.spec.components.filter(c => c.critical);
    const fileEntries = Array.from(generatedFiles.entries());
    for (const component of criticalComponents) {
      let found = false;
      for (const [path, content] of fileEntries) {
        if (
          this.pathMatches(path, component.path) ||
          this.componentNameInFile(component.name, content)
        ) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    return true;
  }

  // ==========================================================================
  // MISSING REQUIREMENTS
  // ==========================================================================

  /**
   * Get all missing requirements
   */
  private getMissingRequirements(generatedFiles: Map<string, string>): MissingRequirements {
    if (!this.spec) {
      return {
        criticalPages: [],
        criticalComponents: [],
        otherPages: [],
        otherComponents: [],
        missingDesignTokens: [],
      };
    }

    const criticalPages: PageRequirement[] = [];
    const criticalComponents: ComponentRequirement[] = [];
    const otherPages: PageRequirement[] = [];
    const otherComponents: ComponentRequirement[] = [];
    const missingDesignTokens: string[] = [];

    // Check pages
    for (const page of this.spec.pages) {
      const found = this.findGeneratedFile(generatedFiles, page.expectedFilePath, page.path);
      if (!found) {
        if (page.priority === 'P0') {
          criticalPages.push(page);
        } else {
          otherPages.push(page);
        }
      }
    }

    // Check components
    const compFileEntries = Array.from(generatedFiles.entries());
    for (const component of this.spec.components) {
      let found = false;
      for (const [path, content] of compFileEntries) {
        if (
          this.pathMatches(path, component.path) ||
          this.componentNameInFile(component.name, content)
        ) {
          found = true;
          break;
        }
      }
      if (!found) {
        if (component.critical) {
          criticalComponents.push(component);
        } else {
          otherComponents.push(component);
        }
      }
    }

    // Check design tokens
    const { designSystem } = this.spec;
    const fileContentsForTokens = Array.from(generatedFiles.values());
    for (const colorKey of Object.keys(designSystem.colors)) {
      let found = false;
      for (const content of fileContentsForTokens) {
        if (content.includes(designSystem.colors[colorKey])) {
          found = true;
          break;
        }
      }
      if (!found) {
        missingDesignTokens.push(`color:${colorKey}`);
      }
    }

    return {
      criticalPages,
      criticalComponents,
      otherPages,
      otherComponents,
      missingDesignTokens,
    };
  }

  // ==========================================================================
  // ISSUE COLLECTION
  // ==========================================================================

  /**
   * Collect all issues from validation
   */
  private collectIssues(
    pageCompliance: CompletionReport,
    componentCompliance: CompletionReport,
    missing: MissingRequirements,
    agentId?: string
  ): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Add missing page issues
    for (const page of missing.criticalPages) {
      issues.push({
        type: 'missing-page',
        severity: 'critical',
        message: `Critical page missing: ${page.name} (${page.path})`,
        requirement: page,
        suggestedFix: `Generate page for route ${page.path} at ${page.expectedFilePath}`,
      });
    }

    for (const page of missing.otherPages) {
      issues.push({
        type: 'missing-page',
        severity: 'major',
        message: `Page missing: ${page.name} (${page.path})`,
        requirement: page,
        suggestedFix: `Generate page for route ${page.path}`,
      });
    }

    // Add missing component issues
    for (const component of missing.criticalComponents) {
      issues.push({
        type: 'missing-component',
        severity: 'critical',
        message: `Critical component missing: ${component.name}`,
        requirement: component,
        suggestedFix: `Generate component ${component.name} at ${component.path}`,
      });
    }

    for (const component of missing.otherComponents) {
      issues.push({
        type: 'missing-component',
        severity: 'major',
        message: `Component missing: ${component.name}`,
        requirement: component,
        suggestedFix: `Generate component ${component.name}`,
      });
    }

    // Add design token issues
    for (const token of missing.missingDesignTokens) {
      issues.push({
        type: 'missing-design-token',
        severity: 'minor',
        message: `Design token not used: ${token}`,
        suggestedFix: `Apply ${token} in styles`,
      });
    }

    // Add issues from partial completions
    for (const detail of [...pageCompliance.details, ...componentCompliance.details]) {
      if (detail.status === 'partial' && detail.issues) {
        for (const issue of detail.issues) {
          if (typeof issue === 'string') {
            issues.push({
              type: 'incomplete',
              severity: 'minor',
              message: issue,
              requirement: detail.requirement,
            });
          }
        }
      }
    }

    return issues;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Find a generated file by expected path or route
   */
  private findGeneratedFile(
    generatedFiles: Map<string, string>,
    expectedPath: string,
    routePath: string
  ): string | null {
    const filePaths = Array.from(generatedFiles.keys());

    // Direct path match
    for (const path of filePaths) {
      if (this.pathMatches(path, expectedPath)) {
        return path;
      }
    }

    // Route-based match
    const routeBasedPath = this.routeToFilePath(routePath);
    for (const path of filePaths) {
      if (this.pathMatches(path, routeBasedPath)) {
        return path;
      }
    }

    return null;
  }

  /**
   * Find matching page requirement
   */
  private findMatchingPage(filePath: string): PageRequirement | null {
    if (!this.spec) return null;

    for (const page of this.spec.pages) {
      if (this.pathMatches(filePath, page.expectedFilePath)) {
        return page;
      }
      const routeBasedPath = this.routeToFilePath(page.path);
      if (this.pathMatches(filePath, routeBasedPath)) {
        return page;
      }
    }

    return null;
  }

  /**
   * Find matching component requirement
   */
  private findMatchingComponent(filePath: string, content: string): ComponentRequirement | null {
    if (!this.spec) return null;

    for (const component of this.spec.components) {
      if (this.pathMatches(filePath, component.path)) {
        return component;
      }
      if (this.componentNameInFile(component.name, content)) {
        return component;
      }
    }

    return null;
  }

  /**
   * Check if paths match
   */
  private pathMatches(path1: string, path2: string): boolean {
    const norm1 = path1.replace(/\\/g, '/').toLowerCase();
    const norm2 = path2.replace(/\\/g, '/').toLowerCase();
    return norm1 === norm2 || norm1.endsWith(norm2) || norm2.endsWith(norm1);
  }

  /**
   * Check if component name is in file content
   */
  private componentNameInFile(componentName: string, content: string): boolean {
    const pattern = new RegExp(
      `export\\s+(?:default\\s+)?(?:function|const)\\s+${componentName}\\b`,
      'i'
    );
    return pattern.test(content);
  }

  /**
   * Convert route to file path
   */
  private routeToFilePath(routePath: string): string {
    if (routePath === '/') return 'src/app/page.tsx';
    const segments = routePath.slice(1).split('/');
    return `src/app/${segments.join('/')}/page.tsx`;
  }

  /**
   * Check if content needs 'use client' directive
   */
  private needsClientDirective(content: string): boolean {
    const clientIndicators = [
      'useState',
      'useEffect',
      'useRef',
      'useContext',
      'onClick',
      'onChange',
      'onSubmit',
      'framer-motion',
    ];
    return clientIndicators.some(indicator => content.includes(indicator));
  }

  /**
   * Create empty completion report
   */
  private createEmptyReport(): CompletionReport {
    return {
      total: 0,
      completed: 0,
      partial: 0,
      missing: 0,
      percentage: 0,
      details: [],
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let validatorInstance: SpecComplianceValidator | null = null;

/**
 * Get or create the spec compliance validator instance
 */
export function getSpecComplianceValidator(): SpecComplianceValidator {
  if (!validatorInstance) {
    validatorInstance = new SpecComplianceValidator();
  }
  return validatorInstance;
}

/**
 * Reset the validator instance
 */
export function resetSpecComplianceValidator(): void {
  validatorInstance = null;
}

// ============================================================================
// INTEGRATION WITH JUDGE MODULE
// ============================================================================

/**
 * Validate agent output for spec compliance
 * This is the main integration point with the JUDGE module
 */
export function validateAgentOutputForSpec(
  output: { files: Map<string, string> } | { content: string; path: string },
  spec: SpecRequirements,
  agentId: string
): {
  passed: boolean;
  compliance: number;
  issues: ComplianceIssue[];
  shouldRetry: boolean;
  retryFocus?: string[];
} {
  const validator = new SpecComplianceValidator();
  validator.initialize(spec);

  let files: Map<string, string>;
  if ('files' in output) {
    files = output.files;
  } else {
    files = new Map([[output.path, output.content]]);
  }

  const result = validator.validate(files, agentId);

  // Determine if retry is needed
  const criticalIssues = result.issues.filter(i => i.severity === 'critical');
  const shouldRetry = criticalIssues.length > 0 || result.overallCompliance < 50;

  // Determine what to focus on in retry
  const retryFocus = shouldRetry
    ? [
        ...result.missing.criticalPages.map(p => `page:${p.path}`),
        ...result.missing.criticalComponents.map(c => `component:${c.name}`),
      ].slice(0, 5)
    : undefined;

  return {
    passed: result.allCriticalPresent && result.overallCompliance >= 80,
    compliance: result.overallCompliance,
    issues: result.issues,
    shouldRetry,
    retryFocus,
  };
}
