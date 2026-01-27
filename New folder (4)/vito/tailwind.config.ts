import type { Config } from 'tailwindcss';

/**
 * OLYMPUS Tailwind Configuration - 50X ENHANCED
 *
 * Design System: Blue primary (#3B82F6)
 * Marketing: LIGHT THEME with Premium Glassmorphism
 * Builder/Dashboard: Dark theme (use .dark class)
 */

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Typography
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },

      // Colors - OLYMPUS Design System with shadcn/ui CSS variables
      colors: {
        // shadcn/ui semantic colors (CSS variables)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          // OLYMPUS accent colors
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          pink: '#EC4899',
          orange: '#F97316',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Brand Colors (Blue)
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // Primary
          600: '#2563EB', // Hover
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },

        // Surface Colors (supports both light and dark)
        surface: {
          DEFAULT: 'var(--surface)',
          secondary: 'var(--surface-secondary)',
          tertiary: 'var(--surface-tertiary)',
          elevated: 'var(--surface-elevated)',
        },

        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },

      // Background Image (Gradients) - 50X ENHANCED
      backgroundImage: {
        // Hero Gradients
        'gradient-hero': 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 50%, #EFF6FF 100%)',
        'gradient-hero-dark': 'linear-gradient(135deg, #2563EB 0%, #8B5CF6 50%, #EC4899 100%)',

        // Card Gradients
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
        'gradient-card-dark': 'linear-gradient(180deg, #141416 0%, #0A0A0B 100%)',

        // Button Gradients
        'gradient-button': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        'gradient-premium': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',

        // Border Gradients (for animated borders)
        'gradient-border': 'linear-gradient(135deg, #818CF8 0%, #C084FC 50%, #F472B6 100%)',

        // Accent Gradients
        'gradient-accent': 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
        'gradient-brand': 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',

        // Utility
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',

        // Shimmer
        'gradient-shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      },

      // Box Shadow - 50X GLASSMORPHISM
      boxShadow: {
        // Basic glows
        'glow': '0 0 40px rgba(59, 130, 246, 0.25)',
        'glow-sm': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-lg': '0 0 60px rgba(59, 130, 246, 0.35)',
        'glow-purple': '0 0 40px rgba(139, 92, 246, 0.25)',
        'glow-indigo': '0 0 60px rgba(99, 102, 241, 0.4)',

        // 50X Glassmorphism Shadows
        'glass': '0 8px 32px rgba(99, 102, 241, 0.1), inset 0 0 32px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        'glass-hover': '0 20px 60px rgba(99, 102, 241, 0.2), inset 0 0 32px rgba(255,255,255,0.6), 0 0 0 1px rgba(99, 102, 241, 0.2)',
        'glass-lg': '0 25px 100px rgba(99, 102, 241, 0.2), inset 0 0 32px rgba(255,255,255,0.5)',
      },

      // Border Radius - shadcn/ui uses CSS variable
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // Animation - 50X PREMIUM
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-from-top': 'slideInFromTop 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // 50X Premium Animations
        'float': 'float 6s ease-in-out infinite',
        'float-reverse': 'floatReverse 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'border-dance': 'borderDance 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },

      // Keyframes - 50X PREMIUM
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // 50X Premium Keyframes
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(20px) rotate(-5deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        borderDance: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      // Typography Scale
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        'hero': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'hero-lg': ['6rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },

      // Spacing
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '128': '32rem',
        '144': '36rem',
      },

      // Z-index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // Backdrop blur
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
        '3xl': '64px',
      },

      // Backdrop saturate (for glassmorphism)
      backdropSaturate: {
        '125': '1.25',
        '150': '1.5',
        '180': '1.8',
        '200': '2',
      },
    },
  },
  plugins: [
    // Add custom utilities for 50X Glassmorphism
    function ({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        // Text utilities
        '.text-balance': {
          'text-wrap': 'balance',
        },

        // Scrollbar utilities
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },

        // 50X Glass Card - LIGHT THEME
        '.glass-card': {
          'background': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
          'backdrop-filter': 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
          'border': '1px solid rgba(255,255,255,0.5)',
          'box-shadow': '0 8px 32px rgba(99, 102, 241, 0.1), inset 0 0 32px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        },

        // Glass Card Hover Effect
        '.glass-card-hover': {
          'transition': 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            'transform': 'translateY(-8px) scale(1.02)',
            'box-shadow': '0 20px 60px rgba(99, 102, 241, 0.2), inset 0 0 32px rgba(255,255,255,0.6), 0 0 0 1px rgba(99, 102, 241, 0.2)',
          },
        },

        // Glass Button - LIGHT THEME
        '.glass-button': {
          'background': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
          'backdrop-filter': 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
          'border': '1px solid rgba(255,255,255,0.5)',
          'box-shadow': '0 8px 32px rgba(99, 102, 241, 0.1), inset 0 0 32px rgba(255,255,255,0.5)',
          'transition': 'all 0.3s ease',
          '&:hover': {
            'box-shadow': '0 12px 40px rgba(99, 102, 241, 0.15), inset 0 0 32px rgba(255,255,255,0.6)',
            'transform': 'translateY(-2px)',
          },
        },

        // Premium Button with Shimmer
        '.btn-premium': {
          'position': 'relative',
          'background': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          'background-size': '200% 200%',
          'animation': 'gradientShift 3s ease infinite',
          'overflow': 'hidden',
          '&::before': {
            'content': '""',
            'position': 'absolute',
            'top': '0',
            'left': '-100%',
            'width': '100%',
            'height': '100%',
            'background': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            'animation': 'shimmer 2s infinite',
          },
        },

        // Gradient Border (Animated)
        '.gradient-border-animated': {
          'position': 'relative',
          'background': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
          'backdrop-filter': 'blur(20px)',
          '&::before': {
            'content': '""',
            'position': 'absolute',
            'inset': '0',
            'padding': '2px',
            'border-radius': 'inherit',
            'background': 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
            '-webkit-mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            'mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            '-webkit-mask-composite': 'xor',
            'mask-composite': 'exclude',
            'animation': 'borderDance 4s ease-in-out infinite',
            'background-size': '200% 200%',
          },
        },

        // Gradient Text
        '.gradient-text': {
          'background': 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },

        '.gradient-text-premium': {
          'background': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },

        // Old dark glass (for builder/dashboard)
        '.glass-dark': {
          'background': 'rgba(20, 20, 22, 0.8)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
      });
    },
  ],
};

export default config;
