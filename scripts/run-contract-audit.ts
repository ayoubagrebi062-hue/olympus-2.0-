/**
 * OLYMPUS 2.0 - Contract Audit CLI
 *
 * PURPOSE: Validate agent handoffs against defined contracts to find root causes
 * of cascading failures. This is an INVESTIGATION tool - not a fixer.
 *
 * Run: npx tsx scripts/run-contract-audit.ts [buildId]
 *      npx tsx scripts/run-contract-audit.ts --file <path-to-checkpoint.json>
 *      npx tsx scripts/run-contract-audit.ts --mock (run with mock data)
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  getContractValidator,
  ALL_CONTRACTS,
  type ContractValidationResult,
  type ContractAuditResult,
  type ViolationPattern,
  type ContractViolation,
} from '../src/lib/agents/contracts';
import type { SerializedAgentOutput } from '../src/lib/agents/conductor/checkpoint/types';

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

interface CLIArgs {
  buildId?: string;
  file?: string;
  mock?: boolean;
  verbose?: boolean;
  outputFile?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      result.file = args[i + 1];
      i++;
    } else if (args[i] === '--mock') {
      result.mock = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      result.verbose = true;
    } else if (args[i] === '--output' && args[i + 1]) {
      result.outputFile = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      result.buildId = args[i];
    }
  }

  return result;
}

// ============================================================================
// DATA LOADING
// ============================================================================

interface AgentOutputData {
  agentId: string;
  data: unknown;
  phase?: string;
}

async function loadFromCheckpoint(filePath: string): Promise<AgentOutputData[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const checkpoint = JSON.parse(content);

  const outputs: AgentOutputData[] = [];

  // Handle both Map-like objects and arrays
  const agentOutputs = checkpoint.state?.agentOutputs || checkpoint.agentOutputs || {};

  if (agentOutputs instanceof Map || typeof agentOutputs[Symbol.iterator] === 'function') {
    for (const [agentId, output] of agentOutputs) {
      outputs.push({
        agentId,
        data: (output as SerializedAgentOutput).data || (output as SerializedAgentOutput).output,
        phase: (output as SerializedAgentOutput).phase,
      });
    }
  } else if (Array.isArray(agentOutputs)) {
    for (const output of agentOutputs) {
      outputs.push({
        agentId: output.agentId || output[0],
        data: output.data || output.output || output[1]?.data,
        phase: output.phase,
      });
    }
  } else {
    // Plain object
    for (const [agentId, output] of Object.entries(agentOutputs)) {
      const typedOutput = output as SerializedAgentOutput;
      outputs.push({
        agentId,
        data: typedOutput.data || typedOutput.output,
        phase: typedOutput.phase,
      });
    }
  }

  return outputs;
}

function generateMockData(): AgentOutputData[] {
  // Mock data that simulates REALISTIC failure patterns from actual OLYMPUS builds
  // These patterns are based on observed failures in the agent system
  return [
    // STRATEGOS output - partial compliance (common pattern)
    {
      agentId: 'strategos',
      phase: 'discovery',
      data: {
        mvp_features: [
          {
            id: 'F001',
            name: 'User Authentication',
            category: 'auth',
            priority: 'must_have',
            description: 'User login, registration, password reset with OAuth support',
          },
          {
            id: 'F002',
            name: 'Dashboard Overview',
            category: 'core',
            priority: 'must_have',
            description: 'Main dashboard with key metrics and quick actions',
          },
          {
            id: 'F003',
            name: 'Project Management',
            category: 'core',
            priority: 'must_have',
            description: 'Create, edit, delete projects with team collaboration',
          },
          {
            id: 'F004',
            name: 'Settings Panel',
            category: 'settings',
            priority: 'should_have',
            description: 'User preferences and account settings',
          },
          {
            id: 'F005',
            name: 'Notification System',
            category: 'engagement',
            priority: 'should_have',
            description: 'In-app and email notifications',
          },
          {
            id: 'F006',
            name: 'Analytics',
            category: 'reporting',
            priority: 'could_have',
            description: 'Usage analytics and reporting',
          },
        ],
        featureChecklist: {
          critical: [
            {
              id: 'C001',
              name: 'Secure Login',
              acceptanceCriteria: ['Email/password auth', 'OAuth providers', 'MFA support'],
            },
            {
              id: 'C002',
              name: 'Data Persistence',
              acceptanceCriteria: ['PostgreSQL storage', 'Real-time sync'],
            },
            {
              id: 'C003',
              name: 'Responsive UI',
              acceptanceCriteria: ['Mobile-first', 'Touch gestures'],
            },
          ],
          important: [
            { id: 'I001', name: 'Search', description: 'Full-text search across resources' },
          ],
        },
        technical_requirements: {
          stack: {
            frontend: 'Next.js 14 with React 18',
            database: 'Supabase PostgreSQL',
            backend: 'Next.js API routes',
          },
          performance: {
            pageLoad: '<2s',
            apiLatency: '<200ms',
          },
        },
        roadmap: {
          phase_1_mvp: {
            duration: '4 weeks',
            features: ['F001', 'F002', 'F003'],
          },
        },
      },
    },

    // PALETTE output - mostly complete but missing some details
    {
      agentId: 'palette',
      phase: 'design',
      data: {
        colors: {
          primary: {
            '50': '#eff6ff',
            '100': '#dbeafe',
            '200': '#bfdbfe',
            '300': '#93c5fd',
            '400': '#60a5fa',
            '500': '#3b82f6',
            '600': '#2563eb',
            '700': '#1d4ed8',
            '800': '#1e40af',
            '900': '#1e3a8a',
            '950': '#172554',
          },
          secondary: {
            '50': '#faf5ff',
            '100': '#f3e8ff',
            '200': '#e9d5ff',
            '300': '#d8b4fe',
            '400': '#c084fc',
            '500': '#a855f7',
            '600': '#9333ea',
            '700': '#7c3aed',
            '800': '#6b21a8',
            '900': '#581c87',
            '950': '#3b0764',
          },
          neutral: {
            '50': '#fafafa',
            '100': '#f4f4f5',
            '200': '#e4e4e7',
            '300': '#d4d4d8',
            '400': '#a1a1aa',
            '500': '#71717a',
            '600': '#52525b',
            '700': '#3f3f46',
            '800': '#27272a',
            '900': '#18181b',
          },
          semantic: {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
          },
        },
        typography: {
          heading_family: 'Inter',
          body_family: 'Inter',
          heading_weights: [600, 700, 800],
          body_weights: [400, 500, 600],
          recommended_sizes: {
            h1: '2.25rem',
            h2: '1.875rem',
            h3: '1.5rem',
            h4: '1.25rem',
            body: '1rem',
            small: '0.875rem',
          },
        },
        design_tokens: {
          spacing: {
            xs: '0.25rem',
            sm: '0.5rem',
            md: '1rem',
            lg: '1.5rem',
            xl: '2rem',
            '2xl': '3rem',
          },
          border_radius: {
            none: '0',
            sm: '0.25rem',
            md: '0.5rem',
            lg: '1rem',
            full: '9999px',
          },
          shadows: {
            sm: '0 1px 2px rgba(0,0,0,0.05)',
            md: '0 4px 6px rgba(0,0,0,0.1)',
            lg: '0 10px 15px rgba(0,0,0,0.1)',
          },
        },
        accessibility: {
          wcag_level: 'AA',
          contrast_ratios: { 'primary-on-white': 4.5, 'text-on-bg': 7 },
        },
      },
    },

    // BLOCKS output - THE CRITICAL FAILURE POINT
    // This simulates the common issue: not enough components, missing states
    {
      agentId: 'blocks',
      phase: 'design',
      data: {
        components: [
          // ATOMS (should be 8-10, we have 5)
          {
            name: 'Button',
            category: 'atom',
            description: 'Primary action button',
            anatomy: { parts: ['root', 'icon', 'label'] },
            variants: {
              default: { classes: 'btn' },
              primary: { classes: 'btn-primary' },
              secondary: { classes: 'btn-secondary' },
            },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { variant: 'string', size: 'string', disabled: 'boolean' },
          },
          {
            name: 'Input',
            category: 'atom',
            description: 'Text input field',
            anatomy: { parts: ['wrapper', 'input', 'label', 'error'] },
            variants: { default: { classes: 'input' }, error: { classes: 'input-error' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { type: 'string', placeholder: 'string' },
          },
          {
            name: 'Icon',
            category: 'atom',
            description: 'SVG icon wrapper',
            anatomy: { parts: ['root'] },
            variants: { default: { classes: 'icon' }, sm: { classes: 'icon-sm' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { name: 'string', size: 'number' },
          },
          {
            name: 'Text',
            category: 'atom',
            description: 'Typography component',
            anatomy: { parts: ['root'] },
            variants: { h1: { classes: 'text-4xl' }, body: { classes: 'text-base' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { as: 'string' },
          },
          {
            name: 'Badge',
            category: 'atom',
            description: 'Status badge',
            anatomy: { parts: ['root'] },
            variants: { default: { classes: 'badge' }, success: { classes: 'badge-success' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { variant: 'string' },
          },

          // MOLECULES (should be 20+, we have 8)
          {
            name: 'FormField',
            category: 'molecule',
            description: 'Form field with label',
            anatomy: { parts: ['wrapper', 'label', 'input', 'helper', 'error'] },
            variants: { default: { classes: 'form-field' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { label: 'string', error: 'string' },
          },
          {
            name: 'SearchBar',
            category: 'molecule',
            description: 'Search input with icon',
            anatomy: { parts: ['wrapper', 'icon', 'input', 'clear'] },
            variants: { default: { classes: 'search' }, compact: { classes: 'search-compact' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { placeholder: 'string' },
          },
          {
            name: 'NavItem',
            category: 'molecule',
            description: 'Navigation link',
            anatomy: { parts: ['root', 'icon', 'label'] },
            variants: { default: { classes: 'nav-item' }, active: { classes: 'nav-item-active' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { href: 'string', active: 'boolean' },
          },
          {
            name: 'Card',
            category: 'molecule',
            description: 'Content card',
            anatomy: { parts: ['root', 'header', 'body', 'footer'] },
            variants: { default: { classes: 'card' }, elevated: { classes: 'card-elevated' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { title: 'string' },
          },
          {
            name: 'Avatar',
            category: 'molecule',
            description: 'User avatar',
            anatomy: { parts: ['root', 'image', 'fallback'] },
            variants: { sm: { classes: 'avatar-sm' }, md: { classes: 'avatar-md' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { src: 'string', alt: 'string' },
          },
          {
            name: 'Dropdown',
            category: 'molecule',
            description: 'Dropdown menu',
            anatomy: { parts: ['trigger', 'menu', 'item'] },
            variants: { default: { classes: 'dropdown' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { options: 'array' },
          },
          {
            name: 'Modal',
            category: 'molecule',
            description: 'Modal dialog',
            anatomy: { parts: ['overlay', 'container', 'header', 'body', 'footer'] },
            variants: { default: { classes: 'modal' }, large: { classes: 'modal-lg' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { open: 'boolean', onClose: 'function' },
          },
          {
            name: 'Toast',
            category: 'molecule',
            description: 'Notification toast',
            anatomy: { parts: ['root', 'icon', 'message', 'close'] },
            variants: { success: { classes: 'toast-success' }, error: { classes: 'toast-error' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { message: 'string', type: 'string' },
          },

          // ORGANISMS (should be 15+, we have 5)
          {
            name: 'Header',
            category: 'organism',
            description: 'App header',
            anatomy: { parts: ['root', 'logo', 'nav', 'actions'] },
            variants: { default: { classes: 'header' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: {},
          },
          {
            name: 'Sidebar',
            category: 'organism',
            description: 'Side navigation',
            anatomy: { parts: ['root', 'header', 'nav', 'footer'] },
            variants: {
              default: { classes: 'sidebar' },
              collapsed: { classes: 'sidebar-collapsed' },
            },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { collapsed: 'boolean' },
          },
          {
            name: 'Footer',
            category: 'organism',
            description: 'App footer',
            anatomy: { parts: ['root', 'links', 'copyright'] },
            variants: { default: { classes: 'footer' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: {},
          },
          {
            name: 'DataTable',
            category: 'organism',
            description: 'Data table with sorting',
            anatomy: { parts: ['root', 'header', 'body', 'row', 'cell', 'pagination'] },
            variants: { default: { classes: 'table' }, compact: { classes: 'table-compact' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { data: 'array', columns: 'array' },
          },
          {
            name: 'Form',
            category: 'organism',
            description: 'Form container',
            anatomy: { parts: ['root', 'fields', 'actions'] },
            variants: { default: { classes: 'form' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { onSubmit: 'function' },
          },

          // MORE ATOMS/MOLECULES needed... (simulating truncated output)
          {
            name: 'Checkbox',
            category: 'atom',
            description: 'Checkbox input',
            anatomy: { parts: ['root', 'input', 'label'] },
            variants: { default: { classes: 'checkbox' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { checked: 'boolean' },
          },
          {
            name: 'Radio',
            category: 'atom',
            description: 'Radio input',
            anatomy: { parts: ['root', 'input', 'label'] },
            variants: { default: { classes: 'radio' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { checked: 'boolean' },
          },
          {
            name: 'Select',
            category: 'molecule',
            description: 'Select dropdown',
            anatomy: { parts: ['root', 'trigger', 'options'] },
            variants: { default: { classes: 'select' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { options: 'array', value: 'string' },
          },
          {
            name: 'Tabs',
            category: 'molecule',
            description: 'Tab navigation',
            anatomy: { parts: ['root', 'list', 'tab', 'panel'] },
            variants: { default: { classes: 'tabs' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { tabs: 'array', activeTab: 'string' },
          },
          {
            name: 'Accordion',
            category: 'molecule',
            description: 'Collapsible sections',
            anatomy: { parts: ['root', 'item', 'trigger', 'content'] },
            variants: { default: { classes: 'accordion' } },
            states: [
              'default',
              'hover',
              'focus',
              'active',
              'disabled',
              'loading',
              'error',
              'success',
            ],
            props: { items: 'array' },
          },

          // Total: 20 components (should be 55+)
        ],
      },
    },

    // PIXEL output - STUB CODE ISSUE
    // This simulates the pattern where PIXEL generates stubs instead of full implementations
    {
      agentId: 'pixel',
      phase: 'frontend',
      data: {
        files: [
          // Real implementation
          {
            path: 'src/components/atoms/Button.tsx',
            content: `'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

export default Button;`,
          },
          // Stub - common failure pattern
          {
            path: 'src/components/atoms/Input.tsx',
            content: `'use client';

import React from 'react';

// TODO: Implement Input component with validation
export function Input() {
  return <input className="input" />;
}

export default Input;`,
          },
          // Another stub
          {
            path: 'src/components/atoms/Icon.tsx',
            content: `export const Icon = ({ name }: { name: string }) => {
  // TODO: Add icon library
  return <span>{name}</span>;
};`,
          },
          // Real implementation
          {
            path: 'src/components/molecules/Card.tsx',
            content: `'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-card text-card-foreground',
        {
          'border shadow-sm': variant === 'default',
          'shadow-lg': variant === 'elevated',
          'border-2': variant === 'outlined',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}

export default Card;`,
          },
          // Empty stub
          {
            path: 'src/components/molecules/SearchBar.tsx',
            content: `export function SearchBar() {
  return null;
}`,
          },
          // Minimal
          {
            path: 'src/components/molecules/FormField.tsx',
            content: `export const FormField = () => <div></div>;`,
          },
          // Good implementation
          {
            path: 'src/components/organisms/Header.tsx',
            content: `'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';

interface HeaderProps {
  logo?: React.ReactNode;
  navigation?: Array<{ label: string; href: string }>;
}

export function Header({ logo, navigation = [] }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          {logo || <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Logo</span>
          </Link>}
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === item.href ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="sm">Sign In</Button>
          <Button size="sm">Get Started</Button>
        </div>
      </div>
    </header>
  );
}

export default Header;`,
          },
          // More stubs that represent the pattern
          {
            path: 'src/components/organisms/Sidebar.tsx',
            content: `// TODO: Implement sidebar\nexport const Sidebar = () => null;`,
          },
          {
            path: 'src/components/organisms/Footer.tsx',
            content: `export function Footer() { return <footer>Footer</footer>; }`,
          },
          {
            path: 'src/components/molecules/Avatar.tsx',
            content: `export const Avatar = ({ src }: { src: string }) => <img src={src} />;`,
          },
          {
            path: 'src/components/molecules/Modal.tsx',
            content: `'use client';\n\nexport function Modal() {\n  // TODO: Modal implementation\n  return <div className="modal" />;\n}`,
          },

          // Total: 11 files instead of 20+
        ],
      },
    },
  ];
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

interface AuditReport {
  timestamp: Date;
  source: string;
  summary: {
    totalContracts: number;
    validContracts: number;
    violatedContracts: number;
    criticalViolations: number;
    errorViolations: number;
    warningViolations: number;
  };
  contractResults: Array<{
    contract: string;
    valid: boolean;
    violations: number;
    criticalCount: number;
    details: ContractValidationResult;
  }>;
  patterns: ViolationPattern[];
  rootCauseAnalysis: string[];
  recommendations: string[];
}

function generateReport(auditResult: ContractAuditResult, source: string): AuditReport {
  // auditResult.results is an array of ContractValidationResult
  const contractResults = auditResult.results.map(result => ({
    contract: result.contract,
    valid: result.valid,
    violations: result.violations.length,
    criticalCount: result.violations.filter((v: ContractViolation) => v.severity === 'critical')
      .length,
    details: result,
  }));

  // Analyze root causes
  const rootCauseAnalysis: string[] = [];
  const recommendations: string[] = [];

  // Pattern: Upstream agent not producing enough content
  const contentPatterns = auditResult.patterns.filter(
    p => p.pattern.includes('minCount') || p.pattern.includes('minLength')
  );
  if (contentPatterns.length > 0) {
    rootCauseAnalysis.push(
      `CONTENT SHORTAGE: ${contentPatterns.length} agents not producing enough content`
    );
    recommendations.push('Check agent prompts for explicit quantity requirements');
  }

  // Pattern: Missing required fields
  const fieldPatterns = auditResult.patterns.filter(
    p => p.pattern.includes('required') || p.pattern.includes('mustContain')
  );
  if (fieldPatterns.length > 0) {
    rootCauseAnalysis.push(
      `MISSING FIELDS: ${fieldPatterns.length} agents missing required output fields`
    );
    recommendations.push('Add explicit field requirements to agent prompts');
  }

  // Pattern: Stub/placeholder code
  const stubPatterns = auditResult.patterns.filter(
    p => p.pattern.includes('stub') || p.pattern.includes('TODO')
  );
  if (stubPatterns.length > 0) {
    rootCauseAnalysis.push(
      `STUB CODE: Agents producing placeholder code instead of real implementations`
    );
    recommendations.push('Add "NO STUBS, NO TODOs, FULL IMPLEMENTATION REQUIRED" to prompts');
  }

  // Identify cascade origin
  const violatedContracts = contractResults.filter(r => !r.valid);
  if (violatedContracts.length > 0) {
    const firstViolation = violatedContracts[0];
    rootCauseAnalysis.push(
      `CASCADE ORIGIN: First contract violation at ${firstViolation.contract}`
    );
  }

  // Calculate critical count manually
  const criticalCount = contractResults.reduce(
    (sum, r) =>
      sum + r.details.violations.filter((v: ContractViolation) => v.severity === 'critical').length,
    0
  );

  return {
    timestamp: new Date(),
    source,
    summary: {
      totalContracts: auditResult.totalContracts,
      validContracts: auditResult.passed,
      violatedContracts: auditResult.failed,
      criticalViolations: criticalCount,
      errorViolations: contractResults.reduce(
        (sum, r) =>
          sum +
          r.details.violations.filter((v: ContractViolation) => v.severity === 'error').length,
        0
      ),
      warningViolations: contractResults.reduce(
        (sum, r) =>
          sum +
          r.details.violations.filter((v: ContractViolation) => v.severity === 'warning').length,
        0
      ),
    },
    contractResults,
    patterns: auditResult.patterns,
    rootCauseAnalysis,
    recommendations,
  };
}

function printReport(report: AuditReport): void {
  console.log('');
  console.log('='.repeat(80));
  console.log('                    OLYMPUS CONTRACT AUDIT REPORT');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Timestamp: ${report.timestamp.toISOString()}`);
  console.log(`Source: ${report.source}`);
  console.log('');

  // Summary
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│                                 SUMMARY                                     │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(
    `│  Total Contracts:     ${report.summary.totalContracts.toString().padStart(3)}                                                │`
  );
  console.log(
    `│  Valid Contracts:     ${report.summary.validContracts.toString().padStart(3)} ✅                                            │`
  );
  console.log(
    `│  Violated Contracts:  ${report.summary.violatedContracts.toString().padStart(3)} ❌                                            │`
  );
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(
    `│  Critical Violations: ${report.summary.criticalViolations.toString().padStart(3)} 🔴                                            │`
  );
  console.log(
    `│  Error Violations:    ${report.summary.errorViolations.toString().padStart(3)} 🟠                                            │`
  );
  console.log(
    `│  Warning Violations:  ${report.summary.warningViolations.toString().padStart(3)} 🟡                                            │`
  );
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Contract Results
  console.log('CONTRACT RESULTS:');
  console.log('-'.repeat(80));
  for (const result of report.contractResults) {
    const status = result.valid ? '✅ PASS' : '❌ FAIL';
    const critical = result.criticalCount > 0 ? ` (${result.criticalCount} CRITICAL)` : '';
    console.log(
      `  ${result.contract.padEnd(25)} ${status} - ${result.violations} violations${critical}`
    );

    if (!result.valid && result.details.violations.length > 0) {
      // Show first 3 violations per contract
      const toShow = result.details.violations.slice(0, 3);
      for (const v of toShow) {
        const icon = v.severity === 'critical' ? '🔴' : v.severity === 'error' ? '🟠' : '🟡';
        console.log(
          `    ${icon} [${v.field}] ${v.constraint}: expected ${v.expected}, got ${v.actual}`
        );
      }
      if (result.details.violations.length > 3) {
        console.log(`    ... and ${result.details.violations.length - 3} more`);
      }
    }
    console.log('');
  }

  // Patterns
  if (report.patterns.length > 0) {
    console.log('VIOLATION PATTERNS:');
    console.log('-'.repeat(80));
    for (const pattern of report.patterns) {
      console.log(`  [${pattern.pattern}] Count: ${pattern.count}`);
      console.log(`    Contracts: ${pattern.contracts.join(', ')}`);
      console.log(`    Likely cause: ${pattern.likelyRootCause}`);
      console.log('');
    }
  }

  // Root Cause Analysis
  if (report.rootCauseAnalysis.length > 0) {
    console.log('ROOT CAUSE ANALYSIS:');
    console.log('-'.repeat(80));
    for (const cause of report.rootCauseAnalysis) {
      console.log(`  ⚠️  ${cause}`);
    }
    console.log('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('RECOMMENDATIONS (DO NOT FIX YET - INVESTIGATE FIRST):');
    console.log('-'.repeat(80));
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('  NOTE: This is a diagnostic report. Use findings to understand failure');
  console.log('  patterns before making any fixes. The goal is ROOT CAUSE identification.');
  console.log('='.repeat(80));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = parseArgs();

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    OLYMPUS 2.0 - CONTRACT AUDIT CLI                        ║');
  console.log('║                                                                            ║');
  console.log('║  Purpose: Investigate agent handoff failures through contract validation   ║');
  console.log('║  Mode: INVESTIGATION ONLY - No fixes, only diagnostics                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Initialize validator
  const validator = getContractValidator();
  validator.registerContracts(ALL_CONTRACTS);

  console.log(`Registered ${ALL_CONTRACTS.length} contracts for validation:`);
  for (const contract of ALL_CONTRACTS) {
    console.log(`  - ${contract.upstream} → ${contract.downstream} [${contract.criticality}]`);
  }
  console.log('');

  // Load data
  let outputs: AgentOutputData[];
  let source: string;

  if (args.mock) {
    console.log('Loading MOCK data for demonstration...');
    outputs = generateMockData();
    source = 'mock-data';
  } else if (args.file) {
    console.log(`Loading checkpoint from: ${args.file}`);
    outputs = await loadFromCheckpoint(args.file);
    source = path.basename(args.file);
  } else if (args.buildId) {
    // TODO: Load from database by buildId
    console.error('Database loading not yet implemented. Use --file or --mock');
    process.exit(1);
  } else {
    console.log('No data source specified. Running with mock data...');
    console.log('Usage:');
    console.log('  npx tsx scripts/run-contract-audit.ts --mock');
    console.log('  npx tsx scripts/run-contract-audit.ts --file <checkpoint.json>');
    console.log('');
    outputs = generateMockData();
    source = 'mock-data (default)';
  }

  console.log(`Loaded ${outputs.length} agent outputs`);
  console.log('');

  // Build outputs map - needs to be Map<AgentId, AgentOutput>
  // For validation, we wrap the data in AgentOutput-like format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputsMap = new Map<any, any>();
  for (const output of outputs) {
    // Create an AgentOutput-like structure
    // The validator's extractOutputData will parse this
    outputsMap.set(output.agentId, {
      agentId: output.agentId,
      status: 'completed',
      artifacts: [
        {
          type: 'json',
          title: 'output',
          content: JSON.stringify(output.data),
        },
      ],
      decisions: [],
    });
    if (args.verbose) {
      console.log(`  ${output.agentId}: ${JSON.stringify(output.data).substring(0, 100)}...`);
    }
  }

  // Run audit
  console.log('Running contract validation...');
  console.log('');

  const auditResult = validator.auditBuild('contract-audit-cli', outputsMap, {
    includeWarnings: true,
  });

  // Generate and print report
  const report = generateReport(auditResult, source);
  printReport(report);

  // Save to file if requested
  if (args.outputFile) {
    const outputPath = args.outputFile;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${outputPath}`);
  }

  // Exit with appropriate code
  const hasCritical = auditResult.results.some(r =>
    r.violations.some(v => v.severity === 'critical')
  );

  if (hasCritical) {
    console.log('');
    console.log('❌ CRITICAL violations found - build would fail in production');
    process.exit(1);
  } else if (auditResult.failed > 0) {
    console.log('');
    console.log('⚠️  Non-critical violations found - investigate before proceeding');
    process.exit(0);
  } else {
    console.log('');
    console.log('✅ All contracts validated successfully');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Contract audit failed:', error);
  process.exit(1);
});
