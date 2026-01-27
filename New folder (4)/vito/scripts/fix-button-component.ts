/**
 * FIX BUTTON COMPONENT
 *
 * The Button component has a framer-motion type error due to polymorphic pattern.
 * This fixes it by using a simpler approach without the type conflict.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fixed Button component - removes problematic polymorphic framer-motion pattern
const FIXED_BUTTON = `// Button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
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
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // If asChild, render as span (for use with Link components)
    if (asChild) {
      return (
        <span
          className={cn(buttonVariants({ variant, size }), className)}
          data-loading={loading || undefined}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </span>
          ) : (
            <>
              {leftIcon && <span className="mr-2">{leftIcon}</span>}
              {children}
              {rightIcon && <span className="ml-2">{rightIcon}</span>}
            </>
          )}
        </span>
      );
    }

    // Standard button with hover/active animations via CSS
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          'transform transition-transform active:scale-[0.98] hover:-translate-y-px',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING BUTTON COMPONENT');
  console.log('='.repeat(60));

  try {
    // Find which agent created the Button component (likely PIXEL)
    const { data: pixel } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel')
      .single();

    if (!pixel) throw new Error('PIXEL output not found');

    let artifacts = pixel.artifacts || [];

    // Remove old Button component
    artifacts = artifacts.filter((a: any) => a.path !== 'src/components/Button.tsx');

    // Add fixed Button component
    artifacts.push({
      type: 'code',
      path: 'src/components/Button.tsx',
      content: FIXED_BUTTON,
    });

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({
        artifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel');

    if (error) throw new Error(`Failed to update PIXEL: ${error.message}`);

    console.log('[Fix] Button.tsx replaced with type-safe version');
    console.log('  - Removed framer-motion (causing type conflicts)');
    console.log('  - Using CSS transitions instead (hover:-translate-y-px, active:scale-[0.98])');
    console.log('  - Fixed polymorphic asChild pattern');
    console.log('  - Added proper loading spinner');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();
