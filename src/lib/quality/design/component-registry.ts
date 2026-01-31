/**
 * OLYMPUS 2.1 - Component Registry
 *
 * PIXEL agent can ONLY use components from this registry.
 * Custom components are FORBIDDEN unless added here first.
 *
 * Structure follows Atomic Design:
 * - Atoms: Smallest building blocks (Button, Input, Label)
 * - Molecules: Combinations of atoms (InputGroup, ButtonGroup)
 * - Organisms: Complex components (Form, Modal, DataTable)
 * - Templates: Page layouts (DashboardLayout, AuthLayout)
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComponentSpec {
  variants?: string[];
  sizes?: string[];
  requiredStates?: string[];
  requiredProps?: string[];
  optionalProps?: string[];
  anatomy?: Record<string, unknown>;
  rules?: string[];
  composition?: string[];
  a11y?: {
    role?: string;
    ariaRequired?: string[];
    focusable?: boolean;
    keyboardNav?: string[];
  };
}

export interface ComponentRegistry {
  atoms: Record<string, ComponentSpec>;
  molecules: Record<string, ComponentSpec>;
  organisms: Record<string, ComponentSpec>;
  templates: Record<string, ComponentSpec>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS (Smallest building blocks)
// ═══════════════════════════════════════════════════════════════════════════════

const ATOMS: Record<string, ComponentSpec> = {
  Button: {
    variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
    sizes: ['sm', 'md', 'lg', 'icon'],
    requiredStates: ['default', 'hover', 'active', 'focus', 'disabled', 'loading'],
    requiredProps: ['children'],
    optionalProps: [
      'variant',
      'size',
      'disabled',
      'loading',
      'type',
      'onClick',
      'className',
      'asChild',
    ],
    anatomy: {
      minHeight: { sm: 32, md: 40, lg: 48, icon: 40 },
      paddingX: { sm: 12, md: 16, lg: 24, icon: 0 },
      paddingY: { sm: 6, md: 8, lg: 12, icon: 0 },
      borderRadius: 6,
      fontWeight: 500,
    },
    rules: [
      'MUST have visible action (onClick or type="submit")',
      'MUST have visible hover state',
      'MUST have focus ring (2px offset)',
      'Loading state MUST show spinner AND disable interaction',
      'Adjacent buttons MUST have gap-2 minimum',
      'Icon-only buttons MUST have aria-label',
    ],
    a11y: {
      role: 'button',
      focusable: true,
      keyboardNav: ['Enter', 'Space'],
    },
  },

  Input: {
    variants: ['default', 'error', 'success'],
    sizes: ['sm', 'md', 'lg'],
    requiredStates: ['empty', 'filled', 'focused', 'error', 'disabled', 'readonly'],
    requiredProps: ['value', 'onChange'],
    optionalProps: [
      'placeholder',
      'type',
      'disabled',
      'error',
      'className',
      'id',
      'name',
      'required',
    ],
    anatomy: {
      height: { sm: 32, md: 40, lg: 48 },
      paddingX: 12,
      borderRadius: 6,
    },
    rules: [
      'MUST have associated label (htmlFor)',
      'Error state MUST show error message below',
      'MUST have visible focus ring',
    ],
    a11y: {
      role: 'textbox',
      ariaRequired: ['aria-describedby (when has helper text)'],
      focusable: true,
    },
  },

  Label: {
    requiredProps: ['children', 'htmlFor'],
    optionalProps: ['className', 'required'],
    rules: [
      'MUST be associated with form control via htmlFor',
      'Required indicator (*) should be after text',
    ],
    a11y: {
      role: 'label',
    },
  },

  Badge: {
    variants: ['default', 'secondary', 'success', 'warning', 'error', 'info', 'outline'],
    sizes: ['sm', 'md', 'lg'],
    requiredProps: ['children'],
    optionalProps: ['variant', 'size', 'className'],
    anatomy: {
      paddingX: { sm: 6, md: 8, lg: 10 },
      paddingY: { sm: 2, md: 4, lg: 6 },
      fontSize: { sm: 10, md: 12, lg: 14 },
      borderRadius: 9999, // full
    },
  },

  Avatar: {
    sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    requiredProps: ['src', 'alt'],
    optionalProps: ['fallback', 'size', 'className'],
    anatomy: {
      size: { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 },
    },
    rules: ['MUST have alt text or aria-label', 'Fallback MUST be shown if image fails'],
  },

  Icon: {
    sizes: ['sm', 'md', 'lg', 'xl'],
    requiredProps: ['name'],
    optionalProps: ['size', 'className', 'aria-hidden', 'aria-label'],
    anatomy: {
      size: { sm: 16, md: 20, lg: 24, xl: 32 },
    },
    rules: [
      'Decorative icons MUST have aria-hidden="true"',
      'Functional icons MUST have aria-label',
    ],
  },

  Spinner: {
    sizes: ['sm', 'md', 'lg'],
    optionalProps: ['size', 'className'],
    anatomy: {
      size: { sm: 16, md: 24, lg: 32 },
    },
    rules: ['MUST have aria-label="Loading"', 'Should use prefers-reduced-motion'],
  },

  Divider: {
    variants: ['horizontal', 'vertical'],
    optionalProps: ['orientation', 'className'],
    a11y: {
      role: 'separator',
    },
  },

  Checkbox: {
    requiredStates: ['unchecked', 'checked', 'indeterminate', 'disabled'],
    requiredProps: ['checked', 'onCheckedChange'],
    optionalProps: ['disabled', 'id', 'name', 'className'],
    rules: ['MUST have associated label', 'MUST be keyboard accessible'],
    a11y: {
      role: 'checkbox',
      ariaRequired: ['aria-checked'],
      focusable: true,
      keyboardNav: ['Space'],
    },
  },

  Switch: {
    requiredStates: ['off', 'on', 'disabled'],
    requiredProps: ['checked', 'onCheckedChange'],
    optionalProps: ['disabled', 'id', 'className'],
    rules: ['MUST have associated label', 'Visual state must be clear (on/off)'],
    a11y: {
      role: 'switch',
      ariaRequired: ['aria-checked'],
      focusable: true,
      keyboardNav: ['Space'],
    },
  },

  Select: {
    variants: ['default', 'error'],
    sizes: ['sm', 'md', 'lg'],
    requiredStates: ['closed', 'open', 'disabled'],
    requiredProps: ['value', 'onValueChange', 'options'],
    optionalProps: ['placeholder', 'disabled', 'className'],
    rules: [
      'MUST have associated label',
      'Options MUST be keyboard navigable',
      'Selected value MUST be visible when closed',
    ],
    a11y: {
      role: 'combobox',
      ariaRequired: ['aria-expanded', 'aria-haspopup'],
      focusable: true,
      keyboardNav: ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'],
    },
  },

  Textarea: {
    variants: ['default', 'error'],
    requiredStates: ['empty', 'filled', 'focused', 'error', 'disabled'],
    requiredProps: ['value', 'onChange'],
    optionalProps: ['placeholder', 'rows', 'disabled', 'className', 'maxLength'],
    rules: ['MUST have associated label', 'Consider showing character count if maxLength'],
  },

  Link: {
    variants: ['default', 'muted', 'destructive'],
    requiredProps: ['href', 'children'],
    optionalProps: ['className', 'target', 'rel'],
    rules: [
      'External links SHOULD have target="_blank" rel="noopener"',
      'MUST have meaningful link text (not "click here")',
      'MUST have visible focus state',
    ],
    a11y: {
      focusable: true,
    },
  },

  Skeleton: {
    variants: ['text', 'circle', 'rect'],
    optionalProps: ['width', 'height', 'className'],
    rules: ['Should use prefers-reduced-motion', 'Should match dimensions of content being loaded'],
  },

  Text: {
    variants: ['p', 'span', 'small', 'strong', 'em', 'code'],
    optionalProps: ['as', 'className', 'children'],
  },

  Heading: {
    variants: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    requiredProps: ['children'],
    optionalProps: ['as', 'className'],
    rules: ['MUST follow heading hierarchy (no skipping levels)', 'Only ONE h1 per page'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOLECULES (Combinations of atoms)
// ═══════════════════════════════════════════════════════════════════════════════

const MOLECULES: Record<string, ComponentSpec> = {
  InputGroup: {
    composition: ['Label', 'Input', 'HelperText?', 'ErrorMessage?'],
    rules: [
      'Label MUST be above Input',
      'Error message MUST be below Input',
      'Helper text MUST be below Input, above error',
      'Use space-y-1.5 for internal spacing',
    ],
  },

  ButtonGroup: {
    composition: ['Button[]'],
    variants: ['horizontal', 'vertical'],
    rules: [
      'MUST have gap-2 minimum between buttons',
      'Use flex container',
      'Primary button should be visually dominant',
    ],
  },

  CardHeader: {
    composition: ['Title', 'Subtitle?', 'Action?'],
    rules: [
      'Title MUST be h3 or h4',
      'Action aligns to right',
      'Use flex justify-between for layout',
    ],
  },

  NavItem: {
    composition: ['Icon?', 'Label', 'Badge?'],
    requiredStates: ['default', 'hover', 'active', 'disabled'],
    rules: [
      'Icon and Label MUST have gap-2',
      'Active state MUST be visually distinct',
      'Badge should be on right side',
    ],
  },

  SearchInput: {
    composition: ['Icon', 'Input', 'ClearButton?'],
    rules: [
      'Icon on left',
      'Clear button on right when has value',
      'Consider keyboard shortcut hint (Cmd+K)',
    ],
  },

  FormField: {
    composition: ['Label', 'Input|Select|Textarea', 'HelperText?', 'ErrorMessage?'],
    rules: ['Vertical stack with space-y-1.5', 'Error message replaces helper text when in error'],
  },

  Alert: {
    composition: ['Icon', 'Title?', 'Description', 'CloseButton?'],
    variants: ['info', 'success', 'warning', 'error'],
    rules: [
      'Icon should match variant',
      'Must be dismissible if temporary',
      'Use appropriate aria-live for dynamic alerts',
    ],
    a11y: {
      role: 'alert',
      ariaRequired: ['aria-live="polite"'],
    },
  },

  Tooltip: {
    composition: ['Trigger', 'Content'],
    rules: [
      'Content appears on hover/focus',
      'Has slight delay before showing (150ms)',
      'Must be keyboard accessible',
    ],
    a11y: {
      role: 'tooltip',
    },
  },

  Breadcrumb: {
    composition: ['BreadcrumbItem[]', 'Separator'],
    rules: ['Current page is not a link', 'Use "/" or ">" as separator', 'Wrap in nav element'],
    a11y: {
      role: 'navigation',
      ariaRequired: ['aria-label="Breadcrumb"'],
    },
  },

  Pagination: {
    composition: ['PrevButton', 'PageNumbers', 'NextButton'],
    rules: [
      'Show current page clearly',
      'Truncate if many pages (...)',
      'Disable prev/next at boundaries',
    ],
    a11y: {
      role: 'navigation',
      ariaRequired: ['aria-label="Pagination"'],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORGANISMS (Complex components)
// ═══════════════════════════════════════════════════════════════════════════════

const ORGANISMS: Record<string, ComponentSpec> = {
  Form: {
    composition: ['FormField[]', 'ButtonGroup'],
    rules: [
      'Fields use space-y-4',
      'Submit button at bottom',
      'MUST have onSubmit handler',
      'MUST show loading state during submission',
      'MUST handle errors gracefully',
    ],
  },

  Modal: {
    composition: ['ModalHeader', 'ModalContent', 'ModalFooter?'],
    requiredStates: ['closed', 'open'],
    rules: [
      'MUST have close button',
      'MUST trap focus inside',
      'MUST close on Escape key',
      'MUST have overlay backdrop',
      'MUST return focus to trigger on close',
      'Content MUST be scrollable if tall',
    ],
    a11y: {
      role: 'dialog',
      ariaRequired: ['aria-modal="true"', 'aria-labelledby'],
      focusable: true,
      keyboardNav: ['Escape', 'Tab'],
    },
  },

  Navbar: {
    composition: ['Logo', 'NavItem[]', 'UserMenu?'],
    rules: [
      'Fixed or sticky position',
      'Mobile responsive (hamburger menu)',
      'Height: 64px desktop, 56px mobile',
    ],
    a11y: {
      role: 'navigation',
    },
  },

  Sidebar: {
    composition: ['NavSection[]'],
    requiredStates: ['expanded', 'collapsed'],
    rules: ['Collapsible on mobile', 'Fixed width on desktop (256px)', 'Collapsed width: 64px'],
    a11y: {
      role: 'navigation',
    },
  },

  DataTable: {
    composition: ['TableHeader', 'TableBody', 'TablePagination?'],
    requiredStates: ['loading', 'empty', 'populated', 'error'],
    rules: [
      'MUST have empty state with icon + message',
      'Loading state MUST show skeleton rows',
      'Sortable columns MUST have indicators',
      'MUST be horizontally scrollable if wide',
    ],
    a11y: {
      role: 'table',
      ariaRequired: ['aria-label or aria-labelledby'],
    },
  },

  Card: {
    variants: ['default', 'elevated', 'outlined', 'interactive'],
    composition: ['CardHeader?', 'CardContent', 'CardFooter?'],
    anatomy: {
      padding: 16,
      borderRadius: 8,
    },
    rules: ['Interactive cards MUST have hover state', 'Interactive cards MUST be focusable'],
  },

  Toast: {
    variants: ['default', 'success', 'warning', 'error', 'info'],
    requiredProps: ['message'],
    optionalProps: ['action', 'duration'],
    rules: ['Auto-dismiss after duration (default 5s)', 'Has close button', 'Stacks if multiple'],
    a11y: {
      role: 'status',
      ariaRequired: ['aria-live="polite"'],
    },
  },

  Dialog: {
    composition: ['DialogHeader', 'DialogContent', 'DialogFooter'],
    rules: [
      'Same as Modal but for confirmations',
      'Has Cancel and Confirm buttons',
      'Destructive actions should have destructive button',
    ],
    a11y: {
      role: 'alertdialog',
      ariaRequired: ['aria-modal="true"', 'aria-labelledby', 'aria-describedby'],
    },
  },

  Dropdown: {
    composition: ['DropdownTrigger', 'DropdownContent'],
    requiredStates: ['closed', 'open'],
    rules: [
      'Closes on outside click',
      'Keyboard navigable (arrow keys)',
      'Items MUST be focusable',
    ],
    a11y: {
      role: 'menu',
      ariaRequired: ['aria-expanded'],
      keyboardNav: ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'],
    },
  },

  Tabs: {
    composition: ['TabList', 'TabPanel[]'],
    rules: [
      'One tab active at a time',
      'Keyboard navigable (arrow keys)',
      'Panel content changes when tab changes',
    ],
    a11y: {
      role: 'tablist',
      ariaRequired: ['aria-selected'],
      keyboardNav: ['ArrowLeft', 'ArrowRight'],
    },
  },

  Accordion: {
    composition: ['AccordionItem[]'],
    variants: ['single', 'multiple'],
    rules: [
      'Single: only one open at a time',
      'Multiple: any number can be open',
      'Headers are focusable',
    ],
    a11y: {
      ariaRequired: ['aria-expanded'],
      keyboardNav: ['Enter', 'Space'],
    },
  },

  CommandPalette: {
    composition: ['SearchInput', 'CommandList', 'CommandItem[]'],
    rules: [
      'Opens with keyboard shortcut (Cmd+K)',
      'Fuzzy search filtering',
      'Keyboard navigation',
    ],
    a11y: {
      role: 'dialog',
      keyboardNav: ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES (Page layouts)
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATES: Record<string, ComponentSpec> = {
  DashboardLayout: {
    composition: ['Sidebar', 'Navbar', 'MainContent'],
    rules: [
      'Sidebar fixed left',
      'Navbar fixed top (or sticky)',
      'Content scrollable',
      'Responsive: sidebar collapses on mobile',
    ],
  },

  AuthLayout: {
    composition: ['Card', 'Form'],
    rules: [
      'Centered vertically and horizontally',
      'Max width 400px',
      'Optional branding/illustration',
    ],
  },

  SettingsLayout: {
    composition: ['SettingsNav', 'SettingsContent'],
    rules: ['Nav on left, content on right', 'Nav becomes tabs on mobile'],
  },

  ListLayout: {
    composition: ['FilterBar', 'DataTable|CardGrid', 'Pagination'],
    rules: ['Filter bar sticky (or at top)', 'Content scrollable', 'Empty state when no results'],
  },

  DetailLayout: {
    composition: ['Breadcrumb', 'Header', 'Content', 'Actions'],
    rules: [
      'Back navigation available',
      'Primary action prominent',
      'Related items section optional',
    ],
  },

  WizardLayout: {
    composition: ['ProgressIndicator', 'StepContent', 'NavigationButtons'],
    rules: ['Clear step count', 'Save progress if 3+ steps', 'Can go back to previous steps'],
  },

  ErrorLayout: {
    composition: ['Illustration', 'Message', 'Actions'],
    rules: [
      'Clear explanation of error',
      'Path to recovery (retry, go home)',
      'Support link optional',
    ],
  },

  EmptyLayout: {
    composition: ['Illustration', 'Message', 'PrimaryAction'],
    rules: ['Guide to first action', 'Explain value proposition', 'Make CTA obvious'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDATED REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_REGISTRY: ComponentRegistry = {
  atoms: ATOMS,
  molecules: MOLECULES,
  organisms: ORGANISMS,
  templates: TEMPLATES,
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function isValidComponent(name: string): boolean {
  const allComponents = [
    ...Object.keys(COMPONENT_REGISTRY.atoms),
    ...Object.keys(COMPONENT_REGISTRY.molecules),
    ...Object.keys(COMPONENT_REGISTRY.organisms),
    ...Object.keys(COMPONENT_REGISTRY.templates),
  ];
  return allComponents.includes(name);
}

export function getComponentSpec(name: string): ComponentSpec | undefined {
  return (
    COMPONENT_REGISTRY.atoms[name] ||
    COMPONENT_REGISTRY.molecules[name] ||
    COMPONENT_REGISTRY.organisms[name] ||
    COMPONENT_REGISTRY.templates[name]
  );
}

export function getComponentCategory(
  name: string
): 'atom' | 'molecule' | 'organism' | 'template' | null {
  if (COMPONENT_REGISTRY.atoms[name]) return 'atom';
  if (COMPONENT_REGISTRY.molecules[name]) return 'molecule';
  if (COMPONENT_REGISTRY.organisms[name]) return 'organism';
  if (COMPONENT_REGISTRY.templates[name]) return 'template';
  return null;
}

export function getAllComponents(): string[] {
  return [
    ...Object.keys(COMPONENT_REGISTRY.atoms),
    ...Object.keys(COMPONENT_REGISTRY.molecules),
    ...Object.keys(COMPONENT_REGISTRY.organisms),
    ...Object.keys(COMPONENT_REGISTRY.templates),
  ];
}

export function getComponentVariants(name: string): string[] {
  const spec = getComponentSpec(name);
  return spec?.variants || [];
}

export function getComponentSizes(name: string): string[] {
  const spec = getComponentSpec(name);
  return spec?.sizes || [];
}

export function getRequiredStates(name: string): string[] {
  const spec = getComponentSpec(name);
  return spec?.requiredStates || [];
}

export function getComponentRules(name: string): string[] {
  const spec = getComponentSpec(name);
  return spec?.rules || [];
}
