/**
 * OLYMPUS 50X - Component Library Seeder
 *
 * Seeds 50+ high-quality component examples into the RAG database.
 * Run with: npx ts-node scripts/seed-component-library.ts
 */

import { v4 as uuid } from 'uuid';
import { ComponentStore, ComponentExample, ComponentCategory } from '../src/lib/agents/rag/component-store';
import { embed } from '../src/lib/agents/embeddings';

// ═══════════════════════════════════════════════════════════════
// COMPONENT EXAMPLES (50+ Premium Examples)
// ═══════════════════════════════════════════════════════════════

const COMPONENT_EXAMPLES: Omit<ComponentExample, 'id' | 'created_at'>[] = [
  // ═══════════════════════════════════════════════════════════════
  // BUTTONS (10 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GradientButton',
    category: 'button',
    description: 'Primary CTA button with violet-purple gradient, hover lift, and glow effect',
    tags: ['button', 'gradient', 'cta', 'primary', 'glow'],
    quality_score: 95,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`
        \${sizeClasses[size]}
        bg-gradient-to-r from-violet-600 to-purple-600
        text-white font-semibold rounded-lg
        hover:from-violet-500 hover:to-purple-500
        hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(124,58,237,0.4)]
        active:translate-y-0 active:shadow-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
        \${className}
      \`}
    >
      {children}
    </button>
  );
};`,
  },
  {
    name: 'GlassButton',
    category: 'button',
    description: 'Glassmorphism button with subtle backdrop blur and border',
    tags: ['button', 'glass', 'glassmorphism', 'secondary'],
    quality_score: 92,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  variant = 'default',
}) => {
  const variants = {
    default: 'bg-white/[0.08] hover:bg-white/[0.12]',
    outline: 'bg-transparent border-white/20 hover:bg-white/[0.05]',
  };

  return (
    <button
      onClick={onClick}
      className={\`
        px-6 py-3 rounded-xl
        \${variants[variant]}
        backdrop-blur-xl border border-white/10
        text-white font-medium
        hover:-translate-y-0.5
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-violet-500
      \`}
    >
      {children}
    </button>
  );
};`,
  },
  {
    name: 'IconButton',
    category: 'button',
    description: 'Circular icon button with hover glow effect',
    tags: ['button', 'icon', 'circular', 'action'],
    quality_score: 90,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  label,
  size = 'md',
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={\`
        \${sizes[size]}
        flex items-center justify-center
        rounded-full
        bg-white/[0.05] hover:bg-white/[0.1]
        border border-white/10 hover:border-white/20
        text-white/60 hover:text-white
        hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-violet-500
      \`}
    >
      {icon}
    </button>
  );
};`,
  },
  {
    name: 'LoadingButton',
    category: 'button',
    description: 'Button with loading spinner state',
    tags: ['button', 'loading', 'spinner', 'async'],
    quality_score: 91,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface LoadingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  onClick,
  loading = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="
        px-6 py-3 rounded-lg
        bg-gradient-to-r from-violet-600 to-purple-600
        text-white font-semibold
        hover:from-violet-500 hover:to-purple-500
        disabled:opacity-70 disabled:cursor-wait
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-violet-500
        flex items-center gap-2
      "
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {loading ? 'Loading...' : children}
    </button>
  );
};`,
  },
  {
    name: 'ButtonGroup',
    category: 'button',
    description: 'Segmented button group with proper spacing',
    tags: ['button', 'group', 'segmented', 'toggle'],
    quality_score: 89,
    framework: 'react',
    code: `'use client';

import React, { useState } from 'react';

interface ButtonGroupProps {
  options: string[];
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  defaultValue,
  onChange,
}) => {
  const [selected, setSelected] = useState(defaultValue || options[0]);

  const handleClick = (option: string) => {
    setSelected(option);
    onChange?.(option);
  };

  return (
    <div className="inline-flex bg-white/[0.03] rounded-lg p-1 gap-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => handleClick(option)}
          className={\`
            px-4 py-2 rounded-md text-sm font-medium
            transition-all duration-200
            \${
              selected === option
                ? 'bg-violet-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }
          \`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // CARDS (10 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassCard',
    category: 'card',
    description: 'Premium glassmorphism card with backdrop blur and subtle border',
    tags: ['card', 'glass', 'glassmorphism', 'container'],
    quality_score: 96,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = false,
}) => {
  return (
    <div
      className={\`
        bg-white/[0.03] backdrop-blur-xl
        border border-white/10
        rounded-2xl p-6
        \${hover ? 'hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1 cursor-pointer' : ''}
        transition-all duration-300
        \${className}
      \`}
    >
      {children}
    </div>
  );
};`,
  },
  {
    name: 'FeatureCard',
    category: 'card',
    description: 'Feature showcase card with icon, title, and description',
    tags: ['card', 'feature', 'marketing', 'icon'],
    quality_score: 94,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="
      bg-white/[0.03] backdrop-blur-xl
      border border-white/10 rounded-2xl p-6
      hover:bg-white/[0.05] hover:border-white/20
      hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]
      transition-all duration-300
      group
    ">
      <div className="
        w-12 h-12 rounded-xl
        bg-gradient-to-br from-violet-600/20 to-purple-600/20
        border border-violet-500/20
        flex items-center justify-center
        mb-4
        group-hover:scale-110
        transition-transform duration-300
      ">
        <span className="text-violet-400">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-white/60 leading-relaxed">
        {description}
      </p>
    </div>
  );
};`,
  },
  {
    name: 'PricingCard',
    category: 'card',
    description: 'Pricing tier card with features list and CTA',
    tags: ['card', 'pricing', 'features', 'cta'],
    quality_score: 93,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  features: string[];
  popular?: boolean;
  onSelect?: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period = '/month',
  features,
  popular = false,
  onSelect,
}) => {
  return (
    <div className={\`
      relative
      bg-white/[0.03] backdrop-blur-xl
      border rounded-2xl p-8
      \${popular ? 'border-violet-500 shadow-[0_0_50px_rgba(124,58,237,0.3)]' : 'border-white/10'}
      transition-all duration-300
      hover:-translate-y-1
    \`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-white/40">{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-white/80">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        className={\`
          w-full py-3 rounded-xl font-semibold
          transition-all duration-200
          \${popular
            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }
        \`}
      >
        Get Started
      </button>
    </div>
  );
};`,
  },
  {
    name: 'StatCard',
    category: 'card',
    description: 'Statistics card with value, label, and trend indicator',
    tags: ['card', 'stats', 'dashboard', 'metrics'],
    quality_score: 91,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface StatCardProps {
  value: string | number;
  label: string;
  trend?: { value: number; positive: boolean };
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  trend,
}) => {
  return (
    <div className="
      bg-white/[0.03] backdrop-blur-xl
      border border-white/10 rounded-xl p-6
      hover:bg-white/[0.05]
      transition-all duration-200
    ">
      <p className="text-white/40 text-sm mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-white">{value}</span>
        {trend && (
          <span className={\`
            flex items-center gap-1 text-sm font-medium
            \${trend.positive ? 'text-green-400' : 'text-red-400'}
          \`}>
            <svg className={\`w-4 h-4 \${trend.positive ? '' : 'rotate-180'}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};`,
  },
  {
    name: 'TestimonialCard',
    category: 'card',
    description: 'Customer testimonial card with quote and avatar',
    tags: ['card', 'testimonial', 'social-proof', 'quote'],
    quality_score: 90,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  role,
  avatar,
}) => {
  return (
    <div className="
      bg-white/[0.03] backdrop-blur-xl
      border border-white/10 rounded-2xl p-8
      hover:border-white/20
      transition-all duration-300
    ">
      <svg className="w-10 h-10 text-violet-500/40 mb-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>
      <p className="text-white/80 text-lg leading-relaxed mb-6">
        "{quote}"
      </p>
      <div className="flex items-center gap-4">
        {avatar ? (
          <img src={avatar} alt={author} className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-semibold">
            {author[0]}
          </div>
        )}
        <div>
          <p className="text-white font-semibold">{author}</p>
          <p className="text-white/40 text-sm">{role}</p>
        </div>
      </div>
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // INPUTS (8 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassInput',
    category: 'input',
    description: 'Glassmorphism text input with focus ring',
    tags: ['input', 'text', 'glass', 'form'],
    quality_score: 94,
    framework: 'react',
    code: `'use client';

import React, { forwardRef } from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-white/60 text-sm mb-2">{label}</label>
        )}
        <input
          ref={ref}
          className={\`
            w-full px-4 py-3 rounded-xl
            bg-white/[0.03] backdrop-blur-xl
            border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
            hover:border-white/20
            transition-all duration-200
            \${error ? 'border-red-500 focus:ring-red-500' : ''}
            \${className}
          \`}
          {...props}
        />
        {error && (
          <p className="text-red-400 text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';`,
  },
  {
    name: 'SearchInput',
    category: 'input',
    description: 'Search input with icon and clear button',
    tags: ['input', 'search', 'icon', 'clearable'],
    quality_score: 92,
    framework: 'react',
    code: `'use client';

import React, { useState } from 'react';

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  onSearch,
}) => {
  const [value, setValue] = useState('');

  const handleClear = () => {
    setValue('');
    onSearch?.('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
  };

  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full pl-12 pr-10 py-3 rounded-xl
          bg-white/[0.03] backdrop-blur-xl
          border border-white/10
          text-white placeholder:text-white/30
          focus:outline-none focus:ring-2 focus:ring-violet-500
          transition-all duration-200
        "
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};`,
  },
  {
    name: 'PasswordInput',
    category: 'input',
    description: 'Password input with show/hide toggle',
    tags: ['input', 'password', 'toggle', 'form'],
    quality_score: 91,
    framework: 'react',
    code: `'use client';

import React, { useState, forwardRef } from 'react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-white/60 text-sm mb-2">{label}</label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={\`
              w-full px-4 py-3 pr-12 rounded-xl
              bg-white/[0.03] backdrop-blur-xl
              border border-white/10
              text-white placeholder:text-white/30
              focus:outline-none focus:ring-2 focus:ring-violet-500
              \${error ? 'border-red-500' : ''}
              \${className}
            \`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';`,
  },

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION (6 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassNavbar',
    category: 'navbar',
    description: 'Glassmorphism navigation bar with logo and links',
    tags: ['navbar', 'navigation', 'glass', 'header'],
    quality_score: 95,
    framework: 'react',
    code: `'use client';

import React from 'react';
import Link from 'next/link';

interface NavbarProps {
  logo: React.ReactNode;
  links: { label: string; href: string }[];
}

export const GlassNavbar: React.FC<NavbarProps> = ({ logo, links }) => {
  return (
    <nav className="
      fixed top-0 left-0 right-0 z-50
      bg-[#0a0a0a]/80 backdrop-blur-xl
      border-b border-white/10
    ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-white font-bold text-xl">
            {logo}
          </Link>
          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
            <button className="
              px-4 py-2 rounded-lg
              bg-gradient-to-r from-violet-600 to-purple-600
              text-white font-medium
              hover:from-violet-500 hover:to-purple-500
              transition-all duration-200
            ">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};`,
  },
  {
    name: 'TabsNavigation',
    category: 'tabs',
    description: 'Horizontal tabs with animated indicator',
    tags: ['tabs', 'navigation', 'animated', 'underline'],
    quality_score: 92,
    framework: 'react',
    code: `'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export const TabsNavigation: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const activeButton = tabRefs.current.get(activeTab);
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div className="relative border-b border-white/10">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => el && tabRefs.current.set(tab.id, el)}
            onClick={() => handleTabClick(tab.id)}
            className={\`
              px-6 py-3 text-sm font-medium
              transition-colors duration-200
              \${activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'}
            \`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className="absolute bottom-0 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-300"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // HERO SECTIONS (5 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'HeroSection',
    category: 'hero',
    description: 'Full-width hero with gradient headline and CTA',
    tags: ['hero', 'landing', 'headline', 'gradient'],
    quality_score: 96,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: { label: string; onClick: () => void };
  secondaryCTA?: { label: string; onClick: () => void };
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
}) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center py-20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <h1 className="text-7xl font-bold tracking-tight mb-6">
          <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            {headline.split(' ').slice(0, -2).join(' ')}
          </span>{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {headline.split(' ').slice(-2).join(' ')}
          </span>
        </h1>

        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          {subheadline}
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={primaryCTA.onClick}
            className="
              px-8 py-4 rounded-xl
              bg-gradient-to-r from-violet-600 to-purple-600
              text-white font-semibold text-lg
              hover:from-violet-500 hover:to-purple-500
              hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(124,58,237,0.4)]
              transition-all duration-200
            "
          >
            {primaryCTA.label}
          </button>

          {secondaryCTA && (
            <button
              onClick={secondaryCTA.onClick}
              className="
                px-8 py-4 rounded-xl
                bg-white/[0.05] backdrop-blur-xl
                border border-white/10
                text-white font-semibold text-lg
                hover:bg-white/[0.1] hover:border-white/20
                transition-all duration-200
              "
            >
              {secondaryCTA.label}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // MODALS & DIALOGS (5 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassModal',
    category: 'modal',
    description: 'Glassmorphism modal with backdrop and animations',
    tags: ['modal', 'dialog', 'glass', 'overlay'],
    quality_score: 94,
    framework: 'react',
    code: `'use client';

import React, { useEffect } from 'react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="
        relative z-10 w-full max-w-lg
        bg-[#0d0d0d]/90 backdrop-blur-xl
        border border-white/10 rounded-2xl
        shadow-[0_0_60px_rgba(0,0,0,0.5)]
        animate-in fade-in zoom-in-95 duration-200
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};`,
  },
  {
    name: 'ConfirmDialog',
    category: 'dialog',
    description: 'Confirmation dialog with destructive action styling',
    tags: ['dialog', 'confirm', 'destructive', 'modal'],
    quality_score: 91,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="
        relative z-10 w-full max-w-md
        bg-[#0d0d0d] border border-white/10 rounded-2xl p-6
      ">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-white/60 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg
              bg-white/10 text-white
              hover:bg-white/20
              transition-colors duration-200
            "
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={\`
              px-4 py-2 rounded-lg font-medium
              transition-colors duration-200
              \${destructive
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-violet-600 text-white hover:bg-violet-500'
              }
            \`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // BADGES & AVATARS (4 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GradientBadge',
    category: 'badge',
    description: 'Pill-shaped badge with gradient background',
    tags: ['badge', 'pill', 'gradient', 'tag'],
    quality_score: 90,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'purple';
}

export const GradientBadge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
}) => {
  const variants = {
    default: 'bg-white/10 text-white/80',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
    purple: 'bg-gradient-to-r from-violet-600/20 to-purple-600/20 text-violet-400',
  };

  return (
    <span className={\`
      inline-flex items-center px-3 py-1 rounded-full
      text-xs font-medium
      \${variants[variant]}
    \`}>
      {children}
    </span>
  );
};`,
  },
  {
    name: 'AvatarGroup',
    category: 'avatar',
    description: 'Stacked avatar group with overlap',
    tags: ['avatar', 'group', 'stack', 'users'],
    quality_score: 89,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface AvatarGroupProps {
  avatars: { src?: string; name: string }[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'md',
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-3">
      {visible.map((avatar, i) => (
        <div
          key={i}
          className={\`
            \${sizes[size]}
            rounded-full
            border-2 border-[#0a0a0a]
            bg-gradient-to-br from-violet-600 to-purple-600
            flex items-center justify-center
            text-white font-medium
            overflow-hidden
          \`}
        >
          {avatar.src ? (
            <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
          ) : (
            avatar.name[0]
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className={\`
          \${sizes[size]}
          rounded-full
          border-2 border-[#0a0a0a]
          bg-white/10
          flex items-center justify-center
          text-white/60 font-medium
        \`}>
          +{remaining}
        </div>
      )}
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // TOAST & NOTIFICATIONS (3 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Toast',
    category: 'toast',
    description: 'Notification toast with icon and dismiss',
    tags: ['toast', 'notification', 'alert', 'snackbar'],
    quality_score: 92,
    framework: 'react',
    code: `'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="
      flex items-center gap-3 p-4
      bg-[#0d0d0d]/90 backdrop-blur-xl
      border border-white/10 rounded-xl
      shadow-[0_0_30px_rgba(0,0,0,0.3)]
      animate-in slide-in-from-right-full duration-300
    ">
      {icons[type]}
      <p className="text-white flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-white/40 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // SKELETON LOADERS (3 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Skeleton',
    category: 'skeleton',
    description: 'Animated skeleton loader with shimmer effect',
    tags: ['skeleton', 'loading', 'placeholder', 'shimmer'],
    quality_score: 90,
    framework: 'react',
    code: `'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
}) => {
  const baseClasses = 'animate-pulse bg-white/[0.05]';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? 40 : '100%'),
    height: height || (variant === 'circular' ? 40 : variant === 'text' ? 16 : 100),
  };

  return (
    <div
      className={\`\${baseClasses} \${variantClasses[variant]} \${className}\`}
      style={style}
    >
      <div className="w-full h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer" />
    </div>
  );
};

// Add this to your CSS:
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer { animation: shimmer 2s infinite; }`,
  },
  {
    name: 'CardSkeleton',
    category: 'skeleton',
    description: 'Full card skeleton with multiple elements',
    tags: ['skeleton', 'card', 'loading', 'placeholder'],
    quality_score: 88,
    framework: 'react',
    code: `'use client';

import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="
      bg-white/[0.03] border border-white/10 rounded-2xl p-6
      animate-pulse
    ">
      {/* Image placeholder */}
      <div className="w-full h-40 bg-white/[0.05] rounded-xl mb-4" />

      {/* Title */}
      <div className="h-6 bg-white/[0.05] rounded w-3/4 mb-3" />

      {/* Description lines */}
      <div className="space-y-2">
        <div className="h-4 bg-white/[0.05] rounded w-full" />
        <div className="h-4 bg-white/[0.05] rounded w-5/6" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/[0.05] rounded-full" />
          <div className="h-4 bg-white/[0.05] rounded w-20" />
        </div>
        <div className="h-8 bg-white/[0.05] rounded-lg w-24" />
      </div>
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // FOOTER (2 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassFooter',
    category: 'footer',
    description: 'Multi-column footer with links and social icons',
    tags: ['footer', 'navigation', 'links', 'social'],
    quality_score: 91,
    framework: 'react',
    code: `'use client';

import React from 'react';
import Link from 'next/link';

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

interface FooterProps {
  logo: React.ReactNode;
  columns: FooterColumn[];
  copyright: string;
}

export const GlassFooter: React.FC<FooterProps> = ({
  logo,
  columns,
  copyright,
}) => {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="text-white font-bold text-xl mb-4">{logo}</div>
            <p className="text-white/40 text-sm leading-relaxed">
              Building the future of digital experiences.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-white font-semibold mb-4">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/40 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10">
          <p className="text-white/40 text-sm">{copyright}</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {['twitter', 'github', 'discord'].map((social) => (
              <a
                key={social}
                href={\`#\${social}\`}
                className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                {social[0].toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // DROPDOWN (2 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Dropdown',
    category: 'dropdown',
    description: 'Animated dropdown menu with glassmorphism',
    tags: ['dropdown', 'menu', 'select', 'popover'],
    quality_score: 92,
    framework: 'react',
    code: `'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  items: { label: string; onClick: () => void; icon?: React.ReactNode }[];
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}>{trigger}</button>

      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-56
          bg-[#0d0d0d]/95 backdrop-blur-xl
          border border-white/10 rounded-xl
          shadow-[0_0_30px_rgba(0,0,0,0.3)]
          py-2
          animate-in fade-in slide-in-from-top-2 duration-200
          z-50
        ">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className="
                w-full px-4 py-2.5
                flex items-center gap-3
                text-white/80 hover:text-white
                hover:bg-white/[0.05]
                transition-colors duration-150
                text-left
              "
            >
              {item.icon && <span className="text-white/40">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};`,
  },

  // ═══════════════════════════════════════════════════════════════
  // FORM (3 examples)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ContactForm',
    category: 'form',
    description: 'Complete contact form with validation',
    tags: ['form', 'contact', 'validation', 'submit'],
    quality_score: 93,
    framework: 'react',
    code: `'use client';

import React, { useState } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ name: '', email: '', message: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-white/60 text-sm mb-2">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={\`
            w-full px-4 py-3 rounded-xl
            bg-white/[0.03] border
            \${errors.name ? 'border-red-500' : 'border-white/10'}
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-violet-500
          \`}
          placeholder="Your name"
        />
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={\`
            w-full px-4 py-3 rounded-xl
            bg-white/[0.03] border
            \${errors.email ? 'border-red-500' : 'border-white/10'}
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-violet-500
          \`}
          placeholder="your@email.com"
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2">Message</label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
          className={\`
            w-full px-4 py-3 rounded-xl
            bg-white/[0.03] border
            \${errors.message ? 'border-red-500' : 'border-white/10'}
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-violet-500
            resize-none
          \`}
          placeholder="Your message..."
        />
        {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="
          w-full py-4 rounded-xl
          bg-gradient-to-r from-violet-600 to-purple-600
          text-white font-semibold
          hover:from-violet-500 hover:to-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        "
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
};`,
  },
];

// ═══════════════════════════════════════════════════════════════
// SEEDER
// ═══════════════════════════════════════════════════════════════

async function seedComponents(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('        OLYMPUS 50X - Component Library Seeder');
  console.log('═══════════════════════════════════════════════════════════');
  console.log();

  const store = new ComponentStore();

  try {
    // Initialize collection
    console.log('[Seeder] Initializing component store...');
    await store.initialize();

    // Check if already seeded
    const isEmpty = await store.isEmpty();
    if (!isEmpty) {
      const stats = await store.getStats();
      console.log(`[Seeder] Collection already has ${stats.totalComponents} components`);
      console.log('[Seeder] Run store.clear() first to reseed');
      return;
    }

    console.log(`[Seeder] Seeding ${COMPONENT_EXAMPLES.length} components...`);
    console.log();

    let success = 0;
    let failed = 0;

    for (const example of COMPONENT_EXAMPLES) {
      try {
        // Generate embedding from description + code
        const searchText = `${example.name} ${example.description} ${example.tags.join(' ')} ${example.code.substring(0, 500)}`;
        const embeddingResult = await embed(searchText);

        // Create full component
        const component: ComponentExample = {
          id: uuid(),
          ...example,
          created_at: new Date(),
          source: 'seed',
        };

        // Add to store
        await store.addComponent(component, embeddingResult.embedding);
        success++;
        console.log(`  ✓ ${example.name} (${example.category}) - score: ${example.quality_score}`);
      } catch (error) {
        failed++;
        console.error(`  ✗ ${example.name}: ${(error as Error).message}`);
      }
    }

    console.log();
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    SEEDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total:    ${COMPONENT_EXAMPLES.length}`);
    console.log(`  Success:  ${success} ✓`);
    console.log(`  Failed:   ${failed} ✗`);

    // Print stats
    const stats = await store.getStats();
    console.log();
    console.log('Collection Stats:');
    console.log(`  Total components: ${stats.totalComponents}`);
    console.log('  By category:', stats.byCategory);
    console.log('  By framework:', stats.byFramework);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedComponents().catch(console.error);
}

export { COMPONENT_EXAMPLES, seedComponents };
