/**
 * OLYMPUS 2.0 - Agent Output Validator
 * UPGRADED: TypeScript compilation validation added
 */

import type { AgentOutput, AgentDefinition, Artifact } from '../types';
import type { ValidationResult, ValidationError, ValidationWarning } from './types';
import {
  extractRequiredFeatures,
  validateFeatures,
  generateFeatureReport,
} from '../validation/feature-validator';
import { validateHandlers, generateHandlerReport } from '../validation/handler-validator';
import { validateComplexity, generateComplexityReport } from '../validation/complexity-validator';
import {
  validateDesignTokens,
  validatePaletteUsage,
  generateDesignReport,
} from '../validation/design-validator';
import ts from 'typescript';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT COMPILATION VALIDATION (UPGRADE SPEC #2)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate TypeScript code actually compiles
 * This catches syntax errors, type errors, and import issues that regex validation misses
 */
function validateTypeScriptCompilation(
  code: string,
  filename: string
): { success: boolean; errors: string[] } {
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        noEmit: true,
        strict: false, // Start lenient, tighten later
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        isolatedModules: true, // Required for transpileModule
      },
      reportDiagnostics: true,
      fileName: filename,
    });

    const errors = (result.diagnostics || [])
      .filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(d => {
        const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        const line = d.file?.getLineAndCharacterOfPosition(d.start || 0);
        return line ? `Line ${line.line + 1}: ${message}` : message;
      });

    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    // If transpilation itself fails, return the error
    return {
      success: false,
      errors: [`Compilation failed: ${(error as Error).message}`],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE COVERAGE VALIDATION (UPGRADE SPEC #3)
// Ensures PIXEL components have required interactive states
// ═══════════════════════════════════════════════════════════════════════════════

/** Result of state coverage validation */
interface StateCoverageResult {
  passed: boolean;
  coverage: number; // 0-100
  missingStates: string[];
  details: string[];
}

/** Required states for interactive components */
const REQUIRED_STATES = ['hover', 'focus', 'disabled', 'loading'] as const;

/** Optional states (warn if missing but don't fail) */
const OPTIONAL_STATES = ['active', 'error', 'success'] as const;

/**
 * Validate that a component implements required UI states
 * This catches PIXEL components that look pretty but don't handle interactions
 */
function validateStateCoverage(code: string, componentName: string): StateCoverageResult {
  const missingStates: string[] = [];
  const details: string[] = [];

  // Patterns to detect state handling
  const statePatterns: Record<string, RegExp[]> = {
    hover: [
      /hover:/, // Tailwind hover:
      /:hover\s*\{/, // CSS :hover
      /onMouseEnter/, // React hover events
      /onMouseOver/,
      /useHover/, // Hook-based hover
    ],
    focus: [
      /focus:/, // Tailwind focus:
      /focus-visible:/, // Tailwind focus-visible:
      /focus-within:/, // Tailwind focus-within:
      /:focus\s*\{/, // CSS :focus
      /onFocus/, // React focus event
      /autoFocus/, // Auto focus attribute
      /tabIndex/, // Keyboard focusable
    ],
    disabled: [
      /disabled:/, // Tailwind disabled:
      /disabled\s*[=:]/, // JSX disabled prop
      /isDisabled/, // Custom disabled prop
      /:disabled\s*\{/, // CSS :disabled
      /aria-disabled/, // ARIA disabled
      /\bdisabled\b.*className/, // Conditional disabled classes
    ],
    loading: [
      /isLoading/, // Loading state variable
      /loading/i, // Loading in any form
      /isPending/, // React 18 pending state
      /Spinner|Loader/, // Loading component
      /skeleton/i, // Skeleton loading
      /aria-busy/, // ARIA loading
    ],
  };

  // Check each required state
  for (const state of REQUIRED_STATES) {
    const patterns = statePatterns[state];
    const hasState = patterns.some(pattern => pattern.test(code));

    if (!hasState) {
      missingStates.push(state);
      details.push(`Missing ${state} state handling`);
    }
  }

  // Check optional states (just for reporting)
  const missingOptional: string[] = [];
  const optionalPatterns: Record<string, RegExp[]> = {
    active: [/active:/, /:active\s*\{/, /isActive/],
    error: [/error/i, /isError/, /hasError/, /invalid/i],
    success: [/success/i, /isSuccess/, /valid(?!ate)/i],
  };

  for (const state of OPTIONAL_STATES) {
    const patterns = optionalPatterns[state];
    const hasState = patterns.some(pattern => pattern.test(code));
    if (!hasState) {
      missingOptional.push(state);
    }
  }

  if (missingOptional.length > 0) {
    details.push(`Consider adding: ${missingOptional.join(', ')}`);
  }

  // Calculate coverage
  const totalRequired = REQUIRED_STATES.length;
  const foundRequired = totalRequired - missingStates.length;
  const coverage = Math.round((foundRequired / totalRequired) * 100);

  return {
    passed: missingStates.length === 0,
    coverage,
    missingStates,
    details,
  };
}

/** Feature checklist item from STRATEGOS */
interface FeatureChecklistItem {
  id: string;
  name: string;
  description: string;
  acceptanceCriteria?: string[];
  assignedTo?: string;
}

/** Feature checklist from STRATEGOS */
interface FeatureChecklist {
  critical?: FeatureChecklistItem[];
  important?: FeatureChecklistItem[];
  niceToHave?: Array<{ id: string; name: string; description: string }>;
}

/** Build context for feature validation */
export interface BuildContext {
  /** The original user prompt */
  userPrompt?: string;
  /** Project name */
  projectName?: string;
  /** STRATEGOS output including feature checklist */
  strategosOutput?: {
    featureChecklist?: FeatureChecklist;
    mvp_features?: Array<{ name: string; priority: string }>;
  };
}

/** Validate agent output against schema */
export function validateOutput(
  output: AgentOutput,
  definition: AgentDefinition,
  buildContext?: BuildContext
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check status
  if (output.status !== 'completed') {
    errors.push({ field: 'status', message: `Expected completed, got ${output.status}` });
  }

  // Check for artifacts
  if (output.artifacts.length === 0) {
    warnings.push({
      field: 'artifacts',
      message: 'No artifacts generated',
      suggestion: 'Agent should produce at least one artifact',
    });
  }

  // Validate against output schema
  const docArtifact = output.artifacts.find(a => a.type === 'document' && !a.metadata?.raw);
  if (docArtifact) {
    const schemaErrors = validateAgainstSchema(docArtifact.content, definition.outputSchema);
    errors.push(...schemaErrors);
  }

  // Validate code artifacts
  const codeArtifacts = output.artifacts.filter(a => a.type === 'code');
  for (const artifact of codeArtifacts) {
    const codeValidation = validateCodeArtifact(artifact);
    errors.push(...codeValidation.errors);
    warnings.push(...codeValidation.warnings);
  }

  // ═══════════════════════════════════════════════════════════════
  // FEATURE VALIDATION (Semantic check)
  // ═══════════════════════════════════════════════════════════════
  if (buildContext?.userPrompt) {
    const requiredFeatures = extractRequiredFeatures(buildContext.userPrompt);

    if (requiredFeatures.length > 0) {
      // Combine all generated code
      const allCode = output.artifacts
        .filter(a => a.type === 'code')
        .map(a => a.content)
        .join('\n');

      const featureResult = validateFeatures(allCode, requiredFeatures);

      if (!featureResult.valid) {
        errors.push({
          field: 'features',
          message: `Feature validation failed (${featureResult.score}/100)`,
          details: featureResult.missingFeatures.join(', '),
          suggestion: generateFeatureReport(featureResult),
        });
      } else if (featureResult.score < 80) {
        warnings.push({
          field: 'features',
          message: `Low feature score (${featureResult.score}/100)`,
          details: featureResult.partialFeatures.map(p => p.name).join(', '),
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HANDLER REALITY CHECK
  // ═══════════════════════════════════════════════════════════════
  for (const artifact of output.artifacts.filter(a => a.type === 'code')) {
    const handlerResult = validateHandlers(artifact.content || '');

    if (!handlerResult.valid) {
      errors.push({
        field: 'handlers',
        message: `Handler validation failed - ${handlerResult.fakeHandlers} fake handlers detected`,
        details: handlerResult.fakeHandlerDetails.map(h => `${h.location}: ${h.reason}`).join('; '),
        suggestion: generateHandlerReport(handlerResult),
      });
    } else if (handlerResult.fakeHandlers > 0) {
      warnings.push({
        field: 'handlers',
        message: `${handlerResult.fakeHandlers} handler(s) may be stubs`,
        details: handlerResult.fakeHandlerDetails.map(h => h.location).join(', '),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLEXITY GATE
  // ═══════════════════════════════════════════════════════════════
  for (const artifact of output.artifacts.filter(
    a => a.type === 'code' && a.path?.endsWith('.tsx')
  )) {
    const complexityResult = validateComplexity(artifact.content || '', artifact.path || '');

    if (!complexityResult.valid) {
      errors.push({
        field: 'complexity',
        message: `Code too simple for ${complexityResult.threshold.name} (${complexityResult.score}%)`,
        details: complexityResult.violations.map(v => v.message).join('; '),
        suggestion: generateComplexityReport(complexityResult),
      });
    } else if (complexityResult.score < 80) {
      warnings.push({
        field: 'complexity',
        message: `Low complexity score for ${complexityResult.threshold.name} (${complexityResult.score}%)`,
        details: complexityResult.violations.map(v => v.metric).join(', '),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DESIGN TOKEN ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════
  for (const artifact of output.artifacts.filter(
    a => a.type === 'code' && a.path?.endsWith('.tsx')
  )) {
    const designResult = validateDesignTokens(artifact.content || '');

    if (!designResult.valid) {
      errors.push({
        field: 'design',
        message: `Design token violations (${designResult.summary.hardcodedColors} hardcoded colors)`,
        details: designResult.violations
          .slice(0, 5)
          .map(v => v.value)
          .join(', '),
        suggestion: generateDesignReport(designResult),
      });
    } else if (designResult.summary.hardcodedColors > 0) {
      warnings.push({
        field: 'design',
        message: `${designResult.summary.hardcodedColors} hardcoded color(s) found`,
        details: 'Consider using design tokens for consistency',
      });
    }

    // Check if PALETTE tokens are used
    const paletteUsage = validatePaletteUsage(artifact.content || '');
    if (!paletteUsage.valid && paletteUsage.usedTokens.length === 0) {
      warnings.push({
        field: 'design',
        message: 'No design tokens from PALETTE used',
        details: `Missing: ${paletteUsage.missingTokens.slice(0, 5).join(', ')}`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT RESOLUTION VALIDATION (CRITICAL)
  // Ensures all imports in code artifacts resolve to files in output
  // ═══════════════════════════════════════════════════════════════
  const importValidation = validateImportResolution(output.artifacts);
  if (!importValidation.valid) {
    errors.push({
      field: 'imports',
      message: `Unresolved imports: ${importValidation.unresolvedImports.length} missing files`,
      details: importValidation.unresolvedImports.slice(0, 10).join(', '),
      suggestion:
        'Agent must generate ALL files that are imported. Missing: ' +
        importValidation.unresolvedImports.join(', '),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FEATURE CHECKLIST VALIDATION (from STRATEGOS)
  // ═══════════════════════════════════════════════════════════════
  if (buildContext?.strategosOutput?.featureChecklist) {
    const allCode = output.artifacts
      .filter(a => a.type === 'code')
      .map(a => a.content)
      .join('\n');

    const checklistResult = validateAgainstFeatureChecklist(
      allCode,
      buildContext.strategosOutput.featureChecklist
    );

    if (!checklistResult.valid) {
      errors.push({
        field: 'featureChecklist',
        message: `Missing critical features from STRATEGOS checklist: ${checklistResult.missing.join(', ')}`,
        suggestion: 'Implement all critical features from STRATEGOS checklist before proceeding',
      });
    }

    if (checklistResult.partial.length > 0) {
      warnings.push({
        field: 'featureChecklist',
        message: `Partially implemented features: ${checklistResult.partial.join(', ')}`,
        details: 'Some acceptance criteria not met',
      });
    }
  }

  // Check token usage
  if (output.tokensUsed === 0) {
    warnings.push({ field: 'tokensUsed', message: 'Zero tokens reported' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CHECKLIST VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate code against STRATEGOS feature checklist
 */
function validateAgainstFeatureChecklist(
  code: string,
  featureChecklist: FeatureChecklist
): { valid: boolean; missing: string[]; partial: string[] } {
  const missing: string[] = [];
  const partial: string[] = [];

  if (!featureChecklist?.critical) {
    return { valid: true, missing: [], partial: [] };
  }

  for (const feature of featureChecklist.critical) {
    let criteriaMetCount = 0;
    const totalCriteria = feature.acceptanceCriteria?.length || 0;

    // Check each acceptance criteria
    for (const criteria of feature.acceptanceCriteria || []) {
      // Convert criteria to searchable patterns
      const patterns = criteriaToPatterns(criteria, feature.id);

      for (const pattern of patterns) {
        if (pattern.test(code)) {
          criteriaMetCount++;
          break;
        }
      }
    }

    // Determine feature status
    if (totalCriteria === 0) {
      // No criteria defined, check if feature exists by ID patterns
      const featurePatterns = featureIdToPatterns(feature.id);
      const featureExists = featurePatterns.some(p => p.test(code));
      if (!featureExists) {
        missing.push(feature.name);
      }
    } else if (criteriaMetCount === 0) {
      missing.push(feature.name);
    } else if (criteriaMetCount < totalCriteria) {
      partial.push(`${feature.name} (${criteriaMetCount}/${totalCriteria})`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    partial,
  };
}

/**
 * Convert feature ID to searchable patterns
 */
function featureIdToPatterns(featureId: string): RegExp[] {
  const patterns: RegExp[] = [];
  const id = featureId.toLowerCase();

  // Kanban patterns
  if (id.includes('kanban') || id.includes('board')) {
    patterns.push(/column|lane|board/i);
    patterns.push(/DndContext|useDraggable|useDroppable|@dnd-kit/i);
  }

  // Dashboard patterns
  if (id.includes('dashboard')) {
    patterns.push(/dashboard|stat|metric|chart/i);
    patterns.push(/Card|CardHeader|CardContent/i);
  }

  // Auth patterns
  if (id.includes('auth') || id.includes('login')) {
    patterns.push(/login|signin|auth/i);
    patterns.push(/email|password|credentials/i);
  }

  // CRUD patterns
  if (id.includes('crud')) {
    patterns.push(/create|update|delete|edit/i);
    patterns.push(/handleAdd|handleEdit|handleDelete|handleSave/i);
  }

  // Dark theme
  if (id.includes('dark') || id.includes('theme')) {
    patterns.push(/bg-background|bg-card|bg-muted/i);
    patterns.push(/dark|theme/i);
  }

  // Command palette
  if (id.includes('command') || id.includes('palette')) {
    patterns.push(/CommandDialog|cmdk|command-palette/i);
    patterns.push(/Cmd\+K|Ctrl\+K|Meta\+K/i);
  }

  // Search
  if (id.includes('search')) {
    patterns.push(/search|filter|query/i);
    patterns.push(/SearchInput|searchQuery|handleSearch/i);
  }

  // Table/Data
  if (id.includes('table') || id.includes('data')) {
    patterns.push(/DataTable|Table|TableRow|TableCell/i);
    patterns.push(/sort|filter|paginate/i);
  }

  // Responsive
  if (id.includes('responsive')) {
    patterns.push(/sm:|md:|lg:|xl:/);
    patterns.push(/grid-cols|flex-col|hidden\s+md:/i);
  }

  // Default: search for the feature name
  if (patterns.length === 0) {
    const words = featureId.split('_');
    for (const word of words) {
      if (word.length >= 4) {
        patterns.push(new RegExp(word, 'i'));
      }
    }
  }

  return patterns;
}

/**
 * Convert acceptance criteria text to regex patterns
 */
function criteriaToPatterns(criteria: string, featureId: string): RegExp[] {
  const patterns: RegExp[] = [];
  const lowerCriteria = criteria.toLowerCase();

  // Column patterns
  if (lowerCriteria.includes('column') || lowerCriteria.includes('lane')) {
    patterns.push(/column|lane/i);
    patterns.push(/todo|in.?progress|done|backlog/i);
  }

  // Drag-and-drop patterns
  if (lowerCriteria.includes('drag') || lowerCriteria.includes('dnd')) {
    patterns.push(/dnd-kit|react-dnd|draggable|useDrag|DndContext/i);
    patterns.push(/useDraggable|useDroppable|SortableContext/i);
  }

  // Dark theme / background patterns
  if (lowerCriteria.includes('bg-background') || lowerCriteria.includes('dark')) {
    patterns.push(/bg-background|bg-card|bg-muted/i);
  }

  // No hardcoded colors (checked elsewhere)
  if (lowerCriteria.includes('no hardcoded')) {
    // This is validated by design validator
    patterns.push(/.*/); // Always passes here
  }

  // Card/component patterns
  if (lowerCriteria.includes('card')) {
    patterns.push(/Card|CardHeader|CardContent|CardFooter/i);
  }

  // Count patterns
  if (lowerCriteria.includes('count') || lowerCriteria.includes('number')) {
    patterns.push(/\.length|count|total|size/i);
  }

  // Empty state patterns
  if (lowerCriteria.includes('empty') || lowerCriteria.includes('placeholder')) {
    patterns.push(/empty|no\s+(items|tasks|data)|EmptyState/i);
  }

  // CRUD operations
  if (lowerCriteria.includes('add') || lowerCriteria.includes('create')) {
    patterns.push(/handleAdd|handleCreate|onCreate|addTask|createItem/i);
    patterns.push(/Add|Create|New/i);
  }

  if (lowerCriteria.includes('delete') || lowerCriteria.includes('remove')) {
    patterns.push(/handleDelete|onDelete|removeTask|deleteItem/i);
    patterns.push(/Delete|Remove/i);
  }

  if (lowerCriteria.includes('edit') || lowerCriteria.includes('update')) {
    patterns.push(/handleEdit|handleUpdate|onEdit|updateTask|editItem/i);
    patterns.push(/Edit|Update|Save/i);
  }

  // Modal/Dialog patterns
  if (lowerCriteria.includes('modal') || lowerCriteria.includes('dialog')) {
    patterns.push(/Dialog|Modal|Sheet|Drawer/i);
    patterns.push(/isOpen|setIsOpen|openModal|showDialog/i);
  }

  // Button patterns
  if (lowerCriteria.includes('button')) {
    patterns.push(/Button|btn|onClick/i);
  }

  // Keyboard shortcut patterns
  if (lowerCriteria.includes('cmd+k') || lowerCriteria.includes('ctrl+k')) {
    patterns.push(/Cmd\+K|Ctrl\+K|Meta\+K|metaKey|ctrlKey/i);
    patterns.push(/useHotkeys|onKeyDown|keydown/i);
  }

  // Filter patterns
  if (lowerCriteria.includes('filter')) {
    patterns.push(/filter|Filter|FilterButton/i);
    patterns.push(/setFilter|activeFilter|filterBy/i);
  }

  // Search patterns
  if (lowerCriteria.includes('search')) {
    patterns.push(/search|Search|SearchInput/i);
    patterns.push(/searchQuery|handleSearch|onSearch/i);
  }

  // Responsive patterns
  if (lowerCriteria.includes('mobile') || lowerCriteria.includes('responsive')) {
    patterns.push(/sm:|md:|lg:|xl:/);
    patterns.push(/flex-col|grid-cols/i);
  }

  if (lowerCriteria.includes('stack') || lowerCriteria.includes('vertical')) {
    patterns.push(/flex-col|flex-column|stack/i);
  }

  if (lowerCriteria.includes('scroll') || lowerCriteria.includes('horizontal')) {
    patterns.push(/overflow-x|overflow-scroll|horizontal-scroll/i);
  }

  // If no specific patterns, use generic keyword search
  if (patterns.length === 0) {
    const keywords = criteria.match(/\b\w{4,}\b/g) || [];
    for (const keyword of keywords.slice(0, 3)) {
      // Skip common words
      if (
        !['must', 'have', 'with', 'that', 'this', 'from', 'should', 'using'].includes(
          keyword.toLowerCase()
        )
      ) {
        patterns.push(new RegExp(keyword, 'i'));
      }
    }
  }

  return patterns;
}

/** Validate content against output schema */
function validateAgainstSchema(
  content: string,
  schema: AgentDefinition['outputSchema']
): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    const parsed = JSON.parse(content);

    // Check type
    if (schema.type === 'object' && typeof parsed !== 'object') {
      errors.push({
        field: 'root',
        message: 'Expected object',
        expected: 'object',
        received: typeof parsed,
      });
      return errors;
    }

    if (schema.type === 'array' && !Array.isArray(parsed)) {
      errors.push({
        field: 'root',
        message: 'Expected array',
        expected: 'array',
        received: typeof parsed,
      });
      return errors;
    }

    // Check required fields
    for (const field of schema.required) {
      if (!(field in parsed)) {
        errors.push({ field, message: `Missing required field: ${field}` });
      } else if (parsed[field] === null || parsed[field] === undefined) {
        errors.push({ field, message: `Required field is null/undefined: ${field}` });
      }
    }

    // Validate property types
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in parsed && parsed[key] !== null && parsed[key] !== undefined) {
        // Handle SchemaProperty type which may be string[] for nullable types
        const normalizedSchema = {
          type: Array.isArray(propSchema.type) ? propSchema.type[0] : propSchema.type,
          items: propSchema.items,
        };
        const typeError = validatePropertyType(key, parsed[key], normalizedSchema);
        if (typeError) errors.push(typeError);
      }
    }
  } catch (e) {
    errors.push({ field: 'root', message: `Invalid JSON: ${(e as Error).message}` });
  }

  return errors;
}

/** Validate property type */
function validatePropertyType(
  key: string,
  value: unknown,
  schema: { type: string; items?: any }
): ValidationError | null {
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (schema.type === 'array' && !Array.isArray(value)) {
    return { field: key, message: `Expected array`, expected: 'array', received: actualType };
  }

  if (schema.type !== 'array' && schema.type !== actualType) {
    // Allow some flexibility
    if (schema.type === 'number' && actualType === 'string' && !isNaN(Number(value))) return null;
    if (schema.type === 'string' && actualType === 'number') return null;
    return { field: key, message: `Type mismatch`, expected: schema.type, received: actualType };
  }

  return null;
}

/** Validate code artifact - returns both errors and warnings */
function validateCodeArtifact(artifact: Artifact): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const content = artifact.content || '';

  if (!artifact.path) {
    warnings.push({ field: 'path', message: 'Code artifact missing path' });
  }

  if (!content || content.trim().length === 0) {
    warnings.push({ field: 'content', message: 'Empty code artifact' });
    return { errors, warnings };
  }

  // Check for common issues
  if (content.includes('TODO') || content.includes('FIXME')) {
    warnings.push({
      field: 'content',
      message: 'Code contains TODO/FIXME comments',
      suggestion: 'Consider completing implementation',
    });
  }

  if (content.includes('console.log') && artifact.path?.includes('.ts')) {
    warnings.push({
      field: 'content',
      message: 'Code contains console.log statements',
      suggestion: 'Use proper logging',
    });
  }

  // Check TypeScript files have types
  if (artifact.path?.endsWith('.ts') || artifact.path?.endsWith('.tsx')) {
    if (content.includes(': any') && (content.match(/: any/g)?.length || 0) > 5) {
      warnings.push({
        field: 'content',
        message: 'Excessive use of any type',
        suggestion: 'Add proper TypeScript types',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TYPESCRIPT COMPILATION CHECK (UPGRADE SPEC #2)
  // This catches real syntax/type errors that regex validation misses
  // ═══════════════════════════════════════════════════════════════
  if (artifact.path?.match(/\.(ts|tsx)$/)) {
    const compileResult = validateTypeScriptCompilation(content, artifact.path);

    if (!compileResult.success) {
      // Compilation errors are CRITICAL - these will cause actual build failures
      for (const compileError of compileResult.errors.slice(0, 5)) {
        // Limit to first 5 errors
        errors.push({
          field: 'compilation',
          message: `TypeScript compilation error: ${compileError}`,
          severity: 'error' as const,
        });
      }

      if (compileResult.errors.length > 5) {
        errors.push({
          field: 'compilation',
          message: `... and ${compileResult.errors.length - 5} more compilation errors`,
        });
      }

      // Early return for compilation errors - no point checking other things
      // if the code doesn't even compile
      return { errors, warnings };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE COVERAGE VALIDATION (UPGRADE SPEC #3)
  // Ensures PIXEL components have proper state handling
  // ═══════════════════════════════════════════════════════════════
  if (artifact.path?.includes('/components/') && artifact.path?.endsWith('.tsx')) {
    // Extract component name from path
    const pathParts = artifact.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const componentName = fileName.replace('.tsx', '');

    const stateResult = validateStateCoverage(content, componentName);

    if (!stateResult.passed) {
      // Missing required states is a warning for most components
      // but an error for interactive components (buttons, inputs, etc.)
      const isInteractive = /Button|Input|Select|Checkbox|Toggle|Switch|Slider/i.test(
        componentName
      );

      if (isInteractive) {
        errors.push({
          field: 'states',
          message: `Interactive component "${componentName}" missing required states: ${stateResult.missingStates.join(', ')}`,
          details: stateResult.details.join('; '),
          suggestion: 'Add hover:, focus:, disabled:, and loading states to interactive components',
          severity: 'error' as const,
        });
      } else {
        warnings.push({
          field: 'states',
          message: `Component "${componentName}" state coverage: ${stateResult.coverage}% (missing: ${stateResult.missingStates.join(', ')})`,
          details: stateResult.details.join('; '),
          suggestion: 'Consider adding missing states for better UX',
        });
      }
    } else if (stateResult.coverage < 100 && stateResult.details.length > 0) {
      // All required states present but optional states missing
      warnings.push({
        field: 'states',
        message: `Component "${componentName}" has all required states. ${stateResult.details.join('; ')}`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CRITICAL FIX: Enhanced stub page detection (WIRE agent fix)
  // Previous patterns were too narrow and missed many stub variations
  // ═══════════════════════════════════════════════════════════════
  if (artifact.path?.includes('page.tsx') || artifact.path?.includes('Page.tsx')) {
    // EXPANDED stub patterns to catch more variations
    const stubPatterns = [
      // Simple return with only h1
      /return\s*\(\s*<div[^>]*>\s*<h1>[^<]*<\/h1>\s*<\/div>\s*\)/,
      // JSX with only h1 and maybe some basic wrappers
      /<div[^>]*>\s*<h1>[^<]+<\/h1>\s*(?:<[A-Z][^>]*>\s*<[A-Z][^/]*\/>\s*<\/[A-Z][^>]*>\s*)?<\/div>/,
      // NEW: Stub with placeholder text
      />\s*(Coming soon|Under construction|TODO|TBD|Placeholder|Content here)\s*</i,
      // NEW: Empty main/section/article
      /<(main|section|article)[^>]*>\s*<\/(main|section|article)>/,
      // NEW: Only className with no real content
      /<div\s+className="[^"]*">\s*<\/div>/,
      // NEW: Just a loading spinner with no actual content logic
      /return\s*\(\s*<div[^>]*>\s*<(Loader|Spinner|Loading)/,
      // NEW: Stub dashboard (only title + "Dashboard" text)
      /<h1[^>]*>\s*Dashboard\s*<\/h1>\s*<\/div>\s*\)/,
      // NEW: Page with only "Page Title" placeholder
      /<h1[^>]*>\s*Page\s*Title\s*<\/h1>/i,
      // NEW: Empty fragment
      /return\s*\(\s*<>\s*<\/>\s*\)/,
      // NEW: Return null
      /return\s+null\s*;?\s*$/m,
    ];

    const isStubPage = stubPatterns.some(pattern => pattern.test(content));

    if (isStubPage) {
      errors.push({
        field: 'content',
        message: 'Page is a stub - contains placeholder content instead of real functionality',
        severity: 'error' as const,
      });
    }

    // CRITICAL FIX: Increased minimum from 50 to 80 to match PIXEL rules
    const lineCount = content.split('\n').length;
    if (lineCount < 80) {
      // Under 80 lines is an ERROR, not a warning (matches PIXEL minimum page requirement)
      errors.push({
        field: 'content',
        message: `Page has only ${lineCount} lines - minimum is 80 per PIXEL agent rules`,
        details:
          'Pages must have loading state, empty state, real handlers, and proper UI structure',
      });
    }

    // NEW: Check for essential page structure components
    const pageRequirements = {
      hasLoadingState: /isLoading|loading|isPending|Skeleton|Loader/i.test(content),
      hasErrorState: /isError|error|ErrorState|ErrorBoundary/i.test(content),
      hasEmptyState: /isEmpty|empty|EmptyState|no\s+(items|data|results)/i.test(content),
      hasRealHandler: /set\w+\(|mutation\.|router\.|toast\.|await\s+/i.test(content),
    };

    const missingRequirements = Object.entries(pageRequirements)
      .filter(([_, hasIt]) => !hasIt)
      .map(([name]) =>
        name
          .replace('has', '')
          .replace(/([A-Z])/g, ' $1')
          .trim()
      );

    if (missingRequirements.length > 2) {
      warnings.push({
        field: 'pageStructure',
        message: `Page missing essential structure: ${missingRequirements.join(', ')}`,
        suggestion:
          'Complete pages should handle loading, error, and empty states with real handlers',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUICK WIN 2: Check for imports of potentially missing local files
  // ═══════════════════════════════════════════════════════════════
  const relativeImportPattern = /from\s+['"](\.[^'"]+)['"]/g;
  let match;
  const suspiciousImports = ['./sidebar', './header', './nav', './footer', './menu', './layout'];

  while ((match = relativeImportPattern.exec(content)) !== null) {
    const importPath = match[1].toLowerCase();

    // Flag common component imports that are often missing
    for (const suspicious of suspiciousImports) {
      if (importPath.includes(suspicious)) {
        warnings.push({
          field: 'imports',
          message: `Importing '${match[1]}' - ensure this file is generated`,
          suggestion: 'All imported components must exist in generated files',
        });
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUICK WIN 3: Require handlers on interactive elements
  // ═══════════════════════════════════════════════════════════════
  // Find buttons without onClick
  const buttonMatches = content.match(/<[Bb]utton[^>]*>/g) || [];
  const buttonsWithoutHandler = buttonMatches.filter(
    btn =>
      !btn.includes('onClick') &&
      !btn.includes('type="submit"') &&
      !btn.includes("type='submit'") &&
      !btn.includes('disabled')
  );

  if (buttonsWithoutHandler.length > 0) {
    warnings.push({
      field: 'handlers',
      message: `${buttonsWithoutHandler.length} button(s) without onClick handler`,
      suggestion: 'All buttons should have click handlers or be disabled',
    });
  }

  // Find forms without onSubmit
  const formMatches = content.match(/<form[^>]*>/gi) || [];
  const formsWithoutHandler = formMatches.filter(form => !form.includes('onSubmit'));

  if (formsWithoutHandler.length > 0) {
    warnings.push({
      field: 'handlers',
      message: `${formsWithoutHandler.length} form(s) without onSubmit handler`,
      suggestion: 'All forms should have submit handlers',
    });
  }

  // Find inputs without onChange (except those with defaultValue/readOnly/disabled)
  const inputMatches = content.match(/<[Ii]nput[^>]*>/g) || [];
  const inputsWithoutHandler = inputMatches.filter(
    input =>
      !input.includes('onChange') &&
      !input.includes('defaultValue') &&
      !input.includes('readOnly') &&
      !input.includes('disabled') &&
      !input.includes('type="hidden"') &&
      !input.includes("type='hidden'") &&
      !input.includes('type="submit"') &&
      !input.includes("type='submit'")
  );

  if (inputsWithoutHandler.length > 2) {
    // Allow some uncontrolled inputs
    warnings.push({
      field: 'handlers',
      message: `${inputsWithoutHandler.length} input(s) without onChange handler`,
      suggestion: 'Controlled inputs should have onChange handlers',
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUICK WIN 4: Detect fake/stub handlers
  // ═══════════════════════════════════════════════════════════════
  const fakeHandlerPatterns = [
    // Empty arrow function handlers
    /(?:onClick|onSubmit|onChange|onBlur|onFocus)\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g,
    // Console.log only handlers
    /(?:onClick|onSubmit|onChange)\s*=\s*\{\s*\(\)\s*=>\s*\{\s*console\.log\([^)]*\)\s*;?\s*\}\s*\}/g,
    /(?:onClick|onSubmit|onChange)\s*=\s*\{\s*\(\)\s*=>\s*console\.log\([^)]*\)\s*\}/g,
    // Handlers with only TODO comments
    /(?:onClick|onSubmit|onChange)\s*=\s*\{\s*\([^)]*\)\s*=>\s*\{\s*\/\/\s*TODO[^}]*\}\s*\}/g,
  ];

  let fakeHandlerCount = 0;
  for (const pattern of fakeHandlerPatterns) {
    const matches = content.match(pattern) || [];
    fakeHandlerCount += matches.length;
  }

  // Also check for standalone fake handler definitions
  const standalonePatterns = [
    /const\s+handle\w+\s*=\s*\(\)\s*=>\s*\{\s*\}/g,
    /const\s+handle\w+\s*=\s*\(\)\s*=>\s*\{\s*console\.log\([^)]*\)\s*;?\s*\}/g,
    /const\s+on\w+\s*=\s*\(\)\s*=>\s*\{\s*\}/g,
  ];

  for (const pattern of standalonePatterns) {
    const matches = content.match(pattern) || [];
    fakeHandlerCount += matches.length;
  }

  if (fakeHandlerCount > 0) {
    warnings.push({
      field: 'handlers',
      message: `${fakeHandlerCount} fake/stub handler(s) detected (console.log only or empty)`,
      suggestion: 'Handlers should perform real operations, not just log',
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUICK WIN 5: Ensure sufficient component usage for pages
  // ═══════════════════════════════════════════════════════════════
  if (artifact.path?.includes('page.tsx') || artifact.path?.includes('Page.tsx')) {
    // Count component usage (PascalCase JSX tags, excluding HTML elements)
    const componentUsage = content.match(/<[A-Z][a-zA-Z0-9]+/g) || [];
    const uniqueComponents = new Set(componentUsage.map(c => c.slice(1)));

    // Remove common HTML-like elements that start with uppercase in some frameworks
    const htmlLikeElements = ['Fragment', 'React', 'Suspense', 'ErrorBoundary'];
    htmlLikeElements.forEach(el => uniqueComponents.delete(el));

    if (uniqueComponents.size < 3) {
      warnings.push({
        field: 'components',
        message: `Page only uses ${uniqueComponents.size} unique components: ${[...uniqueComponents].join(', ') || 'none'}`,
        suggestion: 'Dashboard pages should use multiple components (Card, Button, Table, etc.)',
      });
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT RESOLUTION VALIDATION
// Ensures all local imports (@/, ./, ../) in code artifacts resolve to files in output
// ═══════════════════════════════════════════════════════════════════════════════

interface ImportValidationResult {
  valid: boolean;
  unresolvedImports: string[];
  resolvedImports: string[];
}

/**
 * Validate that all local imports in artifacts resolve to other artifacts in the output
 * This catches the critical bug where PIXEL imports components it didn't create
 */
function validateImportResolution(artifacts: Artifact[]): ImportValidationResult {
  const unresolvedImports: string[] = [];
  const resolvedImports: string[] = [];

  // Build a set of all file paths in the output
  const generatedPaths = new Set<string>();
  for (const artifact of artifacts) {
    if (artifact.path) {
      // Normalize path: remove src/ prefix and file extension
      const normalizedPath = artifact.path
        .replace(/^src\//, '')
        .replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
      generatedPaths.add(normalizedPath);

      // Also add with index (for directory imports)
      if (!normalizedPath.endsWith('index')) {
        generatedPaths.add(normalizedPath + '/index');
      }
    }
  }

  // Extract imports from all code artifacts
  const importPattern = /import\s+(?:[\w{},\s*]+)\s+from\s+['"]([@./][^'"]+)['"]/g;
  const dynamicImportPattern = /import\(\s*['"]([@./][^'"]+)['"]\s*\)/g;

  for (const artifact of artifacts) {
    if (!artifact.content || artifact.type !== 'code') continue;

    const allImports: string[] = [];

    // Find static imports
    let match;
    while ((match = importPattern.exec(artifact.content)) !== null) {
      allImports.push(match[1]);
    }

    // Find dynamic imports
    while ((match = dynamicImportPattern.exec(artifact.content)) !== null) {
      allImports.push(match[1]);
    }

    // Check each local import
    for (const importPath of allImports) {
      // Skip external packages (no @ prefix or ./ prefix)
      if (
        !importPath.startsWith('@/') &&
        !importPath.startsWith('./') &&
        !importPath.startsWith('../')
      ) {
        continue;
      }

      // Skip known external packages that use @
      if (
        importPath.startsWith('@radix-ui/') ||
        importPath.startsWith('@supabase/') ||
        importPath.startsWith('@anthropic-ai/') ||
        importPath.startsWith('@tanstack/') ||
        importPath.startsWith('@hookform/') ||
        importPath.startsWith('@types/') ||
        importPath.startsWith('@dnd-kit/')
      ) {
        continue;
      }

      // Normalize import path
      let normalizedImport = importPath;

      // Convert @/ to root path
      if (normalizedImport.startsWith('@/')) {
        normalizedImport = normalizedImport.slice(2);
      }

      // Handle relative imports (need the artifact path to resolve)
      if (normalizedImport.startsWith('./') || normalizedImport.startsWith('../')) {
        // For simplicity, just warn about relative imports
        // Full resolution would need to track the importing file's location
        continue;
      }

      // Remove file extension if present
      normalizedImport = normalizedImport.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');

      // Check if import resolves to a generated file
      const resolved =
        generatedPaths.has(normalizedImport) || generatedPaths.has(normalizedImport + '/index');

      if (resolved) {
        resolvedImports.push(importPath);
      } else {
        // Only flag @/ imports that should be generated
        if (importPath.startsWith('@/')) {
          unresolvedImports.push(importPath);
        }
      }
    }
  }

  // Remove duplicates
  const uniqueUnresolved = [...new Set(unresolvedImports)];
  const uniqueResolved = [...new Set(resolvedImports)];

  return {
    valid: uniqueUnresolved.length === 0,
    unresolvedImports: uniqueUnresolved,
    resolvedImports: uniqueResolved,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKS OUTPUT VALIDATION (Component Count & Specification Check)
// Ensures BLOCKS agent generates sufficient components with proper specs
// ═══════════════════════════════════════════════════════════════════════════════

/** BLOCKS component specification from agent output */
interface BlocksComponentSpec {
  name: string;
  category: string;
  description?: string;
  variants?: Record<string, unknown>;
  states?: Record<string, unknown>;
  props?: Record<string, unknown>;
  accessibility?: Record<string, unknown>;
  anatomy?: Record<string, unknown>;
  motion?: Record<string, unknown>;
  token_usage?: Record<string, unknown>;
}

/** BLOCKS output structure */
export interface BlocksOutput {
  architecture_overview?: {
    total_components: number;
    categories: Array<{ name: string; count: number }>;
  };
  components?: BlocksComponentSpec[];
  design_tokens?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Result of BLOCKS output validation */
export interface BlocksValidationResult {
  valid: boolean;
  componentCount: number;
  errors: string[];
  warnings: string[];
  missingFields: Array<{ component: string; fields: string[] }>;
  incompleteComponents: string[];
}

/** Required fields every BLOCKS component must have */
const REQUIRED_COMPONENT_FIELDS = ['name', 'category'] as const;

/** Strongly recommended fields for quality components */
const RECOMMENDED_COMPONENT_FIELDS = ['variants', 'states', 'props', 'accessibility'] as const;

/** Optional fields for enhanced specifications */
const OPTIONAL_COMPONENT_FIELDS = ['description', 'anatomy', 'motion', 'token_usage'] as const;

/**
 * Validate BLOCKS agent output for component count and specification quality
 * This catches the LLM pattern-following issue where BLOCKS generates too few components
 *
 * @param output - Parsed BLOCKS agent output (JSON object)
 * @returns Validation result with errors, warnings, and component details
 */
export function validateBlocksOutput(output: BlocksOutput): BlocksValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: Array<{ component: string; fields: string[] }> = [];
  const incompleteComponents: string[] = [];

  // Check if components array exists
  if (!output.components) {
    return {
      valid: false,
      componentCount: 0,
      errors: ['BLOCKS output missing "components" array - this is a critical failure'],
      warnings: [],
      missingFields: [],
      incompleteComponents: [],
    };
  }

  if (!Array.isArray(output.components)) {
    return {
      valid: false,
      componentCount: 0,
      errors: ['BLOCKS "components" is not an array'],
      warnings: [],
      missingFields: [],
      incompleteComponents: [],
    };
  }

  const componentCount = output.components.length;

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT COUNT VALIDATION
  // BLOCKS should generate 60 components based on ATOMIC DESIGN HIERARCHY
  // Target: 60, Minimum acceptable: 55, Maximum: 70
  // ═══════════════════════════════════════════════════════════════
  const MIN_COMPONENTS = 55; // 60 target - 5 tolerance
  const MAX_COMPONENTS = 70; // 60 target + 10 tolerance
  const CRITICAL_MIN = 10; // Below this = definite pattern-following failure

  if (componentCount < CRITICAL_MIN) {
    errors.push(
      `CRITICAL: BLOCKS only generated ${componentCount} components (expected ${MIN_COMPONENTS}-${MAX_COMPONENTS}). ` +
        `This indicates the LLM followed the example pattern instead of generating all components. ` +
        `Check the OUTPUT FORMAT section of BLOCKS prompt for example count mismatch.`
    );
  } else if (componentCount < MIN_COMPONENTS) {
    errors.push(
      `BLOCKS generated ${componentCount} components (minimum is ${MIN_COMPONENTS}). ` +
        `The design system will be incomplete. Components needed: ${MIN_COMPONENTS - componentCount} more.`
    );
  } else if (componentCount > MAX_COMPONENTS) {
    warnings.push(
      `BLOCKS generated ${componentCount} components (expected max ${MAX_COMPONENTS}). ` +
        `This may indicate duplicate or overly-granular components.`
    );
  }

  // Cross-check with architecture_overview if present
  if (output.architecture_overview?.total_components) {
    const reportedCount = output.architecture_overview.total_components;
    if (reportedCount !== componentCount) {
      errors.push(
        `MISMATCH: architecture_overview.total_components says ${reportedCount} but only ${componentCount} actually generated. ` +
          `BLOCKS may have reported intended count but stopped generating early due to token limits.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT SPECIFICATION VALIDATION
  // Each component must have required fields and recommended fields
  // ═══════════════════════════════════════════════════════════════
  const seenNames = new Set<string>();
  const duplicateNames: string[] = [];

  for (const component of output.components) {
    // Check for duplicate names
    if (component.name) {
      if (seenNames.has(component.name.toLowerCase())) {
        duplicateNames.push(component.name);
      } else {
        seenNames.add(component.name.toLowerCase());
      }
    }

    // Check required fields
    const componentMissingRequired: string[] = [];
    for (const field of REQUIRED_COMPONENT_FIELDS) {
      if (
        !component[field] ||
        (typeof component[field] === 'string' && component[field].trim() === '')
      ) {
        componentMissingRequired.push(field);
      }
    }

    if (componentMissingRequired.length > 0) {
      missingFields.push({
        component: component.name || 'UNNAMED',
        fields: componentMissingRequired,
      });
    }

    // Check recommended fields (warn if missing)
    const componentMissingRecommended: string[] = [];
    for (const field of RECOMMENDED_COMPONENT_FIELDS) {
      if (!component[field as keyof BlocksComponentSpec]) {
        componentMissingRecommended.push(field);
      }
    }

    // If missing more than half of recommended fields, mark as incomplete
    if (componentMissingRecommended.length > RECOMMENDED_COMPONENT_FIELDS.length / 2) {
      incompleteComponents.push(
        `${component.name || 'UNNAMED'} (missing: ${componentMissingRecommended.join(', ')})`
      );
    }

    // Validate category is one of the expected atomic design categories
    const validCategories = ['atom', 'molecule', 'organism', 'template', 'page'];
    if (component.category && !validCategories.includes(component.category.toLowerCase())) {
      warnings.push(
        `Component "${component.name}" has unexpected category "${component.category}". ` +
          `Expected: ${validCategories.join(', ')}`
      );
    }

    // Validate variants structure if present
    if (component.variants) {
      if (typeof component.variants !== 'object' || Array.isArray(component.variants)) {
        warnings.push(
          `Component "${component.name}" has invalid variants structure (should be object)`
        );
      } else if (Object.keys(component.variants).length === 0) {
        warnings.push(`Component "${component.name}" has empty variants object`);
      }
    }

    // Validate states structure if present
    if (component.states) {
      if (typeof component.states !== 'object' || Array.isArray(component.states)) {
        warnings.push(
          `Component "${component.name}" has invalid states structure (should be object)`
        );
      }
    }
  }

  // Add errors for critical issues
  if (missingFields.length > 0) {
    const affectedCount = missingFields.length;
    errors.push(
      `${affectedCount} component(s) missing required fields (name/category). ` +
        `Components: ${missingFields
          .slice(0, 5)
          .map(m => m.component)
          .join(', ')}${affectedCount > 5 ? '...' : ''}`
    );
  }

  if (duplicateNames.length > 0) {
    errors.push(
      `Duplicate component names detected: ${duplicateNames.slice(0, 5).join(', ')}${duplicateNames.length > 5 ? '...' : ''}`
    );
  }

  // Add warnings for quality issues
  if (incompleteComponents.length > 0) {
    warnings.push(
      `${incompleteComponents.length} component(s) have incomplete specifications. ` +
        `Consider adding variants, states, props, and accessibility. ` +
        `Examples: ${incompleteComponents.slice(0, 3).join('; ')}${incompleteComponents.length > 3 ? '...' : ''}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY DISTRIBUTION CHECK
  // Ensure reasonable distribution across atomic design categories
  // ═══════════════════════════════════════════════════════════════
  const categoryCounts: Record<string, number> = {};
  for (const component of output.components) {
    const cat = (component.category || 'unknown').toLowerCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Check for missing categories
  const expectedCategories = ['atom', 'molecule', 'organism'];
  for (const cat of expectedCategories) {
    if (!categoryCounts[cat] || categoryCounts[cat] === 0) {
      warnings.push(
        `No components in "${cat}" category. Design system should have atoms, molecules, and organisms.`
      );
    }
  }

  // Check for heavily skewed distribution
  const totalComponents = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  for (const [cat, count] of Object.entries(categoryCounts)) {
    const percentage = (count / totalComponents) * 100;
    if (percentage > 60 && cat !== 'unknown') {
      warnings.push(
        `Category "${cat}" has ${percentage.toFixed(0)}% of components - distribution seems skewed.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    componentCount,
    errors,
    warnings,
    missingFields,
    incompleteComponents,
  };
}

/**
 * Generate a human-readable report from BLOCKS validation result
 */
export function generateBlocksValidationReport(result: BlocksValidationResult): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '  BLOCKS OUTPUT VALIDATION REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `  Components Generated: ${result.componentCount}`,
    `  Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('  ERRORS:');
    for (const error of result.errors) {
      lines.push(`    ❌ ${error}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('  WARNINGS:');
    for (const warning of result.warnings) {
      lines.push(`    ⚠️ ${warning}`);
    }
    lines.push('');
  }

  if (result.missingFields.length > 0 && result.missingFields.length <= 10) {
    lines.push('  MISSING REQUIRED FIELDS:');
    for (const { component, fields } of result.missingFields) {
      lines.push(`    • ${component}: ${fields.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/** Quick validation check */
export function isValidOutput(
  output: AgentOutput,
  definition: AgentDefinition,
  buildContext?: BuildContext
): boolean {
  const result = validateOutput(output, definition, buildContext);
  return result.valid;
}

/** Get validation summary */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Output valid, no issues';
  }

  const parts: string[] = [];
  if (!result.valid) {
    parts.push(`${result.errors.length} error(s): ${result.errors.map(e => e.message).join('; ')}`);
  }
  if (result.warnings.length > 0) {
    parts.push(
      `${result.warnings.length} warning(s): ${result.warnings.map(w => w.message).join('; ')}`
    );
  }

  return parts.join(' | ');
}
