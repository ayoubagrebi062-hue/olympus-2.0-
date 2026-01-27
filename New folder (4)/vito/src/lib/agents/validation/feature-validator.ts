/**
 * FEATURE VALIDATOR
 * Verifies that user-requested features exist in generated code
 *
 * This is the SEMANTIC validation layer that ensures:
 * - User asks for "kanban" → Code contains kanban components
 * - User asks for "dark theme" → Code uses dark colors
 * - User asks for "drag and drop" → Code has DnD implementation
 */

export interface FeatureRequirement {
  /** Human-readable feature name */
  name: string;

  /** Keywords that indicate this feature (any match = found) */
  keywords: string[];

  /** Regex patterns to match (any match = found) */
  patterns: RegExp[];

  /** Component names that indicate this feature */
  components?: string[];

  /** Minimum occurrences required (default: 1) */
  minOccurrences?: number;

  /** Is this feature critical? If missing = ERROR vs WARNING */
  critical?: boolean;
}

export interface FeatureValidationResult {
  valid: boolean;
  score: number; // 0-100
  foundFeatures: string[];
  missingFeatures: string[];
  partialFeatures: Array<{
    name: string;
    found: number;
    required: number;
  }>;
  details: Array<{
    feature: string;
    status: 'found' | 'missing' | 'partial';
    evidence: string[];
  }>;
}

/**
 * Common feature patterns extracted from user requests
 */
export const FEATURE_PATTERNS: Record<string, FeatureRequirement> = {
  // UI Patterns
  kanban: {
    name: 'Kanban Board',
    keywords: ['kanban', 'board', 'column', 'lane', 'swimlane'],
    patterns: [
      /column|lane|board/i,
      /drag.*drop|dnd|draggable/i,
      /useDrag|useDrop|DndContext/i,
    ],
    components: ['KanbanBoard', 'Column', 'Lane', 'TaskCard', 'DragDropContext'],
    minOccurrences: 3,
    critical: true,
  },

  dashboard: {
    name: 'Dashboard',
    keywords: ['dashboard', 'analytics', 'metrics', 'stats'],
    patterns: [
      /stat.*card|metric/i,
      /chart|graph/i,
      /overview|summary/i,
    ],
    components: ['StatCard', 'Chart', 'MetricCard', 'DashboardCard'],
    minOccurrences: 2,
    critical: true,
  },

  dataTable: {
    name: 'Data Table',
    keywords: ['table', 'grid', 'list', 'rows'],
    patterns: [
      /<table|<Table|DataTable/i,
      /thead|tbody|th|td/i,
      /columns.*rows|pagination/i,
    ],
    components: ['Table', 'DataTable', 'DataGrid'],
    minOccurrences: 1,
    critical: true,
  },

  form: {
    name: 'Form',
    keywords: ['form', 'input', 'submit'],
    patterns: [
      /<form|<Form|useForm/i,
      /onSubmit|handleSubmit/i,
      /validation|schema/i,
    ],
    components: ['Form', 'FormField', 'Input', 'Select'],
    minOccurrences: 1,
    critical: true,
  },

  // Theme Patterns
  // CRITICAL FIX: Dark theme should recognize design tokens, not just hardcoded colors
  darkTheme: {
    name: 'Dark Theme',
    keywords: ['dark', 'night', 'black background'],
    patterns: [
      // Design tokens (CORRECT way to implement dark theme)
      /bg-background|bg-card|bg-muted|bg-popover|bg-accent/i,
      /text-foreground|text-muted-foreground|text-card-foreground/i,
      /border-border|border-input/i,
      // Tailwind dark mode utilities
      /dark:|\.dark\s/i,
      // Legacy: hardcoded dark colors (still valid but not preferred)
      /bg-\[#0[0-9a-fA-F]{5}\]|bg-black|bg-slate-9|bg-zinc-9|bg-neutral-9/i,
      /background:\s*#0|background:\s*rgb\(0/i,
    ],
    minOccurrences: 3,
    critical: false,
  },

  lightTheme: {
    name: 'Light Theme',
    keywords: ['light', 'white background', 'bright'],
    patterns: [
      /bg-white|bg-slate-[0-2]|bg-gray-[0-2]/i,
      /background:\s*#f|background:\s*white/i,
    ],
    minOccurrences: 3,
    critical: false,
  },

  glassmorphism: {
    name: 'Glassmorphism',
    keywords: ['glass', 'blur', 'frosted', 'transparent'],
    patterns: [
      /backdrop-blur|backdrop-filter/i,
      /bg-white\/\[0\.|bg-black\/\[0\./i,
      /glass|frosted/i,
    ],
    minOccurrences: 2,
    critical: false,
  },

  // Interaction Patterns
  dragDrop: {
    name: 'Drag and Drop',
    keywords: ['drag', 'drop', 'dnd', 'sortable', 'reorder'],
    patterns: [
      /useDrag|useDrop|DndContext|DragDropContext/i,
      /draggable|droppable/i,
      /onDragStart|onDragEnd|onDrop/i,
    ],
    components: ['Draggable', 'Droppable', 'SortableItem'],
    minOccurrences: 1,
    critical: true,
  },

  realtime: {
    name: 'Real-time Updates',
    keywords: ['realtime', 'real-time', 'live', 'websocket', 'subscription'],
    patterns: [
      /useSubscription|onSnapshot|websocket/i,
      /realtime|real-time/i,
      /socket\.io|pusher|ably/i,
    ],
    minOccurrences: 1,
    critical: false,
  },

  // Navigation Patterns
  sidebar: {
    name: 'Sidebar Navigation',
    keywords: ['sidebar', 'side navigation', 'nav'],
    patterns: [
      /<aside|Sidebar|SideNav/i,
      /fixed.*left|left-0/i,
      /w-64|w-72|w-80/i, // Common sidebar widths
    ],
    components: ['Sidebar', 'SideNav', 'Navigation'],
    minOccurrences: 1,
    critical: false,
  },

  commandPalette: {
    name: 'Command Palette',
    keywords: ['command', 'cmd+k', 'ctrl+k', 'spotlight', 'quick actions'],
    patterns: [
      /cmdk|CommandPalette|CommandMenu/i,
      /Cmd\+K|Ctrl\+K|⌘K/i,
      /useHotkeys.*k|useKeyboard.*k/i,
    ],
    components: ['CommandPalette', 'CommandMenu', 'Command'],
    minOccurrences: 1,
    critical: false,
  },

  // Auth Patterns
  authentication: {
    name: 'Authentication',
    keywords: ['login', 'signin', 'signup', 'auth', 'register'],
    patterns: [
      /signIn|signUp|login|register/i,
      /useAuth|AuthProvider|SessionProvider/i,
      /password|email.*input/i,
    ],
    components: ['LoginForm', 'SignupForm', 'AuthForm'],
    minOccurrences: 1,
    critical: true,
  },
};

/**
 * Extract required features from user prompt
 */
export function extractRequiredFeatures(userPrompt: string): FeatureRequirement[] {
  const prompt = userPrompt.toLowerCase();
  const required: FeatureRequirement[] = [];

  for (const [, feature] of Object.entries(FEATURE_PATTERNS)) {
    // Check if any keyword matches
    const hasKeyword = feature.keywords.some(kw => prompt.includes(kw.toLowerCase()));

    if (hasKeyword) {
      required.push(feature);
    }
  }

  // Also check for brand references that imply features
  if (prompt.includes('linear')) {
    if (!required.find(f => f.name === 'Kanban Board')) {
      required.push(FEATURE_PATTERNS.kanban);
    }
    if (!required.find(f => f.name === 'Dark Theme')) {
      required.push(FEATURE_PATTERNS.darkTheme);
    }
    if (!required.find(f => f.name === 'Command Palette')) {
      required.push(FEATURE_PATTERNS.commandPalette);
    }
  }

  if (prompt.includes('notion')) {
    if (!required.find(f => f.name === 'Sidebar Navigation')) {
      required.push(FEATURE_PATTERNS.sidebar);
    }
  }

  if (prompt.includes('trello') || prompt.includes('jira')) {
    if (!required.find(f => f.name === 'Kanban Board')) {
      required.push(FEATURE_PATTERNS.kanban);
    }
    if (!required.find(f => f.name === 'Drag and Drop')) {
      required.push(FEATURE_PATTERNS.dragDrop);
    }
  }

  return required;
}

/**
 * Validate that code contains required features
 */
export function validateFeatures(
  code: string,
  requirements: FeatureRequirement[]
): FeatureValidationResult {
  const foundFeatures: string[] = [];
  const missingFeatures: string[] = [];
  const partialFeatures: Array<{ name: string; found: number; required: number }> = [];
  const details: Array<{ feature: string; status: 'found' | 'missing' | 'partial'; evidence: string[] }> = [];

  for (const req of requirements) {
    const evidence: string[] = [];
    let matchCount = 0;

    // Check keywords
    for (const keyword of req.keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = code.match(regex);
      if (matches) {
        matchCount += matches.length;
        evidence.push(`Keyword '${keyword}' found ${matches.length}x`);
      }
    }

    // Check patterns
    for (const pattern of req.patterns) {
      const matches = code.match(pattern);
      if (matches) {
        matchCount += matches.length;
        evidence.push(`Pattern '${pattern.source}' matched ${matches.length}x`);
      }
    }

    // Check components
    if (req.components) {
      for (const comp of req.components) {
        const regex = new RegExp(`<${comp}|import.*${comp}`, 'g');
        const matches = code.match(regex);
        if (matches) {
          matchCount += matches.length;
          evidence.push(`Component '${comp}' found ${matches.length}x`);
        }
      }
    }

    // Determine status
    const minRequired = req.minOccurrences || 1;

    if (matchCount >= minRequired) {
      foundFeatures.push(req.name);
      details.push({ feature: req.name, status: 'found', evidence });
    } else if (matchCount > 0) {
      partialFeatures.push({ name: req.name, found: matchCount, required: minRequired });
      details.push({ feature: req.name, status: 'partial', evidence });
    } else {
      missingFeatures.push(req.name);
      details.push({ feature: req.name, status: 'missing', evidence: ['No matches found'] });
    }
  }

  // Calculate score
  const totalFeatures = requirements.length;
  const foundCount = foundFeatures.length + (partialFeatures.length * 0.5);
  const score = totalFeatures > 0 ? Math.round((foundCount / totalFeatures) * 100) : 100;

  // Check if any critical features are missing
  const criticalMissing = requirements
    .filter(r => r.critical)
    .filter(r => missingFeatures.includes(r.name));

  return {
    valid: criticalMissing.length === 0 && score >= 50,
    score,
    foundFeatures,
    missingFeatures,
    partialFeatures,
    details,
  };
}

/**
 * Generate a validation report
 */
export function generateFeatureReport(result: FeatureValidationResult): string {
  const lines: string[] = [
    '## Feature Validation Report',
    '',
    `**Score:** ${result.score}/100`,
    `**Status:** ${result.valid ? 'PASS' : 'FAIL'}`,
    '',
  ];

  if (result.foundFeatures.length > 0) {
    lines.push('### Found Features');
    for (const f of result.foundFeatures) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  if (result.partialFeatures.length > 0) {
    lines.push('### Partial Features');
    for (const f of result.partialFeatures) {
      lines.push(`- ${f.name} (found ${f.found}/${f.required} occurrences)`);
    }
    lines.push('');
  }

  if (result.missingFeatures.length > 0) {
    lines.push('### Missing Features');
    for (const f of result.missingFeatures) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
