// Full component code here...
'use client';

import React, { forwardRef } from 'react';
import { cn } from '../src/lib/utils';

interface ButtonProps {
  /**
   * Button label
   */
  label: string;
  /**
   * Function to call on button click
   */
  onClick: () => void;
  /**
   * Additional classes for styling
   */
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ label, onClick, className }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        'px-6 py-3 font-semibold text-white transition-all duration-200',
        'bg-violet-600 hover:bg-violet-700 focus:ring-2 focus:ring-violet-500',
        'rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
      aria-label={label}
    >
      {label}
    </button>
  );
});

Button.displayName = 'Button';

interface InputProps {
  /**
   * Placeholder text for the input
   */
  placeholder: string;
  /**
   * Value of the input
   */
  value: string;
  /**
   * Function to call on input change
   */
  onChange: (value: string) => void;
  /**
   * Additional classes for styling
   */
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ placeholder, value, onChange, className }, ref) => {
  return (
    <input
      ref={ref}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-6 py-3 text-white bg-white/[0.03] backdrop-blur-xl',
        'rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-violet-500',
        className
      )}
      aria-label={placeholder}
    />
  );
});

Input.displayName = 'Input';

interface BadgeProps {
  /**
   * Text to display inside the badge
   */
  text: string;
  /**
   * Additional classes for styling
   */
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ text, className }) => {
  return (
    <span
      className={cn(
        'inline-block px-4 py-2 text-sm font-medium text-white',
        'bg-violet-600 rounded-full shadow-[0_0_50px_rgba(124,58,237,0.3)]',
        className
      )}
    >
      {text}
    </span>
  );
};

export { Button, Input, Badge };
export type { ButtonProps, InputProps, BadgeProps };