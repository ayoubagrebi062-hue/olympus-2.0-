/**
 * SPEC PARSER
 *
 * Parses specification documents (like OLYMPUS_MASTER_BUILD_PROMPT.md) into
 * structured requirements that can be tracked and validated.
 *
 * Supports:
 * - Markdown tables: | # | Path | Name | Priority |
 * - Tree structures: ├── ComponentName
 * - Code blocks with design tokens
 * - YAML frontmatter
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type {
  SpecRequirements,
  SpecMetadata,
  PageRequirement,
  ComponentRequirement,
  DesignSystemRequirement,
  TechStackRequirement,
  FeatureRequirement,
  Priority,
  PageCategory,
  ComponentCategory,
  TypographySpec,
  GlassmorphismSpec,
  SpecParserOptions,
  SpecParserResult,
  ParserError,
  ParserWarning,
  ParseMetadata,
} from './types';
import { DEFAULT_PARSER_OPTIONS } from './types';

// ============================================================================
// SPEC PARSER CLASS
// ============================================================================

export class SpecParser {
  private rawSpec: string;
  private options: SpecParserOptions;
  private sections: Map<string, string>;
  private errors: ParserError[];
  private warnings: ParserWarning[];

  constructor(spec: string, options: Partial<SpecParserOptions> = {}) {
    this.rawSpec = spec;
    this.options = { ...DEFAULT_PARSER_OPTIONS, ...options };
    this.sections = new Map();
    this.errors = [];
    this.warnings = [];
  }

  // ==========================================================================
  // MAIN PARSE METHOD
  // ==========================================================================

  /**
   * Parse the spec into structured requirements
   */
  parse(): SpecParserResult {
    const startTime = Date.now();

    // Reset state
    this.errors = [];
    this.warnings = [];
    this.sections = this.splitIntoSections();

    // Parse each component
    const metadata = this.parseMetadata();
    const pages = this.parsePages();
    const components = this.parseComponents();
    const designSystem = this.parseDesignSystem();
    const techStack = this.parseTechStack();
    const features = this.parseFeatures();
    const constraints = this.parseConstraints();

    const requirements: SpecRequirements = {
      metadata,
      pages,
      components,
      designSystem,
      techStack,
      features,
      constraints,
      rawContent: this.rawSpec,
    };

    // Validate if enabled
    if (this.options.validate) {
      this.validateRequirements(requirements);
    }

    const parseTime = Date.now() - startTime;

    return {
      requirements,
      errors: this.errors,
      warnings: this.warnings,
      parseMetadata: {
        parseTime,
        sectionsFound: this.sections.size,
        pagesExtracted: pages.length,
        componentsExtracted: components.length,
        formatDetected: this.detectFormat(),
      },
    };
  }

  // ==========================================================================
  // SECTION SPLITTING
  // ==========================================================================

  /**
   * Split spec into named sections
   */
  private splitIntoSections(): Map<string, string> {
    const sections = new Map<string, string>();
    const sectionRegex = /^#\s+SECTION\s+(\d+):\s*(.+)$/gim;

    let lastIndex = 0;
    let lastSection: string | null = null;
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(this.rawSpec)) !== null) {
      // Save previous section content
      if (lastSection !== null) {
        const content = this.rawSpec.slice(lastIndex, match.index).trim();
        sections.set(lastSection, content);
      }

      lastSection = `${match[1]}_${match[2].toLowerCase().replace(/\s+/g, '_')}`;
      lastIndex = match.index;
    }

    // Save last section
    if (lastSection !== null) {
      sections.set(lastSection, this.rawSpec.slice(lastIndex).trim());
    }

    // Also extract by H1/H2 headers
    const headerRegex = /^#{1,2}\s+(.+)$/gim;
    while ((match = headerRegex.exec(this.rawSpec)) !== null) {
      const headerName = match[1].toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (!sections.has(headerName)) {
        // Get content until next header
        const nextHeaderMatch = /^#{1,2}\s+/m.exec(
          this.rawSpec.slice(match.index + match[0].length)
        );
        const endIndex = nextHeaderMatch
          ? match.index + match[0].length + nextHeaderMatch.index
          : this.rawSpec.length;
        sections.set(headerName, this.rawSpec.slice(match.index, endIndex).trim());
      }
    }

    return sections;
  }

  // ==========================================================================
  // METADATA PARSING
  // ==========================================================================

  /**
   * Parse spec metadata
   */
  private parseMetadata(): SpecMetadata {
    // Look for YAML frontmatter or BUILD METADATA section
    const yamlMatch = this.rawSpec.match(/```yaml\s*([\s\S]*?)```/);
    const metadata: SpecMetadata = {
      name: 'Unknown Project',
      type: 'unknown',
      totalPages: 0,
      totalComponents: 0,
    };

    if (yamlMatch) {
      const yaml = yamlMatch[1];
      const nameMatch = yaml.match(/project_name:\s*["']?([^"'\n]+)["']?/);
      const typeMatch = yaml.match(/project_type:\s*["']?([^"'\n]+)["']?/);
      const pagesMatch = yaml.match(/total_pages:\s*(\d+)/);
      const componentsMatch = yaml.match(/total_components:\s*(\d+)/);

      if (nameMatch) metadata.name = nameMatch[1].trim();
      if (typeMatch) metadata.type = typeMatch[1].trim();
      if (pagesMatch) metadata.totalPages = parseInt(pagesMatch[1], 10);
      if (componentsMatch) metadata.totalComponents = parseInt(componentsMatch[1], 10);
    }

    // Infer from content if not found
    if (metadata.totalPages === 0) {
      metadata.totalPages = this.countPagesInSpec();
    }
    if (metadata.totalComponents === 0) {
      metadata.totalComponents = this.countComponentsInSpec();
    }

    return metadata;
  }

  // ==========================================================================
  // PAGE PARSING
  // ==========================================================================

  /**
   * Parse pages from spec
   */
  private parsePages(): PageRequirement[] {
    const pages: PageRequirement[] = [];

    // Parse from markdown tables: | # | Path | Name | Priority |
    const tablePages = this.parsePagesFromTables();
    pages.push(...tablePages);

    // Parse from page structure sections
    const sectionPages = this.parsePagesFromSections();
    for (const page of sectionPages) {
      if (!pages.some(p => p.path === page.path)) {
        pages.push(page);
      }
    }

    // Infer missing page data
    if (this.options.inferMissingData) {
      this.inferPageData(pages);
    }

    return pages;
  }

  /**
   * Parse pages from markdown tables
   */
  private parsePagesFromTables(): PageRequirement[] {
    const pages: PageRequirement[] = [];

    // Match tables with Path column
    const tableRegex =
      /\|[^|]*#[^|]*\|[^|]*Path[^|]*\|[^|]*Name[^|]*\|[^|]*Priority[^|]*\|[\s\S]*?(?=\n\n|\n#|$)/gi;
    const tables = Array.from(this.rawSpec.matchAll(tableRegex));

    for (const tableMatch of tables) {
      const tableContent = tableMatch[0];
      const rows = tableContent
        .split('\n')
        .filter(row => row.includes('|') && !row.includes('---'));

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row
          .split('|')
          .map(c => c.trim())
          .filter(c => c);

        if (cells.length >= 4) {
          const path = cells[1].replace(/`/g, '').trim();
          const name = cells[2].trim();
          const priority = this.parsePriority(cells[3]);

          if (path && path.startsWith('/')) {
            pages.push({
              path,
              name,
              priority,
              sections: [],
              components: [],
              authRequired: this.inferAuthRequired(path),
              category: this.inferPageCategory(path),
              expectedFilePath: this.pathToFilePath(path),
            });
          }
        }
      }
    }

    return pages;
  }

  /**
   * Parse pages from section content
   */
  private parsePagesFromSections(): PageRequirement[] {
    const pages: PageRequirement[] = [];

    // Look for page definitions in numbered lists
    const pageListRegex = /\|\s*(\d+)\s*\|\s*`?([/\w[\]-]+)`?\s*\|\s*([^|]+)\s*\|\s*(P\d)/g;
    let match: RegExpExecArray | null;

    while ((match = pageListRegex.exec(this.rawSpec)) !== null) {
      const path = match[2].trim();
      const name = match[3].trim();
      const priority = this.parsePriority(match[4]);

      if (!pages.some(p => p.path === path)) {
        pages.push({
          path,
          name,
          priority,
          sections: this.extractPageSections(path),
          components: [],
          authRequired: this.inferAuthRequired(path),
          category: this.inferPageCategory(path),
          expectedFilePath: this.pathToFilePath(path),
        });
      }
    }

    return pages;
  }

  /**
   * Extract sections for a page
   */
  private extractPageSections(pagePath: string): string[] {
    const sections: string[] = [];

    // Look for section definitions in spec
    const pageName = pagePath.split('/').pop() || pagePath;
    const sectionRegex = new RegExp(
      `${pageName}[\\s\\S]*?(?:sections?|contains?):\\s*([\\s\\S]*?)(?=\\n\\n|$)`,
      'i'
    );
    const match = this.rawSpec.match(sectionRegex);

    if (match) {
      const sectionList = match[1];
      const items = sectionList.match(/[-•*]\s*([^\n]+)/g);
      if (items) {
        sections.push(...items.map(item => item.replace(/[-•*]\s*/, '').trim()));
      }
    }

    return sections;
  }

  // ==========================================================================
  // COMPONENT PARSING
  // ==========================================================================

  /**
   * Parse components from spec
   */
  private parseComponents(): ComponentRequirement[] {
    const components: ComponentRequirement[] = [];

    // Parse from tree structures: ├── ComponentName
    const treeComponents = this.parseComponentsFromTree();
    components.push(...treeComponents);

    // Parse from component lists
    const listComponents = this.parseComponentsFromLists();
    for (const comp of listComponents) {
      if (!components.some(c => c.name === comp.name)) {
        components.push(comp);
      }
    }

    // Parse from section content
    const sectionComponents = this.parseComponentsFromSections();
    for (const comp of sectionComponents) {
      if (!components.some(c => c.name === comp.name)) {
        components.push(comp);
      }
    }

    return components;
  }

  /**
   * Parse components from tree structures
   */
  private parseComponentsFromTree(): ComponentRequirement[] {
    const components: ComponentRequirement[] = [];

    // Match tree lines: ├── ComponentName or └── ComponentName
    const treeRegex = /[├└─│]\s*(\w+(?:\.tsx?)?)/g;
    let match: RegExpExecArray | null;
    const seenNames = new Set<string>();

    while ((match = treeRegex.exec(this.rawSpec)) !== null) {
      let name = match[1].replace(/\.tsx?$/, '').trim();

      // Convert to PascalCase if lowercase
      if (name.charAt(0) === name.charAt(0).toLowerCase()) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }

      // Skip non-component items (files, folders)
      if (
        seenNames.has(name) ||
        name.length < 2 ||
        /^(src|app|components|ui|lib|utils)$/i.test(name)
      ) {
        continue;
      }

      seenNames.add(name);
      components.push({
        name,
        path: this.inferComponentPath(name),
        category: this.inferComponentCategory(name),
        critical: this.isComponentCritical(name),
        variants: [],
        props: [],
      });
    }

    return components;
  }

  /**
   * Parse components from lists
   */
  private parseComponentsFromLists(): ComponentRequirement[] {
    const components: ComponentRequirement[] = [];

    // Match component patterns in lists
    const listRegex = /[-•*]\s*(\w+)\s*[-–—]\s*([^\n]+)/g;
    let match: RegExpExecArray | null;

    while ((match = listRegex.exec(this.rawSpec)) !== null) {
      const name = match[1].trim();
      const description = match[2].trim();

      // Only include if looks like a component name (PascalCase)
      if (/^[A-Z][a-zA-Z]+$/.test(name)) {
        components.push({
          name,
          path: this.inferComponentPath(name),
          category: this.inferComponentCategory(name),
          critical: this.isComponentCritical(name),
          variants: [],
          props: [],
          description,
        });
      }
    }

    return components;
  }

  /**
   * Parse components from section content
   */
  private parseComponentsFromSections(): ComponentRequirement[] {
    const components: ComponentRequirement[] = [];

    // Look for component section
    const componentSection = this.findSection('component');
    if (componentSection) {
      // Match lines that look like component definitions
      const compDefRegex =
        /(?:^|\n)\s*(?:├|└|-)?\s*(\w+(?:Card|Button|Input|Form|Modal|Header|Footer|Section|Grid|List|Nav|Menu|Avatar|Badge|Progress|Skeleton|Toast|Dialog|Sheet|Tabs?|Table|Chart)?)\s*(?:\([^)]+\))?/gi;
      let match: RegExpExecArray | null;

      while ((match = compDefRegex.exec(componentSection)) !== null) {
        const name = match[1].trim();
        if (/^[A-Z][a-zA-Z]{2,}$/.test(name) && !components.some(c => c.name === name)) {
          components.push({
            name,
            path: this.inferComponentPath(name),
            category: this.inferComponentCategory(name),
            critical: this.isComponentCritical(name),
            variants: this.extractComponentVariants(name, componentSection),
            props: [],
          });
        }
      }
    }

    return components;
  }

  /**
   * Extract variants for a component
   */
  private extractComponentVariants(componentName: string, content: string): string[] {
    const variants: string[] = [];

    // Look for variant mentions
    const variantRegex = new RegExp(`${componentName}[\\s\\S]*?variants?:\\s*([^\\n]+)`, 'i');
    const match = content.match(variantRegex);

    if (match) {
      const variantList = match[1];
      variants.push(
        ...variantList
          .split(/[,;]/)
          .map(v => v.trim())
          .filter(v => v)
      );
    }

    return variants;
  }

  // ==========================================================================
  // DESIGN SYSTEM PARSING
  // ==========================================================================

  /**
   * Parse design system from spec
   */
  private parseDesignSystem(): DesignSystemRequirement {
    const designSystem: DesignSystemRequirement = {
      colors: {},
      typography: {},
      glassmorphism: null,
      gradients: [],
      animations: [],
    };

    if (!this.options.extractDesignTokens) {
      return designSystem;
    }

    // Parse colors
    designSystem.colors = this.parseColors();

    // Parse typography
    designSystem.typography = this.parseTypography();

    // Parse glassmorphism
    designSystem.glassmorphism = this.parseGlassmorphism();

    // Parse gradients
    designSystem.gradients = this.parseGradients();

    // Parse animations
    designSystem.animations = this.parseAnimations();

    return designSystem;
  }

  /**
   * Parse colors from spec
   */
  private parseColors(): Record<string, string> {
    const colors: Record<string, string> = {};

    // Match color definitions
    const colorRegex =
      /(\w+(?:[-_]\w+)?)\s*[:=]\s*['"]?(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))['"]?/gi;
    let match: RegExpExecArray | null;

    while ((match = colorRegex.exec(this.rawSpec)) !== null) {
      const name = match[1].toLowerCase().replace(/[-_]/g, '.');
      const value = match[2];
      colors[name] = value;
    }

    // Also look for TypeScript color objects
    const tsColorRegex = /(\w+):\s*\{[\s\S]*?DEFAULT:\s*['"]?(#[0-9a-fA-F]{3,8})['"]?/gi;
    while ((match = tsColorRegex.exec(this.rawSpec)) !== null) {
      const name = match[1].toLowerCase();
      colors[name] = match[2];
    }

    return colors;
  }

  /**
   * Parse typography from spec
   */
  private parseTypography(): Record<string, TypographySpec> {
    const typography: Record<string, TypographySpec> = {};

    // Match typography definitions in CSS or TypeScript
    const typoRegex =
      /\.text-(\w+)\s*\{[\s\S]*?font-size:\s*([^;]+);[\s\S]*?font-weight:\s*([^;]+);[\s\S]*?line-height:\s*([^;]+);/gi;
    let match: RegExpExecArray | null;

    while ((match = typoRegex.exec(this.rawSpec)) !== null) {
      typography[match[1]] = {
        fontSize: match[2].trim(),
        fontWeight: match[3].trim(),
        lineHeight: match[4].trim(),
      };
    }

    return typography;
  }

  /**
   * Parse glassmorphism settings
   */
  private parseGlassmorphism(): GlassmorphismSpec | null {
    // Check if glassmorphism is mentioned
    const glassMention = this.rawSpec.toLowerCase().includes('glassmorphism');
    if (!glassMention) return null;

    // Look for glassmorphism CSS
    const glassRegex = /\.glass(?:-\w+)?\s*\{([\s\S]*?)\}/i;
    const match = this.rawSpec.match(glassRegex);

    if (match) {
      const css = match[1];
      const bgMatch = css.match(/background:\s*([^;]+)/);
      const backdropMatch = css.match(/backdrop-filter:\s*([^;]+)/);
      const borderMatch = css.match(/border:\s*([^;]+)/);

      return {
        requiredForCards: this.rawSpec.toLowerCase().includes('mandatory for all cards'),
        background: bgMatch ? bgMatch[1].trim() : 'rgba(255, 255, 255, 0.03)',
        backdropFilter: backdropMatch ? backdropMatch[1].trim() : 'blur(20px)',
        border: borderMatch ? borderMatch[1].trim() : '1px solid rgba(255, 255, 255, 0.08)',
      };
    }

    return {
      requiredForCards: true,
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    };
  }

  /**
   * Parse gradient definitions
   */
  private parseGradients(): string[] {
    const gradients: string[] = [];
    const gradientRegex = /linear-gradient\([^)]+\)|radial-gradient\([^)]+\)/gi;
    let match: RegExpExecArray | null;

    while ((match = gradientRegex.exec(this.rawSpec)) !== null) {
      if (!gradients.includes(match[0])) {
        gradients.push(match[0]);
      }
    }

    return gradients;
  }

  /**
   * Parse animation requirements
   */
  private parseAnimations(): string[] {
    const animations: string[] = [];

    // Look for animation mentions
    const animationPatterns = [
      'fadeIn',
      'fadeInUp',
      'fadeInScale',
      'slideIn',
      'stagger',
      'hover',
      'pulse',
      'glow',
    ];

    for (const pattern of animationPatterns) {
      if (this.rawSpec.toLowerCase().includes(pattern.toLowerCase())) {
        animations.push(pattern);
      }
    }

    return animations;
  }

  // ==========================================================================
  // TECH STACK PARSING
  // ==========================================================================

  /**
   * Parse tech stack requirements
   */
  private parseTechStack(): TechStackRequirement {
    const techStack: TechStackRequirement = {
      framework: this.options.defaultFramework,
      language: 'TypeScript',
      styling: 'Tailwind CSS',
      packages: [],
    };

    if (!this.options.extractTechStack) {
      return techStack;
    }

    // Extract from YAML or tech stack section
    const frameworkMatch = this.rawSpec.match(/framework:\s*([^\n]+)/i);
    const languageMatch = this.rawSpec.match(/language:\s*([^\n]+)/i);
    const stylingMatch = this.rawSpec.match(/styling:\s*([^\n]+)/i);
    const componentsMatch = this.rawSpec.match(/components?:\s*(shadcn|[^\n]+)/i);
    const animationMatch = this.rawSpec.match(/animations?:\s*([^\n]+)/i);
    const stateMatch = this.rawSpec.match(/state:\s*([^\n]+)/i);
    const formsMatch = this.rawSpec.match(/forms?:\s*([^\n]+)/i);

    if (frameworkMatch) {
      techStack.framework = frameworkMatch[1].trim().toLowerCase().replace(/\s+/g, '');
    }
    if (languageMatch) {
      techStack.language = languageMatch[1].trim();
    }
    if (stylingMatch) {
      techStack.styling = stylingMatch[1].trim();
    }
    if (componentsMatch) {
      techStack.componentLibrary = componentsMatch[1].trim();
    }
    if (animationMatch) {
      techStack.animationLibrary = animationMatch[1].trim();
    }
    if (stateMatch) {
      techStack.stateManagement = stateMatch[1].trim();
    }
    if (formsMatch) {
      techStack.formHandling = formsMatch[1].trim();
    }

    // Extract packages from npm install commands
    const npmRegex = /npm install\s+([^\n]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = npmRegex.exec(this.rawSpec)) !== null) {
      const packages = match[1].split(/\s+/).filter(p => !p.startsWith('-'));
      techStack.packages.push(...packages);
    }

    return techStack;
  }

  // ==========================================================================
  // FEATURE PARSING
  // ==========================================================================

  /**
   * Parse feature requirements
   */
  private parseFeatures(): FeatureRequirement[] {
    const features: FeatureRequirement[] = [];

    // Look for feature definitions
    const featureRegex =
      /(?:feature|capability):\s*([^\n]+)[\s\S]*?(?:description|details?):\s*([^\n]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = featureRegex.exec(this.rawSpec)) !== null) {
      features.push({
        name: match[1].trim(),
        description: match[2].trim(),
        priority: 'P1',
        relatedPages: [],
        relatedComponents: [],
      });
    }

    return features;
  }

  // ==========================================================================
  // CONSTRAINT PARSING
  // ==========================================================================

  /**
   * Parse constraints
   */
  private parseConstraints(): string[] {
    const constraints: string[] = [];

    // Look for constraint markers
    const constraintPatterns = [
      /MUST\s+([^.]+)/gi,
      /NEVER\s+([^.]+)/gi,
      /ALWAYS\s+([^.]+)/gi,
      /REQUIRED:\s*([^.]+)/gi,
      /MANDATORY:\s*([^.]+)/gi,
    ];

    for (const pattern of constraintPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(this.rawSpec)) !== null) {
        const constraint = match[1].trim();
        if (constraint.length > 10 && constraint.length < 200) {
          constraints.push(constraint);
        }
      }
    }

    return constraints;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private parsePriority(text: string): Priority {
    const match = text.match(/P(\d)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num === 0) return 'P0';
      if (num === 1) return 'P1';
      return 'P2';
    }
    return 'P1';
  }

  private inferAuthRequired(path: string): boolean {
    return (
      path.startsWith('/dashboard') || path.startsWith('/settings') || path.startsWith('/account')
    );
  }

  private inferPageCategory(path: string): PageCategory {
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (['/login', '/signup', '/forgot-password', '/reset-password'].includes(path)) return 'auth';
    if (['/privacy', '/terms', '/security', '/legal'].includes(path)) return 'legal';
    if (path === '/' || ['/features', '/pricing', '/about', '/contact'].includes(path))
      return 'public';
    return 'other';
  }

  private pathToFilePath(routePath: string): string {
    // Convert route path to Next.js App Router file path
    if (routePath === '/') return 'src/app/page.tsx';
    const segments = routePath.slice(1).split('/');
    return `src/app/${segments.join('/')}/page.tsx`;
  }

  private inferComponentPath(name: string): string {
    const category = this.inferComponentCategory(name);
    const fileName = this.toKebabCase(name);

    switch (category) {
      case 'landing':
        return `src/components/landing/${fileName}.tsx`;
      case 'dashboard':
        return `src/components/dashboard/${fileName}.tsx`;
      case 'navigation':
        return `src/components/navigation/${fileName}.tsx`;
      case 'forms':
        return `src/components/forms/${fileName}.tsx`;
      case 'core-ui':
        return `src/components/ui/${fileName}.tsx`;
      default:
        return `src/components/${fileName}.tsx`;
    }
  }

  private inferComponentCategory(name: string): ComponentCategory {
    const nameLower = name.toLowerCase();

    if (/hero|socialproof|pricing|testimonial|feature|cta|trust/.test(nameLower)) return 'landing';
    if (/dashboard|build|agent|stats|progress|quality/.test(nameLower)) return 'dashboard';
    if (/nav|menu|sidebar|breadcrumb|tab/.test(nameLower)) return 'navigation';
    if (/form|input|select|checkbox|switch|radio/.test(nameLower)) return 'forms';
    if (/button|card|badge|avatar|skeleton|toast|dialog|sheet/.test(nameLower)) return 'core-ui';
    if (/layout|container|section|grid|stack/.test(nameLower)) return 'layout';
    if (/toast|alert|notification|modal/.test(nameLower)) return 'feedback';

    return 'other';
  }

  private isComponentCritical(name: string): boolean {
    const criticalComponents = [
      'Hero',
      'Button',
      'Card',
      'Input',
      'Layout',
      'Navbar',
      'Footer',
      'DashboardLayout',
      'BuildProgress',
      'AgentCard',
    ];
    return criticalComponents.includes(name);
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private countPagesInSpec(): number {
    const tableMatches = this.rawSpec.match(/\|\s*\/[^|]+\|/g);
    return tableMatches ? tableMatches.length : 0;
  }

  private countComponentsInSpec(): number {
    const treeMatches = this.rawSpec.match(/[├└]\s*\w+/g);
    return treeMatches ? treeMatches.length : 0;
  }

  private detectFormat(): 'markdown' | 'yaml' | 'json' | 'mixed' {
    const hasMarkdown = this.rawSpec.includes('#') && this.rawSpec.includes('|');
    const hasYaml = this.rawSpec.includes('```yaml');
    const hasJson = this.rawSpec.includes('```json');

    if (hasYaml && hasMarkdown) return 'mixed';
    if (hasJson && hasMarkdown) return 'mixed';
    if (hasYaml) return 'yaml';
    if (hasJson) return 'json';
    return 'markdown';
  }

  private findSection(keyword: string): string | null {
    const entries = Array.from(this.sections.entries());
    for (const [name, content] of entries) {
      if (name.toLowerCase().includes(keyword.toLowerCase())) {
        return content;
      }
    }
    return null;
  }

  private inferPageData(pages: PageRequirement[]): void {
    for (const page of pages) {
      // Infer sections from common patterns
      if (page.sections.length === 0) {
        if (page.path === '/') {
          page.sections = [
            'hero',
            'social-proof',
            'how-it-works',
            'features',
            'pricing',
            'testimonials',
            'cta',
            'footer',
          ];
        } else if (page.path === '/pricing') {
          page.sections = ['hero', 'pricing-cards', 'comparison', 'faq', 'cta'];
        } else if (page.path === '/dashboard') {
          page.sections = ['welcome', 'quick-build', 'stats', 'recent-builds'];
        }
      }
    }
  }

  private validateRequirements(requirements: SpecRequirements): void {
    // Validate pages
    if (requirements.pages.length === 0) {
      this.warnings.push({
        type: 'incomplete',
        message: 'No pages were extracted from the spec',
        section: 'pages',
      });
    }

    // Check for duplicate paths
    const paths = new Set<string>();
    for (const page of requirements.pages) {
      if (paths.has(page.path)) {
        this.warnings.push({
          type: 'ambiguous',
          message: `Duplicate page path: ${page.path}`,
          section: 'pages',
        });
      }
      paths.add(page.path);
    }

    // Validate components
    if (requirements.components.length === 0) {
      this.warnings.push({
        type: 'incomplete',
        message: 'No components were extracted from the spec',
        section: 'components',
      });
    }

    // Validate design system
    if (Object.keys(requirements.designSystem.colors).length === 0) {
      this.warnings.push({
        type: 'incomplete',
        message: 'No color tokens were extracted',
        section: 'design-system',
      });
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Parse a spec string into requirements
 */
export function parseSpec(spec: string, options?: Partial<SpecParserOptions>): SpecParserResult {
  const parser = new SpecParser(spec, options);
  return parser.parse();
}
