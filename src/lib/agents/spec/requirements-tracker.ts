/**
 * REQUIREMENTS TRACKER
 *
 * Tracks generated files against spec requirements to calculate completion percentages.
 * Used to detect when builds claim 100% but only generate 3 pages instead of 18.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type {
  SpecRequirements,
  PageRequirement,
  ComponentRequirement,
  GeneratedFile,
  CompletionReport,
  CompletionDetail,
  MissingRequirements,
} from './types';

// ============================================================================
// REQUIREMENTS TRACKER CLASS
// ============================================================================

export class RequirementsTracker {
  private spec: SpecRequirements | null = null;
  private generatedPages: Map<string, GeneratedFile> = new Map();
  private generatedComponents: Map<string, GeneratedFile> = new Map();
  private allGeneratedFiles: Map<string, GeneratedFile> = new Map();
  private initialized = false;

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize tracker with spec requirements
   */
  initialize(spec: SpecRequirements): void {
    this.spec = spec;
    this.generatedPages.clear();
    this.generatedComponents.clear();
    this.allGeneratedFiles.clear();
    this.initialized = true;
  }

  /**
   * Check if tracker is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.spec !== null;
  }

  /**
   * Get the loaded spec
   */
  getSpec(): SpecRequirements | null {
    return this.spec;
  }

  // ==========================================================================
  // FILE TRACKING
  // ==========================================================================

  /**
   * Track a generated file
   */
  trackGeneratedFile(path: string, content: string): void {
    if (!this.spec) {
      throw new Error('RequirementsTracker not initialized. Call initialize() first.');
    }

    const normalizedPath = this.normalizePath(path);
    const now = new Date();

    // Store in all files
    const fileRecord: GeneratedFile = {
      path: normalizedPath,
      content,
      matchConfidence: 0,
      trackedAt: now,
    };

    this.allGeneratedFiles.set(normalizedPath, fileRecord);

    // Try to match to a page requirement
    const matchedPage = this.matchToPage(normalizedPath, content);
    if (matchedPage) {
      fileRecord.matchedRequirement = matchedPage.requirement;
      fileRecord.matchConfidence = matchedPage.confidence;
      this.generatedPages.set(matchedPage.requirement.path, fileRecord);
      return;
    }

    // Try to match to a component requirement
    const matchedComponent = this.matchToComponent(normalizedPath, content);
    if (matchedComponent) {
      fileRecord.matchedRequirement = matchedComponent.requirement;
      fileRecord.matchConfidence = matchedComponent.confidence;
      this.generatedComponents.set(matchedComponent.requirement.name, fileRecord);
    }
  }

  /**
   * Track multiple files at once
   */
  trackMultipleFiles(files: Array<{ path: string; content: string }>): void {
    for (const file of files) {
      this.trackGeneratedFile(file.path, file.content);
    }
  }

  /**
   * Match a file path to a page requirement
   */
  private matchToPage(
    filePath: string,
    _content: string
  ): { requirement: PageRequirement; confidence: number } | null {
    if (!this.spec) return null;

    for (const page of this.spec.pages) {
      // Direct path match
      if (this.pathsMatch(filePath, page.expectedFilePath)) {
        return { requirement: page, confidence: 1.0 };
      }

      // Fuzzy path match
      const routeBasedPath = this.routeToFilePath(page.path);
      if (this.pathsMatch(filePath, routeBasedPath)) {
        return { requirement: page, confidence: 0.95 };
      }

      // Check if file path contains the route segments
      const routeSegments = page.path.split('/').filter(s => s && !s.startsWith('['));
      const pathSegments = filePath.toLowerCase().split(/[/\\]/);
      const matchingSegments = routeSegments.filter(seg =>
        pathSegments.some(ps => ps.includes(seg.toLowerCase()))
      );

      if (matchingSegments.length === routeSegments.length && filePath.endsWith('page.tsx')) {
        return { requirement: page, confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * Match a file path to a component requirement
   */
  private matchToComponent(
    filePath: string,
    content: string
  ): { requirement: ComponentRequirement; confidence: number } | null {
    if (!this.spec) return null;

    const fileName = this.extractFileName(filePath);
    const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?)$/, '');

    for (const component of this.spec.components) {
      // Direct path match
      if (this.pathsMatch(filePath, component.path)) {
        return { requirement: component, confidence: 1.0 };
      }

      // File name matches component name (kebab-case to PascalCase)
      const componentKebab = this.toKebabCase(component.name);
      if (
        fileNameNoExt === componentKebab ||
        fileNameNoExt.toLowerCase() === component.name.toLowerCase()
      ) {
        return { requirement: component, confidence: 0.9 };
      }

      // Check if content exports the component name
      const exportMatch = content.match(
        new RegExp(
          `export\\s+(?:default\\s+)?(?:function|const|class)\\s+${component.name}\\b`,
          'i'
        )
      );
      if (exportMatch) {
        return { requirement: component, confidence: 0.85 };
      }
    }

    return null;
  }

  // ==========================================================================
  // COMPLETION REPORTS
  // ==========================================================================

  /**
   * Get page completion report
   */
  getPageCompletion(): CompletionReport {
    if (!this.spec) {
      return this.createEmptyReport();
    }

    const details: CompletionDetail[] = [];
    let completed = 0;
    let partial = 0;
    let missing = 0;

    for (const page of this.spec.pages) {
      const generated = this.generatedPages.get(page.path);

      if (generated) {
        const issues = this.validatePageContent(page, generated.content);
        const status = issues.length === 0 ? 'completed' : 'partial';

        if (status === 'completed') {
          completed++;
        } else {
          partial++;
        }

        details.push({
          requirement: page,
          status,
          generatedPath: generated.path,
          confidence: generated.matchConfidence,
          issues,
        });
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

    return {
      total,
      completed,
      partial,
      missing,
      percentage,
      details,
    };
  }

  /**
   * Get component completion report
   */
  getComponentCompletion(): CompletionReport {
    if (!this.spec) {
      return this.createEmptyReport();
    }

    const details: CompletionDetail[] = [];
    let completed = 0;
    let partial = 0;
    let missing = 0;

    for (const component of this.spec.components) {
      const generated = this.generatedComponents.get(component.name);

      if (generated) {
        const issues = this.validateComponentContent(component, generated.content);
        const status = issues.length === 0 ? 'completed' : 'partial';

        if (status === 'completed') {
          completed++;
        } else {
          partial++;
        }

        details.push({
          requirement: component,
          status,
          generatedPath: generated.path,
          confidence: generated.matchConfidence,
          issues,
        });
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

    return {
      total,
      completed,
      partial,
      missing,
      percentage,
      details,
    };
  }

  /**
   * Get design system completion
   */
  getDesignSystemCompletion(): number {
    if (!this.spec) return 0;

    const { designSystem } = this.spec;
    let totalTokens = 0;
    let foundTokens = 0;

    // Check colors
    const colorKeys = Object.keys(designSystem.colors);
    totalTokens += colorKeys.length;

    // Check if colors are used in generated files
    const allFiles = Array.from(this.allGeneratedFiles.values());
    for (const colorKey of colorKeys) {
      const colorValue = designSystem.colors[colorKey];
      for (const file of allFiles) {
        if (file.content.includes(colorValue) || file.content.includes(colorKey)) {
          foundTokens++;
          break;
        }
      }
    }

    // Check glassmorphism
    if (designSystem.glassmorphism) {
      totalTokens++;
      for (const file of allFiles) {
        if (
          file.content.includes('backdrop-filter') ||
          file.content.includes('backdrop-blur') ||
          file.content.includes('glass')
        ) {
          foundTokens++;
          break;
        }
      }
    }

    return totalTokens > 0 ? Math.round((foundTokens / totalTokens) * 100) : 100;
  }

  /**
   * Get critical items completion
   */
  getCriticalCompletion(): number {
    if (!this.spec) return 100;

    const criticalPages = this.spec.pages.filter(p => p.priority === 'P0');
    const criticalComponents = this.spec.components.filter(c => c.critical);

    const totalCritical = criticalPages.length + criticalComponents.length;
    if (totalCritical === 0) return 100;

    let completedCritical = 0;

    for (const page of criticalPages) {
      if (this.generatedPages.has(page.path)) {
        completedCritical++;
      }
    }

    for (const component of criticalComponents) {
      if (this.generatedComponents.has(component.name)) {
        completedCritical++;
      }
    }

    return Math.round((completedCritical / totalCritical) * 100);
  }

  // ==========================================================================
  // MISSING REQUIREMENTS
  // ==========================================================================

  /**
   * Get all missing requirements
   */
  getMissingRequirements(): MissingRequirements {
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
      if (!this.generatedPages.has(page.path)) {
        if (page.priority === 'P0') {
          criticalPages.push(page);
        } else {
          otherPages.push(page);
        }
      }
    }

    // Check components
    for (const component of this.spec.components) {
      if (!this.generatedComponents.has(component.name)) {
        if (component.critical) {
          criticalComponents.push(component);
        } else {
          otherComponents.push(component);
        }
      }
    }

    // Check design tokens
    const { designSystem } = this.spec;
    const allFilesForTokens = Array.from(this.allGeneratedFiles.values());
    for (const colorKey of Object.keys(designSystem.colors)) {
      let found = false;
      for (const file of allFilesForTokens) {
        if (file.content.includes(designSystem.colors[colorKey])) {
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
  // VALIDATION HELPERS
  // ==========================================================================

  /**
   * Validate page content against requirements
   */
  private validatePageContent(page: PageRequirement, content: string): string[] {
    const issues: string[] = [];

    // Check for 'use client' directive if needed
    if (this.needsClientDirective(content) && !content.includes("'use client'")) {
      issues.push("Missing 'use client' directive");
    }

    // Check for required sections
    for (const section of page.sections) {
      const sectionNameLower = section.toLowerCase().replace(/[-_\s]/g, '');
      const contentLower = content.toLowerCase().replace(/[-_\s]/g, '');

      if (!contentLower.includes(sectionNameLower)) {
        issues.push(`Missing section: ${section}`);
      }
    }

    // Check for placeholder content
    if (content.includes('TODO') || content.includes('FIXME') || content.includes('placeholder')) {
      issues.push('Contains placeholder content');
    }

    return issues;
  }

  /**
   * Validate component content against requirements
   */
  private validateComponentContent(component: ComponentRequirement, content: string): string[] {
    const issues: string[] = [];

    // Check for 'use client' directive if needed
    if (this.needsClientDirective(content) && !content.includes("'use client'")) {
      issues.push("Missing 'use client' directive");
    }

    // Check for component export
    const exportPattern = new RegExp(
      `export\\s+(?:default\\s+)?(?:function|const)\\s+${component.name}\\b`
    );
    if (!exportPattern.test(content)) {
      issues.push(`Missing export for ${component.name}`);
    }

    // Check for required variants
    for (const variant of component.variants) {
      if (!content.toLowerCase().includes(variant.toLowerCase())) {
        issues.push(`Missing variant: ${variant}`);
      }
    }

    // Check for placeholder content
    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push('Contains placeholder content');
    }

    return issues;
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
      'useReducer',
      'useCallback',
      'useMemo',
      'onClick',
      'onChange',
      'onSubmit',
      'onKeyDown',
      'onMouseEnter',
      'framer-motion',
      "from 'framer-motion'",
    ];

    return clientIndicators.some(indicator => content.includes(indicator));
  }

  // ==========================================================================
  // PATH UTILITIES
  // ==========================================================================

  /**
   * Normalize a file path
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  }

  /**
   * Check if two paths match
   */
  private pathsMatch(path1: string, path2: string): boolean {
    const norm1 = this.normalizePath(path1);
    const norm2 = this.normalizePath(path2);
    return norm1 === norm2 || norm1.endsWith(norm2) || norm2.endsWith(norm1);
  }

  /**
   * Convert route path to file path
   */
  private routeToFilePath(routePath: string): string {
    if (routePath === '/') return 'src/app/page.tsx';
    const segments = routePath.slice(1).split('/');
    return `src/app/${segments.join('/')}/page.tsx`;
  }

  /**
   * Extract file name from path
   */
  private extractFileName(path: string): string {
    const segments = path.split(/[/\\]/);
    return segments[segments.length - 1] || '';
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Create an empty completion report
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

  // ==========================================================================
  // SUMMARY & STATS
  // ==========================================================================

  /**
   * Get overall summary
   */
  getSummary(): {
    pages: CompletionReport;
    components: CompletionReport;
    designSystem: number;
    critical: number;
    overall: number;
  } {
    const pages = this.getPageCompletion();
    const components = this.getComponentCompletion();
    const designSystem = this.getDesignSystemCompletion();
    const critical = this.getCriticalCompletion();

    // Weighted overall score
    const overall = Math.round(
      pages.percentage * 0.4 + components.percentage * 0.4 + designSystem * 0.1 + critical * 0.1
    );

    return {
      pages,
      components,
      designSystem,
      critical,
      overall,
    };
  }

  /**
   * Get tracking stats
   */
  getStats(): {
    totalFilesTracked: number;
    matchedPages: number;
    matchedComponents: number;
    unmatchedFiles: number;
  } {
    const matchedPagePaths = new Set(this.generatedPages.keys());
    const matchedComponentNames = new Set(this.generatedComponents.keys());

    let unmatchedFiles = 0;
    const allFilesForStats = Array.from(this.allGeneratedFiles.values());
    for (const file of allFilesForStats) {
      if (!file.matchedRequirement) {
        unmatchedFiles++;
      }
    }

    return {
      totalFilesTracked: this.allGeneratedFiles.size,
      matchedPages: matchedPagePaths.size,
      matchedComponents: matchedComponentNames.size,
      unmatchedFiles,
    };
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.spec = null;
    this.generatedPages.clear();
    this.generatedComponents.clear();
    this.allGeneratedFiles.clear();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let trackerInstance: RequirementsTracker | null = null;

/**
 * Get or create the requirements tracker instance
 */
export function getRequirementsTracker(): RequirementsTracker {
  if (!trackerInstance) {
    trackerInstance = new RequirementsTracker();
  }
  return trackerInstance;
}

/**
 * Reset the tracker instance
 */
export function resetRequirementsTracker(): void {
  if (trackerInstance) {
    trackerInstance.reset();
  }
  trackerInstance = null;
}
