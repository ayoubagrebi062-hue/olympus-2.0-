/**
 * OLYMPUS 2.0 - Generation Retry Loop System
 *
 * Implements retry logic with failure context injection for code generation.
 * Works with the existing validator to ensure generated code meets requirements.
 */

import * as fs from 'fs';
import * as path from 'path';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/** Feature checklist item from STRATEGOS */
export interface FeatureChecklistItem {
  id: string;
  name: string;
  description: string;
  acceptanceCriteria?: string[];
  assignedTo?: string;
}

/** Feature checklist from STRATEGOS */
export interface FeatureChecklist {
  critical?: FeatureChecklistItem[];
  important?: FeatureChecklistItem[];
  niceToHave?: Array<{ id: string; name: string; description: string }>;
}

/** Result of generation with retry */
export interface GenerationResult {
  code: string | null;
  attempts: number;
  passed: boolean;
  failures: string[];
  escalate: boolean;
  metrics: {
    totalTimeMs: number;
    tokensUsed?: number;
  };
}

/** Configuration for retry behavior */
export interface RetryConfig {
  maxRetries: number;
  enableSemanticValidation: boolean;
  logFailures: boolean;
  logPath: string;
}

/** Validation result from checklist validation */
export interface ValidationChecklistResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 2,
  enableSemanticValidation: false, // Enable after stress test baseline
  logFailures: true,
  logPath: './logs/validation-failures.jsonl',
};

// ════════════════════════════════════════════════════════════════════════════════
// FAILURE LOGGING
// ════════════════════════════════════════════════════════════════════════════════

interface FailureLogEntry {
  timestamp: string;
  agent: string;
  attempt: number;
  failures: string[];
  promptSnippet: string;
  pageType?: string;
  featureChecklist?: string[];
}

function ensureLogDirectory(logPath: string): void {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function appendFailureLog(logPath: string, entry: FailureLogEntry): void {
  try {
    ensureLogDirectory(logPath);
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line, 'utf-8');
  } catch (error) {
    console.error('[GenerationRetry] Failed to write log:', error);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PROMPT AUGMENTATION
// ════════════════════════════════════════════════════════════════════════════════

function buildRetryPrompt(
  originalPrompt: string,
  attempt: number,
  previousFailures: string[]
): string {
  if (attempt === 1) {
    return originalPrompt;
  }

  const failureContext = `
⚠️ CRITICAL: PREVIOUS ATTEMPT #${attempt - 1} FAILED VALIDATION

Your last output was REJECTED for these reasons:
${previousFailures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

YOU MUST FIX THESE ISSUES IN THIS ATTEMPT:
${previousFailures.map(failureToFix).join('\n')}

DO NOT:
- Include placeholder text or TODO comments
- Return components that render null
- Use hardcoded colors instead of theme tokens
- Leave empty onClick handlers
- Skip loading/error/empty states

This is attempt ${attempt} of 3. Make it count.
`;

  return `${originalPrompt}\n\n${failureContext}`;
}

function failureToFix(failure: string): string {
  const lowerFailure = failure.toLowerCase();

  if (lowerFailure.includes('missing critical feature')) {
    const feature = failure.replace(/missing critical feature:?/i, '').trim();
    return `→ IMPLEMENT ${feature} completely with full functionality`;
  }
  if (lowerFailure.includes('todo')) {
    return `→ REMOVE all TODO comments and implement actual code`;
  }
  if (lowerFailure.includes('placeholder')) {
    return `→ REPLACE all placeholder text with real content`;
  }
  if (lowerFailure.includes('loading state')) {
    return `→ ADD loading state with Skeleton components matching content shape`;
  }
  if (lowerFailure.includes('error state')) {
    return `→ ADD error state with retry button`;
  }
  if (lowerFailure.includes('empty state')) {
    return `→ ADD empty state with call-to-action`;
  }
  if (lowerFailure.includes('hardcoded color') || lowerFailure.includes('hex')) {
    return `→ REPLACE hardcoded hex colors with theme tokens (bg-background, text-foreground, etc.)`;
  }
  if (lowerFailure.includes('responsive')) {
    return `→ ADD responsive breakpoints (sm/md/lg/xl)`;
  }
  if (lowerFailure.includes('handler') || lowerFailure.includes('onclick')) {
    return `→ ADD real event handlers with actual functionality (not console.log)`;
  }
  if (lowerFailure.includes('stub') || lowerFailure.includes('empty')) {
    return `→ IMPLEMENT full functionality - no stub components allowed`;
  }
  return `→ FIX: ${failure}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// INLINE VALIDATION (Simplified version for retry loop)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Validate code against feature checklist
 * This is a simplified version used in the retry loop
 */
export function validateAgainstFeatureChecklist(
  code: string,
  checklist: FeatureChecklist
): ValidationChecklistResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!checklist?.critical || checklist.critical.length === 0) {
    return { passed: true, errors: [], warnings: [] };
  }

  for (const feature of checklist.critical) {
    const patterns = getFeaturePatterns(feature.id);
    const featureFound = patterns.some(p => p.test(code));

    if (!featureFound) {
      errors.push(`Missing critical feature: ${feature.name}`);
      continue;
    }

    // Check acceptance criteria if defined
    if (feature.acceptanceCriteria && feature.acceptanceCriteria.length > 0) {
      let criteriaMetCount = 0;
      for (const criteria of feature.acceptanceCriteria) {
        const criteriaPatterns = criteriaToPatterns(criteria, feature.id);
        if (criteriaPatterns.some(p => p.test(code))) {
          criteriaMetCount++;
        }
      }

      const percentage = Math.round((criteriaMetCount / feature.acceptanceCriteria.length) * 100);
      if (percentage < 50) {
        errors.push(`${feature.name}: Only ${percentage}% of acceptance criteria met`);
      } else if (percentage < 100) {
        warnings.push(`${feature.name}: ${percentage}% of acceptance criteria met`);
      }
    }
  }

  // Check for stub patterns
  // IMPORTANT: These patterns must NOT match legitimate code patterns
  const stubPatterns = [
    { pattern: /\/\/\s*TODO[:\s]/gi, message: 'Contains TODO comments' },
    { pattern: /\/\/\s*FIXME[:\s]/gi, message: 'Contains FIXME comments' },
    // Match "placeholder" ONLY as JSX content, NOT as HTML attribute
    // Catches: >placeholder<, >Placeholder text<, >placeholder here<
    // Excludes: placeholder="...", placeholder='...'
    { pattern: />\s*placeholder\s*(?:text|content|here)?\s*</gi, message: 'Contains placeholder text in content' },
    { pattern: /lorem ipsum/gi, message: 'Contains lorem ipsum text' },
    { pattern: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, message: 'Empty onClick handlers' },
    { pattern: /onClick=\{\s*\(\)\s*=>\s*console\.log/g, message: 'Console.log-only handlers' },
    { pattern: /coming\s+soon/gi, message: 'Contains "coming soon" text' },
    { pattern: /not\s+implemented/gi, message: 'Contains "not implemented" text' },
    { pattern: />\s*\.{3}\s*</g, message: 'Contains ellipsis as content placeholder' },
  ];

  for (const { pattern, message } of stubPatterns) {
    if (pattern.test(code)) {
      warnings.push(message);
    }
  }

  // Check minimum line count for pages
  const lineCount = code.split('\n').length;
  if (lineCount < 50) {
    warnings.push(`Code too short (${lineCount} lines) - likely incomplete`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get regex patterns for a feature ID
 */
function getFeaturePatterns(featureId: string): RegExp[] {
  const patternMap: Record<string, RegExp[]> = {
    'kanban_columns': [/column/i, /lane/i, /board/i],
    'kanban_board': [/column/i, /board/i, /DndContext/i],
    'task_cards': [/card/i, /task/i, /Card/],
    'drag_drop': [/drag|dnd|draggable|DndContext|useDraggable/i],
    'stats_grid': [/stat|kpi|metric/i, /Card/i],
    'charts': [/chart|Chart|recharts|victory/i],
    'loading_states': [/skeleton|Skeleton|loading|isLoading|Spinner/i],
    'loading': [/loading|isLoading|submitting|isSubmitting/i],
    'activity_feed': [/activity|feed|timeline|recent/i],
    'product_grid': [/product|Product|item|Item/i],
    'search': [/search|Search|filter|Filter|query/i],
    'empty_state': [/empty|Empty|no.*found|NoResults/i],
    'pagination': [/pagination|Pagination|page|Page.*number/i],
    'login_form': [/login|Login|signin|SignIn/i],
    'signup_form': [/signup|SignUp|register|Register/i],
    'validation': [/error|Error|invalid|Invalid|required/i],
    'profile_form': [/profile|Profile|avatar|Avatar/i],
    'save_feedback': [/toast|Toast|notification|success|Success/i],
    'notifications': [/notification|Notification|toggle|Toggle|switch/i],
    'article_cards': [/article|Article|post|Post|blog|Blog/i],
    'responsive': [/sm:|md:|lg:|xl:|grid-cols|flex-col/],
    'message_list': [/message|Message|chat|Chat/i],
    'message_input': [/input|Input|textarea|TextArea|send|Send/i],
    'conversations': [/conversation|Conversation|chat.*list/i],
    'contact_table': [/table|Table|DataTable|contact|Contact/i],
    'crud': [/create|Create|add|Add|edit|Edit|delete|Delete/i],
    'filters': [/filter|Filter|FilterButton|dropdown/i],
    'dark_theme': [/bg-background|bg-card|bg-muted|dark/i],
    'task_crud': [/handleAdd|handleCreate|handleDelete|handleEdit/i],
    'responsive_layout': [/sm:|md:|lg:|grid-cols/],
    'command_palette': [/CommandDialog|cmdk|command.*palette/i],
  };

  const patterns = patternMap[featureId];
  if (patterns) return patterns;

  // Default: search for the feature name/id
  const words = featureId.split('_');
  return words
    .filter(w => w.length >= 3)
    .map(w => new RegExp(w, 'i'));
}

/**
 * Convert acceptance criteria to regex patterns
 * These patterns are intentionally flexible to avoid false negatives
 */
function criteriaToPatterns(criteria: string, featureId: string): RegExp[] {
  const patterns: RegExp[] = [];
  const lower = criteria.toLowerCase();

  // Table/Data display patterns
  if (lower.includes('table') || lower.includes('data') || lower.includes('contact') || lower.includes('shows')) {
    patterns.push(/table|Table|DataTable|DataGrid/i);
    patterns.push(/\.map\s*\(/i);  // Array mapping indicates data display
    patterns.push(/Card|card|grid|Grid/i);
    patterns.push(/name|email|status|contact/i);
  }

  // Layout patterns
  if (lower.includes('layout') || lower.includes('card')) {
    patterns.push(/Card|CardHeader|CardContent|grid|flex/i);
  }

  // Clickable patterns
  if (lower.includes('click')) {
    patterns.push(/onClick|button|Button|Link|cursor-pointer/i);
  }

  // Column/Lane patterns (kanban)
  if (lower.includes('column') || lower.includes('lane')) {
    patterns.push(/column|Column|lane|Lane/);
    patterns.push(/todo|Todo|progress|Progress|done|Done/i);
  }

  // Drag patterns
  if (lower.includes('drag')) {
    patterns.push(/drag|Drag|DndContext|useDraggable|useDroppable/i);
  }

  // Search/Filter patterns
  if (lower.includes('search') || lower.includes('filter') || lower.includes('input')) {
    patterns.push(/search|Search|filter|Filter|query|Query/i);
    patterns.push(/input|Input|onChange/i);
    patterns.push(/setSearch|setFilter|setQuery|handleSearch/i);
  }

  // Count/Number patterns
  if (lower.includes('count') || lower.includes('number')) {
    patterns.push(/\.length|count|Count|total|Total/i);
  }

  // Empty state patterns
  if (lower.includes('empty') || lower.includes('no ') || lower.includes('message')) {
    patterns.push(/empty|Empty|no.*found|NoResults|length\s*===?\s*0/i);
    patterns.push(/No.*found|not.*found/i);
  }

  // CRUD patterns - more flexible
  if (lower.includes('add') || lower.includes('create') || lower.includes('button')) {
    patterns.push(/handleAdd|handleCreate|onCreate|onAdd|Add|Create|Plus/i);
    patterns.push(/button|Button/i);
  }
  if (lower.includes('edit') || lower.includes('update')) {
    patterns.push(/handleEdit|handleUpdate|onEdit|Edit|Update|Pencil/i);
  }
  if (lower.includes('delete') || lower.includes('remove')) {
    patterns.push(/handleDelete|onDelete|Delete|Remove|Trash/i);
  }

  // Modal/Dialog patterns
  if (lower.includes('modal') || lower.includes('dialog') || lower.includes('drawer')) {
    patterns.push(/Dialog|Modal|Sheet|Drawer|isOpen|setIsOpen/i);
  }

  // Grid/Responsive patterns
  if (lower.includes('grid') || lower.includes('responsive')) {
    patterns.push(/grid|Grid|grid-cols|sm:|md:|lg:|flex/);
  }

  // Scroll patterns
  if (lower.includes('scroll')) {
    patterns.push(/scroll|Scroll|overflow|overflow-y/i);
  }

  // Touch patterns
  if (lower.includes('touch')) {
    patterns.push(/touch|Touch|onTouch/i);
  }

  // If no specific patterns matched, extract meaningful keywords
  if (patterns.length === 0) {
    const keywords = criteria.match(/\b[a-zA-Z]{4,}\b/g) || [];
    const skipWords = ['must', 'have', 'with', 'that', 'this', 'from', 'should', 'using', 'least', 'each', 'shows', 'items'];
    for (const keyword of keywords.slice(0, 3)) {
      if (!skipWords.includes(keyword.toLowerCase())) {
        patterns.push(new RegExp(keyword, 'i'));
      }
    }
  }

  return patterns;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN RETRY LOOP
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generate code with automatic retry on validation failure
 */
export async function generateWithRetry(
  generateFn: (prompt: string) => Promise<string>,
  originalPrompt: string,
  checklist: FeatureChecklist,
  agentName: string,
  pageType?: string,
  config: Partial<RetryConfig> = {}
): Promise<GenerationResult> {

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  let lastFailures: string[] = [];
  let lastCode: string | null = null;

  for (let attempt = 1; attempt <= cfg.maxRetries + 1; attempt++) {
    try {
      // Build prompt with failure context if retry
      const prompt = buildRetryPrompt(originalPrompt, attempt, lastFailures);

      // Generate code
      const code = await generateFn(prompt);
      lastCode = code;

      // Validate against feature checklist
      const validation = validateAgainstFeatureChecklist(code, checklist);

      if (validation.passed) {
        return {
          code,
          attempts: attempt,
          passed: true,
          failures: [],
          escalate: false,
          metrics: {
            totalTimeMs: Date.now() - startTime,
          },
        };
      }

      // Validation failed
      lastFailures = [...validation.errors, ...validation.warnings.slice(0, 2)];

      // Log failure
      if (cfg.logFailures) {
        appendFailureLog(cfg.logPath, {
          timestamp: new Date().toISOString(),
          agent: agentName,
          attempt,
          failures: lastFailures,
          promptSnippet: originalPrompt.substring(0, 300),
          pageType,
          featureChecklist: checklist.critical?.map(f => f.name),
        });
      }

      console.log(`[${agentName}] Attempt ${attempt}/${cfg.maxRetries + 1} failed:`, lastFailures);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastFailures = [`Generation error: ${errorMessage}`];

      if (cfg.logFailures) {
        appendFailureLog(cfg.logPath, {
          timestamp: new Date().toISOString(),
          agent: agentName,
          attempt,
          failures: lastFailures,
          promptSnippet: originalPrompt.substring(0, 300),
          pageType,
        });
      }
    }
  }

  // All attempts exhausted
  return {
    code: lastCode,
    attempts: cfg.maxRetries + 1,
    passed: false,
    failures: lastFailures,
    escalate: true,
    metrics: {
      totalTimeMs: Date.now() - startTime,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// SIMPLIFIED WRAPPER FOR COMMON USE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Convenience wrapper for page generation with retry
 */
export async function generatePageWithRetry(
  generateFn: (prompt: string) => Promise<string>,
  prompt: string,
  checklist: FeatureChecklist,
  options: {
    agent: 'WIRE' | 'PIXEL';
    pageType: string;
  }
): Promise<GenerationResult> {
  return generateWithRetry(
    generateFn,
    prompt,
    checklist,
    options.agent,
    options.pageType
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export type { FailureLogEntry };
